-- ============================================================================
-- N-NEPEF 2020 DIGITAL PORTAL - UNIFIED PRODUCTION DATABASE MIGRATION & SCHEMA
-- Northern Nigerian Electrical Practitioners and Engineers Forum
-- Idempotent, Non-Destructive, Preserves All Existing Data
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. SECURE AUTHORIZATION HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT (
    -- Service role bypass for serverless API handlers
    auth.role() = 'service_role'
    -- Trusted Supabase app_metadata claims
    OR (auth.jwt()->'app_metadata'->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    -- Active administrative personnel account verification
    OR EXISTS (
      SELECT 1 FROM public.admin_accounts 
      WHERE (user_id = auth.uid() OR email = auth.jwt()->>'email') 
      AND LOWER(status) = 'active'
    )
    -- Active administrative member profile verification
    OR EXISTS (
      SELECT 1 FROM public.members 
      WHERE (user_id = auth.uid() OR id = auth.uid()::text) 
      AND LOWER(role) IN ('admin', 'super_admin', 'super admin', 'administrator')
      AND LOWER(status) IN ('approved', 'active')
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT (
    auth.role() = 'service_role'
    OR (auth.jwt()->'app_metadata'->>'role') IN ('super_admin', 'super admin')
    OR (auth.jwt()->>'role') IN ('super_admin', 'super admin')
    OR EXISTS (
      SELECT 1 FROM public.admin_accounts 
      WHERE (user_id = auth.uid() OR email = auth.jwt()->>'email') 
      AND LOWER(role) IN ('super_admin', 'super admin')
      AND LOWER(status) = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.members 
      WHERE (user_id = auth.uid() OR id = auth.uid()::text) 
      AND LOWER(role) IN ('super_admin', 'super admin')
      AND LOWER(status) IN ('approved', 'active')
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated, service_role;

-- ============================================================================
-- 3. CORE TABLES (IDEMPOTENT CREATION)
-- ============================================================================

-- 3.1 FORUM SETTINGS
CREATE TABLE IF NOT EXISTS public.forum_settings (
  id TEXT PRIMARY KEY DEFAULT 'primary_settings',
  forum_name TEXT NOT NULL DEFAULT 'N-NEPEF 2020',
  tagline TEXT DEFAULT 'Northern Nigerian Electrical Practitioners and Engineers Forum',
  logo_url TEXT,
  hero_banner_url TEXT,
  primary_color TEXT DEFAULT '#0A2E73',
  sky_color TEXT DEFAULT '#2EA3F2',
  theme_mode TEXT DEFAULT 'dark',
  announcement_bar_text TEXT,
  announcement_bar_enabled BOOLEAN DEFAULT true,
  contact_email TEXT DEFAULT 'contact@nnepef.org.ng',
  contact_phone TEXT DEFAULT '+234 802 333 3937',
  contact_phone_secondary TEXT,
  contact_phone_tertiary TEXT,
  headquarters TEXT DEFAULT 'National Secretariat, Kano, Nigeria',
  social_facebook TEXT,
  social_twitter TEXT,
  social_linkedin TEXT,
  social_youtube TEXT,
  social_whatsapp TEXT,
  registration_fee NUMERIC DEFAULT 10000,
  renewal_fee NUMERIC DEFAULT 5000,
  id_card_replacement_fee NUMERIC DEFAULT 3000,
  registration_enabled BOOLEAN DEFAULT true,
  portal_maintenance_mode BOOLEAN DEFAULT false,
  custom_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 BANK ACCOUNTS
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

-- 3.3 FEE CATEGORIES
CREATE TABLE IF NOT EXISTS public.fee_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  description TEXT,
  instructions TEXT,
  deadline TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.4 PRIMARY MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  membership_id TEXT UNIQUE,
  application_reference TEXT UNIQUE,
  verification_code TEXT,
  full_name TEXT NOT NULL,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  gender TEXT DEFAULT 'Male',
  dob TEXT,
  date_of_birth TEXT,
  phone TEXT,
  email TEXT,
  nin TEXT,
  nin_number TEXT,
  state TEXT DEFAULT 'Kano',
  lga TEXT DEFAULT 'Kano Municipal',
  ward TEXT,
  address TEXT,
  residential_address TEXT,
  occupation TEXT DEFAULT 'Practitioner',
  specialization TEXT,
  qualification TEXT,
  membership_type TEXT DEFAULT 'Full Member',
  years_of_experience INTEGER DEFAULT 1,
  company TEXT,
  passport_url TEXT,
  passport_photo_url TEXT,
  payment_receipt_url TEXT,
  next_of_kin JSONB DEFAULT '{}'::jsonb,
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
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent Column Alterations (In case table already existed with missing columns)
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS membership_id TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS application_reference TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS verification_code TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Male';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS dob TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS date_of_birth TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS nin TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS nin_number TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Kano';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS lga TEXT DEFAULT 'Kano Municipal';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS ward TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS residential_address TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS occupation TEXT DEFAULT 'Practitioner';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS qualification TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS membership_type TEXT DEFAULT 'Full Member';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS years_of_experience INTEGER DEFAULT 1;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS passport_url TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS passport_photo_url TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS next_of_kin JSONB DEFAULT '{}'::jsonb;
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
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Members Indexes
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members(phone);
CREATE INDEX IF NOT EXISTS idx_members_membership_id ON public.members(membership_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_state ON public.members(state);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_app_ref ON public.members(application_reference);
CREATE INDEX IF NOT EXISTS idx_members_nin ON public.members(nin);

-- 3.5 PAYMENT RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.payment_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  member_id TEXT REFERENCES public.members(id) ON DELETE SET NULL,
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

-- Idempotent Column Alterations on payment_records
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS member_id TEXT REFERENCES public.members(id) ON DELETE SET NULL;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS member_name TEXT;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS membership_id TEXT;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS lga TEXT;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Bank Transfer';
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.payment_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_payments_member_id ON public.payment_records(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payment_records(reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payment_records(status);

-- 3.6 ADMIN ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  username TEXT,
  role TEXT NOT NULL DEFAULT 'Admin',
  state TEXT,
  lga TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  permissions JSONB DEFAULT '["ALL"]'::jsonb,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.admin_accounts ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.admin_accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.admin_accounts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.admin_accounts ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.admin_accounts ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Admin';
ALTER TABLE public.admin_accounts ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.admin_accounts ADD COLUMN IF NOT EXISTS lga TEXT;
ALTER TABLE public.admin_accounts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.admin_accounts ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '["ALL"]'::jsonb;
ALTER TABLE public.admin_accounts ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_admin_accounts_email ON public.admin_accounts(email);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_user_id ON public.admin_accounts(user_id);

-- Compatibility VIEW: admin_profiles (points to admin_accounts so both code styles work seamlessly)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_profiles') THEN
    CREATE OR REPLACE VIEW public.admin_profiles AS
    SELECT id, user_id, full_name, email, phone, username, role, state, lga, status, permissions, last_login, created_at, updated_at
    FROM public.admin_accounts;
  END IF;
END $$;

-- 3.7 EXECUTIVES TABLE
CREATE TABLE IF NOT EXISTS public.executives (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'national',
  state TEXT,
  lga TEXT,
  committee TEXT,
  photo_url TEXT,
  email TEXT,
  phone TEXT,
  bio TEXT,
  term TEXT DEFAULT '2024 - 2026',
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.8 ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  pinned BOOLEAN DEFAULT false,
  target_group TEXT DEFAULT 'all',
  target_state TEXT,
  scheduled_date TEXT,
  push_sent BOOLEAN DEFAULT false,
  author TEXT DEFAULT 'National Secretariat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.9 NEWS ARTICLES TABLE
CREATE TABLE IF NOT EXISTS public.news_articles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Announcements',
  summary TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  author TEXT,
  date TEXT,
  featured BOOLEAN DEFAULT false,
  comments_count INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.10 EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  location TEXT,
  state TEXT,
  description TEXT,
  is_virtual BOOLEAN DEFAULT false,
  virtual_link TEXT,
  rsvp_count INTEGER DEFAULT 0,
  capacity INTEGER DEFAULT 500,
  qr_code TEXT,
  certificates_enabled BOOLEAN DEFAULT false,
  photos JSONB DEFAULT '[]'::jsonb,
  videos JSONB DEFAULT '[]'::jsonb,
  speakers JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.11 DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Circular',
  file_url TEXT NOT NULL,
  file_size TEXT,
  format TEXT DEFAULT 'PDF',
  min_role TEXT DEFAULT 'all',
  upload_date TEXT,
  downloads_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.12 GALLERY ALBUMS TABLE
CREATE TABLE IF NOT EXISTS public.gallery_albums (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  category TEXT,
  date TEXT,
  cover_url TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  videos JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.13 CONTACT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  date TEXT,
  status TEXT DEFAULT 'unread',
  reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.14 RENEWAL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.renewal_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  member_id TEXT NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  position TEXT,
  passport_url TEXT,
  signature_url TEXT,
  receipt_url TEXT,
  state TEXT,
  lga TEXT,
  request_date TEXT,
  status TEXT DEFAULT 'Pending',
  remarks TEXT,
  rejection_reason TEXT,
  approval_date TEXT,
  expiry_date TEXT,
  printed_count INTEGER DEFAULT 0,
  id_card_design_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.15 AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- 3.16 NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  target_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.17 NOTIFICATION DELIVERY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  recipient_name TEXT,
  recipient_contact TEXT,
  channel TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  subject TEXT,
  message_preview TEXT,
  error_message TEXT,
  reference_id TEXT,
  gateway_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.18 CMS FILES TABLE
CREATE TABLE IF NOT EXISTS public.cms_files (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'image',
  size TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. PUBLIC VERIFIED MEMBERS VIEW (Protects sensitive PII: NIN, Phone, Address)
-- ============================================================================

CREATE OR REPLACE VIEW public.public_verified_members
AS
SELECT 
  id,
  membership_id,
  verification_code,
  application_reference,
  full_name,
  state,
  lga,
  occupation,
  specialization,
  qualification,
  membership_type,
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
WHERE LOWER(TRIM(status)) IN ('approved', 'active');

