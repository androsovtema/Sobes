import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";

const positionSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(2000),
  grade: z.enum(["INTERN", "JUNIOR", "MIDDLE", "SENIOR", "LEAD", "PRINCIPAL"]),
  workFormat: z.enum(["REMOTE", "OFFICE", "HYBRID"]),
  salaryMin: z.number().int().min(0),
  salaryMax: z.number().int().min(0),
  currency: z.string().default("RUB"),
  // Поддерживаем строки (legacy: всё required) и {name, required}
  requiredSkills: z
    .array(
      z.union([
        z.string(),
        z.object({ name: z.string(), required: z.boolean().default(true) }),
      ])
    )
    .min(1)
    .max(30),
  niceToHaveSkills: z.array(z.string()).max(30).optional().default([]),
  hrSlots: z.array(
    z.object({
      dayOfWeek: z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      maxPerDay: z.number().int().min(1).max(10),
    })
  ).max(14),
});

export async function POST(request: Request) {
  const rl = await checkRateLimit(request);
  if (rl) return rl;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await prisma.company.findUnique({ where: { userId: user.id } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const body = await request.json();
  const parsed = positionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  if (data.salaryMin > data.salaryMax) {
    return NextResponse.json({ error: "salaryMin must be <= salaryMax" }, { status: 400 });
  }

  // Нормализуем required + nice-to-have
  const normalizedRequired = data.requiredSkills.map((s) =>
    typeof s === "string" ? { name: s, required: true } : s
  );
  const allSkillSpec = [
    ...normalizedRequired,
    ...data.niceToHaveSkills.map((name) => ({ name, required: false })),
  ];

  const skillRecords = await Promise.all(
    allSkillSpec.map(({ name }) =>
      prisma.skill.upsert({
        where: { name: name.trim() },
        update: {},
        create: { name: name.trim() },
      })
    )
  );

  const position = await prisma.position.create({
    data: {
      companyId: company.id,
      title: data.title,
      description: data.description,
      grade: data.grade,
      workFormat: data.workFormat,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      currency: data.currency,
      skills: {
        create: skillRecords.map((skill, idx) => ({
          skillId: skill.id,
          required: allSkillSpec[idx].required,
        })),
      },
      hrSlots: {
        create: data.hrSlots.map((slot) => ({
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxPerDay: slot.maxPerDay,
        })),
      },
    },
  });

  // Триггер матчинга — запускаем фоном (ждать не нужно, UI это не блокирует)
  void (await import("@/lib/matching/run")).runMatchingForPosition(position.id);

  return NextResponse.json({ success: true, positionId: position.id });
}
