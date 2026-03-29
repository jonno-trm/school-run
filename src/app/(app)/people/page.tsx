import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PeopleView from "@/components/people/PeopleView";

export default async function PeoplePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single() as { data: { role: string } | null };

  if (currentProfile?.role !== "admin") redirect("/dashboard");

  const [{ data: profiles }, { data: children }] = await Promise.all([
    supabase.from("profiles").select("*").order("role", { ascending: false }).order("full_name"),
    supabase.from("children").select("*").order("school").order("full_name"),
  ]);

  return <PeopleView profiles={profiles ?? []} children={children ?? []} />;
}
