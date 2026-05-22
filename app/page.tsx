import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-black/[0.08] px-5 sm:px-8 h-14 flex items-center justify-between">
        <div className="text-brand font-bold text-xl tracking-tight">Собес</div>
        <Link
          href="/auth/login"
          className="text-sm font-medium text-subtle hover:text-ink transition-colors"
        >
          Войти
        </Link>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-5 sm:px-8 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-surface rounded-full px-4 py-1.5 text-sm font-medium text-brand mb-10">
            <span className="w-2 h-2 rounded-full bg-cta inline-block" />
            Умный найм без переписки
          </div>
          <h1 className="text-[52px] sm:text-[76px] font-black text-ink leading-[0.92] tracking-[-0.03em] mb-7">
            Найм, который<br className="hidden sm:block" /> работает сам
          </h1>
          <p className="text-[17px] text-subtle max-w-lg mx-auto mb-12 leading-relaxed">
            Собес подбирает кандидатов и автоматически согласует время встречи.
            Никаких переписок — только результат.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/register?role=candidate"
              className="inline-flex items-center justify-center bg-cta text-brand font-semibold px-8 py-3.5 rounded-full hover:bg-cta/90 transition-colors text-[15px]"
            >
              Ищу работу
            </Link>
            <Link
              href="/auth/register?role=employer"
              className="inline-flex items-center justify-center border border-brand text-brand font-semibold px-8 py-3.5 rounded-full hover:bg-surface/60 transition-colors text-[15px]"
            >
              Нанимаю сотрудников
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="bg-surface/40 py-20">
          <div className="max-w-5xl mx-auto px-5 sm:px-8">
            <div className="text-center mb-12">
              <h2 className="text-[32px] font-bold text-ink tracking-tight">
                Как это работает
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                {
                  num: "01",
                  title: "Умный матчинг",
                  desc: "Алгоритм оценивает навыки, грейд, формат работы и зарплату — и ставит кандидатов в очередь по совместимости.",
                },
                {
                  num: "02",
                  title: "Автослот",
                  desc: "Система находит ближайшее свободное время и у кандидата, и у HR — никаких переписок «когда вам удобно».",
                },
                {
                  num: "03",
                  title: "Один клик",
                  desc: "HR приглашает, кандидат принимает — встреча появляется в Яндекс Календаре у обоих автоматически.",
                },
              ].map((f) => (
                <div
                  key={f.num}
                  className="bg-white rounded-[28px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.07)]"
                >
                  <div className="text-cta font-black text-[40px] leading-none mb-5 font-mono">
                    {f.num}
                  </div>
                  <h3 className="font-semibold text-[18px] text-ink mb-2 tracking-tight">
                    {f.title}
                  </h3>
                  <p className="text-[14px] text-subtle leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="max-w-5xl mx-auto px-5 sm:px-8 py-20">
          <div className="bg-brand rounded-[28px] px-8 sm:px-16 py-14 text-center">
            <h2 className="text-[32px] sm:text-[40px] font-black text-white leading-tight tracking-tight mb-4">
              Готовы начать?
            </h2>
            <p className="text-white/70 text-[16px] mb-8 max-w-sm mx-auto">
              Создайте аккаунт за минуту — без CV и сопроводительных писем.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/auth/register?role=candidate"
                className="inline-flex items-center justify-center bg-cta text-brand font-semibold px-8 py-3.5 rounded-full hover:bg-cta/90 transition-colors text-[15px]"
              >
                Ищу работу
              </Link>
              <Link
                href="/auth/register?role=employer"
                className="inline-flex items-center justify-center bg-white/10 text-white font-semibold px-8 py-3.5 rounded-full hover:bg-white/20 transition-colors text-[15px] border border-white/20"
              >
                Нанимаю сотрудников
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-sm text-dim border-t border-black/[0.06]">
        © 2026 Собес · youarenow.online
      </footer>
    </div>
  );
}
