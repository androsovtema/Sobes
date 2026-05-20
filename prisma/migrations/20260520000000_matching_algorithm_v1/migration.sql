-- ─── Фаза 4: расширение схемы под алгоритм матчинга ──────────────
-- Сохраняем существующие данные _CandidateSkills и _PositionSkills.

-- CreateEnum
CREATE TYPE "SkillSource" AS ENUM ('MANUAL', 'SUGGESTED');

-- AlterTable: новые поля Match
ALTER TABLE "matches"
  ADD COLUMN "feasibilityScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "fitScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "interestScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "scoreBreakdown" JSONB;

-- CreateTable: candidate_skills (явный join)
CREATE TABLE "candidate_skills" (
    "candidateId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "source" "SkillSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "candidate_skills_pkey" PRIMARY KEY ("candidateId","skillId")
);

-- CreateTable: position_skills (явный join, c required)
CREATE TABLE "position_skills" (
    "positionId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "position_skills_pkey" PRIMARY KEY ("positionId","skillId")
);

-- CreateTable: skill_aliases (нормализация: ReactJS → React)
CREATE TABLE "skill_aliases" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    CONSTRAINT "skill_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable: skill_relations (граф родственных навыков)
CREATE TABLE "skill_relations" (
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "skill_relations_pkey" PRIMARY KEY ("fromId","toId")
);

-- ─── Перенос данных из неявных M2M ──────────────────────────────
-- В Prisma неявные M2M: колонки A и B в алфавитном порядке имён моделей.
-- _CandidateSkills: A = CandidateProfile.id, B = Skill.id (C < S).
-- _PositionSkills:  A = Position.id,         B = Skill.id (P < S).

INSERT INTO "candidate_skills" ("candidateId", "skillId", "source", "createdAt")
SELECT "A", "B", 'MANUAL', CURRENT_TIMESTAMP FROM "_CandidateSkills"
ON CONFLICT DO NOTHING;

INSERT INTO "position_skills" ("positionId", "skillId", "required")
SELECT "A", "B", true FROM "_PositionSkills"
ON CONFLICT DO NOTHING;

-- ─── Удаление старых таблиц ──────────────────────────────────────
DROP TABLE "_CandidateSkills";
DROP TABLE "_PositionSkills";

-- CreateIndex
CREATE INDEX "candidate_skills_skillId_idx" ON "candidate_skills"("skillId");
CREATE INDEX "position_skills_skillId_idx" ON "position_skills"("skillId");
CREATE UNIQUE INDEX "skill_aliases_alias_key" ON "skill_aliases"("alias");
CREATE INDEX "skill_aliases_skillId_idx" ON "skill_aliases"("skillId");
CREATE INDEX "skill_relations_toId_idx" ON "skill_relations"("toId");

-- AddForeignKey
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_skillId_fkey"
  FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "position_skills" ADD CONSTRAINT "position_skills_positionId_fkey"
  FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "position_skills" ADD CONSTRAINT "position_skills_skillId_fkey"
  FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "skill_aliases" ADD CONSTRAINT "skill_aliases_skillId_fkey"
  FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "skill_relations" ADD CONSTRAINT "skill_relations_fromId_fkey"
  FOREIGN KEY ("fromId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_relations" ADD CONSTRAINT "skill_relations_toId_fkey"
  FOREIGN KEY ("toId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
