import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="font-bold text-xl">Собес</div>
        <Link
          href="/auth/login"
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          Войти
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 mb-4">
          Умный найм без лишних звонков
        </h1>
        <p className="text-lg text-zinc-500 max-w-xl mb-10">
          Собес подбирает кандидатов под вакансию и автоматически находит время,
          удобное обеим сторонам. Одно нажатие — встреча в календаре.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/auth/register?role=candidate"
            className="inline-block bg-zinc-900 text-white px-8 py-3 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
          >
            Ищу работу
          </Link>
          <Link
            href="/auth/register?role=employer"
            className="inline-block bg-white border border-zinc-300 text-zinc-900 px-8 py-3 rounded-xl font-medium hover:bg-zinc-100 transition-colors"
          >
            Ищу сотрудников
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl text-left">
          <div>
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-semibold text-zinc-900 mb-1">Умный матчинг</h3>
            <p className="text-sm text-zinc-500">
              Алгоритм оценивает навыки, грейд, формат работы и зарплату — и ставит кандидатов в очередь по совместимости.
            </p>
          </div>
          <div>
            <div className="text-2xl mb-2">📅</div>
            <h3 className="font-semibold text-zinc-900 mb-1">Автоматический слот</h3>
            <p className="text-sm text-zinc-500">
              Система находит ближайшее время, когда свободны и кандидат, и HR — никаких переписок.
            </p>
          </div>
          <div>
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-semibold text-zinc-900 mb-1">Один клик</h3>
            <p className="text-sm text-zinc-500">
              HR приглашает, кандидат принимает — встреча в Яндекс Календаре у обоих.
            </p>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-zinc-400">
        © 2026 Собес · youarenow.online
      </footer>
    </div>
  );
}
