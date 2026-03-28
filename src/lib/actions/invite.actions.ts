"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { addDays } from "date-fns";
import { headers } from "next/headers";

export async function generateInvite(): Promise<string> {
  const supabase = await createServiceClient();

  const token = crypto.randomUUID();
  const expires = addDays(new Date(), 7).toISOString();

  // Create a placeholder profile with just the invite token
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: crypto.randomUUID(),
      full_name: "Invited helper",
      role: "helper",
      invite_token: token,
      invite_token_expires_at: expires,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  return `${protocol}://${host}/invite/${token}`;
}
