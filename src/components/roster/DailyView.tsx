"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  format, parseISO, isWeekend, isToday, isTomorrow, isYesterday,
  addWeeks, subWeeks, startOfWeek, addDays, isSameDay,
} from "date-fns";
import { AlertCircle, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import type { Profile, Child, Run, RunSlot } from "@/types/database";
import { SLOT_LABELS } from "@/lib/utils/slots";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils/dates";
import AssignDriverSheet from "./AssignDriverSheet";

interface RunWithDetails extends Run {
  driver: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
  run_children: { child_id: string; children: Child | null }[];
}

interface Props {
  runDay: any;
  selectedDate: string;
  today: string;
  currentProfile: Profile | null;
  allChildren: Child[];
  allProfiles: Pick<Profile, "id" | "full_name" | "role" | "avatar_url">[];
}

const SCHOOL = {
  A: {
    name:      "Redeemer",
    gradient:  "from-violet-500 to-violet-700",
    pillDark:  "bg-violet-600 text-white",
    kidColor:  "bg-violet-500",
    ringColor: "ring-violet-300",
  },
  B: {
    name:      "Trinity",
    gradient:  "from-emerald-500 to-emerald-700",
    pillDark:  "bg-emerald-600 text-white",
    kidColor:  "bg-emerald-500",
    ringColor: "ring-emerald-300",
  },
};

const STATUS_PILL: Record<string, { label: string; classes: string }> = {
  open:      { label: "Unassigned", classes: "bg-amber-100 text-amber-700" },
  assigned:  { label: "Scheduled",  classes: "bg-slate-100 text-slate-500" },
  confirmed: { label: "Confirmed",  classes: "bg-brand-100 text-brand-700" },
  cancelled: { label: "Cancelled",  classes: "bg-red-100 text-red-600" },
};

function relLabel(dateStr: string) {
  const d = parseISO(dateStr);
  if (isToday(d))     return "Today";
  if (isTomorrow(d))  return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE");  // "Monday", "Tuesday" etc — date shown in subtitle
}

export default function DailyView({ runDay, selectedDate, today, currentProfile, allChildren, allProfiles }: Props) {
  const router = useRouter();
  const [activeRun, setActiveRun] = useState<RunWithDetails | null>(null);
  const isAdmin = currentProfile?.role === "admin";

  const date    = parseISO(selectedDate);
  const weekMon = startOfWeek(date, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(weekMon, i));

  const runs: RunWithDetails[] = runDay?.runs ?? [];
  const bySlot    = Object.fromEntries(runs.map(r => [r.slot, r]));
  const myRuns    = runs.filter(r => r.driver?.id === currentProfile?.id);
  const openCount = runs.filter(r => r.status === "open").length;

  function goToDay(d: Date) { router.push(`/dashboard?date=${formatDate(d)}`); }

  return (
    <div className="flex flex-col min-h-full bg-slate-50">

      {/* ── Header ── */}
      <div className="bg-white px-5 pt-6 pb-0 border-b border-slate-100">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
              {relLabel(selectedDate)}
            </h1>
            <p className="text-xs font-medium text-slate-400 mt-1.5 tracking-wide">
              {format(date, "d MMMM yyyy")}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5 mt-1">
            {myRuns.length > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 text-xs font-bold text-white bg-brand-600 px-3 py-1.5 rounded-full shadow-sm shadow-brand-200"
              >
                <CheckCircle2 className="w-3 h-3" />
                {myRuns.length} run{myRuns.length !== 1 ? "s" : ""} yours
              </motion.span>
            )}
            {openCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                <AlertCircle className="w-3 h-3" />
                {openCount} unassigned
              </span>
            )}
          </div>
        </div>

        {/* Day strip */}
        <div className="flex items-center gap-1 pb-1">
          <button
            onClick={() => goToDay(subWeeks(weekMon, 1))}
            className="p-1 text-slate-400 hover:text-slate-600 transition shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex flex-1 justify-between">
            {weekDays.map(d => {
              const selected = isSameDay(d, date);
              const todayDay = isToday(d);
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => goToDay(d)}
                  className="flex flex-col items-center gap-0.5 flex-1 py-2"
                >
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest",
                    selected ? "text-brand-600" : "text-slate-400"
                  )}>
                    {format(d, "EEE")}
                  </span>
                  <span className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold transition-all",
                    selected  ? "bg-brand-600 text-white shadow-md shadow-brand-200"
                    : todayDay ? "text-brand-600 font-black"
                    : "text-slate-500"
                  )}>
                    {format(d, "d")}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => goToDay(addWeeks(weekMon, 1))}
            className="p-1 text-slate-400 hover:text-slate-600 transition shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 px-4 pt-5 pb-6 space-y-4 overflow-y-auto">
        {isWeekend(date) ? (
          <CenteredMessage emoji="🌤️" title="No school today" sub="Enjoy the time off!" />
        ) : !runDay || runs.length === 0 ? (
          <CenteredMessage emoji="📋" title="No roster yet"
            sub={isAdmin ? "Head to Roster to create this week's runs." : "Check back once the roster is published."} />
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <SchoolRow school="A" dropSlot="a_dropoff" pickSlot="a_pickup"
                bySlot={bySlot} currentProfileId={currentProfile?.id}
                allChildren={allChildren} isAdmin={isAdmin} onTap={setActiveRun} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.07, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <SchoolRow school="B" dropSlot="b_dropoff" pickSlot="b_pickup"
                bySlot={bySlot} currentProfileId={currentProfile?.id}
                allChildren={allChildren} isAdmin={isAdmin} onTap={setActiveRun} />
            </motion.div>
          </>
        )}
      </div>

      {activeRun && (
        <AssignDriverSheet
          open={true}
          onClose={() => setActiveRun(null)}
          run={activeRun}
          allProfiles={allProfiles}
          allChildren={allChildren}
          isAdmin={isAdmin}
          currentProfileId={currentProfile?.id}
        />
      )}
    </div>
  );
}

/* ── School row ── */
function SchoolRow({ school, dropSlot, pickSlot, bySlot, currentProfileId, allChildren, isAdmin, onTap }: {
  school: "A" | "B"; dropSlot: RunSlot; pickSlot: RunSlot;
  bySlot: Record<string, RunWithDetails>; currentProfileId?: string;
  allChildren: Child[]; isAdmin: boolean; onTap: (r: RunWithDetails) => void;
}) {
  const s = SCHOOL[school];
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm shadow-slate-200/80 border border-slate-100">
      {/* Bold gradient header — the signature design element */}
      <div className={cn("bg-gradient-to-r px-4 py-3 flex items-center justify-between", s.gradient)}>
        <span className="text-sm font-black uppercase tracking-widest text-white">
          {s.name}
        </span>
      </div>

      {/* Half-cards grid */}
      <div className="grid grid-cols-2 bg-white divide-x divide-slate-100">
        <HalfCard slot={dropSlot} run={bySlot[dropSlot]} school={school}
          currentProfileId={currentProfileId} allChildren={allChildren} isAdmin={isAdmin} onTap={onTap} />
        <HalfCard slot={pickSlot} run={bySlot[pickSlot]} school={school}
          currentProfileId={currentProfileId} allChildren={allChildren} isAdmin={isAdmin} onTap={onTap} />
      </div>
    </div>
  );
}

/* ── Half card ── */
function HalfCard({ slot, run, school, currentProfileId, allChildren, isAdmin, onTap }: {
  slot: RunSlot; run?: RunWithDetails; school: "A" | "B";
  currentProfileId?: string; allChildren: Child[]; isAdmin: boolean;
  onTap: (r: RunWithDetails) => void;
}) {
  const info        = SLOT_LABELS[slot];
  const s           = SCHOOL[school];
  const isMyRun     = run?.driver?.id === currentProfileId;
  const isOpen      = !run || run.status === "open";
  const isCancelled = run?.status === "cancelled";
  const canTap      = !!run && (isAdmin || run.assigned_to === currentProfileId);
  const statusPill  = run ? STATUS_PILL[run.status] : STATUS_PILL.open;

  const kids = allChildren.filter(c =>
    (run?.run_children ?? []).map(rc => rc.child_id).includes(c.id)
  );

  return (
    <motion.div
      whileTap={canTap ? { scale: 0.97 } : {}}
      onClick={canTap ? () => onTap(run!) : undefined}
      className={cn(
        "p-3.5 flex flex-col gap-2.5 transition-colors min-h-[128px]",
        canTap && "cursor-pointer active:bg-slate-50",
        isMyRun && !isCancelled && "bg-brand-50",
        isCancelled && "opacity-50",
      )}
    >
      {/* Type · time */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {info.type === "drop" ? "Drop-off" : "Pick-up"}
        </span>
        <span className="text-[10px] text-slate-300">·</span>
        <span className="text-[10px] font-semibold text-slate-400">{info.time}</span>
      </div>

      {/* Driver */}
      {isCancelled ? (
        <p className="text-xs font-bold text-red-400">Cancelled</p>
      ) : isOpen ? (
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-xs font-bold text-amber-600">Needs driver</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className={cn(
            "shrink-0 rounded-full overflow-hidden flex items-center justify-center font-extrabold",
            isMyRun
              ? "w-9 h-9 text-sm bg-brand-600 text-white ring-2 ring-brand-300 ring-offset-1"
              : cn("w-8 h-8 text-xs", s.pillDark),
          )}>
            {run?.driver?.avatar_url ? (
              <img src={run.driver.avatar_url} alt={run.driver.full_name} className="w-full h-full object-cover" />
            ) : (
              run?.driver?.full_name?.charAt(0).toUpperCase()
            )}
          </div>
          <span className={cn(
            "text-sm font-bold truncate leading-tight",
            isMyRun ? "text-brand-700" : "text-slate-800"
          )}>
            {run?.driver?.full_name?.split(" ")[0]}
          </span>
        </div>
      )}

      {/* Status pill */}
      {!isOpen && (
        <AnimatePresence mode="wait">
          <motion.span
            key={run?.status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "self-start text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
              statusPill.classes
            )}
          >
            {statusPill.label}
          </motion.span>
        </AnimatePresence>
      )}

      {/* Kid avatars — overlapping stack */}
      {kids.length > 0 && (
        <div className="flex items-center gap-2 mt-auto">
          <div className="flex -space-x-1.5">
            {kids.map(kid => (
              <div
                key={kid.id}
                title={kid.full_name}
                className={cn(
                  "w-5 h-5 rounded-full border-2 border-white overflow-hidden flex items-center justify-center text-[8px] font-extrabold text-white shrink-0 ring-0",
                  !kid.avatar_url && s.kidColor
                )}
              >
                {kid.avatar_url ? (
                  <img src={kid.avatar_url} alt={kid.full_name} className="w-full h-full object-cover" />
                ) : (
                  kid.full_name.charAt(0).toUpperCase()
                )}
              </div>
            ))}
          </div>
          <span className="text-[10px] text-slate-500 font-semibold truncate">
            {kids.map(k => k.full_name.split(" ")[0]).join(" · ")}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function CenteredMessage({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <div className="text-5xl mb-4">{emoji}</div>
      <h3 className="text-lg font-black text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-xs leading-relaxed">{sub}</p>
    </motion.div>
  );
}
