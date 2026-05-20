import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

// Возвращает null когда Upstash не настроен (dev / нет env vars).
function makeRatelimit(requests: number, windowSeconds: number) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    analytics: false,
  });
}

// Лимиты по типам операций
const limiters = {
  // Мутирующие операции (POST/PATCH): 20 запросов за 60 сек с одного IP
  mutation: makeRatelimit(20, 60),
  // Auth: 10 попыток за 60 сек (регистрация/вход)
  auth: makeRatelimit(10, 60),
};

type LimiterKey = keyof typeof limiters;

function getIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// Проверяет лимит и возвращает 429 Response при превышении, иначе null.
export async function checkRateLimit(
  req: Request,
  type: LimiterKey = "mutation"
): Promise<NextResponse | null> {
  const limiter = limiters[type];
  if (!limiter) return null; // Upstash не настроен — пропускаем

  const ip = getIp(req);
  const { success, limit, remaining, reset } = await limiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Слишком много запросов. Попробуйте позже." },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
          "X-RateLimit-Reset": String(reset),
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        },
      }
    );
  }

  return null;
}
