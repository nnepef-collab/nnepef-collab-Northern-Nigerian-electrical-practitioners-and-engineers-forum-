-- ============================================================================
-- N-NEPEF 2020 Portal - Local SQLite Database Schema
-- 100% Offline, Self-Contained Local Database
-- Engine: SQLite 3 (WASM / Node.js)
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. MEMBERS TABLE
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  membership_id TEXT,
  application_reference TEXT,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  gender TEXT,
  dob TEXT,
  date_of_birth TEXT,
  state TEXT,
  lga TEXT,
  address TEXT,
  residential_address TEXT,
  specialization TEXT,
  qualification TEXT,
  years_of_experience INTEGER DEFAULT 1,
  company TEXT,
  occupation TEXT,
  status TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'suspended'
  registered_at TEXT,
  approved_at TEXT,
  approved_by TEXT,
  issue_date TEXT,
  expiry_date TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'member',
  position TEXT,
  passport_url TEXT,
  payment_receipt_url TEXT,
  nin TEXT,
  nin_number TEXT,
  next_of_kin TEXT,
  notes TEXT,
  raw_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_members_membership_id ON members(membership_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_state ON members(state);

-- 2. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  member_id TEXT,
  member_name TEXT,
  membership_id TEXT,
  state TEXT,
  lga TEXT,
  type TEXT,
  amount REAL DEFAULT 0,
  status TEXT DEFAULT 'Pending', -- 'Pending' | 'Verified' | 'Rejected'
  receipt_url TEXT,
  date TEXT,
  reference TEXT UNIQUE,
  payment_method TEXT DEFAULT 'Bank Transfer',
  approved_by TEXT,
  remarks TEXT,
  raw_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 3. ADMINS TABLE
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  username TEXT,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin', -- 'super_admin' | 'admin' | 'state_admin' | 'treasurer' | 'auditor' | 'editor'
  permissions TEXT,
  password_hash TEXT NOT NULL,
  raw_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- 4. EXECUTIVES TABLE
CREATE TABLE IF NOT EXISTS executives (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  tier TEXT DEFAULT 'national',
  photo_url TEXT,
  email TEXT,
  phone TEXT,
  bio TEXT,
  term TEXT,
  sort_order INTEGER DEFAULT 1,
  active INTEGER DEFAULT 1,
  raw_json TEXT
);

-- 5. NEWS TABLE
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  summary TEXT,
  content TEXT,
  category TEXT,
  image_url TEXT,
  published_at TEXT,
  author TEXT,
  featured INTEGER DEFAULT 0,
  tags TEXT,
  raw_json TEXT
);

-- 6. EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  start_date TEXT,
  end_date TEXT,
  time TEXT,
  venue TEXT,
  state TEXT,
  is_free INTEGER DEFAULT 1,
  fee REAL DEFAULT 0,
  image_url TEXT,
  status TEXT DEFAULT 'upcoming',
  raw_json TEXT
);

-- 7. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium', -- 'Low' | 'Medium' | 'High' | 'Urgent'
  target_audience TEXT DEFAULT 'All Members',
  date TEXT,
  active INTEGER DEFAULT 1,
  raw_json TEXT
);

-- 8. RENEWAL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS renewal_requests (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  membership_id TEXT NOT NULL,
  request_type TEXT DEFAULT 'Annual Dues',
  year INTEGER,
  amount REAL DEFAULT 0,
  receipt_url TEXT,
  status TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  submitted_at TEXT,
  reviewed_at TEXT,
  reviewed_by TEXT,
  notes TEXT,
  raw_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_renewals_member ON renewal_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_renewals_status ON renewal_requests(status);

-- 9. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT,
  file_url TEXT NOT NULL,
  file_size TEXT,
  file_type TEXT,
  uploaded_by TEXT,
  uploaded_at TEXT,
  downloads INTEGER DEFAULT 0,
  raw_json TEXT
);

-- 10. GALLERY TABLE
CREATE TABLE IF NOT EXISTS gallery (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  cover_image TEXT,
  images TEXT,
  event_date TEXT,
  created_at TEXT,
  raw_json TEXT
);

-- 11. CONTACT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  created_at TEXT,
  responded_at TEXT,
  raw_json TEXT
);

-- 12. IN-APP NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TEXT,
  type TEXT DEFAULT 'info',
  is_read INTEGER DEFAULT 0,
  link TEXT,
  raw_json TEXT
);

-- 13. NOTIFICATION DELIVERY LOGS TABLE
CREATE TABLE IF NOT EXISTS delivery_logs (
  id TEXT PRIMARY KEY,
  member_id TEXT,
  member_name TEXT,
  membership_id TEXT,
  type TEXT,
  channel TEXT,
  event TEXT,
  recipient TEXT,
  subject TEXT,
  message TEXT,
  status TEXT,
  provider TEXT,
  message_id TEXT,
  error_message TEXT,
  created_at TEXT,
  raw_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_recipient ON delivery_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_channel ON delivery_logs(channel);

-- 14. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  raw_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- 15. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 16. CMS FILES TABLE
CREATE TABLE IF NOT EXISTS cms_files (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  size TEXT,
  upload_date TEXT,
  url TEXT NOT NULL,
  raw_json TEXT
);
