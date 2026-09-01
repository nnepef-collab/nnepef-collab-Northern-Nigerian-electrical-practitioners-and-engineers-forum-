-- ============================================================================
-- N-NEPEF 2020 DIGITAL PORTAL – PRODUCTION DATABASE FIX & MIGRATIONS
-- Safe migration: preserves all existing data, tables, and columns.
-- ============================================================================

-- 1. Ensure members table exists and has all required columns safely
CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY,
  user_id UUID,
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
  state TEXT NOT NULL,
  lga TEXT NOT NULL,
  address TEXT,
  residential_address TEXT,
  occupation TEXT,
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

-- Safe column additions if table was created in an earlier version
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS membership_id TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS application_reference TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Male';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS dob TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS nin TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS nin_number TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS residential_address TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS occupation TEXT;
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

-- 2. Indexes for fast querying across 1000+ members
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON public.members(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members(phone);
CREATE INDEX IF NOT EXISTS idx_members_membership_id ON public.members(membership_id);
CREATE INDEX IF NOT EXISTS idx_members_state ON public.members(state);
CREATE INDEX IF NOT EXISTS idx_members_lga ON public.members(lga);

-- 3. Public Verified Members View
CREATE OR REPLACE VIEW public.public_verified_members AS
SELECT 
  id,
  membership_id,
  full_name,
  state,
  lga,
  occupation,
  specialization,
  company,
  status,
  position,
  issue_date,
  expiry_date,
  passport_url,
  passport_photo_url,
  registered_at,
  approved_at
FROM public.members
WHERE LOWER(status) IN ('approved', 'active');

-- ----------------------------------------------------------------------------
-- 0. Server-Authoritative is_admin function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT (
    auth.role() = 'service_role'
    OR (auth.jwt()->'app_metadata'->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->>'email') IN ('nnepef@gmail.com', 'superadmin@nepef.org.ng', 'admin@nepef.org.ng', 'ahmadhussainiali2020@gmail.com')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- 4. Row Level Security Configuration
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Drop obsolete policies to avoid conflicts
DROP POLICY IF EXISTS "Public Insert Member Registration" ON public.members;
DROP POLICY IF EXISTS "Public Verification Read Members" ON public.members;
DROP POLICY IF EXISTS "Member & Admin Update Profile" ON public.members;
DROP POLICY IF EXISTS "Admin Delete Members" ON public.members;
DROP POLICY IF EXISTS "Allow public insert member applications" ON public.members;
DROP POLICY IF EXISTS "Allow select members" ON public.members;
DROP POLICY IF EXISTS "Allow read members" ON public.members;
DROP POLICY IF EXISTS "Allow update members" ON public.members;
DROP POLICY IF EXISTS "Allow delete members" ON public.members;
DROP POLICY IF EXISTS "Public insert pending member application" ON public.members;
DROP POLICY IF EXISTS "Public read approved members" ON public.members;
DROP POLICY IF EXISTS "Public Verification Approved Only" ON public.members;
DROP POLICY IF EXISTS "Admin Full Access Members" ON public.members;
DROP POLICY IF EXISTS "Allow public insert member registration" ON public.members;
DROP POLICY IF EXISTS "Allow read all members" ON public.members;
DROP POLICY IF EXISTS "Public Applicant Insert Only" ON public.members;

-- 4.1 PUBLIC REGISTRATION INSERT POLICY (anon & authenticated):
-- Public applicants can ONLY submit new registrations in 'pending' status.
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

-- 4.2 PUBLIC VERIFICATION SELECT POLICY (anon & authenticated):
-- Public users can ONLY view members that have been officially approved or active.
CREATE POLICY "Public Verification Approved Only" 
ON public.members FOR SELECT 
TO anon, authenticated
USING (LOWER(TRIM(status)) IN ('approved', 'active'));

-- 4.3 ADMIN FULL CRUD POLICY (Authenticated Admins & Service Role):
-- Authorized administrative officers have full CRUD access.
CREATE POLICY "Admin Full Access Members" 
ON public.members FOR ALL 
TO authenticated, service_role
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 5. Storage Buckets and Policies
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('passports', 'passports', true),
  ('receipts', 'receipts', true),
  ('documents', 'documents', true),
  ('cms_files', 'cms_files', true),
  ('gallery_photos', 'gallery_photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 6. Secure Public Registration Database Functions (RPC)
CREATE OR REPLACE FUNCTION public.public_register_member(
  p_id TEXT,
  p_full_name TEXT,
  p_gender TEXT DEFAULT 'Male',
  p_dob TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_nin TEXT DEFAULT NULL,
  p_state TEXT DEFAULT 'Kano',
  p_lga TEXT DEFAULT 'Kano Municipal',
  p_address TEXT DEFAULT NULL,
  p_occupation TEXT DEFAULT NULL,
  p_specialization TEXT DEFAULT NULL,
  p_qualification TEXT DEFAULT NULL,
  p_years_of_experience INTEGER DEFAULT 0,
  p_company TEXT DEFAULT NULL,
  p_passport_url TEXT DEFAULT NULL,
  p_payment_receipt_url TEXT DEFAULT NULL,
  p_application_reference TEXT DEFAULT NULL,
  p_next_of_kin JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_member public.members%ROWTYPE;
  v_app_ref TEXT;
BEGIN
  -- Generate application reference if not provided
  v_app_ref := COALESCE(p_application_reference, 'APP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0'));

  -- Enforce pending status for public self-registration
  INSERT INTO public.members (
    id,
    full_name,
    gender,
    dob,
    date_of_birth,
    phone,
    email,
    nin,
    nin_number,
    state,
    lga,
    address,
    residential_address,
    occupation,
    specialization,
    qualification,
    years_of_experience,
    company,
    passport_url,
    passport_photo_url,
    payment_receipt_url,
    application_reference,
    next_of_kin,
    status,
    role,
    position,
    registered_at,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(p_id, gen_random_uuid()::text),
    p_full_name,
    COALESCE(p_gender, 'Male'),
    p_dob,
    p_dob,
    p_phone,
    LOWER(TRIM(p_email)),
    p_nin,
    p_nin,
    p_state,
    p_lga,
    p_address,
    p_address,
    p_occupation,
    p_specialization,
    p_qualification,
    COALESCE(p_years_of_experience, 0),
    p_company,
    p_passport_url,
    p_passport_url,
    p_payment_receipt_url,
    v_app_ref,
    COALESCE(p_next_of_kin, '{}'::jsonb),
    'pending',
    'Member',
    'Member',
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING * INTO v_new_member;

  RETURN to_jsonb(v_new_member);
END;
$$;

-- Alias function for backward compatibility
CREATE OR REPLACE FUNCTION public.register_member(
  p_id TEXT,
  p_full_name TEXT,
  p_gender TEXT DEFAULT 'Male',
  p_dob TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_nin TEXT DEFAULT NULL,
  p_state TEXT DEFAULT 'Kano',
  p_lga TEXT DEFAULT 'Kano Municipal',
  p_address TEXT DEFAULT NULL,
  p_occupation TEXT DEFAULT NULL,
  p_specialization TEXT DEFAULT NULL,
  p_qualification TEXT DEFAULT NULL,
  p_years_of_experience INTEGER DEFAULT 0,
  p_company TEXT DEFAULT NULL,
  p_passport_url TEXT DEFAULT NULL,
  p_payment_receipt_url TEXT DEFAULT NULL,
  p_application_reference TEXT DEFAULT NULL,
  p_next_of_kin JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.public_register_member(
    p_id, p_full_name, p_gender, p_dob, p_phone, p_email, p_nin,
    p_state, p_lga, p_address, p_occupation, p_specialization, p_qualification,
    p_years_of_experience, p_company, p_passport_url, p_payment_receipt_url,
    p_application_reference, p_next_of_kin
  );
END;
$$;

-- Grant execution to anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.public_register_member TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_member TO anon, authenticated, service_role;

-- 7. Supabase Realtime Publication for public.members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.members;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Publication already contains table or handled by Supabase Dashboard
END $$;
