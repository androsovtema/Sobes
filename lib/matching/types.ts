/**
 * Типы для алгоритма матчинга — самодостаточные структуры,
 * чтобы pure-функции не зависели от Prisma напрямую.
 */

export type Grade = "INTERN" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD" | "PRINCIPAL";
export type WorkFormat = "REMOTE" | "OFFICE" | "HYBRID";
export type DayOfWeek = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export type Slot = {
  dayOfWeek: DayOfWeek;
  startTime: string; // "10:00"
  endTime: string;   // "14:00"
  maxPerDay: number;
};

export type CandidateInput = {
  id: string;
  grade: Grade;
  yearsExp: number;
  workFormat: WorkFormat;
  salaryMin: number;
  salaryMax: number;
  skillIds: string[];           // канонические skillIds
  hasPortfolio: boolean;
  hasBio: boolean;
  createdAt: Date;
  slots: Slot[];
  activeInvitations: number;    // сколько INVITED у кандидата сейчас
};

export type PositionInput = {
  id: string;
  grade: Grade;
  workFormat: WorkFormat;
  salaryMin: number;
  salaryMax: number;
  requiredSkillIds: string[];
  niceToHaveSkillIds: string[];
  createdAt: Date;
  slots: Slot[];
  pendingQueueDepth: number;    // PENDING матчей на эту позицию
};

// Карта связей: relations.get(toId)?.get(fromId) === weight
// (для лукапа: "у кандидата есть fromId — насколько он покрывает требование toId").
export type SkillRelations = Map<string, Map<string, number>>;

export type FitBreakdown = {
  requiredSkillsCoverage: number;   // 0..max
  additionalSkills: number;
  grade: number;
  experienceYears: number;
  salary: number;
  workFormat: number;
  industry: number;
  // Метаданные для UI «почему в топе»
  meta: {
    requiredCoveredPct: number;     // 0..1
    matchedRequiredSkills: string[];
    missingRequiredSkills: string[];
    matchedViaRelation: { skillId: string; weight: number }[];
  };
};

export type FitResult =
  | { hardFiltered: true; reason: string }
  | {
      hardFiltered: false;
      fitScore: number;             // 0..100
      breakdown: FitBreakdown;
    };
