// Яндекс OAuth 2.0 — клиент.
// Документация: https://yandex.ru/dev/id/doc/ru/codes/code-url
//
// Запрашиваемые scope:
// - login:email, login:info — чтобы знать, чей это аккаунт
// - calendar:all_events — полный доступ к Яндекс Календарю (нужен для CalDAV и Telemost-ссылок)

const AUTH_URL = "https://oauth.yandex.ru/authorize";
const TOKEN_URL = "https://oauth.yandex.ru/token";
const USERINFO_URL = "https://login.yandex.ru/info";

// calendar:all = «Чтение и изменение содержимого календарей и списков дел» (CalDAV + Telemost)
export const YANDEX_SCOPES = ["login:email", "login:info", "calendar:all"];

export function getYandexConfig() {
  const clientId = process.env.YANDEX_CLIENT_ID;
  const clientSecret = process.env.YANDEX_CLIENT_SECRET;
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  if (!clientId || !clientSecret) {
    throw new Error("YANDEX_CLIENT_ID / YANDEX_CLIENT_SECRET не заданы в .env.local");
  }
  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl}/api/auth/yandex/callback`,
  };
}

export function buildAuthUrl(state: string): string {
  const { clientId, redirectUri } = getYandexConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: YANDEX_SCOPES.join(" "),
    state,
    force_confirm: "yes",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type YandexTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number; // секунды
  token_type: "bearer";
  scope?: string;
};

export async function exchangeCode(code: string): Promise<YandexTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getYandexConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Yandex token exchange failed: ${res.status} ${text}`);
  }
  return (await res.json()) as YandexTokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<YandexTokenResponse> {
  const { clientId, clientSecret } = getYandexConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Yandex token refresh failed: ${res.status} ${text}`);
  }
  return (await res.json()) as YandexTokenResponse;
}

export type YandexUserInfo = {
  id: string;
  login: string;
  default_email?: string;
  real_name?: string;
  display_name?: string;
};

export async function getUserInfo(accessToken: string): Promise<YandexUserInfo> {
  const res = await fetch(`${USERINFO_URL}?format=json`, {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Yandex userinfo failed: ${res.status} ${text}`);
  }
  return (await res.json()) as YandexUserInfo;
}
