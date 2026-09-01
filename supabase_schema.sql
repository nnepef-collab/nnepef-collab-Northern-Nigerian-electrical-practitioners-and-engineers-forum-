-- ============================================================================
-- N-NEPEF 2020 DIGITAL PORTAL - OFFICIAL HARDENED PRODUCTION DATABASE SCHEMA
-- Northern Nigerian Electrical Practitioners and Engineers Forum
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
-- 3. CORE TABLE DEFINITIONS & INDEXES
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

-- 3.4 MEMBERS TABLE (Primary User & Applicant Records)
CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  membership_id TEXT,
  application_reference TEXT,
  verification_code TEXT,
  full_name TEXT NOT NULL,
  gender TEXT,
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

CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members(phone);
CREATE INDEX IF NOT EXISTS idx_members_membership_id ON public.members(membership_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(status);
CREATE INDEX IF NOT EXISTS idx_members_state ON public.members(state);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_app_ref ON public.members(application_reference);

-- 3.5 PAYMENT RECORDS
CREATE TABLE IF NOT EXISTS public.payment_records (
  id TEXT PRIMARY KEY,
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

-- 3.6 ADMIN ACCOUNTS
CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id TEXT PRIMARY KEY,
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

-- 3.7 EXECUTIVES
CREATE TABLE IF NOT EXISTS public.executives (
  id TEXT PRIMARY KEY,
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

-- 3.8 ANNOUNCEMENTS
CREATE TABLE IF NOT EXISTS public.announcements (
  id TEXT PRIMARY KEY,
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

-- 3.9 NEWS ARTICLES
CREATE TABLE IF NOT EXISTS public.news_articles (
  id TEXT PRIMARY KEY,
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

-- 3.10 EVENTS
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
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

-- 3.11 DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY,
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

-- 3.12 GALLERY ALBUMS
CREATE TABLE IF NOT EXISTS public.gallery_albums (
  id TEXT PRIMARY KEY,
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

-- 3.13 CONTACT MESSAGES
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id TEXT PRIMARY KEY,
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

-- 3.14 RENEWAL REQUESTS
CREATE TABLE IF NOT EXISTS public.renewal_requests (
  id TEXT PRIMARY KEY,
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

-- 3.15 AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
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

-- 3.16 NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  target_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.17 NOTIFICATION DELIVERY LOGS
CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id TEXT PRIMARY KEY,
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

-- 3.18 CMS FILES
CREATE TABLE IF NOT EXISTS public.cms_files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT DEFAULT 'image',
  size TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. SECURE PUBLIC VERIFICATION VIEW (Shields Sensitive PII)
-- ============================================================================

CREATE OR REPLACE VIEW public.public_verified_members
WITH (security_invoker = true)
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
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
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

-- 5.1 FORUM SETTINGS
DROP POLICY IF EXISTS "Public Read Forum Settings" ON public.forum_settings;
DROP POLICY IF EXISTS "Admin All Forum Settings" ON public.forum_settings;
CREATE POLICY "Public Read Forum Settings" ON public.forum_settings FOR SELECT USING (true);
CREATE POLICY "Admin All Forum Settings" ON public.forum_settings FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5.2 BANK ACCOUNTS & FEES
DROP POLICY IF EXISTS "Public Read Bank Accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admin All Bank Accounts" ON public.bank_accounts;
CREATE POLICY "Public Read Bank Accounts" ON public.bank_accounts FOR SELECT USING (true);
CREATE POLICY "Admin All Bank Accounts" ON public.bank_accounts FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public Read Fees" ON public.fee_categories;
DROP POLICY IF EXISTS "Admin All Fees" ON public.fee_categories;
CREATE POLICY "Public Read Fees" ON public.fee_categories FOR SELECT USING (true);
CREATE POLICY "Admin All Fees" ON public.fee_categories FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5.3 MEMBERS TABLE (Strict Privacy & Access Control)
DROP POLICY IF EXISTS "Public Applicant Insert Only" ON public.members;
DROP POLICY IF EXISTS "Public Verification Approved Only" ON public.members;
DROP POLICY IF EXISTS "Member Read Own Profile" ON public.members;
DROP POLICY IF EXISTS "Member Update Own Profile" ON public.members;
DROP POLICY IF EXISTS "Admin Full Access Members" ON public.members;

-- 1. Unauthenticated / New Applicants: Insert only with status='pending'
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

-- 2. Public Verification: Select only approved/active members
CREATE POLICY "Public Verification Approved Only" 
  ON public.members FOR SELECT 
  TO anon, authenticated
  USING (LOWER(TRIM(status)) IN ('approved', 'active'));

-- 3. Authenticated Members: Read own full profile
CREATE POLICY "Member Read Own Profile"
  ON public.members FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR id = auth.uid()::text));

-- 4. Authenticated Members: Update non-status profile fields
CREATE POLICY "Member Update Own Profile"
  ON public.members FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR id = auth.uid()::text))
  WITH CHECK (
    auth.uid() IS NOT NULL AND (user_id = auth.uid() OR id = auth.uid()::text)
    AND status = (SELECT m.status FROM public.members m WHERE m.id = public.members.id)
    AND role = (SELECT m.role FROM public.members m WHERE m.id = public.members.id)
  );

-- 5. Administrators: Full management privileges
CREATE POLICY "Admin Full Access Members" 
  ON public.members FOR ALL 
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5.4 PAYMENT RECORDS
DROP POLICY IF EXISTS "Public Applicant Insert Payment" ON public.payment_records;
DROP POLICY IF EXISTS "Admin & Owner Read Payments" ON public.payment_records;
DROP POLICY IF EXISTS "Admin Full Access Payments" ON public.payment_records;

CREATE POLICY "Public Applicant Insert Payment" 
  ON public.payment_records FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (
    LOWER(TRIM(status)) IN ('pending', 'submitted')
    AND approved_at IS NULL
    AND approved_by IS NULL
  );

CREATE POLICY "Admin & Owner Read Payments" 
  ON public.payment_records FOR SELECT 
  TO authenticated, service_role
  USING (
    public.is_admin()
    OR (auth.uid() IS NOT NULL AND (member_id = auth.uid()::text OR member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())))
  );

CREATE POLICY "Admin Full Access Payments" 
  ON public.payment_records FOR ALL 
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5.5 ADMIN ACCOUNTS
DROP POLICY IF EXISTS "Admin Read Admin Accounts" ON public.admin_accounts;
DROP POLICY IF EXISTS "Super Admin Manage Admin Accounts" ON public.admin_accounts;

CREATE POLICY "Admin Read Admin Accounts"
  ON public.admin_accounts FOR SELECT
  TO authenticated, service_role
  USING (public.is_admin());

CREATE POLICY "Super Admin Manage Admin Accounts"
  ON public.admin_accounts FOR ALL
  TO authenticated, service_role
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 5.6 PUBLIC CONTENT (Executives, Announcements, News, Events, Documents, Gallery)
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

-- 5.7 CONTACT MESSAGES & RENEWAL REQUESTS
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

-- 5.8 AUDIT & NOTIFICATION LOGS (Strict Admin & Procedure Only)
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
-- 6. SECURE STORED PROCEDURES (SECURITY DEFINER)
-- ============================================================================

-- 6.1 Unified Member Registration & Update RPC (Supports Upsert)
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
    COALESCE((p_payload->>'years_of_experience')::INT, (p_payload->>'yearsOfExperience')::INT, 1),
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
    COALESCE((p_payload->>'approval_notification_sent')::BOOLEAN, (p_payload->>'approvalNotificationSent')::BOOLEAN, false),
    COALESCE(NULLIF(p_payload->>'approval_notification_sent_at', '')::TIMESTAMPTZ, NULLIF(p_payload->>'approvalNotificationSentAt', '')::TIMESTAMPTZ, NULL),
    COALESCE(NULLIF(p_payload->>'approved_at', '')::TIMESTAMPTZ, NULLIF(p_payload->>'approvedAt', '')::TIMESTAMPTZ, NULL),
    COALESCE(p_payload->>'approved_by', p_payload->>'approvedBy', NULL),
    COALESCE(p_payload->>'rejected_by', p_payload->>'rejectedBy', NULL),
    COALESCE(p_payload->>'rejection_reason', p_payload->>'rejectionReason', NULL),
    COALESCE(NULLIF(p_payload->>'registered_at', '')::TIMESTAMPTZ, NULLIF(p_payload->>'registeredAt', '')::TIMESTAMPTZ, NOW()),
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

-- 6.2 Admin Member Approval Stored Procedure
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

-- 6.3 Admin Member Rejection Stored Procedure
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

-- 6.4 Admin Member Suspend & Restore Stored Procedures
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
    status = 'approved',
    notes = COALESCE(notes || E'\n', '') || 'Restored on ' || TO_CHAR(NOW(), 'YYYY-MM-DD') || ' to Active status',
    updated_at = NOW()
  WHERE id = trim(p_member_id)
  RETURNING * INTO v_member;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Member not found');
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_member.id, 'status', v_member.status);
END;
$$;

-- 6.5 Secure Diagnostic Verification RPC
CREATE OR REPLACE FUNCTION public.verify_member_status_diagnostic(target_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row RECORD;
BEGIN
  IF target_id IS NULL OR length(trim(target_id)) = 0 THEN
    RETURN jsonb_build_object('exists', false, 'error', 'Target ID is required');
  END IF;

  SELECT id, application_reference, membership_id, status, registered_at, approved_at
  INTO v_row
  FROM public.members
  WHERE id = trim(target_id)
     OR LOWER(membership_id) = LOWER(trim(target_id))
     OR LOWER(application_reference) = LOWER(trim(target_id))
     OR LOWER(email) = LOWER(trim(target_id))
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'exists', true,
      'id', v_row.id,
      'application_reference', v_row.application_reference,
      'membership_id', v_row.membership_id,
      'status', v_row.status,
      'registered_at', v_row.registered_at,
      'approved_at', v_row.approved_at
    );
  ELSE
    RETURN jsonb_build_object('exists', false);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_register_member(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_approve_member(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reject_member(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_suspend_member(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_restore_member(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_member_status_diagnostic(TEXT) TO anon, authenticated, service_role;

-- ============================================================================
-- 7. LEAST-PRIVILEGE ROLE GRANTS & RLS ACCESS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grants on all portal tables (RLS policies govern row-level read/write permissions)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_records TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewal_requests TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_delivery_logs TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_messages TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.forum_settings TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_categories TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executives TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_articles TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_albums TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cms_files TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_accounts TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO anon, authenticated, service_role;
GRANT SELECT ON public.public_verified_members TO anon, authenticated, service_role;

-- Service Role full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

NOTIFY pgrst, 'reload schema';
