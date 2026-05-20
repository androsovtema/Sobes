import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await prisma.company.findUnique({ where: { userId: user.id } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const { id: positionId } = await params;

  const position = await prisma.position.findFirst({
    where: { id: positionId, companyId: company.id },
  });
  if (!position) return NextResponse.json({ error: "Position not found" }, { status: 404 });

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
    scoreBreakdown: m.scoreBreakdown,
    firstName: m.candidate.firstName,
    lastName: m.candidate.lastName,
    grade: m.candidate.grade,
    skills: m.candidate.skills.map((cs) => cs.skill.name),
    portfolio: m.candidate.portfolio.map((p) => ({ label: p.label, url: p.url })),
  }));

  return NextResponse.json(candidates);
}
