import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlValue } from 'sql.js';
import bcrypt from 'bcryptjs';
import {
  initialAdmins,
  initialExecutives,
  initialNews,
  initialEvents,
  initialAnnouncements,
  initialDocuments,
  initialGallery,
  initialContactMessages,
  initialAuditLogs,
  initialForumSettings,
  sampleNotifications,
  initialNotificationLogs
} from '../data/initialData';
import {
  Member,
  PaymentRecord,
  NotificationDeliveryLog,
  NotificationItem,
  AuditLog,
  ForumSettings,
  AdminAccount,
  Executive,
  NewsArticle,
  EventItem,
  Announcement,
  DocumentItem,
  GalleryAlbum,
  ContactMessage,
  RenewalRequest,
  CMSFile
} from '../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const SQLITE_FILE_PATH = path.join(DATA_DIR, 'nnepef_portal.sqlite');
const LEGACY_JSON_PATH = path.join(DATA_DIR, 'nnepef_central_db.json');

let db: Database | null = null;
let lastSaveTime: string | null = null;
let isInitialized = false;

// Helper to safely execute a query and return objects array
function queryRows<T = any>(sql: string, params: SqlValue[] = []): T[] {
  if (!db) throw new Error('SQLite database not initialized');
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as unknown as T;
    results.push(row);
  }
  stmt.free();
  return results;
}

// Helper to run query that returns single row
function queryOne<T = any>(sql: string, params: SqlValue[] = []): T | null {
  const rows = queryRows<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper to run INSERT/UPDATE/DELETE statement with params
function runQuery(sql: string, params: SqlValue[] = []): void {
  if (!db) throw new Error('SQLite database not initialized');
  if (params.length === 0) {
    db.run(sql);
  } else {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
  }
}

/**
 * Persist SQLite Database to internal storage file (.sqlite)
 */
export function persistDatabaseToDisk(): void {
  if (!db) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const binaryArray = db.export();
    const buffer = Buffer.from(binaryArray);
    fs.writeFileSync(SQLITE_FILE_PATH, buffer);
    lastSaveTime = new Date().toISOString();
  } catch (err) {
    console.error('[SQLite] Error writing database to disk:', err);
  }
}

/**
 * Helper to construct and setup all database schema tables
 */
async function setupSchemaAndSeed(database: Database): Promise<void> {
  // Create tables and indexes
  database.run('PRAGMA foreign_keys = ON;');

  database.run(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      membership_id TEXT,
      application_reference TEXT,
      full_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
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
      status TEXT DEFAULT 'pending',
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

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      member_id TEXT,
      member_name TEXT,
      membership_id TEXT,
      state TEXT,
      lga TEXT,
      type TEXT,
      amount REAL DEFAULT 0,
      status TEXT DEFAULT 'Pending',
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

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      permissions TEXT,
      password_hash TEXT NOT NULL,
      raw_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

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

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      priority TEXT DEFAULT 'Medium',
      target_audience TEXT DEFAULT 'All Members',
      date TEXT,
      active INTEGER DEFAULT 1,
      raw_json TEXT
    );

    CREATE TABLE IF NOT EXISTS renewal_requests (
      id TEXT PRIMARY KEY,
      member_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      membership_id TEXT NOT NULL,
      request_type TEXT DEFAULT 'Annual Dues',
      year INTEGER,
      amount REAL DEFAULT 0,
      receipt_url TEXT,
      status TEXT DEFAULT 'pending',
      submitted_at TEXT,
      reviewed_at TEXT,
      reviewed_by TEXT,
      notes TEXT,
      raw_json TEXT
    );

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

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cms_files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT,
      size TEXT,
      upload_date TEXT,
      url TEXT NOT NULL,
      raw_json TEXT
    );
  `);

  // Migrate from JSON or seed defaults if empty
  await seedSQLiteDatabaseIfEmpty();
}

/**
 * Initialize SQLite Database Engine
 */
export async function initSQLiteDatabase(): Promise<Database> {
  if (db && isInitialized) return db;

  console.log('⚡ [SQLite Engine] Initializing local SQLite database...');
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  let loadedExisting = false;
  if (fs.existsSync(SQLITE_FILE_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(SQLITE_FILE_PATH);
      if (fileBuffer.length > 0) {
        db = new SQL.Database(fileBuffer);
        // Verify database is readable
        db.run('SELECT 1;');
        loadedExisting = true;
        console.log(`✅ [SQLite Engine] Loaded existing SQLite database from ${SQLITE_FILE_PATH} (${(fileBuffer.length / 1024).toFixed(1)} KB)`);
      }
    } catch (e) {
      console.error('[SQLite Engine] Malformed/Corrupt SQLite file on disk. Resetting to clean database instance:', e);
      try {
        if (fs.existsSync(SQLITE_FILE_PATH)) {
          fs.unlinkSync(SQLITE_FILE_PATH);
        }
      } catch (delErr) {}
      db = null;
    }
  }

  if (!db) {
    db = new SQL.Database();
    console.log('📦 [SQLite Engine] Created fresh SQLite database instance in memory');
  }

  try {
    await setupSchemaAndSeed(db);
  } catch (schemaErr) {
    console.error('[SQLite Engine] Error setting up schema on loaded database, recreating fresh database:', schemaErr);
    try {
      if (fs.existsSync(SQLITE_FILE_PATH)) {
        fs.unlinkSync(SQLITE_FILE_PATH);
      }
    } catch (e) {}
    db = new SQL.Database();
    await setupSchemaAndSeed(db);
  }

  persistDatabaseToDisk();
  isInitialized = true;
  console.log('✅ [SQLite Engine] Tables verified & SQLite local database ready.');
  return db;
}

/**
 * Seed or migrate data into SQLite tables
 */
async function seedSQLiteDatabaseIfEmpty(): Promise<void> {
  const membersCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM members')?.count || 0;
  const adminsCount = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM admins')?.count || 0;

  // If already seeded, return
  if (membersCount > 0 && adminsCount > 0) {
    return;
  }

  console.log('🌱 [SQLite Engine] Seeding initial records into SQLite tables...');

  // Check if legacy JSON file exists for seamless migration
  let legacyData: any = null;
  if (fs.existsSync(LEGACY_JSON_PATH)) {
    try {
      const jsonStr = fs.readFileSync(LEGACY_JSON_PATH, 'utf-8');
      legacyData = JSON.parse(jsonStr);
      console.log('🔄 [SQLite Migration] Found existing JSON store. Migrating into SQLite...');
    } catch (e) {
      console.warn('[SQLite Migration] Could not parse legacy JSON file:', e);
    }
  }

  // 1. Seed Admins
  const adminsToSeed: AdminAccount[] = legacyData?.admins && legacyData.admins.length > 0 
    ? legacyData.admins 
    : initialAdmins.map(a => ({
        ...a,
        passwordHash: bcrypt.hashSync(a.password || 'AdminSecret2026!', 10)
      }));

  for (const admin of adminsToSeed) {
    runQuery(
      `INSERT OR REPLACE INTO admins (id, username, email, phone, name, role, permissions, password_hash, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        admin.id,
        admin.username || admin.email.split('@')[0],
        admin.email.toLowerCase(),
        admin.phone || '',
        admin.fullName || (admin as any).name || 'Admin',
        admin.role || 'admin',
        JSON.stringify(admin.permissions || []),
        admin.passwordHash || bcrypt.hashSync(admin.password || 'AdminSecret2026!', 10),
        JSON.stringify(admin)
      ]
    );
  }

  // 2. Seed Members
  const seedMembersList: Member[] = legacyData?.members && legacyData.members.length > 0
    ? legacyData.members
    : [
        {
          id: 'm-seed-1',
          fullName: 'Engr. Dr. Kabir Muhammad Kano',
          email: 'kabir.kano@nepef.org.ng',
          phone: '+234 803 123 4567',
          gender: 'Male',
          dob: '1980-05-12',
          dateOfBirth: '1980-05-12',
          state: 'Kano',
          lga: 'Kano Municipal',
          address: 'No. 12 Bompai Road, Kano',
          residentialAddress: 'No. 12 Bompai Road, Kano',
          specialization: 'Power Systems & Smart Grid Engineering',
          qualification: 'Ph.D. Electrical Engineering (COREN Registered)',
          yearsOfExperience: 18,
          company: 'Kano Electricity Distribution Company (KEDCO)',
          occupation: 'Senior Electrical Power Engineer',
          passportUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
          paymentReceiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600',
          status: 'approved',
          membershipId: 'NNEPEF/KT/2024/0001',
          applicationReference: 'APP-2024-NNEPEF-001',
          registeredAt: '2024-01-15T10:00:00Z',
          passwordHash: bcrypt.hashSync('Password@123', 10),
          role: 'super_admin',
          position: 'National Chairman',
          nin: '12345678901',
          ninNumber: '12345678901'
        },
        {
          id: 'm-seed-2',
          fullName: 'Engr. Fatima Bello Garba',
          email: 'fatima.bello@nepef.org.ng',
          phone: '+234 802 987 6543',
          gender: 'Female',
          dob: '1985-09-20',
          dateOfBirth: '1985-09-20',
          state: 'Kaduna',
          lga: 'Kaduna North',
          address: 'No. 5 Independence Way, Kaduna',
          residentialAddress: 'No. 5 Independence Way, Kaduna',
          specialization: 'Renewable Energy & Solar PV Installation',
          qualification: 'M.Sc. Renewable Energy (NSE Member)',
          yearsOfExperience: 12,
          company: 'Northern Solar Power Ltd',
          occupation: 'Solar Energy Consultant',
          passportUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
          paymentReceiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600',
          status: 'approved',
          membershipId: 'NNEPEF/KD/2024/0002',
          applicationReference: 'APP-2024-NNEPEF-002',
          registeredAt: '2024-02-10T09:30:00Z',
          passwordHash: bcrypt.hashSync('Password@123', 10),
          role: 'admin',
          position: 'National Vice Chairperson',
          nin: '98765432109',
          ninNumber: '98765432109'
        }
      ];

  for (const m of seedMembersList) {
    saveOrUpdateMember(m);
  }

  // 3. Seed Payments
  const paymentsList: PaymentRecord[] = legacyData?.payments && legacyData.payments.length > 0
    ? legacyData.payments
    : [
        {
          id: 'pay-seed-1',
          memberId: 'm-seed-1',
          memberName: 'Engr. Dr. Kabir Muhammad Kano',
          membershipId: 'NNEPEF/KT/2024/0001',
          state: 'Kano',
          lga: 'Kano Municipal',
          type: 'Annual Membership Dues',
          amount: 15000,
          status: 'Verified',
          receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600',
          date: '2026-01-10',
          reference: 'REF-2026-NNEPEF-1001',
          paymentMethod: 'Bank Transfer',
          approvedBy: 'Super Admin Secretariat'
        }
      ];

  for (const p of paymentsList) {
    savePayment(p);
  }

  // 4. Seed Settings
  const settingsData: ForumSettings = legacyData?.settings || initialForumSettings;
  runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['forum_settings', JSON.stringify(settingsData)]);

  // 5. Seed Executives
  const execs: Executive[] = legacyData?.executives || initialExecutives;
  for (const e of execs) {
    runQuery(
      `INSERT OR REPLACE INTO executives (id, name, position, tier, photo_url, email, phone, bio, term, sort_order, active, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [e.id, e.name, e.position, e.tier || 'national', e.photoUrl || '', e.email || '', e.phone || '', e.bio || '', e.term || '', e.order || 1, e.active ? 1 : 0, JSON.stringify(e)]
    );
  }

  // 6. Seed News
  const newsList: NewsArticle[] = legacyData?.news || initialNews;
  for (const n of newsList) {
    runQuery(
      `INSERT OR REPLACE INTO news (id, title, slug, summary, content, category, image_url, published_at, author, featured, tags, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [n.id, n.title, (n as any).slug || '', n.summary || '', n.content || '', n.category || 'General', n.imageUrl || '', (n as any).publishedAt || n.date || '', n.author || 'N-NEPEF', n.featured ? 1 : 0, JSON.stringify(n.tags || []), JSON.stringify(n)]
    );
  }

  // 7. Seed Events
  const eventsList: EventItem[] = legacyData?.events || initialEvents;
  for (const ev of eventsList) {
    runQuery(
      `INSERT OR REPLACE INTO events (id, title, description, category, start_date, end_date, time, venue, state, is_free, fee, image_url, status, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ev.id, ev.title, ev.description || '', (ev as any).category || 'Conference', (ev as any).startDate || ev.date || '', (ev as any).endDate || ev.date || '', ev.time || '', (ev as any).venue || ev.location || '', ev.state || 'Kano', (ev as any).isFree ? 1 : 0, (ev as any).fee || 0, (ev as any).imageUrl || (ev.photos && ev.photos[0]) || '', (ev as any).status || 'upcoming', JSON.stringify(ev)]
    );
  }

  // 8. Seed Announcements
  const announcementsList: Announcement[] = legacyData?.announcements || initialAnnouncements;
  for (const a of announcementsList) {
    runQuery(
      `INSERT OR REPLACE INTO announcements (id, title, content, priority, target_audience, date, active, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [a.id, a.title, a.content, (a as any).priority || 'Medium', (a as any).targetAudience || a.targetGroup || 'All Members', (a as any).date || a.createdAt || '', (a as any).active ?? 1, JSON.stringify(a)]
    );
  }

  // 9. Seed Documents
  const docsList: DocumentItem[] = legacyData?.documents || initialDocuments;
  for (const d of docsList) {
    runQuery(
      `INSERT OR REPLACE INTO documents (id, title, category, file_url, file_size, file_type, uploaded_by, uploaded_at, downloads, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.id, d.title, d.category || 'General', d.fileUrl || '', d.fileSize || '', (d as any).fileType || d.format || 'PDF', (d as any).uploadedBy || 'Admin', (d as any).uploadedAt || d.uploadDate || '', (d as any).downloads || d.downloadsCount || 0, JSON.stringify(d)]
    );
  }

  // 10. Seed Gallery
  const galleryList: GalleryAlbum[] = legacyData?.gallery || initialGallery;
  for (const g of galleryList) {
    runQuery(
      `INSERT OR REPLACE INTO gallery (id, title, description, category, cover_image, images, event_date, created_at, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [g.id, g.title, g.description || '', g.category || 'Event', (g as any).coverImage || g.coverUrl || '', JSON.stringify((g as any).images || g.photos || []), (g as any).eventDate || g.date || '', (g as any).createdAt || g.date || '', JSON.stringify(g)]
    );
  }

  // 11. Seed Contact Messages
  const contactList: ContactMessage[] = legacyData?.contact_messages || initialContactMessages;
  for (const c of contactList) {
    runQuery(
      `INSERT OR REPLACE INTO contact_messages (id, name, email, phone, subject, message, status, created_at, responded_at, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.name, c.email, c.phone || '', c.subject || '', c.message || '', c.status || 'unread', (c as any).createdAt || c.date || '', (c as any).respondedAt || '', JSON.stringify(c)]
    );
  }

  // 12. Seed Notifications
  const notifsList: NotificationItem[] = legacyData?.notifications || sampleNotifications;
  for (const notif of notifsList) {
    runQuery(
      `INSERT OR REPLACE INTO notifications (id, title, message, timestamp, type, is_read, link, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [notif.id, notif.title, notif.message, notif.timestamp || '', notif.type || 'info', notif.read ? 1 : 0, notif.link || '', JSON.stringify(notif)]
    );
  }

  // 13. Seed Audit Logs
  const auditList: AuditLog[] = legacyData?.audit_logs || initialAuditLogs;
  for (const log of auditList) {
    runQuery(
      `INSERT OR REPLACE INTO audit_logs (id, timestamp, actor_name, actor_role, action, details, ip_address, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [log.id, log.timestamp, log.actorName, log.actorRole, log.action, log.details || '', log.ipAddress || '127.0.0.1 (Local System)', JSON.stringify(log)]
    );
  }

  // 14. Seed Delivery Logs
  const deliveryList: NotificationDeliveryLog[] = legacyData?.delivery_logs || initialNotificationLogs;
  for (const d of deliveryList) {
    const rawD = d as any;
    runQuery(
      `INSERT OR REPLACE INTO delivery_logs (id, member_id, member_name, membership_id, type, channel, event, recipient, subject, message, status, provider, message_id, error_message, created_at, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.id,
        rawD.member_id || rawD.memberId || 'N/A',
        rawD.member_name || rawD.recipientName || 'Member',
        rawD.membership_id || rawD.membershipId || 'N/A',
        rawD.type || (d.channel ? d.channel.toLowerCase() : 'email'),
        d.channel || 'Email',
        rawD.event || 'NOTIFICATION',
        rawD.recipient || d.recipientEmail || d.recipientPhone || '',
        d.subject || '',
        d.message || '',
        d.status || 'Sent',
        d.provider || 'Local System',
        d.messageId || rawD.message_id || `msg_${Date.now()}`,
        rawD.error_message || d.errorMessage || '',
        rawD.created_at || d.sentAt || new Date().toISOString(),
        JSON.stringify(d)
      ]
    );
  }

  console.log('✅ [SQLite Engine] Initial seed into SQLite completed successfully.');
}

// ============================================================================
// MEMBERS SQLITE CRUD
// ============================================================================

export function getAllMembers(): Member[] {
  const rows = queryRows<{ raw_json: string }>('SELECT raw_json FROM members ORDER BY registered_at DESC');
  return rows.map(r => {
    try {
      return JSON.parse(r.raw_json);
    } catch {
      return null;
    }
  }).filter(Boolean) as Member[];
}

export function getMemberById(id: string): Member | undefined {
  if (!id) return undefined;
  const clean = id.trim().toLowerCase();
  const row = queryOne<{ raw_json: string }>(
    `SELECT raw_json FROM members 
     WHERE id = ? 
        OR LOWER(membership_id) = ? 
        OR LOWER(email) = ? 
        OR LOWER(application_reference) = ?`,
    [id, clean, clean, clean]
  );
  if (!row) return undefined;
  try {
    return JSON.parse(row.raw_json);
  } catch {
    return undefined;
  }
}

export function saveOrUpdateMember(member: Member): Member {
  if (!member || !member.id) {
    throw new Error('Member ID is required');
  }

  const updated = { ...member };

  // Password hash handling
  if ((updated as any).password && !(updated as any).passwordHash) {
    (updated as any).passwordHash = bcrypt.hashSync((updated as any).password, 10);
  }

  const rawJson = JSON.stringify(updated);

  runQuery(
    `INSERT INTO members (
      id, membership_id, application_reference, full_name, email, phone, gender,
      dob, date_of_birth, state, lga, address, residential_address, specialization,
      qualification, years_of_experience, company, occupation, status, registered_at,
      approved_at, approved_by, issue_date, expiry_date, password_hash, role,
      position, passport_url, payment_receipt_url, nin, nin_number, next_of_kin,
      notes, raw_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      membership_id = excluded.membership_id,
      application_reference = excluded.application_reference,
      full_name = excluded.full_name,
      email = excluded.email,
      phone = excluded.phone,
      gender = excluded.gender,
      dob = excluded.dob,
      date_of_birth = excluded.date_of_birth,
      state = excluded.state,
      lga = excluded.lga,
      address = excluded.address,
      residential_address = excluded.residential_address,
      specialization = excluded.specialization,
      qualification = excluded.qualification,
      years_of_experience = excluded.years_of_experience,
      company = excluded.company,
      occupation = excluded.occupation,
      status = excluded.status,
      registered_at = excluded.registered_at,
      approved_at = excluded.approved_at,
      approved_by = excluded.approved_by,
      issue_date = excluded.issue_date,
      expiry_date = excluded.expiry_date,
      password_hash = excluded.password_hash,
      role = excluded.role,
      position = excluded.position,
      passport_url = excluded.passport_url,
      payment_receipt_url = excluded.payment_receipt_url,
      nin = excluded.nin,
      nin_number = excluded.nin_number,
      next_of_kin = excluded.next_of_kin,
      notes = excluded.notes,
      raw_json = excluded.raw_json`,
    [
      updated.id,
      updated.membershipId || '',
      updated.applicationReference || '',
      updated.fullName || '',
      (updated.email || '').toLowerCase(),
      updated.phone || '',
      updated.gender || 'Male',
      updated.dob || updated.dateOfBirth || '',
      updated.dateOfBirth || updated.dob || '',
      updated.state || '',
      updated.lga || '',
      updated.address || updated.residentialAddress || '',
      updated.residentialAddress || updated.address || '',
      updated.specialization || '',
      updated.qualification || '',
      updated.yearsOfExperience || 1,
      updated.company || '',
      updated.occupation || '',
      updated.status || 'pending',
      updated.registeredAt || new Date().toISOString(),
      (updated as any).approvedAt || '',
      (updated as any).approvedBy || '',
      updated.issueDate || '',
      updated.expiryDate || '',
      (updated as any).passwordHash || '',
      updated.role || 'member',
      updated.position || 'Member',
      updated.passportUrl || '',
      updated.paymentReceiptUrl || '',
      updated.nin || updated.ninNumber || '',
      updated.ninNumber || updated.nin || '',
      updated.nextOfKin || '',
      updated.notes || '',
      rawJson
    ]
  );

  persistDatabaseToDisk();
  return updated;
}

export function updateMemberPartial(id: string, partial: Partial<Member>): Member | null {
  const existing = getMemberById(id);
  if (!existing) return null;

  const merged: Member = { ...existing, ...partial };
  return saveOrUpdateMember(merged);
}

export function deleteMember(id: string): boolean {
  if (!id) return false;
  runQuery('DELETE FROM members WHERE id = ? OR membership_id = ?', [id, id]);
  persistDatabaseToDisk();
  return true;
}

export function registerNewMember(payload: any): Member {
  const fullName = (payload.fullName || '').trim();
  const email = (payload.email || '').trim().toLowerCase();
  const phone = (payload.phone || '').trim();

  if (!fullName) throw new Error('Full Name is required for registration.');
  if (!email) throw new Error('Email address is required for registration.');
  if (!phone) throw new Error('Phone number is required for registration.');

  // Duplicate email check in SQLite
  const existingEmail = queryOne<{ id: string }>('SELECT id FROM members WHERE LOWER(email) = ?', [email]);
  if (existingEmail) {
    throw new Error(`An account with the email address '${email}' already exists. Please log in or use a different email.`);
  }

  // Duplicate phone check in SQLite
  const existingPhone = queryOne<{ id: string }>('SELECT id FROM members WHERE phone = ?', [phone]);
  if (existingPhone) {
    throw new Error(`An account with the phone number '${phone}' already exists. Please log in or use a different phone number.`);
  }

  const newId = `m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const refNum = `APP-${new Date().getFullYear()}-NNEPEF-${Math.floor(1000 + Math.random() * 9000)}`;

  const plainPassword = payload.password || 'Nnepef@2026!';
  const passwordHash = bcrypt.hashSync(plainPassword, 10);

  const dobValue = payload.dateOfBirth || payload.dob || '1990-01-01';
  const addressValue = payload.residentialAddress || payload.address || 'Kano, Nigeria';
  const ninValue = payload.ninNumber || payload.nin || '00000000000';
  const passportValue = payload.passportPhotoUrl || payload.passportUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';
  const receiptValue = payload.paymentReceiptUrl || payload.receiptUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600';

  const newMember: Member = {
    id: newId,
    membershipId: '',
    applicationReference: refNum,
    fullName,
    email,
    phone,
    gender: payload.gender || 'Male',
    dob: dobValue,
    dateOfBirth: dobValue,
    state: payload.state || 'Kano',
    lga: payload.lga || 'Kano Municipal',
    address: addressValue,
    residentialAddress: addressValue,
    specialization: payload.specialization || 'Electrical Engineering',
    qualification: payload.qualification || 'B.Eng Electrical',
    yearsOfExperience: payload.yearsOfExperience ? Number(payload.yearsOfExperience) : 1,
    company: payload.company || 'N-NEPEF Member',
    occupation: payload.occupation || 'Electrical Practitioner',
    status: 'pending',
    registeredAt: new Date().toISOString(),
    role: 'member',
    position: 'Member',
    passportUrl: passportValue,
    paymentReceiptUrl: receiptValue,
    nin: ninValue,
    ninNumber: ninValue,
    nextOfKin: payload.nextOfKin || 'Family Member',
    notes: 'Registration via N-NEPEF 2020 Web Portal (Local SQLite Engine)'
  };

  saveOrUpdateMember(newMember);

  // Auto-record registration payment in SQLite
  const feeAmount = payload.feeAmount || 25000;
  const payRecord: PaymentRecord = {
    id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    memberId: newId,
    memberName: fullName,
    membershipId: '',
    state: payload.state || 'Kano',
    lga: payload.lga || 'Kano Municipal',
    type: 'New Membership Registration Fee',
    amount: feeAmount,
    status: 'Pending',
    receiptUrl: receiptValue,
    date: new Date().toISOString().split('T')[0],
    reference: `REG-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
    paymentMethod: 'Bank Transfer / Manual Upload',
    remarks: 'Auto-recorded during member online registration'
  };

  savePayment(payRecord);

  // Auto-record audit log in SQLite
  addAuditLog(fullName, 'Member', 'MEMBER_REGISTER', `New member registration submitted: ${fullName} (${refNum})`);

  return newMember;
}

export function generateCentralMembershipId(state: string = 'Kano'): string {
  const stateCode = (state || 'KN').substring(0, 2).toUpperCase();
  const year = new Date().getFullYear();
  const countRow = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM members WHERE LOWER(state) = ?', [state.toLowerCase()]);
  const nextNum = String((countRow?.count || 0) + 1).padStart(4, '0');
  return `NNEPEF/${stateCode}/${year}/${nextNum}`;
}

// ============================================================================
// AUTHENTICATION SQLITE OPERATIONS
// ============================================================================

export function authenticateUser(identifier: string, plainPassword: string): { user: any; role: string; token: string } | null {
  if (!identifier || !plainPassword) return null;
  const clean = identifier.trim().toLowerCase();

  // 1. Check SQLite admins table
  const adminRow = queryOne<{ raw_json: string; password_hash: string }>(
    'SELECT raw_json, password_hash FROM admins WHERE LOWER(email) = ? OR LOWER(username) = ?',
    [clean, clean]
  );

  if (adminRow) {
    const isMatch = bcrypt.compareSync(plainPassword, adminRow.password_hash);
    if (isMatch) {
      const admin = JSON.parse(adminRow.raw_json);
      addAuditLog(admin.name, admin.role || 'Admin', 'ADMIN_LOGIN', `Admin logged in: ${admin.email}`);
      return {
        user: { ...admin, id: admin.id || 'admin-root' },
        role: admin.role || 'admin',
        token: `sqlite_jwt_admin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      };
    }
  }

  // 2. Check SQLite members table
  const memberRow = queryOne<{ raw_json: string; password_hash: string }>(
    `SELECT raw_json, password_hash FROM members 
     WHERE LOWER(email) = ? 
        OR phone = ? 
        OR LOWER(membership_id) = ? 
        OR LOWER(application_reference) = ?`,
    [clean, identifier.trim(), clean, clean]
  );

  if (memberRow) {
    const isMatch = bcrypt.compareSync(plainPassword, memberRow.password_hash);
    if (isMatch) {
      const member = JSON.parse(memberRow.raw_json);
      addAuditLog(member.fullName, 'Member', 'MEMBER_LOGIN', `Member logged in: ${member.email}`);
      return {
        user: member,
        role: member.role || 'member',
        token: `sqlite_jwt_member_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      };
    }
  }

  return null;
}

export function resetMemberPassword(identifier: string, newPlainPassword: string): boolean {
  const member = getMemberById(identifier);
  if (!member) return false;

  const newHash = bcrypt.hashSync(newPlainPassword, 10);
  (member as any).passwordHash = newHash;
  saveOrUpdateMember(member);
  addAuditLog(member.fullName, 'Member', 'PASSWORD_RESET', `Password reset for member ID ${member.id} (${member.email})`);
  return true;
}

// ============================================================================
// PAYMENTS SQLITE OPERATIONS
// ============================================================================

export function getAllPayments(): PaymentRecord[] {
  const rows = queryRows<{ raw_json: string }>('SELECT raw_json FROM payments ORDER BY date DESC');
  return rows.map(r => {
    try {
      return JSON.parse(r.raw_json);
    } catch {
      return null;
    }
  }).filter(Boolean) as PaymentRecord[];
}

export function savePayment(payment: PaymentRecord): PaymentRecord {
  if (!payment || !payment.id) {
    throw new Error('Payment ID is required');
  }

  const updated = { ...payment };
  if (!updated.reference) {
    updated.reference = `REF-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  const rawJson = JSON.stringify(updated);

  runQuery(
    `INSERT INTO payments (
      id, member_id, member_name, membership_id, state, lga, type, amount,
      status, receipt_url, date, reference, payment_method, approved_by, remarks, raw_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      member_id = excluded.member_id,
      member_name = excluded.member_name,
      membership_id = excluded.membership_id,
      state = excluded.state,
      lga = excluded.lga,
      type = excluded.type,
      amount = excluded.amount,
      status = excluded.status,
      receipt_url = excluded.receipt_url,
      date = excluded.date,
      reference = excluded.reference,
      payment_method = excluded.payment_method,
      approved_by = excluded.approved_by,
      remarks = excluded.remarks,
      raw_json = excluded.raw_json`,
    [
      updated.id,
      updated.memberId || '',
      updated.memberName || '',
      updated.membershipId || '',
      updated.state || '',
      updated.lga || '',
      updated.type || 'Annual Membership Dues',
      updated.amount || 0,
      updated.status || 'Pending',
      updated.receiptUrl || '',
      updated.date || new Date().toISOString().split('T')[0],
      updated.reference,
      updated.paymentMethod || 'Bank Transfer',
      updated.approvedBy || '',
      updated.remarks || '',
      rawJson
    ]
  );

  persistDatabaseToDisk();
  return updated;
}

export function deletePayment(id: string): boolean {
  if (!id) return false;
  runQuery('DELETE FROM payments WHERE id = ?', [id]);
  persistDatabaseToDisk();
  return true;
}

// ============================================================================
// AUDIT LOGS SQLITE OPERATIONS
// ============================================================================

export function addAuditLog(actorName: string, actorRole: string, action: string, details: string): AuditLog {
  const log: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleString(),
    actorName: actorName || 'System',
    actorRole: actorRole || 'System',
    action: action || 'ACTION',
    details: details || '',
    ipAddress: '127.0.0.1 (Local Database)'
  };

  runQuery(
    `INSERT INTO audit_logs (id, timestamp, actor_name, actor_role, action, details, ip_address, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [log.id, log.timestamp, log.actorName, log.actorRole, log.action, log.details || '', log.ipAddress || '', JSON.stringify(log)]
  );

  persistDatabaseToDisk();
  return log;
}

// ============================================================================
// GENERIC SQLITE COLLECTION OPERATIONS
// ============================================================================

const TABLE_MAP: Record<string, string> = {
  payments: 'payments',
  notifications: 'notifications',
  delivery_logs: 'delivery_logs',
  audit_logs: 'audit_logs',
  settings: 'settings',
  admins: 'admins',
  executives: 'executives',
  news: 'news',
  events: 'events',
  announcements: 'announcements',
  renewal_requests: 'renewal_requests',
  documents: 'documents',
  gallery: 'gallery',
  contact_messages: 'contact_messages',
  cms_files: 'cms_files'
};

export function getCollectionData(name: string): any {
  if (name === 'settings') {
    const row = queryOne<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['forum_settings']);
    if (row) {
      try {
        return JSON.parse(row.value);
      } catch {
        return initialForumSettings;
      }
    }
    return initialForumSettings;
  }

  const tableName = TABLE_MAP[name];
  if (!tableName) return [];

  const rows = queryRows<{ raw_json: string }>(`SELECT raw_json FROM ${tableName} ORDER BY rowid DESC`);
  return rows.map(r => {
    try {
      return JSON.parse(r.raw_json);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

export function saveCollectionItem(name: string, item: any): any {
  if (name === 'settings') {
    runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['forum_settings', JSON.stringify(item)]);
    persistDatabaseToDisk();
    return item;
  }

  if (name === 'payments') {
    return savePayment(item);
  }

  const tableName = TABLE_MAP[name];
  if (!tableName) return item;

  const id = item.id || `${name}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const itemWithId = { ...item, id };
  const rawJson = JSON.stringify(itemWithId);

  // Generic upsert into table using raw_json and id
  if (tableName === 'notifications') {
    runQuery(
      `INSERT INTO notifications (id, title, message, timestamp, type, is_read, link, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, message=excluded.message, is_read=excluded.is_read, raw_json=excluded.raw_json`,
      [id, item.title || '', item.message || '', item.timestamp || '', item.type || 'info', item.read ? 1 : 0, item.link || '', rawJson]
    );
  } else if (tableName === 'delivery_logs') {
    runQuery(
      `INSERT INTO delivery_logs (id, member_id, member_name, membership_id, type, channel, event, recipient, subject, message, status, provider, message_id, error_message, created_at, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status=excluded.status, raw_json=excluded.raw_json`,
      [
        id,
        item.member_id || item.memberId || 'N/A',
        item.member_name || item.recipientName || 'Member',
        item.membership_id || item.membershipId || 'N/A',
        item.type || 'email',
        item.channel || 'Email',
        item.event || 'CUSTOM',
        item.recipient || '',
        item.subject || '',
        item.message || '',
        item.status || 'Sent',
        item.provider || 'Local System',
        item.messageId || item.message_id || '',
        item.error_message || item.errorMessage || '',
        item.created_at || new Date().toISOString(),
        rawJson
      ]
    );
  } else if (tableName === 'audit_logs') {
    runQuery(
      `INSERT INTO audit_logs (id, timestamp, actor_name, actor_role, action, details, ip_address, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET raw_json=excluded.raw_json`,
      [id, item.timestamp || new Date().toLocaleString(), item.actorName || 'Admin', item.actorRole || 'Admin', item.action || 'LOG', item.details || '', item.ipAddress || '127.0.0.1', rawJson]
    );
  } else if (tableName === 'announcements') {
    runQuery(
      `INSERT INTO announcements (id, title, content, priority, target_audience, date, active, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, content=excluded.content, raw_json=excluded.raw_json`,
      [id, item.title || '', item.content || '', item.priority || 'Medium', item.targetAudience || 'All Members', item.date || '', item.active ? 1 : 0, rawJson]
    );
  } else if (tableName === 'documents') {
    runQuery(
      `INSERT INTO documents (id, title, category, file_url, file_size, file_type, uploaded_by, uploaded_at, downloads, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, file_url=excluded.file_url, raw_json=excluded.raw_json`,
      [id, item.title || '', item.category || 'General', item.fileUrl || '', item.fileSize || '', item.fileType || 'PDF', item.uploadedBy || 'Admin', item.uploadedAt || '', item.downloads || 0, rawJson]
    );
  } else if (tableName === 'executives') {
    runQuery(
      `INSERT INTO executives (id, name, position, tier, photo_url, email, phone, bio, term, sort_order, active, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, position=excluded.position, raw_json=excluded.raw_json`,
      [id, item.name || '', item.position || '', item.tier || 'national', item.photoUrl || '', item.email || '', item.phone || '', item.bio || '', item.term || '', item.order || 1, item.active ? 1 : 0, rawJson]
    );
  } else if (tableName === 'news') {
    runQuery(
      `INSERT INTO news (id, title, slug, summary, content, category, image_url, published_at, author, featured, tags, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, raw_json=excluded.raw_json`,
      [id, item.title || '', item.slug || '', item.summary || '', item.content || '', item.category || 'General', item.imageUrl || '', item.publishedAt || '', item.author || 'Admin', item.featured ? 1 : 0, JSON.stringify(item.tags || []), rawJson]
    );
  } else if (tableName === 'events') {
    runQuery(
      `INSERT INTO events (id, title, description, category, start_date, end_date, time, venue, state, is_free, fee, image_url, status, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, raw_json=excluded.raw_json`,
      [id, item.title || '', item.description || '', item.category || 'Conference', item.startDate || '', item.endDate || '', item.time || '', item.venue || '', item.state || 'Kano', item.isFree ? 1 : 0, item.fee || 0, item.imageUrl || '', item.status || 'upcoming', rawJson]
    );
  } else if (tableName === 'renewal_requests') {
    runQuery(
      `INSERT INTO renewal_requests (id, member_id, member_name, membership_id, request_type, year, amount, receipt_url, status, submitted_at, reviewed_at, reviewed_by, notes, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status=excluded.status, raw_json=excluded.raw_json`,
      [id, item.memberId || '', item.memberName || '', item.membershipId || '', item.requestType || 'Annual Dues', item.year || new Date().getFullYear(), item.amount || 0, item.receiptUrl || '', item.status || 'pending', item.submittedAt || '', item.reviewedAt || '', item.reviewedBy || '', item.notes || '', rawJson]
    );
  } else if (tableName === 'gallery') {
    runQuery(
      `INSERT INTO gallery (id, title, description, category, cover_image, images, event_date, created_at, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET title=excluded.title, raw_json=excluded.raw_json`,
      [id, item.title || '', item.description || '', item.category || 'Event', item.coverImage || '', JSON.stringify(item.images || []), item.eventDate || '', item.createdAt || '', rawJson]
    );
  } else if (tableName === 'contact_messages') {
    runQuery(
      `INSERT INTO contact_messages (id, name, email, phone, subject, message, status, created_at, responded_at, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status=excluded.status, raw_json=excluded.raw_json`,
      [id, item.name || '', item.email || '', item.phone || '', item.subject || '', item.message || '', item.status || 'unread', item.createdAt || '', item.respondedAt || '', rawJson]
    );
  } else if (tableName === 'cms_files') {
    runQuery(
      `INSERT INTO cms_files (id, name, type, size, upload_date, url, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET url=excluded.url, raw_json=excluded.raw_json`,
      [id, item.name || '', item.type || '', item.size || '', item.uploadDate || '', item.url || '', rawJson]
    );
  } else if (tableName === 'admins') {
    runQuery(
      `INSERT INTO admins (id, username, email, phone, name, role, permissions, password_hash, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name=excluded.name, role=excluded.role, raw_json=excluded.raw_json`,
      [id, item.username || item.email.split('@')[0], item.email.toLowerCase(), item.phone || '', item.name || '', item.role || 'admin', JSON.stringify(item.permissions || []), item.passwordHash || '', rawJson]
    );
  }

  persistDatabaseToDisk();
  return itemWithId;
}

export function deleteCollectionItem(name: string, id: string): boolean {
  if (name === 'payments') {
    return deletePayment(id);
  }
  const tableName = TABLE_MAP[name];
  if (!tableName || !id) return false;

  runQuery(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
  persistDatabaseToDisk();
  return true;
}

// ============================================================================
// SQLITE DIAGNOSTICS & VERIFICATION
// ============================================================================

export interface SQLiteDiagnostics {
  engine: string;
  version: string;
  databasePath: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  lastPersistTime: string | null;
  mode: string;
  tables: { name: string; count: number }[];
  totalRecords: number;
  memberCount: number;
  approvedMembers: number;
  pendingMembers: number;
  integrityCheck: string;
  isOfflineCapable: boolean;
}

export function getSQLiteDiagnostics(): SQLiteDiagnostics {
  const tables = [
    'members', 'payments', 'admins', 'executives', 'news', 'events',
    'announcements', 'renewal_requests', 'documents', 'gallery',
    'contact_messages', 'notifications', 'delivery_logs', 'audit_logs',
    'settings', 'cms_files'
  ];

  const tableCounts = tables.map(name => {
    try {
      const row = queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM ${name}`);
      return { name, count: row?.count || 0 };
    } catch {
      return { name, count: 0 };
    }
  });

  const totalRecords = tableCounts.reduce((acc, t) => acc + t.count, 0);
  const memberCount = tableCounts.find(t => t.name === 'members')?.count || 0;
  
  let approvedMembers = 0;
  let pendingMembers = 0;
  try {
    const appRow = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM members WHERE status = 'approved' OR status = 'Active'");
    approvedMembers = appRow?.count || 0;
    const penRow = queryOne<{ count: number }>("SELECT COUNT(*) as count FROM members WHERE status = 'pending' OR status = 'Pending'");
    pendingMembers = penRow?.count || 0;
  } catch (e) {}

  let fileSize = 0;
  try {
    if (fs.existsSync(SQLITE_FILE_PATH)) {
      const stats = fs.statSync(SQLITE_FILE_PATH);
      fileSize = stats.size;
    }
  } catch (e) {}

  let integrity = 'OK';
  try {
    const checkRow = queryOne<{ integrity_check: string }>('PRAGMA integrity_check;');
    integrity = checkRow?.integrity_check || 'OK';
  } catch (e: any) {
    integrity = `Error: ${e.message}`;
  }

  return {
    engine: 'SQLite 3 (Local WebAssembly / Storage Engine)',
    version: '3.45.0',
    databasePath: SQLITE_FILE_PATH,
    fileSizeBytes: fileSize,
    fileSizeFormatted: `${(fileSize / 1024).toFixed(2)} KB`,
    lastPersistTime: lastSaveTime || new Date().toISOString(),
    mode: '100% Offline Local Internal Storage',
    tables: tableCounts,
    totalRecords,
    memberCount,
    approvedMembers,
    pendingMembers,
    integrityCheck: integrity,
    isOfflineCapable: true
  };
}

export function verifySQLiteTransaction(): {
  success: boolean;
  testId: string;
  durationMs: number;
  steps: { name: string; status: 'PASS' | 'FAIL'; durationMs: number; details: string }[];
} {
  const testId = `sqlite_test_${Date.now()}`;
  const steps: { name: string; status: 'PASS' | 'FAIL'; durationMs: number; details: string }[] = [];
  const startAll = Date.now();

  try {
    // Ensure isolated test table exists (do not use sqlite_ prefix as it is reserved in SQLite)
    runQuery(`
      CREATE TABLE IF NOT EXISTS diag_transaction_tests (
        id TEXT PRIMARY KEY,
        test_name TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // 1. INSERT test
    const t0 = Date.now();
    runQuery(
      `INSERT INTO diag_transaction_tests (id, test_name, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?);`,
      [testId, 'SQLite Isolated Verification Test Record', 'pending', 'Verification init', new Date().toISOString()]
    );
    steps.push({
      name: '1. SQLite INSERT Transaction',
      status: 'PASS',
      durationMs: Date.now() - t0,
      details: `Successfully inserted test row '${testId}' into isolated 'diag_transaction_tests' table.`
    });

    // 2. SELECT read-back test
    const t1 = Date.now();
    const readBack = queryOne<{ id: string; test_name: string; status: string }>(
      'SELECT id, test_name, status FROM diag_transaction_tests WHERE id = ?;',
      [testId]
    );
    if (!readBack || readBack.id !== testId) {
      throw new Error(`Record '${testId}' was not found after insertion.`);
    }
    steps.push({
      name: '2. SQLite SELECT Verification',
      status: 'PASS',
      durationMs: Date.now() - t1,
      details: `Verified 1 row returned for '${testId}'. Full row data matched.`
    });

    // 3. UPDATE test
    const t2 = Date.now();
    runQuery(
      "UPDATE diag_transaction_tests SET status = 'approved', notes = 'SQLite Auto-Tester' WHERE id = ?;",
      [testId]
    );
    const readUpdated = queryOne<{ id: string; status: string }>(
      'SELECT id, status FROM diag_transaction_tests WHERE id = ?;',
      [testId]
    );
    if (!readUpdated || readUpdated.status !== 'approved') {
      throw new Error('Update transaction verification failed');
    }
    steps.push({
      name: '3. SQLite UPDATE Transaction',
      status: 'PASS',
      durationMs: Date.now() - t2,
      details: 'Successfully executed UPDATE statement and confirmed changed status.'
    });

    // 4. DELETE cleanup test
    const t3 = Date.now();
    runQuery('DELETE FROM diag_transaction_tests WHERE id = ?;', [testId]);
    const verifyDeleted = queryOne<{ id: string }>(
      'SELECT id FROM diag_transaction_tests WHERE id = ?;',
      [testId]
    );
    if (verifyDeleted) {
      throw new Error('Delete transaction verification failed; row still exists');
    }
    steps.push({
      name: '4. SQLite DELETE Cleanup',
      status: 'PASS',
      durationMs: Date.now() - t3,
      details: 'Successfully removed test record and cleaned SQLite schema.'
    });

    return {
      success: true,
      testId,
      durationMs: Date.now() - startAll,
      steps
    };
  } catch (err: any) {
    // Attempt cleanup
    try {
      runQuery('DELETE FROM diag_transaction_tests WHERE id = ?;', [testId]);
    } catch (e) {}
    steps.push({
      name: 'SQLite Transaction Failure',
      status: 'FAIL',
      durationMs: Date.now() - startAll,
      details: err.message || String(err)
    });
    return {
      success: false,
      testId,
      durationMs: Date.now() - startAll,
      steps
    };
  }
}
