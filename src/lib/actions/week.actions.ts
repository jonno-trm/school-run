"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { addDays, subWeeks, formatISO } from "date-fns";
import type { RunSlot } from "@/types/database";

const SLOTS: RunSlot[] = ["a_dropoff", "b_dropoff", "a_pickup", "b_pickup"];

export async function createWeek(weekStart: string, nonSchoolDays: string[] = []) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Enforce max 3 weeks ahead
  const start = new Date(weekStart);
  const maxAllowed = addDays(new Date(), 21);
  if (start > maxAllowed) throw new Error("Cannot create roster more than 3 weeks ahead.");

  const { data: week, error: weekError } = await supabase
    .from("weeks")
    .insert({ week_start: weekStart, created_by: user!.id })
    .select()
    .single();

  if (weekError) throw new Error(weekError.message);

  // Create 5 run_days
  const runDays = Array.from({ length: 5 }, (_, i) => {
    const date = formatISO(addDays(start, i), { representation: "date" });
    return {
      week_id: week.id,
      run_date: date,
      is_school_day: !nonSchoolDays.includes(date),
    };
  });

  const { data: createdDays, error: daysError } = await supabase
    .from("run_days")
    .insert(runDays)
    .select();

  if (daysError) throw new Error(daysError.message);

  // Create 4 run slots per school day
  const runs = createdDays
    .filter(d => d.is_school_day)
    .flatMap(day => SLOTS.map(slot => ({ run_day_id: day.id, slot, status: "open" as const })));

  const { error: runsError } = await supabase.from("runs").insert(runs);
  if (runsError) throw new Error(runsError.message);

  revalidatePath("/dashboard");
  return week.id;
}

export async function copyLastWeek(targetWeekStart: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const prevStart = formatISO(subWeeks(new Date(targetWeekStart), 1), { representation: "date" });

  // Load last week's runs with assignments
  const { data: prevWeek } = await supabase
    .from("weeks")
    .select(`run_days ( run_date, is_school_day, runs ( slot, assigned_to, run_children ( child_id ) ) )`)
    .eq("week_start", prevStart)
    .maybeSingle();

  if (!prevWeek) throw new Error("No previous week found to copy from.");

  // Create the new week (reuse createWeek logic but without enforcing non-school days)
  const weekId = await createWeek(targetWeekStart);

  // Load the newly created week's runs
  const { data: newWeek } = await supabase
    .from("weeks")
    .select(`run_days ( run_date, runs ( id, slot ) )`)
    .eq("id", weekId)
    .single();

  if (!newWeek) return weekId;

  // Build a lookup: slot → { assigned_to, children }
  const prevBySlotByOffset: Record<number, Record<string, any>> = {};
  for (const day of (prevWeek as any).run_days ?? []) {
    const offset = new Date(day.run_date).getDay() - 1; // 0=Mon
    prevBySlotByOffset[offset] = {};
    for (const run of day.runs ?? []) {
      prevBySlotByOffset[offset][run.slot] = run;
    }
  }

  // Copy assignments
  for (const day of (newWeek as any).run_days ?? []) {
    const offset = new Date(day.run_date).getDay() - 1;
    const prevDay = prevBySlotByOffset[offset];
    if (!prevDay) continue;

    for (const run of day.runs ?? []) {
      const prev = prevDay[run.slot];
      if (!prev?.assigned_to) continue;

      await supabase.from("runs").update({
        assigned_to: prev.assigned_to,
        status: "assigned",
        updated_at: new Date().toISOString(),
      }).eq("id", run.id);

      if (prev.run_children?.length > 0) {
        await supabase.from("run_children").insert(
          prev.run_children.map((rc: any) => ({ run_id: run.id, child_id: rc.child_id }))
        );
      }
    }
  }

  revalidatePath("/week");
  return weekId;
}

export async function publishWeek(weekId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("weeks")
    .update({ published_at: new Date().toISOString() })
    .eq("id", weekId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}
