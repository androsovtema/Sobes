"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "CANDIDATE" | "EMPLOYER";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("CANDIDATE");
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
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Собес</CardTitle>
          <CardDescription>Создайте аккаунт</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Выбор роли */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setRole("CANDIDATE")}
              className={`rounded-lg border-2 p-4 text-left transition-colors ${
                role === "CANDIDATE"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <div className="font-semibold">Ищу работу</div>
              <div className={`text-xs mt-1 ${role === "CANDIDATE" ? "text-zinc-300" : "text-zinc-500"}`}>
                Соискатель
              </div>
            </button>
            <button
              type="button"
              onClick={() => setRole("EMPLOYER")}
              className={`rounded-lg border-2 p-4 text-left transition-colors ${
                role === "EMPLOYER"
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <div className="font-semibold">Нанимаю</div>
              <div className={`text-xs mt-1 ${role === "EMPLOYER" ? "text-zinc-300" : "text-zinc-500"}`}>
                Работодатель
              </div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <Label htmlFor="password">Пароль</Label>
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
              <Label htmlFor="confirm">Повторите пароль</Label>
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
              <p className="text-sm text-red-500">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Создаём аккаунт..." : "Создать аккаунт"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-zinc-500">
            Уже есть аккаунт?{" "}
            <Link href="/auth/login" className="font-medium text-zinc-900 hover:underline">
              Войти
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
