/**
 * FitScore — содержательная совместимость кандидата и вакансии.
 * Pure function: ни Prisma, ни сетевых вызовов.
 *
 * Шаги:
 *  1. Hard filters (грейд, формат, зарплата) — отсев.
 *  2. Подсчёт компонентов с весами из weights.ts.
 *  3. Возврат breakdown для прозрачности и обучения.
 */
import { WEIGHTS, GRADE_ORDER, GRADE_EXP_RANGE } from "./weights";
import type {
  CandidateInput,
  PositionInput,
  SkillRelations,
  FitResult,
  FitBreakdown,
} from "./types";

export function calculateFit(
  candidate: CandidateInput,
  position: PositionInput,
  relations: SkillRelations
): FitResult {
  // ─── 1. Hard filters ───────────────────────────────────────
  const gradeDiff = Math.abs(GRADE_ORDER[candidate.grade] - GRADE_ORDER[position.grade]);
  if (gradeDiff > WEIGHTS.hardFilters.maxGradeDiff) {
    return { hardFiltered: true, reason: `grade diff ${gradeDiff} > max` };
  }

  if (WEIGHTS.hardFilters.requireSalaryOverlap) {
    const overlap = Math.min(candidate.salaryMax, position.salaryMax)
                  - Math.max(candidate.salaryMin, position.salaryMin);
    if (overlap < 0) {
      return { hardFiltered: true, reason: "salary ranges do not intersect" };
    }
  }

  if (WEIGHTS.hardFilters.requireFormatCompat) {
    if (!isFormatCompatible(candidate.workFormat, position.workFormat)) {
      return { hardFiltered: true, reason: "work format incompatible" };
    }
  }

  // ─── 2. Soft scoring ───────────────────────────────────────
  const candidateSkillSet = new Set(candidate.skillIds);

  // Required skills coverage с учётом алиасов и родственных навыков.
  const requiredCoverage = scoreSkillCoverage(
    position.requiredSkillIds,
    candidateSkillSet,
    relations
  );
  const additionalSkillsScore = scoreAdditionalSkills(
    candidate.skillIds,
    position.requiredSkillIds,
    position.niceToHaveSkillIds,
    candidateSkillSet,
    relations
  );

  // Grade fit
  const gradeScore = gradeDiff === 0
    ? WEIGHTS.fit.grade
    : WEIGHTS.fit.grade * 0.5;

  // Experience years vs grade
  const expScore = scoreExperience(candidate.yearsExp, position.grade);

  // Salary overlap (доля пересечения + положение)
  const salaryScore = scoreSalary(
    candidate.salaryMin, candidate.salaryMax,
    position.salaryMin, position.salaryMax
  );

  // Work format
  const formatScore = candidate.workFormat === position.workFormat
    ? WEIGHTS.fit.workFormat
    : WEIGHTS.fit.workFormat * 0.5;

  // Industry — в MVP пока 0 (нет данных в профиле/вакансии)
  const industryScore = 0;

  const breakdown: FitBreakdown = {
    requiredSkillsCoverage: requiredCoverage.score,
    additionalSkills: additionalSkillsScore,
    grade: gradeScore,
    experienceYears: expScore,
    salary: salaryScore,
    workFormat: formatScore,
    industry: industryScore,
    meta: {
      requiredCoveredPct: requiredCoverage.coveredPct,
      matchedRequiredSkills: requiredCoverage.matched,
      missingRequiredSkills: requiredCoverage.missing,
      matchedViaRelation: requiredCoverage.viaRelation,
    },
  };

  const fitScore = Math.round(
    breakdown.requiredSkillsCoverage +
    breakdown.additionalSkills +
    breakdown.grade +
    breakdown.experienceYears +
    breakdown.salary +
    breakdown.workFormat +
    breakdown.industry
  );

  return { hardFiltered: false, fitScore, breakdown };
}

// ─── helpers ─────────────────────────────────────────────────

function isFormatCompatible(c: string, p: string): boolean {
  if (c === p) return true;
  // HYBRID совместим с REMOTE и OFFICE
  if (c === "HYBRID" || p === "HYBRID") return true;
  return false;
}

/**
 * Покрытие required-навыков с partial credit:
 *  - Прямое совпадение: 1.0
 *  - Родственный навык (SkillRelation, FROM→TO): weight (если ≥ minRelationWeight)
 */
function scoreSkillCoverage(
  required: string[],
  candidateSkills: Set<string>,
  relations: SkillRelations
): {
  score: number;
  coveredPct: number;
  matched: string[];
  missing: string[];
  viaRelation: { skillId: string; weight: number }[];
} {
  if (required.length === 0) {
    return {
      score: WEIGHTS.fit.requiredSkillsCoverage,
      coveredPct: 1,
      matched: [], missing: [], viaRelation: [],
    };
  }

  let totalCoverage = 0;
  const matched: string[] = [];
  const missing: string[] = [];
  const viaRelation: { skillId: string; weight: number }[] = [];

  for (const reqId of required) {
    if (candidateSkills.has(reqId)) {
      totalCoverage += 1;
      matched.push(reqId);
      continue;
    }
    // Ищем максимальный вес родственного покрытия
    const sources = relations.get(reqId);
    let best = 0;
    if (sources) {
      for (const candId of candidateSkills) {
        const w = sources.get(candId) ?? 0;
        if (w > best) best = w;
      }
    }
    if (best >= WEIGHTS.skills.minRelationWeight) {
      totalCoverage += best;
      viaRelation.push({ skillId: reqId, weight: best });
    } else {
      missing.push(reqId);
    }
  }

  const coveredPct = totalCoverage / required.length;
  return {
    score: coveredPct * WEIGHTS.fit.requiredSkillsCoverage,
    coveredPct,
    matched, missing, viaRelation,
  };
}

/**
 * Бонус за nice-to-have и за дополнительный стек сверх требований.
 */
function scoreAdditionalSkills(
  candidateSkillIds: string[],
  required: string[],
  niceToHave: string[],
  candidateSkills: Set<string>,
  relations: SkillRelations
): number {
  if (niceToHave.length === 0 && candidateSkillIds.length === 0) return 0;

  // Покрытие nice-to-have
  let niceCoverage = 0;
  if (niceToHave.length > 0) {
    for (const nh of niceToHave) {
      if (candidateSkills.has(nh)) {
        niceCoverage += 1;
        continue;
      }
      const sources = relations.get(nh);
      let best = 0;
      if (sources) {
        for (const candId of candidateSkills) {
          const w = sources.get(candId) ?? 0;
          if (w > best) best = w;
        }
      }
      if (best >= WEIGHTS.skills.minRelationWeight) niceCoverage += best;
    }
    niceCoverage /= niceToHave.length;
  }

  // Лёгкий бонус за широту: кандидат с 8 навыками сильнее кандидата с минимально-достаточным набором.
  const totalReq = required.length + niceToHave.length;
  const extras = Math.max(0, candidateSkillIds.length - totalReq);
  const breadthBonus = Math.min(1, extras / 5); // насыщение на 5 доп.навыках

  // niceCoverage даёт большую часть бонуса, breadthBonus — добавка.
  return (niceCoverage * 0.7 + breadthBonus * 0.3) * WEIGHTS.fit.additionalSkills;
}

function scoreExperience(years: number, grade: string): number {
  const [lo, hi] = GRADE_EXP_RANGE[grade] ?? [0, 100];
  if (years >= lo && years <= hi) return WEIGHTS.fit.experienceYears;
  // Чем дальше от диапазона — тем ниже балл (но не 0).
  const dist = years < lo ? lo - years : years - hi;
  const decay = Math.max(0, 1 - dist / 5); // полностью обнуляется на расстоянии 5+ лет
  return WEIGHTS.fit.experienceYears * decay;
}

function scoreSalary(cMin: number, cMax: number, pMin: number, pMax: number): number {
  const overlapLo = Math.max(cMin, pMin);
  const overlapHi = Math.min(cMax, pMax);
  const overlap = Math.max(0, overlapHi - overlapLo);

  if (overlap === 0) return WEIGHTS.fit.salary * 0.2; // hard-filter мог не сработать (одна точка)

  // Доля пересечения от меньшего из двух диапазонов.
  const cRange = Math.max(1, cMax - cMin);
  const pRange = Math.max(1, pMax - pMin);
  const intersectionRatio = overlap / Math.min(cRange, pRange);

  // Бонус если предложение «выше» ожиданий кандидата — это повышает P_accept.
  const aboveCandidateMin = pMin >= cMin ? 1 : Math.max(0, pMin / cMin);

  const score = WEIGHTS.fit.salary * (0.6 * Math.min(1, intersectionRatio) + 0.4 * aboveCandidateMin);
  return score;
}
