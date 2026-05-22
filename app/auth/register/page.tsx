"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "CANDIDATE" | "EMPLOYER";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole: Role = searchParams.get("role") === "employer" ? "EMPLOYER" : "CANDIDATE";
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password !== confirm) {
      setError("Пароли не совпадают");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
      },
    });

    if (error) {
      setError(error.message === "User already registered"
        ? "Этот email уже зарегистрирован"
        : error.message);
      setLoading(false);
      return;
    }

    router.push(role === "CANDIDATE" ? "/onboarding/candidate" : "/onboarding/employer");
    router.refresh();
  }

  return (
    <div className="bg-white rounded-[28px] p-8 shadow-[0_4px_32px_rgba(0,0,0,0.09)]">
      {/* Role selector */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setRole("CANDIDATE")}
          className={`rounded-2xl border-2 p-4 text-left transition-all ${
            role === "CANDIDATE"
              ? "border-brand bg-brand text-white"
              : "border-border hover:border-brand/40 text-ink"
          }`}
        >
          <div className="font-semibold text-[14px]">Ищу работу</div>
          <div className={`text-xs mt-0.5 ${role === "CANDIDATE" ? "text-white/70" : "text-dim"}`}>
            Соискатель
          </div>
        </button>
        <button
          type="button"
          onClick={() => setRole("EMPLOYER")}
          className={`rounded-2xl border-2 p-4 text-left transition-all ${
            role === "EMPLOYER"
              ? "border-brand bg-brand text-white"
              : "border-border hover:border-brand/40 text-ink"
          }`}
        >
          <div className="font-semibold text-[14px]">Нанимаю</div>
          <div className={`text-xs mt-0.5 ${role === "EMPLOYER" ? "text-white/70" : "text-dim"}`}>
            Работодатель
          </div>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-ink font-medium text-sm">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-ink font-medium text-sm">Пароль</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Минимум 8 символов"
            required
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-ink font-medium text-sm">Повторите пароль</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <Button type="submit" size="lg" className="w-full mt-1" disabled={loading}>
          {loading ? "Создаём аккаунт..." : "Создать аккаунт"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-subtle">
        Уже есть аккаунт?{" "}
        <Link
          href="/auth/login"
          className="font-semibold text-brand hover:opacity-80 transition-opacity"
        >
          Войти
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-6 h-14 flex items-center">
        <Link href="/" className="text-brand font-bold text-xl tracking-tight">
          Собес
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-[28px] font-bold text-ink tracking-tight">
              Создайте аккаунт
            </h1>
            <p className="text-subtle mt-1.5 text-[15px]">
              Начните находить лучшие совпадения
            </p>
          </div>

          <Suspense
            fallback={
              <div className="bg-white rounded-[28px] p-8 shadow-[0_4px_32px_rgba(0,0,0,0.09)] text-center text-dim py-16">
                Загрузка...
              </div>
            }
          >
            <RegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
