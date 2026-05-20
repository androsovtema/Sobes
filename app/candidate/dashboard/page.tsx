import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function CandidateDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    include: {
      skills: { include: { skill: true } },
      matches: {
        where: { status: { in: ["INVITED", "SCHEDULED"] } },
        include: {
          position: {
            include: {
              company: true,
              skills: { include: { skill: true } },
            },
          },
          interview: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!profile) redirect("/onboarding/candidate");

  const invitations = profile.matches.filter((m) => m.status === "INVITED");
  const scheduled = profile.matches.filter((m) => m.status === "SCHEDULED");

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Шапка */}
      <header className="bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
        <div className="font-bold text-lg shrink-0">Собес</div>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 sm:gap-4">
          <Link href="/candidate/availability" className="text-sm text-zinc-500 hover:text-zinc-900 hidden sm:inline">Мои слоты</Link>
          <Link href="/candidate/profile" className="text-sm text-zinc-500 hover:text-zinc-900">Профиль</Link>
          <Link href="/settings" className="text-sm text-zinc-500 hover:text-zinc-900 hidden sm:inline">Настройки</Link>
          <form action={logout}>
            <button type="submit" className="text-sm text-zinc-400 hover:text-zinc-600">Выйти</button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Приветствие */}
        <div>
          <h1 className="text-2xl font-bold">Привет, {profile.firstName}</h1>
          <p className="text-zinc-500 mt-1">{profile.headline} · {profile.grade}</p>
        </div>

        {/* Приглашения */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Приглашения{invitations.length > 0 && <span className="ml-2 text-sm font-normal text-zinc-500">({invitations.length})</span>}
          </h2>
          {invitations.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-zinc-400">
                <p className="text-4xl mb-3">📭</p>
                <p>Пока нет новых приглашений</p>
                <p className="text-sm mt-1">Алгоритм подбирает подходящие вакансии — вы получите уведомление</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {invitations.map((match) => (
                <InvitationCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </section>

        {/* Запланированные встречи */}
        {scheduled.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Запланированные встречи</h2>
            <div className="space-y-3">
              {scheduled.map((match) => (
                <ScheduledCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {/* Быстрые действия */}
        <section className="grid grid-cols-2 gap-3">
          <Link href="/candidate/profile">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="py-4 text-center">
                <div className="text-2xl mb-1">👤</div>
                <p className="text-sm font-medium">Мой профиль</p>
                <p className="text-xs text-zinc-400 mt-0.5">Навыки и опыт</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/candidate/availability">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="py-4 text-center">
                <div className="text-2xl mb-1">🗓️</div>
                <p className="text-sm font-medium">Расписание</p>
                <p className="text-xs text-zinc-400 mt-0.5">Слоты для встреч</p>
              </CardContent>
            </Card>
          </Link>
        </section>
      </main>
    </div>
  );
}

function InvitationCard({ match }: { match: any }) {
  const { position } = match;
  // Извлекаем краткие "почему вас пригласили" факты из breakdown (если есть).
  const breakdown = match.scoreBreakdown as
    | { fit?: { meta?: { requiredCoveredPct?: number; matchedRequiredSkills?: string[] } }; interest?: { pAccept?: number } }
    | null;
  const coveredPct = breakdown?.fit?.meta?.requiredCoveredPct;
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="font-semibold">{position.title}</p>
            <p className="text-sm text-zinc-500">{position.company.name}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant="outline" className="text-xs">{position.grade}</Badge>
              <Badge variant="outline" className="text-xs">{position.workFormat}</Badge>
              <Badge variant="outline" className="text-xs">{position.salaryMin.toLocaleString()} — {position.salaryMax.toLocaleString()} {position.currency}</Badge>
            </div>
            {coveredPct !== undefined && (
              <p className="text-xs text-zinc-500 mt-2">
                ✨ Совпадение по навыкам: <span className="font-medium text-zinc-700">{Math.round(coveredPct * 100)}%</span>
                {match.score && <> · совместимость {match.score}/100</>}
              </p>
            )}
            {match.proposedSlotAt ? (
              <p className="text-sm mt-2">
                🕒 Предлагаемое время:{" "}
                <span className="font-medium text-zinc-900">
                  {new Date(match.proposedSlotAt).toLocaleString("ru-RU", {
                    weekday: "short", day: "numeric", month: "long",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </p>
            ) : (
              <p className="text-sm mt-2 text-amber-700">
                ⚠️ Время согласуем после вашего ответа — общий слот пока не найден
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <RespondButton matchId={match.id} action="accept" />
            <RespondButton matchId={match.id} action="reject" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduledCard({ match }: { match: any }) {
  const { position, interview } = match;
  return (
    <Card className="border-green-200 bg-green-50">
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{position.title}</p>
            <p className="text-sm text-zinc-500">{position.company.name}</p>
            {interview && (
              <p className="text-sm text-green-700 mt-1">
                {new Date(interview.scheduledAt).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {interview?.meetLink && (
              <a href={interview.meetLink} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline">Открыть встречу</Button>
              </a>
            )}
            {interview && (
              <a href={`/api/interviews/${interview.id}/ics`} download>
                <Button size="sm" variant="ghost" className="text-zinc-500 text-xs">
                  Скачать .ics
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Клиентский компонент для кнопок ответа вынесем в отдельный файл
function RespondButton({ matchId, action }: { matchId: string; action: "accept" | "reject" }) {
  return (
    <form action={`/api/candidate/invitations/${matchId}/respond`} method="POST">
      <input type="hidden" name="action" value={action} />
      <Button type="submit" size="sm" variant={action === "accept" ? "default" : "outline"}
        className={action === "reject" ? "text-zinc-500" : ""}>
        {action === "accept" ? "Принять" : "Отклонить"}
      </Button>
    </form>
  );
}
