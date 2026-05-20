/**
 * КОНФИГ АЛГОРИТМА МАТЧИНГА
 * ─────────────────────────
 * Все веса и пороги — здесь. Это позволяет тюнить алгоритм
 * без правок логики и потом подключить персональные веса на HR.
 *
 * Финальный балл матча:
 *   final = fit × feasibilityMultiplier × interestMultiplier
 *   где fit ∈ [0..100], а множители ∈ [0..1]
 *
 * Hard filters отсекают пары до подсчёта баллов.
 */

export const WEIGHTS = {
  // ─── Hard filters ───────────────────────────────────────
  hardFilters: {
    maxGradeDiff: 1,            // разница в грейдах больше — отказ
    requireSalaryOverlap: true, // вилки должны пересекаться
    requireFormatCompat: true,  // несовместимые форматы — отказ
  },

  // ─── FitScore components (сумма = 100) ──────────────────
  fit: {
    requiredSkillsCoverage: 35, // % required-навыков вакансии у кандидата
    additionalSkills: 10,       // бонус за nice-to-have и сверх-навыки
    grade: 15,                  // точность по грейду
    experienceYears: 10,        // соответствие лет опыта грейду
    salary: 15,                 // пересечение зарплатных вилок
    workFormat: 10,             // совпадение формата
    industry: 5,                // совпадение индустрии/продукта (опц.)
  },

  // ─── Skill matching detail ──────────────────────────────
  skills: {
    // Partial credit за родственные навыки (из SkillRelation).
    // Если у кандидата Next.js, а требуется React, и weight(Next.js→React)=0.7,
    // то этот навык засчитывается на 70%.
    minRelationWeight: 0.4,
    // Доля required-навыков, ниже которой матч считается слабым (но не отсеивается).
    softRequiredThreshold: 0.5,
  },

  // ─── FeasibilityScore (0..1 множитель) ──────────────────
  feasibility: {
    // Минимум часов пересечения слотов кандидата и HR в неделю.
    minSlotOverlapHours: 1,
    // Часы пересечения, при которых множитель = 1.0
    idealSlotOverlapHours: 8,
    // Активные приглашения у кандидата — выше N матч приостанавливается.
    maxActiveInvitations: 3,
    // Кандидат уже имеет N приглашений → множитель уменьшается на этот шаг.
    invitationLoadPenalty: 0.2,
    // Cold-start: новые профили/вакансии моложе N часов получают boost.
    coldStartHours: 72,
    coldStartBoost: 0.15,
  },

  // ─── MutualInterest (0..1 множитель) ────────────────────
  interest: {
    // P_accept: вероятность что кандидат примет приглашение.
    // Базируется на зарплате и формате относительно ожиданий кандидата.
    pAccept: {
      // Зарплата вакансии vs минимум кандидата:
      // ниже minSalaryRatio → P_accept низкий; выше idealSalaryRatio → 1.0
      minSalaryRatio: 0.9,    // 90% от минимума кандидата
      idealSalaryRatio: 1.15, // 115% и выше — отлично
      // Совпадение формата: точное = 1, гибрид-совместимое = 0.7
      formatExactBonus: 0.2,
      // Минимальное значение P_accept (даже при плохих условиях).
      floor: 0.2,
    },
    // P_invite: вероятность что HR пригласит этого кандидата.
    pInvite: {
      // Базовый множитель от полноты профиля (наличие портфолио, bio).
      profileCompletenessWeight: 0.3,
      // Слабый матч (мало required) — HR скорее пропустит.
      lowFitPenaltyThreshold: 50,
      lowFitMultiplier: 0.6,
      floor: 0.3,
    },
  },

  // ─── Создание Match ─────────────────────────────────────
  match: {
    // Не создаём Match с финальным баллом ниже этого порога.
    minScoreToCreate: 40,
    // Максимум кандидатов в очереди PENDING на одну позицию.
    maxQueueDepth: 50,
  },

  // ─── Exploration / Fairness ─────────────────────────────
  fairness: {
    // % топа очереди — обычные лучшие.
    exploitationShare: 0.85,
    // % очереди — exploration: кандидаты с чуть меньшим баллом для разнообразия.
    explorationShare: 0.15,
  },
} as const;

// Числовое представление грейдов для расчёта разницы.
export const GRADE_ORDER: Record<string, number> = {
  INTERN: 0,
  JUNIOR: 1,
  MIDDLE: 2,
  SENIOR: 3,
  LEAD: 4,
  PRINCIPAL: 5,
};

// Типичный диапазон лет опыта по грейдам (для experienceYears scoring).
export const GRADE_EXP_RANGE: Record<string, [number, number]> = {
  INTERN: [0, 1],
  JUNIOR: [0, 2],
  MIDDLE: [2, 5],
  SENIOR: [4, 8],
  LEAD: [6, 12],
  PRINCIPAL: [8, 20],
};
