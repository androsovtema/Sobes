import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getAccessToken } from "@/lib/yandex/token";
import { createEventWithTelemost } from "@/lib/yandex/caldav";
import { checkRateLimit } from "@/lib/ratelimit";

// POST /api/employer/interviews/[id]/generate-link
// Создаёт событие в Яндекс Календаре HR с Telemost-конференцией и сохраняет meetLink.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = await checkRateLimit(_req);
  if (rl) return rl;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const company = await prisma.company.findUnique({ where: { userId: user.id } });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const { id } = await params;
  const interview = await prisma.interview.findFirst({
    where: { id, match: { position: { companyId: company.id } } },
    include: {
      match: {
        include: {
          candidate: true,
          position: true,
        },
      },
    },
  });
  if (!interview) return NextResponse.json({ error: "Interview not found" }, { status: 404 });

  // Получаем токен HR (с автообновлением)
  const tokenResult = await getAccessToken(user.id);
  if (!tokenResult) {
    return NextResponse.json(
      { error: "Яндекс Календарь не подключён или требует повторной авторизации" },
      { status: 400 }
    );
  }

  const { candidateName, positionTitle } = buildEventMeta(interview);
  const startAt = new Date(interview.scheduledAt);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000); // 1 час

  try {
    const result = await createEventWithTelemost(tokenResult.token, tokenResult.login, {
      title: `Собеседование: ${candidateName} — ${positionTitle}`,
      startAt,
      endAt,
      description: `Встреча в Соbesе. Позиция: ${positionTitle}.`,
    });

    if (!result.teleMostUrl) {
      return NextResponse.json(
        {
          error:
            "Событие создано, но ссылка Телемост не получена. Возможно, Яндекс обработает её с задержкой.",
          calUrl: result.calUrl,
        },
        { status: 422 }
      );
    }

    // Сохраняем meetLink
    await prisma.interview.update({
      where: { id },
      data: { meetLink: result.teleMostUrl },
    });

    return NextResponse.json({ meetLink: result.teleMostUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildEventMeta(interview: {
  match: {
    candidate: { firstName: string; lastName: string };
    position: { title: string };
  };
}): { candidateName: string; positionTitle: string } {
  const { candidate, position } = interview.match;
  return {
    candidateName: `${candidate.firstName} ${candidate.lastName}`,
    positionTitle: position.title,
  };
}
