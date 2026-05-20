/**
 * Оркестратор алгоритма матчинга.
 *
 *   runMatchingForPosition(positionId)    — пересчитать матчи для одной вакансии
 *   runMatchingForCandidate(candidateId)  — пересчитать матчи для одного соискателя
 *
 * Композиция:
 *   final = fitScore × feasibility.multiplier × interest.multiplier
 *
 * Создаются/обновляются Match только если final >= minScoreToCreate.
 */
import { prisma } from "@/lib/prisma";
import { WEIGHTS } from "./weights";
import { calculateFit } from "./fit";
import { calculateFeasibility } from "./feasibility";
import { calculateMutualInterest } from "./interest";
import type {
  CandidateInput,
  PositionInput,
  SkillRelations,
} from "./types";

// ─── Главная: матчинг под одну позицию ───────────────────────

export async function runMatchingForPosition(positionId: string) {
  const position = await loadPosition(positionId);
  if (!position) return { created: 0, updated: 0, skipped: 0, reason: "position not found" };

  const candidates = await loadAllCandidates();
  const relations = await loadSkillRelations();

  return await processPairs(
    candidates.map((c) => ({ candidate: c, position })),
    relations
  );
}

// ─── Матчинг под одного кандидата (при обновлении профиля) ──

export async function runMatchingForCandidate(candidateId: string) {
  const candidate = await loadCandidate(candidateId);
  if (!candidate) return { created: 0, updated: 0, skipped: 0, reason: "candidate not found" };

  const positions = await loadAllActivePositions();
  const relations = await loadSkillRelations();

  return await processPairs(
    positions.map((p) => ({ candidate, position: p })),
    relations
  );
}

// ─── Общий цикл обработки пар ────────────────────────────────

async function processPairs(
  pairs: { candidate: CandidateInput; position: PositionInput }[],
  relations: SkillRelations
) {
  let created = 0, updated = 0, skipped = 0;
  const now = new Date();

  for (const { candidate, position } of pairs) {
    const fit = calculateFit(candidate, position, relations);

    if (fit.hardFiltered) {
      // Если был старый Match — пометим как отклонённый системой.
      await prisma.match.deleteMany({
        where: {
          candidateId: candidate.id,
          positionId: position.id,
          status: "PENDING",
        },
      });
      skipped++;
      continue;
    }

    const feasibility = calculateFeasibility(candidate, position, now);
    const interest = calculateMutualInterest(candidate, position, fit.fitScore);

    const final = Math.round(
      fit.fitScore * feasibility.multiplier * interest.multiplier
    );

    if (final < WEIGHTS.match.minScoreToCreate) {
      // Слишком слабый — удалим если был.
      await prisma.match.deleteMany({
        where: {
          candidateId: candidate.id,
          positionId: position.id,
          status: "PENDING",
        },
      });
      skipped++;
      continue;
    }

    const scoreBreakdown = {
      fit: fit.breakdown,
      feasibility,
      interest,
    };

    const existing = await prisma.match.findUnique({
      where: {
        candidateId_positionId: {
          candidateId: candidate.id,
          positionId: position.id,
        },
      },
    });

    if (!existing) {
      await prisma.match.create({
        data: {
          candidateId: candidate.id,
          positionId: position.id,
          score: final,
          fitScore: fit.fitScore,
          feasibilityScore: Math.round(feasibility.multiplier * 100),
          interestScore: Math.round(interest.multiplier * 100),
          scoreBreakdown,
          status: "PENDING",
        },
      });
      created++;
    } else if (existing.status === "PENDING") {
      // Обновляем только если ещё не приняли решение.
      await prisma.match.update({
        where: { id: existing.id },
        data: {
          score: final,
          fitScore: fit.fitScore,
          feasibilityScore: Math.round(feasibility.multiplier * 100),
          interestScore: Math.round(interest.multiplier * 100),
          scoreBreakdown,
        },
      });
      updated++;
    } else {
      skipped++;
    }
  }

  return { created, updated, skipped };
}

// ─── Загрузка данных и нормализация ──────────────────────────

async function loadPosition(id: string): Promise<PositionInput | null> {
  const p = await prisma.position.findUnique({
    where: { id },
    include: {
      skills: true,
      hrSlots: true,
      _count: { select: { matches: { where: { status: "PENDING" } } } },
    },
  });
  if (!p || !p.isActive) return null;
  return {
    id: p.id,
    grade: p.grade,
    workFormat: p.workFormat,
    salaryMin: p.salaryMin,
    salaryMax: p.salaryMax,
    requiredSkillIds: p.skills.filter((s) => s.required).map((s) => s.skillId),
    niceToHaveSkillIds: p.skills.filter((s) => !s.required).map((s) => s.skillId),
    createdAt: p.createdAt,
    slots: p.hrSlots.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      maxPerDay: s.maxPerDay,
    })),
    pendingQueueDepth: p._count.matches,
  };
}

async function loadAllActivePositions(): Promise<PositionInput[]> {
  const list = await prisma.position.findMany({
    where: { isActive: true },
    include: {
      skills: true,
      hrSlots: true,
      _count: { select: { matches: { where: { status: "PENDING" } } } },
    },
  });
  return list.map((p) => ({
    id: p.id,
    grade: p.grade,
    workFormat: p.workFormat,
    salaryMin: p.salaryMin,
    salaryMax: p.salaryMax,
    requiredSkillIds: p.skills.filter((s) => s.required).map((s) => s.skillId),
    niceToHaveSkillIds: p.skills.filter((s) => !s.required).map((s) => s.skillId),
    createdAt: p.createdAt,
    slots: p.hrSlots.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      maxPerDay: s.maxPerDay,
    })),
    pendingQueueDepth: p._count.matches,
  }));
}

async function loadCandidate(id: string): Promise<CandidateInput | null> {
  const c = await prisma.candidateProfile.findUnique({
    where: { id },
    include: {
      skills: true,
      portfolio: true,
      timeSlots: true,
      _count: { select: { matches: { where: { status: "INVITED" } } } },
    },
  });
  if (!c) return null;
  return {
    id: c.id,
    grade: c.grade,
    yearsExp: c.yearsExp,
    workFormat: c.workFormat,
    salaryMin: c.salaryMin,
    salaryMax: c.salaryMax,
    skillIds: c.skills.map((s) => s.skillId),
    hasPortfolio: c.portfolio.length > 0,
    hasBio: !!c.bio,
    createdAt: c.createdAt,
    slots: c.timeSlots.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      maxPerDay: s.maxPerDay,
    })),
    activeInvitations: c._count.matches,
  };
}

async function loadAllCandidates(): Promise<CandidateInput[]> {
  const list = await prisma.candidateProfile.findMany({
    include: {
      skills: true,
      portfolio: true,
      timeSlots: true,
      _count: { select: { matches: { where: { status: "INVITED" } } } },
    },
  });
  return list.map((c) => ({
    id: c.id,
    grade: c.grade,
    yearsExp: c.yearsExp,
    workFormat: c.workFormat,
    salaryMin: c.salaryMin,
    salaryMax: c.salaryMax,
    skillIds: c.skills.map((s) => s.skillId),
    hasPortfolio: c.portfolio.length > 0,
    hasBio: !!c.bio,
    createdAt: c.createdAt,
    slots: c.timeSlots.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      maxPerDay: s.maxPerDay,
    })),
    activeInvitations: c._count.matches,
  }));
}

async function loadSkillRelations(): Promise<SkillRelations> {
  const rows = await prisma.skillRelation.findMany();
  // relations.get(toId) → Map<fromId, weight>
  const map: SkillRelations = new Map();
  for (const r of rows) {
    let inner = map.get(r.toId);
    if (!inner) { inner = new Map(); map.set(r.toId, inner); }
    inner.set(r.fromId, r.weight);
  }
  return map;
}
