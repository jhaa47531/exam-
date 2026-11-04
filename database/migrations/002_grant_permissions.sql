-- ====================================================================
-- EXAMPRO DATABASE PERMISSION & RLS GRANTS
-- Version: 002_grant_permissions.sql
-- Description: Explicitly grants schema and table privileges to service_role,
-- authenticated, and anon roles in Supabase PostgreSQL.
-- Run this in your Supabase SQL Editor if any table reports 42501 (permission denied).
-- ====================================================================

-- 1. Grant usage on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;

-- 2. Grant full CRUD privileges on ALL existing tables to service_role and postgres
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres;

-- 3. Grant authenticated users permissions (governed by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. Grant anon users read-only access to course catalog and student registration
GRANT SELECT ON public.courses, public.semesters TO anon;
GRANT SELECT, INSERT ON public.profiles TO anon;

-- 5. Alter default privileges so future tables and sequences inherit grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
