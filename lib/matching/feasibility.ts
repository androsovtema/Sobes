/**
 * FeasibilityScore — реальная возможность провести встречу.
 * Множитель ∈ [0..1] для финального балла.
 *
 * Учитывает:
 *  - Пересечение слотов кандидата и HR (часы/неделю).
 *  - Нагрузку кандидата (активные приглашения).
 *  - Возраст профиля/вакансии (cold-start boost).
 *  - Глубину очереди позиции (защита от перегрузки HR).
 */
import { WEIGHTS } from "./weights";
import type { CandidateInput, PositionInput, Slot, DayOfWeek } from "./types";

export type FeasibilityBreakdown = {
  slotOverlapHours: number;
  slotComponent: number;       // 0..1
  loadComponent: number;       // 0..1
  coldStartBoost: number;      // 0..1 добавка
  queueComponent: number;      // 0..1
  multiplier: number;          // итоговый 0..1
};

export function calculateFeasibility(
  candidate: CandidateInput,
  position: PositionInput,
  now: Date = new Date()
): FeasibilityBreakdown {
  // ─── 1. Пересечение слотов ────────────────────────────────
  const overlapHours = computeSlotOverlapHours(candidate.slots, position.slots);
  const slotComponent = (() => {
    if (overlapHours <= 0) return 0;
    if (overlapHours >= WEIGHTS.feasibility.idealSlotOverlapHours) return 1;
    // Линейная интерполяция от minSlotOverlap до ideal.
    const min = WEIGHTS.feasibility.minSlotOverlapHours;
    if (overlapHours < min) return overlapHours / min * 0.5; // sub-min, но не ноль
    return 0.5 + 0.5 * (overlapHours - min) / (WEIGHTS.feasibility.idealSlotOverlapHours - min);
  })();

  // ─── 2. Нагрузка кандидата ────────────────────────────────
  const maxInvites = WEIGHTS.feasibility.maxActiveInvitations;
  const penalty = WEIGHTS.feasibility.invitationLoadPenalty;
  // Каждое активное приглашение уменьшает множитель.
  const loadComponent = Math.max(0, 1 - candidate.activeInvitations * penalty);
  // Если уже на лимите — feasibility почти нулевой (но не строго 0:
  // алгоритм всё равно может предложить как PENDING для HR, но кандидата
  // не пригласят пока он не освободится).
  const hardLoad = candidate.activeInvitations >= maxInvites ? 0.2 : 1;

  // ─── 3. Cold-start boost ──────────────────────────────────
  const ageHoursCand = (now.getTime() - candidate.createdAt.getTime()) / 3_600_000;
  const ageHoursPos = (now.getTime() - position.createdAt.getTime()) / 3_600_000;
  const isFresh = ageHoursCand < WEIGHTS.feasibility.coldStartHours
              || ageHoursPos  < WEIGHTS.feasibility.coldStartHours;
  const coldStartBoost = isFresh ? WEIGHTS.feasibility.coldStartBoost : 0;

  // ─── 4. Глубина очереди позиции ───────────────────────────
  // Если у позиции уже куча кандидатов в PENDING — новые матчи менее ценны
  // (HR не успеет посмотреть). Лёгкий понижающий фактор.
  const queueComponent = position.pendingQueueDepth >= WEIGHTS.match.maxQueueDepth
    ? 0.7
    : 1;

  // ─── Итог ─────────────────────────────────────────────────
  const base = slotComponent * loadComponent * hardLoad * queueComponent;
  const multiplier = Math.min(1, base + coldStartBoost);

  return {
    slotOverlapHours: overlapHours,
    slotComponent,
    loadComponent: loadComponent * hardLoad,
    coldStartBoost,
    queueComponent,
    multiplier,
  };
}

// ─── helpers ─────────────────────────────────────────────────

const DAYS: DayOfWeek[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function computeSlotOverlapHours(a: Slot[], b: Slot[]): number {
  let total = 0;
  for (const day of DAYS) {
    const aDay = a.filter((s) => s.dayOfWeek === day);
    const bDay = b.filter((s) => s.dayOfWeek === day);
    for (const sa of aDay) {
      for (const sb of bDay) {
        total += intervalOverlapMinutes(sa.startTime, sa.endTime, sb.startTime, sb.endTime);
      }
    }
  }
  return total / 60;
}

function intervalOverlapMinutes(s1: string, e1: string, s2: string, e2: string): number {
  const m1 = toMinutes(s1), m2 = toMinutes(e1);
  const m3 = toMinutes(s2), m4 = toMinutes(e2);
  const lo = Math.max(m1, m3);
  const hi = Math.min(m2, m4);
  return Math.max(0, hi - lo);
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
