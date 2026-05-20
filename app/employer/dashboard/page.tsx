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
          _count: {
            select: {
              matches: {
                where: { status: "PENDING" },
              },
            },
          },
        },
      },
    },
  });

  if (!company) redirect("/onboarding/employer");

  const active = company.positions.filter((p) => p.isActive);
  const archived = company.positions.filter((p) => !p.isActive);

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
        <div className="font-bold text-lg shrink-0">Собес</div>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 sm:gap-4">
          <Link href="/employer/interviews" className="text-sm text-zinc-500 hover:text-zinc-900">
            Встречи
          </Link>
          <Link href="/employer/positions/new" className="text-sm text-zinc-500 hover:text-zinc-900 hidden sm:inline">
            + Новая вакансия
          </Link>
          <Link href="/settings" className="text-sm text-zinc-500 hover:text-zinc-900 hidden sm:inline">
            Настройки
          </Link>
          <form action={logout}>
            <button type="submit" className="text-sm text-zinc-400 hover:text-zinc-600">Выйти</button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{company.name}</h1>
            {company.industry && <p className="text-zinc-500 mt-0.5">{company.industry} · {company.size}</p>}
          </div>
          <Link href="/employer/positions/new">
            <Button>+ Новая вакансия</Button>
          </Link>
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-3">
            Активные вакансии
            {active.length > 0 && <span className="ml-2 text-sm font-normal text-zinc-500">({active.length})</span>}
          </h2>

          {active.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-zinc-400">
                <p className="text-4xl mb-3">📋</p>
                <p>Нет активных вакансий</p>
                <p className="text-sm mt-1">Создайте первую вакансию — алгоритм начнёт подбирать кандидатов</p>
                <Link href="/employer/positions/new" className="mt-4 inline-block">
                  <Button className="mt-4">Создать вакансию</Button>
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
            <h2 className="text-lg font-semibold mb-3 text-zinc-400">Архив</h2>
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
  const pendingCount = position._count.matches;

  return (
    <Card className={dimmed ? "opacity-60" : ""}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{position.title}</p>
              <Badge variant="outline" className="text-xs">{GRADE_LABELS[position.grade]}</Badge>
              <Badge variant="outline" className="text-xs">{FORMAT_LABELS[position.workFormat]}</Badge>
            </div>
            <p className="text-sm text-zinc-500 mt-1">
              {position.salaryMin.toLocaleString("ru-RU")} — {position.salaryMax.toLocaleString("ru-RU")} {position.currency}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {position.skills.slice(0, 5).map((ps: any) => (
                <span key={ps.skill.id} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">{ps.skill.name}</span>
              ))}
              {position.skills.length > 5 && (
                <span className="text-xs text-zinc-400">+{position.skills.length - 5}</span>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            {pendingCount > 0 ? (
              <Link href={`/employer/positions/${position.id}/candidates`}>
                <Button size="sm" variant="default">
                  {pendingCount} {pluralCandidates(pendingCount)}
                </Button>
              </Link>
            ) : (
              <Link href={`/employer/positions/${position.id}/candidates`}>
                <Button size="sm" variant="outline" className="text-zinc-500">
                  Кандидаты
                </Button>
              </Link>
            )}
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
