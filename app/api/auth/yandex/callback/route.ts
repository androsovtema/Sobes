import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { exchangeCode, getUserInfo } from "@/lib/yandex/oauth";
import { encryptSecret } from "@/lib/crypto";

// GET /api/auth/yandex/callback?code=...&state=...
// Принимает callback от Яндекса, проверяет CSRF-state, обменивает code на токены,
// дёргает userinfo, upsert'ит YandexAccount, редиректит обратно на returnTo.
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const yandexError = url.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("yandex_oauth_state")?.value;
  const returnTo = cookieStore.get("yandex_oauth_return_to")?.value ?? "/";
  cookieStore.delete("yandex_oauth_state");
  cookieStore.delete("yandex_oauth_return_to");

  function back(status: "ok" | "denied" | "error", message?: string) {
    const u = new URL(returnTo, request.url);
    u.searchParams.set("yandex", status);
    if (message) u.searchParams.set("msg", message);
    return NextResponse.redirect(u);
  }

  if (yandexError) {
    return back("denied", yandexError);
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return back("error", "bad_state");
  }

  try {
    const tokens = await exchangeCode(code);
    const info = await getUserInfo(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await prisma.yandexAccount.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        yandexId: info.id,
        login: info.login,
        email: info.default_email ?? null,
        displayName: info.display_name ?? info.real_name ?? null,
        accessTokenEnc: encryptSecret(tokens.access_token),
        refreshTokenEnc: encryptSecret(tokens.refresh_token),
        expiresAt,
        scope: tokens.scope ?? "",
      },
      update: {
        yandexId: info.id,
        login: info.login,
        email: info.default_email ?? null,
        displayName: info.display_name ?? info.real_name ?? null,
        accessTokenEnc: encryptSecret(tokens.access_token),
        refreshTokenEnc: encryptSecret(tokens.refresh_token),
        expiresAt,
        scope: tokens.scope ?? "",
      },
    });

    return back("ok");
  } catch (e) {
    console.error("Yandex OAuth callback error:", e);
    return back("error", "exchange_failed");
  }
}
