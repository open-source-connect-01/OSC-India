-- ==============================================================================
-- OSC-India: Unified Backend Migration Script
-- Based on plan.md (Architecture & Implementation Blueprint)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop old incompatible profiles table if it exists
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 3. Create the unified 'profiles' table exactly as specified in plan.md
CREATE TABLE public.profiles (
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

-- 4. Create Performance & Lookup Indexes
CREATE INDEX idx_profiles_role ON public.profiles (role);
CREATE INDEX idx_profiles_score ON public.profiles (score DESC);
CREATE INDEX idx_profiles_github ON public.profiles (github);
CREATE INDEX idx_profiles_email ON public.profiles (email);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Define RLS Policies
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

-- 7. Trigger Function to automatically create profile row on auth signup
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
    badges_created,
    tech_stack
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
    0,
    '{}'
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

-- 8. Attach Trigger to Supabase Auth table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. Enable Realtime Replication for the Leaderboard
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
