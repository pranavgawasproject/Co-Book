-- ============================================================
-- CoBook Supabase SQL Schema (with Anonymous Auth RLS)
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  name        TEXT NOT NULL,
  upi_id      TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or permanent) can read profiles — needed to show names in sessions
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

-- Only the owner can insert their own profile
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Only the owner can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);


-- 2. SESSIONS
CREATE TABLE IF NOT EXISTS public.sessions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id         UUID REFERENCES public.profiles(id) NOT NULL,
  platform        TEXT NOT NULL,
  property_title  TEXT,
  property_url    TEXT NOT NULL,
  total_cost      NUMERIC(12, 2) DEFAULT 0.00,
  status          TEXT DEFAULT 'browsing',   -- browsing | locked_for_payment | completed
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read sessions (needed for joining and sync)
DROP POLICY IF EXISTS "sessions_select_all" ON public.sessions;
CREATE POLICY "sessions_select_all" ON public.sessions
  FOR SELECT USING (true);

-- Any authenticated or anonymous user can create a session
DROP POLICY IF EXISTS "sessions_insert_all" ON public.sessions;
CREATE POLICY "sessions_insert_all" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only host can update (standard policy)
DROP POLICY IF EXISTS "sessions_update_host" ON public.sessions;
CREATE POLICY "sessions_update_host" ON public.sessions
  FOR UPDATE USING (auth.uid() = host_id);


-- 3. SESSION MEMBERS
CREATE TABLE IF NOT EXISTS public.session_members (
  session_id      UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_owed     NUMERIC(12, 2) DEFAULT 0.00,
  payment_status  TEXT DEFAULT 'pending',
  joined_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (session_id, user_id)
);

ALTER TABLE public.session_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_select_all" ON public.session_members;
CREATE POLICY "members_select_all" ON public.session_members
  FOR SELECT USING (true);

-- Only user can insert themselves
DROP POLICY IF EXISTS "members_insert_own" ON public.session_members;
CREATE POLICY "members_insert_own" ON public.session_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User can update their own status (e.g. marking paid)
DROP POLICY IF EXISTS "members_update_own" ON public.session_members;
CREATE POLICY "members_update_own" ON public.session_members
  FOR UPDATE USING (auth.uid() = user_id);

-- Host can update member amount_owed
DROP POLICY IF EXISTS "members_update_host" ON public.session_members;
CREATE POLICY "members_update_host" ON public.session_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.sessions 
      WHERE id = session_id AND host_id = auth.uid()
    )
  );

-- User can leave
DROP POLICY IF EXISTS "members_delete_own" ON public.session_members;
CREATE POLICY "members_delete_own" ON public.session_members
  FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- SUPABASE REALTIME
-- Enable realtime for WebSocket hooks
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'sessions is already in supabase_realtime — skipping.';
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_members;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'session_members is already in supabase_realtime — skipping.';
  END;
END $$;


-- ============================================================
-- ANONYMOUS USER CLEANUP (run periodically via a cron job or manually)
-- Deletes anonymous users who never converted, older than 30 days
-- ============================================================
-- delete from auth.users
-- where is_anonymous is true and created_at < now() - interval '30 days';


-- ============================================================
-- SETUP CHECKLIST
-- ============================================================
-- [1] Run this SQL in Supabase Dashboard → SQL Editor
-- [2] Enable Anonymous sign-ins:
--     Dashboard → Authentication → Providers → Anonymous → Enable
-- [3] (Recommended) Enable Invisible Captcha for Anonymous sign-ins:
--     Dashboard → Authentication → Settings → Enable Captcha
--     (Prevents abuse / database bloat from bot sign-ins)
-- [4] Load the extension from extension/dist/ in Chrome
-- ============================================================

-- 4. SHORTLISTED PROPERTIES (The Upvote/Downvote Board)
CREATE TABLE IF NOT EXISTS public.shortlisted_properties (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  added_by        UUID REFERENCES public.profiles(id) NOT NULL,
  property_title  TEXT NOT NULL,
  property_url    TEXT NOT NULL,
  price           NUMERIC(12, 2) DEFAULT 0.00,
  image_url       TEXT,
  upvotes         UUID[] DEFAULT '{}', -- Array of user IDs who upvoted
  downvotes       UUID[] DEFAULT '{}', -- Array of user IDs who downvoted
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.shortlisted_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shortlist_select_all" ON public.shortlisted_properties;
CREATE POLICY "shortlist_select_all" ON public.shortlisted_properties
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "shortlist_insert_all" ON public.shortlisted_properties;
CREATE POLICY "shortlist_insert_all" ON public.shortlisted_properties
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "shortlist_update_all" ON public.shortlisted_properties;
CREATE POLICY "shortlist_update_all" ON public.shortlisted_properties
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Enable Realtime for the board
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shortlisted_properties;
  EXCEPTION WHEN duplicate_object THEN
    RAISE NOTICE 'shortlisted_properties is already in supabase_realtime - skipping.';
  END;
END $$;
