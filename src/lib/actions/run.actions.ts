"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function assignDriver(runId: string, profileId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("runs")
    .update({
      assigned_to: profileId,
      status: "assigned",
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}

export async function cancelRun(runId: string, reason?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("runs")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: user?.id,
      cancellation_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}

export async function updateRunChildren(runId: string, childIds: string[]) {
  const supabase = await createClient();

  await supabase.from("run_children").delete().eq("run_id", runId);

  if (childIds.length > 0) {
    const { error } = await supabase
      .from("run_children")
      .insert(childIds.map(child_id => ({ run_id: runId, child_id })));
    if (error) throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}

export async function confirmRun(runId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("runs")
    .update({
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
}
