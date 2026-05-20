-- ─── Фаза 5: планировщик встреч ─────────────────────────────────
-- Конкретное время слота, подобранное при HR-инвайте.
-- При accept кандидатом → Interview.scheduledAt.

ALTER TABLE "matches"
  ADD COLUMN "proposedSlotAt" TIMESTAMP(3);
