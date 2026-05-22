import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LocalTime } from "@/components/LocalTime";

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
    <div className="min-h-screen bg-[#f4f6f2]">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-black/[0.08] px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="text-brand font-bold text-xl tracking-tight">Собес</div>
        <div className="flex items-center gap-4 sm:gap-5">
          <Link href="/candidate/availability" className="text-sm font-medium text-subtle hover:text-ink transition-colors hidden sm:inline">
            Слоты
          </Link>
          <Link href="/candidate/profile" className="text-sm font-medium text-subtle hover:text-ink transition-colors">
            Профиль
          </Link>
          <Link href="/settings" className="text-sm font-medium text-subtle hover:text-ink transition-colors hidden sm:inline">
            Настройки
          </Link>
          <form action={logout}>
            <button type="submit" className="text-sm text-dim hover:text-subtle transition-colors">
              Выйти
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Greeting */}
        <div className="pt-2">
          <h1 className="text-[26px] font-bold text-ink tracking-tight">
            Привет, {profile.firstName}
          </h1>
          <p className="text-subtle mt-1 text-[15px]">
            {profile.headline}
            {profile.grade && (
              <span className="ml-2 inline-flex items-center bg-surface rounded-full px-2.5 py-0.5 text-xs font-medium text-brand">
                {profile.grade}
              </span>
            )}
          </p>
        </div>

        {/* Invitations */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[17px] font-semibold text-ink">Приглашения</h2>
            {invitations.length > 0 && (
              <span className="bg-cta text-brand text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {invitations.length}
              </span>
            )}
          </div>
          {invitations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📭</span>
                </div>
                <p className="font-medium text-ink">Пока нет новых приглашений</p>
                <p className="text-sm text-subtle mt-1 max-w-xs mx-auto">
                  Алгоритм подбирает подходящие вакансии — вы получите уведомление
                </p>
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

        {/* Scheduled */}
        {scheduled.length > 0 && (
          <section>
            <h2 className="text-[17px] font-semibold text-ink mb-4">Запланированные встречи</h2>
            <div className="space-y-3">
              {scheduled.map((match) => (
                <ScheduledCard key={match.id} match={match} />
              ))}
            </div>
          </section>
        )}

        {/* Quick links */}
        <section className="grid grid-cols-2 gap-3">
          <Link href="/candidate/profile">
            <Card className="hover:shadow-[0_6px_24px_rgba(0,0,0,0.11)] transition-shadow cursor-pointer">
              <CardContent className="py-5 text-center">
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">👤</span>
                </div>
                <p className="text-sm font-semibold text-ink">Мой профиль</p>
                <p className="text-xs text-dim mt-0.5">Навыки и опыт</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/candidate/availability">
            <Card className="hover:shadow-[0_6px_24px_rgba(0,0,0,0.11)] transition-shadow cursor-pointer">
              <CardContent className="py-5 text-center">
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">🗓️</span>
                </div>
                <p className="text-sm font-semibold text-ink">Расписание</p>
                <p className="text-xs text-dim mt-0.5">Слоты для встреч</p>
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
  const breakdown = match.scoreBreakdown as
    | { fit?: { meta?: { requiredCoveredPct?: number } }; interest?: { pAccept?: number } }
    | null;
  const coveredPct = breakdown?.fit?.meta?.requiredCoveredPct;
  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink text-[15px]">{position.title}</p>
            <p className="text-sm text-subtle mt-0.5">{position.company.name}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Badge variant="secondary" className="text-xs">{position.grade}</Badge>
              <Badge variant="secondary" className="text-xs">{position.workFormat}</Badge>
              <Badge variant="secondary" className="text-xs">
                {position.salaryMin.toLocaleString()} — {position.salaryMax.toLocaleString()} {position.currency}
              </Badge>
            </div>
            {coveredPct !== undefined && (
              <p className="text-xs text-subtle mt-2.5">
                Совпадение по навыкам:{" "}
                <span className="font-semibold text-brand">{Math.round(coveredPct * 100)}%</span>
                {match.score && <span className="text-dim"> · совместимость {match.score}/100</span>}
              </p>
            )}
            {match.proposedSlotAt ? (
              <p className="text-sm mt-2 text-subtle">
                Время:{" "}
                <span className="font-medium text-ink">
                  <LocalTime iso={match.proposedSlotAt} />
                </span>
              </p>
            ) : (
              <p className="text-sm mt-2 text-amber-700 font-medium">
                Время согласуем после вашего ответа
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
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
    <Card className="ring-1 ring-cta/40 bg-cta/5">
      <CardContent className="py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-cta inline-block" />
              <p className="font-semibold text-ink text-[15px]">{position.title}</p>
            </div>
            <p className="text-sm text-subtle">{position.company.name}</p>
            {interview && (
              <p className="text-sm font-medium text-brand mt-1.5">
                <LocalTime iso={interview.scheduledAt} options={{ dateStyle: "medium", timeStyle: "short" }} />
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {interview?.meetLink && (
              <a href={interview.meetLink} target="_blank" rel="noopener noreferrer">
                <Button size="sm">Открыть встречу</Button>
              </a>
            )}
            {interview && (
              <a href={`/api/interviews/${interview.id}/ics`} download>
                <Button size="sm" variant="ghost" className="text-dim text-xs">
                  .ics
                </Button>
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RespondButton({ matchId, action }: { matchId: string; action: "accept" | "reject" }) {
  return (
    <form action={`/api/candidate/invitations/${matchId}/respond`} method="POST">
      <input type="hidden" name="action" value={action} />
      <Button
        type="submit"
        size="sm"
        variant={action === "accept" ? "default" : "outline"}
      >
        {action === "accept" ? "Принять" : "Отклонить"}
      </Button>
    </form>
  );
}
