-- ============================================================================
-- 5. STORAGE BUCKETS (IDEMPOTENT INITIALIZATION)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('passports', 'passports', true),
  ('receipts', 'receipts', true),
  ('documents', 'documents', true),
  ('cms_files', 'cms_files', true),
  ('gallery_photos', 'gallery_photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies
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

-- 6.1 FORUM SETTINGS
DROP POLICY IF EXISTS "Public Read Forum Settings" ON public.forum_settings;
DROP POLICY IF EXISTS "Admin All Forum Settings" ON public.forum_settings;
CREATE POLICY "Public Read Forum Settings" ON public.forum_settings FOR SELECT USING (true);
CREATE POLICY "Admin All Forum Settings" ON public.forum_settings FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6.2 BANK ACCOUNTS & FEES
DROP POLICY IF EXISTS "Public Read Bank Accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Admin All Bank Accounts" ON public.bank_accounts;
CREATE POLICY "Public Read Bank Accounts" ON public.bank_accounts FOR SELECT USING (true);
CREATE POLICY "Admin All Bank Accounts" ON public.bank_accounts FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public Read Fees" ON public.fee_categories;
DROP POLICY IF EXISTS "Admin All Fees" ON public.fee_categories;
CREATE POLICY "Public Read Fees" ON public.fee_categories FOR SELECT USING (true);
CREATE POLICY "Admin All Fees" ON public.fee_categories FOR ALL TO authenticated, service_role USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6.3 MEMBERS TABLE POLICIES
DROP POLICY IF EXISTS "Public Applicant Insert Only" ON public.members;
DROP POLICY IF EXISTS "Public Verification Approved Only" ON public.members;
DROP POLICY IF EXISTS "Member Read Own Profile" ON public.members;
DROP POLICY IF EXISTS "Member Update Own Profile" ON public.members;
DROP POLICY IF EXISTS "Admin Full Access Members" ON public.members;
DROP POLICY IF EXISTS "Public Register Via RPC and Table" ON public.members;

-- 1. Applicants: Insert pending applications
CREATE POLICY "Public Applicant Insert Only" 
  ON public.members FOR INSERT 
  TO anon, authenticated
  WITH CHECK (
    LOWER(TRIM(status)) = 'pending'
    OR public.is_admin()
  );

-- 2. Public Verification: Read approved members
CREATE POLICY "Public Verification Approved Only" 
  ON public.members FOR SELECT 
  TO anon, authenticated
  USING (LOWER(TRIM(status)) IN ('approved', 'active'));

-- 3. Authenticated Members: Read own full profile
CREATE POLICY "Member Read Own Profile"
  ON public.members FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR id = auth.uid()::text));

-- 4. Authenticated Members: Update own profile
CREATE POLICY "Member Update Own Profile"
  ON public.members FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR id = auth.uid()::text))
  WITH CHECK (
    auth.uid() IS NOT NULL AND (user_id = auth.uid() OR id = auth.uid()::text)
    AND status = (SELECT m.status FROM public.members m WHERE m.id = public.members.id)
  );

-- 5. Administrators & Service Role: Full access
CREATE POLICY "Admin Full Access Members" 
  ON public.members FOR ALL 
  TO authenticated, service_role
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6.4 PAYMENT RECORDS POLICIES
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

-- 6.5 ADMIN ACCOUNTS
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

-- 6.6 PUBLIC CONTENT (Executives, Announcements, News, Events, Documents, Gallery)
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

-- 6.7 CONTACT MESSAGES & RENEWAL REQUESTS
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

-- 6.8 AUDIT & NOTIFICATION LOGS
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

-- 7.2 Named Parameter Overload for public_register_member
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

-- 7.6 Secure Diagnostic Verification RPC
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
GRANT EXECUTE ON FUNCTION public.public_register_member(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_approve_member(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reject_member(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_suspend_member(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_restore_member(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_member_status_diagnostic(TEXT) TO anon, authenticated, service_role;

-- ============================================================================
