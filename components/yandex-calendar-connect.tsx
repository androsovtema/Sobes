"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Status =
  | { connected: false }
  | { connected: true; login: string; email: string | null; displayName: string | null; scope: string; expiresAt: string };

// Универсальный блок «Яндекс Календарь». Используется в кабинете кандидата и работодателя.
// returnTo задаёт, куда вернуться после OAuth-флоу (обычно — текущая страница).
export function YandexCalendarConnect({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/yandex")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ connected: false }));
  }, []);

  useEffect(() => {
    const code = params.get("yandex");
    if (!code) return;
    if (code === "ok") setFlash({ tone: "ok", text: "Яндекс Календарь подключён" });
    else if (code === "denied") setFlash({ tone: "error", text: "Вы отказали в доступе" });
    else setFlash({ tone: "error", text: `Ошибка подключения${params.get("msg") ? `: ${params.get("msg")}` : ""}` });
    // подчистим query, чтобы не залипало
    const u = new URL(window.location.href);
    u.searchParams.delete("yandex");
    u.searchParams.delete("msg");
    window.history.replaceState({}, "", u.toString());
  }, [params]);

  function connect() {
    const u = `/api/auth/yandex/start?returnTo=${encodeURIComponent(returnTo)}`;
    window.location.href = u;
  }

  async function disconnect() {
    if (!confirm("Отключить Яндекс Календарь? Автоматическое создание встреч перестанет работать.")) return;
    setBusy(true);
    try {
      await fetch("/api/auth/yandex", { method: "DELETE" });
      setStatus({ connected: false });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold flex items-center gap-2">
              <span>Яндекс Календарь</span>
              {status?.connected && (
                <Badge variant="accent" className="text-xs">подключён</Badge>
              )}
            </p>
            <p className="text-sm text-subtle">
              {status?.connected
                ? "Встречи будут автоматически создаваться в вашем Яндекс Календаре со ссылкой Телемост."
                : "Подключите аккаунт, чтобы встреча со ссылкой Телемост появлялась в вашем календаре автоматически."}
            </p>
          </div>
        </div>

        {status?.connected && (
          <div className="text-xs text-subtle space-y-1">
            <p>Аккаунт: <span className="font-medium">{status.email ?? status.login}</span></p>
            {status.displayName && <p>{status.displayName}</p>}
          </div>
        )}

        <div className="flex gap-2">
          {status?.connected ? (
            <Button size="sm" variant="outline" onClick={disconnect} disabled={busy}>
              {busy ? "..." : "Отключить"}
            </Button>
          ) : (
            <Button size="sm" onClick={connect} disabled={status === null}>
              Подключить Яндекс Календарь
            </Button>
          )}
        </div>

        {flash && (
          <p className={`text-xs font-medium ${flash.tone === "ok" ? "text-brand" : "text-destructive"}`}>{flash.text}</p>
        )}
      </CardContent>
    </Card>
  );
}
