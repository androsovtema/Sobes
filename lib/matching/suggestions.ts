/**
 * Supply-aware skill suggestions.
 *
 * Задача: при заполнении профиля показать кандидату навыки, которые
 * реально востребованы на рынке для его роли + грейда, чтобы он не забыл
 * указать что-то критическое.
 *
 * Три источника подсказок:
 *   1. demand   — частота навыков в активных вакансиях под (headline, grade).
 *                 Фолбэк на общий рынок, если данных по нише мало.
 *   2. clusters — co-occurrence в профилях похожих кандидатов
 *                 (которые уже указали часть тех же навыков).
 *   3. gap      — пробел до медианного количества навыков для роли.
 */
import { prisma } from "@/lib/prisma";

export type SkillSuggestion = {
  name: string;
  category: string | null;
  // Какая доля релевантных вакансий требует этот навык (0..1).
  demandPct: number;
  // Сколько релевантных кандидатов имеют этот навык (0..1).
  cohortPct: number;
  source: "demand" | "cluster" | "gap";
  // Сколько активных вакансий этот навык встречает.
  matchedPositionsCount: number;
};

export type SkillSuggestionsResult = {
  suggestions: SkillSuggestion[];
  // Сколько вакансий мы анализировали — для UI «по данным N вакансий».
  cohortSize: number;
  // Сколько навыков у похожих кандидатов в среднем — для «пробела».
  medianSkillCount: number;
  // true, если узкая ниша оказалась пустой и мы перешли к общему рынку.
  usedFallback: boolean;
};

const MIN_COHORT = 5; // ниже — переключаемся на общий рынок

export async function getSkillSuggestions(input: {
  headline?: string;
  grade?: string;
  currentSkillNames: string[];
  limit?: number;
}): Promise<SkillSuggestionsResult> {
  const limit = input.limit ?? 12;
  const currentSet = new Set(input.currentSkillNames.map((s) => s.toLowerCase()));

  // ─── Целевая когорта вакансий ────────────────────────────
  let { positions, usedFallback } = await fetchCohort(input.headline, input.grade);
  if (positions.length < MIN_COHORT) {
    // Фолбэк: только по grade
    const fb = await fetchCohort(undefined, input.grade);
    positions = fb.positions;
    usedFallback = true;
  }
  if (positions.length < MIN_COHORT) {
    // Финальный фолбэк: весь активный рынок
    positions = await prisma.position.findMany({
      where: { isActive: true },
      include: { skills: { where: { required: true }, include: { skill: true } } },
    });
    usedFallback = true;
  }

  const cohortSize = positions.length;

  // ─── 1. Demand: частота required-навыков ─────────────────
  const demandCount = new Map<string, { count: number; category: string | null }>();
  for (const p of positions) {
    for (const ps of p.skills) {
      const key = ps.skill.name;
      const cur = demandCount.get(key);
      if (cur) cur.count++;
      else demandCount.set(key, { count: 1, category: ps.skill.category });
    }
  }

  // ─── 2. Cluster: co-occurrence в похожих профилях ────────
  // Похожие = у которых есть хотя бы один навык из currentSkillNames И тот же грейд.
  const cohortPctMap = new Map<string, number>();
  let cohortCandidatesSize = 0;
  if (input.currentSkillNames.length > 0) {
    const peers = await prisma.candidateProfile.findMany({
      where: {
        grade: input.grade as
          | "INTERN" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD" | "PRINCIPAL"
          | undefined,
        skills: {
          some: { skill: { name: { in: input.currentSkillNames } } },
        },
      },
      include: { skills: { include: { skill: true } } },
      take: 200,
    });
    cohortCandidatesSize = peers.length;
    if (cohortCandidatesSize > 0) {
      const peerCount = new Map<string, number>();
      for (const p of peers) {
        for (const cs of p.skills) {
          peerCount.set(cs.skill.name, (peerCount.get(cs.skill.name) ?? 0) + 1);
        }
      }
      for (const [name, count] of peerCount) {
        cohortPctMap.set(name, count / cohortCandidatesSize);
      }
    }
  }

  // ─── 3. Медианное количество навыков у похожих ───────────
  const medianSkillCount = await estimateMedianSkillCount(input.headline, input.grade);

  // ─── Сборка suggestions ──────────────────────────────────
  const suggestions: SkillSuggestion[] = [];
  for (const [name, { count, category }] of demandCount) {
    if (currentSet.has(name.toLowerCase())) continue;
    const demandPct = count / cohortSize;
    const cohortPct = cohortPctMap.get(name) ?? 0;
    // Источник определяем по тому, что сильнее.
    let source: SkillSuggestion["source"] = "demand";
    if (cohortPct > demandPct && cohortPct > 0.3) source = "cluster";
    suggestions.push({
      name,
      category,
      demandPct,
      cohortPct,
      source,
      matchedPositionsCount: count,
    });
  }

  // Добавим навыки из cluster, которых не было в demand
  for (const [name, cohortPct] of cohortPctMap) {
    if (currentSet.has(name.toLowerCase())) continue;
    if (demandCount.has(name)) continue;
    if (cohortPct < 0.3) continue;
    suggestions.push({
      name,
      category: null,
      demandPct: 0,
      cohortPct,
      source: "cluster",
      matchedPositionsCount: 0,
    });
  }

  // Сортировка: сначала по demand × значимость, потом по cohort.
  suggestions.sort((a, b) => {
    const scoreA = a.demandPct * 2 + a.cohortPct;
    const scoreB = b.demandPct * 2 + b.cohortPct;
    return scoreB - scoreA;
  });

  return {
    suggestions: suggestions.slice(0, limit),
    cohortSize,
    medianSkillCount,
    usedFallback,
  };
}

// ─── helpers ─────────────────────────────────────────────────

async function fetchCohort(headline?: string, grade?: string) {
  // Headline matching — простой `contains` по ключевым словам.
  // На MVP достаточно: «React» в headline кандидата ↔ «React» в title вакансии.
  const headlineKeywords = extractKeywords(headline);

  const positions = await prisma.position.findMany({
    where: {
      isActive: true,
      ...(grade ? { grade: grade as
        | "INTERN" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD" | "PRINCIPAL" } : {}),
      ...(headlineKeywords.length > 0
        ? {
            OR: headlineKeywords.map((kw) => ({
              title: { contains: kw, mode: "insensitive" as const },
            })),
          }
        : {}),
    },
    include: { skills: { where: { required: true }, include: { skill: true } } },
    take: 200,
  });
  return { positions, usedFallback: false };
}

function extractKeywords(headline?: string): string[] {
  if (!headline) return [];
  // Игнорируем стоп-слова уровня грейда и общие слова — они уже в фильтре по grade.
  const stop = new Set([
    "senior", "junior", "middle", "lead", "principal", "intern",
    "сеньор", "джуниор", "мидл", "лид",
    "разработчик", "developer", "engineer", "инженер",
    "the", "of", "for", "and", "or",
  ]);
  return headline
    .split(/[\s,/]+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length >= 2 && !stop.has(w));
}

async function estimateMedianSkillCount(headline?: string, grade?: string): Promise<number> {
  const where: {
    grade?: "INTERN" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD" | "PRINCIPAL";
    headline?: { contains: string; mode: "insensitive" };
  } = {};
  if (grade) where.grade = grade as
    | "INTERN" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD" | "PRINCIPAL";
  const keywords = extractKeywords(headline);
  if (keywords.length > 0) where.headline = { contains: keywords[0], mode: "insensitive" };

  const profiles = await prisma.candidateProfile.findMany({
    where,
    include: { _count: { select: { skills: true } } },
    take: 200,
  });
  if (profiles.length === 0) return 0;
  const counts = profiles.map((p) => p._count.skills).sort((a, b) => a - b);
  return counts[Math.floor(counts.length / 2)];
}
