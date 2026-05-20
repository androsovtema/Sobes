import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIcsDate(date: Date) {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

// Экранирует спецсимволы в iCal-строках
function icsEscape(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const interview = await prisma.interview.findUnique({
    where: { id },
    include: {
      match: {
        include: {
          position: { include: { company: true } },
          candidate: true,
        },
      },
    },
  });

  if (!interview) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { match } = interview;
  const isCandidateOwner =
    dbUser.role === "CANDIDATE" && match.candidate.userId === user.id;
  const isEmployerOwner =
    dbUser.role === "EMPLOYER" && match.position.company.userId === user.id;

  if (!isCandidateOwner && !isEmployerOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const start = interview.scheduledAt;
  const end = new Date(start.getTime() + interview.durationMin * 60 * 1000);
  const now = new Date();

  const summary = icsEscape(
    `Собеседование: ${match.position.title} — ${match.position.company.name}`
  );
  const description = interview.meetLink
    ? icsEscape(`Ссылка на встречу: ${interview.meetLink}`)
    : "Ссылка на встречу будет добавлена позже";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Собес//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${interview.id}@sobes.ru`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
  ];

  if (interview.meetLink) {
    lines.push(`URL:${interview.meetLink}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sobes-interview.ics"',
    },
  });
}
