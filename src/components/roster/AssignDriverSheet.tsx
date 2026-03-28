"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { assignDriver, cancelRun, updateRunChildren } from "@/lib/actions/run.actions";
import type { Profile, Run, Child } from "@/types/database";
import { SLOT_LABELS } from "@/lib/utils/slots";

interface Props {
  open: boolean;
  onClose: () => void;
  run: Run & { driver: Pick<Profile, "id" | "full_name" | "avatar_url"> | null; run_children: { child_id: string }[] };
  allProfiles: Pick<Profile, "id" | "full_name" | "role" | "avatar_url">[];
  allChildren: Child[];
  isAdmin: boolean;
  currentProfileId: string | undefined;
}

export default function AssignDriverSheet({ open, onClose, run, allProfiles, allChildren, isAdmin, currentProfileId }: Props) {
  const [loading, setLoading] = useState(false);
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);

  const slotInfo = SLOT_LABELS[run.slot];
  const isMyRun = run.driver?.id === currentProfileId;

  // Children relevant to this slot's school
  const schoolFilter = slotInfo.school;
  const relevantChildren = allChildren.filter(c => c.school === schoolFilter);

  // Sync selected children when sheet opens
  useEffect(() => {
    if (open) {
      setSelectedChildIds(run.run_children?.map(rc => rc.child_id) ?? []);
    }
  }, [open, run.run_children]);

  function toggleChild(childId: string) {
    setSelectedChildIds(prev =>
      prev.includes(childId) ? prev.filter(id => id !== childId) : [...prev, childId]
    );
  }

  async function handleAssign(profileId: string) {
    setLoading(true);
    await assignDriver(run.id, profileId);
    await updateRunChildren(run.id, selectedChildIds);
    setLoading(false);
    onClose();
  }

  async function handleSaveChildren() {
    setLoading(true);
    await updateRunChildren(run.id, selectedChildIds);
    setLoading(false);
    onClose();
  }

  async function handleCancel() {
    setLoading(true);
    await cancelRun(run.id, cancelReason);
    setLoading(false);
    setCancelMode(false);
    onClose();
  }

  const childrenChanged =
    JSON.stringify([...selectedChildIds].sort()) !==
    JSON.stringify([...(run.run_children?.map(rc => rc.child_id) ?? [])].sort());

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl max-w-lg mx-auto max-h-[85vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-slate-200 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-800">{slotInfo.label}</h3>
                <p className="text-sm text-slate-400">{slotInfo.time}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="px-5 pb-8 overflow-y-auto flex-1 space-y-5">

              {cancelMode ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">Admins will be notified immediately.</span>
                  </div>
                  <textarea
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    placeholder="Reason (optional)…"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 h-20"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCancelMode(false)}
                      className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={loading}
                      className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition disabled:opacity-60"
                    >
                      {loading ? "Cancelling…" : "Confirm cancel"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Kids section — always visible */}
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Kids on this run</p>
                    <div className="flex flex-wrap gap-2">
                      {relevantChildren.map(child => {
                        const selected = selectedChildIds.includes(child.id);
                        return (
                          <motion.button
                            key={child.id}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => toggleChild(child.id)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition",
                              selected
                                ? "bg-brand-600 border-brand-600 text-white"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:border-brand-300"
                            )}
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-extrabold",
                              selected ? "bg-white/20 text-white" : (slotInfo.school === "A" ? "bg-violet-500 text-white" : "bg-emerald-500 text-white")
                            )}>
                              {child.avatar_url ? (
                                <img src={child.avatar_url} alt={child.full_name} className="w-full h-full object-cover" />
                              ) : (
                                child.full_name.charAt(0).toUpperCase()
                              )}
                            </div>
                            {child.full_name.split(" ")[0]}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Driver section */}
                  {isAdmin ? (
                    <div>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Driver</p>
                      <div className="space-y-1.5">
                        {allProfiles.map(profile => {
                          const isAssigned = run.driver?.id === profile.id;
                          return (
                            <motion.button
                              key={profile.id}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleAssign(profile.id)}
                              disabled={loading}
                              className={cn(
                                "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition text-left",
                                isAssigned
                                  ? "bg-brand-50 border-brand-200"
                                  : "bg-slate-50 border-slate-200 hover:border-brand-300 hover:bg-brand-50/50"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-brand-100 flex items-center justify-center">
                                  {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-sm font-bold text-brand-700">{profile.full_name.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <div>
                                  <span className={cn("text-sm font-medium", isAssigned ? "text-brand-700" : "text-slate-700")}>
                                    {profile.full_name}
                                    {profile.id === currentProfileId && " (me)"}
                                  </span>
                                  <span className="block text-[11px] text-slate-400 capitalize">{profile.role}</span>
                                </div>
                              </div>
                              {isAssigned && <Check className="w-4 h-4 text-brand-600" />}
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Save kids if no driver change needed */}
                      {childrenChanged && (
                        <button
                          onClick={handleSaveChildren}
                          disabled={loading}
                          className="w-full mt-3 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition disabled:opacity-60"
                        >
                          {loading ? "Saving…" : "Save kids"}
                        </button>
                      )}

                      {run.status !== "open" && (
                        <button
                          onClick={() => setCancelMode(true)}
                          className="w-full mt-2 py-3 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition"
                        >
                          Cancel this run
                        </button>
                      )}
                    </div>
                  ) : isMyRun ? (
                    <div className="space-y-2">
                      {run.status === "assigned" && (
                        <button
                          onClick={async () => {
                            setLoading(true);
                            const { confirmRun } = await import("@/lib/actions/run.actions");
                            await confirmRun(run.id);
                            if (childrenChanged) await handleSaveChildren();
                            setLoading(false);
                            onClose();
                          }}
                          disabled={loading}
                          className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition disabled:opacity-60"
                        >
                          {loading ? "Confirming…" : "✓ Confirm I'm doing this run"}
                        </button>
                      )}
                      {run.status === "confirmed" && (
                        <div className="flex items-center gap-2 bg-green-50 rounded-xl px-4 py-3">
                          <span className="text-sm font-semibold text-green-700">Confirmed ✓</span>
                        </div>
                      )}
                      {childrenChanged && (
                        <button
                          onClick={handleSaveChildren}
                          disabled={loading}
                          className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition disabled:opacity-60"
                        >
                          {loading ? "Saving…" : "Save kids"}
                        </button>
                      )}
                      <button
                        onClick={() => setCancelMode(true)}
                        className="w-full py-3 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition"
                      >
                        I can't do this run
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-600">
                        Driver: <span className="font-semibold text-slate-800">{run.driver?.full_name ?? "unassigned"}</span>
                      </div>
                      {run.status === "open" && (
                        <button
                          onClick={() => handleAssign(currentProfileId!)}
                          disabled={loading || !currentProfileId}
                          className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition disabled:opacity-60"
                        >
                          {loading ? "Saving…" : "I can do this run"}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
