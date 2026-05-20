import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/yandex/oauth";

// GET /api/auth/yandex/start
// Запускает OAuth: ставит state в cookie (CSRF), редиректит на oauth.yandex.ru.
// Опционально принимает ?returnTo=<path> — куда вернуться после успеха.
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") ?? "/";

  const state = randomBytes(24).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set("yandex_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 минут на завершение флоу
  });
  cookieStore.set("yandex_oauth_return_to", returnTo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(buildAuthUrl(state));
}
