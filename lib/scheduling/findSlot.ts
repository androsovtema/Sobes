/**
 * Подбор конкретного слота встречи.
 *
 * Использует ту же модель «слот по дню недели + интервал HH:MM», что и
 * feasibility-скоринг, но возвращает первый подходящий конкретный Date.
 *
 *   ┌─ Пересечение по дню недели ─┐
 *   │  кандидат: MON 10:00–14:00  │
 *   │  HR:       MON 11:00–15:00  │
 *   │  → окно:   MON 11:00–14:00  │
 *   └─────────────────────────────┘
 *
 * В окне ищем самый ранний старт длиной durationMin, который:
 *   1) ≥ fromDate (+ небольшой буфер «не сейчас»)
 *   2) не пересекается с уже занятыми встречами кандидата/HR
 *   3) не нарушает maxPerDay по обеим сторонам
 *
 * Время в DayOfWeek-слотах хранится как «локальное московское» (UTC+3).
 * Параметр tzOffsetMinutes позволяет поменять зону, если когда-нибудь
 * понадобится.
 */
import type { DayOfWeek, Slot } from "@/lib/matching/types";

export type BusyInterval = {
  startAt: Date;
  durationMin: number;
};

export type FindSlotInput = {
  candidateSlots: Slot[];
  hrSlots: Slot[];
  candidateBusy: BusyInterval[];   // все будущие встречи кандидата (любые позиции)
  hrBusy: BusyInterval[];          // встречи HR по этой позиции
  durationMin?: number;            // длительность встречи, по умолчанию 60
  fromDate?: Date;                 // нижняя граница (обычно «сейчас»)
  horizonDays?: number;            // глубина поиска вперёд (по умолчанию 14)
  tzOffsetMinutes?: number;        // смещение зоны слотов от UTC, MSK = +180
  bufferMinutes?: number;          // «не раньше чем через N минут от now»
};

const DAY_NAMES: DayOfWeek[] = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function findAvailableSlot(input: FindSlotInput): Date | null {
  const {
    candidateSlots,
    hrSlots,
    candidateBusy,
    hrBusy,
    durationMin = 60,
    fromDate = new Date(),
    horizonDays = 14,
    tzOffsetMinutes = 180,
    bufferMinutes = 60,
  } = input;

  if (candidateSlots.length === 0 || hrSlots.length === 0) return null;

  const lowerBoundMs = fromDate.getTime() + bufferMinutes * 60_000;

  // Идём день за днём начиная от fromDate.
  for (let d = 0; d < horizonDays; d++) {
    const dayDate = addDays(fromDate, d);
    const dow = dayOfWeekInTZ(dayDate, tzOffsetMinutes);

    const candDay = candidateSlots.filter((s) => s.dayOfWeek === dow);
    const hrDay = hrSlots.filter((s) => s.dayOfWeek === dow);
    if (candDay.length === 0 || hrDay.length === 0) continue;

    // Проверка maxPerDay для обеих сторон (по любой паре слотов с минимальным maxPerDay).
    const candMax = Math.min(...candDay.map((s) => s.maxPerDay));
    const hrMax = Math.min(...hrDay.map((s) => s.maxPerDay));

    const candBookedToday = countBookingsOnDay(candidateBusy, dayDate, tzOffsetMinutes);
    const hrBookedToday = countBookingsOnDay(hrBusy, dayDate, tzOffsetMinutes);
    if (candBookedToday >= candMax || hrBookedToday >= hrMax) continue;

    // Все попарные пересечения слотов кандидата и HR в этот день.
    const windows: { startMin: number; endMin: number }[] = [];
    for (const a of candDay) {
      for (const b of hrDay) {
        const start = Math.max(toMinutes(a.startTime), toMinutes(b.startTime));
        const end = Math.min(toMinutes(a.endTime), toMinutes(b.endTime));
        if (end - start >= durationMin) windows.push({ startMin: start, endMin: end });
      }
    }
    if (windows.length === 0) continue;
    windows.sort((x, y) => x.startMin - y.startMin);

    // Занятые интервалы на этот день, в локальных минутах.
    const busy = [
      ...busyIntervalsOnDay(candidateBusy, dayDate, tzOffsetMinutes),
      ...busyIntervalsOnDay(hrBusy, dayDate, tzOffsetMinutes),
    ].sort((x, y) => x.startMin - y.startMin);

    for (const win of windows) {
      const candidate = earliestFit(win, busy, durationMin);
      if (candidate === null) continue;
      const startUtcMs = localMinutesToUtcMs(dayDate, candidate, tzOffsetMinutes);
      if (startUtcMs < lowerBoundMs) {
        // Слот в прошлом или ближе чем буфер — попробуем сдвинуть позже в этом окне.
        const minStart = Math.max(
          candidate,
          minutesFromUtcMs(lowerBoundMs, dayDate, tzOffsetMinutes),
        );
        if (minStart + durationMin > win.endMin) continue;
        const fitted = earliestFit({ startMin: minStart, endMin: win.endMin }, busy, durationMin);
        if (fitted === null) continue;
        return new Date(localMinutesToUtcMs(dayDate, fitted, tzOffsetMinutes));
      }
      return new Date(startUtcMs);
    }
  }

  return null;
}

// ─── helpers ─────────────────────────────────────────────────

function earliestFit(
  win: { startMin: number; endMin: number },
  busy: { startMin: number; endMin: number }[],
  durationMin: number,
): number | null {
  let cursor = win.startMin;
  for (const b of busy) {
    if (b.endMin <= cursor) continue;
    if (b.startMin >= win.endMin) break;
    if (b.startMin - cursor >= durationMin) return cursor;
    cursor = Math.max(cursor, b.endMin);
  }
  if (win.endMin - cursor >= durationMin) return cursor;
  return null;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/**
 * День недели в указанной зоне.
 * Сдвигаем UTC-время на offset и читаем UTC-день: это эквивалентно
 * «локальному дню» без зависимости от системной TZ Node.
 */
function dayOfWeekInTZ(d: Date, tzOffsetMinutes: number): DayOfWeek {
  const shifted = new Date(d.getTime() + tzOffsetMinutes * 60_000);
  return DAY_NAMES[shifted.getUTCDay()];
}

/**
 * Локальная полночь (UTC ms) для дня, в котором лежит `d` в заданной зоне.
 */
function localMidnightUtcMs(d: Date, tzOffsetMinutes: number): number {
  const shifted = new Date(d.getTime() + tzOffsetMinutes * 60_000);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  // Полночь локальная = (00:00 в зоне) → UTC: -offset
  return Date.UTC(y, m, day) - tzOffsetMinutes * 60_000;
}

function localMinutesToUtcMs(d: Date, minutes: number, tzOffsetMinutes: number): number {
  return localMidnightUtcMs(d, tzOffsetMinutes) + minutes * 60_000;
}

function minutesFromUtcMs(utcMs: number, refDay: Date, tzOffsetMinutes: number): number {
  return Math.ceil((utcMs - localMidnightUtcMs(refDay, tzOffsetMinutes)) / 60_000);
}

function busyIntervalsOnDay(
  busy: BusyInterval[],
  refDay: Date,
  tzOffsetMinutes: number,
): { startMin: number; endMin: number }[] {
  const midnight = localMidnightUtcMs(refDay, tzOffsetMinutes);
  const nextMidnight = midnight + 86_400_000;
  const out: { startMin: number; endMin: number }[] = [];
  for (const b of busy) {
    const start = b.startAt.getTime();
    const end = start + b.durationMin * 60_000;
    if (end <= midnight || start >= nextMidnight) continue;
    const sMin = Math.max(0, Math.floor((start - midnight) / 60_000));
    const eMin = Math.min(1440, Math.ceil((end - midnight) / 60_000));
    out.push({ startMin: sMin, endMin: eMin });
  }
  return out;
}

function countBookingsOnDay(
  busy: BusyInterval[],
  refDay: Date,
  tzOffsetMinutes: number,
): number {
  return busyIntervalsOnDay(busy, refDay, tzOffsetMinutes).length;
}
