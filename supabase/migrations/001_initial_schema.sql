-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'helper');
CREATE TYPE run_slot AS ENUM ('a_dropoff', 'a_pickup', 'b_dropoff', 'b_pickup');
CREATE TYPE run_status AS ENUM ('open', 'assigned', 'confirmed', 'cancelled');

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT 'Invited helper',
  phone TEXT,
  role user_role NOT NULL DEFAULT 'helper',
  invite_token TEXT UNIQUE,
  invite_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Children
CREATE TABLE public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  school CHAR(1) NOT NULL CHECK (school IN ('A', 'B')),
  year_group TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Weeks
CREATE TABLE public.weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  notes TEXT,
  published_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Run days
CREATE TABLE public.run_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  run_date DATE NOT NULL,
  is_school_day BOOLEAN NOT NULL DEFAULT TRUE,
  day_notes TEXT,
  UNIQUE(week_id, run_date)
);

-- Runs
CREATE TABLE public.runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_day_id UUID NOT NULL REFERENCES public.run_days(id) ON DELETE CASCADE,
  slot run_slot NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status run_status NOT NULL DEFAULT 'open',
  notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id),
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(run_day_id, slot)
);

-- Run children (which kids are on a run)
CREATE TABLE public.run_children (
  run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  PRIMARY KEY (run_id, child_id)
);

-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- -------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.run_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Helper: is current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Profiles
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (is_admin());
CREATE POLICY "profiles_own_read" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_own_update" ON public.profiles FOR UPDATE USING (id = auth.uid());
-- Allow reading other helpers' names (for roster display)
CREATE POLICY "profiles_read_names" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);

-- Children
CREATE POLICY "children_admin_all" ON public.children FOR ALL USING (is_admin());
CREATE POLICY "children_own" ON public.children FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "children_read_all" ON public.children FOR SELECT USING (auth.uid() IS NOT NULL);

-- Weeks (helpers only see published weeks)
CREATE POLICY "weeks_admin_all" ON public.weeks FOR ALL USING (is_admin());
CREATE POLICY "weeks_helper_read_published" ON public.weeks FOR SELECT
  USING (auth.uid() IS NOT NULL AND published_at IS NOT NULL);

-- Run days
CREATE POLICY "run_days_admin_all" ON public.run_days FOR ALL USING (is_admin());
CREATE POLICY "run_days_helper_read" ON public.run_days FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM public.weeks w WHERE w.id = week_id AND w.published_at IS NOT NULL)
  );

-- Runs
CREATE POLICY "runs_admin_all" ON public.runs FOR ALL USING (is_admin());
CREATE POLICY "runs_helper_read" ON public.runs FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.run_days rd
      JOIN public.weeks w ON w.id = rd.week_id
      WHERE rd.id = run_day_id AND w.published_at IS NOT NULL
    )
  );
-- Helpers can update their own assigned run (to cancel)
CREATE POLICY "runs_helper_cancel" ON public.runs FOR UPDATE
  USING (assigned_to = auth.uid());

-- Run children
CREATE POLICY "run_children_admin_all" ON public.run_children FOR ALL USING (is_admin());
CREATE POLICY "run_children_read" ON public.run_children FOR SELECT USING (auth.uid() IS NOT NULL);

-- Push subscriptions
CREATE POLICY "push_own" ON public.push_subscriptions FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "push_admin_read" ON public.push_subscriptions FOR SELECT USING (is_admin());

-- -------------------------------------------------------
-- Trigger: auto-create profile on auth.users insert
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only create profile if one doesn't already exist (invite flow pre-creates it)
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
