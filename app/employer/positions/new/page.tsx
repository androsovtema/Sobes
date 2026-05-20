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
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
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
      const hrSlots = Array.from(selectedDays).map((day) => ({
        dayOfWeek: day,
        startTime,
        endTime,
        maxPerDay,
      }));

      const res = await fetch("/api/employer/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          grade,
          workFormat,
          salaryMin: Number(salaryMin),
          salaryMax: Number(salaryMax),
          currency,
          requiredSkills: skills,
          hrSlots,
        }),
      });
      if (!res.ok) { setError("Ошибка создания вакансии. Попробуйте ещё раз."); return; }
      router.push("/employer/dashboard");
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
        <Link href="/employer/dashboard" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Дашборд
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <h1 className="text-2xl font-bold">Новая вакансия</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Описание позиции</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Название позиции</Label>
              <Input placeholder="Senior Frontend Developer" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea placeholder="Задачи, стек, продукт, команда..." value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <Label>Формат</Label>
                <div className="space-y-2">
                  {WORK_FORMATS.map((f) => (
                    <button key={f.value} type="button" onClick={() => setWorkFormat(f.value)}
                      className={`w-full rounded-lg border-2 px-3 py-2 text-left text-sm font-semibold transition-colors ${workFormat === f.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-400"}`}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Зарплатная вилка</Label>
              <div className="flex items-center gap-3">
                <Input type="number" placeholder="100 000" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
                <span className="text-zinc-400">—</span>
                <Input type="number" placeholder="180 000" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
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
            <CardTitle className="text-base">Требуемые навыки</CardTitle>
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
            <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
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
            <CardTitle className="text-base">Доступность HR</CardTitle>
            <CardDescription>Когда вы готовы проводить собеседования</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">Дни недели</Label>
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((d) => (
                  <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                    className={`rounded-lg py-3 text-sm font-medium transition-colors ${selectedDays.has(d.value) ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>
                    {d.short}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label>С</Label>
                <select value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900">
                  {TIMES.slice(0, -1).map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <span className="text-zinc-400 pt-6">—</span>
              <div className="flex-1 space-y-2">
                <Label>До</Label>
                <select value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900">
                  {TIMES.slice(1).map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Максимум собеседований в день</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setMaxPerDay(n)}
                    className={`w-12 h-10 rounded-lg border text-sm font-medium transition-colors ${maxPerDay === n ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-400"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-500">{error}</p>}

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
