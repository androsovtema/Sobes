"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SKILL_GROUPS } from "@/lib/skills-data";

type Grade = "INTERN" | "JUNIOR" | "MIDDLE" | "SENIOR" | "LEAD" | "PRINCIPAL";
type WorkFormat = "REMOTE" | "OFFICE" | "HYBRID";
type Day = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

const GRADES: { value: Grade; label: string }[] = [
  { value: "INTERN", label: "Стажёр" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MIDDLE", label: "Middle" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead" },
  { value: "PRINCIPAL", label: "Principal" },
];

const WORK_FORMATS: { value: WorkFormat; label: string }[] = [
  { value: "REMOTE", label: "Удалённо" },
  { value: "OFFICE", label: "Офис" },
  { value: "HYBRID", label: "Гибрид" },
];

const DAYS: { value: Day; short: string }[] = [
  { value: "MON", short: "Пн" },
  { value: "TUE", short: "Вт" },
  { value: "WED", short: "Ср" },
  { value: "THU", short: "Чт" },
  { value: "FRI", short: "Пт" },
  { value: "SAT", short: "Сб" },
  { value: "SUN", short: "Вс" },
];

const TIMES = Array.from({ length: 25 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
const SELECT_CLASS = "w-full h-11 rounded-[10px] border border-border bg-white px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors";

export default function NewPositionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [grade, setGrade] = useState<Grade>("MIDDLE");
  const [workFormat, setWorkFormat] = useState<WorkFormat>("REMOTE");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [selectedDays, setSelectedDays] = useState<Set<Day>>(new Set(["MON", "TUE", "WED", "THU", "FRI"]));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");
  const [maxPerDay, setMaxPerDay] = useState(3);

  function toggleSkill(skill: string) {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]);
  }

  function toggleDay(day: Day) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  }

  async function handleSubmit() {
    setError(null);
    if (!title.trim()) { setError("Введите название вакансии"); return; }
    if (!description.trim()) { setError("Добавьте описание вакансии"); return; }
    if (skills.length === 0) { setError("Выберите хотя бы один навык"); return; }
    if (!salaryMin || !salaryMax) { setError("Укажите зарплатную вилку"); return; }
    if (Number(salaryMin) > Number(salaryMax)) { setError("Минимум не может быть больше максимума"); return; }
    if (selectedDays.size === 0) { setError("Выберите хотя бы один день для собеседований"); return; }
    if (startTime >= endTime) { setError("Начало должно быть раньше конца"); return; }

    setLoading(true);
    try {
      const hrSlots = Array.from(selectedDays).map((day) => ({ dayOfWeek: day, startTime, endTime, maxPerDay }));
      const res = await fetch("/api/employer/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), grade, workFormat, salaryMin: Number(salaryMin), salaryMax: Number(salaryMax), currency, requiredSkills: skills, hrSlots }),
      });
      if (!res.ok) { setError("Ошибка создания вакансии. Попробуйте ещё раз."); return; }
      router.push("/employer/dashboard");
    } finally {
      setLoading(false);
    }
  }

  const filteredGroups = skillSearch.trim()
    ? SKILL_GROUPS.map((g) => ({ ...g, skills: g.skills.filter((s) => s.toLowerCase().includes(skillSearch.toLowerCase())) })).filter((g) => g.skills.length > 0)
    : SKILL_GROUPS;

  return (
    <div className="min-h-screen bg-[#f4f6f2]">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-black/[0.08] px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="text-brand font-bold text-xl tracking-tight">Собес</div>
        <Link href="/employer/dashboard" className="text-sm font-medium text-subtle hover:text-ink transition-colors">
          ← Дашборд
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <h1 className="text-[24px] font-bold text-ink tracking-tight">Новая вакансия</h1>

        <Card>
          <CardHeader>
            <CardTitle>Описание позиции</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-ink font-medium text-sm">Название позиции</Label>
              <Input placeholder="Senior Frontend Developer" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-ink font-medium text-sm">Описание</Label>
              <Textarea
                placeholder="Задачи, стек, продукт, команда..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="rounded-[10px] border-border focus-visible:border-brand focus-visible:ring-brand/15 resize-none text-ink placeholder:text-dim"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-ink font-medium text-sm">Грейд</Label>
                <div className="grid grid-cols-3 gap-2">
                  {GRADES.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGrade(g.value)}
                      className={`rounded-full border py-2 text-xs font-semibold transition-all ${
                        grade === g.value
                          ? "border-brand bg-brand text-white"
                          : "border-border text-subtle hover:border-brand/50"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-ink font-medium text-sm">Формат</Label>
                <div className="space-y-2">
                  {WORK_FORMATS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setWorkFormat(f.value)}
                      className={`w-full rounded-2xl border-2 px-3 py-2.5 text-left transition-all ${
                        workFormat === f.value
                          ? "border-brand bg-brand text-white"
                          : "border-border hover:border-brand/40"
                      }`}
                    >
                      <span className={`text-sm font-semibold ${workFormat === f.value ? "text-white" : "text-ink"}`}>
                        {f.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-ink font-medium text-sm">Зарплатная вилка</Label>
              <div className="flex items-center gap-3">
                <Input type="number" placeholder="100 000" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
                <span className="text-dim font-medium">—</span>
                <Input type="number" placeholder="180 000" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
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
            <CardTitle>Требуемые навыки</CardTitle>
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
            <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
              {filteredGroups.map((group) => (
                <div key={group.category}>
                  <p className="text-[11px] font-semibold text-dim uppercase tracking-wider mb-2">{group.category}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.skills.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`rounded-full px-3 py-1.5 text-sm border font-medium transition-all ${
                          skills.includes(s)
                            ? "border-brand bg-brand text-white"
                            : "border-border text-subtle hover:border-brand/50 hover:text-ink bg-white"
                        }`}
                      >
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
            <CardTitle>Доступность HR</CardTitle>
            <CardDescription>Когда вы готовы проводить собеседования</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="mb-3 block text-ink font-medium text-sm">Дни недели</Label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`rounded-full py-3 text-sm font-semibold transition-all ${
                      selectedDays.has(d.value)
                        ? "bg-brand text-white shadow-[0_2px_8px_rgba(18,44,0,0.2)]"
                        : "bg-surface text-subtle hover:bg-surface/80"
                    }`}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-ink font-medium text-sm">С</Label>
                <select value={startTime} onChange={(e) => setStartTime(e.target.value)} className={SELECT_CLASS}>
                  {TIMES.slice(0, -1).map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <span className="text-dim pt-7 font-medium">—</span>
              <div className="flex-1 space-y-2">
                <Label className="text-ink font-medium text-sm">До</Label>
                <select value={endTime} onChange={(e) => setEndTime(e.target.value)} className={SELECT_CLASS}>
                  {TIMES.slice(1).map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-ink font-medium text-sm">Максимум собеседований в день</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMaxPerDay(n)}
                    className={`w-11 h-11 rounded-full border text-sm font-semibold transition-all ${
                      maxPerDay === n
                        ? "border-brand bg-brand text-white"
                        : "border-border text-subtle hover:border-brand/50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-3 pb-8">
          <Link href="/employer/dashboard">
            <Button variant="outline">Отменить</Button>
          </Link>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Создаём..." : "Опубликовать вакансию"}
          </Button>
        </div>
      </main>
    </div>
  );
}
