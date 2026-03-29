"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function generatePassword(): string {
  const words = ["Run", "Drop", "Pick", "School", "Drive", "Park"];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(100 + Math.random() * 900);
  const sym = ["!", "#", "*"][Math.floor(Math.random() * 3)];
  return `${word}${num}${sym}`;
}

export async function createDriver(formData: { name: string; email: string; phone?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single() as { data: { role: string } | null };
  if (me?.role !== "admin") throw new Error("Unauthorized");

  const serviceClient = await createServiceClient();
  const password = generatePassword();

  const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
    email: formData.email,
    password,
    email_confirm: true,
  });

  if (authError) throw new Error(authError.message);

  const { error: profileError } = await serviceClient
    .from("profiles")
    .update({
      full_name: formData.name,
      phone: formData.phone || null,
      role: "helper",
    })
    .eq("id", authUser.user.id);

  if (profileError) throw new Error(profileError.message);

  revalidatePath("/people");
  return { password };
}

export async function deleteDriver(profileId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single() as { data: { role: string } | null };
  if (me?.role !== "admin") throw new Error("Unauthorized");

  const serviceClient = await createServiceClient();
  await serviceClient.auth.admin.deleteUser(profileId);

  revalidatePath("/people");
}
