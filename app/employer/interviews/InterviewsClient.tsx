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

const STATUS_LABELS: Record<string, { text: string; variant: "secondary" | "default" | "accent" }> = {
  INVITED: { text: "Ждём ответа кандидата", variant: "secondary" },
  ACCEPTED: { text: "Кандидат принял — нужен слот", variant: "accent" },
  SCHEDULED: { text: "Запланировано", variant: "default" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    weekday: "short", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
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
        <CardContent className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🗓️</span>
          </div>
          <p className="font-medium text-ink">Запланированных встреч пока нет</p>
          <p className="text-sm text-subtle mt-1">
            После подтверждения от кандидата встречи появятся здесь
          </p>
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
  const status = STATUS_LABELS[item.status] ?? { text: item.status, variant: "secondary" as const };
  const whenIso = item.interview?.scheduledAt ?? item.proposedSlotAt;

  return (
    <Card>
      <CardContent className="py-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-ink text-[15px]">{item.candidateName}</p>
            <p className="text-sm text-subtle mt-0.5">{item.positionTitle}</p>
          </div>
          <Badge variant={status.variant} className="shrink-0">
            {status.text}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          {whenIso ? (
            <p className="text-sm text-subtle">
              <span className="font-medium text-ink">{formatDate(whenIso)}</span>
            </p>
          ) : (
            <p className="text-sm text-amber-700 font-medium">Время ещё не подобрано</p>
          )}
          {item.interview && (
            <a
              href={`/api/interviews/${item.interview.id}/ics`}
              download
              className="text-xs text-dim hover:text-subtle underline underline-offset-2 transition-colors"
            >
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
      const res = await fetch(`/api/employer/interviews/${interviewId}/generate-link`, { method: "POST" });
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
    <div className="border-t border-border/50 pt-3 space-y-2">
      <label className="text-xs text-dim font-medium">Ссылка на Яндекс Телемост</label>
      {yandexConnected && !value && (
        <div>
          <Button size="sm" variant="outline" onClick={generateLink} disabled={generating}>
            {generating ? "Создаём встречу..." : "Создать встречу в Яндекс Календаре"}
          </Button>
          <p className="text-[11px] text-dim mt-1.5">
            Событие появится в вашем Яндекс Календаре, ссылка Телемост будет сгенерирована автоматически.
          </p>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false); }}
          placeholder="https://telemost.yandex.ru/j/..."
          className="text-sm"
        />
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? "..." : "Сохранить"}
        </Button>
      </div>
      {saved && <p className="text-xs text-brand font-medium">Сохранено</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!value && !yandexConnected && (
        <p className="text-[11px] text-dim">
          Создайте встречу на{" "}
          <a href="https://telemost.yandex.ru/" target="_blank" rel="noopener noreferrer" className="underline text-brand">
            telemost.yandex.ru
          </a>{" "}
          и вставьте сюда — кандидат увидит ссылку в своём кабинете.
        </p>
      )}
    </div>
  );
}
