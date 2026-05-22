"use client";

import { useState } from "react";
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
type Day = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

const GRADES: { value: Grade; label: string }[] = [
  { value: "INTERN", label: "Стажёр" },
  { value: "JUNIOR", label: "Junior" },
  { value: "MIDDLE", label: "Middle" },
  { value: "SENIOR", label: "Senior" },
  { value: "LEAD", label: "Lead" },
  { value: "PRINCIPAL", label: "Principal" },
];

const WORK_FORMATS: { value: WorkFormat; label: string; desc: string }[] = [
  { value: "REMOTE", label: "Удалённо", desc: "Полностью удалённо" },
  { value: "OFFICE", label: "Офис", desc: "Работа в офисе" },
  { value: "HYBRID", label: "Гибрид", desc: "Смешанный формат" },
];

const INDUSTRIES = ["IT", "Fintech", "EdTech", "E-commerce", "Media", "HealthTech", "Retail", "Другое"];
const SIZES = ["1–10", "11–50", "51–200", "200+"];
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

export default function EmployerOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [industry, setIndustry] = useState("IT");
  const [size, setSize] = useState("11–50");

  const [title, setTitle] = useState("");
  const [posDescription, setPosDescription] = useState("");
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

  function validateStep(): boolean {
    setError(null);
    if (step === 1) {
      if (!companyName.trim()) { setError("Введите название компании"); return false; }
      if (website && !website.startsWith("http")) { setError("Сайт должен начинаться с http:// или https://"); return false; }
    }
    if (step === 2) {
      if (!title.trim()) { setError("Введите название вакансии"); return false; }
      if (!posDescription.trim()) { setError("Добавьте описание вакансии"); return false; }
      if (skills.length === 0) { setError("Выберите хотя бы один навык"); return false; }
      if (!salaryMin || !salaryMax) { setError("Укажите зарплатную вилку"); return false; }
      if (Number(salaryMin) > Number(salaryMax)) { setError("Минимум не может быть больше максимума"); return false; }
      if (selectedDays.size === 0) { setError("Выберите хотя бы один день для собеседований"); return false; }
      if (startTime >= endTime) { setError("Начало рабочего времени должно быть раньше конца"); return false; }
    }
    return true;
  }

  async function handleNext() {
    if (!validateStep()) return;
    if (step === 1) { setStep(2); return; }
    await submit();
  }

  async function skipPosition() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/employer/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName.trim(), website: website.trim() || undefined, description: description.trim() || undefined, industry, size }),
      });
      if (!res.ok) { setError("Ошибка сохранения"); return; }
      router.push("/employer/dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const companyRes = await fetch("/api/employer/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName.trim(), website: website.trim() || undefined, description: description.trim() || undefined, industry, size }),
      });
      if (!companyRes.ok) { setError("Ошибка сохранения компании"); return; }

      const hrSlots = Array.from(selectedDays).map((day) => ({ dayOfWeek: day, startTime, endTime, maxPerDay }));
      const posRes = await fetch("/api/employer/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: posDescription.trim(), grade, workFormat, salaryMin: Number(salaryMin), salaryMax: Number(salaryMax), currency, requiredSkills: skills, hrSlots }),
      });
      if (!posRes.ok) { setError("Ошибка создания вакансии"); return; }

      router.push("/employer/dashboard");
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
          <div className="flex items-center">
            {["Компания", "Вакансия"].map((label, i) => (
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
                <span className={`text-sm font-medium hidden sm:block ${i + 1 === step ? "text-ink" : "text-dim"}`}>
                  {label}
                </span>
                {i < 1 && (
                  <div className={`w-24 sm:w-40 h-px mx-2 ${i + 1 < step ? "bg-cta" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Расскажите о компании</CardTitle>
              <CardDescription>Эта информация будет видна кандидатам в карточке приглашения</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-ink font-medium text-sm">Название компании</Label>
                <Input placeholder="ООО Рога и Копыта" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-ink font-medium text-sm">
                  Сайт <span className="text-dim font-normal">(необязательно)</span>
                </Label>
                <Input placeholder="https://company.ru" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-ink font-medium text-sm">Индустрия</Label>
                  <select value={industry} onChange={(e) => setIndustry(e.target.value)} className={SELECT_CLASS}>
                    {INDUSTRIES.map((ind) => <option key={ind}>{ind}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-ink font-medium text-sm">Размер команды</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SIZES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        className={`rounded-full border py-2 text-xs font-semibold transition-all ${
                          size === s
                            ? "border-brand bg-brand text-white"
                            : "border-border text-subtle hover:border-brand/50"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-ink font-medium text-sm">
                  О компании <span className="text-dim font-normal">(необязательно)</span>
                </Label>
                <Textarea
                  placeholder="Чем занимается компания, какой продукт или сервис..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="rounded-[10px] border-border focus-visible:border-brand focus-visible:ring-brand/15 resize-none text-ink placeholder:text-dim"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end pt-1">
                <Button onClick={handleNext}>Далее →</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Первая вакансия</CardTitle>
                <CardDescription>Опишите позицию — алгоритм подберёт подходящих кандидатов</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-ink font-medium text-sm">Название позиции</Label>
                  <Input placeholder="Senior Frontend Developer" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-ink font-medium text-sm">Описание</Label>
                  <Textarea
                    placeholder="Расскажите о задачах, стеке, проекте..."
                    value={posDescription}
                    onChange={(e) => setPosDescription(e.target.value)}
                    rows={4}
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

            <div className="flex justify-between pb-8">
              <Button variant="outline" onClick={() => { setError(null); setStep(1); }}>Назад</Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={skipPosition} disabled={loading}>
                  Пропустить
                </Button>
                <Button onClick={handleNext} disabled={loading}>
                  {loading ? "Сохраняем..." : "Готово →"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
