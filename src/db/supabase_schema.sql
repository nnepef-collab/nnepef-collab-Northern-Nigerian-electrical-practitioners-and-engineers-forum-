-- ============================================================================
-- N-NEPEF 2020 DIGITAL PORTAL - OFFICIAL SUPABASE POSTGRESQL SCHEMA
-- Northern Nigerian Electrical Practitioners and Engineers Forum
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. HELPER FUNCTIONS & ENUMS
-- ============================================================================

-- Helper function to check if current authenticated user is an Admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN (
    coalesce(auth.jwt()->>'role', '') IN ('admin', 'super_admin', 'Admin', 'Super Admin')
    OR EXISTS (
      SELECT 1 FROM public.admin_accounts 
      WHERE email = auth.jwt()->>'email' 
      AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.members 
      WHERE (id = auth.uid()::text OR user_id = auth.uid())
      AND role IN ('Admin', 'Super Admin', 'admin', 'super_admin')
    )
  );
END;
$$;

-- Helper function to check if current authenticated user is Super Admin
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN (
    coalesce(auth.jwt()->>'role', '') IN ('super_admin', 'Super Admin')
    OR EXISTS (
      SELECT 1 FROM public.admin_accounts 
      WHERE email = auth.jwt()->>'email' 
      AND role IN ('super_admin', 'Super Admin')
      AND status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM public.members 
      WHERE (id = auth.uid()::text OR user_id = auth.uid())
      AND role IN ('Super Admin', 'super_admin')
    )
  );
END;
$$;

-- ============================================================================
-- 2. TABLE DEFINITIONS
-- ============================================================================

-- 2.1 FORUM SETTINGS
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

-- 2.2 BANK ACCOUNTS
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

-- 2.3 FEE CATEGORIES
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

-- 2.4 MEMBERS TABLE (Primary User & Profiles Store)
CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  membership_id TEXT,
  application_reference TEXT,
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

-- 2.5 PAYMENTS / PAYMENT RECORDS
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
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payment_records(reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payment_records(status);

-- 2.6 ADMIN ACCOUNTS
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

-- 2.7 EXECUTIVES
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

-- 2.8 ANNOUNCEMENTS
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

-- 2.9 NEWS ARTICLES
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

-- 2.10 EVENTS
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

-- 2.11 DOCUMENTS
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

-- 2.12 GALLERY ALBUMS
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

-- 2.13 CONTACT MESSAGES
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

-- 2.14 RENEWAL REQUESTS
CREATE TABLE IF NOT EXISTS public.renewal_requests (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
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

-- 2.15 AUDIT LOGS
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

-- 2.16 NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  target_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.17 NOTIFICATION DELIVERY LOGS
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

-- 2.18 CMS FILES
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
-- 3. PUBLIC VERIFIED MEMBERS VIEW (Strict Data Privacy)
-- ============================================================================
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

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
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

-- ----------------------------------------------------------------------------
-- 0. CENTRALIZED SERVER-AUTHORITATIVE IS_ADMIN FUNCTION
-- Uses app_metadata.role, trusted JWT claims, verified admin emails, or service_role.
-- Never trusts client-controlled user_metadata.
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

-- 4.1 FORUM SETTINGS POLICIES
CREATE POLICY "Public Read Forum Settings" ON public.forum_settings FOR SELECT USING (true);
CREATE POLICY "Admin All Forum Settings" ON public.forum_settings FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4.2 BANK ACCOUNTS & FEES
CREATE POLICY "Public Read Bank Accounts" ON public.bank_accounts FOR SELECT USING (true);
CREATE POLICY "Admin All Bank Accounts" ON public.bank_accounts FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Public Read Fees" ON public.fee_categories FOR SELECT USING (true);
CREATE POLICY "Admin All Fees" ON public.fee_categories FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4.3 MEMBERS POLICIES (Strict Privacy & Security)
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Verification Read Members" ON public.members;
DROP POLICY IF EXISTS "Allow read members" ON public.members;
DROP POLICY IF EXISTS "Members Select Policy" ON public.members;
DROP POLICY IF EXISTS "Public Read Members" ON public.members;
DROP POLICY IF EXISTS "Public Insert Member Registration" ON public.members;
DROP POLICY IF EXISTS "Member & Admin Update Profile" ON public.members;
DROP POLICY IF EXISTS "Admin Delete Members" ON public.members;
DROP POLICY IF EXISTS "Allow insert members" ON public.members;
DROP POLICY IF EXISTS "Allow update members" ON public.members;
DROP POLICY IF EXISTS "Allow delete members" ON public.members;
DROP POLICY IF EXISTS "Public Verification Approved Only" ON public.members;
DROP POLICY IF EXISTS "Admin Full Access Members" ON public.members;
DROP POLICY IF EXISTS "Allow public insert member registration" ON public.members;
DROP POLICY IF EXISTS "Allow read all members" ON public.members;
DROP POLICY IF EXISTS "Public Applicant Insert Only" ON public.members;

-- 4.3.1 PUBLIC REGISTRATION: Allow applicant to INSERT pending registration only
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

-- 4.3.2 PUBLIC VERIFICATION: Public users can ONLY SELECT approved or active members
CREATE POLICY "Public Verification Approved Only" 
  ON public.members FOR SELECT 
  TO anon, authenticated
  USING (LOWER(TRIM(status)) IN ('approved', 'active'));

-- 4.3.3 ADMIN FULL ACCESS: Authenticated admins & service_role have full CRUD across all member records
CREATE POLICY "Admin Full Access Members" 
  ON public.members FOR ALL 
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4.4 PAYMENT RECORDS POLICIES
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert Payment" ON public.payment_records;
DROP POLICY IF EXISTS "Public Read Payments" ON public.payment_records;
DROP POLICY IF EXISTS "Admin Update Payments" ON public.payment_records;
DROP POLICY IF EXISTS "Admin Delete Payments" ON public.payment_records;
DROP POLICY IF EXISTS "Allow public insert payment" ON public.payment_records;
DROP POLICY IF EXISTS "Allow read all payment records" ON public.payment_records;
DROP POLICY IF EXISTS "Allow update payment records" ON public.payment_records;
DROP POLICY IF EXISTS "Allow delete payment records" ON public.payment_records;
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
    OR (auth.uid() IS NOT NULL AND auth.uid()::text = member_id)
  );

CREATE POLICY "Admin Full Access Payments" 
  ON public.payment_records FOR ALL 
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4.5 PUBLIC READ-ALL FOR PORTAL CONTENT
CREATE POLICY "Public Read Executives" ON public.executives FOR SELECT USING (true);
CREATE POLICY "Admin All Executives" ON public.executives FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admin All Announcements" ON public.announcements FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read News" ON public.news_articles FOR SELECT USING (true);
CREATE POLICY "Admin All News" ON public.news_articles FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Admin All Events" ON public.events FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Admin All Documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Gallery" ON public.gallery_albums FOR SELECT USING (true);
CREATE POLICY "Admin All Gallery" ON public.gallery_albums FOR ALL USING (true) WITH CHECK (true);

-- 4.6 CONTACT MESSAGES & RENEWALS
CREATE POLICY "Public Insert Contact" ON public.contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin All Contact" ON public.contact_messages FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Insert Renewal" ON public.renewal_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Read Renewal" ON public.renewal_requests FOR SELECT USING (true);
CREATE POLICY "Admin All Renewal" ON public.renewal_requests FOR ALL USING (true) WITH CHECK (true);

-- 4.7 LOGS & NOTIFICATIONS
CREATE POLICY "Allow Read Audit Logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow Insert Audit Logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow Read Notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Allow Insert Notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow Update Notifications" ON public.notifications FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow Read Delivery Logs" ON public.notification_delivery_logs FOR SELECT USING (true);
CREATE POLICY "Allow Insert Delivery Logs" ON public.notification_delivery_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow Delete Delivery Logs" ON public.notification_delivery_logs FOR DELETE USING (true);

CREATE POLICY "Public Read CMS Files" ON public.cms_files FOR SELECT USING (true);
CREATE POLICY "Admin All CMS Files" ON public.cms_files FOR ALL USING (true) WITH CHECK (true);

-- 4.8 ADMIN ACCOUNTS
CREATE POLICY "Admin Read Admin Accounts" ON public.admin_accounts FOR SELECT USING (true);
CREATE POLICY "Admin Manage Admin Accounts" ON public.admin_accounts FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 5. STORAGE BUCKETS CONFIGURATION (Supabase Storage)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('passports', 'passports', true),
  ('receipts', 'receipts', true),
  ('documents', 'documents', true),
  ('cms_files', 'cms_files', true),
  ('gallery_photos', 'gallery_photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies
-- SELECT: Public access for portal media, documents, and verified images
CREATE POLICY "Public Access Passports" ON storage.objects FOR SELECT USING (bucket_id = 'passports');
CREATE POLICY "Public Access Receipts" ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "Public Access Documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Public Access CMS" ON storage.objects FOR SELECT USING (bucket_id = 'cms_files');
CREATE POLICY "Public Access Gallery" ON storage.objects FOR SELECT USING (bucket_id = 'gallery_photos');

-- INSERT: Uploads allowed for registration, receipts, documents and portal assets
CREATE POLICY "Upload Passports" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'passports');
CREATE POLICY "Upload Receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "Upload Documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');
CREATE POLICY "Upload CMS" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cms_files');
CREATE POLICY "Upload Gallery" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery_photos');

-- UPDATE: Only owner or admin can update uploaded objects
CREATE POLICY "Update Storage Objects" ON storage.objects FOR UPDATE USING (
  bucket_id IN ('passports', 'receipts', 'documents', 'cms_files', 'gallery_photos')
  AND (auth.uid() = owner OR auth.is_admin())
) WITH CHECK (
  bucket_id IN ('passports', 'receipts', 'documents', 'cms_files', 'gallery_photos')
  AND (auth.uid() = owner OR auth.is_admin())
);

-- DELETE: Only owner or admin can delete storage objects
CREATE POLICY "Delete Storage Objects" ON storage.objects FOR DELETE USING (
  bucket_id IN ('passports', 'receipts', 'documents', 'cms_files', 'gallery_photos')
  AND (auth.uid() = owner OR auth.is_admin())
);

-- ============================================================================
-- 6. SEED INITIAL CORE SETTINGS & BANK ACCOUNTS (IF EMPTY)
-- ============================================================================
INSERT INTO public.forum_settings (
  id, forum_name, tagline, primary_color, sky_color, contact_email, contact_phone, headquarters
) VALUES (
  'primary_settings',
  'N-NEPEF 2020',
  'Northern Nigerian Electrical Practitioners and Engineers Forum',
  '#0A2E73',
  '#2EA3F2',
  'contact@nnepef.org.ng',
  '+234 802 333 3937',
  'National Secretariat, Kano, Nigeria'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.bank_accounts (
  id, bank_name, account_name, account_number, is_active, payment_instructions
) VALUES (
  'bank-default-1',
  'Jaiz Bank Plc',
  'N-NEPEF NATIONAL SECRETARIAT',
  '0012345678',
  true,
  'Please upload bank transfer receipt immediately after payment during registration'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. SECURE PUBLIC REGISTRATION RPC FUNCTIONS
-- ============================================================================

-- Overload A: Accepts single JSONB payload object
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
  v_gender TEXT;
  v_dob TEXT;
  v_phone TEXT;
  v_email TEXT;
  v_nin TEXT;
  v_state TEXT;
  v_lga TEXT;
  v_address TEXT;
  v_occupation TEXT;
  v_specialization TEXT;
  v_qualification TEXT;
  v_years INT;
  v_company TEXT;
  v_passport_url TEXT;
  v_receipt_url TEXT;
  v_nok JSONB;
  v_new_member public.members%ROWTYPE;
BEGIN
  v_full_name := TRIM(COALESCE(p_payload->>'full_name', p_payload->>'fullName', ''));
  IF v_full_name IS NULL OR length(v_full_name) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Full Name is required for registration');
  END IF;

  v_id := COALESCE(NULLIF(TRIM(p_payload->>'id'), ''), gen_random_uuid()::text);
  v_app_ref := COALESCE(
    NULLIF(TRIM(p_payload->>'application_reference'), ''),
    NULLIF(TRIM(p_payload->>'applicationReference'), ''),
    'APP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0')
  );

  v_gender := COALESCE(p_payload->>'gender', 'Male');
  v_dob := COALESCE(p_payload->>'dob', p_payload->>'date_of_birth', p_payload->>'dateOfBirth', NULL);
  v_phone := NULLIF(TRIM(p_payload->>'phone'), '');
  v_email := NULLIF(LOWER(TRIM(p_payload->>'email')), '');
  v_nin := COALESCE(NULLIF(TRIM(p_payload->>'nin'), ''), NULLIF(TRIM(p_payload->>'nin_number'), ''), NULLIF(TRIM(p_payload->>'ninNumber'), ''));
  v_state := COALESCE(p_payload->>'state', 'Kano');
  v_lga := COALESCE(p_payload->>'lga', 'Kano Municipal');
  v_address := COALESCE(NULLIF(TRIM(p_payload->>'residential_address'), ''), NULLIF(TRIM(p_payload->>'address'), ''), NULLIF(TRIM(p_payload->>'residentialAddress'), ''));
  v_occupation := COALESCE(NULLIF(TRIM(p_payload->>'occupation'), ''), 'Practitioner');
  v_specialization := COALESCE(p_payload->>'specialization', '');
  v_qualification := COALESCE(p_payload->>'qualification', p_payload->>'highestQualification', '');
  v_years := COALESCE((p_payload->>'years_of_experience')::INT, (p_payload->>'yearsOfExperience')::INT, 0);
  v_company := COALESCE(p_payload->>'company', '');
  v_passport_url := COALESCE(p_payload->>'passport_photo_url', p_payload->>'passport_url', p_payload->>'passportPhotoUrl', p_payload->>'passportUrl', '');
  v_receipt_url := COALESCE(p_payload->>'payment_receipt_url', p_payload->>'paymentReceiptUrl', '');
  v_nok := COALESCE(p_payload->'next_of_kin', p_payload->'nextOfKin', '{}'::JSONB);

  INSERT INTO public.members (
    id,
    membership_id,
    application_reference,
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
    next_of_kin,
    status,
    role,
    position,
    registered_at,
    created_at,
    updated_at
  ) VALUES (
    v_id,
    NULL,
    v_app_ref,
    v_full_name,
    v_gender,
    v_dob,
    v_dob,
    v_phone,
    v_email,
    v_nin,
    v_nin,
    v_state,
    v_lga,
    v_address,
    v_address,
    v_occupation,
    v_specialization,
    v_qualification,
    v_years,
    v_company,
    v_passport_url,
    v_passport_url,
    v_receipt_url,
    v_nok,
    'pending',
    'Member',
    'Member',
    NOW(),
    NOW(),
    NOW()
  )
  RETURNING * INTO v_new_member;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_new_member.id,
    'membership_id', v_new_member.membership_id,
    'application_reference', v_new_member.application_reference,
    'full_name', v_new_member.full_name,
    'status', v_new_member.status,
    'registered_at', v_new_member.registered_at,
    'member', to_jsonb(v_new_member)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Overload B: Accepts individual named parameters
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
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.public_register_member(
    jsonb_build_object(
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
    )
  );
END;
$$;

-- Alias for backward compatibility
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
SET search_path = public, pg_temp
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

-- Diagnostic verification RPC
CREATE OR REPLACE FUNCTION public.verify_member_status_diagnostic(p_member_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_record RECORD;
BEGIN
  SELECT id, status, membership_id, application_reference, full_name, registered_at, approved_at
  INTO v_record
  FROM public.members
  WHERE id = p_member_id OR LOWER(membership_id) = LOWER(p_member_id) OR LOWER(email) = LOWER(p_member_id)
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'exists', true,
      'id', v_record.id,
      'status', v_record.status,
      'membership_id', v_record.membership_id,
      'application_reference', v_record.application_reference,
      'full_name', v_record.full_name,
      'registered_at', v_record.registered_at,
      'approved_at', v_record.approved_at
    );
  ELSE
    RETURN jsonb_build_object('exists', false, 'id', p_member_id);
  END IF;
END;
$$;

-- ============================================================================
-- 8. GRANT PRIVILEGES TO ROLES (Fix PostgREST Schema Cache & Access)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Grant explicit function execution
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_register_member(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.public_register_member(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_member(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_member_status_diagnostic(TEXT) TO anon, authenticated, service_role;

-- ============================================================================
-- 9. RELOAD POSTGREST SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload schema';

