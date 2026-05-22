import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logout } from "@/app/auth/actions";
import InterviewsClient from "./InterviewsClient";
import { YandexCalendarConnect } from "@/components/yandex-calendar-connect";

export default async function EmployerInterviewsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [company, yandexAccount] = await Promise.all([
    prisma.company.findUnique({ where: { userId: user.id } }),
    prisma.yandexAccount.findUnique({ where: { userId: user.id }, select: { id: true } }),
  ]);
  if (!company) redirect("/onboarding/employer");

  // Встречи + ACCEPTED-матчи, у которых HR не нашёл слот при инвайте.
  const matches = await prisma.match.findMany({
    where: {
      position: { companyId: company.id },
      status: { in: ["INVITED", "ACCEPTED", "SCHEDULED"] },
    },
    include: {
      position: true,
      candidate: true,
      interview: true,
    },
    orderBy: [{ status: "asc" }, { proposedSlotAt: "asc" }],
  });

  const items = matches.map((m) => ({
    matchId: m.id,
    status: m.status,
    positionTitle: m.position.title,
    candidateName: `${m.candidate.firstName} ${m.candidate.lastName}`,
    proposedSlotAt: m.proposedSlotAt?.toISOString() ?? null,
    interview: m.interview
      ? {
          id: m.interview.id,
          scheduledAt: m.interview.scheduledAt.toISOString(),
          meetLink: m.interview.meetLink,
        }
      : null,
  }));

  return (
    <div className="min-h-screen bg-[#f4f6f2]">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-black/[0.08] px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="text-brand font-bold text-xl tracking-tight">Собес</div>
        <div className="flex items-center gap-4 sm:gap-5">
          <Link href="/employer/dashboard" className="text-sm font-medium text-subtle hover:text-ink transition-colors">
            ← Дашборд
          </Link>
          <Link href="/settings" className="text-sm font-medium text-subtle hover:text-ink transition-colors hidden sm:inline">
            Настройки
          </Link>
          <form action={logout}>
            <button type="submit" className="text-sm text-dim hover:text-subtle transition-colors">Выйти</button>
          </form>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-[24px] font-bold text-ink tracking-tight mb-6">Встречи</h1>
        <div className="mb-6">
          <YandexCalendarConnect returnTo="/employer/interviews" />
        </div>
        <InterviewsClient items={items} yandexConnected={!!yandexAccount} />
      </main>
    </div>
  );
}
