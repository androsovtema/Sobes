import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const GRADE_LABELS: Record<string, string> = {
  INTERN: "Стажёр",
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
  LEAD: "Lead",
  PRINCIPAL: "Principal",
};

const FORMAT_LABELS: Record<string, string> = {
  REMOTE: "Удалённо",
  OFFICE: "Офис",
  HYBRID: "Гибрид",
};

export default async function EmployerDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const company = await prisma.company.findUnique({
    where: { userId: user.id },
    include: {
      positions: {
        orderBy: { createdAt: "desc" },
        include: {
          skills: { where: { required: true }, include: { skill: true } },
          matches: {
            where: { status: { in: ["PENDING", "INVITED"] } },
            select: { id: true, status: true },
          },
        },
      },
    },
  });

  if (!company) redirect("/onboarding/employer");

  const active = company.positions.filter((p) => p.isActive);
  const archived = company.positions.filter((p) => !p.isActive);

  return (
    <div className="min-h-screen bg-[#f4f6f2]">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-black/[0.08] px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="text-brand font-bold text-xl tracking-tight">Собес</div>
        <div className="flex items-center gap-4 sm:gap-5">
          <Link href="/employer/interviews" className="text-sm font-medium text-subtle hover:text-ink transition-colors">
            Встречи
          </Link>
          <Link href="/employer/positions/new" className="text-sm font-medium text-subtle hover:text-ink transition-colors hidden sm:inline">
            + Вакансия
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
        {/* Company header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pt-2">
          <div>
            <h1 className="text-[26px] font-bold text-ink tracking-tight">{company.name}</h1>
            {company.industry && (
              <p className="text-subtle mt-0.5 text-[15px]">
                {company.industry}
                {company.size && <span className="text-dim"> · {company.size}</span>}
              </p>
            )}
          </div>
          <Link href="/employer/positions/new">
            <Button>+ Новая вакансия</Button>
          </Link>
        </div>

        {/* Active positions */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-[17px] font-semibold text-ink">Активные вакансии</h2>
            {active.length > 0 && (
              <span className="text-xs text-dim font-medium">({active.length})</span>
            )}
          </div>

          {active.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="font-medium text-ink">Нет активных вакансий</p>
                <p className="text-sm text-subtle mt-1 max-w-xs mx-auto">
                  Создайте первую вакансию — алгоритм начнёт подбирать кандидатов
                </p>
                <Link href="/employer/positions/new" className="mt-5 inline-block">
                  <Button>Создать вакансию</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {active.map((position) => (
                <PositionCard key={position.id} position={position} />
              ))}
            </div>
          )}
        </section>

        {archived.length > 0 && (
          <section>
            <h2 className="text-[17px] font-semibold text-dim mb-4">Архив</h2>
            <div className="space-y-3">
              {archived.map((position) => (
                <PositionCard key={position.id} position={position} dimmed />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function PositionCard({
  position,
  dimmed = false,
}: {
  position: any;
  dimmed?: boolean;
}) {
  const pendingCount = position.matches.filter((m: any) => m.status === "PENDING").length;
  const invitedCount = position.matches.filter((m: any) => m.status === "INVITED").length;

  return (
    <Card className={dimmed ? "opacity-50" : ""}>
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-semibold text-ink text-[15px]">{position.title}</p>
              <Badge variant="secondary" className="text-xs">{GRADE_LABELS[position.grade]}</Badge>
              <Badge variant="secondary" className="text-xs">{FORMAT_LABELS[position.workFormat]}</Badge>
            </div>
            <p className="text-sm text-subtle">
              {position.salaryMin.toLocaleString("ru-RU")} — {position.salaryMax.toLocaleString("ru-RU")} {position.currency}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {position.skills.slice(0, 5).map((ps: any) => (
                <span
                  key={ps.skill.id}
                  className="text-xs bg-surface text-subtle px-2.5 py-0.5 rounded-full"
                >
                  {ps.skill.name}
                </span>
              ))}
              {position.skills.length > 5 && (
                <span className="text-xs text-dim">+{position.skills.length - 5}</span>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <Link href={`/employer/positions/${position.id}/candidates`}>
              {pendingCount > 0 ? (
                <Button size="sm">
                  {pendingCount} {pluralCandidates(pendingCount)}
                </Button>
              ) : invitedCount > 0 ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-700 hover:bg-amber-50"
                >
                  {invitedCount} приглашено
                </Button>
              ) : (
                <Button size="sm" variant="outline">
                  Кандидаты
                </Button>
              )}
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function pluralCandidates(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "кандидатов";
  if (mod10 === 1) return "кандидат";
  if (mod10 >= 2 && mod10 <= 4) return "кандидата";
  return "кандидатов";
}
