import { NextResponse } from "next/server";
import { z } from "zod";
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { findSlotForMatch } from "@/lib/scheduling/scheduleForMatch";
import { sendEmail } from "@/lib/email";
import { InviteEmail } from "@/emails/invite-email";
import { checkRateLimit } from "@/lib/ratelimit";

const decideSchema = z.object({
  action: z.enum(["invite", "skip"]),
});

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const rl = await checkRateLimit(request);
  if (rl) return rl;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await prisma.company.findUnique({ where: { userId: user.id } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const { matchId } = await params;

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      status: "PENDING",
      position: { companyId: company.id },
    },
    include: {
      candidate: { include: { user: true } },
      position: true,
    },
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const body = await request.json();
  const parsed = decideSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (parsed.data.action === "skip") {
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "REJECTED_HR" },
    });
    return NextResponse.json({ success: true });
  }

  // invite: подбираем конкретное время и резервируем его.
  const proposedSlotAt = await findSlotForMatch(matchId);
  await prisma.match.update({
    where: { id: matchId },
    data: { status: "INVITED", proposedSlotAt },
  });

  // Отправляем email кандидату (fire-and-forget — не блокирует ответ).
  sendEmail({
    to: match.candidate.user.email,
    subject: `Приглашение на собеседование — ${match.position.title}`,
    react: React.createElement(InviteEmail, {
      candidateFirstName: match.candidate.firstName,
      positionTitle: match.position.title,
      companyName: company.name,
      proposedSlotAt,
      dashboardUrl: `${APP_URL}/candidate/dashboard`,
    }),
  }).catch((err) => console.error("[email:invite]", err));

  return NextResponse.json({
    success: true,
    proposedSlotAt: proposedSlotAt?.toISOString() ?? null,
    warning: proposedSlotAt
      ? null
      : "Не нашли общий слот в ближайшие 2 недели — кандидат увидит приглашение без времени",
  });
}
