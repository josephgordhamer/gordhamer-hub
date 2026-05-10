-- =====================================================================
-- Gordhamer Family Hub — Postgres schema
-- Run this once in the Supabase SQL editor (Part 1.2 of SETUP.md).
-- Safe to re-run: every CREATE uses IF NOT EXISTS or DROP/CREATE.
-- =====================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- text search later

-- =====================================================================
-- 1. ALLOWLIST  (controls who can sign in)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.allowlist (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL UNIQUE,
  preferred_name text,
  added_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at     timestamptz NOT NULL DEFAULT now()
);

-- Seed the allowlist with Joseph (you can add the rest of the family from the UI).
-- This is idempotent.
INSERT INTO public.allowlist (email, preferred_name)
VALUES ('josephgordhamer@gmail.com', 'Joseph')
ON CONFLICT (email) DO NOTHING;

-- =====================================================================
-- 2. PROFILES  (one row per signed-in user)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email             text NOT NULL UNIQUE,
  preferred_name    text,
  is_admin          boolean NOT NULL DEFAULT false,
  family_member_id  uuid,            -- FK added later (after family_members exists)
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Trigger: when a new auth user is created, only insert into profiles if their
-- email is on the allowlist. Otherwise the auth user exists but has no profile,
-- which our middleware uses to deny access.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed_name text;
  v_admin boolean;
BEGIN
  SELECT preferred_name INTO v_allowed_name
    FROM public.allowlist
    WHERE lower(email) = lower(NEW.email);

  IF v_allowed_name IS NULL THEN
    -- Not on the allowlist. Don't create a profile; middleware will block.
    RETURN NEW;
  END IF;

  -- First user (the seed allowlisted address) becomes an admin.
  v_admin := NOT EXISTS (SELECT 1 FROM public.profiles WHERE is_admin);

  INSERT INTO public.profiles (id, email, preferred_name, is_admin)
  VALUES (NEW.id, NEW.email, COALESCE(v_allowed_name, split_part(NEW.email, '@', 1)), v_admin)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- =====================================================================
-- 3. FAMILY MEMBERS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.family_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  preferred_name  text,
  relationship    text NOT NULL CHECK (relationship IN ('parent','child','grandchild')),
  parent_id       uuid REFERENCES public.family_members(id) ON DELETE SET NULL,
  birthday        date,
  phone           text,
  email           text,
  address         text,
  state           text,
  profile_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  position        integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

-- Add the FK from profiles -> family_members now that the table exists
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_family_member_id_fkey,
  ADD CONSTRAINT profiles_family_member_id_fkey
    FOREIGN KEY (family_member_id) REFERENCES public.family_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_family_members_parent ON public.family_members(parent_id);
CREATE INDEX IF NOT EXISTS idx_family_members_alive  ON public.family_members(deleted_at) WHERE deleted_at IS NULL;

-- Seed the eight Gordhamers (idempotent on name + relationship)
DO $$
DECLARE
  v_dad uuid;
  v_mom uuid;
BEGIN
  -- Joseph Lee
  INSERT INTO public.family_members (name, preferred_name, relationship, position)
  VALUES ('Joseph Lee Gordhamer', 'Joseph', 'parent', 0)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_dad;
  IF v_dad IS NULL THEN SELECT id INTO v_dad FROM public.family_members WHERE name='Joseph Lee Gordhamer'; END IF;

  -- Anna Kristine
  INSERT INTO public.family_members (name, preferred_name, relationship, position)
  VALUES ('Anna Kristine Gordhamer', 'Anna', 'parent', 1)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_mom;
  IF v_mom IS NULL THEN SELECT id INTO v_mom FROM public.family_members WHERE name='Anna Kristine Gordhamer'; END IF;

  -- Children — each linked to dad as parent_id (you can edit later)
  INSERT INTO public.family_members (name, preferred_name, relationship, parent_id, position) VALUES
    ('Abigail Kristine Gordhamer',  NULL, 'child', v_dad, 2),
    ('Magdalene Jean Gordhamer',    NULL, 'child', v_dad, 3),
    ('Joseph Alexander Gordhamer',  NULL, 'child', v_dad, 4),
    ('Ella Marie Gordhamer',        NULL, 'child', v_dad, 5),
    ('Anna Juliet Gordhamer',       NULL, 'child', v_dad, 6),
    ('Greta Elizabeth Gordhamer',   NULL, 'child', v_dad, 7)
  ON CONFLICT DO NOTHING;
END $$;

-- =====================================================================
-- 4. PERSONAL PAGES  (one per family member)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.personal_pages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id  uuid NOT NULL UNIQUE REFERENCES public.family_members(id) ON DELETE CASCADE,
  header_text       text NOT NULL DEFAULT '',
  bio               text NOT NULL DEFAULT '',
  accent_color      text NOT NULL DEFAULT '#b8924a',
  bg_color          text NOT NULL DEFAULT '#faf6ea',
  text_color        text NOT NULL DEFAULT '#2a2a2a',
  sections          jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Auto-create personal_pages row whenever a family_member is added
CREATE OR REPLACE FUNCTION public.create_personal_page_for_member()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.personal_pages (family_member_id) VALUES (NEW.id)
  ON CONFLICT (family_member_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_family_member_inserted ON public.family_members;
CREATE TRIGGER on_family_member_inserted
  AFTER INSERT ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.create_personal_page_for_member();

-- Backfill personal_pages for the eight seeded family members
INSERT INTO public.personal_pages (family_member_id)
SELECT id FROM public.family_members
WHERE NOT EXISTS (
  SELECT 1 FROM public.personal_pages pp WHERE pp.family_member_id = family_members.id
);

-- =====================================================================
-- 5. PAGE REQUESTS  (the design-request queue)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.page_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_member_id uuid NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,
  text             text NOT NULL,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','dismissed')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz
);
CREATE INDEX IF NOT EXISTS idx_page_requests_pending
  ON public.page_requests(family_member_id, created_at DESC)
  WHERE status = 'pending';

-- =====================================================================
-- 6. JOBS  (recurring + one-time chores)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  frequency     text NOT NULL CHECK (frequency IN ('once','daily','weekly','biweekly','monthly','quarterly','yearly','custom')),
  custom_days   integer,
  start_date    date NOT NULL,
  rotation      jsonb NOT NULL DEFAULT '[]'::jsonb,   -- ordered array of names (or "Everyone")
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_jobs_alive ON public.jobs(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_freq  ON public.jobs(frequency);

CREATE TABLE IF NOT EXISTS public.job_completions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  date          date NOT NULL,
  completed_by  text,
  completed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, date)
);
CREATE INDEX IF NOT EXISTS idx_job_completions_date ON public.job_completions(date);

CREATE TABLE IF NOT EXISTS public.job_overrides (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id    uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  date      date NOT NULL,
  name      text,        -- override the job name for that day
  assignee  text,        -- override the rotation pick for that day
  notes     text,        -- per-day notes
  UNIQUE (job_id, date)
);
CREATE INDEX IF NOT EXISTS idx_job_overrides_date ON public.job_overrides(date);

-- =====================================================================
-- 7. EVENTS + EVENT TASKS
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  date        date,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_events_alive ON public.events(deleted_at) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.event_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  parent_task_id  uuid REFERENCES public.event_tasks(id) ON DELETE CASCADE,
  name            text NOT NULL,
  assignee        text,
  done            boolean NOT NULL DEFAULT false,
  position        integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_event_tasks_event ON public.event_tasks(event_id);

-- =====================================================================
-- 8. CALENDAR ITEMS  (one-off entries that aren't full events)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.calendar_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  date               date NOT NULL,
  start_at           timestamptz,
  end_at             timestamptz,
  all_day            boolean NOT NULL DEFAULT true,
  location           text,
  description        text,
  icloud_calendar_id uuid REFERENCES public.icloud_calendars(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz
);
CREATE INDEX IF NOT EXISTS idx_calendar_items_date ON public.calendar_items(date);
CREATE INDEX IF NOT EXISTS idx_calendar_items_start_at ON public.calendar_items(start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_items_icloud_calendar ON public.calendar_items(icloud_calendar_id);

-- =====================================================================
-- 9. SCRIPTURE STUDY
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.scripture_plan (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day       text NOT NULL,
  passage   text NOT NULL,
  position  integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.discussions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author            text NOT NULL,
  author_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  message           text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);
CREATE INDEX IF NOT EXISTS idx_discussions_recent ON public.discussions(created_at DESC) WHERE deleted_at IS NULL;

-- Seed the default reading plan
INSERT INTO public.scripture_plan (day, passage, position) VALUES
  ('Sunday',    'Psalm 23',                          0),
  ('Monday',    'Proverbs 3:5-6',                    1),
  ('Tuesday',   'Matthew 5:1-12',                    2),
  ('Wednesday', 'Mosiah 2:17',                       3),
  ('Thursday',  '1 Nephi 3:7',                       4),
  ('Friday',    'Moroni 7:45-48',                    5),
  ('Saturday',  'Doctrine & Covenants 88:118',       6)
ON CONFLICT DO NOTHING;

-- =====================================================================
-- 10. RESOURCES
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.resources (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  category            text,
  url                 text,
  shared_by           text,
  shared_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);
CREATE INDEX IF NOT EXISTS idx_resources_alive ON public.resources(deleted_at) WHERE deleted_at IS NULL;

-- =====================================================================
-- 11. UPDATED_AT TRIGGER (shared)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'profiles', 'family_members', 'personal_pages',
      'jobs', 'events', 'event_tasks'
    ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at_%1$I ON public.%1$I;', t);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at_%1$I BEFORE UPDATE ON public.%1$I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t
    );
  END LOOP;
END $$;

-- =====================================================================
-- 12. ROW LEVEL SECURITY
-- Anyone with a profile (i.e. on the allowlist) gets full read/write
-- on family-shared data. Only admins can hard-delete.
-- =====================================================================
ALTER TABLE public.allowlist        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_pages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_completions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_overrides    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_tasks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripture_plan   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources        ENABLE ROW LEVEL SECURITY;

-- Helper: check if the current user has a profile (i.e. is allowlisted)
CREATE OR REPLACE FUNCTION public.current_user_is_family()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin);
$$;

-- profiles: each user can read all profiles, can update their own
DROP POLICY IF EXISTS "profiles_select_family" ON public.profiles;
CREATE POLICY "profiles_select_family" ON public.profiles
  FOR SELECT USING (public.current_user_is_family());

DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_admin_update_all" ON public.profiles;
CREATE POLICY "profiles_admin_update_all" ON public.profiles
  FOR UPDATE USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

-- allowlist: read by family, manage by admin
DROP POLICY IF EXISTS "allowlist_select_family" ON public.allowlist;
CREATE POLICY "allowlist_select_family" ON public.allowlist
  FOR SELECT USING (public.current_user_is_family());

DROP POLICY IF EXISTS "allowlist_admin_all" ON public.allowlist;
CREATE POLICY "allowlist_admin_all" ON public.allowlist
  FOR ALL USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

-- Generic family-RW policy generator for shared tables
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'family_members', 'personal_pages', 'page_requests',
      'jobs', 'job_completions', 'job_overrides',
      'events', 'event_tasks', 'calendar_items',
      'scripture_plan', 'discussions', 'resources'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%1$I_select" ON public.%1$I;', t);
    EXECUTE format(
      'CREATE POLICY "%1$I_select" ON public.%1$I
       FOR SELECT USING (public.current_user_is_family());', t);

    EXECUTE format('DROP POLICY IF EXISTS "%1$I_insert" ON public.%1$I;', t);
    EXECUTE format(
      'CREATE POLICY "%1$I_insert" ON public.%1$I
       FOR INSERT WITH CHECK (public.current_user_is_family());', t);

    EXECUTE format('DROP POLICY IF EXISTS "%1$I_update" ON public.%1$I;', t);
    EXECUTE format(
      'CREATE POLICY "%1$I_update" ON public.%1$I
       FOR UPDATE USING (public.current_user_is_family())
       WITH CHECK (public.current_user_is_family());', t);

    EXECUTE format('DROP POLICY IF EXISTS "%1$I_delete" ON public.%1$I;', t);
    EXECUTE format(
      'CREATE POLICY "%1$I_delete" ON public.%1$I
       FOR DELETE USING (public.current_user_is_admin());', t);
  END LOOP;
END $$;

-- =====================================================================
-- 13. REALTIME PUBLICATION
-- Subscribe to changes on the user-facing tables so the UI updates
-- live across devices.
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.personal_pages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.page_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_overrides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resources;

-- =====================================================================
-- Done. Hand back the env vars from Project Settings → API to Claude
-- as described in SETUP.md Part 4.
-- =====================================================================
