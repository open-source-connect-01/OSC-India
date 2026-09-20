-- ==============================================================================
-- OSC-India: Migration 0005 - Align live public.profiles with the app's schema
-- The live table predates 0001 and is missing several columns the code expects
-- (notably updated_at, which made admin role updates fail). Additive + idempotent:
-- nothing is dropped or overwritten.
-- ==============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS linkedin TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '+91';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nexfellow_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Backfill email from the users table where available
UPDATE public.profiles p
SET email = u.email
FROM public.users u
WHERE p.email IS NULL AND u.id = p.user_id;

-- Keep is_admin consistent with role for existing rows
UPDATE public.profiles SET is_admin = (role = 'admin');

-- Indexes from 0003 that depend on is_admin
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_contributors_ranking
  ON public.profiles (score DESC, merged_prs DESC)
  WHERE role = 'contributor' AND is_admin = false;

-- Keep updated_at fresh on every update
CREATE OR REPLACE FUNCTION public.set_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profiles_updated_at();

-- Make PostgREST pick up the new columns immediately
NOTIFY pgrst, 'reload schema';
