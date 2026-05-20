"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Item = {
  matchId: string;
  status: "INVITED" | "ACCEPTED" | "SCHEDULED" | string;
  positionTitle: string;
  candidateName: string;
  proposedSlotAt: string | null;
  interview: { id: string; scheduledAt: string; meetLink: string | null } | null;
};

const STATUS_LABELS: Record<string, { text: string; tone: string }> = {
  INVITED: { text: "Ждём ответа кандидата", tone: "bg-zinc-100 text-zinc-700" },
  ACCEPTED: { text: "Кандидат принял — нужен слот", tone: "bg-amber-100 text-amber-800" },
  SCHEDULED: { text: "Запланировано", tone: "bg-emerald-100 text-emerald-800" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    weekday: "short", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

export default function InterviewsClient({
  items,
  yandexConnected,
}: {
  items: Item[];
  yandexConnected: boolean;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-zinc-400">
          <p className="text-4xl mb-3">🗓️</p>
          <p>Запланированных встреч пока нет</p>
          <p className="text-sm mt-1">После подтверждения от кандидата встречи появятся здесь</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <Row key={it.matchId} item={it} yandexConnected={yandexConnected} />
      ))}
    </div>
  );
}

function Row({ item, yandexConnected }: { item: Item; yandexConnected: boolean }) {
  const status = STATUS_LABELS[item.status] ?? { text: item.status, tone: "bg-zinc-100" };
  const whenIso = item.interview?.scheduledAt ?? item.proposedSlotAt;

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold">{item.candidateName}</p>
            <p className="text-sm text-zinc-500">{item.positionTitle}</p>
          </div>
          <Badge variant="outline" className={`text-xs ${status.tone}`}>{status.text}</Badge>
        </div>
        <div className="flex items-center gap-3">
          {whenIso ? (
            <p className="text-sm">🕒 <span className="font-medium">{formatDate(whenIso)}</span></p>
          ) : (
            <p className="text-sm text-amber-700">⚠️ Время ещё не подобрано</p>
          )}
          {item.interview && (
            <a href={`/api/interviews/${item.interview.id}/ics`} download
              className="text-xs text-zinc-400 hover:text-zinc-600 underline underline-offset-2">
              Скачать .ics
            </a>
          )}
        </div>
        {item.interview && (
          <MeetLinkEditor
            interviewId={item.interview.id}
            initial={item.interview.meetLink}
            yandexConnected={yandexConnected}
          />
        )}
      </CardContent>
    </Card>
  );
}

function MeetLinkEditor({
  interviewId,
  initial,
  yandexConnected,
}: {
  interviewId: string;
  initial: string | null;
  yandexConnected: boolean;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/employer/interviews/${interviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetLink: value.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(typeof j.error === "string" ? j.error : "Не удалось сохранить");
      } else {
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  async function generateLink() {
    setGenerating(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/employer/interviews/${interviewId}/generate-link`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Не удалось создать встречу");
      } else if (j.meetLink) {
        setValue(j.meetLink);
        setSaved(true);
      } else {
        setError("Встреча создана, но ссылка Телемост ещё не готова — попробуйте через минуту");
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="border-t pt-3 space-y-2">
      <label className="text-xs text-zinc-500">Ссылка на Яндекс Телемост</label>
      {yandexConnected && !value && (
        <div>
          <Button
            size="sm"
            variant="outline"
            onClick={generateLink}
            disabled={generating}
            className="text-xs"
          >
            {generating ? "Создаём встречу..." : "Создать встречу в Яндекс Календаре"}
          </Button>
          <p className="text-[11px] text-zinc-400 mt-1">
            Событие появится в вашем Яндекс Календаре, ссылка Телемост будет сгенерирована автоматически.
          </p>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          placeholder="https://telemost.yandex.ru/j/..."
          className="text-sm"
        />
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "..." : "Сохранить"}
        </Button>
      </div>
      {saved && <p className="text-xs text-emerald-700">Сохранено</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!value && !yandexConnected && (
        <p className="text-[11px] text-zinc-400">
          Создайте встречу на{" "}
          <a
            href="https://telemost.yandex.ru/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            telemost.yandex.ru
          </a>{" "}
          и вставьте сюда — кандидат увидит ссылку в своём кабинете.
        </p>
      )}
    </div>
  );
}
