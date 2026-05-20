import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    include: {
      skills: { include: { skill: true } },
      portfolio: true,
    },
  });

  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Нормализуем для фронта: skills как массив имён.
  return NextResponse.json({
    ...profile,
    skills: profile.skills.map((cs) => cs.skill.name),
    skillsWithSource: profile.skills.map((cs) => ({
      name: cs.skill.name,
      source: cs.source,
    })),
  });
}

const profileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  headline: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  yearsExp: z.number().int().min(0).max(50),
  grade: z.enum(["INTERN", "JUNIOR", "MIDDLE", "SENIOR", "LEAD", "PRINCIPAL"]),
  workFormat: z.enum(["REMOTE", "OFFICE", "HYBRID"]),
  salaryMin: z.number().int().min(0),
  salaryMax: z.number().int().min(0),
  currency: z.string().default("RUB"),
  // Поддерживаем оба формата: массив строк (legacy) и {name, source}
  skills: z
    .array(
      z.union([
        z.string(),
        z.object({
          name: z.string(),
          source: z.enum(["MANUAL", "SUGGESTED"]).default("MANUAL"),
        }),
      ])
    )
    .min(1)
    .max(30),
  portfolio: z.array(z.object({ label: z.string(), url: z.string().url() })).max(10),
});

export async function POST(request: Request) {
  const rl = await checkRateLimit(request);
  if (rl) return rl;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = profileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // Upsert User в Prisma (синхронизируем с Supabase Auth)
  await prisma.user.upsert({
    where: { id: user.id },
    update: { email: user.email! },
    create: { id: user.id, email: user.email!, role: "CANDIDATE" },
  });

  // Нормализуем skills к {name, source}
  const normalizedSkills = data.skills.map((s) =>
    typeof s === "string" ? { name: s, source: "MANUAL" as const } : s
  );

  // Upsert/create Skill записи (канонизация: trim)
  const skillRecords = await Promise.all(
    normalizedSkills.map(({ name }) =>
      prisma.skill.upsert({
        where: { name: name.trim() },
        update: {},
        create: { name: name.trim() },
      })
    )
  );

  // Upsert candidate profile (без skills — обновим отдельно)
  const profile = await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    update: {
      firstName: data.firstName,
      lastName: data.lastName,
      headline: data.headline,
      bio: data.bio,
      yearsExp: data.yearsExp,
      grade: data.grade,
      workFormat: data.workFormat,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      currency: data.currency,
    },
    create: {
      userId: user.id,
      firstName: data.firstName,
      lastName: data.lastName,
      headline: data.headline,
      bio: data.bio,
      yearsExp: data.yearsExp,
      grade: data.grade,
      workFormat: data.workFormat,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      currency: data.currency,
    },
  });

  // Пересобираем CandidateSkill (явный join — позволяет нести source)
  await prisma.candidateSkill.deleteMany({ where: { candidateId: profile.id } });
  await prisma.candidateSkill.createMany({
    data: skillRecords.map((skill, idx) => ({
      candidateId: profile.id,
      skillId: skill.id,
      source: normalizedSkills[idx].source,
    })),
    skipDuplicates: true,
  });

  // Пересоздаём portfolio links
  await prisma.portfolioLink.deleteMany({ where: { candidateId: profile.id } });
  if (data.portfolio.length > 0) {
    await prisma.portfolioLink.createMany({
      data: data.portfolio.map((p) => ({
        candidateId: profile.id,
        label: p.label,
        url: p.url,
      })),
    });
  }

  // Триггер матчинга: пересчёт под этого кандидата по всем активным позициям.
  void (await import("@/lib/matching/run")).runMatchingForCandidate(profile.id);

  return NextResponse.json({ success: true, profileId: profile.id });
}
