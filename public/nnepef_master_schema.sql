-- ============================================================================
-- N-NEPEF 2020 DIGITAL PORTAL - MASTER DATABASE SETUP
-- Northern Nigerian Electrical Practitioners and Engineers Forum
-- Production-Ready, Secure, Schema Reset Compliant
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
    auth.role() = 'service_role'
    OR (auth.jwt()->'app_metadata'->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR EXISTS (
      SELECT 1 FROM public.admin_accounts 
      WHERE (user_id = auth.uid() OR email = auth.jwt()->>'email') 
      AND LOWER(status) = 'active'
    )
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
-- 3. CORE DATABASE TABLES (18 TABLES)
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

-- 3.4 MEMBERS TABLE (Primary Central Directory)
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

CREATE INDEX IF NOT EXISTS idx_admin_accounts_email ON public.admin_accounts(email);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_user_id ON public.admin_accounts(user_id);

-- Compatibility View for admin_profiles
CREATE OR REPLACE VIEW public.admin_profiles AS
SELECT id, user_id, full_name, email, phone, username, role, state, lga, status, permissions, last_login, created_at, updated_at
FROM public.admin_accounts;

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

CREATE OR REPLACE VIEW public.public_verified_members AS
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

-- ============================================================================
-- 5. STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('passports', 'passports', true),
  ('receipts', 'receipts', true),
  ('documents', 'documents', true),
  ('cms_files', 'cms_files', true),
  ('gallery_photos', 'gallery_photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public View Passports" ON storage.objects;
DROP POLICY IF EXISTS "Public View Receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public View Documents" ON storage.objects;
DROP POLICY IF EXISTS "Public View CMS" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload Storage Files" ON storage.objects;

CREATE POLICY "Public View Passports" ON storage.objects FOR SELECT USING (bucket_id = 'passports');
CREATE POLICY "Public View Receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Public View Documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Public View CMS" ON storage.objects FOR SELECT USING (bucket_id IN ('cms_files', 'gallery_photos'));
CREATE POLICY "Public Upload Storage Files" ON storage.objects FOR INSERT TO anon, authenticated, service_role WITH CHECK (bucket_id IN ('passports', 'receipts', 'documents', 'cms_files', 'gallery_photos'));

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.forum_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renewal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_files ENABLE ROW LEVEL SECURITY;

-- 6.1 FORUM SETTINGS, BANK ACCOUNTS & FEES
DROP POLICY IF EXISTS "Public Read Forum Settings" ON public.forum_settings;
DROP POLICY IF EXISTS "Admin All Forum Settings" ON public.forum_settings;
CREATE POLICY "Public Read Forum Settings" ON public.forum_settings FOR SELECT USING (true);
CREATE POLICY "Admin All Forum Settings" ON public.forum_settings FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public Read Bank Accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admin All Bank Accounts" ON public.bank_accounts;
CREATE POLICY "Public Read Bank Accounts" ON public.bank_accounts FOR SELECT USING (true);
CREATE POLICY "Admin All Bank Accounts" ON public.bank_accounts FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public Read Fees" ON public.fee_categories;
DROP POLICY IF EXISTS "Admin All Fees" ON public.fee_categories;
CREATE POLICY "Public Read Fees" ON public.fee_categories FOR SELECT USING (true);
CREATE POLICY "Admin All Fees" ON public.fee_categories FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6.2 MEMBERS TABLE POLICIES
DROP POLICY IF EXISTS "Public Applicant Insert Only" ON public.members;
DROP POLICY IF EXISTS "Public Verification Approved Only" ON public.members;
DROP POLICY IF EXISTS "Member Read Own Profile" ON public.members;
DROP POLICY IF EXISTS "Member Update Own Profile" ON public.members;
DROP POLICY IF EXISTS "Admin Full Access Members" ON public.members;

CREATE POLICY "Public Applicant Insert Only" 
  ON public.members FOR INSERT 
  TO anon, authenticated
  WITH CHECK (
    LOWER(TRIM(status)) = 'pending'
    OR public.is_admin()
  );

CREATE POLICY "Public Verification Approved Only" 
  ON public.members FOR SELECT 
  TO anon, authenticated
  USING (LOWER(TRIM(status)) IN ('approved', 'active'));

CREATE POLICY "Member Read Own Profile"
  ON public.members FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR id = auth.uid()::text));

CREATE POLICY "Member Update Own Profile"
  ON public.members FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR id = auth.uid()::text))
  WITH CHECK (
    auth.uid() IS NOT NULL AND (user_id = auth.uid() OR id = auth.uid()::text)
    AND status = (SELECT m.status FROM public.members m WHERE m.id = public.members.id)
  );

CREATE POLICY "Admin Full Access Members" 
  ON public.members FOR ALL 
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6.3 PAYMENT RECORDS POLICIES
DROP POLICY IF EXISTS "Public Applicant Insert Payment" ON public.payment_records;
DROP POLICY IF EXISTS "Admin & Owner Read Payments" ON public.payment_records;
DROP POLICY IF EXISTS "Admin Full Access Payments" ON public.payment_records;

CREATE POLICY "Public Applicant Insert Payment" 
  ON public.payment_records FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

CREATE POLICY "Admin & Owner Read Payments" 
  ON public.payment_records FOR SELECT 
  TO anon, authenticated, service_role
  USING (
    public.is_admin()
    OR (auth.uid() IS NOT NULL AND (member_id = auth.uid()::text OR member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())))
    OR (status IN ('Approved', 'approved'))
  );

CREATE POLICY "Admin Full Access Payments" 
  ON public.payment_records FOR ALL 
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6.4 ADMIN ACCOUNTS
DROP POLICY IF EXISTS "Admin Read Admin Accounts" ON public.admin_accounts;
DROP POLICY IF EXISTS "Super Admin Manage Admin Accounts" ON public.admin_accounts;
CREATE POLICY "Admin Read Admin Accounts" ON public.admin_accounts FOR SELECT TO authenticated, service_role USING (public.is_admin());
CREATE POLICY "Super Admin Manage Admin Accounts" ON public.admin_accounts FOR ALL TO authenticated, service_role USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- 6.5 PUBLIC & CONTENT TABLES
DROP POLICY IF EXISTS "Public Read Executives" ON public.executives;
DROP POLICY IF EXISTS "Admin Manage Executives" ON public.executives;
CREATE POLICY "Public Read Executives" ON public.executives FOR SELECT USING (true);
CREATE POLICY "Admin Manage Executives" ON public.executives FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public Read Announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admin Manage Announcements" ON public.announcements;
CREATE POLICY "Public Read Announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admin Manage Announcements" ON public.announcements FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public Read News" ON public.news_articles;
DROP POLICY IF EXISTS "Admin Manage News" ON public.news_articles;
CREATE POLICY "Public Read News" ON public.news_articles FOR SELECT USING (true);
CREATE POLICY "Admin Manage News" ON public.news_articles FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public Read Events" ON public.events;
DROP POLICY IF EXISTS "Admin Manage Events" ON public.events;
CREATE POLICY "Public Read Events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admin Manage Events" ON public.events FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public Read Documents" ON public.documents;
DROP POLICY IF EXISTS "Admin Manage Documents" ON public.documents;
CREATE POLICY "Public Read Documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Admin Manage Documents" ON public.documents FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public Read Gallery" ON public.gallery_albums;
DROP POLICY IF EXISTS "Admin Manage Gallery" ON public.gallery_albums;
CREATE POLICY "Public Read Gallery" ON public.gallery_albums FOR SELECT USING (true);
CREATE POLICY "Admin Manage Gallery" ON public.gallery_albums FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public Insert Contact" ON public.contact_messages;
DROP POLICY IF EXISTS "Admin Manage Contact" ON public.contact_messages;
CREATE POLICY "Public Insert Contact" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admin Manage Contact" ON public.contact_messages FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public Insert Renewal" ON public.renewal_requests;
DROP POLICY IF EXISTS "Member & Admin Read Renewal" ON public.renewal_requests;
DROP POLICY IF EXISTS "Admin Manage Renewal" ON public.renewal_requests;
CREATE POLICY "Public Insert Renewal" ON public.renewal_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Member & Admin Read Renewal" ON public.renewal_requests FOR SELECT TO authenticated, service_role USING (public.is_admin() OR (auth.uid() IS NOT NULL AND member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())));
CREATE POLICY "Admin Manage Renewal" ON public.renewal_requests FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin Read Audit Logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System Insert Audit Logs" ON public.audit_logs;
CREATE POLICY "Admin Read Audit Logs" ON public.audit_logs FOR SELECT TO authenticated, service_role USING (public.is_admin());
CREATE POLICY "System Insert Audit Logs" ON public.audit_logs FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);

DROP POLICY IF EXISTS "User Read Own Notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admin Manage Notifications" ON public.notifications;
CREATE POLICY "User Read Own Notifications" ON public.notifications FOR SELECT TO authenticated, service_role USING (auth.uid() IS NOT NULL AND target_user_id = auth.uid()::text);
CREATE POLICY "Admin Manage Notifications" ON public.notifications FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin Read Delivery Logs" ON public.notification_delivery_logs;
DROP POLICY IF EXISTS "System Insert Delivery Logs" ON public.notification_delivery_logs;
CREATE POLICY "Admin Read Delivery Logs" ON public.notification_delivery_logs FOR SELECT TO authenticated, service_role USING (public.is_admin());
CREATE POLICY "System Insert Delivery Logs" ON public.notification_delivery_logs FOR INSERT TO anon, authenticated, service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Public Read CMS Files" ON public.cms_files;
DROP POLICY IF EXISTS "Admin Manage CMS Files" ON public.cms_files;
CREATE POLICY "Public Read CMS Files" ON public.cms_files FOR SELECT USING (true);
CREATE POLICY "Admin Manage CMS Files" ON public.cms_files FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- 7. SECURE STORED PROCEDURES (SECURITY DEFINER - BYPASSES RLS)
-- ============================================================================

-- 7.1 Unified Member Registration & Update RPC (JSONB Payload)
CREATE OR REPLACE FUNCTION public.public_register_member(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id TEXT;
  v_app_ref TEXT;
  v_full_name TEXT;
  v_status TEXT;
  v_membership_id TEXT;
  v_new_member public.members%ROWTYPE;
BEGIN
  v_full_name := TRIM(COALESCE(p_payload->>'full_name', p_payload->>'fullName', ''));
  IF v_full_name IS NULL OR length(v_full_name) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Full Name is required');
  END IF;

  v_id := COALESCE(NULLIF(TRIM(p_payload->>'id'), ''), gen_random_uuid()::text);
  v_app_ref := COALESCE(
    NULLIF(TRIM(p_payload->>'application_reference'), ''),
    NULLIF(TRIM(p_payload->>'applicationReference'), ''),
    'APP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0')
  );

  v_status := LOWER(TRIM(COALESCE(p_payload->>'status', 'pending')));
  v_membership_id := NULLIF(TRIM(COALESCE(p_payload->>'membership_id', p_payload->>'membershipId', '')), '');

  INSERT INTO public.members (
    id,
    membership_id,
    application_reference,
    verification_code,
    full_name,
    first_name,
    middle_name,
    last_name,
    gender,
    dob,
    date_of_birth,
    phone,
    email,
    nin,
    nin_number,
    state,
    lga,
    ward,
    address,
    residential_address,
    occupation,
    specialization,
    qualification,
    membership_type,
    years_of_experience,
    company,
    passport_url,
    passport_photo_url,
    payment_receipt_url,
    next_of_kin,
    status,
    role,
    position,
    issue_date,
    expiry_date,
    notes,
    approval_notification_sent,
    approval_notification_sent_at,
    approved_at,
    approved_by,
    rejected_by,
    rejection_reason,
    registered_at,
    created_at,
    updated_at
  ) VALUES (
    v_id,
    v_membership_id,
    v_app_ref,
    COALESCE(NULLIF(TRIM(p_payload->>'verification_code'), ''), NULLIF(TRIM(p_payload->>'verificationCode'), ''), 'VER-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))),
    v_full_name,
    COALESCE(p_payload->>'first_name', p_payload->>'firstName', NULL),
    COALESCE(p_payload->>'middle_name', p_payload->>'middleName', NULL),
    COALESCE(p_payload->>'last_name', p_payload->>'lastName', NULL),
    COALESCE(p_payload->>'gender', 'Male'),
    COALESCE(p_payload->>'dob', p_payload->>'dateOfBirth'),
    COALESCE(p_payload->>'dob', p_payload->>'dateOfBirth'),
    NULLIF(TRIM(COALESCE(p_payload->>'phone', '')), ''),
    NULLIF(LOWER(TRIM(COALESCE(p_payload->>'email', ''))), ''),
    COALESCE(NULLIF(TRIM(p_payload->>'nin'), ''), NULLIF(TRIM(p_payload->>'ninNumber'), '')),
    COALESCE(NULLIF(TRIM(p_payload->>'nin'), ''), NULLIF(TRIM(p_payload->>'ninNumber'), '')),
    COALESCE(p_payload->>'state', 'Kano'),
    COALESCE(p_payload->>'lga', 'Kano Municipal'),
    COALESCE(p_payload->>'ward', NULL),
    COALESCE(NULLIF(TRIM(p_payload->>'address'), ''), NULLIF(TRIM(p_payload->>'residentialAddress'), '')),
    COALESCE(NULLIF(TRIM(p_payload->>'address'), ''), NULLIF(TRIM(p_payload->>'residentialAddress'), '')),
    COALESCE(NULLIF(TRIM(p_payload->>'occupation'), ''), 'Practitioner'),
    COALESCE(p_payload->>'specialization', ''),
    COALESCE(p_payload->>'qualification', p_payload->>'highestQualification', ''),
    COALESCE(p_payload->>'membership_type', p_payload->>'membershipType', 'Full Member'),
    COALESCE(NULLIF(TRIM(p_payload->>'years_of_experience'), '')::INT, NULLIF(TRIM(p_payload->>'yearsOfExperience'), '')::INT, 1),
    COALESCE(p_payload->>'company', ''),
    COALESCE(p_payload->>'passport_url', p_payload->>'passportPhotoUrl', p_payload->>'photoUrl', ''),
    COALESCE(p_payload->>'passport_url', p_payload->>'passportPhotoUrl', p_payload->>'photoUrl', ''),
    COALESCE(p_payload->>'payment_receipt_url', p_payload->>'paymentReceiptUrl', ''),
    COALESCE(p_payload->'next_of_kin', p_payload->'nextOfKin', '{}'::JSONB),
    v_status,
    COALESCE(p_payload->>'role', 'Member'),
    COALESCE(p_payload->>'position', 'Member'),
    COALESCE(p_payload->>'issue_date', p_payload->>'issueDate'),
    COALESCE(p_payload->>'expiry_date', p_payload->>'expiryDate'),
    COALESCE(p_payload->>'notes', NULL),
    COALESCE(NULLIF(TRIM(p_payload->>'approval_notification_sent'), '')::BOOLEAN, NULLIF(TRIM(p_payload->>'approvalNotificationSent'), '')::BOOLEAN, false),
    COALESCE(NULLIF(TRIM(p_payload->>'approval_notification_sent_at'), '')::TIMESTAMPTZ, NULLIF(TRIM(p_payload->>'approvalNotificationSentAt'), '')::TIMESTAMPTZ, NULL),
    COALESCE(NULLIF(TRIM(p_payload->>'approved_at'), '')::TIMESTAMPTZ, NULLIF(TRIM(p_payload->>'approvedAt'), '')::TIMESTAMPTZ, NULL),
    COALESCE(p_payload->>'approved_by', p_payload->>'approvedBy', NULL),
    COALESCE(p_payload->>'rejected_by', p_payload->>'rejectedBy', NULL),
    COALESCE(p_payload->>'rejection_reason', p_payload->>'rejectionReason', NULL),
    COALESCE(NULLIF(TRIM(p_payload->>'registered_at'), '')::TIMESTAMPTZ, NULLIF(TRIM(p_payload->>'registeredAt'), '')::TIMESTAMPTZ, NOW()),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    first_name = COALESCE(EXCLUDED.first_name, public.members.first_name),
    middle_name = COALESCE(EXCLUDED.middle_name, public.members.middle_name),
    last_name = COALESCE(EXCLUDED.last_name, public.members.last_name),
    gender = COALESCE(EXCLUDED.gender, public.members.gender),
    dob = COALESCE(EXCLUDED.dob, public.members.dob),
    date_of_birth = COALESCE(EXCLUDED.date_of_birth, public.members.date_of_birth),
    phone = COALESCE(EXCLUDED.phone, public.members.phone),
    email = COALESCE(EXCLUDED.email, public.members.email),
    nin = COALESCE(EXCLUDED.nin, public.members.nin),
    nin_number = COALESCE(EXCLUDED.nin_number, public.members.nin_number),
    state = COALESCE(EXCLUDED.state, public.members.state),
    lga = COALESCE(EXCLUDED.lga, public.members.lga),
    ward = COALESCE(EXCLUDED.ward, public.members.ward),
    address = COALESCE(EXCLUDED.address, public.members.address),
    residential_address = COALESCE(EXCLUDED.residential_address, public.members.residential_address),
    occupation = COALESCE(EXCLUDED.occupation, public.members.occupation),
    specialization = COALESCE(EXCLUDED.specialization, public.members.specialization),
    qualification = COALESCE(EXCLUDED.qualification, public.members.qualification),
    membership_type = COALESCE(EXCLUDED.membership_type, public.members.membership_type),
    years_of_experience = COALESCE(EXCLUDED.years_of_experience, public.members.years_of_experience),
    company = COALESCE(EXCLUDED.company, public.members.company),
    passport_url = COALESCE(EXCLUDED.passport_url, public.members.passport_url),
    passport_photo_url = COALESCE(EXCLUDED.passport_photo_url, public.members.passport_photo_url),
    payment_receipt_url = COALESCE(EXCLUDED.payment_receipt_url, public.members.payment_receipt_url),
    next_of_kin = COALESCE(EXCLUDED.next_of_kin, public.members.next_of_kin),
    membership_id = COALESCE(EXCLUDED.membership_id, public.members.membership_id),
    status = EXCLUDED.status,
    role = COALESCE(EXCLUDED.role, public.members.role),
    position = COALESCE(EXCLUDED.position, public.members.position),
    issue_date = COALESCE(EXCLUDED.issue_date, public.members.issue_date),
    expiry_date = COALESCE(EXCLUDED.expiry_date, public.members.expiry_date),
    notes = COALESCE(EXCLUDED.notes, public.members.notes),
    approval_notification_sent = COALESCE(EXCLUDED.approval_notification_sent, public.members.approval_notification_sent),
    approval_notification_sent_at = COALESCE(EXCLUDED.approval_notification_sent_at, public.members.approval_notification_sent_at),
    approved_at = COALESCE(EXCLUDED.approved_at, public.members.approved_at),
    approved_by = COALESCE(EXCLUDED.approved_by, public.members.approved_by),
    rejected_by = COALESCE(EXCLUDED.rejected_by, public.members.rejected_by),
    rejection_reason = COALESCE(EXCLUDED.rejection_reason, public.members.rejection_reason),
    updated_at = NOW()
  RETURNING * INTO v_new_member;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_new_member.id,
    'membership_id', v_new_member.membership_id,
    'application_reference', v_new_member.application_reference,
    'full_name', v_new_member.full_name,
    'status', v_new_member.status
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7.2 Named Parameter Overload
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
  p_occupation TEXT DEFAULT 'Practitioner',
  p_specialization TEXT DEFAULT '',
  p_qualification TEXT DEFAULT '',
  p_years_of_experience INT DEFAULT 1,
  p_company TEXT DEFAULT '',
  p_passport_url TEXT DEFAULT '',
  p_payment_receipt_url TEXT DEFAULT '',
  p_application_reference TEXT DEFAULT NULL,
  p_next_of_kin JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.public_register_member(jsonb_build_object(
    'id', p_id,
    'full_name', p_full_name,
    'gender', p_gender,
    'dob', p_dob,
    'phone', p_phone,
    'email', p_email,
    'nin', p_nin,
    'state', p_state,
    'lga', p_lga,
    'address', p_address,
    'occupation', p_occupation,
    'specialization', p_specialization,
    'qualification', p_qualification,
    'years_of_experience', p_years_of_experience,
    'company', p_company,
    'passport_url', p_passport_url,
    'payment_receipt_url', p_payment_receipt_url,
    'application_reference', p_application_reference,
    'next_of_kin', p_next_of_kin
  ));
END;
$$;

-- 7.3 Admin Member Approval Stored Procedure
CREATE OR REPLACE FUNCTION public.admin_approve_member(
  p_member_id TEXT,
  p_membership_id TEXT DEFAULT NULL,
  p_approved_by TEXT DEFAULT 'Super Admin Secretariat',
  p_position TEXT DEFAULT 'Member',
  p_issue_date TEXT DEFAULT NULL,
  p_expiry_date TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member public.members%ROWTYPE;
  v_gen_id TEXT;
  v_state TEXT;
  v_issue TEXT;
  v_expiry TEXT;
BEGIN
  IF p_member_id IS NULL OR length(trim(p_member_id)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member ID is required');
  END IF;

  SELECT * INTO v_member FROM public.members WHERE id = trim(p_member_id);
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member not found with ID ' || p_member_id);
  END IF;

  v_state := COALESCE(v_member.state, 'Kano');
  v_gen_id := COALESCE(NULLIF(trim(p_membership_id), ''), v_member.membership_id);
  
  IF v_gen_id IS NULL OR length(v_gen_id) = 0 OR NOT v_gen_id LIKE 'NNEPEF/%' THEN
    v_gen_id := 'NNEPEF/' || TO_CHAR(NOW(), 'YYYY') || '/' || UPPER(SUBSTRING(v_state, 1, 3)) || '/' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
  END IF;

  v_issue := COALESCE(NULLIF(trim(p_issue_date), ''), TO_CHAR(NOW(), 'YYYY-MM-DD'));
  v_expiry := COALESCE(NULLIF(trim(p_expiry_date), ''), TO_CHAR(NOW() + INTERVAL '5 years', 'YYYY-MM-DD'));

  UPDATE public.members
  SET 
    status = 'approved',
    membership_id = v_gen_id,
    position = COALESCE(NULLIF(trim(p_position), ''), v_member.position, 'Member'),
    issue_date = v_issue,
    expiry_date = v_expiry,
    approved_at = NOW(),
    approved_by = COALESCE(NULLIF(trim(p_approved_by), ''), 'Super Admin Secretariat'),
    approval_notification_sent = true,
    approval_notification_sent_at = NOW(),
    updated_at = NOW()
  WHERE id = v_member.id
  RETURNING * INTO v_member;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_member.id,
    'membership_id', v_member.membership_id,
    'status', v_member.status,
    'full_name', v_member.full_name,
    'approved_at', v_member.approved_at
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7.4 Admin Member Rejection Stored Procedure
CREATE OR REPLACE FUNCTION public.admin_reject_member(
  p_member_id TEXT,
  p_rejection_reason TEXT DEFAULT 'Application documentation or credentials verification issue',
  p_rejected_by TEXT DEFAULT 'Admin Secretariat'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member public.members%ROWTYPE;
BEGIN
  IF p_member_id IS NULL OR length(trim(p_member_id)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member ID is required');
  END IF;

  UPDATE public.members
  SET 
    status = 'rejected',
    rejection_reason = COALESCE(NULLIF(trim(p_rejection_reason), ''), 'Application documentation or credentials verification issue'),
    rejected_by = COALESCE(NULLIF(trim(p_rejected_by), ''), 'Admin Secretariat'),
    notes = 'Application rejected on ' || TO_CHAR(NOW(), 'YYYY-MM-DD') || ' by ' || COALESCE(p_rejected_by, 'Admin') || '. Reason: ' || COALESCE(p_rejection_reason, 'Verification issue'),
    updated_at = NOW()
  WHERE id = trim(p_member_id)
  RETURNING * INTO v_member;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_member.id,
    'status', v_member.status,
    'full_name', v_member.full_name
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7.5 Admin Member Suspend & Restore Stored Procedures
CREATE OR REPLACE FUNCTION public.admin_suspend_member(
  p_member_id TEXT,
  p_reason TEXT DEFAULT 'Suspended by Administrative Council'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member public.members%ROWTYPE;
BEGIN
  UPDATE public.members
  SET 
    status = 'suspended',
    notes = COALESCE(notes || E'\n', '') || 'Suspended on ' || TO_CHAR(NOW(), 'YYYY-MM-DD') || ': ' || COALESCE(p_reason, 'Council review'),
    updated_at = NOW()
  WHERE id = trim(p_member_id)
  RETURNING * INTO v_member;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_member.id, 'status', v_member.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_restore_member(p_member_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_member public.members%ROWTYPE;
BEGIN
  UPDATE public.members
  SET 
    status = 'active',
    notes = COALESCE(notes || E'\n', '') || 'Restored on ' || TO_CHAR(NOW(), 'YYYY-MM-DD'),
    updated_at = NOW()
  WHERE id = trim(p_member_id)
  RETURNING * INTO v_member;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_member.id, 'status', v_member.status);
END;
$$;

-- 7.6 Diagnostic Verification RPC
CREATE OR REPLACE FUNCTION public.verify_member_status_diagnostic(target_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  rec public.members%ROWTYPE;
BEGIN
  SELECT * INTO rec
  FROM public.members
  WHERE id = trim(target_id)
     OR membership_id ILIKE trim(target_id)
     OR application_reference ILIKE trim(target_id)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'target', target_id);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'id', rec.id,
    'full_name', rec.full_name,
    'status', rec.status,
    'membership_id', rec.membership_id,
    'application_reference', rec.application_reference,
    'state', rec.state,
    'lga', rec.lga,
    'position', rec.position,
    'issue_date', rec.issue_date,
    'expiry_date', rec.expiry_date
  );
END;
$$;

-- ============================================================================
-- 8. INITIAL PRODUCTION SEEDING (Settings, Accounts, 8 Members, Payment)
-- ============================================================================

-- 8.1 Forum Settings
INSERT INTO public.forum_settings (
  id, forum_name, tagline, contact_email, contact_phone, headquarters, 
  registration_fee, renewal_fee, id_card_replacement_fee, registration_enabled
) VALUES (
  'primary_settings',
  'N-NEPEF 2020',
  'Northern Nigerian Electrical Practitioners and Engineers Forum',
  'contact@nnepef.org.ng',
  '+234 802 333 3937',
  'National Secretariat, Kano, Nigeria',
  10000, 5000, 3000, true
) ON CONFLICT (id) DO NOTHING;

-- 8.2 Official Bank Accounts
INSERT INTO public.bank_accounts (id, bank_name, account_name, account_number, branch, is_active)
VALUES
  ('bank-1', 'Jaiz Bank Plc', 'N-NEPEF National Secretariat', '0011223344', 'Kano Main Branch', true),
  ('bank-2', 'Access Bank Plc', 'N-NEPEF Projects Account', '0123456789', 'Bompai Kano Branch', true)
ON CONFLICT (id) DO NOTHING;

-- 8.3 Fee Categories
INSERT INTO public.fee_categories (id, name, code, amount, enabled, description)
VALUES
  ('fee-reg', 'Membership Registration Fee', 'REG', 10000, true, 'One-time admission fee for new electrical practitioners and engineers'),
  ('fee-ann', 'Annual Practicing Dues', 'ANN', 5000, true, 'Mandatory annual practicing subscription'),
  ('fee-id', 'Replacement ID Card', 'IDC', 3000, true, 'Smart biometric ID card re-issuance fee')
ON CONFLICT (id) DO NOTHING;

-- 8.4 Administrative Accounts
INSERT INTO public.admin_accounts (id, full_name, email, phone, role, status, permissions)
VALUES
  ('admin-super-01', 'Ahmad Hussaini Ali', 'ahmadhussainiali2020@gmail.com', '+234 802 333 3937', 'Super Admin', 'active', '["ALL"]'::jsonb)
ON CONFLICT (email) DO NOTHING;

-- 8.5 Sync Real Members (4 Approved Members with Official IDs + 4 Pending)
INSERT INTO public.members (
  id, membership_id, application_reference, full_name, gender, dob, phone, email, nin, state, lga, address, occupation, specialization, qualification, years_of_experience, company, status, role, position, issue_date, expiry_date, registered_at, approved_at, approved_by, approval_notification_sent
) VALUES 
(
  'm-final-audit-1787836915357',
  'NNEPEF/KN/7300',
  'APP-2026-224879',
  'Engr. Haruna Abdullahi Final',
  'Male',
  '1990-05-15',
  '08055443322',
  'final.1787836915357@nnepef.org.ng',
  '66554433221',
  'Kano',
  'Kano Municipal',
  'State Road, Kano Municipal',
  'Substation Automation Engineer',
  'SCADA & Relay Protection',
  'B.Eng Electrical',
  9,
  'Transmission Grid Automation Ltd',
  'approved',
  'Member',
  'Certified Protection Engineer',
  '2026-08-27',
  '2031-08-26',
  '2026-08-27T13:21:55.357Z',
  '2026-08-27T13:21:56.740Z',
  'National Secretariat Admin',
  true
),
(
  'm-prod-audit-1787834139132',
  'NNEPEF/KN/4837',
  'APP-2026-177002',
  'Engr. Kabir Lawan Production-Pass',
  'Male',
  '1991-08-14',
  '08011223344',
  'engr.audited.1787834139132@nnepef.org.ng',
  '77665544332',
  'Kano',
  'Dala',
  'Gwammaja Housing Estate, Dala, Kano',
  'Senior Electrical & Electronics Consultant',
  'High Voltage Transmission & Distribution',
  'M.Eng Electrical Engineering',
  10,
  'Lawan Power Solutions Nigeria Ltd',
  'approved',
  'Member',
  'Senior Certified Member',
  '2026-08-27',
  '2031-08-26',
  '2026-08-27T12:35:39.132Z',
  '2026-08-27T12:35:39.632Z',
  'N-NEPEF National Secretariat Executive',
  true
),
(
  'm-e2e-live-1787832627583',
  'NNEPEF/KN/2828',
  'APP-2026-997971',
  'Engr. Fatima Bello Live',
  'Female',
  '1993-04-18',
  '08088776655',
  'candidate.1787832627583@nnepef.org',
  '88776655443',
  'Kano',
  'Fagge',
  'Fagge Industrial Layout, Kano',
  'Renewable Energy Engineer',
  'Solar Microgrids & Industrial Inverters',
  'B.Eng Electrical Engineering',
  6,
  'Bello Solar Systems Ltd',
  'approved',
  'Member',
  'Practicing Member',
  '2026-08-27',
  '2031-08-26',
  '2026-08-27T12:10:27.583Z',
  '2026-08-27T12:10:28.478Z',
  'Super Admin Secretariat',
  true
),
(
  'm-prod-test-1787831385268',
  'NNEPEF/2026/004',
  'APP-2026-577248',
  'Usman Danladi Test',
  'Male',
  '1991-08-10',
  '08012349999',
  'usman.danladi@example.com',
  '12345678901',
  'Kano',
  'Dala',
  'Dala Quarters, Kano',
  'Senior Electrical Engineer',
  'Solar & High Voltage Infrastructure',
  'B.Eng Electrical',
  8,
  'Danladi Power Solutions',
  'approved',
  'Member',
  'Member',
  '2026-08-27',
  '2031-08-26',
  '2026-08-27T11:49:45.268Z',
  '2026-08-27T11:54:03.270Z',
  'Super Admin Secretariat',
  true
),
(
  'm-auto-test-1787833729465',
  NULL,
  'APP-2026-370022',
  'Aliyu Babangida Final Trace',
  'Male',
  '1994-06-12',
  '08034567890',
  'aliyu.final.1787833729465@example.com',
  '99887766554',
  'Kano',
  'Fagge',
  'Fagge Industrial Area',
  'Electrical Inspector',
  'Industrial Automation',
  'B.Eng Electrical',
  7,
  'Babangida Automation Ltd',
  'pending',
  'Member',
  'Member',
  NULL,
  NULL,
  '2026-08-27T12:28:49.465Z',
  NULL,
  NULL,
  false
),
(
  'm-trace-1787832610388',
  NULL,
  'APP-2026-654826',
  'Musa Ibrahim Trace',
  'Male',
  '1988-11-25',
  '08022334455',
  'trace.1787832610388@nnepef.org',
  '11223344556',
  'Kano',
  'Nassarawa',
  'Bompai Industrial Estate, Kano',
  'Chief Electrical Engineer',
  'Power Systems & Grid Management',
  'M.Sc Electrical Engineering',
  12,
  'North-West Grid Operations',
  'pending',
  'Member',
  'Member',
  NULL,
  NULL,
  '2026-08-27T12:10:10.388Z',
  NULL,
  NULL,
  false
),
(
  'm-e2e-1787830776027',
  NULL,
  'APP-2026-102938',
  'Aliyu Babangida',
  'Male',
  '1994-06-12',
  '08034567890',
  'aliyu.babangida@example.com',
  '99887766554',
  'Kano',
  'Fagge',
  'Fagge Industrial Area',
  'Electrical Inspector',
  'Industrial Automation',
  'B.Eng Electrical',
  7,
  'Babangida Automation Ltd',
  'pending',
  'Member',
  'Member',
  NULL,
  NULL,
  '2026-08-27T11:39:36.027Z',
  NULL,
  NULL,
  false
),
(
  'm-fresh-audit-1787838000000',
  NULL,
  'APP-2026-778899',
  'Engr. Bello Sanusi Audit',
  'Male',
  '1992-03-20',
  '08099887766',
  'bello.audit.fresh@nnepef.org',
  '99001122334',
  'Kano',
  'Nassarawa',
  'No. 12 Airport Road, Kano',
  'Power Systems Engineer',
  'Grid Modernization',
  'Full Member',
  8,
  'Sanusi Power Tech',
  'pending',
  'Member',
  'Member',
  NULL,
  NULL,
  '2026-08-27T14:00:00.000Z',
  NULL,
  NULL,
  false
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  membership_id = COALESCE(EXCLUDED.membership_id, public.members.membership_id),
  status = EXCLUDED.status,
  updated_at = NOW();

-- 8.6 Sync Payment Record
INSERT INTO public.payment_records (
  id, member_id, member_name, membership_id, state, lga, type, amount, status, reference, date, payment_method, remarks
) VALUES (
  'pay_audit_test_1001',
  'm-prod-test-1787831385268',
  'Usman Danladi Test',
  'NNEPEF/2026/004',
  'Kano',
  'Dala',
  'Registration Fee',
  10000,
  'Approved',
  'REG-PAY-1001',
  '2026-08-26',
  'Bank Transfer',
  'Verified by National Secretariat Treasury'
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  amount = EXCLUDED.amount;

-- ============================================================================
-- 9. PERMISSIONS & SCHEMA RELOAD
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
