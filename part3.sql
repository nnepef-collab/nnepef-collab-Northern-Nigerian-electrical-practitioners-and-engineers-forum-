-- 8. PRODUCTION DATA SEED & SYNC (8 MEMBERS + PAYMENTS + ADMINS + SETTINGS)
-- ============================================================================

-- 8.1 Forum Settings Default
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

-- 8.2 Official Bank Accounts
INSERT INTO public.bank_accounts (
  id, bank_name, account_name, account_number, branch, payment_instructions, is_active
) VALUES 
  ('bank_jaiz_01', 'Jaiz Bank Plc', 'N-NEPEF National Secretariat', '0008899221', 'Kano Main Branch', 'Please include your Application Reference or Membership ID as the payment narrative.', true),
  ('bank_zenith_02', 'Zenith Bank Plc', 'N-NEPEF Central Operations', '1019922334', 'Post Office Road, Kano', 'Payment for Annual Dues and Registrations.', true)
ON CONFLICT (id) DO NOTHING;

-- 8.3 Fee Categories
INSERT INTO public.fee_categories (
  id, name, code, amount, enabled, description
) VALUES 
  ('fee_reg_01', 'New Member Registration Fee', 'REG_FEE', 10000, true, 'One-time onboarding and induction fee for new practitioners and engineers.'),
  ('fee_ren_02', 'Annual Dues & Membership Renewal', 'ANNUAL_DUES', 5000, true, 'Annual practice renewal fee for continuous licensing and directory listing.'),
  ('fee_idc_03', 'Official NFC ID Card Replacement', 'IDC_REPLACE', 3000, true, 'Replacement fee for lost, damaged, or upgraded secure membership smart cards.')
ON CONFLICT (id) DO NOTHING;

-- 8.4 Administrative Accounts
INSERT INTO public.admin_accounts (
  id, full_name, email, phone, role, status, permissions
) VALUES 
  ('admin_ahmad_ali', 'Ahmad Hussaini Ali', 'ahmadhussainiali2020@gmail.com', '+234 802 333 3937', 'Super Admin', 'active', '["ALL"]'::jsonb),
  ('admin_secretariat', 'National Secretariat Super Admin', 'superadmin@nepef.org.ng', '+234 802 333 3937', 'Super Admin', 'active', '["ALL"]'::jsonb),
  ('admin_desk', 'National Desk Admin', 'admin@nepef.org.ng', '+234 802 333 3937', 'Admin', 'active', '["MEMBERS", "PAYMENTS", "REPORTS"]'::jsonb)
ON CONFLICT (email) DO UPDATE SET status = 'active', role = EXCLUDED.role;

-- 8.5 Sync Exact 8 Members (Including 4 Approved Members With Their Official IDs)
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
  state,
  lga,
  residential_address,
  occupation,
  specialization,
  qualification,
  years_of_experience,
  company,
  status,
  role,
  position,
  issue_date,
  expiry_date,
  approved_at,
  approved_by,
  approval_notification_sent,
  passport_url,
  passport_photo_url,
  payment_receipt_url,
  registered_at
) VALUES 
  (
    'm-final-audit-1787836915357',
    'NNEPEF/KN/7300',
    'APP-2026-224879',
    'Engr. Haruna Abdullahi Final',
    'Male',
    '1990-05-15',
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
    '2026-08-27T13:21:56.740Z'::timestamptz,
    'National Secretariat Admin',
    true,
    '',
    '',
    '',
    '2026-08-27T13:21:55.357Z'::timestamptz
  ),
  (
    'm-prod-audit-1787834139132',
    'NNEPEF/KN/4837',
    'APP-2026-177002',
    'Engr. Kabir Lawan Production-Pass',
    'Male',
    '1991-08-14',
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
    '2026-08-27T12:35:39.632Z'::timestamptz,
    'N-NEPEF National Secretariat Executive',
    true,
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600',
    '2026-08-27T12:35:39.132Z'::timestamptz
  ),
  (
    'm-auto-test-1787833729465',
    NULL,
    'APP-2026-370022',
    'Aliyu Babangida Final Trace',
    'Male',
    '1994-06-12',
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
    NULL,
    NULL,
    false,
    '',
    '',
    '',
    '2026-08-27T12:28:49.465Z'::timestamptz
  ),
  (
    'm-e2e-live-1787832627583',
    'NNEPEF/KN/2828',
    'APP-2026-997971',
    'Engr. Fatima Bello Live',
    'Female',
    '1993-04-18',
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
    '2026-08-27T12:10:28.478Z'::timestamptz,
    'Super Admin Secretariat',
    true,
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600',
    '2026-08-27T12:10:27.583Z'::timestamptz
  ),
  (
    'm-trace-1787832610388',
    NULL,
    'APP-2026-654826',
    'Musa Ibrahim Trace',
    'Male',
    '1988-11-25',
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
    NULL,
    NULL,
    false,
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600',
    '2026-08-27T12:10:10.388Z'::timestamptz
  ),
  (
    'm-prod-test-1787831385268',
    'NNEPEF/2026/004',
    'APP-2026-577248',
    'Usman Danladi Test',
    'Male',
    '1991-08-10',
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
    '2026-08-27T11:54:03.270Z'::timestamptz,
    'Super Admin Secretariat',
    true,
    '',
    '',
    '',
    '2026-08-27T11:49:45.268Z'::timestamptz
  ),
  (
    'm-e2e-1787830776027',
    NULL,
    'APP-2026-000007',
    'Aliyu Babangida',
    'Male',
    '1994-06-12',
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
    NULL,
    NULL,
    false,
    '',
    '',
    '',
    '2026-08-27T11:39:36.027Z'::timestamptz
  ),
  (
    'm-fresh-audit-1787838000000',
    NULL,
    'APP-2026-889901',
    'Engr. Bello Sanusi Audit',
    'Male',
    '1989-03-20',
    '1989-03-20',
    '08099887766',
    'bello.audit.fresh@nnepef.org',
    '99001122334',
    'Kano',
    'Nassarawa',
    'No. 12 Airport Road, Kano',
    'Power Systems Engineer',
    'Grid Modernization',
    'M.Sc Power Systems',
    8,
    'Kano Distribution Substation Co.',
    'pending',
    'Member',
    'Member',
    NULL,
    NULL,
    NULL,
    NULL,
    false,
    '',
    '',
    '',
    '2026-08-27T13:40:00.000Z'::timestamptz
  )
ON CONFLICT (id) DO UPDATE SET
  membership_id = COALESCE(EXCLUDED.membership_id, public.members.membership_id),
  application_reference = COALESCE(EXCLUDED.application_reference, public.members.application_reference),
  full_name = EXCLUDED.full_name,
  status = EXCLUDED.status,
  position = COALESCE(EXCLUDED.position, public.members.position),
  issue_date = COALESCE(EXCLUDED.issue_date, public.members.issue_date),
  expiry_date = COALESCE(EXCLUDED.expiry_date, public.members.expiry_date),
  approved_at = COALESCE(EXCLUDED.approved_at, public.members.approved_at),
  approved_by = COALESCE(EXCLUDED.approved_by, public.members.approved_by),
  phone = COALESCE(EXCLUDED.phone, public.members.phone),
  email = COALESCE(EXCLUDED.email, public.members.email),
  updated_at = NOW();

-- 8.6 Sync Payment Record
INSERT INTO public.payment_records (
  id,
  member_id,
  member_name,
  membership_id,
  state,
  lga,
  type,
  amount,
  status,
  reference,
  date,
  payment_method
) VALUES (
  'pay_audit_test_1001',
  'm-final-audit-1787836915357',
  'Engr. Haruna Abdullahi Final',
  'NNEPEF/KN/7300',
  'Kano',
  'Kano Municipal',
  'Registration Fee',
  10000,
  'Approved',
  'REG-PAY-1001',
  '2026-08-26',
  'Bank Transfer'
) ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  amount = EXCLUDED.amount;

-- ============================================================================
-- 9. LEAST-PRIVILEGE ROLE GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

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

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

NOTIFY pgrst, 'reload schema';
