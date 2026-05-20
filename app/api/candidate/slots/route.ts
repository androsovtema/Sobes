import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";

const slotsSchema = z.object({
  slots: z.array(
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

  const body = await request.json();
  const parsed = slotsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  // Пересоздаём слоты
  await prisma.candidateSlot.deleteMany({ where: { candidateId: profile.id } });
  if (parsed.data.slots.length > 0) {
    await prisma.candidateSlot.createMany({
      data: parsed.data.slots.map((s) => ({ candidateId: profile.id, ...s })),
    });
  }

  // Слоты влияют на feasibility — пересчёт матчей.
  void (await import("@/lib/matching/run")).runMatchingForCandidate(profile.id);

  return NextResponse.json({ success: true });
}
