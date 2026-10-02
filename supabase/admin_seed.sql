-- ==============================================================================
-- Admin Setup Script
-- Promotes specified emails to full admin role.
-- Run this in the Supabase SQL Editor against the production database.
-- ==============================================================================

-- Primary admin
UPDATE public.profiles
SET is_admin = TRUE,
    role = 'admin',
    score = 0,
    merged_prs = 0,
    projects_count = 0
WHERE email = 'sayanghosh1887@gmail.com';

-- Bhuvansh Kataria – admin (not a contributor)
UPDATE public.profiles
SET is_admin = TRUE,
    role = 'admin',
    score = 0,
    merged_prs = 0,
    projects_count = 0
WHERE email = 'bhuvanshkataria@gmail.com';
