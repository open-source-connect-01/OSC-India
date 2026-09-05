-- ==============================================================================
-- Initial Admin Setup Script
-- Replace 'your-admin-email@example.com' with the actual admin email
-- ==============================================================================

UPDATE public.profiles
SET is_admin = TRUE,
    role = 'admin',
    score = 0,
    merged_prs = 0,
    projects_count = 0
WHERE email = 'your-admin-email@example.com';
