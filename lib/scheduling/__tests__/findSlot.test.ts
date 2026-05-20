/**
 * Юнит-тесты findAvailableSlot. Запуск:
 *   npx tsx lib/scheduling/__tests__/findSlot.test.ts
 *
 * Все «локальные» времена — Москва (UTC+3).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { findAvailableSlot } from "../findSlot";
import type { Slot } from "@/lib/matching/types";

// Среда, 3 июня 2026, 06:00 UTC = 09:00 MSK.
const NOW = new Date("2026-06-03T06:00:00Z");

// Хелпер: MSK YYYY-MM-DD + HH:MM → UTC Date
function msk(date: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  // MSK = UTC+3, поэтому UTC-часы = MSK - 3
  return new Date(`${date}T${pad(h - 3)}:${pad(m)}:00Z`);
}
function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

const candSlots: Slot[] = [
  { dayOfWeek: "WED", startTime: "10:00", endTime: "14:00", maxPerDay: 2 },
  { dayOfWeek: "THU", startTime: "10:00", endTime: "14:00", maxPerDay: 2 },
  { dayOfWeek: "FRI", startTime: "10:00", endTime: "14:00", maxPerDay: 2 },
];

const hrSlots: Slot[] = [
  { dayOfWeek: "WED", startTime: "11:00", endTime: "15:00", maxPerDay: 3 },
  { dayOfWeek: "THU", startTime: "11:00", endTime: "15:00", maxPerDay: 3 },
  { dayOfWeek: "FRI", startTime: "11:00", endTime: "15:00", maxPerDay: 3 },
];

// ─── 1. Базовый сценарий ────────────────────────────────────────

test("findSlot: возвращает самое раннее пересечение после буфера", () => {
  const slot = findAvailableSlot({
    candidateSlots: candSlots,
    hrSlots,
    candidateBusy: [],
    hrBusy: [],
    fromDate: NOW,
  });
  // NOW = WED 09:00 MSK. Пересечение WED 11:00–14:00.
  // Буфер 60 мин → не раньше 10:00. Старт пересечения — 11:00 MSK.
  assert.ok(slot, "слот должен быть найден");
  assert.equal(slot!.toISOString(), msk("2026-06-03", "11:00").toISOString());
});

// ─── 2. Пустое пересечение ──────────────────────────────────────

test("findSlot: нет общих дней — возвращает null", () => {
  const slot = findAvailableSlot({
    candidateSlots: [{ dayOfWeek: "MON", startTime: "10:00", endTime: "12:00", maxPerDay: 2 }],
    hrSlots: [{ dayOfWeek: "TUE", startTime: "10:00", endTime: "12:00", maxPerDay: 2 }],
    candidateBusy: [],
    hrBusy: [],
    fromDate: NOW,
    horizonDays: 7,
  });
  assert.equal(slot, null);
});

// ─── 3. Длительность не помещается ──────────────────────────────

test("findSlot: пересечение меньше длительности — следующий день", () => {
  const slot = findAvailableSlot({
    candidateSlots: [
      { dayOfWeek: "WED", startTime: "10:00", endTime: "11:30", maxPerDay: 2 },
      { dayOfWeek: "THU", startTime: "10:00", endTime: "14:00", maxPerDay: 2 },
    ],
    hrSlots: [
      { dayOfWeek: "WED", startTime: "11:00", endTime: "15:00", maxPerDay: 3 },
      { dayOfWeek: "THU", startTime: "11:00", endTime: "15:00", maxPerDay: 3 },
    ],
    candidateBusy: [],
    hrBusy: [],
    fromDate: NOW,
    durationMin: 60,
  });
  // WED окно 11:00–11:30 = 30 мин < 60 → пропускаем. THU 11:00–14:00 ok.
  assert.equal(slot!.toISOString(), msk("2026-06-04", "11:00").toISOString());
});

// ─── 4. Занятый интервал сдвигает старт ─────────────────────────

test("findSlot: занятая встреча сдвигает старт внутри окна", () => {
  const slot = findAvailableSlot({
    candidateSlots: candSlots,
    hrSlots,
    candidateBusy: [
      { startAt: msk("2026-06-03", "11:00"), durationMin: 60 }, // занят 11:00–12:00
    ],
    hrBusy: [],
    fromDate: NOW,
  });
  // Окно WED 11:00–14:00, занято 11:00–12:00 → ближайший старт 12:00.
  assert.equal(slot!.toISOString(), msk("2026-06-03", "12:00").toISOString());
});

// ─── 5. maxPerDay у кандидата ───────────────────────────────────

test("findSlot: maxPerDay кандидата исчерпан — следующий день", () => {
  const slot = findAvailableSlot({
    candidateSlots: candSlots,
    hrSlots,
    candidateBusy: [
      { startAt: msk("2026-06-03", "08:00"), durationMin: 60 },
      { startAt: msk("2026-06-03", "16:00"), durationMin: 60 },
    ],
    hrBusy: [],
    fromDate: NOW,
  });
  // candMax=2, оба занятых попадают на 03.06 → пропускаем. Берём 04.06 11:00.
  assert.equal(slot!.toISOString(), msk("2026-06-04", "11:00").toISOString());
});

// ─── 6. maxPerDay у HR ──────────────────────────────────────────

test("findSlot: maxPerDay HR исчерпан — следующий день", () => {
  const slot = findAvailableSlot({
    candidateSlots: candSlots,
    hrSlots,
    candidateBusy: [],
    hrBusy: [
      { startAt: msk("2026-06-03", "11:00"), durationMin: 60 },
      { startAt: msk("2026-06-03", "12:00"), durationMin: 60 },
      { startAt: msk("2026-06-03", "13:00"), durationMin: 60 },
    ],
    fromDate: NOW,
  });
  // hrMax=3, исчерпан. Следующий — 04.06.
  assert.equal(slot!.toISOString(), msk("2026-06-04", "11:00").toISOString());
});

// ─── 7. Буфер времени (не «прямо сейчас») ───────────────────────

test("findSlot: буфер 60 мин отрезает ближайший старт", () => {
  // NOW = 09:00 MSK. Кандидат и HR оба доступны WED 09:00–14:00.
  const slot = findAvailableSlot({
    candidateSlots: [{ dayOfWeek: "WED", startTime: "09:00", endTime: "14:00", maxPerDay: 5 }],
    hrSlots: [{ dayOfWeek: "WED", startTime: "09:00", endTime: "14:00", maxPerDay: 5 }],
    candidateBusy: [],
    hrBusy: [],
    fromDate: NOW,
    bufferMinutes: 60,
  });
  // 09:00 — уже прошло (now+60min = 10:00). Старт = 10:00 MSK.
  assert.equal(slot!.toISOString(), msk("2026-06-03", "10:00").toISOString());
});

// ─── 8. Полный день занят — переход на следующую неделю ─────────

test("findSlot: горизонт 14 дней — берёт следующую неделю", () => {
  // Кандидат и HR доступны только в WED. Заблокируем оба WED ближайших 14 дней.
  const slot = findAvailableSlot({
    candidateSlots: [{ dayOfWeek: "WED", startTime: "10:00", endTime: "14:00", maxPerDay: 2 }],
    hrSlots: [{ dayOfWeek: "WED", startTime: "11:00", endTime: "15:00", maxPerDay: 2 }],
    candidateBusy: [
      { startAt: msk("2026-06-03", "11:00"), durationMin: 60 },
      { startAt: msk("2026-06-03", "12:00"), durationMin: 60 },
    ],
    hrBusy: [],
    fromDate: NOW,
  });
  // 03.06 (WED) исчерпан, следующий WED — 10.06.
  assert.equal(slot!.toISOString(), msk("2026-06-10", "11:00").toISOString());
});

// ─── 9. Нет слотов — null ───────────────────────────────────────

test("findSlot: у кандидата нет слотов — null", () => {
  const slot = findAvailableSlot({
    candidateSlots: [],
    hrSlots,
    candidateBusy: [],
    hrBusy: [],
    fromDate: NOW,
  });
  assert.equal(slot, null);
});
