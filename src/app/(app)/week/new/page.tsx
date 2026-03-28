"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createWeek } from "@/lib/actions/week.actions";
import { getMondayOf, getWeekDays, formatDate, dayLabel } from "@/lib/utils/dates";
import { addWeeks } from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

export default function NewWeekPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultStart = searchParams.get("start") ?? formatDate(getMondayOf(new Date()));

  const [weekStart] = useState(defaultStart);
  const [nonSchoolDays, setNonSchoolDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const weekDays = getWeekDays(new Date(weekStart));

  function toggleDay(dateStr: string) {
    setNonSchoolDays(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    );
  }

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      await createWeek(weekStart, nonSchoolDays);
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-xl font-bold text-slate-800">New roster</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
        <p className="text-sm font-medium text-slate-600 mb-3">
          Mark any non-school days (public holidays, etc.)
        </p>
        <div className="grid grid-cols-5 gap-2">
          {weekDays.map(day => {
            const dateStr = formatDate(day);
            const isNonSchool = nonSchoolDays.includes(dateStr);
            return (
              <motion.button
                key={dateStr}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleDay(dateStr)}
                className={cn(
                  "py-3 rounded-xl text-sm font-medium border transition",
                  isNonSchool
                    ? "bg-slate-100 border-slate-200 text-slate-400 line-through"
                    : "bg-brand-50 border-brand-200 text-brand-700"
                )}
              >
                {dayLabel(day)}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="bg-amber-50 rounded-xl border border-amber-200 px-4 py-3 mb-6">
        <p className="text-sm text-amber-700">
          This creates <strong>{(5 - nonSchoolDays.length) * 4}</strong> run slots. You can assign drivers after creating.
        </p>
      </div>

      {error && (
        <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3 mb-4">{error}</p>
      )}

      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-4 rounded-2xl transition disabled:opacity-60 text-sm"
      >
        {loading ? "Creating…" : "Create roster"}
      </button>
    </div>
  );
}
