/**
 * Юнит-тесты алгоритма матчинга. Запуск:
 *   npx tsx lib/matching/__tests__/algorithm.test.ts
 *
 * Используем node:test (встроен в Node 20+) — ноль зависимостей.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { calculateFit } from "../fit";
import { calculateFeasibility } from "../feasibility";
import { calculateMutualInterest } from "../interest";
import { WEIGHTS } from "../weights";
import type { CandidateInput, PositionInput, SkillRelations } from "../types";

// ─── Фикстуры ────────────────────────────────────────────────

const NOW = new Date("2026-06-01T12:00:00Z");

const baseCand = (over: Partial<CandidateInput> = {}): CandidateInput => ({
  id: "c1",
  grade: "SENIOR",
  yearsExp: 6,
  workFormat: "REMOTE",
  salaryMin: 200_000,
  salaryMax: 350_000,
  skillIds: ["React", "TypeScript", "Node.js", "PostgreSQL"],
  hasPortfolio: true,
  hasBio: true,
  createdAt: new Date("2026-01-01"),
  slots: [
    { dayOfWeek: "MON", startTime: "10:00", endTime: "14:00", maxPerDay: 2 },
    { dayOfWeek: "TUE", startTime: "10:00", endTime: "14:00", maxPerDay: 2 },
  ],
  activeInvitations: 0,
  ...over,
});

const basePos = (over: Partial<PositionInput> = {}): PositionInput => ({
  id: "p1",
  grade: "SENIOR",
  workFormat: "REMOTE",
  salaryMin: 250_000,
  salaryMax: 400_000,
  requiredSkillIds: ["React", "TypeScript", "Node.js"],
  niceToHaveSkillIds: ["PostgreSQL"],
  createdAt: new Date("2026-01-01"),
  slots: [
    { dayOfWeek: "MON", startTime: "11:00", endTime: "15:00", maxPerDay: 3 },
    { dayOfWeek: "WED", startTime: "11:00", endTime: "15:00", maxPerDay: 3 },
  ],
  pendingQueueDepth: 0,
  ...over,
});

const noRelations: SkillRelations = new Map();

// ─── FIT TESTS ───────────────────────────────────────────────

test("fit: идеальный матч даёт ~максимум баллов", () => {
  const res = calculateFit(baseCand(), basePos(), noRelations);
  assert.equal(res.hardFiltered, false);
  if (res.hardFiltered) return;
  assert.ok(res.fitScore >= 85, `ожидался >= 85, получили ${res.fitScore}`);
  assert.equal(res.breakdown.meta.missingRequiredSkills.length, 0);
});

test("fit: разница в грейдах > 1 → hardFiltered", () => {
  const res = calculateFit(
    baseCand({ grade: "JUNIOR" }),
    basePos({ grade: "SENIOR" }),
    noRelations
  );
  assert.equal(res.hardFiltered, true);
});

test("fit: грейд ±1 → проходит", () => {
  const res = calculateFit(
    baseCand({ grade: "MIDDLE" }),
    basePos({ grade: "SENIOR" }),
    noRelations
  );
  assert.equal(res.hardFiltered, false);
});

test("fit: непересекающиеся зарплаты → hardFiltered", () => {
  const res = calculateFit(
    baseCand({ salaryMin: 500_000, salaryMax: 700_000 }),
    basePos({ salaryMin: 100_000, salaryMax: 200_000 }),
    noRelations
  );
  assert.equal(res.hardFiltered, true);
});

test("fit: несовместимые форматы → hardFiltered", () => {
  const res = calculateFit(
    baseCand({ workFormat: "REMOTE" }),
    basePos({ workFormat: "OFFICE" }),
    noRelations
  );
  assert.equal(res.hardFiltered, true);
});

test("fit: HYBRID совместим с REMOTE и OFFICE", () => {
  const r1 = calculateFit(baseCand({ workFormat: "HYBRID" }), basePos({ workFormat: "REMOTE" }), noRelations);
  const r2 = calculateFit(baseCand({ workFormat: "REMOTE" }), basePos({ workFormat: "HYBRID" }), noRelations);
  assert.equal(r1.hardFiltered, false);
  assert.equal(r2.hardFiltered, false);
});

test("fit: частичное покрытие required снижает балл", () => {
  const res = calculateFit(
    baseCand({ skillIds: ["React"] }),  // 1 из 3 required
    basePos(),
    noRelations
  );
  assert.equal(res.hardFiltered, false);
  if (res.hardFiltered) return;
  assert.ok(res.breakdown.meta.requiredCoveredPct < 0.5);
  assert.ok(res.fitScore < 70, `ожидался < 70, получили ${res.fitScore}`);
});

test("fit: родственный навык даёт partial credit", () => {
  const rel: SkillRelations = new Map([
    ["React", new Map([["Next.js", 0.85]])],
  ]);
  const res = calculateFit(
    baseCand({ skillIds: ["Next.js", "TypeScript", "Node.js"] }),  // React заменён на Next.js
    basePos(),
    rel
  );
  assert.equal(res.hardFiltered, false);
  if (res.hardFiltered) return;
  // Покрытие должно быть выше "ничего" но не идеальное.
  assert.ok(res.breakdown.meta.matchedViaRelation.length > 0);
  assert.ok(res.breakdown.meta.requiredCoveredPct > 0.8);
});

test("fit: experience сильно отличается от грейда → штраф", () => {
  const res = calculateFit(
    baseCand({ yearsExp: 0 }),  // SENIOR с 0 лет опыта
    basePos(),
    noRelations
  );
  assert.equal(res.hardFiltered, false);
  if (res.hardFiltered) return;
  assert.ok(res.breakdown.experienceYears < WEIGHTS.fit.experienceYears);
});

// ─── FEASIBILITY TESTS ───────────────────────────────────────

test("feasibility: нулевое пересечение слотов → ~0 (с учётом cold-start)", () => {
  const r = calculateFeasibility(
    baseCand({ slots: [{ dayOfWeek: "SAT", startTime: "10:00", endTime: "12:00", maxPerDay: 1 }] }),
    basePos({ slots: [{ dayOfWeek: "SUN", startTime: "10:00", endTime: "12:00", maxPerDay: 1 }] }),
    NOW
  );
  assert.equal(r.slotComponent, 0);
});

test("feasibility: хорошее пересечение → высокий множитель", () => {
  const r = calculateFeasibility(
    baseCand({
      slots: [
        { dayOfWeek: "MON", startTime: "10:00", endTime: "18:00", maxPerDay: 3 },
        { dayOfWeek: "TUE", startTime: "10:00", endTime: "18:00", maxPerDay: 3 },
      ],
    }),
    basePos({
      slots: [
        { dayOfWeek: "MON", startTime: "10:00", endTime: "18:00", maxPerDay: 3 },
        { dayOfWeek: "TUE", startTime: "10:00", endTime: "18:00", maxPerDay: 3 },
      ],
    }),
    NOW
  );
  assert.ok(r.multiplier >= 0.9, `ожидался >= 0.9, получили ${r.multiplier}`);
});

test("feasibility: нагрузка кандидата уменьшает множитель", () => {
  const free = calculateFeasibility(baseCand({ activeInvitations: 0 }), basePos(), NOW);
  const busy = calculateFeasibility(baseCand({ activeInvitations: 2 }), basePos(), NOW);
  assert.ok(busy.multiplier < free.multiplier);
});

test("feasibility: кандидат на лимите приглашений → почти заморожен", () => {
  const r = calculateFeasibility(
    baseCand({ activeInvitations: WEIGHTS.feasibility.maxActiveInvitations }),
    basePos(),
    NOW
  );
  assert.ok(r.multiplier <= 0.3, `ожидался <= 0.3, получили ${r.multiplier}`);
});

test("feasibility: свежий кандидат получает cold-start boost", () => {
  const fresh = calculateFeasibility(
    baseCand({ createdAt: new Date(NOW.getTime() - 1 * 3600_000) }), // 1 час назад
    basePos({ createdAt: new Date(NOW.getTime() - 1000 * 3600_000) }),
    NOW
  );
  const old = calculateFeasibility(
    baseCand({ createdAt: new Date(NOW.getTime() - 1000 * 3600_000) }),
    basePos({ createdAt: new Date(NOW.getTime() - 1000 * 3600_000) }),
    NOW
  );
  assert.ok(fresh.coldStartBoost > 0);
  assert.equal(old.coldStartBoost, 0);
});

// ─── INTEREST TESTS ──────────────────────────────────────────

test("interest: зарплата выше ожиданий → высокий P_accept", () => {
  const r = calculateMutualInterest(
    baseCand({ salaryMin: 200_000 }),
    basePos({ salaryMax: 400_000 }),  // 400k / 200k = 2.0 ≥ ideal 1.15
    80
  );
  assert.ok(r.pAccept >= 0.95, `pAccept ${r.pAccept}`);
});

test("interest: зарплата ниже минимума → низкий P_accept", () => {
  const r = calculateMutualInterest(
    baseCand({ salaryMin: 500_000 }),
    basePos({ salaryMax: 350_000 }),  // 350k / 500k = 0.7
    80
  );
  assert.ok(r.pAccept <= 0.4, `pAccept ${r.pAccept}`);
});

test("interest: пустой профиль (без портфолио и bio) → низкий P_invite", () => {
  const r = calculateMutualInterest(
    baseCand({ hasPortfolio: false, hasBio: false }),
    basePos(),
    80
  );
  const full = calculateMutualInterest(baseCand(), basePos(), 80);
  assert.ok(r.pInvite < full.pInvite);
});

test("interest: слабый fit → штраф к P_invite", () => {
  const weak = calculateMutualInterest(baseCand(), basePos(), 30);
  const strong = calculateMutualInterest(baseCand(), basePos(), 80);
  assert.ok(weak.pInvite < strong.pInvite);
});

// ─── INTEGRATION (без БД) ────────────────────────────────────

test("композиция: идеальный кейс → final ~ fit", () => {
  const cand = baseCand();
  const pos = basePos();
  const fit = calculateFit(cand, pos, noRelations);
  assert.equal(fit.hardFiltered, false);
  if (fit.hardFiltered) return;
  const feas = calculateFeasibility(cand, pos, NOW);
  const inter = calculateMutualInterest(cand, pos, fit.fitScore);
  const final = fit.fitScore * feas.multiplier * inter.multiplier;
  assert.ok(final >= 40, `минимум для создания match: ${final}`);
});
