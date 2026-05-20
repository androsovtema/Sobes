import { NextResponse } from "next/server";
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { ScheduledEmail } from "@/emails/scheduled-email";
import { HrResponseEmail } from "@/emails/hr-response-email";
import { checkRateLimit } from "@/lib/ratelimit";

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

  const { matchId } = await params;
  const body = await request.formData();
  const action = body.get("action") as string;

  if (!["accept", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const profile = await prisma.candidateProfile.findUnique({ where: { userId: user.id } });
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const match = await prisma.match.findFirst({
    where: { id: matchId, candidateId: profile.id, status: "INVITED" },
    include: {
      position: {
        include: {
          company: {
            include: { user: true },
          },
        },
      },
    },
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const hrEmail = match.position.company.user.email;
  const positionTitle = match.position.title;
  const companyName = match.position.company.name;

  // ── Отклонение ────────────────────────────────────────────────────────────
  if (action === "reject") {
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "REJECTED_CANDIDATE", proposedSlotAt: null },
    });

    // Уведомляем HR
    sendEmail({
      to: hrEmail,
      subject: `${profile.firstName} ${profile.lastName} отклонил(а) приглашение — ${positionTitle}`,
      react: React.createElement(HrResponseEmail, {
        candidateFirstName: profile.firstName,
        candidateLastName: profile.lastName,
        positionTitle,
        action: "reject",
        scheduledAt: null,
        interviewsUrl: `${APP_URL}/employer/positions/${match.positionId}/candidates`,
      }),
    }).catch((err) => console.error("[email:hr-reject]", err));

    return NextResponse.redirect(new URL("/candidate/dashboard", request.url));
  }

  // ── Принятие без слота — только ACCEPTED ──────────────────────────────────
  if (!match.proposedSlotAt) {
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "ACCEPTED" },
    });

    // Уведомляем HR (accept без конкретного времени)
    sendEmail({
      to: hrEmail,
      subject: `${profile.firstName} ${profile.lastName} принял(а) приглашение — ${positionTitle}`,
      react: React.createElement(HrResponseEmail, {
        candidateFirstName: profile.firstName,
        candidateLastName: profile.lastName,
        positionTitle,
        action: "accept",
        scheduledAt: null,
        interviewsUrl: `${APP_URL}/employer/interviews`,
      }),
    }).catch((err) => console.error("[email:hr-accept-noslot]", err));

    return NextResponse.redirect(new URL("/candidate/dashboard", request.url));
  }

  // ── Принятие со слотом → создаём Interview ───────────────────────────────
  const scheduledAt = match.proposedSlotAt;

  await prisma.$transaction([
    prisma.interview.create({
      data: {
        matchId,
        scheduledAt,
        durationMin: 60,
      },
    }),
    prisma.match.update({
      where: { id: matchId },
      data: { status: "SCHEDULED" },
    }),
  ]);

  // Кандидату — подтверждение встречи (fire-and-forget)
  sendEmail({
    to: user.email!,
    subject: `Встреча подтверждена — ${positionTitle} в ${companyName}`,
    react: React.createElement(ScheduledEmail, {
      candidateFirstName: profile.firstName,
      positionTitle,
      companyName,
      scheduledAt,
      meetLink: null, // HR добавит позже через generate-link
      dashboardUrl: `${APP_URL}/candidate/dashboard`,
    }),
  }).catch((err) => console.error("[email:scheduled-candidate]", err));

  // HR — уведомление о принятии
  sendEmail({
    to: hrEmail,
    subject: `${profile.firstName} ${profile.lastName} принял(а) приглашение — ${positionTitle}`,
    react: React.createElement(HrResponseEmail, {
      candidateFirstName: profile.firstName,
      candidateLastName: profile.lastName,
      positionTitle,
      action: "accept",
      scheduledAt,
      interviewsUrl: `${APP_URL}/employer/interviews`,
    }),
  }).catch((err) => console.error("[email:hr-accept]", err));

  return NextResponse.redirect(new URL("/candidate/dashboard", request.url));
}
