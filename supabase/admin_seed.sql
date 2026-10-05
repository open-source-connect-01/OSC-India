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
   OR id IN (SELECT id FROM auth.users WHERE lower(email) = 'sayanghosh1887@gmail.com')
   OR lower(email) = 'sayanghosh1887@gmail.com';

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin", "is_admin": true}'::jsonb
WHERE lower(email) = 'sayanghosh1887@gmail.com';

-- 3. All 29 Official Project Admins from Registrations Sheet
-- Promotes them to role 'project-admin', zeroes out contributor scoring, and tags their auth metadata.
UPDATE public.profiles
SET is_admin = FALSE,
    role = 'project-admin',
    score = 0,
    merged_prs = 0
WHERE lower(email) IN (
  '192aakarsh@gmail.com',
  'aditthyassdeepa@gmail.com',
  'adityapainuli2004@gmail.com',
  'aharshisinha2020@gmail.com',
  'aseemprasad0520@gmail.com',
  'ashutoshkumarbhardwaj7@gmail.com',
  'bhuvanshkataria@gmail.com',
  'bnjanani258@gmail.com',
  'dfpkt96@gmail.com',
  'f98561965@gmail.com',
  'gollabharath2007@gmail.com',
  'harsh.vardhanp0901@gmail.com',
  'harshbansal8705@gmail.com',
  'kanishjebamathew.m@gmail.com',
  'karakotigaurav12@gmail.com',
  'karanunique36@gmail.com',
  'kothakapuvishnukiran@gmail.com',
  'kushwahasiddhartha31@gmail.com',
  'logesh@psgbiz.com',
  'mohan191024@gmail.com',
  'pandeysatyam1802@gmail.com',
  'pratyushjha06@gmail.com',
  'rahulkurrey321@gmail.com',
  'sandeshdawkhar13@gmail.com',
  'singhjyatin@gmail.com',
  'soumyamishra788@gmail.com',
  'srigadaakshay@gmail.com',
  'sumangalkaran44@gmail.com',
  'vivektalent200@gmail.com'
)
OR user_id IN (
  SELECT id FROM auth.users WHERE lower(email) IN (
    '192aakarsh@gmail.com',
    'aditthyassdeepa@gmail.com',
    'adityapainuli2004@gmail.com',
    'aharshisinha2020@gmail.com',
    'aseemprasad0520@gmail.com',
    'ashutoshkumarbhardwaj7@gmail.com',
    'bhuvanshkataria@gmail.com',
    'bnjanani258@gmail.com',
    'dfpkt96@gmail.com',
    'f98561965@gmail.com',
    'gollabharath2007@gmail.com',
    'harsh.vardhanp0901@gmail.com',
    'harshbansal8705@gmail.com',
    'kanishjebamathew.m@gmail.com',
    'karakotigaurav12@gmail.com',
    'karanunique36@gmail.com',
    'kothakapuvishnukiran@gmail.com',
    'kushwahasiddhartha31@gmail.com',
    'logesh@psgbiz.com',
    'mohan191024@gmail.com',
    'pandeysatyam1802@gmail.com',
    'pratyushjha06@gmail.com',
    'rahulkurrey321@gmail.com',
    'sandeshdawkhar13@gmail.com',
    'singhjyatin@gmail.com',
    'soumyamishra788@gmail.com',
    'srigadaakshay@gmail.com',
    'sumangalkaran44@gmail.com',
    'vivektalent200@gmail.com'
  )
)
OR lower(github) IN (
  '10-mohan',
  '192aakarsh',
  'aashutoshkumarbhardwaj',
  'aditthyass',
  'adityapainuli',
  'advanceddiscordbot',
  'aharshi3614',
  'anthropicbots',
  'aseemprasad',
  'bhuvansh855',
  'canopus-labs',
  'devsidd2006',
  'elixpo',
  'gauravkarakoti',
  'harsh-vardhan09',
  'harshalkurrey',
  'harshbansal8705',
  'iixii-l192',
  'janani-bn',
  'jugaadlang',
  'jyatin',
  'kanishjebamathewm',
  'karanunix',
  'l3tchupkt',
  'logeshv586-code',
  'pratyushjha06',
  'sandesh13fr',
  'satyampandey-07',
  'soumyamishra-7',
  'srigadaakshaykumar',
  'vishnukothakapu',
  'ytxfsgamerz'
);

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "project-admin", "is_admin": false}'::jsonb
WHERE lower(email) IN (
  '192aakarsh@gmail.com',
  'aditthyassdeepa@gmail.com',
  'adityapainuli2004@gmail.com',
  'aharshisinha2020@gmail.com',
  'aseemprasad0520@gmail.com',
  'ashutoshkumarbhardwaj7@gmail.com',
  'bhuvanshkataria@gmail.com',
  'bnjanani258@gmail.com',
  'dfpkt96@gmail.com',
  'f98561965@gmail.com',
  'gollabharath2007@gmail.com',
  'harsh.vardhanp0901@gmail.com',
  'harshbansal8705@gmail.com',
  'kanishjebamathew.m@gmail.com',
  'karakotigaurav12@gmail.com',
  'karanunique36@gmail.com',
  'kothakapuvishnukiran@gmail.com',
  'kushwahasiddhartha31@gmail.com',
  'logesh@psgbiz.com',
  'mohan191024@gmail.com',
  'pandeysatyam1802@gmail.com',
  'pratyushjha06@gmail.com',
  'rahulkurrey321@gmail.com',
  'sandeshdawkhar13@gmail.com',
  'singhjyatin@gmail.com',
  'soumyamishra788@gmail.com',
  'srigadaakshay@gmail.com',
  'sumangalkaran44@gmail.com',
  'vivektalent200@gmail.com'
);
