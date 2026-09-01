-- ============================================================================
-- N-NEPEF 2020 DIGITAL MEMBERSHIP PORTAL - PRODUCTION SEED CONFIGURATION
-- Only seeds organization settings, bank accounts, and initial admin profile.
-- ZERO fake member records are created.
-- ============================================================================

-- 1. Initial Forum Settings
INSERT INTO public.forum_settings (
  id,
  forum_name,
  tagline,
  logo_url,
  primary_color,
  sky_color,
  theme_mode,
  contact_email,
  contact_phone,
  headquarters,
  registration_fee,
  renewal_fee,
  id_card_replacement_fee,
  registration_enabled,
  portal_maintenance_mode
) VALUES (
  'primary_settings',
  'N-NEPEF 2020',
  'Northern Nigerian Electrical Practitioners and Engineers Forum',
  '/logo.png',
  '#0A2E73',
  '#2EA3F2',
  'dark',
  'contact@nnepef.org.ng',
  '+234 906 343 5546',
  'National Secretariat: No. 2 Gwarzo Road, Kano State, Nigeria',
  10000,
  5000,
  3000,
  true,
  false
) ON CONFLICT (id) DO UPDATE SET
  forum_name = EXCLUDED.forum_name,
  tagline = EXCLUDED.tagline,
  contact_phone = EXCLUDED.contact_phone;

-- 2. Official Bank Account for Fee Settlement
INSERT INTO public.bank_accounts (
  id,
  bank_name,
  account_name,
  account_number,
  branch,
  payment_instructions,
  is_active
) VALUES (
  'bank-nnepef-jaiz',
  'Jaiz Bank Plc',
  'N-NEPEF 2020 National Secretariat',
  '0012345678',
  'Kano Main Branch',
  'Make transfer to this Jaiz Bank account, save your transfer receipt/screenshot, and upload it during online membership registration or annual levy renewal.',
  true
) ON CONFLICT (id) DO NOTHING;

-- 3. Initial Administrator Profile for nnepef@gmail.com
INSERT INTO public.admin_profiles (
  email,
  full_name,
  phone,
  role,
  status,
  permissions
) VALUES (
  'nnepef@gmail.com',
  'Engr. Hussaini Ali (Secretary General)',
  '+234 906 343 5546',
  'super_admin',
  'active',
  '["ALL", "APPROVE_MEMBERS", "REJECT_MEMBERS", "EXPORT_DATA", "MANAGE_FEES", "MANAGE_ADMINS"]'::jsonb
) ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  status = 'active';
