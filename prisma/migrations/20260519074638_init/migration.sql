-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CANDIDATE', 'EMPLOYER');

-- CreateEnum
CREATE TYPE "WorkFormat" AS ENUM ('REMOTE', 'OFFICE', 'HYBRID');

-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('INTERN', 'JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD', 'PRINCIPAL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'INVITED', 'ACCEPTED', 'REJECTED_HR', 'REJECTED_CANDIDATE', 'SCHEDULED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT,
    "yearsExp" INTEGER NOT NULL,
    "grade" "Grade" NOT NULL,
    "workFormat" "WorkFormat" NOT NULL,
    "salaryMin" INTEGER NOT NULL,
    "salaryMax" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_links" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "portfolio_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_slots" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "maxPerDay" INTEGER NOT NULL DEFAULT 2,

    CONSTRAINT "candidate_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "description" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "grade" "Grade" NOT NULL,
    "workFormat" "WorkFormat" NOT NULL,
    "salaryMin" INTEGER NOT NULL,
    "salaryMax" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_slots" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "maxPerDay" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "hr_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "meetLink" TEXT,
    "calendarEventIdCandidate" TEXT,
    "calendarEventIdHR" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CandidateSkills" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CandidateSkills_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PositionSkills" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PositionSkills_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profiles_userId_key" ON "candidate_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "companies_userId_key" ON "companies"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "matches_candidateId_positionId_key" ON "matches"("candidateId", "positionId");

-- CreateIndex
CREATE UNIQUE INDEX "interviews_matchId_key" ON "interviews"("matchId");

-- CreateIndex
CREATE INDEX "_CandidateSkills_B_index" ON "_CandidateSkills"("B");

-- CreateIndex
CREATE INDEX "_PositionSkills_B_index" ON "_PositionSkills"("B");

-- AddForeignKey
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_links" ADD CONSTRAINT "portfolio_links_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_slots" ADD CONSTRAINT "candidate_slots_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_slots" ADD CONSTRAINT "hr_slots_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CandidateSkills" ADD CONSTRAINT "_CandidateSkills_A_fkey" FOREIGN KEY ("A") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CandidateSkills" ADD CONSTRAINT "_CandidateSkills_B_fkey" FOREIGN KEY ("B") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PositionSkills" ADD CONSTRAINT "_PositionSkills_A_fkey" FOREIGN KEY ("A") REFERENCES "positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PositionSkills" ADD CONSTRAINT "_PositionSkills_B_fkey" FOREIGN KEY ("B") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
