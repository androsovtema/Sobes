"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SKILL_GROUPS } from "@/lib/skills-data";
import { YandexCalendarConnect } from "@/components/yandex-calendar-connect";

type Grade = "INTERN" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD" | "PRINCIPAL";
type WorkFormat = "REMOTE" | "OFFICE" | "HYBRID";

type ProfileData = {
  firstName: string;
  lastName: string;
  headline: string;
  bio: string;
  yearsExp: number;
  grade: Grade;
  workFormat: WorkFormat;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  skills: string[];
  portfolio: { label: string; url: string }[];
};

const GRADES: { value: Grade; label: string }[] = [
  { value: "INTERN", label: "Стажёр" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MIDDLE", label: "Middle" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead" },
  { value: "PRINCIPAL", label: "Principal" },
];

const GRADE_LABELS: Record<Grade, string> = {
  INTERN: "Стажёр",
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
  LEAD: "Lead",
  PRINCIPAL: "Principal",
};

const WORK_FORMATS: { value: WorkFormat; label: string; desc: string }[] = [
  { value: "REMOTE", label: "Удалённо", desc: "Работаю из любого места" },
  { value: "OFFICE", label: "Офис", desc: "Готов приходить в офис" },
  { value: "HYBRID", label: "Гибрид", desc: "Часть офис, часть дома" },
];

const WORK_FORMAT_LABELS: Record<WorkFormat, string> = {
  REMOTE: "Удалённо",
  OFFICE: "Офис",
  HYBRID: "Гибрид",
};

const PORTFOLIO_LABELS = ["GitHub", "GitLab", "Behance", "Dribbble", "LinkedIn", "Личный сайт", "Портфолио", "Другое"];

export default function ProfileClient({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Edit state — инициализируется из текущего профиля
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [headline, setHeadline] = useState(profile.headline);
  const [bio, setBio] = useState(profile.bio);
  const [yearsExp, setYearsExp] = useState(String(profile.yearsExp));
  const [grade, setGrade] = useState<Grade>(profile.grade);
  const [workFormat, setWorkFormat] = useState<WorkFormat>(profile.workFormat);
  const [salaryMin, setSalaryMin] = useState(String(profile.salaryMin));
  const [salaryMax, setSalaryMax] = useState(String(profile.salaryMax));
  const [currency, setCurrency] = useState(profile.currency);
  const [skills, setSkills] = useState<string[]>(profile.skills);
  const [portfolio, setPortfolio] = useState(
    profile.portfolio.length > 0 ? profile.portfolio : [{ label: "GitHub", url: "" }]
  );
  const [skillSearch, setSkillSearch] = useState("");

  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function cancelEdit() {
    // сбрасываем к исходным данным
    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setHeadline(profile.headline);
    setBio(profile.bio);
    setYearsExp(String(profile.yearsExp));
    setGrade(profile.grade);
    setWorkFormat(profile.workFormat);
    setSalaryMin(String(profile.salaryMin));
    setSalaryMax(String(profile.salaryMax));
    setCurrency(profile.currency);
    setSkills(profile.skills);
    setPortfolio(profile.portfolio.length > 0 ? profile.portfolio : [{ label: "GitHub", url: "" }]);
    setSkillSearch("");
    setError(null);
    setIsEditing(false);
  }

  function validate(): boolean {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) { setError("Введите имя и фамилию"); return false; }
    if (!headline.trim()) { setError("Укажите специализацию"); return false; }
    if (!yearsExp || isNaN(Number(yearsExp))) { setError("Укажите опыт в годах"); return false; }
    if (skills.length === 0) { setError("Выберите хотя бы один навык"); return false; }
    if (!salaryMin || !salaryMax) { setError("Укажите зарплатную вилку"); return false; }
    if (Number(salaryMin) > Number(salaryMax)) { setError("Минимум не может быть больше максимума"); return false; }
    for (const p of portfolio) {
      if (p.url && !p.url.startsWith("http")) { setError("Ссылки должны начинаться с http:// или https://"); return false; }
    }
    return true;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    setSuccess(false);
    try {
      const res = await fetch("/api/candidate/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          headline: headline.trim(),
          bio: bio.trim() || undefined,
          yearsExp: Number(yearsExp),
          grade,
          workFormat,
          salaryMin: Number(salaryMin),
          salaryMax: Number(salaryMax),
          currency,
          skills,
          portfolio: portfolio.filter((p) => p.url.trim()),
        }),
      });
      if (!res.ok) { setError("Ошибка сохранения. Попробуйте ещё раз."); return; }
      setSuccess(true);
      setIsEditing(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const filteredGroups = skillSearch.trim()
    ? SKILL_GROUPS.map((g) => ({
        ...g,
        skills: g.skills.filter((s) => s.toLowerCase().includes(skillSearch.toLowerCase())),
      })).filter((g) => g.skills.length > 0)
    : SKILL_GROUPS;

  const SELECT_CLASS = "h-11 rounded-[10px] border border-border bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors";

  return (
    <div className="min-h-screen bg-[#f4f6f2]">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-black/[0.08] px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="text-brand font-bold text-xl tracking-tight">Собес</div>
        <div className="flex items-center gap-4 sm:gap-5">
          <Link href="/candidate/dashboard" className="text-sm font-medium text-subtle hover:text-ink transition-colors">Дашборд</Link>
          <Link href="/candidate/availability" className="text-sm font-medium text-subtle hover:text-ink transition-colors">Слоты</Link>
          <form action={logout}>
            <button type="submit" className="text-sm text-dim hover:text-subtle transition-colors">Выйти</button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 pt-2">
          <h1 className="text-[24px] font-bold text-ink tracking-tight">Мой профиль</h1>
          {!isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>Редактировать</Button>
          )}
        </div>

        {success && !isEditing && (
          <div className="mb-5 rounded-2xl bg-cta/10 border border-cta/30 px-5 py-3 text-sm font-medium text-brand">
            Профиль успешно обновлён
          </div>
        )}

        <div className="mb-5">
          <YandexCalendarConnect returnTo="/candidate/profile" />
        </div>

        {!isEditing ? (
          <div className="space-y-4">
            <Card>
              <CardContent className="py-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[20px] font-bold text-ink">{profile.firstName} {profile.lastName}</h2>
                    <p className="text-subtle mt-0.5">{profile.headline}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 mt-1">{GRADE_LABELS[profile.grade]}</Badge>
                </div>
                {profile.bio && <p className="text-sm text-subtle leading-relaxed">{profile.bio}</p>}
                <div className="flex flex-wrap items-center gap-3 text-sm text-dim">
                  <span>Опыт: <span className="text-subtle font-medium">{profile.yearsExp} {pluralYears(profile.yearsExp)}</span></span>
                  <span>·</span>
                  <span className="text-subtle font-medium">{WORK_FORMAT_LABELS[profile.workFormat]}</span>
                  <span>·</span>
                  <span className="text-subtle font-medium">{profile.salaryMin.toLocaleString("ru-RU")} — {profile.salaryMax.toLocaleString("ru-RU")} {profile.currency}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Навыки</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((s) => (
                    <Badge key={s} variant="secondary">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {profile.portfolio.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Портфолио</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {profile.portfolio.map((p, i) => (
                    <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm group">
                      <span className="text-xs bg-surface text-subtle rounded-full px-2.5 py-0.5 font-medium">{p.label}</span>
                      <span className="text-dim group-hover:text-brand truncate transition-colors">{p.url}</span>
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Основное</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-ink font-medium text-sm">Имя</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Иван" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-ink font-medium text-sm">Фамилия</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Иванов" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-ink font-medium text-sm">Специализация</Label>
                  <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Senior React Developer" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-ink font-medium text-sm">Опыт (лет)</Label>
                    <Input type="number" min={0} max={50} value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-ink font-medium text-sm">Грейд</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {GRADES.map((g) => (
                        <button key={g.value} type="button" onClick={() => setGrade(g.value)}
                          className={`rounded-full border py-2 text-xs font-semibold transition-all ${grade === g.value ? "border-brand bg-brand text-white" : "border-border text-subtle hover:border-brand/50"}`}>
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
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Коротко о своём опыте и подходе к работе..."
                    className="rounded-[10px] border-border focus-visible:border-brand focus-visible:ring-brand/15 resize-none text-ink placeholder:text-dim" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Навыки</CardTitle>
                <CardDescription>Выбрано: {skills.length}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Поиск навыка..." value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} />
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-4 bg-surface/50 rounded-2xl">
                    {skills.map((s) => (
                      <Badge key={s} variant="default" className="cursor-pointer hover:opacity-80" onClick={() => toggleSkill(s)}>
                        {s} ✕
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                  {filteredGroups.map((group) => (
                    <div key={group.category}>
                      <p className="text-[11px] font-semibold text-dim uppercase tracking-wider mb-2">{group.category}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.skills.map((s) => (
                          <button key={s} type="button" onClick={() => toggleSkill(s)}
                            className={`rounded-full px-3 py-1.5 text-sm border font-medium transition-all ${skills.includes(s) ? "border-brand bg-brand text-white" : "border-border text-subtle hover:border-brand/50 hover:text-ink bg-white"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Условия работы</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-ink font-medium text-sm">Формат</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {WORK_FORMATS.map((f) => (
                      <button key={f.value} type="button" onClick={() => setWorkFormat(f.value)}
                        className={`rounded-2xl border-2 p-3.5 text-left transition-all ${workFormat === f.value ? "border-brand bg-brand text-white" : "border-border hover:border-brand/40"}`}>
                        <div className={`font-semibold text-sm ${workFormat === f.value ? "text-white" : "text-ink"}`}>{f.label}</div>
                        <div className={`text-xs mt-0.5 ${workFormat === f.value ? "text-white/70" : "text-dim"}`}>{f.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-ink font-medium text-sm">Зарплатная вилка</Label>
                  <div className="flex items-center gap-3">
                    <Input type="number" placeholder="100 000" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
                    <span className="text-dim font-medium">—</span>
                    <Input type="number" placeholder="150 000" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-11 w-20 shrink-0 rounded-[10px] border border-border bg-white px-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors">
                      <option>RUB</option>
                      <option>USD</option>
                      <option>EUR</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Портфолио</CardTitle>
                <CardDescription>Ссылки на ваши работы</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {portfolio.map((p, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <select value={p.label}
                      onChange={(e) => { const arr = [...portfolio]; arr[i] = { ...arr[i], label: e.target.value }; setPortfolio(arr); }}
                      className={`${SELECT_CLASS} w-32 shrink-0`}>
                      {PORTFOLIO_LABELS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                    <Input placeholder="https://github.com/username" value={p.url}
                      onChange={(e) => { const arr = [...portfolio]; arr[i] = { ...arr[i], url: e.target.value }; setPortfolio(arr); }} />
                    {portfolio.length > 1 && (
                      <button type="button"
                        onClick={() => setPortfolio(portfolio.filter((_, idx) => idx !== i))}
                        className="text-dim hover:text-destructive text-lg h-11 px-1 flex items-center transition-colors">✕</button>
                    )}
                  </div>
                ))}
                {portfolio.length < 5 && (
                  <button type="button"
                    onClick={() => setPortfolio([...portfolio, { label: "Другое", url: "" }])}
                    className="text-sm font-medium text-brand hover:opacity-80 transition-opacity">
                    + Добавить ссылку
                  </button>
                )}
              </CardContent>
            </Card>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 justify-end pb-4">
              <Button variant="outline" onClick={cancelEdit} disabled={loading}>Отменить</Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Сохраняем..." : "Сохранить изменения"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function pluralYears(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "лет";
  if (mod10 === 1) return "год";
  if (mod10 >= 2 && mod10 <= 4) return "года";
  return "лет";
}
