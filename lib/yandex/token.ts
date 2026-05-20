import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { refreshAccessToken } from "./oauth";

export type TokenResult = {
  token: string;
  login: string;
};

// Returns a valid access token for the user, refreshing if needed.
// Returns null if user has no Yandex account or refresh fails (re-auth required).
export async function getAccessToken(userId: string): Promise<TokenResult | null> {
  const account = await prisma.yandexAccount.findUnique({ where: { userId } });
  if (!account) return null;

  // Token still valid with 60-second buffer
  if (account.expiresAt.getTime() > Date.now() + 60_000) {
    return { token: decryptSecret(account.accessTokenEnc), login: account.login };
  }

  // Refresh
  const refreshToken = decryptSecret(account.refreshTokenEnc);
  try {
    const fresh = await refreshAccessToken(refreshToken);
    await prisma.yandexAccount.update({
      where: { userId },
      data: {
        accessTokenEnc: encryptSecret(fresh.access_token),
        refreshTokenEnc: encryptSecret(fresh.refresh_token),
        expiresAt: new Date(Date.now() + fresh.expires_in * 1000),
      },
    });
    return { token: fresh.access_token, login: account.login };
  } catch {
    return null;
  }
}
