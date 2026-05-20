import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import ProfileClient from "./ProfileClient";

export default async function CandidateProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    include: { skills: { include: { skill: true } }, portfolio: true },
  });

  if (!profile) redirect("/onboarding/candidate");

  return (
    <ProfileClient
      profile={{
        firstName: profile.firstName,
        lastName: profile.lastName,
        headline: profile.headline,
        bio: profile.bio ?? "",
        yearsExp: profile.yearsExp,
        grade: profile.grade,
        workFormat: profile.workFormat,
        salaryMin: profile.salaryMin,
        salaryMax: profile.salaryMax,
        currency: profile.currency,
        skills: profile.skills.map((cs) => cs.skill.name),
        portfolio: profile.portfolio.map((p) => ({ label: p.label, url: p.url })),
      }}
    />
  );
}
