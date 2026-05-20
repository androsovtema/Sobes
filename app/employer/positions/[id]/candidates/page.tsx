import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import CandidatesClient from "./CandidatesClient";

export default async function CandidatesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: positionId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const company = await prisma.company.findUnique({ where: { userId: user.id } });
  if (!company) redirect("/onboarding/employer");

  const position = await prisma.position.findFirst({
    where: { id: positionId, companyId: company.id },
    include: { skills: { include: { skill: true } } },
  });
  if (!position) redirect("/employer/dashboard");

  const matches = await prisma.match.findMany({
    where: { positionId, status: "PENDING" },
    orderBy: { score: "desc" },
    include: {
      candidate: {
        include: {
          skills: { include: { skill: true } },
          portfolio: true,
        },
      },
    },
  });

  const candidates = matches.map((m) => ({
    matchId: m.id,
    score: m.score,
    fitScore: m.fitScore,
    feasibilityScore: m.feasibilityScore,
    interestScore: m.interestScore,
    scoreBreakdown: m.scoreBreakdown as Record<string, number> | null,
    firstName: m.candidate.firstName,
    lastName: m.candidate.lastName,
    grade: m.candidate.grade,
    skills: m.candidate.skills.map((cs) => cs.skill.name),
    portfolio: m.candidate.portfolio.map((p) => ({ label: p.label, url: p.url })),
  }));

  return (
    <CandidatesClient
      positionId={positionId}
      positionTitle={position.title}
      initialCandidates={candidates}
    />
  );
}
