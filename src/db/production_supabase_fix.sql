-- ==============================================================================
-- N-NEPEF DIGITAL PORTAL 2020 - PRODUCTION SUPABASE INITIALIZATION & FIX SCRIPT
-- Database: PostgreSQL (Supabase)
-- Authoritative Schema for 'public.members', 'admin_profiles', and RPC Functions
-- ==============================================================================

-- 1. EXTENSIONS & SCHEMA PERMISSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 2. CREATE AUTHORITATIVE 'public.members' TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  membership_id TEXT,
  application_reference TEXT,
  full_name TEXT NOT NULL,
  gender TEXT DEFAULT 'Male',
  dob TEXT,
  date_of_birth TEXT,
  phone TEXT,
  email TEXT,
  nin TEXT,
  nin_number TEXT,
  state TEXT NOT NULL DEFAULT 'Kano',
  lga TEXT NOT NULL DEFAULT 'Kano Municipal',
  address TEXT,
  residential_address TEXT,
  occupation TEXT DEFAULT 'Practitioner',
  specialization TEXT,
  qualification TEXT,
  years_of_experience INTEGER DEFAULT 1,
  company TEXT,
  passport_url TEXT,
  passport_photo_url TEXT,
  payment_receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  role TEXT NOT NULL DEFAULT 'Member',
  position TEXT DEFAULT 'Member',
  issue_date TEXT,
  expiry_date TEXT,
  notes TEXT,
  approval_notification_sent BOOLEAN DEFAULT false,
  approval_notification_sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  rejected_by TEXT,
  rejection_reason TEXT,
  next_of_kin JSONB DEFAULT '{}'::jsonb,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all required columns exist (for upgrade safety)
DO $$
BEGIN
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS membership_id TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS application_reference TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS dob TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS nin_number TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS residential_address TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS specialization TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS qualification TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS years_of_experience INTEGER DEFAULT 1;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS company TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS passport_url TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS passport_photo_url TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Member';
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS position TEXT DEFAULT 'Member';
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS issue_date TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS expiry_date TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS notes TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS approval_notification_sent BOOLEAN DEFAULT false;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS approval_notification_sent_at TIMESTAMPTZ;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS approved_by TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS rejected_by TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS next_of_kin JSONB DEFAULT '{}'::jsonb;
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE public.members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END $$;

-- ------------------------------------------------------------------------------
-- 3. CREATE 'public.admin_profiles' TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator', 'registrar')),
  state TEXT,
  lga TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. CREATE PERFORMANCE INDEXES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_membership_id ON public.members(membership_id);
CREATE INDEX IF NOT EXISTS idx_members_application_ref ON public.members(application_reference);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members(phone);
CREATE INDEX IF NOT EXISTS idx_members_nin ON public.members(nin);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON public.members(created_at DESC);

-- ------------------------------------------------------------------------------
-- 5. HELPER FUNCTION: is_admin()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid()
      AND status = 'active'
      AND role IN ('super_admin', 'admin', 'moderator', 'registrar')
  ) OR (auth.jwt() ->> 'role' = 'service_role');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES ON 'public.members'
-- ------------------------------------------------------------------------------
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Public Applicant Insert Only" ON public.members;
DROP POLICY IF EXISTS "Public Verification Approved Only" ON public.members;
DROP POLICY IF EXISTS "Admin Full Access Members" ON public.members;
DROP POLICY IF EXISTS "Allow Public Registration Insert" ON public.members;
DROP POLICY IF EXISTS "Allow Public Verification" ON public.members;

-- 6.1 Allow Public/Anonymous Applicants to INSERT pending records only
CREATE POLICY "Public Applicant Insert Only" 
  ON public.members FOR INSERT 
  TO anon, authenticated
  WITH CHECK (
    LOWER(TRIM(status)) = 'pending'
    AND (membership_id IS NULL OR membership_id = '')
    AND (approved_at IS NULL)
    AND (approved_by IS NULL)
    AND (rejected_by IS NULL)
  );

-- 6.2 Allow Public/Anonymous to SELECT approved members for public ID card lookup
CREATE POLICY "Public Verification Approved Only" 
  ON public.members FOR SELECT 
  TO anon, authenticated
  USING (LOWER(TRIM(status)) IN ('approved', 'active'));

-- 6.3 Allow Authenticated Admins & Service Role Full Access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admin Full Access Members" 
  ON public.members FOR ALL 
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY ON 'public.admin_profiles'
-- ------------------------------------------------------------------------------
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.admin_profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.admin_profiles FOR SELECT
  TO authenticated, service_role
  USING (public.is_admin());

CREATE POLICY "Super admins can manage all profiles"
  ON public.admin_profiles FOR ALL
  TO authenticated, service_role
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid()
        AND status = 'active'
        AND role = 'super_admin'
    ) OR (auth.jwt() ->> 'role' = 'service_role')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE id = auth.uid()
        AND status = 'active'
        AND role = 'super_admin'
    ) OR (auth.jwt() ->> 'role' = 'service_role')
  );

-- ------------------------------------------------------------------------------
-- 8. AUTHORITATIVE REGISTRATION RPC (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_register_member(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id TEXT;
  v_full_name TEXT;
  v_ref TEXT;
BEGIN
  v_id := COALESCE(p_payload->>'id', 'm-' || replace(gen_random_uuid()::text, '-', ''));
  v_full_name := COALESCE(p_payload->>'full_name', p_payload->>'fullName', 'Applicant');
  v_ref := COALESCE(p_payload->>'application_reference', p_payload->>'applicationReference', 'APP-' || to_char(NOW(), 'YYYY') || '-' || floor(100000 + random() * 900000)::text);

  INSERT INTO public.members (
    id, full_name, gender, dob, date_of_birth, phone, email, nin, nin_number,
    state, lga, address, residential_address, occupation, specialization,
    qualification, years_of_experience, company, passport_url, passport_photo_url,
    payment_receipt_url, status, role, position, application_reference,
    next_of_kin, registered_at, updated_at
  ) VALUES (
    v_id,
    v_full_name,
    COALESCE(p_payload->>'gender', 'Male'),
    p_payload->>'dob',
    COALESCE(p_payload->>'date_of_birth', p_payload->>'dob'),
    p_payload->>'phone',
    LOWER(TRIM(p_payload->>'email')),
    p_payload->>'nin',
    COALESCE(p_payload->>'nin_number', p_payload->>'nin'),
    COALESCE(p_payload->>'state', 'Kano'),
    COALESCE(p_payload->>'lga', 'Kano Municipal'),
    p_payload->>'address',
    COALESCE(p_payload->>'residential_address', p_payload->>'address'),
    COALESCE(p_payload->>'occupation', 'Practitioner'),
    p_payload->>'specialization',
    p_payload->>'qualification',
    COALESCE((p_payload->>'years_of_experience')::INTEGER, 0),
    p_payload->>'company',
    COALESCE(p_payload->>'passport_url', p_payload->>'passport_photo_url'),
    COALESCE(p_payload->>'passport_photo_url', p_payload->>'passport_url'),
    p_payload->>'payment_receipt_url',
    'pending',
    'Member',
    'Member',
    v_ref,
    COALESCE(p_payload->'next_of_kin', '{}'::jsonb),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'id', v_id, 'application_reference', v_ref);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_register_member(JSONB) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 9. NOTIFY PostgREST TO RELOAD SCHEMA CACHE IMMEDIATELY
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
