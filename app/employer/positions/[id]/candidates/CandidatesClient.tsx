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
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
        <div className="font-bold text-lg shrink-0">Собес</div>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/employer/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
            ← Дашборд
          </Link>
          <form action={logout}>
            <button type="submit" className="text-sm text-zinc-400 hover:text-zinc-600">Выйти</button>
          </form>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{positionTitle}</h1>
          <p className="text-zinc-500 mt-1">
            {candidates.length > 0
              ? `${candidates.length} ${pluralCandidates(candidates.length)} ждут решения`
              : "Все кандидаты обработаны"}
          </p>
        </div>

        {candidates.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-zinc-400">
              <p className="text-4xl mb-3">✅</p>
              <p>Кандидатов для просмотра нет</p>
              <p className="text-sm mt-1">Алгоритм подберёт новых кандидатов по мере регистрации соискателей</p>
              <Link href="/employer/dashboard" className="mt-4 inline-block">
                <Button variant="outline" className="mt-4">← Вернуться на дашборд</Button>
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
              <p className="font-semibold text-lg">
                {candidate.firstName} {candidate.lastName}
              </p>
              <Badge variant="outline">{GRADE_LABELS[candidate.grade] ?? candidate.grade}</Badge>
              <span className="text-xs text-zinc-700 bg-emerald-100 rounded px-2 py-0.5 font-medium">
                Совпадение {candidate.score}%
              </span>
              {candidate.scoreBreakdown && (
                <button
                  type="button"
                  onClick={() => setShowWhy((v) => !v)}
                  className="text-xs text-zinc-500 hover:text-zinc-900 underline underline-offset-2"
                >
                  {showWhy ? "Скрыть" : "Почему в топе?"}
                </button>
              )}
            </div>

            {showWhy && candidate.scoreBreakdown && (
              <WhyBreakdown breakdown={candidate.scoreBreakdown} />
            )}

            <div className="flex flex-wrap gap-2">
              {candidate.skills.slice(0, 8).map((s) => (
                <span key={s} className="text-xs bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded">{s}</span>
              ))}
              {candidate.skills.length > 8 && (
                <span className="text-xs text-zinc-400">+{candidate.skills.length - 8}</span>
              )}
            </div>

            {candidate.portfolio.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {candidate.portfolio.map((p, i) => (
                  <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 underline-offset-2 hover:underline">
                    {p.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => onDecide("invite")}
              disabled={processing}
            >
              Позвать
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDecide("skip")}
              disabled={processing}
              className="text-zinc-500"
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
      rows.push({
        label: "Засчитано через родственные навыки",
        value: `${fit.meta.matchedViaRelation.length}`,
        tone: "neutral",
      });
    }
    rows.push({
      label: "Зарплата",
      value: `+${Math.round(fit.salary)}`,
      tone: fit.salary >= 9 ? "good" : "neutral",
    });
    rows.push({
      label: "Опыт под грейд",
      value: `+${Math.round(fit.experienceYears)}`,
      tone: fit.experienceYears >= 7 ? "good" : "warn",
    });
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
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-1.5">
      <p className="text-xs font-semibold text-zinc-700 mb-2">Разбор балла</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between text-xs">
          <span className="text-zinc-600">{r.label}</span>
          <span
            className={
              r.tone === "good"
                ? "font-medium text-emerald-700"
                : r.tone === "warn"
                ? "font-medium text-amber-700"
                : "font-medium text-zinc-700"
            }
          >
            {r.value}
          </span>
        </div>
      ))}
      {breakdown.fit?.meta?.missingRequiredSkills && breakdown.fit.meta.missingRequiredSkills.length > 0 && (
        <p className="text-[11px] text-zinc-500 pt-1.5 border-t border-zinc-200 mt-2">
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
