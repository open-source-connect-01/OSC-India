-- ==============================================================================
-- Admin & Project Admin Setup Script
-- Run this in the Supabase SQL Editor against the production database.
-- ==============================================================================

-- 1. Ensure required columns exist on public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. Primary admin (Super Admin)
UPDATE public.profiles
SET is_admin = TRUE,
    role = 'admin',
    score = 0,
    merged_prs = 0,
    projects_count = 0,
    email = 'sayanghosh1887@gmail.com'
WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'sayanghosh1887@gmail.com')
   OR id IN (SELECT id FROM auth.users WHERE lower(email) = 'sayanghosh1887@gmail.com');

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin", "is_admin": true}'::jsonb
WHERE lower(email) = 'sayanghosh1887@gmail.com';

-- 3. Bhuvansh Kataria – Project Admin for hiero-bot-py (not a contributor)
UPDATE public.profiles
SET is_admin = FALSE,
    role = 'project-admin',
    score = 0,
    merged_prs = 0,
    projects_count = 1,
    email = 'bhuvanshkataria@gmail.com'
WHERE user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'bhuvanshkataria@gmail.com')
   OR id IN (SELECT id FROM auth.users WHERE lower(email) = 'bhuvanshkataria@gmail.com');

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "project-admin", "is_admin": false}'::jsonb
WHERE lower(email) = 'bhuvanshkataria@gmail.com';
