"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type Day = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
type Slot = { dayOfWeek: Day; startTime: string; endTime: string; maxPerDay: number };

const DAYS: { value: Day; label: string; short: string }[] = [
  { value: "MON", label: "Понедельник", short: "Пн" },
  { value: "TUE", label: "Вторник", short: "Вт" },
  { value: "WED", label: "Среда", short: "Ср" },
  { value: "THU", label: "Четверг", short: "Чт" },
  { value: "FRI", label: "Пятница", short: "Пт" },
  { value: "SAT", label: "Суббота", short: "Сб" },
  { value: "SUN", label: "Воскресенье", short: "Вс" },
];

const TIMES = Array.from({ length: 25 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

export default function CandidateAvailability() {
  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState<Set<Day>>(new Set(["MON", "TUE", "WED", "THU", "FRI"]));
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");
  const [maxPerDay, setMaxPerDay] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: Day) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    if (selectedDays.size === 0) { setError("Выберите хотя бы один день"); return; }
    if (startTime >= endTime) { setError("Начало должно быть раньше конца"); return; }

    setLoading(true);
    const slots: Slot[] = Array.from(selectedDays).map((day) => ({
      dayOfWeek: day,
      startTime,
      endTime,
      maxPerDay,
    }));

    try {
      const res = await fetch("/api/candidate/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots }),
      });
      if (!res.ok) { setError("Ошибка сохранения"); return; }
      router.push("/candidate/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Когда вам удобно?</h1>
          <p className="text-zinc-500 mt-1">Укажите, в какие дни и часы вы готовы проходить собеседования</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Дни недели</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((d) => (
                <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                  className={`rounded-lg py-3 text-sm font-medium transition-colors ${selectedDays.has(d.value) ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>
                  {d.short}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Временной промежуток</CardTitle>
            <CardDescription>Единый промежуток для всех выбранных дней</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}

        <div className="flex flex-col gap-3">
          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Сохраняем..." : "Готово — перейти в личный кабинет"}
          </Button>
          <button type="button" onClick={() => router.push("/candidate/dashboard")}
            className="text-sm text-zinc-400 hover:text-zinc-600 text-center">
            Пропустить — настрою позже
          </button>
        </div>
      </div>
    </div>
  );
}
