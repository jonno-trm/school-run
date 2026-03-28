"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile, Run, Child } from "@/types/database";
import AssignDriverSheet from "./AssignDriverSheet";

const SCHOOL_COLOURS: Record<string, { bg: string; border: string; avatar: string; text: string }> = {
  A: { bg: "bg-violet-50",   border: "border-violet-200", avatar: "bg-violet-600", text: "text-violet-700" },
  B: { bg: "bg-emerald-50",  border: "border-emerald-200", avatar: "bg-emerald-600", text: "text-emerald-700" },
};

function slotSchool(slot: string): "A" | "B" {
  return slot.startsWith("a_") ? "A" : "B";
}

interface Props {
  run: Run & { driver: Pick<Profile, "id" | "full_name" | "avatar_url"> | null; run_children: { child_id: string }[] } | undefined;
  slot: Run["slot"];
  isSchoolDay: boolean;
  isAdmin: boolean;
  currentProfileId: string | undefined;
  allProfiles: Pick<Profile, "id" | "full_name" | "role" | "avatar_url">[];
  allChildren: Child[];
}

export default function RunSlotCard({ run, slot, isSchoolDay, isAdmin, currentProfileId, allProfiles, allChildren }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const school = slotSchool(slot);
  const colours = SCHOOL_COLOURS[school];

  if (!isSchoolDay) {
    return (
      <div className="h-16 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center">
        <span className="text-[10px] text-slate-300 font-medium">No school</span>
      </div>
    );
  }

  if (!run) {
    return (
      <div className={cn("h-16 rounded-xl border flex items-center justify-center", colours.bg, colours.border)}>
        <span className="text-[10px] text-slate-400">—</span>
      </div>
    );
  }

  const isMe = run.driver?.id === currentProfileId;
  const isCancelled = run.status === "cancelled";
  const isOpen = run.status === "open";
  const driverName = run.driver?.full_name?.split(" ")[0] ?? "—";
  const avatarUrl = run.driver?.avatar_url;
  const initial = run.driver?.full_name?.charAt(0).toUpperCase() ?? "?";

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setSheetOpen(true)}
        className={cn(
          "w-full h-16 rounded-xl border text-left px-2.5 flex flex-col justify-center gap-0.5 transition-all",
          isCancelled && "bg-red-50 border-red-200 opacity-60",
          isOpen && "bg-amber-50 border-amber-200 border-dashed",
          !isCancelled && !isOpen && isMe && "bg-brand-50 border-brand-200",
          !isCancelled && !isOpen && !isMe && cn(colours.bg, colours.border),
        )}
      >
        {isCancelled ? (
          <div className="flex items-center gap-1">
            <X className="w-3 h-3 text-red-400 shrink-0" />
            <span className="text-[10px] text-red-400 font-medium truncate">Cancelled</span>
          </div>
        ) : isOpen ? (
          <span className="text-[10px] text-amber-600 font-semibold">Needs driver</span>
        ) : (
          <>
            <div className="flex items-center gap-1.5">
              {/* Avatar */}
              <div className={cn(
                "w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[8px] font-extrabold text-white overflow-hidden",
                isMe ? "bg-brand-600 ring-1 ring-brand-400 ring-offset-1" : colours.avatar,
              )}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={driverName} className="w-full h-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <span className={cn("text-[11px] font-semibold truncate leading-tight", isMe ? "text-brand-700" : colours.text)}>
                {driverName}
              </span>
            </div>
            {run.run_children?.length > 0 && (
              <span className="text-[9px] text-slate-400 truncate leading-tight pl-6">
                {run.run_children.length} kid{run.run_children.length !== 1 ? "s" : ""}
              </span>
            )}
          </>
        )}
      </motion.button>

      <AssignDriverSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        run={run}
        allProfiles={allProfiles}
        allChildren={allChildren}
        isAdmin={isAdmin}
        currentProfileId={currentProfileId}
      />
    </>
  );
}
