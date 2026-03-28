import { createClient } from "@/lib/supabase/server";
import { getMondayOf, formatDate } from "@/lib/utils/dates";
import WeekView from "@/components/roster/WeekView";
import { parseISO, isValid } from "date-fns";

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;
  const weekStart = start && isValid(parseISO(start)) ? start : formatDate(getMondayOf(new Date()));

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: week }, { data: allProfiles }, { data: allChildren }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user!.id).single(),
      supabase
        .from("weeks")
        .select(`
          *,
          run_days (
            *,
            runs (
              *,
              driver:profiles!runs_assigned_to_fkey ( id, full_name, avatar_url ),
              run_children ( child_id, children ( id, full_name, school ) )
            )
          )
        `)
        .eq("week_start", weekStart)
        .maybeSingle(),
      supabase.from("profiles").select("id, full_name, role, avatar_url").order("full_name"),
      supabase.from("children").select("*").order("full_name"),
    ]);

  return (
    <WeekView
      week={week}
      weekStart={weekStart}
      currentProfile={profile}
      allProfiles={allProfiles ?? []}
      allChildren={allChildren ?? []}
    />
  );
}
