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

-- Bhuvansh Kataria – project admin for hiero-bot-py (not a contributor)
UPDATE public.profiles
SET is_admin = FALSE,
    role = 'project-admin',
    score = 0,
    merged_prs = 0,
    projects_count = 1
WHERE email = 'bhuvanshkataria@gmail.com';
