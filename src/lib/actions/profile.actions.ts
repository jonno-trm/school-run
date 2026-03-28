"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateAvatarUrl(avatarUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/week");
  revalidatePath("/people");
}

export async function updateChildAvatarUrl(childId: string, avatarUrl: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Only admins can update child avatars
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single() as { data: { role: string } | null };
  if (profile?.role !== "admin") throw new Error("Unauthorized");

  const { error } = await supabase
    .from("children")
    .update({ avatar_url: avatarUrl })
    .eq("id", childId);

  if (error) throw new Error(error.message);
  revalidatePath("/people");
  revalidatePath("/dashboard");
  revalidatePath("/week");
}
