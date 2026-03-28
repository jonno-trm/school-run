import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { token, name, phone } = await request.json();

  if (!token || !name) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const supabase = await createServiceClient();

  // Look up the invite token
  const { data: profile, error: lookupError } = await supabase
    .from("profiles")
    .select("id, invite_token_expires_at")
    .eq("invite_token", token)
    .single() as { data: { id: string; invite_token_expires_at: string | null } | null; error: unknown };

  if (lookupError || !profile) {
    return NextResponse.json({ error: "Invalid invite link." }, { status: 404 });
  }

  if (profile.invite_token_expires_at && new Date(profile.invite_token_expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite link has expired." }, { status: 410 });
  }

  // Generate a one-time password, create auth user, then clear it
  const tempPassword = crypto.randomUUID();

  const { data: authUser, error: createError } = await supabase.auth.admin.createUser({
    id: profile.id,
    email: `helper-${profile.id}@school-runs.local`,
    password: tempPassword,
    email_confirm: true,
  });

  if (createError && !createError.message.includes("already been registered")) {
    return NextResponse.json({ error: "Could not create account." }, { status: 500 });
  }

  // Update profile: set name, phone, clear invite token
  await supabase
    .from("profiles")
    .update({
      full_name: name,
      phone: phone || null,
      invite_token: null,
      invite_token_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  // Sign in and set session cookie
  const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
    email: `helper-${profile.id}@school-runs.local`,
    password: tempPassword,
  });

  if (signInError || !session.session) {
    return NextResponse.json({ error: "Could not sign in." }, { status: 500 });
  }

  // Return session tokens for the client to store
  return NextResponse.json({
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
  });
}
