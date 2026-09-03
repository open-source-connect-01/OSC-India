-- ==============================================================================
-- OSC-India: Unified Backend Migration Script
-- Based on plan.md (Architecture & Implementation Blueprint)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create the unified 'profiles' table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  github TEXT UNIQUE,
  linkedin TEXT,
  phone TEXT,
  country_code TEXT DEFAULT '+91',
  country TEXT,
  nexfellow_id TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'contributor' CHECK (role IN ('contributor', 'mentor', 'project-admin', 'admin')),
  is_admin BOOLEAN DEFAULT FALSE,
  score INTEGER DEFAULT 0,
  merged_prs INTEGER DEFAULT 0,
  projects_count INTEGER DEFAULT 0,
  badges_created INTEGER DEFAULT 0,
  tech_stack TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all required columns exist in case table was partially created
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'contributor' CHECK (role IN ('contributor', 'mentor', 'project-admin', 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_admin') THEN
    ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'score') THEN
    ALTER TABLE public.profiles ADD COLUMN score INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'merged_prs') THEN
    ALTER TABLE public.profiles ADD COLUMN merged_prs INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'projects_count') THEN
    ALTER TABLE public.profiles ADD COLUMN projects_count INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'badges_created') THEN
    ALTER TABLE public.profiles ADD COLUMN badges_created INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'github') THEN
    ALTER TABLE public.profiles ADD COLUMN github TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'tech_stack') THEN
    ALTER TABLE public.profiles ADD COLUMN tech_stack TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- 3. Create Performance & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_score ON public.profiles (score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_github ON public.profiles (github);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id);

-- 6. Trigger Function to automatically create profile row on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  extracted_github TEXT;
BEGIN
  -- Extract github handle if user logged in with GitHub OAuth
  extracted_github := COALESCE(
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'preferred_username',
    NULL
  );

  INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    avatar_url,
    github,
    role, 
    is_admin,
    score,
    merged_prs,
    projects_count,
    badges_created
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', NULL),
    extracted_github,
    'contributor',
    FALSE,
    0,
    0,
    0,
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    github = COALESCE(public.profiles.github, EXCLUDED.github),
    updated_at = now();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Attach Trigger to Supabase Auth table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Enable Realtime Replication for the Leaderboard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
