"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, AlertCircle, Copy } from "lucide-react";
import { addWeeks, subWeeks, parseISO } from "date-fns";
import { copyLastWeek } from "@/lib/actions/week.actions";
import { formatWeekLabel, formatDate, getMondayOf, getWeekDays, dayLabel, isToday } from "@/lib/utils/dates";
import { SLOT_LABELS } from "@/lib/utils/slots";
import RunSlotCard from "./RunSlotCard";
import { cn } from "@/lib/utils";
import type { Profile, RunSlot, Child } from "@/types/database";
import { useRouter } from "next/navigation";

interface Props {
  week: any;
  weekStart: string;
  currentProfile: Profile | null;
  allProfiles: Pick<Profile, "id" | "full_name" | "role" | "avatar_url">[];
  allChildren: Child[];
}

export default function WeekView({ week, weekStart, currentProfile, allProfiles, allChildren }: Props) {
  const router = useRouter();
  const [currentWeekStart, setCurrentWeekStart] = useState(parseISO(weekStart));
  const [copying, setCopying] = useState(false);
  const isAdmin = currentProfile?.role === "admin";

  const weekDays = getWeekDays(currentWeekStart);

  const allRuns = week?.run_days?.flatMap((d: any) => d.runs) ?? [];
  const openCount = allRuns.filter((r: any) => r.status === "open").length;
  const totalSlots = allRuns.length;

  // Coverage per school
  const schoolACoverage = { assigned: allRuns.filter((r: any) => ["a_dropoff","a_pickup"].includes(r.slot) && r.status !== "open" && r.status !== "cancelled").length, total: allRuns.filter((r: any) => ["a_dropoff","a_pickup"].includes(r.slot)).length };
  const schoolBCoverage = { assigned: allRuns.filter((r: any) => ["b_dropoff","b_pickup"].includes(r.slot) && r.status !== "open" && r.status !== "cancelled").length, total: allRuns.filter((r: any) => ["b_dropoff","b_pickup"].includes(r.slot)).length };

  async function handleCopyLastWeek() {
    setCopying(true);
    try {
      await copyLastWeek(formatDate(currentWeekStart));
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCopying(false);
    }
  }

  function goToPrevWeek() {
    const prev = subWeeks(currentWeekStart, 1);
    setCurrentWeekStart(prev);
    router.push(`/week?start=${formatDate(prev)}`);
  }

  function goToNextWeek() {
    const next = addWeeks(currentWeekStart, 1);
    setCurrentWeekStart(next);
    router.push(`/week?start=${formatDate(next)}`);
  }

  const runsByDayAndSlot: Record<string, Record<RunSlot, any>> = {};
  if (week?.run_days) {
    for (const day of week.run_days) {
      runsByDayAndSlot[day.run_date] = {} as Record<RunSlot, any>;
      for (const run of day.runs) {
        runsByDayAndSlot[day.run_date][run.slot as RunSlot] = run;
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goToPrevWeek}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-500"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <h1 className="text-base font-semibold text-slate-800">
              {formatWeekLabel(currentWeekStart)}
            </h1>
            {openCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-1 mt-0.5"
              >
                <AlertCircle className="w-3 h-3 text-amber-500" />
                <span className="text-xs text-amber-600 font-medium">{openCount} unassigned</span>
              </motion.div>
            )}
          </div>

          <button
            onClick={goToNextWeek}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition text-slate-500"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Admin toolbar: copy last week */}
        {isAdmin && week && (
          <div className="flex items-center justify-between mb-2">
            {/* Coverage bar */}
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className={cn(schoolACoverage.assigned === schoolACoverage.total ? "text-violet-600" : "text-amber-600")}>
                Redeemer {schoolACoverage.assigned}/{schoolACoverage.total}
              </span>
              <span className="text-slate-300">·</span>
              <span className={cn(schoolBCoverage.assigned === schoolBCoverage.total ? "text-emerald-600" : "text-amber-600")}>
                Trinity {schoolBCoverage.assigned}/{schoolBCoverage.total}
              </span>
            </div>
            <button
              onClick={handleCopyLastWeek}
              disabled={copying}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              <Copy className="w-3 h-3" />
              {copying ? "Copying…" : "Copy last week"}
            </button>
          </div>
        )}

        {/* Day headers */}
        <div className="grid grid-cols-5 gap-1">
          {weekDays.map(day => (
            <div
              key={day.toISOString()}
              className={cn(
                "text-center py-1.5 rounded-lg text-xs font-medium",
                isToday(day)
                  ? "bg-brand-600 text-white"
                  : "text-slate-500"
              )}
            >
              {dayLabel(day)}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {!week ? (
          <EmptyWeek isAdmin={isAdmin} weekStart={formatDate(currentWeekStart)} />
        ) : (
          <>
            {/* Redeemer section */}
            <SchoolSection
              school="A"
              slots={["a_dropoff", "a_pickup"] as const}
              weekDays={weekDays}
              week={week}
              runsByDayAndSlot={runsByDayAndSlot}
              isAdmin={isAdmin}
              currentProfileId={currentProfile?.id}
              allProfiles={allProfiles}
              allChildren={allChildren}
            />
            {/* Trinity section */}
            <SchoolSection
              school="B"
              slots={["b_dropoff", "b_pickup"] as const}
              weekDays={weekDays}
              week={week}
              runsByDayAndSlot={runsByDayAndSlot}
              isAdmin={isAdmin}
              currentProfileId={currentProfile?.id}
              allProfiles={allProfiles}
              allChildren={allChildren}
            />
          </>
        )}
      </div>
    </div>
  );
}

const SCHOOL_CONFIG = {
  A: {
    name: "Redeemer",
    gradient: "from-violet-500 to-violet-700",
    border: "border-violet-100",
  },
  B: {
    name: "Trinity",
    gradient: "from-emerald-500 to-emerald-700",
    border: "border-emerald-100",
  },
} as const;

function SchoolSection({
  school, slots, weekDays, week, runsByDayAndSlot,
  isAdmin, currentProfileId, allProfiles, allChildren,
}: {
  school: "A" | "B";
  slots: readonly RunSlot[];
  weekDays: Date[];
  week: any;
  runsByDayAndSlot: Record<string, Record<RunSlot, any>>;
  isAdmin: boolean;
  currentProfileId: string | undefined;
  allProfiles: Pick<Profile, "id" | "full_name" | "role" | "avatar_url">[];
  allChildren: Child[];
}) {
  const s = SCHOOL_CONFIG[school];
  return (
    <div className={cn("rounded-2xl overflow-hidden border", s.border)}>
      {/* School header */}
      <div className={cn("bg-gradient-to-r px-3 py-2.5 flex items-center", s.gradient)}>
        <span className="text-xs font-black uppercase tracking-widest text-white">{s.name}</span>
      </div>
      {/* Slots */}
      <div className="bg-white px-2 pb-2 pt-1.5 space-y-2">
        {slots.map(slot => (
          <div key={slot}>
            <div className="flex items-center gap-1.5 mb-1 px-0.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                {SLOT_LABELS[slot].type === "drop" ? "Drop-off" : "Pick-up"}
              </span>
              <span className="text-[10px] text-slate-300">{SLOT_LABELS[slot].time}</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {weekDays.map(day => {
                const dateStr = formatDate(day);
                const run = runsByDayAndSlot[dateStr]?.[slot];
                const dayData = week.run_days?.find((d: any) => d.run_date === dateStr);
                return (
                  <RunSlotCard
                    key={dateStr}
                    run={run}
                    slot={slot}
                    isSchoolDay={dayData?.is_school_day ?? true}
                    isAdmin={isAdmin}
                    currentProfileId={currentProfileId}
                    allProfiles={allProfiles}
                    allChildren={allChildren}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyWeek({ isAdmin, weekStart }: { isAdmin: boolean; weekStart: string }) {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <CalendarIcon className="w-7 h-7 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">No roster yet</h3>
      <p className="text-sm text-slate-400 mb-6">
        {isAdmin ? "Create this week's roster to get started." : "Check back soon — the roster hasn't been published yet."}
      </p>
      {isAdmin && (
        <button
          onClick={() => router.push(`/week/new?start=${weekStart}`)}
          className="flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-5 py-3 rounded-xl hover:bg-brand-700 transition"
        >
          <Plus className="w-4 h-4" />
          Create roster
        </button>
      )}
    </motion.div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}
