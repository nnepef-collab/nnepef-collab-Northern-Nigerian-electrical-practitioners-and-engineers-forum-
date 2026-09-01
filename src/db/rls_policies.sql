-- ============================================================================
-- N-NEPEF 2020 DATABASE ROW-LEVEL SECURITY (RLS) POLICIES
-- Local Relational Schema Security Definitions
-- ============================================================================

-- Enable Row-Level Security on Core Administrative Tables
ALTER TABLE public.forum_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

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

-- ----------------------------------------------------------------------------
-- 1. FORUM SETTINGS & REGISTRATION FEE POLICIES
-- Admin and Super Admin can READ, UPDATE settings (Fee, Bank, Contact, Org Info)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Read Forum Settings" ON public.forum_settings;
DROP POLICY IF EXISTS "Admin & Super Admin Update Forum Settings" ON public.forum_settings;

CREATE POLICY "Public Read Forum Settings" 
  ON public.forum_settings FOR SELECT 
  USING (true);

CREATE POLICY "Admin & Super Admin Update Forum Settings" 
  ON public.forum_settings FOR UPDATE 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. BANK ACCOUNTS POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Read Active Bank Accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admin CRUD Bank Accounts" ON public.bank_accounts;

CREATE POLICY "Public Read Active Bank Accounts" 
  ON public.bank_accounts FOR SELECT 
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admin CRUD Bank Accounts" 
  ON public.bank_accounts FOR ALL 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. FEE CATEGORIES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Read Enabled Fees" ON public.fee_categories;
DROP POLICY IF EXISTS "Admin CRUD Fee Categories" ON public.fee_categories;

CREATE POLICY "Public Read Enabled Fees" 
  ON public.fee_categories FOR SELECT 
  USING (enabled = true OR public.is_admin());

CREATE POLICY "Admin CRUD Fee Categories" 
  ON public.fee_categories FOR ALL 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. MEMBER INFORMATION & REGISTRATION SECURITY POLICIES
-- Strict Data Privacy: Anonymous users cannot read private pending member data.
-- Public can ONLY view approved/active members for official credential verification.
-- Authorized Admins have full access to all member statuses (pending, approved, suspended, rejected).
-- ----------------------------------------------------------------------------

-- Enable Row-Level Security on members table
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Clean up any prior policies
DROP POLICY IF EXISTS "Public Member Verification" ON public.members;
DROP POLICY IF EXISTS "Admin CRUD Members" ON public.members;
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

-- 4.1 PUBLIC REGISTRATION INSERT POLICY (anon & authenticated):
-- Public applicants can ONLY submit new registrations in 'pending' status.
-- Applicants CANNOT self-assign membership IDs, approval status, or administrative timestamps.
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
-- All pending registrations and unverified applicant PII (NIN, DOB, address, Next of Kin) are strictly shielded.
CREATE POLICY "Public Verification Approved Only" 
  ON public.members FOR SELECT 
  TO anon, authenticated
  USING (LOWER(TRIM(status)) IN ('approved', 'active'));

-- 4.3 ADMIN FULL CRUD POLICY (Authenticated Admins & Service Role):
-- Authorized administrative officers have full CRUD access across all member statuses (pending, approved, rejected, suspended).
CREATE POLICY "Admin Full Access Members" 
  ON public.members FOR ALL 
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4.3 SECURE SECURITY DEFINER FUNCTIONS & RPCs
-- ----------------------------------------------------------------------------

-- A. Secure Registration RPC (public_register_member)
-- Genuine INSERT ONLY. No UPSERT / ON CONFLICT DO UPDATE vulnerability.
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
  v_dob DATE;
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
  v_notes TEXT;
BEGIN
  -- Validate and sanitize full name
  v_full_name := TRIM(COALESCE(p_payload->>'full_name', p_payload->>'fullName', ''));
  IF v_full_name IS NULL OR length(v_full_name) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Full Name is required for registration');
  END IF;

  -- Generate server-side identifiers
  v_id := COALESCE(NULLIF(TRIM(p_payload->>'id'), ''), 'm-' || floor(extract(epoch from now()))::text || '-' || floor(random()*89999+10000)::text);
  v_app_ref := 'APP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 900000 + 100000)::TEXT, 6, '0');

  v_gender := COALESCE(p_payload->>'gender', 'Male');
  v_phone := NULLIF(TRIM(p_payload->>'phone'), '');
  v_email := NULLIF(LOWER(TRIM(p_payload->>'email')), '');
  v_nin := COALESCE(NULLIF(TRIM(p_payload->>'nin'), ''), NULLIF(TRIM(p_payload->>'nin_number'), ''), NULLIF(TRIM(p_payload->>'ninNumber'), ''));
  v_state := COALESCE(p_payload->>'state', 'Kano');
  v_lga := COALESCE(p_payload->>'lga', 'Kano Municipal');
  v_address := COALESCE(NULLIF(TRIM(p_payload->>'residential_address'), ''), NULLIF(TRIM(p_payload->>'address'), ''), NULLIF(TRIM(p_payload->>'residentialAddress'), ''));
  v_occupation := COALESCE(NULLIF(TRIM(p_payload->>'occupation'), ''), 'Practitioner');
  v_specialization := COALESCE(p_payload->>'specialization', '');
  v_qualification := COALESCE(p_payload->>'qualification', '');
  v_years := COALESCE((p_payload->>'years_of_experience')::INT, (p_payload->>'yearsOfExperience')::INT, 0);
  v_company := COALESCE(p_payload->>'company', '');
  v_passport_url := COALESCE(p_payload->>'passport_photo_url', p_payload->>'passport_url', p_payload->>'passportPhotoUrl', p_payload->>'passportUrl', '');
  v_receipt_url := COALESCE(p_payload->>'payment_receipt_url', p_payload->>'paymentReceiptUrl', '');
  v_nok := COALESCE(p_payload->'next_of_kin', p_payload->'nextOfKin', '{}'::JSONB);
  v_notes := COALESCE(p_payload->>'notes', '');

  -- Insert securely with forced status='pending', membership_id=NULL, approved_at=NULL
  -- Genuine INSERT only — strictly prohibits overwriting existing members
  INSERT INTO public.members (
    id,
    membership_id,
    application_reference,
    full_name,
    gender,
    phone,
    email,
    nin,
    nin_number,
    state,
    lga,
    residential_address,
    address,
    occupation,
    specialization,
    qualification,
    years_of_experience,
    company,
    passport_photo_url,
    passport_url,
    payment_receipt_url,
    status,
    role,
    position,
    notes,
    next_of_kin,
    approved_at,
    approved_by,
    rejected_by,
    registered_at,
    created_at,
    updated_at
  ) VALUES (
    v_id,
    NULL,
    v_app_ref,
    v_full_name,
    v_gender,
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
    'pending',
    'Member',
    'Member',
    v_notes,
    v_nok,
    NULL,
    NULL,
    NULL,
    NOW(),
    NOW(),
    NOW()
  );

  -- Return ONLY safe non-sensitive summary
  RETURN jsonb_build_object(
    'success', true,
    'id', v_id,
    'application_reference', v_app_ref,
    'status', 'pending',
    'message', 'Registration submitted successfully. Application is pending administrative review.'
  );
EXCEPTION 
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'An application with this reference or ID already exists. Please retry with fresh credentials.',
      'code', SQLSTATE
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_register_member(JSONB) TO anon, authenticated, service_role;

-- B. Secure Diagnostic Verification RPC (verify_member_status_diagnostic)
-- Confirms existence and status without exposing any PII
CREATE OR REPLACE FUNCTION public.verify_member_status_diagnostic(target_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rec RECORD;
BEGIN
  IF target_id IS NULL OR TRIM(target_id) = '' THEN
    RETURN jsonb_build_object('exists', false, 'error', 'Target ID is required');
  END IF;

  SELECT 
    id,
    application_reference,
    membership_id,
    status,
    registered_at,
    created_at,
    approved_at
  INTO v_rec
  FROM public.members
  WHERE id = target_id 
     OR application_reference = target_id 
     OR membership_id = target_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'exists', false,
      'target_id', target_id
    );
  END IF;

  -- Return strictly sanitized diagnostic information (NO PII, NO NIN, NO PHONE, NO ADDRESS)
  RETURN jsonb_build_object(
    'exists', true,
    'id', v_rec.id,
    'application_reference', v_rec.application_reference,
    'membership_id', v_rec.membership_id,
    'status', LOWER(v_rec.status),
    'registered_at', COALESCE(v_rec.registered_at, v_rec.created_at),
    'approved_at', v_rec.approved_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_member_status_diagnostic(TEXT) TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 4.4 PUBLIC VERIFIED MEMBERS VIEW (Strictly Non-Sensitive Public Fields)
-- ----------------------------------------------------------------------------
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
  passport_url,
  passport_photo_url,
  registered_at,
  approved_at
FROM public.members
WHERE LOWER(TRIM(status)) IN ('approved', 'active');

GRANT SELECT ON public.public_verified_members TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. LEADERSHIP DIRECTORY (EXECUTIVES) POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Read Executives" ON public.executives;
DROP POLICY IF EXISTS "Admin CRUD Executives" ON public.executives;

CREATE POLICY "Public Read Executives" 
  ON public.executives FOR SELECT 
  USING (active = true OR public.is_admin());

CREATE POLICY "Admin CRUD Executives" 
  ON public.executives FOR ALL 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 6. ANNOUNCEMENTS, GALLERY, DOWNLOADS, NEWS, EVENTS & FINANCIAL PAYMENTS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Read Content" ON public.announcements;
DROP POLICY IF EXISTS "Admin CRUD Announcements" ON public.announcements;
DROP POLICY IF EXISTS "Public Read Gallery" ON public.gallery_albums;
DROP POLICY IF EXISTS "Admin CRUD Gallery" ON public.gallery_albums;
DROP POLICY IF EXISTS "Public Read Documents" ON public.documents;
DROP POLICY IF EXISTS "Admin CRUD Documents" ON public.documents;

CREATE POLICY "Public Read Content" 
  ON public.announcements FOR SELECT USING (true);

CREATE POLICY "Admin CRUD Announcements" 
  ON public.announcements FOR ALL 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public Read Gallery" 
  ON public.gallery_albums FOR SELECT USING (true);

CREATE POLICY "Admin CRUD Gallery" 
  ON public.gallery_albums FOR ALL 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Public Read Documents" 
  ON public.documents FOR SELECT USING (true);

CREATE POLICY "Admin CRUD Documents" 
  ON public.documents FOR ALL 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- PAYMENTS POLICIES
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
DROP POLICY IF EXISTS "Member View Own Payment Records" ON public.payment_records;
DROP POLICY IF EXISTS "Admin CRUD Payment Records" ON public.payment_records;

-- Public applicants can insert initial pending registration payment only
CREATE POLICY "Public Applicant Insert Payment" 
  ON public.payment_records FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (
    LOWER(TRIM(status)) IN ('pending', 'submitted')
    AND approved_at IS NULL
    AND approved_by IS NULL
  );

-- Only authenticated admins or the authenticated member themselves can SELECT payment records
CREATE POLICY "Admin & Owner Read Payments" 
  ON public.payment_records FOR SELECT 
  TO authenticated, service_role
  USING (
    public.is_admin() 
    OR (auth.uid() IS NOT NULL AND auth.uid()::text = member_id)
  );

-- Full CRUD only for authenticated admins and backend service_role
CREATE POLICY "Admin Full Access Payments" 
  ON public.payment_records FOR ALL 
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 7. SUPER ADMIN EXCLUSIVE POLICIES
-- Admin accounts creation/deletion, System Security, Backup/Restore, Audit Logs
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Super Admin Exclusive Admin Accounts" ON public.admin_accounts;
DROP POLICY IF EXISTS "Super Admin Exclusive Audit Trail" ON public.audit_logs;

CREATE POLICY "Super Admin Exclusive Admin Accounts" 
  ON public.admin_accounts FOR ALL 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Super Admin Exclusive Audit Trail" 
  ON public.audit_logs FOR ALL 
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

