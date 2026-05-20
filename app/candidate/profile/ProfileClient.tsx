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

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="font-bold text-lg">Собес</div>
        <div className="flex items-center gap-4">
          <Link href="/candidate/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">Дашборд</Link>
          <Link href="/candidate/availability" className="text-sm text-zinc-500 hover:text-zinc-900">Мои слоты</Link>
          <form action={logout}>
            <button type="submit" className="text-sm text-zinc-400 hover:text-zinc-600">Выйти</button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Мой профиль</h1>
          {!isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>Редактировать</Button>
          )}
        </div>

        {success && !isEditing && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Профиль успешно обновлён
          </div>
        )}

        <div className="mb-4">
          <YandexCalendarConnect returnTo="/candidate/profile" />
        </div>

        {!isEditing ? (
          /* ── Режим просмотра ── */
          <div className="space-y-4">
            <Card>
              <CardContent className="py-5 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{profile.firstName} {profile.lastName}</h2>
                    <p className="text-zinc-500 mt-0.5">{profile.headline}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 mt-1">{GRADE_LABELS[profile.grade]}</Badge>
                </div>
                {profile.bio && <p className="text-sm text-zinc-600">{profile.bio}</p>}
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  <span>Опыт: {profile.yearsExp} {pluralYears(profile.yearsExp)}</span>
                  <span>·</span>
                  <span>{WORK_FORMAT_LABELS[profile.workFormat]}</span>
                  <span>·</span>
                  <span>{profile.salaryMin.toLocaleString("ru-RU")} — {profile.salaryMax.toLocaleString("ru-RU")} {profile.currency}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Навыки</CardTitle>
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
                  <CardTitle className="text-base">Портфолио</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {profile.portfolio.map((p, i) => (
                    <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-zinc-700 hover:text-zinc-900 group">
                      <span className="text-xs bg-zinc-100 rounded px-2 py-0.5 font-medium">{p.label}</span>
                      <span className="text-zinc-400 group-hover:text-zinc-600 truncate">{p.url}</span>
                    </a>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* ── Режим редактирования ── */
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Основное</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Имя</Label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Иван" />
                  </div>
                  <div className="space-y-2">
                    <Label>Фамилия</Label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Иванов" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Специализация</Label>
                  <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Senior React Developer" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Опыт (лет)</Label>
                    <Input type="number" min={0} max={50} value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Грейд</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {GRADES.map((g) => (
                        <button key={g.value} type="button" onClick={() => setGrade(g.value)}
                          className={`rounded-lg border py-1.5 text-xs font-medium transition-colors ${grade === g.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-400"}`}>
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>О себе <span className="text-zinc-400 font-normal">(необязательно)</span></Label>
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Коротко о своём опыте и подходе к работе..." />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Навыки</CardTitle>
                <CardDescription>Выбрано: {skills.length}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Поиск навыка..." value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} />
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 rounded-lg">
                    {skills.map((s) => (
                      <Badge key={s} variant="default" className="cursor-pointer bg-zinc-900 hover:bg-zinc-700" onClick={() => toggleSkill(s)}>
                        {s} ✕
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                  {filteredGroups.map((group) => (
                    <div key={group.category}>
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">{group.category}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.skills.map((s) => (
                          <button key={s} type="button" onClick={() => toggleSkill(s)}
                            className={`rounded-full px-3 py-1 text-sm border transition-colors ${skills.includes(s) ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-400 bg-white"}`}>
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
                <CardTitle className="text-base">Условия работы</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Формат</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {WORK_FORMATS.map((f) => (
                      <button key={f.value} type="button" onClick={() => setWorkFormat(f.value)}
                        className={`rounded-lg border-2 p-3 text-left transition-colors ${workFormat === f.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-400"}`}>
                        <div className="font-semibold text-sm">{f.label}</div>
                        <div className={`text-xs mt-0.5 ${workFormat === f.value ? "text-zinc-300" : "text-zinc-500"}`}>{f.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Зарплатная вилка</Label>
                  <div className="flex items-center gap-3">
                    <Input type="number" placeholder="100 000" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
                    <span className="text-zinc-400">—</span>
                    <Input type="number" placeholder="150 000" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                      className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900">
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
                <CardTitle className="text-base">Портфолио</CardTitle>
                <CardDescription>Ссылки на ваши работы</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {portfolio.map((p, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <select value={p.label}
                      onChange={(e) => { const arr = [...portfolio]; arr[i] = { ...arr[i], label: e.target.value }; setPortfolio(arr); }}
                      className="h-10 w-32 rounded-md border border-zinc-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 shrink-0">
                      {PORTFOLIO_LABELS.map((l) => <option key={l}>{l}</option>)}
                    </select>
                    <Input placeholder="https://github.com/username" value={p.url}
                      onChange={(e) => { const arr = [...portfolio]; arr[i] = { ...arr[i], url: e.target.value }; setPortfolio(arr); }} />
                    {portfolio.length > 1 && (
                      <button type="button"
                        onClick={() => setPortfolio(portfolio.filter((_, idx) => idx !== i))}
                        className="text-zinc-400 hover:text-red-500 text-lg leading-10 px-1">✕</button>
                    )}
                  </div>
                ))}
                {portfolio.length < 5 && (
                  <button type="button"
                    onClick={() => setPortfolio([...portfolio, { label: "Другое", url: "" }])}
                    className="text-sm text-zinc-500 hover:text-zinc-900 underline">
                    + Добавить ссылку
                  </button>
                )}
              </CardContent>
            </Card>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 justify-end">
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
