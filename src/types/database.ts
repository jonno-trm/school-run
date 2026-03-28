export type UserRole = "admin" | "helper";
export type RunSlot = "a_dropoff" | "a_pickup" | "b_dropoff" | "b_pickup";
export type RunStatus = "open" | "assigned" | "confirmed" | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  invite_token: string | null;
  invite_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: string;
  profile_id: string;
  full_name: string;
  school: "A" | "B";
  year_group: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Week {
  id: string;
  week_start: string;
  notes: string | null;
  published_at: string | null;
  created_by: string;
  created_at: string;
}

export interface RunDay {
  id: string;
  week_id: string;
  run_date: string;
  is_school_day: boolean;
  day_notes: string | null;
}

export interface Run {
  id: string;
  run_day_id: string;
  slot: RunSlot;
  assigned_to: string | null;
  status: RunStatus;
  notes: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RunChild {
  run_id: string;
  child_id: string;
}

export interface PushSubscription {
  id: string;
  profile_id: string;
  subscription: object;
  user_agent: string | null;
  created_at: string;
  last_used_at: string | null;
}

// Joined types for UI use
export interface RunWithDetails extends Run {
  driver: Profile | null;
  children: Child[];
}

export interface RunDayWithRuns extends RunDay {
  runs: RunWithDetails[];
}

export interface WeekWithDays extends Week {
  run_days: RunDayWithRuns[];
}

// Supabase Database type (used with createClient<Database>)
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      children: { Row: Child; Insert: Partial<Child>; Update: Partial<Child> };
      weeks: { Row: Week; Insert: Partial<Week>; Update: Partial<Week> };
      run_days: { Row: RunDay; Insert: Partial<RunDay>; Update: Partial<RunDay> };
      runs: { Row: Run; Insert: Partial<Run>; Update: Partial<Run> };
      run_children: { Row: RunChild; Insert: RunChild; Update: RunChild };
      push_subscriptions: { Row: PushSubscription; Insert: Partial<PushSubscription>; Update: Partial<PushSubscription> };
    };
    Views: {};
    Functions: {};
    Enums: {
      user_role: UserRole;
      run_slot: RunSlot;
      run_status: RunStatus;
    };
  };
};
