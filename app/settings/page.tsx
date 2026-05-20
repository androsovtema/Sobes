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
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="font-bold text-lg">Собес</div>
        <div className="flex items-center gap-4">
          <Link href={dashboardHref} className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Дашборд
          </Link>
          <form action={logout}>
            <button type="submit" className="text-sm text-zinc-400 hover:text-zinc-600">
              Выйти
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold">Настройки</h1>

        <section>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">
            Интеграции
          </h2>
          <YandexCalendarConnect returnTo="/settings" />
        </section>
      </main>
    </div>
  );
}
