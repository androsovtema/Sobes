"use client";

import { useState } from "react";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Candidate = {
  matchId: string;
  score: number;
  fitScore?: number;
  feasibilityScore?: number;
  interestScore?: number;
  scoreBreakdown?: {
    fit?: {
      requiredSkillsCoverage: number;
      additionalSkills: number;
      grade: number;
      experienceYears: number;
      salary: number;
      workFormat: number;
      meta?: {
        requiredCoveredPct: number;
        matchedRequiredSkills: string[];
        missingRequiredSkills: string[];
        matchedViaRelation: { skillId: string; weight: number }[];
      };
    };
    feasibility?: { slotOverlapHours: number; coldStartBoost: number; multiplier: number };
    interest?: { pAccept: number; pInvite: number; multiplier: number };
  } | null;
  firstName: string;
  lastName: string;
  grade: string;
  skills: string[];
  portfolio: { label: string; url: string }[];
};

const GRADE_LABELS: Record<string, string> = {
  INTERN: "Стажёр",
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
  LEAD: "Lead",
  PRINCIPAL: "Principal",
};

export default function CandidatesClient({
  positionId,
  positionTitle,
  initialCandidates,
}: {
  positionId: string;
  positionTitle: string;
  initialCandidates: Candidate[];
}) {
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [processing, setProcessing] = useState<string | null>(null);

  async function decide(matchId: string, action: "invite" | "skip") {
    setProcessing(matchId);
    try {
      const res = await fetch(`/api/employer/candidates/${matchId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setCandidates((prev) => prev.filter((c) => c.matchId !== matchId));
      }
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f2]">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-black/[0.08] px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="text-brand font-bold text-xl tracking-tight">Собес</div>
        <div className="flex items-center gap-4">
          <Link href="/employer/dashboard" className="text-sm font-medium text-subtle hover:text-ink transition-colors">
            ← Дашборд
          </Link>
          <form action={logout}>
            <button type="submit" className="text-sm text-dim hover:text-subtle transition-colors">Выйти</button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="pt-2">
          <h1 className="text-[24px] font-bold text-ink tracking-tight">{positionTitle}</h1>
          <p className="text-subtle mt-0.5 text-[15px]">
            {candidates.length > 0
              ? `${candidates.length} ${pluralCandidates(candidates.length)} ждут решения`
              : "Все кандидаты обработаны"}
          </p>
        </div>

        {candidates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-cta/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <p className="font-medium text-ink">Кандидатов для просмотра нет</p>
              <p className="text-sm text-subtle mt-1 max-w-xs mx-auto">
                Алгоритм подберёт новых кандидатов по мере регистрации соискателей
              </p>
              <Link href="/employer/dashboard" className="mt-5 inline-block">
                <Button variant="outline">← Вернуться на дашборд</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.matchId}
                candidate={candidate}
                processing={processing === candidate.matchId}
                onDecide={(action) => decide(candidate.matchId, action)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CandidateCard({
  candidate,
  processing,
  onDecide,
}: {
  candidate: Candidate;
  processing: boolean;
  onDecide: (action: "invite" | "skip") => void;
}) {
  const [showWhy, setShowWhy] = useState(false);
  return (
    <Card>
      <CardContent className="py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-ink text-[16px]">
                {candidate.firstName} {candidate.lastName}
              </p>
              <Badge variant="secondary">{GRADE_LABELS[candidate.grade] ?? candidate.grade}</Badge>
              <span className="text-xs bg-cta/20 text-brand rounded-full px-2.5 py-0.5 font-semibold">
                {candidate.score}% совпадение
              </span>
              {candidate.scoreBreakdown && (
                <button
                  type="button"
                  onClick={() => setShowWhy((v) => !v)}
                  className="text-xs text-dim hover:text-brand underline underline-offset-2 transition-colors"
                >
                  {showWhy ? "Скрыть" : "Почему в топе?"}
                </button>
              )}
            </div>

            {showWhy && candidate.scoreBreakdown && (
              <WhyBreakdown breakdown={candidate.scoreBreakdown} />
            )}

            <div className="flex flex-wrap gap-1.5">
              {candidate.skills.slice(0, 8).map((s) => (
                <span key={s} className="text-xs bg-surface text-subtle px-2.5 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
              {candidate.skills.length > 8 && (
                <span className="text-xs text-dim">+{candidate.skills.length - 8}</span>
              )}
            </div>

            {candidate.portfolio.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {candidate.portfolio.map((p, i) => (
                  <a
                    key={i}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand hover:opacity-80 underline-offset-2 hover:underline transition-all"
                  >
                    {p.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Button size="sm" onClick={() => onDecide("invite")} disabled={processing}>
              Позвать
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDecide("skip")}
              disabled={processing}
            >
              Пропустить
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WhyBreakdown({ breakdown }: { breakdown: NonNullable<Candidate["scoreBreakdown"]> }) {
  const fit = breakdown.fit;
  const feas = breakdown.feasibility;
  const int = breakdown.interest;
  const rows: { label: string; value: string; tone?: "good" | "warn" | "neutral" }[] = [];
  if (fit) {
    const pct = Math.round((fit.meta?.requiredCoveredPct ?? 0) * 100);
    rows.push({
      label: "Покрытие обязательных навыков",
      value: `${pct}%`,
      tone: pct >= 80 ? "good" : pct >= 50 ? "neutral" : "warn",
    });
    if (fit.meta?.matchedViaRelation && fit.meta.matchedViaRelation.length > 0) {
      rows.push({ label: "Засчитано через родственные навыки", value: `${fit.meta.matchedViaRelation.length}`, tone: "neutral" });
    }
    rows.push({ label: "Зарплата", value: `+${Math.round(fit.salary)}`, tone: fit.salary >= 9 ? "good" : "neutral" });
    rows.push({ label: "Опыт под грейд", value: `+${Math.round(fit.experienceYears)}`, tone: fit.experienceYears >= 7 ? "good" : "warn" });
  }
  if (feas) {
    rows.push({
      label: "Пересечение слотов / неделю",
      value: `${feas.slotOverlapHours.toFixed(1)} ч`,
      tone: feas.slotOverlapHours >= 4 ? "good" : feas.slotOverlapHours >= 1 ? "neutral" : "warn",
    });
    if (feas.coldStartBoost > 0) {
      rows.push({ label: "Cold-start boost", value: "включён", tone: "good" });
    }
  }
  if (int) {
    rows.push({
      label: "Вероятность принятия (P_accept)",
      value: `${Math.round(int.pAccept * 100)}%`,
      tone: int.pAccept >= 0.7 ? "good" : int.pAccept >= 0.4 ? "neutral" : "warn",
    });
  }
  return (
    <div className="rounded-2xl border border-border bg-surface/30 p-4 space-y-1.5">
      <p className="text-xs font-semibold text-ink mb-2">Разбор балла</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between text-xs">
          <span className="text-subtle">{r.label}</span>
          <span className={
            r.tone === "good" ? "font-semibold text-brand" :
            r.tone === "warn" ? "font-semibold text-amber-700" :
            "font-semibold text-subtle"
          }>
            {r.value}
          </span>
        </div>
      ))}
      {breakdown.fit?.meta?.missingRequiredSkills && breakdown.fit.meta.missingRequiredSkills.length > 0 && (
        <p className="text-[11px] text-dim pt-1.5 border-t border-border mt-2">
          Не хватает обязательных навыков: {breakdown.fit.meta.missingRequiredSkills.length} шт.
        </p>
      )}
    </div>
  );
}

function pluralCandidates(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "кандидатов";
  if (mod10 === 1) return "кандидат";
  if (mod10 >= 2 && mod10 <= 4) return "кандидата";
  return "кандидатов";
}
