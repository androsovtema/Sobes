import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { calculateFit } from "@/lib/matching/fit";
import { WEIGHTS } from "@/lib/matching/weights";
import type { CandidateInput, PositionInput, SkillRelations } from "@/lib/matching/types";

const schema = z.object({
  // Если кандидат ещё не сохранил профиль — оцениваем "на лету".
  draft: z.object({
    grade: z.enum(["INTERN", "JUNIOR", "MIDDLE", "SENIOR", "LEAD", "PRINCIPAL"]),
    yearsExp: z.number().int().min(0).max(50),
    workFormat: z.enum(["REMOTE", "OFFICE", "HYBRID"]),
    salaryMin: z.number().int().min(0),
    salaryMax: z.number().int().min(0),
    skillNames: z.array(z.string()).max(50),
  }),
  // Для каких навыков посчитать +дельту (counterfactual).
  hypotheticalSkills: z.array(z.string()).max(20).optional(),
});

/**
 * Эндпоинт показывает кандидату:
 *  - Сколько активных вакансий он сейчас матчит (FitScore-only, без Feasibility/Interest).
 *  - На сколько вырастет это число, если он добавит каждый из переданных навыков.
 *
 * Это даёт прозрачную мотивацию: «если добавите Docker — попадёте ещё в 8 вакансий».
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { draft, hypotheticalSkills } = parsed.data;

  // ─── Загружаем активные позиции, навыки, связи ───────────
  const [positions, skills, relRows] = await Promise.all([
    prisma.position.findMany({
      where: { isActive: true },
      include: {
        skills: true,
        hrSlots: true,
      },
    }),
    prisma.skill.findMany({ select: { id: true, name: true } }),
    prisma.skillRelation.findMany(),
  ]);

  const nameToId = new Map(skills.map((s: { id: string; name: string }) => [s.name.toLowerCase(), s.id] as const));
  const resolveIds = (names: string[]) =>
    names
      .map((n) => nameToId.get(n.toLowerCase()))
      .filter((id): id is string => !!id);

  const relations: SkillRelations = new Map();
  for (const r of relRows) {
    let inner = relations.get(r.toId);
    if (!inner) { inner = new Map(); relations.set(r.toId, inner); }
    inner.set(r.fromId, r.weight);
  }

  const positionInputs: PositionInput[] = positions.map((p) => ({
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
    pendingQueueDepth: 0,
  }));

  function buildCandidate(skillNames: string[]): CandidateInput {
    return {
      id: "draft",
      grade: draft.grade,
      yearsExp: draft.yearsExp,
      workFormat: draft.workFormat,
      salaryMin: draft.salaryMin,
      salaryMax: draft.salaryMax,
      skillIds: resolveIds(skillNames),
      hasPortfolio: false,
      hasBio: false,
      createdAt: new Date(),
      slots: [],
      activeInvitations: 0,
    };
  }

  function countMatches(cand: CandidateInput): number {
    let n = 0;
    for (const pos of positionInputs) {
      const fit = calculateFit(cand, pos, relations);
      if (fit.hardFiltered) continue;
      // Используем порог fit-only (без feasibility/interest), т.к. кандидат ещё не задал слоты.
      if (fit.fitScore >= WEIGHTS.match.minScoreToCreate) n++;
    }
    return n;
  }

  const base = buildCandidate(draft.skillNames);
  const baseCount = countMatches(base);

  // ─── Counterfactual ─────────────────────────────────────
  const deltas: { skill: string; delta: number; newTotal: number }[] = [];
  for (const skill of hypotheticalSkills ?? []) {
    if (draft.skillNames.includes(skill)) continue;
    const withSkill = buildCandidate([...draft.skillNames, skill]);
    const newTotal = countMatches(withSkill);
    deltas.push({ skill, delta: newTotal - baseCount, newTotal });
  }
  deltas.sort((a, b) => b.delta - a.delta);

  return NextResponse.json({
    activePositionsTotal: positions.length,
    currentMatches: baseCount,
    deltas,
  });
}
