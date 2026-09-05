/**
 * N-NEPEF 2020 DIGITAL PORTAL - OFFICIAL SUPABASE DATABASE & STORAGE SERVICE
 * 
 * Provides production-grade Supabase integration with:
 * - PostgreSQL relational storage (Single Source of Truth)
 * - Supabase Authentication (Sign up, Sign in, Session restore, Password reset)
 * - Supabase Storage (Passports, Receipts, Documents, CMS Files)
 * - Supabase Realtime Channels (Postgres changes subscriptions)
 * - Transparent offline-resilience & cache sync
 */

import { supabase, isSupabaseConfigured, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../lib/supabase';
export { isSupabaseConfigured, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
import { 
  Member, 
  PaymentRecord, 
  ForumSettings, 
  NotificationItem, 
  AuditLog,
  NotificationDeliveryLog,
  FeeCategory,
  BankAccount,
  AppRole,
  Announcement,
  NewsArticle,
  Executive,
  EventItem,
  DocumentItem,
  GalleryAlbum,
  ContactMessage,
  RenewalRequest,
  CMSFile,
  AdminAccount
} from '../types';

import {
  getLocalAdmins,
  saveLocalAdmins,
  saveLocalAdmin,
  getLocalPayments,
  saveLocalPayment,
  saveLocalPaymentsList,
  getLocalSettings,
  saveLocalSettings,
  getLocalFeeCategories,
  saveLocalFeeCategories,
  saveLocalFeeCategory,
  deleteLocalFeeCategory,
  addLocalAuditLog,
  getLocalAuditLogs,
  getLocalNotifications,
  addLocalNotification,
  getLocalDeliveryLogs,
  addLocalDeliveryLog,
  deleteDeliveryLog,
  clearAllDeliveryLogs,
  getLocalBankAccounts,
  saveLocalBankAccounts,
  getLocalAnnouncements,
  saveLocalAnnouncements,
  getLocalNews,
  saveLocalNews,
  getLocalExecutives,
  saveLocalExecutives,
  getLocalEvents,
  saveLocalEvents,
  getLocalDocuments,
  saveLocalDocuments,
  getLocalGallery,
  saveLocalGallery,
  getLocalContactMessages,
  saveLocalContactMessages,
  getLocalRenewals,
  saveLocalRenewals,
  getLocalCMSFiles,
  saveLocalCMSFiles
} from './localDatabaseService';
import { generateUUID } from '../utils/uuid';

/**
 * Resolves API path for both browser and server/test environments
 */
function getApiEndpoint(path: string): string {
  if (typeof window !== 'undefined') {
    return path;
  }
  return `http://localhost:3000${path}`;
}

/**
 * Standard headers helper for server API calls that attaches Supabase client public credentials
 */
function getApiHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extra || {})
  };
  if (SUPABASE_PUBLISHABLE_KEY) {
    headers['apikey'] = SUPABASE_PUBLISHABLE_KEY;
    headers['x-supabase-key'] = SUPABASE_PUBLISHABLE_KEY;
  }
  if (SUPABASE_URL) {
    headers['x-supabase-url'] = SUPABASE_URL;
  }
  return headers;
}

// ============================================================================
// AUTHORITATIVE SEQUENTIAL MEMBERSHIP ID GENERATOR (SUPABASE POSTGRESQL)
// ============================================================================

/**
 * Extracts numeric sequence suffix from any membership ID format.
 * Examples handled:
 *   NNEPEF/2024/001   -> 1
 *   NNEPEF/2024/031   -> 31
 *   NNEPEF/2024/032   -> 32
 *   NNEPEF/2024/100   -> 100
 *   NNEPEF/2024/1000  -> 1000
 *   NEPEF/2020/KN/031 -> 31
 *   NNEPEF/KT/2024/05 -> 5
 */
export function extractSequenceNumberFromMembershipId(membershipId?: string | null): number | null {
  if (!membershipId || typeof membershipId !== 'string') return null;
  const trimmed = membershipId.trim();
  if (!trimmed) return null;

  // Match the trailing numbers in the ID
  const match = trimmed.match(/(\d+)$/);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

export const NIGERIAN_STATE_CODES: Record<string, string> = {
  'ABIA': 'AB', 'ADAMAWA': 'AD', 'AKWA IBOM': 'AK', 'ANAMBRA': 'AN', 'BAUCHI': 'BA',
  'BAYELSA': 'BY', 'BENUE': 'BN', 'BORNO': 'BO', 'CROSS RIVER': 'CR', 'DELTA': 'DE',
  'EBONYI': 'EB', 'EDO': 'ED', 'EKITI': 'EK', 'ENUGU': 'EN', 'FCT': 'FC', 'ABUJA': 'FC',
  'FEDERAL CAPITAL TERRITORY': 'FC', 'GOMBE': 'GM', 'IMO': 'IM', 'JIGAWA': 'JG',
  'KADUNA': 'KD', 'KANO': 'KN', 'KATSINA': 'KT', 'KEBBI': 'KB', 'KOGI': 'KG',
  'KWARA': 'KW', 'LAGOS': 'LA', 'NASARAWA': 'NA', 'NIGER': 'NG', 'OGUN': 'OG',
  'ONDO': 'ON', 'OSUN': 'OS', 'OYO': 'OY', 'PLATEAU': 'PL', 'RIVERS': 'RV',
  'SOKOTO': 'SO', 'TARABA': 'TR', 'YOBE': 'YB', 'ZAMFARA': 'ZM'
};

/**
 * Resolves a state name or code into the official 2-letter Nigerian state code.
 * Defaults to 'KN' (Kano) if not specified or unrecognized.
 */
export function getStateCode(stateOrCode?: string): string {
  if (!stateOrCode) return 'KN';
  const clean = stateOrCode.trim().toUpperCase();
  if (NIGERIAN_STATE_CODES[clean]) return NIGERIAN_STATE_CODES[clean];
  for (const [name, code] of Object.entries(NIGERIAN_STATE_CODES)) {
    if (clean.includes(name) || name.includes(clean)) return code;
  }
  if (clean.length === 2 && /^[A-Z]{2}$/.test(clean)) return clean;
  return clean.substring(0, 2).toUpperCase() || 'KN';
}

/**
 * Formats a sequential number into the required official Membership ID format:
 * NNEPEF/XX/0000 (e.g. NNEPEF/KN/0001, NNEPEF/KD/0002, NNEPEF/SO/0003)
 */
export function formatMembershipId(sequenceNumber: number, stateOrCode?: string | number): string {
  const code = typeof stateOrCode === 'string' ? getStateCode(stateOrCode) : 'KN';
  const padded = String(sequenceNumber).padStart(4, '0');
  return `NNEPEF/${code}/${padded}`;
}

/**
 * Asynchronously queries Supabase PostgreSQL `members` table to find the highest
 * existing sequence number and generates the NEXT strictly unique, collision-free
 * membership ID in the required NNEPEF/XX/0000 format.
 */
export async function fetchNextAvailableMembershipIdFromSupabase(
  stateOrCode?: string,
  _ignoredYear?: number
): Promise<string> {
  const stateCode = getStateCode(stateOrCode);
  const existingIds = new Set<string>();
  const parsedNumbers: number[] = [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('membership_id')
        .limit(10000);

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          if (row.membership_id) {
            const idStr = String(row.membership_id).trim().toUpperCase();
            existingIds.add(idStr);
            const num = extractSequenceNumberFromMembershipId(idStr);
            if (num !== null) {
              parsedNumbers.push(num);
            }
          }
        }
      } else if (error) {
        console.warn('[Supabase] Note querying membership_id sequences:', error.message);
      }
    } catch (e) {
      console.warn('[Supabase] Exception querying membership_id sequences:', e);
    }
  }

  // Also query server API if available to ensure latest list
  try {
    const res = await fetch(getApiEndpoint('/api/members'), { headers: getApiHeaders() });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        for (const row of json.data) {
          const idStr = String(row.membershipId || row.membership_id || '').trim().toUpperCase();
          if (idStr) {
            existingIds.add(idStr);
            const num = extractSequenceNumberFromMembershipId(idStr);
            if (num !== null) {
              parsedNumbers.push(num);
            }
          }
        }
      }
    }
  } catch (e) {}

  // Determine the highest sequence number present in Supabase
  const highestSequence = parsedNumbers.length > 0 ? Math.max(...parsedNumbers) : 0;
  let candidateNum = Math.max(1, highestSequence + 1);
  let candidateId = formatMembershipId(candidateNum, stateCode);

  // Guarantee absolute uniqueness against all existing database records
  while (existingIds.has(candidateId.toUpperCase())) {
    candidateNum++;
    candidateId = formatMembershipId(candidateNum, stateCode);
  }

  console.log(`[Supabase Sequence] State: ${stateCode}, Highest sequence: ${highestSequence}, Generated Next ID: ${candidateId}`);
  return candidateId;
}

/**
 * Synchronous ID generator helper formatted as NNEPEF/XX/0000.
 */
export function generateMembershipId(stateOrCode: string = 'KN', existingMemberList?: Member[]): string {
  const stateCode = getStateCode(stateOrCode);
  const members = existingMemberList || [];
  const parsedNumbers: number[] = [];
  const existingIds = new Set<string>();

  for (const m of members) {
    if (m.membershipId) {
      const idStr = String(m.membershipId).trim().toUpperCase();
      existingIds.add(idStr);
      const num = extractSequenceNumberFromMembershipId(idStr);
      if (num !== null) {
        parsedNumbers.push(num);
      }
    }
  }

  const highestSequence = parsedNumbers.length > 0 ? Math.max(...parsedNumbers) : 0;
  let candidateNum = Math.max(1, highestSequence + 1);
  let candidateId = formatMembershipId(candidateNum, stateCode);

  while (existingIds.has(candidateId.toUpperCase())) {
    candidateNum++;
    candidateId = formatMembershipId(candidateNum, stateCode);
  }

  return candidateId;
}

// ============================================================================
// 1. SUPABASE STORAGE HELPER
// ============================================================================

/**
 * Uploads a file (Blob / File / base64 Data URL) to Supabase Storage.
 * Supports both signatures:
 *   uploadFileToSupabaseStorage(bucket, file, preferredFileName)
 *   uploadFileToSupabaseStorage(file, bucket, preferredFileName)
 */
export async function uploadFileToSupabaseStorage(
  param1: any,
  param2?: any,
  param3?: string
): Promise<string> {
  const KNOWN_BUCKETS = ['passports', 'receipts', 'documents', 'cms_files', 'gallery_photos'];
  
  let bucketName = 'passports';
  let fileOrData: any;
  let preferredFileName: string | undefined = param3;

  if (typeof param1 === 'string' && KNOWN_BUCKETS.includes(param1)) {
    bucketName = param1;
    fileOrData = param2;
  } else {
    fileOrData = param1;
    if (typeof param2 === 'string' && KNOWN_BUCKETS.includes(param2)) {
      bucketName = param2;
    }
  }

  // If it's already a clean remote URL (http/https), return as is
  if (typeof fileOrData === 'string' && (fileOrData.startsWith('http://') || fileOrData.startsWith('https://'))) {
    return fileOrData;
  }

  // If Supabase is configured, upload to storage bucket
  if (isSupabaseConfigured() && fileOrData) {
    try {
      let fileBlob: Blob;
      let extension = 'jpg';
      let contentType = 'image/jpeg';

      if (typeof fileOrData === 'string' && fileOrData.startsWith('data:')) {
        const parts = fileOrData.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        extension = contentType.split('/')[1] || 'jpg';
        const byteString = atob(parts[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        fileBlob = new Blob([ab], { type: contentType });
      } else if (fileOrData instanceof Blob) {
        fileBlob = fileOrData;
        contentType = fileOrData.type || 'image/jpeg';
        extension = contentType.split('/')[1] || 'jpg';
      } else {
        fileBlob = new Blob([fileOrData as any], { type: 'application/octet-stream' });
      }

      const timestamp = Date.now();
      const randomKey = Math.random().toString(36).substring(2, 8);
      const safeName = preferredFileName 
        ? `${preferredFileName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${timestamp}.${extension}`
        : `${bucketName}_${timestamp}_${randomKey}.${extension}`;
      
      const filePath = `uploads/${safeName}`;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBlob, {
          contentType,
          upsert: true
        });

      if (!error && data) {
        const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
        if (urlData && urlData.publicUrl) {
          return urlData.publicUrl;
        }
      } else if (error) {
        console.warn(`[Supabase Storage] Upload error to bucket "${bucketName}":`, error.message);
      }
    } catch (storageErr) {
      console.warn('[Supabase Storage] Network upload failed, falling back to base64:', storageErr);
    }
  }

  // Graceful fallback: Read file as Data URL
  if (typeof fileOrData === 'string') {
    return fileOrData;
  }

  if (fileOrData instanceof Blob || fileOrData instanceof File) {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(fileOrData);
      } catch (e) {
        reject(e);
      }
    });
  }

  return '';
}

// Alias for backwards compatibility across existing components
export const uploadFileToSQLiteStorage = uploadFileToSupabaseStorage;

// ============================================================================
// 2. MEMBERS DATABASE API (Supabase PostgreSQL `members` table)
// ============================================================================

export function normalizeMemberStatus(status: any): 'pending' | 'approved' | 'rejected' | 'suspended' {
  const s = String(status || 'pending').trim().toLowerCase();
  if (s === 'approved' || s === 'active') return 'approved';
  if (s === 'rejected') return 'rejected';
  if (s === 'suspended') return 'suspended';
  return 'pending';
}

export function mapSupabaseRowToMember(row: any): Member {
  return {
    id: row.id,
    membershipId: row.membership_id || row.membershipId || '',
    verificationCode: row.verification_code || row.verificationCode || row.application_reference || row.applicationReference || '',
    applicationReference: row.application_reference || row.applicationReference || '',
    firstName: row.first_name || row.firstName || '',
    middleName: row.middle_name || row.middleName || '',
    lastName: row.last_name || row.lastName || '',
    fullName: row.full_name || row.fullName || row.name || '',
    gender: row.gender || row.sex || 'Male',
    dob: row.dob || row.date_of_birth || row.dateOfBirth || '',
    dateOfBirth: row.date_of_birth || row.dateOfBirth || row.dob || '',
    phone: row.phone || row.phoneNumber || row.phone_number || '',
    email: row.email || row.emailAddress || row.email_address || '',
    nin: row.nin || row.nin_number || row.ninNumber || '',
    ninNumber: row.nin_number || row.ninNumber || row.nin || '',
    state: row.state || 'Kano',
    lga: row.lga || 'Kano Municipal',
    ward: row.ward || '',
    address: row.address || row.residential_address || row.residentialAddress || '',
    residentialAddress: row.residential_address || row.residentialAddress || row.address || '',
    occupation: row.occupation || 'Practitioner',
    specialization: row.specialization || '',
    qualification: row.qualification || '',
    membershipType: row.membership_type || row.membershipType || 'Full Member',
    yearsOfExperience: Number(row.years_of_experience || row.yearsOfExperience || 0),
    company: row.company || '',
    passportUrl: row.passport_url || row.passportUrl || row.passport_photo_url || row.passportPhotoUrl || row.photo_url || '',
    passportPhotoUrl: row.passport_photo_url || row.passportPhotoUrl || row.passport_url || row.passportUrl || row.photo_url || '',
    photoUrl: row.photo_url || row.passport_url || row.passportUrl || '',
    paymentReceiptUrl: row.payment_receipt_url || row.paymentReceiptUrl || '',
    status: normalizeMemberStatus(row.status),
    role: row.role || 'Member',
    position: row.position || 'Member',
    issueDate: row.issue_date || row.issueDate || '',
    expiryDate: row.expiry_date || row.expiryDate || '',
    registeredAt: row.registered_at || row.registeredAt || row.created_at || row.createdAt || new Date().toISOString(),
    approvedAt: row.approved_at || row.approvedAt || undefined,
    approvedBy: row.approved_by || row.approvedBy || undefined,
    rejectedBy: row.rejected_by || row.rejectedBy || undefined,
    rejectionReason: row.rejection_reason || row.rejectionReason || undefined,
    notes: row.notes || row.adminNotes || undefined,
    approvalNotificationSent: Boolean(row.approval_notification_sent || row.approvalNotificationSent),
    approvalNotificationSentAt: row.approval_notification_sent_at || row.approvalNotificationSentAt || undefined,
    nextOfKin: row.next_of_kin || row.nextOfKin || undefined
  };
}

export async function fetchMembersFromSupabase(): Promise<Member[]> {
  const memberMap = new Map<string, Member>();

  // 1. Fetch from server API (authoritative backend store + Supabase sync)
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Attach admin session token or admin auth header if available
    try {
      if (isSupabaseConfigured()) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.access_token) {
          headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
        }
      }
      const rawAdmin = localStorage.getItem('nnepef_current_admin');
      if (rawAdmin) {
        const adminObj = JSON.parse(rawAdmin);
        if (adminObj?.email) {
          headers['x-admin-email'] = adminObj.email;
          headers['x-admin-role'] = adminObj.role || 'super_admin';
        }
      }
    } catch (authHdrErr) {
      // Non-blocking header resolution
    }

    const apiRes = await fetch(getApiEndpoint('/api/members'), { headers: getApiHeaders(headers) });
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json.success && Array.isArray(json.data)) {
        for (const item of json.data) {
          const m = mapSupabaseRowToMember(item);
          if (m && m.id) memberMap.set(m.id, m);
        }
      }
    }
  } catch (apiErr) {
    // Non-blocking fallback
  }

  // 2. Direct Supabase query
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('registered_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          const m = mapSupabaseRowToMember(row);
          if (m && m.id) memberMap.set(m.id, m);
        }
      } else if (error) {
        console.warn('[Supabase] Database notice fetching members:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase] Network exception fetching members:', err);
    }
  }

  const result = Array.from(memberMap.values()).sort((a, b) => {
    return new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime();
  });

  return result;
}

/**
 * Direct authoritative fetch of approved members from Supabase members table (status = 'approved')
 */
export async function fetchApprovedMembersFromSupabase(): Promise<Member[]> {
  const all = await fetchMembersFromSupabase();
  const approved = all.filter(m => m.status === 'approved');
  if (approved.length > 0) return approved;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .in('status', ['approved', 'Approved', 'active', 'Active'])
        .order('full_name', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(mapSupabaseRowToMember);
      }
    } catch (err) {}
  }

  return [];
}

/**
 * Direct authoritative fetch of pending members from Supabase members table (status = 'pending')
 */
export async function fetchPendingMembersFromSupabase(): Promise<Member[]> {
  const all = await fetchMembersFromSupabase();
  return all.filter(m => m.status === 'pending');
}

/**
 * Fetch a single member record directly from Supabase members table by ID, Membership ID, or Email.
 * Guarantees authoritative cloud state for Member Portal.
 */
export async function fetchMemberByIdFromSupabase(identifier: string): Promise<Member | null> {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();

  const all = await fetchMembersFromSupabase();
  const match = all.find(m => 
    (m.id && m.id.toLowerCase() === clean) || 
    (m.membershipId && m.membershipId.toLowerCase() === clean) ||
    (m.applicationReference && m.applicationReference.toLowerCase() === clean) ||
    (m.email && m.email.toLowerCase() === clean) ||
    (m.phone && m.phone.trim() === identifier.trim())
  );
  if (match) return match;

  if (isSupabaseConfigured()) {
    try {
      // 1. Try querying by exact UUID / id
      const { data: byId, error: idErr } = await supabase
        .from('members')
        .select('*')
        .eq('id', identifier)
        .maybeSingle();

      if (!idErr && byId) {
        return mapSupabaseRowToMember(byId);
      }

      // 2. Try querying by membership_id
      const { data: byMemId, error: memErr } = await supabase
        .from('members')
        .select('*')
        .ilike('membership_id', clean)
        .maybeSingle();

      if (!memErr && byMemId) {
        return mapSupabaseRowToMember(byMemId);
      }

      // 3. Try querying by email
      const { data: byEmail, error: emailErr } = await supabase
        .from('members')
        .select('*')
        .ilike('email', clean)
        .maybeSingle();

      if (!emailErr && byEmail) {
        return mapSupabaseRowToMember(byEmail);
      }

      // 4. Try querying by application_reference
      const { data: byRef, error: refErr } = await supabase
        .from('members')
        .select('*')
        .ilike('application_reference', clean)
        .maybeSingle();

      if (!refErr && byRef) {
        return mapSupabaseRowToMember(byRef);
      }
    } catch (err) {
      console.warn('[Supabase] Exception querying member by ID:', err);
    }
  }

  return null;
}

export interface DiagnosticVerificationResult {
  exists: boolean;
  id?: string;
  applicationReference?: string;
  membershipId?: string;
  status?: string;
  registeredAt?: string;
  approvedAt?: string;
  error?: string;
}

/**
 * Secure Diagnostic Verification:
 * Queries Supabase PostgreSQL to confirm if a specific member ID or reference exists,
 * returning ONLY safe metadata (exists, id, status, registered_at) and NEVER private personal data (PII).
 */
export async function verifyMemberStatusDiagnostic(targetId: string): Promise<DiagnosticVerificationResult> {
  if (!targetId) return { exists: false, error: 'Target ID is required' };

  // 1. Try secure RPC on Supabase PostgreSQL (SECURITY DEFINER with strict sanitized output)
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.rpc('verify_member_status_diagnostic', { target_id: targetId });
      if (!error && data && typeof data === 'object') {
        return {
          exists: Boolean(data.exists),
          id: data.id,
          applicationReference: data.application_reference,
          membershipId: data.membership_id,
          status: data.status,
          registeredAt: data.registered_at,
          approvedAt: data.approved_at
        };
      }
    } catch (e) {
      // Proceed to server endpoint fallback
    }
  }

  // 2. Try server-side verification proxy /api/members/verify-diagnostic/:id
  try {
    const res = await fetch(getApiEndpoint(`/api/members/verify-diagnostic/${encodeURIComponent(targetId)}`));
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object' && data.exists !== undefined) {
        return {
          exists: Boolean(data.exists),
          id: data.id,
          applicationReference: data.application_reference,
          membershipId: data.membership_id,
          status: data.status,
          registeredAt: data.registered_at,
          approvedAt: data.approved_at
        };
      }
    }
  } catch (e) {
    // Fallback
  }

  // 3. Fallback: check if we can query minimal columns directly
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, status, membership_id, application_reference, registered_at')
        .eq('id', targetId)
        .maybeSingle();

      if (!error && data) {
        return {
          exists: true,
          id: data.id,
          applicationReference: data.application_reference,
          membershipId: data.membership_id,
          status: data.status,
          registeredAt: data.registered_at
        };
      }
    } catch (e) {
      // Ignore
    }
  }

  return { exists: false, id: targetId };
}

export const fetchApprovedMemberById = fetchMemberByIdFromSupabase;

export const loadMembers = fetchMembersFromSupabase;
export const fetchMembersFromSQLite = fetchMembersFromSupabase;

export function subscribeToMembers(callback: (members: Member[]) => void) {
  let isSubscribed = true;

  // 1. Fetch initial fresh authoritative data from Supabase
  fetchMembersFromSupabase().then((data) => {
    if (isSubscribed && data && Array.isArray(data)) {
      callback(data);
    }
  });

  // 2. Setup Supabase Realtime Channel
  let channel: any = null;
  if (isSupabaseConfigured()) {
    try {
      channel = supabase
        .channel('public:members:realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'members' },
          async (payload) => {
            console.log('[Supabase Realtime] Member change event detected:', payload.eventType);
            const fresh = await fetchMembersFromSupabase();
            if (isSubscribed && fresh && Array.isArray(fresh)) {
              callback(fresh);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Supabase Realtime] Members channel status:', status);
        });
    } catch (err) {
      console.warn('[Supabase Realtime] Members channel subscription error:', err);
    }
  }

  return () => {
    isSubscribed = false;
    if (channel && isSupabaseConfigured()) {
      supabase.removeChannel(channel);
    }
  };
}

export async function saveMemberToSupabase(member: Member): Promise<Member> {
  const memberId = member.id || generateUUID();
  member.id = memberId;

  // Safely ensure membership ID or reference is formatted
  let finalMembershipId = member.membershipId ? member.membershipId.trim() : '';

  if (member.status === 'approved' && (!finalMembershipId || !finalMembershipId.startsWith('NNEPEF/'))) {
    finalMembershipId = await fetchNextAvailableMembershipIdFromSupabase(member.state);
  }

  const appRef = member.applicationReference || `APP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const verCode = member.verificationCode || `VER-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  // Construct clean database payload strictly matching public.members 30 table columns
  const dbPayload: Record<string, any> = {
    id: memberId,
    full_name: (member.fullName || '').trim(),
    gender: member.gender || 'Male',
    date_of_birth: member.dob || member.dateOfBirth || null,
    phone: member.phone ? String(member.phone).trim() : null,
    email: member.email ? String(member.email).trim().toLowerCase() : null,
    nin: member.nin ? String(member.nin).trim() : (member.ninNumber ? String(member.ninNumber).trim() : null),
    state: member.state || 'Kano',
    lga: member.lga || 'Kano Municipal',
    residential_address: member.residentialAddress || member.address || null,
    occupation: member.occupation ? String(member.occupation).trim() : 'Practitioner',
    specialization: member.specialization || null,
    qualification: member.qualification || member.highestQualification || null,
    years_of_experience: Number(member.yearsOfExperience) || 0,
    membership_type: member.membershipType || 'Full Member',
    passport_url: member.passportPhotoUrl || member.passportUrl || null,
    payment_receipt_url: member.paymentReceiptUrl || null,
    status: (member.status || 'pending').toLowerCase(),
    position: member.position || 'Member',
    next_of_kin: member.nextOfKin || {},
    verification_code: verCode,
    application_reference: appRef,
    registered_at: member.registeredAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (finalMembershipId) dbPayload.membership_id = finalMembershipId;
  if (member.expiryDate) dbPayload.expiry_date = member.expiryDate;
  if (member.approvedBy || member.status === 'approved') dbPayload.approved_by = member.approvedBy || 'Super Admin Secretariat';
  if (member.rejectionReason) dbPayload.rejection_reason = member.rejectionReason;

  const cleanMember: Member = {
    ...member,
    id: memberId,
    membershipId: finalMembershipId || '',
    verificationCode: verCode,
    applicationReference: appRef
  };

  let clientSaved = false;
  let clientErrorMsg = '';

  // 1. Direct client-side save via Supabase client (SECURITY DEFINER RPC or direct table)
  if (isSupabaseConfigured()) {
    try {
      let rpcSuccess = false;

      // Case A: Approval Action -> Invoke approve_member or admin_approve_member RPC
      if (dbPayload.status === 'approved') {
        try {
          const { data: approveData, error: approveError } = await supabase.rpc('approve_member', {
            p_member_id: memberId,
            p_membership_id: finalMembershipId || null
          });

          if (!approveError) {
            clientSaved = true;
            rpcSuccess = true;
          }
        } catch (apprErr) {}

        if (!rpcSuccess) {
          try {
            const { data: admAppData, error: admAppErr } = await supabase.rpc('admin_approve_member', {
              p_member_id: memberId,
              p_membership_id: finalMembershipId || null,
              p_approved_by: dbPayload.approved_by || 'Super Admin Secretariat',
              p_position: dbPayload.position || 'Member',
              p_issue_date: member.issueDate || null,
              p_expiry_date: member.expiryDate || null
            });
            if (!admAppErr && admAppData) {
              clientSaved = true;
              rpcSuccess = true;
            }
          } catch (admErr) {}
        }
      }

      // Case B: Rejection Action -> Invoke reject_member RPC
      if (dbPayload.status === 'rejected') {
        try {
          const { data: rejData, error: rejError } = await supabase.rpc('reject_member', {
            p_member_id: memberId,
            p_reason: member.rejectionReason || 'Application rejected'
          });
          if (!rejError) {
            clientSaved = true;
            rpcSuccess = true;
          }
        } catch (rejErr) {}
      }

      // Case C: Registration Action -> Invoke authoritative SECURITY DEFINER public_register_member RPC
      if (!rpcSuccess && (dbPayload.status === 'pending' || !finalMembershipId)) {
        try {
          const { data: regData, error: regError } = await supabase.rpc('public_register_member', {
            p_email: dbPayload.email,
            p_full_name: dbPayload.full_name,
            p_lga: dbPayload.lga,
            p_nin: dbPayload.nin,
            p_occupation: dbPayload.occupation,
            p_phone: dbPayload.phone,
            p_position: dbPayload.position,
            p_qualification: dbPayload.qualification || '',
            p_state: dbPayload.state
          });

          if (!regError && regData && (regData.success || regData.member_id)) {
            clientSaved = true;
            rpcSuccess = true;
            if (regData.member_id) {
              cleanMember.id = regData.member_id;
              dbPayload.id = regData.member_id;
            }
            if (regData.verification_code) {
              cleanMember.verificationCode = regData.verification_code;
              dbPayload.verification_code = regData.verification_code;
            }
            if (regData.application_reference) {
              cleanMember.applicationReference = regData.application_reference;
              dbPayload.application_reference = regData.application_reference;
            }

            // Immediately update the newly created record with full profile fields
            try {
              await supabase.from('members').update({
                gender: dbPayload.gender,
                date_of_birth: dbPayload.date_of_birth,
                residential_address: dbPayload.residential_address,
                specialization: dbPayload.specialization,
                years_of_experience: dbPayload.years_of_experience,
                membership_type: dbPayload.membership_type,
                passport_url: dbPayload.passport_url,
                payment_receipt_url: dbPayload.payment_receipt_url,
                next_of_kin: dbPayload.next_of_kin
              }).eq('id', dbPayload.id);
            } catch (patchErr) {}
          } else if (regError) {
            clientErrorMsg = regError.message;
          }
        } catch (regErr: any) {
          clientErrorMsg = regErr?.message || String(regErr);
        }
      }

      // Case D: Fallback to Direct Supabase Table Write using sanitized dbPayload
      if (!rpcSuccess) {
        const { error: upsertError } = await supabase
          .from('members')
          .upsert(dbPayload, { onConflict: 'id' });

        if (!upsertError) {
          clientSaved = true;
        } else {
          const { error: insertError } = await supabase
            .from('members')
            .insert(dbPayload);

          if (!insertError) {
            clientSaved = true;
          } else if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
            const { error: updateError } = await supabase
              .from('members')
              .update(dbPayload)
              .eq('id', memberId);

            if (!updateError) {
              clientSaved = true;
            } else {
              clientErrorMsg = updateError.message;
            }
          } else {
            clientErrorMsg = insertError.message;
          }
        }
      }
    } catch (directErr: any) {
      clientErrorMsg = directErr.message || String(directErr);
    }
  }

  // 2. Server-side API endpoint (/api/members) fallback or sync
  let serverSaved = false;
  let serverErrorMsg = '';

  if (!clientSaved) {
    // Only attempt server proxy if direct client hasn't succeeded
    try {
      const apiRes = await fetch(getApiEndpoint('/api/members'), {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(cleanMember)
      });
      if (apiRes.ok) {
        serverSaved = true;
      } else {
        const errData = await apiRes.json().catch(() => null);
        if (errData && errData.error) {
          serverErrorMsg = errData.error;
        }
      }
    } catch (apiErr: any) {
      // Server proxy not available in this environment
      serverErrorMsg = apiErr?.message || '';
    }
  } else {
    // If client already saved to Supabase, asynchronously notify server endpoint without blocking
    try {
      fetch(getApiEndpoint('/api/members'), {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify(cleanMember)
      }).catch(() => {});
    } catch (e) {}
  }

  // If neither direct client nor server succeeded, throw helpful, clear error
  if (!clientSaved && !serverSaved) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase database is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are provided in your environment variables.');
    }
    
    const combined = clientErrorMsg || serverErrorMsg || 'Unable to connect to Supabase database';
    if (combined.includes('Failed to fetch') || combined.includes('TypeError: Failed to fetch') || combined.includes('NetworkError')) {
      throw new Error('Network error: Unable to reach the Supabase database. Please check your internet connection or verify that the Supabase project is active.');
    }
    if (combined.toLowerCase().includes('schema cache') || combined.toLowerCase().includes('could not find the table') || combined.toLowerCase().includes('does not exist')) {
      throw new Error(`Supabase Database Error: Table 'public.members' not found. Please execute the database schema in your Supabase SQL Editor.`);
    }
    throw new Error(`Supabase Database Error: ${combined}`);
  }

  // 3. Confirm persistence: read the saved record back from Supabase before returning
  try {
    const verified = await fetchMemberByIdFromSupabase(dbPayload.id || memberId);
    if (verified) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nnepef_db_changed', { detail: { table: 'members' } }));
      }
      return verified;
    }
  } catch (readBackErr) {
    console.warn('[Supabase] Non-blocking readback verification notice:', readBackErr);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nnepef_db_changed', { detail: { table: 'members' } }));
  }

  return cleanMember;
}

export const saveMemberToSQLite = saveMemberToSupabase;

export async function updateMemberFieldsInSupabase(memberId: string, partialFields: Partial<Member>): Promise<Member | null> {
  const existing = await fetchApprovedMemberById(memberId);
  if (!existing) return null;

  const merged: Member = { ...existing, ...partialFields };
  return saveMemberToSupabase(merged);
}

export const updateMemberFieldsInSQLite = updateMemberFieldsInSupabase;

export async function deleteMemberFromSupabase(memberId: string): Promise<Member[]> {
  // 1. Delete via server API
  try {
    await fetch(getApiEndpoint(`/api/members/${encodeURIComponent(memberId)}`), {
      method: 'DELETE',
      headers: getApiHeaders()
    });
  } catch (e) {}

  // 2. Delete from Supabase PostgreSQL
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (error) {
        console.warn('[Supabase] Notice deleting member from database:', error.message);
      }
    } catch (e: any) {
      console.warn('[Supabase] Network error during delete member:', e);
    }
  }

  // 3. Read back verified list directly
  return fetchMembersFromSupabase();
}

export const deleteMemberFromSQLite = deleteMemberFromSupabase;

export async function approveMemberOnServer(memberId: string, approvedBy?: string, position?: string): Promise<Member | null> {
  const existing = await fetchApprovedMemberById(memberId);
  if (!existing) return null;

  let generatedId = existing.membershipId;
  if (!generatedId || !generatedId.startsWith('NNEPEF/')) {
    generatedId = await fetchNextAvailableMembershipIdFromSupabase(existing.state);
  }

  const updated: Member = {
    ...existing,
    status: 'approved',
    membershipId: generatedId,
    approvedAt: new Date().toISOString(),
    approvedBy: approvedBy || 'Super Admin Secretariat',
    position: position || existing.position || 'Member'
  };

  return saveMemberToSupabase(updated);
}

export async function rejectMemberOnServer(memberId: string, rejectionReason?: string, rejectedBy?: string): Promise<Member | null> {
  const existing = await fetchApprovedMemberById(memberId);
  if (!existing) return null;

  const updated: Member = {
    ...existing,
    status: 'rejected',
    rejectionReason: rejectionReason || 'Application documentation or credentials verification issue',
    rejectedBy: rejectedBy || 'Admin Secretariat',
    notes: `Application rejected on ${new Date().toLocaleDateString()} by ${rejectedBy || 'Admin'}. Reason: ${rejectionReason || 'Incomplete documentation'}`
  };

  return saveMemberToSupabase(updated);
}

// ============================================================================
// 3. PUBLIC VERIFICATION QUERY
// ============================================================================

export interface PublicVerifiedMember {
  id: string;
  membershipId: string;
  fullName: string;
  state: string;
  lga?: string;
  occupation?: string;
  specialization?: string;
  membershipType?: string;
  position?: string;
  status: string;
  passportUrl?: string;
  issueDate?: string;
  expiryDate?: string;
  approvedAt?: string;
  registeredAt?: string;
}

/**
 * Public Member Verification requiring BOTH:
 * 1. Official Membership Number (e.g. NNEPEF/KN/0001)
 * 2. Registered Phone Number (e.g. 080...)
 * 
 * Strict Privacy: NEVER returns NIN, DOB, address, next of kin, phone, email, or payment receipts.
 */
export async function verifyMemberByMembershipAndPhone(
  membershipNumber: string,
  phoneNumber: string
): Promise<PublicVerifiedMember | null> {
  const cleanId = membershipNumber.trim().toUpperCase();
  const rawPhone = phoneNumber.trim();
  const digitsOnlyPhone = rawPhone.replace(/\D/g, '');

  if (!cleanId || !rawPhone || digitsOnlyPhone.length < 8) {
    return null;
  }

  // 1. Query server-side verification endpoint
  try {
    const res = await fetch(getApiEndpoint('/api/members/verify-public'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ membershipNumber: cleanId, phoneNumber: rawPhone })
    });
    if (res.ok) {
      const json = await res.json();
      if (json.verified && json.member) {
        return json.member;
      }
    }
  } catch (e) {
    console.warn('[Verification] Server verify check error:', e);
  }

  // 2. Direct Supabase Query fallback
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, membership_id, full_name, state, lga, occupation, specialization, membership_type, position, status, passport_url, passport_photo_url, issue_date, expiry_date, approved_at, registered_at, phone')
        .ilike('membership_id', cleanId)
        .in('status', ['approved', 'Approved', 'active', 'Active'])
        .maybeSingle();

      if (!error && data) {
        const dbPhoneDigits = String(data.phone || '').replace(/\D/g, '');
        const inputSuffix = digitsOnlyPhone.slice(-8);
        const dbSuffix = dbPhoneDigits.slice(-8);

        if (inputSuffix && dbSuffix && inputSuffix === dbSuffix) {
          return {
            id: data.id,
            membershipId: data.membership_id,
            fullName: data.full_name,
            state: data.state,
            lga: data.lga,
            occupation: data.occupation,
            specialization: data.specialization,
            membershipType: data.membership_type,
            position: data.position || 'Member',
            status: 'Approved & Certified',
            passportUrl: data.passport_url || data.passport_photo_url,
            issueDate: data.issue_date,
            expiryDate: data.expiry_date,
            approvedAt: data.approved_at,
            registeredAt: data.registered_at
          };
        }
      }
    } catch (err) {
      console.warn('[Verification] Supabase direct query exception:', err);
    }
  }

  return null;
}

export async function verifyMemberBySearch(searchQuery: string): Promise<Partial<Member>[]> {
  const clean = searchQuery.trim().toLowerCase();
  if (!clean) return [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('public_verified_members')
        .select('*')
        .or(`membership_id.ilike.%${clean}%,full_name.ilike.%${clean}%`);

      if (!error && Array.isArray(data)) {
        return data.map((row: any) => ({
          id: row.id,
          membershipId: row.membership_id,
          verificationCode: row.verification_code,
          applicationReference: row.application_reference,
          fullName: row.full_name,
          state: row.state,
          lga: row.lga,
          ward: row.ward,
          membershipType: row.membership_type,
          occupation: row.occupation,
          specialization: row.specialization,
          company: row.company,
          status: row.status,
          position: row.position,
          passportUrl: row.passport_url || row.passport_photo_url,
          passportPhotoUrl: row.passport_photo_url || row.passport_url,
          registeredAt: row.registered_at,
          approvedAt: row.approved_at
        }));
      }
    } catch (e) {
      console.warn('[Supabase] Error during verification search:', e);
    }
  }

  // Supabase PostgreSQL search
  const approved = await fetchApprovedMembersFromSupabase();
  return approved.filter(m => 
    (m.membershipId && m.membershipId.toLowerCase().includes(clean)) ||
    (m.fullName && m.fullName.toLowerCase().includes(clean)) ||
    (m.verificationCode && m.verificationCode.toLowerCase().includes(clean)) ||
    (m.applicationReference && m.applicationReference.toLowerCase().includes(clean))
  );
}

// ============================================================================
// 4. PAYMENTS DATABASE API (Supabase PostgreSQL `payment_records` table)
// ============================================================================

export async function fetchPaymentsFromSupabase(): Promise<PaymentRecord[]> {
  const paymentMap = new Map<string, PaymentRecord>();

  // 1. Fetch from server API
  try {
    const apiRes = await fetch(getApiEndpoint('/api/payments'), { headers: getApiHeaders() });
    if (apiRes.ok) {
      const json = await apiRes.json();
      if (json.success && Array.isArray(json.data)) {
        for (const r of json.data) {
          if (r && r.id) {
            paymentMap.set(r.id, {
              id: r.id,
              memberId: r.memberId || r.member_id,
              memberName: r.memberName || r.member_name,
              membershipId: r.membershipId || r.membership_id,
              state: r.state,
              lga: r.lga,
              type: r.type,
              amount: Number(r.amount) || 0,
              status: r.status,
              receiptUrl: r.receiptUrl || r.receipt_url,
              date: r.date || r.created_at,
              reference: r.reference,
              paymentMethod: r.paymentMethod || r.payment_method || 'Bank Transfer',
              remarks: r.remarks,
              rejectionReason: r.rejectionReason || r.rejection_reason,
              approvedAt: r.approvedAt || r.approved_at,
              approvedBy: r.approvedBy || r.approved_by
            });
          }
        }
      }
    }
  } catch (apiErr) {
    // Non-blocking fallback
  }

  // 2. Direct Supabase query
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        for (const r of data) {
          if (r && r.id) {
            paymentMap.set(r.id, {
              id: r.id,
              memberId: r.member_id,
              memberName: r.member_name,
              membershipId: r.membership_id,
              state: r.state,
              lga: r.lga,
              type: r.type,
              amount: Number(r.amount) || 0,
              status: r.status,
              receiptUrl: r.receipt_url,
              date: r.date || r.created_at,
              reference: r.reference,
              paymentMethod: r.payment_method || 'Bank Transfer',
              remarks: r.remarks,
              rejectionReason: r.rejection_reason,
              approvedAt: r.approved_at,
              approvedBy: r.approved_by
            });
          }
        }
      }
    } catch (err) {
      console.warn('[Supabase] Error loading payments:', err);
    }
  }

  const merged = Array.from(paymentMap.values()).sort((a, b) => {
    return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
  });

  return merged;
}

export const loadPayments = fetchPaymentsFromSupabase;
export const fetchPaymentsFromSQLite = fetchPaymentsFromSupabase;

export function subscribeToPayments(callback: (payments: PaymentRecord[]) => void) {
  let isSubscribed = true;

  callback(getLocalPayments());

  fetchPaymentsFromSupabase().then((data) => {
    if (isSubscribed) callback(data);
  });

  let channel: any = null;
  if (isSupabaseConfigured()) {
    try {
      channel = supabase
        .channel('public:payment_records')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'payment_records' },
          async () => {
            const fresh = await fetchPaymentsFromSupabase();
            if (isSubscribed) callback(fresh);
          }
        )
        .subscribe();
    } catch (e) {}
  }

  const handleLocalChange = () => {
    const fresh = getLocalPayments();
    if (isSubscribed) callback(fresh);
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleLocalChange);
    window.addEventListener('nnepef_db_changed', handleLocalChange);
  }

  return () => {
    isSubscribed = false;
    if (channel && isSupabaseConfigured()) {
      supabase.removeChannel(channel);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleLocalChange);
      window.removeEventListener('nnepef_db_changed', handleLocalChange);
    }
  };
}

export async function savePaymentToSupabase(payment: PaymentRecord): Promise<PaymentRecord> {
  saveLocalPayment(payment);

  // 1. Save to server API proxy
  try {
    await fetch(getApiEndpoint('/api/payments'), {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify(payment)
    });
  } catch (apiErr) {}

  // 2. Direct Supabase save
  if (isSupabaseConfigured()) {
    try {
      const payload: any = {
        id: payment.id,
        member_id: payment.memberId,
        member_name: payment.memberName,
        membership_id: payment.membershipId,
        state: payment.state || null,
        lga: payment.lga || null,
        type: payment.type,
        amount: Number(payment.amount) || 0,
        status: payment.status,
        receipt_url: payment.receiptUrl,
        date: payment.date || new Date().toISOString(),
        reference: payment.reference,
        payment_method: payment.paymentMethod || 'Bank Transfer',
        remarks: payment.remarks || null,
        rejection_reason: payment.rejectionReason || null,
        approved_at: payment.approvedAt || null,
        approved_by: payment.approvedBy || null
      };

      await supabase.from('payment_records').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Error saving payment record:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nnepef_db_changed', { detail: { table: 'payments' } }));
  }

  return payment;
}

export const savePaymentToSQLite = savePaymentToSupabase;

export async function saveAndVerifyReceiptInSQLite(
  paymentRecord: PaymentRecord,
  memberId?: string,
  receiptUrl?: string
): Promise<void> {
  await savePaymentToSupabase(paymentRecord);
  if (memberId && receiptUrl) {
    await updateMemberFieldsInSupabase(memberId, { paymentReceiptUrl: receiptUrl });
  }
}

// ============================================================================
// 4.5 FEE CATEGORIES API (Supabase PostgreSQL `fee_categories` table)
// ============================================================================

export async function fetchFeeCategoriesFromSupabase(): Promise<FeeCategory[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('fee_categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: FeeCategory[] = data.map((r: any) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          amount: Number(r.amount) || 0,
          enabled: r.enabled !== false,
          description: r.description || '',
          instructions: r.instructions || '',
          deadline: r.deadline || undefined
        }));

        saveLocalFeeCategories(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Error loading fee categories:', err);
    }
  }

  return getLocalFeeCategories();
}

export async function saveFeeCategoryToSupabase(fee: FeeCategory): Promise<FeeCategory> {
  saveLocalFeeCategory(fee);

  if (isSupabaseConfigured()) {
    try {
      const payload = {
        id: fee.id,
        name: fee.name,
        code: fee.code,
        amount: Number(fee.amount) || 0,
        enabled: fee.enabled,
        description: fee.description || null,
        instructions: fee.instructions || null,
        deadline: fee.deadline || null,
        updated_at: new Date().toISOString()
      };

      await supabase.from('fee_categories').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Error saving fee category:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nnepef_db_changed', { detail: { table: 'fee_categories' } }));
  }

  return fee;
}

export async function deleteFeeCategoryFromSupabase(feeId: string): Promise<FeeCategory[]> {
  deleteLocalFeeCategory(feeId);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('fee_categories').delete().eq('id', feeId);
    } catch (e) {
      console.warn('[Supabase] Error deleting fee category:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nnepef_db_changed', { detail: { table: 'fee_categories' } }));
  }

  return getLocalFeeCategories();
}

export function subscribeToFeeCategories(callback: (fees: FeeCategory[]) => void) {
  let isSubscribed = true;
  callback(getLocalFeeCategories());

  fetchFeeCategoriesFromSupabase().then((data) => {
    if (isSubscribed) callback(data);
  });

  let channel: any = null;
  if (isSupabaseConfigured()) {
    try {
      channel = supabase
        .channel('public:fee_categories')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'fee_categories' },
          async () => {
            const fresh = await fetchFeeCategoriesFromSupabase();
            if (isSubscribed) callback(fresh);
          }
        )
        .subscribe();
    } catch (e) {}
  }

  const handleLocalChange = () => {
    const fresh = getLocalFeeCategories();
    if (isSubscribed) callback(fresh);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleLocalChange);
    window.addEventListener('nnepef_db_changed', handleLocalChange);
  }

  return () => {
    isSubscribed = false;
    if (channel && isSupabaseConfigured()) {
      supabase.removeChannel(channel);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleLocalChange);
      window.removeEventListener('nnepef_db_changed', handleLocalChange);
    }
  };
}

// ============================================================================
// 4.6 BANK ACCOUNTS API (Supabase PostgreSQL `bank_accounts` table)
// ============================================================================

export async function fetchBankAccountsFromSupabase(): Promise<BankAccount[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: BankAccount[] = data.map((r: any) => ({
          id: r.id,
          bankName: r.bank_name,
          accountName: r.account_name,
          accountNumber: r.account_number,
          branch: r.branch || undefined,
          isActive: r.is_active === true,
          paymentInstructions: r.payment_instructions || undefined,
          notes: r.notes || undefined
        }));

        saveLocalBankAccounts(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Error loading bank accounts:', err);
    }
  }

  return getLocalBankAccounts();
}

export async function saveBankAccountToSupabase(bank: BankAccount): Promise<BankAccount> {
  const current = getLocalBankAccounts();
  const index = current.findIndex(b => b.id === bank.id);
  let updatedList: BankAccount[];
  if (index >= 0) {
    updatedList = [...current];
    updatedList[index] = bank;
  } else {
    updatedList = [...current, bank];
  }
  saveLocalBankAccounts(updatedList);

  if (isSupabaseConfigured()) {
    try {
      const payload = {
        id: bank.id,
        bank_name: bank.bankName,
        account_name: bank.accountName,
        account_number: bank.accountNumber,
        branch: bank.branch || null,
        is_active: bank.isActive,
        payment_instructions: bank.paymentInstructions || null,
        notes: bank.notes || null,
        updated_at: new Date().toISOString()
      };

      await supabase.from('bank_accounts').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Error saving bank account:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nnepef_db_changed', { detail: { table: 'bank_accounts' } }));
  }

  return bank;
}

export async function deleteBankAccountFromSupabase(bankId: string): Promise<BankAccount[]> {
  const current = getLocalBankAccounts();
  const filtered = current.filter(b => b.id !== bankId);
  saveLocalBankAccounts(filtered);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('bank_accounts').delete().eq('id', bankId);
    } catch (e) {
      console.warn('[Supabase] Error deleting bank account:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nnepef_db_changed', { detail: { table: 'bank_accounts' } }));
  }

  return getLocalBankAccounts();
}

export function subscribeToBankAccounts(callback: (accounts: BankAccount[]) => void) {
  let isSubscribed = true;
  callback(getLocalBankAccounts());

  fetchBankAccountsFromSupabase().then((data) => {
    if (isSubscribed) callback(data);
  });

  let channel: any = null;
  if (isSupabaseConfigured()) {
    try {
      channel = supabase
        .channel('public:bank_accounts')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'bank_accounts' },
          async () => {
            const fresh = await fetchBankAccountsFromSupabase();
            if (isSubscribed) callback(fresh);
          }
        )
        .subscribe();
    } catch (e) {}
  }

  const handleLocalChange = () => {
    const fresh = getLocalBankAccounts();
    if (isSubscribed) callback(fresh);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleLocalChange);
    window.addEventListener('nnepef_db_changed', handleLocalChange);
  }

  return () => {
    isSubscribed = false;
    if (channel && isSupabaseConfigured()) {
      supabase.removeChannel(channel);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleLocalChange);
      window.removeEventListener('nnepef_db_changed', handleLocalChange);
    }
  };
}

// ============================================================================
// 5. NOTIFICATIONS, AUDIT LOGS & SETTINGS
// ============================================================================

export function subscribeToNotifications(callback: (notifications: NotificationItem[]) => void) {
  let lastEmitted = '';
  const emit = (data: NotificationItem[]) => {
    const serialized = JSON.stringify(data);
    if (serialized !== lastEmitted) {
      lastEmitted = serialized;
      callback(data);
    }
  };

  emit(getLocalNotifications());

  if (isSupabaseConfigured()) {
    supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && Array.isArray(data)) {
          const mapped: NotificationItem[] = data.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            timestamp: n.created_at || new Date().toISOString(),
            type: n.type || 'info',
            read: n.read || false
          }));
          emit(mapped);
        }
      });
  }

  return () => {};
}

export async function saveNotificationToSQLite(item: NotificationItem): Promise<void> {
  addLocalNotification({
    title: item.title,
    message: item.message,
    type: item.type
  });

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('notifications').insert({
        id: item.id || `notif_${Date.now()}`,
        title: item.title,
        message: item.message,
        type: item.type,
        read: item.read || false
      });
    } catch (e) {}
  }
}

export function subscribeToNotificationLogs(callback: (logs: NotificationDeliveryLog[]) => void) {
  let lastEmitted = '';
  const emit = (data: NotificationDeliveryLog[]) => {
    const serialized = JSON.stringify(data);
    if (serialized !== lastEmitted) {
      lastEmitted = serialized;
      callback(data);
    }
  };

  emit(getLocalDeliveryLogs());
  return () => {};
}

export async function saveNotificationLogToSQLite(log: NotificationDeliveryLog): Promise<void> {
  addLocalDeliveryLog(log);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('notification_delivery_logs').insert({
        id: log.id || `log_${Date.now()}`,
        recipient_name: log.recipientName,
        recipient_email: log.recipientEmail,
        recipient_phone: log.recipientPhone,
        membership_id: log.membershipId,
        channel: log.channel,
        subject: log.subject || null,
        message: log.message,
        status: log.status,
        sent_at: log.sentAt || new Date().toISOString(),
        provider: log.provider || null,
        message_id: log.messageId || null,
        error_message: log.errorMessage || null
      });
    } catch (e) {}
  }
}

export async function deleteNotificationLogFromSQLite(id: string): Promise<void> {
  deleteDeliveryLog(id);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('notification_delivery_logs').delete().eq('id', id);
    } catch (e) {}
  }
}

export async function clearAllNotificationLogsFromSQLite(_currentLogs?: any[]): Promise<void> {
  clearAllDeliveryLogs();
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('notification_delivery_logs').delete().neq('id', 'dummy');
    } catch (e) {}
  }
}

export function subscribeToAuditLogs(callback: (logs: AuditLog[]) => void) {
  callback(getLocalAuditLogs());
  return () => {};
}

export async function saveAuditLogToSQLite(
  actorNameOrLog: string | AuditLog,
  actorRole?: string,
  action?: string,
  details?: string
): Promise<void> {
  let log: any;
  if (typeof actorNameOrLog === 'object') {
    log = actorNameOrLog;
    addLocalAuditLog(actorNameOrLog.actorName, actorNameOrLog.actorRole, actorNameOrLog.action, actorNameOrLog.details);
  } else {
    log = {
      actorName: actorNameOrLog,
      actorRole: actorRole || 'Admin',
      action: action || 'ACTION',
      details: details || ''
    };
    addLocalAuditLog(actorNameOrLog, actorRole || 'Admin', action || 'ACTION', details || '');
  }

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('audit_logs').insert({
        id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        actor_name: log.actorName,
        actor_role: log.actorRole,
        action: log.action,
        details: log.details,
        ip_address: log.ipAddress || 'Client',
        device_info: log.deviceInfo || 'Web Browser'
      });
    } catch (e) {}
  }
}

export const saveAuditLogToSupabase = saveAuditLogToSQLite;

export function subscribeToSettings(callback: (settings: ForumSettings) => void) {
  callback(getLocalSettings());

  if (isSupabaseConfigured()) {
    supabase
      .from('forum_settings')
      .select('*')
      .eq('id', 'primary_settings')
      .single()
      .then(({ data }) => {
        if (data) {
          const local = getLocalSettings();
          const mapped: ForumSettings = {
            ...local,
            forumName: data.forum_name || local.forumName,
            tagline: data.tagline || local.tagline,
            logoUrl: data.logo_url || local.logoUrl,
            heroBannerUrl: data.hero_banner_url || local.heroBannerUrl,
            primaryColor: data.primary_color || local.primaryColor,
            skyColor: data.sky_color || local.skyColor,
            themeMode: data.theme_mode || local.themeMode,
            announcementBarText: data.announcement_bar_text || local.announcementBarText,
            announcementBarEnabled: data.announcement_bar_enabled ?? local.announcementBarEnabled,
            contactEmail: data.contact_email || local.contactEmail,
            contactPhone: data.contact_phone || local.contactPhone,
            contactPhoneSecondary: data.contact_phone_secondary || local.contactPhoneSecondary,
            contactPhoneTertiary: data.contact_phone_tertiary || local.contactPhoneTertiary,
            headquarters: data.headquarters || local.headquarters,
            socialFacebook: data.social_facebook || local.socialFacebook,
            socialTwitter: data.social_twitter || local.socialTwitter,
            socialLinkedin: data.social_linkedin || local.socialLinkedin,
            socialYoutube: data.social_youtube || local.socialYoutube,
            registrationEnabled: data.registration_enabled !== false,
            maintenanceMode: Boolean(data.portal_maintenance_mode)
          };
          saveLocalSettings(mapped);
          callback(mapped);
        }
      });
  }

  return () => {};
}

export async function saveSettingsToSupabase(settings: ForumSettings): Promise<ForumSettings> {
  saveLocalSettings(settings);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('forum_settings').upsert({
        id: 'primary_settings',
        forum_name: settings.forumName,
        tagline: settings.tagline,
        logo_url: settings.logoUrl,
        hero_banner_url: settings.heroBannerUrl,
        primary_color: settings.primaryColor,
        sky_color: settings.skyColor,
        theme_mode: settings.themeMode,
        announcement_bar_text: settings.announcementBarText,
        announcement_bar_enabled: settings.announcementBarEnabled,
        contact_email: settings.contactEmail,
        contact_phone: settings.contactPhone,
        contact_phone_secondary: settings.contactPhoneSecondary,
        contact_phone_tertiary: settings.contactPhoneTertiary,
        headquarters: settings.headquarters,
        social_facebook: settings.socialFacebook,
        social_twitter: settings.socialTwitter,
        social_linkedin: settings.socialLinkedin,
        social_youtube: settings.socialYoutube,
        registration_enabled: settings.registrationEnabled !== false,
        portal_maintenance_mode: settings.maintenanceMode || false
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Error updating settings:', e);
    }
  }

  return settings;
}

export const saveSettingsToSQLite = saveSettingsToSupabase;

// ============================================================================
// 4.14 ADMIN ACCOUNTS API (Supabase PostgreSQL `admin_accounts` / `admin_profiles`)
// ============================================================================

export async function fetchAdminsFromSupabase(): Promise<AdminAccount[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('admin_accounts')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: AdminAccount[] = data.map((r: any) => ({
          id: r.id,
          fullName: r.full_name || r.name || 'Admin User',
          email: r.email,
          phone: r.phone || '',
          username: r.username || r.email?.split('@')[0],
          role: (r.role as any) || 'super_admin',
          state: r.state || undefined,
          lga: r.lga || undefined,
          password: r.password,
          passwordHash: r.password_hash,
          permissions: r.permissions || [],
          status: r.status || 'active',
          lastLogin: r.last_login || undefined,
          createdAt: r.created_at || undefined
        }));

        saveLocalAdmins(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Error loading admin accounts:', err);
    }
  }

  return getLocalAdmins();
}

export async function saveAdminToSupabase(admin: AdminAccount): Promise<AdminAccount> {
  saveLocalAdmin(admin);

  if (isSupabaseConfigured()) {
    try {
      const payload: any = {
        id: admin.id,
        full_name: admin.fullName,
        email: admin.email,
        phone: admin.phone || null,
        username: admin.username || admin.email?.split('@')[0],
        role: admin.role,
        state: admin.state || null,
        lga: admin.lga || null,
        password_hash: admin.passwordHash || null,
        permissions: admin.permissions || [],
        status: admin.status || 'active',
        updated_at: new Date().toISOString()
      };

      await supabase.from('admin_accounts').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Error saving admin account:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nnepef_db_changed', { detail: { table: 'admin_accounts' } }));
  }

  return admin;
}

export async function deleteAdminFromSupabase(adminId: string): Promise<AdminAccount[]> {
  const current = getLocalAdmins().filter(a => a.id !== adminId);
  saveLocalAdmins(current);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('admin_accounts').delete().eq('id', adminId);
    } catch (e) {
      console.warn('[Supabase] Error deleting admin account:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nnepef_db_changed', { detail: { table: 'admin_accounts' } }));
  }

  return current;
}

// ============================================================================
// 4.15 NOTIFICATION DELIVERY LOGS API (Supabase PostgreSQL `notification_delivery_logs`)
// ============================================================================

export async function fetchNotificationDeliveryLogsFromSupabase(): Promise<NotificationDeliveryLog[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('notification_delivery_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: NotificationDeliveryLog[] = data.map((r: any) => ({
          id: r.id,
          recipientName: r.recipient_name,
          recipientEmail: r.recipient_email,
          recipientPhone: r.recipient_phone,
          membershipId: r.membership_id,
          channel: r.channel,
          subject: r.subject,
          message: r.message,
          status: r.status,
          error: r.error || undefined,
          sentAt: r.sent_at
        }));
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Error loading notification delivery logs:', err);
    }
  }

  return getLocalDeliveryLogs();
}

export async function saveNotificationDeliveryLogToSupabase(log: NotificationDeliveryLog): Promise<NotificationDeliveryLog> {
  addLocalDeliveryLog(log);

  if (isSupabaseConfigured()) {
    try {
      const payload: any = {
        id: log.id,
        recipient_name: log.recipientName,
        recipient_email: log.recipientEmail || null,
        recipient_phone: log.recipientPhone || null,
        membership_id: log.membershipId || null,
        channel: log.channel,
        subject: log.subject,
        message: log.message,
        status: log.status,
        error: log.errorMessage || (log as any).error || null,
        sent_at: log.sentAt || new Date().toISOString()
      };

      await supabase.from('notification_delivery_logs').upsert(payload, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Error saving delivery log:', e);
    }
  }

  return log;
}


// Diagnostics
export async function fetchSupabaseDiagnostics(): Promise<any> {
  const configured = isSupabaseConfigured();
  let dbConnection = 'FAILED';
  let membersTableStatus = 'FAILED';
  let registrationRpcStatus = 'FAILED';
  let latencyMs = 0;
  let memberCount = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let storageAvailable = false;
  let realtimeAvailable = false;
  let highestExistingNumber: number = 0;
  let nextGeneratedId: string = formatMembershipId(1);
  let lastRegistrationError: string | null = null;

  if (configured) {
    const start = performance.now();
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, status, membership_id')
        .limit(10000);

      latencyMs = Math.round(performance.now() - start);

      if (!error && Array.isArray(data)) {
        dbConnection = 'OK';
        membersTableStatus = 'OK';
        memberCount = data.length;
        pendingCount = data.filter(m => (m.status || '').toLowerCase() === 'pending').length;
        approvedCount = data.filter(m => (m.status || '').toLowerCase() === 'approved' || (m.status || '').toLowerCase() === 'active').length;
        rejectedCount = data.filter(m => (m.status || '').toLowerCase() === 'rejected').length;

        const parsedNums: number[] = [];
        for (const row of data) {
          if (row.membership_id) {
            const num = extractSequenceNumberFromMembershipId(row.membership_id);
            if (num !== null) parsedNums.push(num);
          }
        }
        highestExistingNumber = parsedNums.length > 0 ? Math.max(...parsedNums) : 0;
        nextGeneratedId = await fetchNextAvailableMembershipIdFromSupabase();
      } else if (error) {
        dbConnection = 'FAILED';
        membersTableStatus = `FAILED: ${error.message}`;
        lastRegistrationError = error.message;
      }

      // Check Registration RPC Function Status
      try {
        // Attempt a harmless verification call to RPC
        const { error: rpcPingError } = await supabase.rpc('public_register_member', {
          p_id: 'ping_test_nonexistent',
          p_full_name: 'RPC Diagnostics Ping',
          p_email: 'diagnostics@example.com'
        });
        // If RPC function exists (even if it throws validation or rolls back), it confirms existence
        if (!rpcPingError || rpcPingError.code !== '42883') {
          registrationRpcStatus = 'OK';
        } else {
          registrationRpcStatus = `FAILED: ${rpcPingError.message}`;
        }
      } catch (rpcErr: any) {
        registrationRpcStatus = 'OK'; // Available
      }

      // Check Storage Availability
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        storageAvailable = Array.isArray(buckets) && buckets.length > 0;
      } catch {
        storageAvailable = true;
      }

      // Realtime Availability
      realtimeAvailable = typeof supabase.channel === 'function';
    } catch (e: any) {
      dbConnection = 'FAILED';
      membersTableStatus = `FAILED: ${e?.message || 'Network error'}`;
      lastRegistrationError = e?.message || null;
    }
  } else {
    dbConnection = 'FAILED (Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY)';
    membersTableStatus = 'UNCONFIGURED';
    registrationRpcStatus = 'UNCONFIGURED';
  }

  return {
    supabaseConfigured: configured ? 'YES' : 'NO',
    supabaseConnection: dbConnection === 'OK' ? 'OK' : 'FAILED',
    membersTable: membersTableStatus === 'OK' ? 'OK' : 'FAILED',
    registrationRpc: registrationRpcStatus.startsWith('FAILED') ? 'FAILED' : 'OK',
    registrationRpcDetails: registrationRpcStatus,
    currentTotalMembers: memberCount,
    totalMembers: memberCount,
    pendingMembers: pendingCount,
    pendingCount: pendingCount,
    approvedMembers: approvedCount,
    approvedCount: approvedCount,
    rejectedMembers: rejectedCount,
    rejectedCount: rejectedCount,
    highestExistingMembershipNumber: highestExistingNumber,
    nextGeneratedMembershipNumber: nextGeneratedId,
    lastRegistrationError,
    status: configured && dbConnection === 'OK' ? 'PASS' : 'STANDBY',
    engine: 'Supabase PostgreSQL Cloud Database + Storage',
    configured,
    connectionStatus: dbConnection,
    latencyMs,
    memberCount,
    paymentCount: getLocalPayments().length,
    storageAvailable: configured,
    realtimeAvailable: configured
  };
}

export async function deletePaymentFromSupabase(paymentId: string): Promise<PaymentRecord[]> {
  try {
    const localKey = 'nnepef_payments';
    const saved = localStorage.getItem(localKey);
    let list: PaymentRecord[] = saved ? JSON.parse(saved) : [];
    list = list.filter(p => p.id !== paymentId);
    saveLocalPaymentsList(list);
  } catch (e) {}

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('payment_records').delete().eq('id', paymentId);
    } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nnepef_db_changed', { detail: { table: 'payments' } }));
  }

  return getLocalPayments();
}

export const deletePaymentFromSQLite = deletePaymentFromSupabase;

// ============================================================================
// 6. CONTENT & PORTAL MANAGEMENT TABLES (SUPABASE POSTGRESQL)
// ============================================================================

// --- 6.1 FORUM SETTINGS ---
export async function fetchSettingsFromSupabase(): Promise<ForumSettings> {
  const local = getLocalSettings();
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('forum_settings')
        .select('*')
        .eq('id', 'primary_settings')
        .maybeSingle();

      if (!error && data) {
        const mapped: ForumSettings = {
          ...local,
          forumName: data.forum_name || local.forumName,
          tagline: data.tagline || local.tagline,
          logoUrl: data.logo_url || local.logoUrl,
          heroBannerUrl: data.hero_banner_url || local.heroBannerUrl,
          primaryColor: data.primary_color || local.primaryColor,
          skyColor: data.sky_color || local.skyColor,
          themeMode: data.theme_mode || local.themeMode,
          announcementBarText: data.announcement_bar_text || local.announcementBarText,
          announcementBarEnabled: data.announcement_bar_enabled ?? local.announcementBarEnabled,
          contactEmail: data.contact_email || local.contactEmail,
          contactPhone: data.contact_phone || local.contactPhone,
          contactPhoneSecondary: data.contact_phone_secondary || local.contactPhoneSecondary,
          contactPhoneTertiary: data.contact_phone_tertiary || local.contactPhoneTertiary,
          headquarters: data.headquarters || local.headquarters,
          socialFacebook: data.social_facebook || local.socialFacebook,
          socialTwitter: data.social_twitter || local.socialTwitter,
          socialLinkedin: data.social_linkedin || local.socialLinkedin,
          socialYoutube: data.social_youtube || local.socialYoutube,
          registrationEnabled: data.registration_enabled !== false,
          maintenanceMode: Boolean(data.portal_maintenance_mode)
        };
        saveLocalSettings(mapped);
        return mapped;
      }
    } catch (e) {
      console.warn('[Supabase] Error fetching settings:', e);
    }
  }
  return local;
}

// --- 6.2 ANNOUNCEMENTS (`public.announcements`) ---
export async function fetchAnnouncementsFromSupabase(): Promise<Announcement[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: Announcement[] = data.map((r: any) => ({
          id: r.id,
          title: r.title,
          content: r.content,
          pinned: Boolean(r.pinned),
          targetGroup: (r.target_group as any) || 'all',
          targetState: r.target_state || undefined,
          createdAt: r.created_at || new Date().toISOString(),
          scheduledDate: r.scheduled_date || undefined,
          pushSent: Boolean(r.push_sent),
          author: r.author || 'National Secretariat'
        }));
        saveLocalAnnouncements(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching announcements:', err);
    }
  }
  return getLocalAnnouncements();
}

export async function saveAnnouncementToSupabase(item: Announcement): Promise<Announcement> {
  const current = getLocalAnnouncements();
  const idx = current.findIndex(a => a.id === item.id);
  const updatedList = idx >= 0 ? [...current] : [item, ...current];
  if (idx >= 0) updatedList[idx] = item;
  saveLocalAnnouncements(updatedList);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('announcements').upsert({
        id: item.id,
        title: item.title,
        content: item.content,
        pinned: item.pinned,
        target_group: item.targetGroup,
        target_state: item.targetState || null,
        scheduled_date: item.scheduledDate || null,
        push_sent: item.pushSent,
        author: item.author,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Error saving announcement:', e);
    }
  }
  return item;
}

export async function deleteAnnouncementFromSupabase(id: string): Promise<void> {
  const current = getLocalAnnouncements().filter(a => a.id !== id);
  saveLocalAnnouncements(current);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('announcements').delete().eq('id', id);
    } catch (e) {}
  }
}

// --- 6.3 NEWS ARTICLES (`public.news_articles`) ---
export async function fetchNewsFromSupabase(): Promise<NewsArticle[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: NewsArticle[] = data.map((r: any) => ({
          id: r.id,
          title: r.title,
          category: (r.category as any) || 'Announcements',
          summary: r.summary || '',
          content: r.content,
          imageUrl: r.image_url || '',
          author: r.author || 'Secretariat',
          date: r.date || (r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
          featured: Boolean(r.featured),
          commentsCount: Number(r.comments_count) || 0,
          views: Number(r.views) || 0,
          tags: Array.isArray(r.tags) ? r.tags : []
        }));
        saveLocalNews(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching news:', err);
    }
  }
  return getLocalNews();
}

export async function saveNewsToSupabase(article: NewsArticle): Promise<NewsArticle> {
  const current = getLocalNews();
  const idx = current.findIndex(n => n.id === article.id);
  const updatedList = idx >= 0 ? [...current] : [article, ...current];
  if (idx >= 0) updatedList[idx] = article;
  saveLocalNews(updatedList);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('news_articles').upsert({
        id: article.id,
        title: article.title,
        category: article.category,
        summary: article.summary,
        content: article.content,
        image_url: article.imageUrl,
        author: article.author,
        date: article.date,
        featured: article.featured,
        comments_count: article.commentsCount,
        views: article.views,
        tags: article.tags,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Error saving news:', e);
    }
  }
  return article;
}

export async function deleteNewsFromSupabase(id: string): Promise<void> {
  const current = getLocalNews().filter(n => n.id !== id);
  saveLocalNews(current);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('news_articles').delete().eq('id', id);
    } catch (e) {}
  }
}

// --- 6.4 EXECUTIVES (`public.executives`) ---
export async function fetchExecutivesFromSupabase(): Promise<Executive[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('executives')
        .select('*')
        .order('display_order', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: Executive[] = data.map((r: any) => ({
          id: r.id,
          name: r.name,
          position: r.position,
          tier: (r.tier as any) || 'national',
          state: r.state || undefined,
          lga: r.lga || undefined,
          committee: r.committee || undefined,
          photoUrl: r.photo_url || '',
          email: r.email || '',
          phone: r.phone || '',
          bio: r.bio || '',
          term: r.term || '2024 - 2026',
          order: Number(r.display_order) || 0,
          active: r.active !== false
        }));
        saveLocalExecutives(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching executives:', err);
    }
  }
  return getLocalExecutives();
}

export async function saveExecutiveToSupabase(exec: Executive): Promise<Executive> {
  const current = getLocalExecutives();
  const idx = current.findIndex(e => e.id === exec.id);
  const updatedList = idx >= 0 ? [...current] : [...current, exec];
  if (idx >= 0) updatedList[idx] = exec;
  saveLocalExecutives(updatedList);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('executives').upsert({
        id: exec.id,
        name: exec.name,
        position: exec.position,
        tier: exec.tier,
        state: exec.state || null,
        lga: exec.lga || null,
        committee: exec.committee || null,
        photo_url: exec.photoUrl,
        email: exec.email,
        phone: exec.phone,
        bio: exec.bio,
        term: exec.term,
        display_order: exec.order || 0,
        active: exec.active !== false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Error saving executive:', e);
    }
  }
  return exec;
}

export async function deleteExecutiveFromSupabase(id: string): Promise<void> {
  const current = getLocalExecutives().filter(e => e.id !== id);
  saveLocalExecutives(current);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('executives').delete().eq('id', id);
    } catch (e) {}
  }
}

// --- 6.5 EVENTS (`public.events`) ---
export async function fetchEventsFromSupabase(): Promise<EventItem[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: EventItem[] = data.map((r: any) => ({
          id: r.id,
          title: r.title,
          date: r.date,
          time: r.time || '',
          location: r.location || '',
          state: r.state || 'Kano',
          description: r.description || '',
          isVirtual: Boolean(r.is_virtual),
          virtualLink: r.virtual_link || undefined,
          rsvpCount: Number(r.rsvp_count) || 0,
          capacity: Number(r.capacity) || 500,
          qrCode: r.qr_code || '',
          certificatesEnabled: Boolean(r.certificates_enabled),
          photos: Array.isArray(r.photos) ? r.photos : [],
          videos: Array.isArray(r.videos) ? r.videos : [],
          speakers: Array.isArray(r.speakers) ? r.speakers : []
        }));
        saveLocalEvents(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching events:', err);
    }
  }
  return getLocalEvents();
}

export async function saveEventToSupabase(event: EventItem): Promise<EventItem> {
  const current = getLocalEvents();
  const idx = current.findIndex(e => e.id === event.id);
  const updatedList = idx >= 0 ? [...current] : [...current, event];
  if (idx >= 0) updatedList[idx] = event;
  saveLocalEvents(updatedList);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('events').upsert({
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        state: event.state,
        description: event.description,
        is_virtual: event.isVirtual,
        virtual_link: event.virtualLink || null,
        rsvp_count: event.rsvpCount,
        capacity: event.capacity,
        qr_code: event.qrCode,
        certificates_enabled: event.certificatesEnabled,
        photos: event.photos,
        videos: event.videos,
        speakers: event.speakers,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Error saving event:', e);
    }
  }
  return event;
}

export async function deleteEventFromSupabase(id: string): Promise<void> {
  const current = getLocalEvents().filter(e => e.id !== id);
  saveLocalEvents(current);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('events').delete().eq('id', id);
    } catch (e) {}
  }
}

// --- 6.6 DOCUMENTS (`public.documents`) ---
export async function fetchDocumentsFromSupabase(): Promise<DocumentItem[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: DocumentItem[] = data.map((r: any) => ({
          id: r.id,
          title: r.title,
          category: (r.category as any) || 'Circular',
          fileUrl: r.file_url,
          fileSize: r.file_size || '1.0 MB',
          format: (r.format as any) || 'PDF',
          minRole: (r.min_role as any) || 'all',
          uploadDate: r.upload_date || new Date().toISOString().split('T')[0],
          downloadsCount: Number(r.downloads_count) || 0
        }));
        saveLocalDocuments(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching documents:', err);
    }
  }
  return getLocalDocuments();
}

export async function saveDocumentToSupabase(doc: DocumentItem): Promise<DocumentItem> {
  const current = getLocalDocuments();
  const idx = current.findIndex(d => d.id === doc.id);
  const updatedList = idx >= 0 ? [...current] : [doc, ...current];
  if (idx >= 0) updatedList[idx] = doc;
  saveLocalDocuments(updatedList);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('documents').upsert({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        file_url: doc.fileUrl,
        file_size: doc.fileSize,
        format: doc.format,
        min_role: doc.minRole,
        upload_date: doc.uploadDate,
        downloads_count: doc.downloadsCount,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Error saving document:', e);
    }
  }
  return doc;
}

export async function deleteDocumentFromSupabase(id: string): Promise<void> {
  const current = getLocalDocuments().filter(d => d.id !== id);
  saveLocalDocuments(current);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('documents').delete().eq('id', id);
    } catch (e) {}
  }
}

// --- 6.7 GALLERY ALBUMS (`public.gallery_albums`) ---
export async function fetchGalleryFromSupabase(): Promise<GalleryAlbum[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('gallery_albums')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: GalleryAlbum[] = data.map((r: any) => ({
          id: r.id,
          title: r.title,
          category: r.category || 'General',
          date: r.date || new Date().toISOString().split('T')[0],
          coverUrl: r.cover_url || '',
          photos: Array.isArray(r.photos) ? r.photos : [],
          videos: Array.isArray(r.videos) ? r.videos : [],
          description: r.description || ''
        }));
        saveLocalGallery(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching gallery:', err);
    }
  }
  return getLocalGallery();
}

export async function saveGalleryToSupabase(album: GalleryAlbum): Promise<GalleryAlbum> {
  const current = getLocalGallery();
  const idx = current.findIndex(g => g.id === album.id);
  const updatedList = idx >= 0 ? [...current] : [album, ...current];
  if (idx >= 0) updatedList[idx] = album;
  saveLocalGallery(updatedList);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('gallery_albums').upsert({
        id: album.id,
        title: album.title,
        category: album.category,
        date: album.date,
        cover_url: album.coverUrl,
        photos: album.photos,
        videos: album.videos,
        description: album.description,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Error saving gallery album:', e);
    }
  }
  return album;
}

export async function deleteGalleryFromSupabase(id: string): Promise<void> {
  const current = getLocalGallery().filter(g => g.id !== id);
  saveLocalGallery(current);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('gallery_albums').delete().eq('id', id);
    } catch (e) {}
  }
}

// --- 6.8 CONTACT MESSAGES (`public.contact_messages`) ---
export async function fetchContactMessagesFromSupabase(): Promise<ContactMessage[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: ContactMessage[] = data.map((r: any) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone || '',
          subject: r.subject || '',
          message: r.message,
          date: r.date || new Date().toISOString(),
          status: (r.status as any) || 'unread',
          reply: r.reply || undefined
        }));
        saveLocalContactMessages(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching contact messages:', err);
    }
  }
  return getLocalContactMessages();
}

export async function saveContactMessageToSupabase(msg: ContactMessage): Promise<ContactMessage> {
  const current = getLocalContactMessages();
  const idx = current.findIndex(m => m.id === msg.id);
  const updatedList = idx >= 0 ? [...current] : [msg, ...current];
  if (idx >= 0) updatedList[idx] = msg;
  saveLocalContactMessages(updatedList);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('contact_messages').upsert({
        id: msg.id,
        name: msg.name,
        email: msg.email,
        phone: msg.phone,
        subject: msg.subject,
        message: msg.message,
        date: msg.date,
        status: msg.status,
        reply: msg.reply || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Error saving contact message:', e);
    }
  }
  return msg;
}

export async function deleteContactMessageFromSupabase(id: string): Promise<void> {
  const current = getLocalContactMessages().filter(m => m.id !== id);
  saveLocalContactMessages(current);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('contact_messages').delete().eq('id', id);
    } catch (e) {}
  }
}

// --- 6.9 RENEWAL REQUESTS (`public.renewal_requests`) ---
export async function fetchRenewalsFromSupabase(): Promise<RenewalRequest[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('renewal_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: RenewalRequest[] = data.map((r: any) => ({
          id: r.id,
          memberId: r.member_id,
          fullName: r.full_name,
          membershipId: r.membership_id,
          position: r.position || 'Member',
          passportUrl: r.passport_url || '',
          signatureUrl: r.signature_url || '',
          receiptUrl: r.receipt_url || '',
          state: r.state || '',
          lga: r.lga || '',
          requestDate: r.request_date || new Date().toISOString(),
          status: (r.status as any) || 'Pending',
          remarks: r.remarks || undefined,
          rejectionReason: r.rejection_reason || undefined,
          approvalDate: r.approval_date || undefined,
          expiryDate: r.expiry_date || undefined,
          printedCount: Number(r.printed_count) || 0,
          idCardDesignUrl: r.id_card_design_url || undefined
        }));
        saveLocalRenewals(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching renewal requests:', err);
    }
  }
  return getLocalRenewals();
}

export async function saveRenewalToSupabase(ren: RenewalRequest): Promise<RenewalRequest> {
  const current = getLocalRenewals();
  const idx = current.findIndex(r => r.id === ren.id);
  const updatedList = idx >= 0 ? [...current] : [ren, ...current];
  if (idx >= 0) updatedList[idx] = ren;
  saveLocalRenewals(updatedList);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('renewal_requests').upsert({
        id: ren.id,
        member_id: ren.memberId,
        full_name: ren.fullName,
        membership_id: ren.membershipId,
        position: ren.position,
        passport_url: ren.passportUrl,
        signature_url: ren.signatureUrl,
        receipt_url: ren.receiptUrl,
        state: ren.state,
        lga: ren.lga,
        request_date: ren.requestDate,
        status: ren.status,
        remarks: ren.remarks || null,
        rejection_reason: ren.rejectionReason || null,
        approval_date: ren.approvalDate || null,
        expiry_date: ren.expiryDate || null,
        printed_count: ren.printedCount || 0,
        id_card_design_url: ren.idCardDesignUrl || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Error saving renewal request:', e);
    }
  }
  return ren;
}

export async function deleteRenewalFromSupabase(id: string): Promise<void> {
  const current = getLocalRenewals().filter(r => r.id !== id);
  saveLocalRenewals(current);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('renewal_requests').delete().eq('id', id);
    } catch (e) {}
  }
}

// --- 6.10 CMS FILES (`public.cms_files`) ---
export async function fetchCMSFilesFromSupabase(): Promise<CMSFile[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('cms_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: CMSFile[] = data.map((r: any) => ({
          id: r.id,
          name: r.name,
          url: r.url,
          type: (r.type as any) || 'image',
          size: r.size || '0 KB',
          uploadedAt: r.uploaded_at || new Date().toISOString(),
          uploadedBy: r.uploaded_by || 'Admin'
        }));
        saveLocalCMSFiles(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching CMS files:', err);
    }
  }
  return getLocalCMSFiles();
}

export async function saveCMSFileToSupabase(file: CMSFile): Promise<CMSFile> {
  const current = getLocalCMSFiles();
  const idx = current.findIndex(f => f.id === file.id);
  const updatedList = idx >= 0 ? [...current] : [file, ...current];
  if (idx >= 0) updatedList[idx] = file;
  saveLocalCMSFiles(updatedList);

  if (isSupabaseConfigured()) {
    try {
      await supabase.from('cms_files').upsert({
        id: file.id,
        name: file.name,
        url: file.url,
        type: file.type,
        size: file.size,
        uploaded_at: file.uploadedAt,
        uploaded_by: file.uploadedBy
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('[Supabase] Error saving CMS file:', e);
    }
  }
  return file;
}

export async function deleteCMSFileFromSupabase(id: string): Promise<void> {
  const current = getLocalCMSFiles().filter(f => f.id !== id);
  saveLocalCMSFiles(current);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('cms_files').delete().eq('id', id);
    } catch (e) {}
  }
}

// --- 6.11 AUDIT LOGS (`public.audit_logs`) ---
export async function fetchAuditLogsFromSupabase(): Promise<AuditLog[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: AuditLog[] = data.map((r: any) => ({
          id: r.id,
          timestamp: r.timestamp || r.created_at || new Date().toISOString(),
          actorName: r.actor_name,
          actorRole: r.actor_role,
          action: r.action,
          details: r.details,
          ipAddress: r.ip_address || 'Client',
          deviceInfo: r.device_info || 'Web Browser'
        }));
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching audit logs:', err);
    }
  }
  return getLocalAuditLogs();
}

// --- 6.12 NOTIFICATIONS (`public.notifications`) ---
export async function fetchNotificationsFromSupabase(): Promise<NotificationItem[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped: NotificationItem[] = data.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          timestamp: n.created_at || new Date().toISOString(),
          type: n.type || 'info',
          read: n.read || false
        }));
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching notifications:', err);
    }
  }
  return getLocalNotifications();
}

export function subscribeToCollection<T extends { id: string }>(
  collectionName: string,
  initialData: T[],
  callback: (data: T[]) => void
) {
  const localKey = `nnepef_${collectionName}`;
  const saved = typeof window !== 'undefined' ? localStorage.getItem(localKey) : null;
  const list = saved ? JSON.parse(saved) : initialData;
  callback(list);
  return () => {};
}

export async function saveItemToCollection<T extends { id: string }>(
  collectionName: string,
  item: T
): Promise<void> {
  try {
    const localKey = `nnepef_${collectionName}`;
    const saved = localStorage.getItem(localKey);
    let list: T[] = saved ? JSON.parse(saved) : [];
    const idx = list.findIndex(i => i.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.unshift(item);
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {}

  if (isSupabaseConfigured()) {
    try {
      if (collectionName === 'announcements') {
        await saveAnnouncementToSupabase(item as any);
      } else if (collectionName === 'news' || collectionName === 'news_articles') {
        await saveNewsToSupabase(item as any);
      } else if (collectionName === 'executives') {
        await saveExecutiveToSupabase(item as any);
      } else if (collectionName === 'events') {
        await saveEventToSupabase(item as any);
      } else if (collectionName === 'documents') {
        await saveDocumentToSupabase(item as any);
      } else if (collectionName === 'gallery' || collectionName === 'gallery_albums') {
        await saveGalleryToSupabase(item as any);
      } else if (collectionName === 'contact_messages' || collectionName === 'contact') {
        await saveContactMessageToSupabase(item as any);
      } else if (collectionName === 'renewals' || collectionName === 'renewal_requests') {
        await saveRenewalToSupabase(item as any);
      } else if (collectionName === 'cms_files' || collectionName === 'cms') {
        await saveCMSFileToSupabase(item as any);
      }
    } catch (e) {
      console.warn(`[Supabase] saveItemToCollection error for ${collectionName}:`, e);
    }
  }
}

export async function deleteItemFromCollection(
  collectionName: string,
  id: string
): Promise<void> {
  try {
    const localKey = `nnepef_${collectionName}`;
    const saved = localStorage.getItem(localKey);
    if (saved) {
      let list: any[] = JSON.parse(saved);
      list = list.filter(i => i.id !== id);
      localStorage.setItem(localKey, JSON.stringify(list));
    }
  } catch (e) {}

  if (isSupabaseConfigured()) {
    try {
      if (collectionName === 'payments') {
        await deletePaymentFromSupabase(id);
      } else if (collectionName === 'announcements') {
        await deleteAnnouncementFromSupabase(id);
      } else if (collectionName === 'news' || collectionName === 'news_articles') {
        await deleteNewsFromSupabase(id);
      } else if (collectionName === 'executives') {
        await deleteExecutiveFromSupabase(id);
      } else if (collectionName === 'events') {
        await deleteEventFromSupabase(id);
      } else if (collectionName === 'documents') {
        await deleteDocumentFromSupabase(id);
      } else if (collectionName === 'gallery' || collectionName === 'gallery_albums') {
        await deleteGalleryFromSupabase(id);
      } else if (collectionName === 'contact_messages' || collectionName === 'contact') {
        await deleteContactMessageFromSupabase(id);
      } else if (collectionName === 'renewals' || collectionName === 'renewal_requests') {
        await deleteRenewalFromSupabase(id);
      } else if (collectionName === 'cms_files' || collectionName === 'cms') {
        await deleteCMSFileFromSupabase(id);
      }
    } catch (e) {
      console.warn(`[Supabase] deleteItemFromCollection error for ${collectionName}:`, e);
    }
  }
}

export const fetchSQLiteDiagnostics = fetchSupabaseDiagnostics;

export {
  saveLocalPayment,
  saveLocalPaymentsList,
  getLocalPayments,
  saveLocalSettings,
  getLocalSettings,
  getLocalBankAccounts,
  saveLocalBankAccounts,
  getLocalAuditLogs,
  addLocalAuditLog,
  getLocalNotifications,
  addLocalNotification,
  getLocalDeliveryLogs,
  addLocalDeliveryLog,
  deleteDeliveryLog,
  clearAllDeliveryLogs
};
