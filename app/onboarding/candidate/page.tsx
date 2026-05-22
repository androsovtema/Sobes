"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SKILL_GROUPS } from "@/lib/skills-data";

type Grade = "INTERN" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD" | "PRINCIPAL";
type WorkFormat = "REMOTE" | "OFFICE" | "HYBRID";

type Step1 = { firstName: string; lastName: string; headline: string; bio: string; yearsExp: string; grade: Grade };
type Step2 = { skills: string[] };
type Step3 = { workFormat: WorkFormat; salaryMin: string; salaryMax: string; currency: string };
type Step4 = { portfolio: { label: string; url: string }[] };

const GRADES: { value: Grade; label: string }[] = [
  { value: "INTERN", label: "Стажёр" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MIDDLE", label: "Middle" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead" },
  { value: "PRINCIPAL", label: "Principal" },
];

const WORK_FORMATS: { value: WorkFormat; label: string; desc: string }[] = [
  { value: "REMOTE", label: "Удалённо", desc: "Из любого места" },
  { value: "OFFICE", label: "Офис", desc: "Готов приходить в офис" },
  { value: "HYBRID", label: "Гибрид", desc: "Часть офис, часть дома" },
];

const PORTFOLIO_LABELS = ["GitHub", "GitLab", "Behance", "Dribbble", "LinkedIn", "Личный сайт", "Портфолио", "Другое"];

const STEP_LABELS = ["Основное", "Навыки", "Условия", "Портфолио"];

const SELECT_CLASS = "h-11 rounded-[10px] border border-border bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors";

function pluralVacancies(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "вакансии";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "вакансий";
  return "вакансий";
}

export default function CandidateOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [s1, setS1] = useState<Step1>({ firstName: "", lastName: "", headline: "", bio: "", yearsExp: "", grade: "MIDDLE" });
  const [s2, setS2] = useState<Step2>({ skills: [] });
  const [s3, setS3] = useState<Step3>({ workFormat: "REMOTE", salaryMin: "", salaryMax: "", currency: "RUB" });
  const [s4, setS4] = useState<Step4>({ portfolio: [{ label: "GitHub", url: "" }] });
  const [skillSearch, setSkillSearch] = useState("");

  type Suggestion = {
    name: string;
    category: string | null;
    demandPct: number;
    cohortPct: number;
    source: "demand" | "cluster" | "gap";
    matchedPositionsCount: number;
  };
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [cohortSize, setCohortSize] = useState(0);
  const [medianSkillCount, setMedianSkillCount] = useState(0);
  const [preview, setPreview] = useState<{
    currentMatches: number;
    activePositionsTotal: number;
    deltas: { skill: string; delta: number; newTotal: number }[];
  } | null>(null);
  const suggestedAddedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (step !== 2) return;
    if (!s1.headline.trim() && !s1.grade) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/candidate/skill-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headline: s1.headline.trim() || undefined, grade: s1.grade, currentSkills: s2.skills, limit: 12 }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setCohortSize(data.cohortSize ?? 0);
        setMedianSkillCount(data.medianSkillCount ?? 0);
      } catch { /* ignore */ }
    }, 250);
    return () => clearTimeout(t);
  }, [step, s1.headline, s1.grade, s2.skills]);

  useEffect(() => {
    if (step !== 2) return;
    if (s2.skills.length === 0) { setPreview(null); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/candidate/match-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            draft: { grade: s1.grade, yearsExp: Number(s1.yearsExp) || 0, workFormat: s3.workFormat, salaryMin: Number(s3.salaryMin) || 0, salaryMax: Number(s3.salaryMax) || 999_999_999, skillNames: s2.skills },
            hypotheticalSkills: suggestions.slice(0, 6).map((s) => s.name),
          }),
        });
        if (!res.ok) return;
        setPreview(await res.json());
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [step, s1.grade, s1.yearsExp, s2.skills, s3.workFormat, s3.salaryMin, s3.salaryMax, suggestions]);

  function toggleSkill(skill: string, fromSuggestion = false) {
    setS2((prev) => {
      if (prev.skills.includes(skill)) {
        suggestedAddedRef.current.delete(skill);
        return { skills: prev.skills.filter((s) => s !== skill) };
      }
      if (fromSuggestion) suggestedAddedRef.current.add(skill);
      return { skills: [...prev.skills, skill] };
    });
  }

  function addPortfolioRow() {
    setS4((prev) => ({ portfolio: [...prev.portfolio, { label: "Другое", url: "" }] }));
  }

  function removePortfolioRow(i: number) {
    setS4((prev) => ({ portfolio: prev.portfolio.filter((_, idx) => idx !== i) }));
  }

  function validateStep(): boolean {
    setError(null);
    if (step === 1) {
      if (!s1.firstName.trim() || !s1.lastName.trim()) { setError("Введите имя и фамилию"); return false; }
      if (!s1.headline.trim()) { setError("Укажите должность/специализацию"); return false; }
      if (!s1.yearsExp || isNaN(Number(s1.yearsExp))) { setError("Укажите опыт в годах"); return false; }
    }
    if (step === 2 && s2.skills.length === 0) { setError("Выберите хотя бы один навык"); return false; }
    if (step === 3) {
      if (!s3.salaryMin || !s3.salaryMax) { setError("Укажите зарплатную вилку"); return false; }
      if (Number(s3.salaryMin) > Number(s3.salaryMax)) { setError("Минимум не может быть больше максимума"); return false; }
    }
    if (step === 4) {
      for (const p of s4.portfolio) {
        if (p.url && !p.url.startsWith("http")) { setError("Ссылки должны начинаться с http:// или https://"); return false; }
      }
    }
    return true;
  }

  async function handleNext() {
    if (!validateStep()) return;
    if (step < 4) { setStep(step + 1); return; }
    await submit();
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/candidate/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: s1.firstName.trim(),
          lastName: s1.lastName.trim(),
          headline: s1.headline.trim(),
          bio: s1.bio.trim() || undefined,
          yearsExp: Number(s1.yearsExp),
          grade: s1.grade,
          workFormat: s3.workFormat,
          salaryMin: Number(s3.salaryMin),
          salaryMax: Number(s3.salaryMax),
          currency: s3.currency,
          skills: s2.skills.map((name) => ({
            name,
            source: suggestedAddedRef.current.has(name) ? "SUGGESTED" : "MANUAL",
          })),
          portfolio: s4.portfolio.filter((p) => p.url.trim()),
        }),
      });
      if (!res.ok) { setError("Ошибка сохранения. Попробуйте ещё раз."); return; }
      router.push("/candidate/availability");
    } finally {
      setLoading(false);
    }
  }

  const filteredGroups = skillSearch.trim()
    ? SKILL_GROUPS.map((g) => ({ ...g, skills: g.skills.filter((s) => s.toLowerCase().includes(skillSearch.toLowerCase())) })).filter((g) => g.skills.length > 0)
    : SKILL_GROUPS;

  return (
    <div className="min-h-screen bg-[#f4f6f2] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    i + 1 === step
                      ? "bg-brand text-white shadow-[0_2px_8px_rgba(18,44,0,0.25)]"
                      : i + 1 < step
                      ? "bg-cta text-brand"
                      : "bg-surface text-dim"
                  }`}
                >
                  {i + 1 < step ? "✓" : i + 1}
                </div>
                <span className={`text-sm hidden sm:block font-medium ${i + 1 === step ? "text-ink" : "text-dim"}`}>
                  {label}
                </span>
                {i < 3 && (
                  <div className={`w-8 sm:w-12 h-px ${i + 1 < step ? "bg-cta" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && "Расскажите о себе"}
              {step === 2 && "Ваши навыки"}
              {step === 3 && "Условия работы"}
              {step === 4 && "Портфолио"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "Основная информация — имя, специализация, опыт"}
              {step === 2 && `Выбрано: ${s2.skills.length} навыков`}
              {step === 3 && "Формат работы и ожидания по зарплате"}
              {step === 4 && "Ссылки на ваши работы (необязательно)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Step 1 */}
            {step === 1 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-ink font-medium text-sm">Имя</Label>
                    <Input placeholder="Иван" value={s1.firstName} onChange={(e) => setS1({ ...s1, firstName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-ink font-medium text-sm">Фамилия</Label>
                    <Input placeholder="Иванов" value={s1.lastName} onChange={(e) => setS1({ ...s1, lastName: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-ink font-medium text-sm">Специализация</Label>
                  <Input placeholder="Senior React Developer" value={s1.headline} onChange={(e) => setS1({ ...s1, headline: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-ink font-medium text-sm">Опыт (лет)</Label>
                    <Input type="number" min={0} max={50} placeholder="3" value={s1.yearsExp} onChange={(e) => setS1({ ...s1, yearsExp: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-ink font-medium text-sm">Грейд</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {GRADES.map((g) => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => setS1({ ...s1, grade: g.value })}
                          className={`rounded-full border py-2 text-xs font-semibold transition-all ${
                            s1.grade === g.value
                              ? "border-brand bg-brand text-white shadow-[0_2px_8px_rgba(18,44,0,0.2)]"
                              : "border-border text-subtle hover:border-brand/50 hover:text-ink"
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-ink font-medium text-sm">
                    О себе <span className="text-dim font-normal">(необязательно)</span>
                  </Label>
                  <Textarea
                    placeholder="Коротко о своём опыте и подходе к работе..."
                    value={s1.bio}
                    onChange={(e) => setS1({ ...s1, bio: e.target.value })}
                    rows={3}
                    className="rounded-[10px] border-border focus-visible:border-brand focus-visible:ring-brand/15 resize-none text-ink placeholder:text-dim"
                  />
                </div>
              </>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <>
                <Input placeholder="Поиск навыка..." value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} />
                {s2.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-4 bg-surface/50 rounded-2xl">
                    {s2.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="default"
                        className="cursor-pointer hover:opacity-80"
                        onClick={() => toggleSkill(skill)}
                      >
                        {skill} ✕
                      </Badge>
                    ))}
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                    <div className="flex items-start justify-between mb-2.5 gap-2">
                      <div>
                        <p className="text-sm font-semibold text-blue-900">
                          Часто требуют для вашей роли
                        </p>
                        <p className="text-xs text-blue-700/70 mt-0.5">
                          По данным {cohortSize} {pluralVacancies(cohortSize)}
                          {medianSkillCount > 0 && s2.skills.length < medianSkillCount && (
                            <> · в среднем указывают {medianSkillCount} навыков</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((sug) => {
                        const selected = s2.skills.includes(sug.name);
                        return (
                          <button
                            key={sug.name}
                            type="button"
                            onClick={() => toggleSkill(sug.name, true)}
                            className={`rounded-full px-3 py-1 text-xs border font-medium transition-all flex items-center gap-1.5 ${
                              selected
                                ? "border-blue-700 bg-blue-700 text-white"
                                : "border-blue-300 bg-white text-blue-900 hover:border-blue-500"
                            }`}
                            title={
                              sug.source === "demand"
                                ? `Требуется в ${Math.round(sug.demandPct * 100)}% подходящих вакансий`
                                : `${Math.round(sug.cohortPct * 100)}% похожих кандидатов указывают этот навык`
                            }
                          >
                            <span>{sug.name}</span>
                            <span className={`text-[10px] ${selected ? "text-blue-200" : "text-blue-500"}`}>
                              {sug.source === "demand" ? `${Math.round(sug.demandPct * 100)}%` : `~${Math.round(sug.cohortPct * 100)}%`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                  {filteredGroups.map((group) => (
                    <div key={group.category}>
                      <p className="text-[11px] font-semibold text-dim uppercase tracking-wider mb-2">
                        {group.category}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {group.skills.map((skill) => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className={`rounded-full px-3 py-1.5 text-sm border font-medium transition-all ${
                              s2.skills.includes(skill)
                                ? "border-brand bg-brand text-white"
                                : "border-border text-subtle hover:border-brand/50 hover:text-ink bg-white"
                            }`}
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {preview && preview.currentMatches >= 0 && (
                  <div className="rounded-2xl border border-cta/40 bg-cta/10 p-4">
                    <p className="text-sm font-semibold text-brand">
                      Ваш профиль попадает в матчинг с{" "}
                      <span className="text-[17px] font-black">{preview.currentMatches}</span>{" "}
                      из {preview.activePositionsTotal} активных {pluralVacancies(preview.activePositionsTotal)}
                    </p>
                    {preview.deltas.filter((d) => d.delta > 0).length > 0 && (
                      <>
                        <p className="text-xs text-subtle mt-1.5">
                          Добавьте навык — попадёте ещё в:
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {preview.deltas
                            .filter((d) => d.delta > 0)
                            .slice(0, 5)
                            .map((d) => (
                              <button
                                key={d.skill}
                                type="button"
                                onClick={() => toggleSkill(d.skill, true)}
                                className="rounded-full px-3 py-1 text-xs border border-cta/50 bg-white text-brand font-medium hover:border-brand transition-colors"
                              >
                                + {d.skill}{" "}
                                <span className="text-cta font-bold">(+{d.delta})</span>
                              </button>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <>
                <div className="space-y-2">
                  <Label className="text-ink font-medium text-sm">Формат работы</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {WORK_FORMATS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setS3({ ...s3, workFormat: f.value })}
                        className={`rounded-2xl border-2 p-3.5 text-left transition-all ${
                          s3.workFormat === f.value
                            ? "border-brand bg-brand text-white"
                            : "border-border hover:border-brand/40"
                        }`}
                      >
                        <div className={`font-semibold text-sm ${s3.workFormat === f.value ? "text-white" : "text-ink"}`}>
                          {f.label}
                        </div>
                        <div className={`text-xs mt-0.5 ${s3.workFormat === f.value ? "text-white/70" : "text-dim"}`}>
                          {f.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-ink font-medium text-sm">Зарплатная вилка</Label>
                  <div className="flex items-center gap-3">
                    <Input type="number" placeholder="100 000" value={s3.salaryMin} onChange={(e) => setS3({ ...s3, salaryMin: e.target.value })} />
                    <span className="text-dim font-medium">—</span>
                    <Input type="number" placeholder="150 000" value={s3.salaryMax} onChange={(e) => setS3({ ...s3, salaryMax: e.target.value })} />
                    <select
                      value={s3.currency}
                      onChange={(e) => setS3({ ...s3, currency: e.target.value })}
                      className={SELECT_CLASS}
                    >
                      <option>RUB</option>
                      <option>USD</option>
                      <option>EUR</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <>
                <div className="space-y-3">
                  {s4.portfolio.map((p, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <select
                        value={p.label}
                        onChange={(e) => { const arr = [...s4.portfolio]; arr[i].label = e.target.value; setS4({ portfolio: arr }); }}
                        className={`${SELECT_CLASS} w-32 shrink-0`}
                      >
                        {PORTFOLIO_LABELS.map((l) => <option key={l}>{l}</option>)}
                      </select>
                      <Input
                        placeholder="https://github.com/username"
                        value={p.url}
                        onChange={(e) => { const arr = [...s4.portfolio]; arr[i].url = e.target.value; setS4({ portfolio: arr }); }}
                      />
                      {s4.portfolio.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePortfolioRow(i)}
                          className="text-dim hover:text-destructive text-lg h-11 px-1 flex items-center transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {s4.portfolio.length < 5 && (
                  <button
                    type="button"
                    onClick={addPortfolioRow}
                    className="text-sm font-medium text-brand hover:opacity-80 transition-opacity"
                  >
                    + Добавить ссылку
                  </button>
                )}
                <p className="text-sm text-dim">Можно пропустить — добавите позже в профиле</p>
              </>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex justify-between pt-2">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)}>Назад</Button>
              ) : <div />}
              <Button onClick={handleNext} disabled={loading}>
                {step === 4 ? (loading ? "Сохраняем..." : "Сохранить профиль") : "Далее →"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
