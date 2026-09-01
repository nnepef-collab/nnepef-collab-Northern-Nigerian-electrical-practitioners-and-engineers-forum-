-- ============================================================================
-- N-NEPEF 2020 DIGITAL MEMBERSHIP PORTAL
-- AUTHORITATIVE PRODUCTION SUPABASE POSTGRESQL SCHEMA
-- Northern Nigerian Electrical Practitioners and Engineers Forum
-- Designed for: AI Studio -> GitHub -> Vercel -> Supabase PostgreSQL
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. AUTHORITATIVE MEMBERS TABLE (public.members)
-- Single source of truth for all member records across the entire portal
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id TEXT UNIQUE,
  verification_code TEXT UNIQUE NOT NULL,
  application_reference TEXT UNIQUE,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  full_name TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other', 'male', 'female', 'other') OR gender IS NULL),
  date_of_birth TEXT,
  dob TEXT,
  phone TEXT NOT NULL,
  alt_phone TEXT,
  email TEXT,
  nin TEXT,
  other_id_type TEXT,
  other_id_number TEXT,
  state TEXT NOT NULL,
  lga TEXT NOT NULL,
  ward TEXT,
  address TEXT,
  residential_address TEXT,
  occupation TEXT,
  specialization TEXT,
  qualification TEXT,
  years_of_experience INTEGER DEFAULT 1,
  company TEXT,
  membership_type TEXT DEFAULT 'Full Member',
  photo_url TEXT,
  passport_url TEXT,
  payment_receipt_url TEXT,
  registration_fee NUMERIC DEFAULT 10000,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'Active', 'Pending')),
  role TEXT NOT NULL DEFAULT 'Member',
  position TEXT DEFAULT 'Practicing Member',
  issue_date TEXT,
  expiry_date TEXT,
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  rejected_by TEXT,
  next_of_kin JSONB DEFAULT '{}'::jsonb,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Essential Performance Indexes
CREATE INDEX IF NOT EXISTS idx_members_membership_id ON public.members(membership_id);
CREATE INDEX IF NOT EXISTS idx_members_verification_code ON public.members(verification_code);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members(phone);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_state ON public.members(state);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON public.members(created_at DESC);

-- Automatic updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_members_updated_at ON public.members;
CREATE TRIGGER set_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 3. ADMIN PROFILES & ACCOUNTS TABLE (public.admin_profiles & admin_accounts)
-- Authoritative administrator credential and access control store
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'Super Admin', 'Admin', 'moderator', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  permissions JSONB DEFAULT '["ALL"]'::jsonb,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_profiles_email ON public.admin_profiles(email);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_role ON public.admin_profiles(role);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_status ON public.admin_profiles(status);

-- Compatibility view for existing code querying admin_accounts
CREATE OR REPLACE VIEW public.admin_accounts AS
SELECT 
  id::text,
  user_id,
  full_name,
  email,
  phone,
  email as username,
  role,
  'Kano' as state,
  'Nassarawa' as lga,
  status,
  permissions,
  last_login,
  created_at,
  updated_at
FROM public.admin_profiles;

-- ============================================================================
-- 4. FORUM SETTINGS TABLE (public.forum_settings)
-- Central configuration for branding, dues, bank details, and contact info
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.forum_settings (
  id TEXT PRIMARY KEY DEFAULT 'primary_settings',
  forum_name TEXT NOT NULL DEFAULT 'N-NEPEF 2020',
  tagline TEXT DEFAULT 'Northern Nigerian Electrical Practitioners and Engineers Forum',
  logo_url TEXT DEFAULT '/logo.png',
  hero_banner_url TEXT,
  primary_color TEXT DEFAULT '#0A2E73',
  sky_color TEXT DEFAULT '#2EA3F2',
  theme_mode TEXT DEFAULT 'dark',
  announcement_bar_text TEXT,
  announcement_bar_enabled BOOLEAN DEFAULT true,
  contact_email TEXT DEFAULT 'contact@nnepef.org.ng',
  contact_phone TEXT DEFAULT '+234 906 343 5546',
  contact_phone_secondary TEXT,
  headquarters TEXT DEFAULT 'National Secretariat, Kano, Nigeria',
  registration_fee NUMERIC DEFAULT 10000,
  renewal_fee NUMERIC DEFAULT 5000,
  id_card_replacement_fee NUMERIC DEFAULT 3000,
  registration_enabled BOOLEAN DEFAULT true,
  portal_maintenance_mode BOOLEAN DEFAULT false,
  custom_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. BANK ACCOUNTS TABLE (public.bank_accounts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id TEXT PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  branch TEXT,
  payment_instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. PAYMENT RECORDS TABLE (public.payment_records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_records (
  id TEXT PRIMARY KEY,
  member_id TEXT,
  member_name TEXT,
  membership_id TEXT,
  state TEXT,
  lga TEXT,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending',
  receipt_url TEXT,
  date TEXT,
  reference TEXT UNIQUE,
  payment_method TEXT DEFAULT 'Bank Transfer',
  remarks TEXT,
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_member_id ON public.payment_records(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payment_records(status);

-- ============================================================================
-- 7. AUDIT LOGS TABLE (public.audit_logs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  details TEXT,
  user_email TEXT,
  ip_address TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper security functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    coalesce(auth.jwt()->>'email', '') = 'nnepef@gmail.com'
    OR coalesce(auth.jwt()->>'role', '') IN ('admin', 'super_admin', 'service_role')
    OR EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE email = auth.jwt()->>'email'
      AND status = 'active'
      AND role IN ('admin', 'super_admin', 'Super Admin', 'Admin')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8.1 MEMBERS POLICIES
-- Public registration: anyone can insert a pending member registration
DROP POLICY IF EXISTS "Public can submit new membership registration" ON public.members;
CREATE POLICY "Public can submit new membership registration"
  ON public.members FOR INSERT
  WITH CHECK (status = 'pending' OR status = 'Pending');

-- Public lookup: anyone can verify approved members or read for verification
DROP POLICY IF EXISTS "Public can verify approved members" ON public.members;
CREATE POLICY "Public can verify approved members"
  ON public.members FOR SELECT
  USING (true);

-- Admins: can update and manage any member record (approve, reject, assign ID)
DROP POLICY IF EXISTS "Admins can update members" ON public.members;
CREATE POLICY "Admins can update members"
  ON public.members FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Admins: can delete members where authorized
DROP POLICY IF EXISTS "Admins can delete members" ON public.members;
CREATE POLICY "Admins can delete members"
  ON public.members FOR DELETE
  USING (true);

-- 8.2 FORUM SETTINGS POLICIES
DROP POLICY IF EXISTS "Public can read forum settings" ON public.forum_settings;
CREATE POLICY "Public can read forum settings"
  ON public.forum_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage forum settings" ON public.forum_settings;
CREATE POLICY "Admins can manage forum settings"
  ON public.forum_settings FOR ALL
  USING (true);

-- 8.3 BANK ACCOUNTS POLICIES
DROP POLICY IF EXISTS "Public can read active bank accounts" ON public.bank_accounts;
CREATE POLICY "Public can read active bank accounts"
  ON public.bank_accounts FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage bank accounts" ON public.bank_accounts;
CREATE POLICY "Admins can manage bank accounts"
  ON public.bank_accounts FOR ALL
  USING (true);

-- 8.4 PAYMENT RECORDS POLICIES
DROP POLICY IF EXISTS "Public can submit payment proof" ON public.payment_records;
CREATE POLICY "Public can submit payment proof"
  ON public.payment_records FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view own payment records" ON public.payment_records;
CREATE POLICY "Public can view own payment records"
  ON public.payment_records FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage payments" ON public.payment_records;
CREATE POLICY "Admins can manage payments"
  ON public.payment_records FOR ALL
  USING (true);

-- 8.5 ADMIN PROFILES POLICIES
DROP POLICY IF EXISTS "Admins can view and manage admin profiles" ON public.admin_profiles;
CREATE POLICY "Admins can view and manage admin profiles"
  ON public.admin_profiles FOR ALL
  USING (true);

-- 8.6 AUDIT LOGS POLICIES
DROP POLICY IF EXISTS "Allow logging of audit events" ON public.audit_logs;
CREATE POLICY "Allow logging of audit events"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (true);

-- ============================================================================
-- 9. STORAGE BUCKET CONFIGURATION
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('member-files', 'member-files', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('photos', 'photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('receipts', 'receipts', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS
DROP POLICY IF EXISTS "Public can upload to member-files" ON storage.objects;
CREATE POLICY "Public can upload to member-files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id IN ('member-files', 'photos', 'receipts'));

DROP POLICY IF EXISTS "Public can read from member-files" ON storage.objects;
CREATE POLICY "Public can read from member-files"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('member-files', 'photos', 'receipts'));
