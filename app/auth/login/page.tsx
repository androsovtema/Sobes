"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });

    if (error) {
      setError("Неверный email или пароль");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

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
              Добро пожаловать
            </h1>
            <p className="text-subtle mt-1.5 text-[15px]">
              Войдите в свой аккаунт
            </p>
          </div>

          <div className="bg-white rounded-[28px] p-8 shadow-[0_4px_32px_rgba(0,0,0,0.09)]">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-ink font-medium text-sm">
                  Email
                </Label>
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
                <Label htmlFor="password" className="text-ink font-medium text-sm">
                  Пароль
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
                {loading ? "Входим..." : "Войти"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-subtle">
              Нет аккаунта?{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-brand hover:opacity-80 transition-opacity"
              >
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
