import { createClient } from "@/lib/supabase/server";
import { getMondayOf, formatDate } from "@/lib/utils/dates";
import DailyView from "@/components/roster/DailyView";
import { parseISO, isValid } from "date-fns";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;

  const today = formatDate(new Date());
  const selectedDate = dateParam && isValid(parseISO(dateParam)) ? dateParam : today;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: runDay }, { data: allChildren }, { data: allProfiles }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user!.id).single(),
      supabase
        .from("run_days")
        .select(`
          *,
          week:weeks!inner ( week_start, published_at ),
          runs (
            *,
            driver:profiles!runs_assigned_to_fkey ( id, full_name, avatar_url ),
            run_children ( child_id, children ( id, full_name, school ) )
          )
        `)
        .eq("run_date", selectedDate)
        .maybeSingle(),
      supabase.from("children").select("*").order("full_name"),
      supabase.from("profiles").select("id, full_name, role, avatar_url").order("full_name"),
    ]);

  return (
    <DailyView
      runDay={runDay}
      selectedDate={selectedDate}
      today={today}
      currentProfile={profile}
      allChildren={allChildren ?? []}
      allProfiles={allProfiles ?? []}
    />
  );
}
