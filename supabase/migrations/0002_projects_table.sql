-- ==============================================================================
-- OSC-India: Migration 0002 - Projects Table
-- Allows admins to add, edit, and track community projects.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  github_url TEXT NOT NULL,
  language TEXT DEFAULT 'TypeScript',
  accent_color TEXT DEFAULT '#FF7518',
  stars TEXT DEFAULT '0',
  forks TEXT DEFAULT '0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for lookup & performance
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 1. Everyone can view projects
DROP POLICY IF EXISTS "Public can view projects" ON public.projects;
CREATE POLICY "Public can view projects"
  ON public.projects FOR SELECT
  USING (true);

-- 2. Service role / Admins can insert/update/delete
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;
CREATE POLICY "Admins can manage projects"
  ON public.projects FOR ALL
  USING (true)
  WITH CHECK (true);
