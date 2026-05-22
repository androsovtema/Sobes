import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { logout } from "@/app/auth/actions";
import { YandexCalendarConnect } from "@/components/yandex-calendar-connect";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) redirect("/auth/login");

  const dashboardHref =
    dbUser.role === "CANDIDATE" ? "/candidate/dashboard" : "/employer/dashboard";

  return (
    <div className="min-h-screen bg-[#f4f6f2]">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-black/[0.08] px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="text-brand font-bold text-xl tracking-tight">Собес</div>
        <div className="flex items-center gap-4">
          <Link href={dashboardHref} className="text-sm font-medium text-subtle hover:text-ink transition-colors">
            ← Дашборд
          </Link>
          <form action={logout}>
            <button type="submit" className="text-sm text-dim hover:text-subtle transition-colors">
              Выйти
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-[24px] font-bold text-ink tracking-tight">Настройки</h1>

        <section>
          <h2 className="text-[11px] font-semibold text-dim uppercase tracking-wider mb-4">
            Интеграции
          </h2>
          <YandexCalendarConnect returnTo="/settings" />
        </section>
      </main>
    </div>
  );
}
