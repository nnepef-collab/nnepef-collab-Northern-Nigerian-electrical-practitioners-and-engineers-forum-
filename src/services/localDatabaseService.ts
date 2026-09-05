/**
 * Centralized Authoritative Local Storage Persistence Engine for N-NEPEF 2020 Portal
 * 
 * Strict Single-Source-of-Truth Local Storage Architecture:
 * - 100% Browser Local Storage persistence (No cloud DB / No external API required)
 * - Safe Save Process: Read -> Mutate by permanent ID -> Write -> Read-back & Verify -> State Update
 * - Safe Delete Process: Read -> Filter by permanent ID -> Write -> Read-back & Verify -> State Update
 * - First-Run Rule: IF key exists, NEVER overwrite with default/demo data.
 * - Robust JSON parsing with error isolation (never silently wipes saved data).
 */

import { 
  Member, 
  PaymentRecord, 
  Announcement, 
  NotificationItem, 
  DocumentItem, 
  EventItem, 
  AuditLog, 
  ForumSettings, 
  BankAccount,
  FeeCategory,
  AdminAccount, 
  CMSFile,
  RenewalRequest,
  NotificationDeliveryLog,
  Executive,
  NewsArticle,
  GalleryAlbum,
  ContactMessage
} from '../types';

import { 
  initialMembers, 
  initialExecutives, 
  initialNews, 
  initialEvents, 
  initialAnnouncements, 
  initialPayments, 
  initialRenewalRequests, 
  initialDocuments, 
  initialGallery, 
  initialContactMessages, 
  initialAuditLogs, 
  initialForumSettings, 
  sampleNotifications, 
  initialNotificationLogs, 
  initialAdmins, 
  initialCMSFiles 
} from '../data/initialData';

// Authoritative Unified Storage Keys
export const STORAGE_KEYS = {
  INITIALIZED: 'nnepef_storage_initialized_v3',
  PAYMENTS: 'nnepef_payments',
  ADMINS: 'nnepef_admins',
  SETTINGS: 'nnepef_settings',
  FEE_CATEGORIES: 'nnepef_fee_categories',
  BANK_ACCOUNTS: 'nnepef_bank_accounts',
  AUDIT_LOGS: 'nnepef_audit_logs',
  NOTIFICATIONS: 'nnepef_notifications',
  DELIVERY_LOGS: 'nnepef_delivery_logs',
  DOCUMENTS: 'nnepef_documents',
  EVENTS: 'nnepef_events',
  ANNOUNCEMENTS: 'nnepef_announcements',
  EXECUTIVES: 'nnepef_executives',
  NEWS: 'nnepef_news',
  GALLERY: 'nnepef_gallery',
  CONTACT_MESSAGES: 'nnepef_contact_messages',
  RENEWALS: 'nnepef_renewal_requests',
  CMS_FILES: 'nnepef_cms_files',
  CURRENT_USER: 'nnepef_current_user',
  CURRENT_VIEW: 'nnepef_current_view',
  ADMIN_LOGGED_IN: 'nnepef_admin_logged_in',
};

// Event listener setup for reactive state updates across components and tabs
type StorageChangeListener = (key: string) => void;
const listeners: Set<StorageChangeListener> = new Set();

export function subscribeToLocalDB(listener: StorageChangeListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(key: string) {
  listeners.forEach(fn => {
    try {
      fn(key);
    } catch (e) {
      console.error('[LocalStorageService] Listener notification error:', e);
    }
  });

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('nnepef_db_changed', { detail: { table: key, key } }));
    } catch (e) {}
  }
}

// In-memory store fallback for server-side / test execution environments
const inMemoryStore: Map<string, string> = new Map();

/**
 * Safe Get from LocalStorage with fallback.
 * Never throws, never wipes stored data on parse error.
 */
export function safeGetStorage<T>(key: string, defaultValue: T): T {
  let raw: string | null = null;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      raw = localStorage.getItem(key);
    } catch {}
  } else {
    raw = inMemoryStore.get(key) || null;
  }

  if (raw === null || raw === undefined) {
    return defaultValue;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch (err) {
    console.error(`[LocalStorageService] Parse error on key "${key}". Preserving existing value:`, err);
    return defaultValue;
  }
}

/**
 * Safe Set to LocalStorage with read-back verification and change notification.
 */
export function safeSetStorage<T>(key: string, value: T, notifyKey?: string): T {
  const json = JSON.stringify(value);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(key, json);
      const verifiedRaw = localStorage.getItem(key);
      if (verifiedRaw !== null) {
        if (notifyKey) notifyListeners(notifyKey);
        return JSON.parse(verifiedRaw) as T;
      }
    } catch (err) {
      console.error(`[LocalStorageService] Error saving key "${key}":`, err);
    }
  }

  // Fallback to in-memory store
  inMemoryStore.set(key, json);
  if (notifyKey) notifyListeners(notifyKey);
  return value;
}

/**
 * Centralized Initializer:
 * - Migrates any legacy keys (e.g. from previous versions) into the authoritative keys.
 * - IF KEY DOES NOT EXIST: sets initial/default data ONCE.
 * - IF KEY ALREADY EXISTS: NEVER overwrites existing saved user data!
 */
export async function initializeLocalDatabase(): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return;

  console.log('⚡ [LocalStorageService] Checking and initializing authoritative storage keys...');

  // Safe migration map from legacy keys if new key is absent
  const legacyKeyMap: Record<string, string[]> = {
    [STORAGE_KEYS.PAYMENTS]: ['nnepef_db_payments', 'nnepef_payments'],
    [STORAGE_KEYS.SETTINGS]: ['nnepef_db_settings', 'nnepef_settings'],
    [STORAGE_KEYS.ADMINS]: ['nnepef_db_admins', 'nnepef_admins'],
    [STORAGE_KEYS.CMS_FILES]: ['nnepef_db_cms_files', 'nnepef_cms_files'],
    [STORAGE_KEYS.AUDIT_LOGS]: ['nnepef_db_audit_logs', 'nnepef_audit_logs'],
    [STORAGE_KEYS.NOTIFICATIONS]: ['nnepef_db_notifications', 'nnepef_notifications'],
    [STORAGE_KEYS.DELIVERY_LOGS]: ['nnepef_db_delivery_logs', 'nnepef_delivery_logs'],
    [STORAGE_KEYS.DOCUMENTS]: ['nnepef_db_documents', 'nnepef_documents'],
    [STORAGE_KEYS.EVENTS]: ['nnepef_db_events', 'nnepef_events'],
    [STORAGE_KEYS.ANNOUNCEMENTS]: ['nnepef_db_announcements', 'nnepef_announcements'],
    [STORAGE_KEYS.EXECUTIVES]: ['nnepef_db_executives', 'nnepef_executives'],
    [STORAGE_KEYS.NEWS]: ['nnepef_db_news', 'nnepef_news'],
    [STORAGE_KEYS.GALLERY]: ['nnepef_db_gallery', 'nnepef_gallery'],
    [STORAGE_KEYS.CONTACT_MESSAGES]: ['nnepef_db_contact_messages', 'nnepef_contact_messages'],
    [STORAGE_KEYS.RENEWALS]: ['nnepef_db_renewals', 'nnepef_renewal_requests'],
  };

  for (const [newKey, legacyKeys] of Object.entries(legacyKeyMap)) {
    if (localStorage.getItem(newKey) === null) {
      for (const legacy of legacyKeys) {
        const val = localStorage.getItem(legacy);
        if (val !== null && val.trim().length > 0) {
          try {
            JSON.parse(val); // verify it's valid JSON
            localStorage.setItem(newKey, val);
            break;
          } catch (e) {}
        }
      }
    }
  }

  // Authoritative Bank Accounts Storage
  if (localStorage.getItem(STORAGE_KEYS.BANK_ACCOUNTS) === null) {
    // Check if settings in local storage has manually configured bank accounts
    let initialBankList: BankAccount[] = [];
    const existingSettingsRaw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (existingSettingsRaw) {
      try {
        const parsed = JSON.parse(existingSettingsRaw);
        if (Array.isArray(parsed.bankAccounts)) {
          initialBankList = parsed.bankAccounts;
        }
      } catch (e) {}
    }
    safeSetStorage(STORAGE_KEYS.BANK_ACCOUNTS, initialBankList, 'bank_accounts');
  }

  // First-Run Initial Defaults (ONLY create if key does not exist)
  if (localStorage.getItem(STORAGE_KEYS.ADMINS) === null) {
    safeSetStorage(STORAGE_KEYS.ADMINS, initialAdmins);
  }
  if (localStorage.getItem(STORAGE_KEYS.SETTINGS) === null) {
    safeSetStorage(STORAGE_KEYS.SETTINGS, initialForumSettings);
  }
  if (localStorage.getItem(STORAGE_KEYS.PAYMENTS) === null) {
    safeSetStorage(STORAGE_KEYS.PAYMENTS, []);
  }
  if (localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS) === null) {
    safeSetStorage(STORAGE_KEYS.ANNOUNCEMENTS, initialAnnouncements);
  }
  if (localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) === null) {
    safeSetStorage(STORAGE_KEYS.NOTIFICATIONS, sampleNotifications);
  }
  if (localStorage.getItem(STORAGE_KEYS.DOCUMENTS) === null) {
    safeSetStorage(STORAGE_KEYS.DOCUMENTS, initialDocuments);
  }
  if (localStorage.getItem(STORAGE_KEYS.EVENTS) === null) {
    safeSetStorage(STORAGE_KEYS.EVENTS, initialEvents);
  }
  if (localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) === null) {
    safeSetStorage(STORAGE_KEYS.AUDIT_LOGS, initialAuditLogs);
  }
  if (localStorage.getItem(STORAGE_KEYS.EXECUTIVES) === null) {
    safeSetStorage(STORAGE_KEYS.EXECUTIVES, initialExecutives);
  }
  if (localStorage.getItem(STORAGE_KEYS.NEWS) === null) {
    safeSetStorage(STORAGE_KEYS.NEWS, initialNews);
  }
  if (localStorage.getItem(STORAGE_KEYS.GALLERY) === null) {
    safeSetStorage(STORAGE_KEYS.GALLERY, initialGallery);
  }
  if (localStorage.getItem(STORAGE_KEYS.CONTACT_MESSAGES) === null) {
    safeSetStorage(STORAGE_KEYS.CONTACT_MESSAGES, initialContactMessages);
  }
  if (localStorage.getItem(STORAGE_KEYS.RENEWALS) === null) {
    safeSetStorage(STORAGE_KEYS.RENEWALS, initialRenewalRequests);
  }
  if (localStorage.getItem(STORAGE_KEYS.DELIVERY_LOGS) === null) {
    safeSetStorage(STORAGE_KEYS.DELIVERY_LOGS, initialNotificationLogs);
  }
  if (localStorage.getItem(STORAGE_KEYS.CMS_FILES) === null) {
    safeSetStorage(STORAGE_KEYS.CMS_FILES, initialCMSFiles);
  }

  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  console.log('✅ [LocalStorageService] Authoritative Local Storage verified and ready.');
}

import {
  getMembers,
  saveMembers,
  addMember,
  updateMember,
  deleteMember,
  getMemberById,
  clearMembers,
  MEMBERS_STORAGE_KEY
} from './localStorageService';

// Re-export standardized member methods
export {
  getMembers,
  saveMembers,
  addMember,
  updateMember,
  deleteMember,
  getMemberById,
  clearMembers
};

// ============================================================================
// MEMBERS API (Single Source of Truth: nnepef_members)
// ============================================================================

export function getLocalMembers(): Member[] {
  return getMembers();
}

export function saveLocalMembersList(membersList: Member[]): Member[] {
  return saveMembers(membersList);
}

export function saveLocalMember(member: Member): Member {
  return updateMember(member);
}

export function deleteLocalMember(memberId: string): Member[] {
  return deleteMember(memberId);
}

// MEMBERSHIP ID GENERATOR (Used only when creating or assigning a brand new membership ID)
export function generateMembershipId(stateCode: string = 'KT', existingMemberList: Member[] = []): string {
  const targetYear = new Date().getFullYear() >= 2024 ? new Date().getFullYear() : 2024;
  const members = existingMemberList;
  const parsedNumbers: number[] = [];
  const existingIds = new Set<string>();

  for (const m of members) {
    if (m.membershipId) {
      const idStr = String(m.membershipId).trim();
      existingIds.add(idStr.toUpperCase());
      const match = idStr.match(/(\d+)$/);
      if (match && match[1]) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed > 0) {
          parsedNumbers.push(parsed);
        }
      }
    }
  }

  let highestSequence = parsedNumbers.length > 0 ? Math.max(...parsedNumbers) : 0;
  let candidateNum = Math.max(1, highestSequence + 1);
  const padLength = candidateNum >= 1000 ? String(candidateNum).length : 3;
  let candidateId = `NNEPEF/${targetYear}/${String(candidateNum).padStart(padLength, '0')}`;

  while (existingIds.has(candidateId.toUpperCase())) {
    candidateNum++;
    const pad = candidateNum >= 1000 ? String(candidateNum).length : 3;
    candidateId = `NNEPEF/${targetYear}/${String(candidateNum).padStart(pad, '0')}`;
  }

  return candidateId;
}

// TRANSACTION / PAYMENT REFERENCE GENERATOR
export function generateTransactionReference(): string {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `REF-${year}-NNEPEF-${randomNum}`;
}

// ============================================================================
// PAYMENTS API
// ============================================================================

export function getLocalPayments(): PaymentRecord[] {
  const payments = safeGetStorage<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, []);
  return Array.isArray(payments) ? payments : [];
}

export function saveLocalPaymentsList(paymentsList: PaymentRecord[]): PaymentRecord[] {
  if (!Array.isArray(paymentsList)) return getLocalPayments();
  return safeSetStorage(STORAGE_KEYS.PAYMENTS, paymentsList, 'payments');
}

export function saveLocalPayment(payment: PaymentRecord): PaymentRecord {
  if (!payment || !payment.id) return payment;

  const currentPayments = getLocalPayments();
  const index = currentPayments.findIndex(p => p.id === payment.id || (p.reference && p.reference === payment.reference));

  const updatedPayment: PaymentRecord = { ...payment };
  if (!updatedPayment.reference) {
    updatedPayment.reference = generateTransactionReference();
  }

  let updatedList: PaymentRecord[];
  if (index >= 0) {
    updatedList = [...currentPayments];
    updatedList[index] = { ...currentPayments[index], ...updatedPayment };
  } else {
    updatedList = [updatedPayment, ...currentPayments];
  }

  const verifiedList = safeSetStorage(STORAGE_KEYS.PAYMENTS, updatedList, 'payments');
  return verifiedList.find(p => p.id === payment.id) || updatedPayment;
}

export function deleteLocalPayment(paymentId: string): PaymentRecord[] {
  const currentPayments = getLocalPayments();
  const filtered = currentPayments.filter(p => p.id !== paymentId);
  return safeSetStorage(STORAGE_KEYS.PAYMENTS, filtered, 'payments');
}

// ============================================================================
// BANK ACCOUNTS API (100% Manual, Authoritative Storage)
// ============================================================================

export function getLocalBankAccounts(): BankAccount[] {
  const accounts = safeGetStorage<BankAccount[]>(STORAGE_KEYS.BANK_ACCOUNTS, []);
  return Array.isArray(accounts) ? accounts : [];
}

export function saveLocalBankAccounts(accountsList: BankAccount[]): BankAccount[] {
  const list = Array.isArray(accountsList) ? accountsList : [];
  // 1. Write to authoritative storage key
  const verified = safeSetStorage<BankAccount[]>(STORAGE_KEYS.BANK_ACCOUNTS, list, 'bank_accounts');

  // 2. Keep settings synchronized
  const currentSettings = safeGetStorage<ForumSettings>(STORAGE_KEYS.SETTINGS, initialForumSettings);
  const activeBank = verified.find(b => b.isActive) || (verified.length > 0 ? verified[0] : null);

  const updatedSettings: ForumSettings = {
    ...currentSettings,
    bankAccounts: verified,
    bankName: activeBank ? activeBank.bankName : '',
    bankAccountName: activeBank ? activeBank.accountName : '',
    bankAccountNumber: activeBank ? activeBank.accountNumber : '',
    paymentInstructions: activeBank?.paymentInstructions || currentSettings.paymentInstructions || ''
  };
  safeSetStorage(STORAGE_KEYS.SETTINGS, updatedSettings, 'settings');

  return verified;
}

// ============================================================================
// FEE CATEGORIES API (Official Registration & Membership Fees)
// ============================================================================

export function getLocalFeeCategories(): FeeCategory[] {
  const currentSettings = safeGetStorage<ForumSettings>(STORAGE_KEYS.SETTINGS, initialForumSettings);
  const directList = safeGetStorage<FeeCategory[]>(STORAGE_KEYS.FEE_CATEGORIES, currentSettings.feeCategories || []);
  return Array.isArray(directList) && directList.length > 0 ? directList : (currentSettings.feeCategories || []);
}

export function saveLocalFeeCategories(list: FeeCategory[]): FeeCategory[] {
  const verified = safeSetStorage<FeeCategory[]>(STORAGE_KEYS.FEE_CATEGORIES, list, 'fee_categories');
  const currentSettings = safeGetStorage<ForumSettings>(STORAGE_KEYS.SETTINGS, initialForumSettings);
  safeSetStorage(STORAGE_KEYS.SETTINGS, { ...currentSettings, feeCategories: verified }, 'settings');
  return verified;
}

export function saveLocalFeeCategory(fee: FeeCategory): FeeCategory {
  const list = getLocalFeeCategories();
  const index = list.findIndex(f => f.id === fee.id || f.code === fee.code);
  let updated: FeeCategory[];
  if (index >= 0) {
    updated = [...list];
    updated[index] = { ...list[index], ...fee };
  } else {
    updated = [...list, fee];
  }
  saveLocalFeeCategories(updated);
  return fee;
}

export function deleteLocalFeeCategory(id: string): FeeCategory[] {
  const list = getLocalFeeCategories();
  const filtered = list.filter(f => f.id !== id);
  return saveLocalFeeCategories(filtered);
}

// ============================================================================
// SETTINGS API (Includes Logo, Bank Accounts, Theme, Content)
// ============================================================================

export function getLocalSettings(): ForumSettings {
  const settings = safeGetStorage<ForumSettings>(STORAGE_KEYS.SETTINGS, initialForumSettings);
  // Authoritative manual bank accounts are always derived from the single source of truth
  const bankAccounts = getLocalBankAccounts();
  const activeBank = bankAccounts.find(b => b.isActive) || (bankAccounts.length > 0 ? bankAccounts[0] : null);

  return {
    ...settings,
    bankAccounts: bankAccounts,
    bankName: activeBank ? activeBank.bankName : '',
    bankAccountName: activeBank ? activeBank.accountName : '',
    bankAccountNumber: activeBank ? activeBank.accountNumber : ''
  };
}

export function saveLocalSettings(settings: ForumSettings): ForumSettings {
  if (!settings) return getLocalSettings();
  
  // If bank accounts are included, update the authoritative key
  if (Array.isArray(settings.bankAccounts)) {
    safeSetStorage<BankAccount[]>(STORAGE_KEYS.BANK_ACCOUNTS, settings.bankAccounts, 'bank_accounts');
  }

  return safeSetStorage(STORAGE_KEYS.SETTINGS, settings, 'settings');
}

// ============================================================================
// ADMIN ACCOUNTS API
// ============================================================================

export function getLocalAdmins(): AdminAccount[] {
  const admins = safeGetStorage<AdminAccount[]>(STORAGE_KEYS.ADMINS, initialAdmins);
  const list = Array.isArray(admins) ? [...admins] : [...initialAdmins];
  
  // Ensure default root admins (like nnepef@gmail.com) are guaranteed to be present and active
  for (const defaultAdmin of initialAdmins) {
    const existingIndex = list.findIndex(a => 
      (a.email && a.email.toLowerCase() === defaultAdmin.email.toLowerCase()) ||
      (defaultAdmin.username && a.username && a.username.toLowerCase() === defaultAdmin.username.toLowerCase())
    );
    if (existingIndex < 0) {
      list.unshift(defaultAdmin);
    }
  }
  return list;
}

export function saveLocalAdmins(adminsList: AdminAccount[]): AdminAccount[] {
  if (!Array.isArray(adminsList)) return getLocalAdmins();
  return safeSetStorage(STORAGE_KEYS.ADMINS, adminsList, 'admins');
}

export function saveLocalAdmin(admin: AdminAccount): AdminAccount {
  const admins = getLocalAdmins();
  const index = admins.findIndex(a => a.id === admin.id || a.email.toLowerCase() === admin.email.toLowerCase());
  let updatedList: AdminAccount[];
  if (index >= 0) {
    updatedList = [...admins];
    updatedList[index] = { ...admins[index], ...admin };
  } else {
    updatedList = [admin, ...admins];
  }
  safeSetStorage(STORAGE_KEYS.ADMINS, updatedList, 'admins');
  return admin;
}

export function deleteLocalAdmin(id: string): AdminAccount[] {
  const admins = getLocalAdmins().filter(a => a.id !== id);
  return safeSetStorage(STORAGE_KEYS.ADMINS, admins, 'admins');
}

// ============================================================================
// NOTIFICATIONS API
// ============================================================================

export function getLocalNotifications(): NotificationItem[] {
  return safeGetStorage<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, sampleNotifications);
}

export function saveLocalNotifications(list: NotificationItem[]): NotificationItem[] {
  return safeSetStorage(STORAGE_KEYS.NOTIFICATIONS, list, 'notifications');
}

export function addLocalNotification(notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>): NotificationItem {
  const notifications = getLocalNotifications();
  const newNotif: NotificationItem = {
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', Today',
    read: false
  };
  const updated = [newNotif, ...notifications];
  safeSetStorage(STORAGE_KEYS.NOTIFICATIONS, updated, 'notifications');
  return newNotif;
}

export function markNotificationAsRead(id: string): void {
  const notifications = getLocalNotifications().map(n => n.id === id ? { ...n, read: true } : n);
  safeSetStorage(STORAGE_KEYS.NOTIFICATIONS, notifications, 'notifications');
}

export function markAllNotificationsAsRead(): void {
  const notifications = getLocalNotifications().map(n => ({ ...n, read: true }));
  safeSetStorage(STORAGE_KEYS.NOTIFICATIONS, notifications, 'notifications');
}

export function deleteNotification(id: string): void {
  const notifications = getLocalNotifications().filter(n => n.id !== id);
  safeSetStorage(STORAGE_KEYS.NOTIFICATIONS, notifications, 'notifications');
}

// ============================================================================
// DELIVERY LOGS API
// ============================================================================

export function getLocalDeliveryLogs(): NotificationDeliveryLog[] {
  return safeGetStorage<NotificationDeliveryLog[]>(STORAGE_KEYS.DELIVERY_LOGS, initialNotificationLogs);
}

export function saveLocalDeliveryLogs(list: NotificationDeliveryLog[]): NotificationDeliveryLog[] {
  return safeSetStorage(STORAGE_KEYS.DELIVERY_LOGS, list, 'delivery_logs');
}

export function addLocalDeliveryLog(log: NotificationDeliveryLog): NotificationDeliveryLog {
  const logs = getLocalDeliveryLogs();
  const updated = [log, ...logs];
  safeSetStorage(STORAGE_KEYS.DELIVERY_LOGS, updated, 'delivery_logs');
  return log;
}

export function deleteDeliveryLog(id: string): void {
  const logs = getLocalDeliveryLogs().filter(l => l.id !== id);
  safeSetStorage(STORAGE_KEYS.DELIVERY_LOGS, logs, 'delivery_logs');
}

export function clearAllDeliveryLogs(): void {
  safeSetStorage(STORAGE_KEYS.DELIVERY_LOGS, [], 'delivery_logs');
}

// ============================================================================
// ANNOUNCEMENTS API
// ============================================================================

export function getLocalAnnouncements(): Announcement[] {
  return safeGetStorage<Announcement[]>(STORAGE_KEYS.ANNOUNCEMENTS, initialAnnouncements);
}

export function saveLocalAnnouncements(list: Announcement[]): Announcement[] {
  return safeSetStorage(STORAGE_KEYS.ANNOUNCEMENTS, list, 'announcements');
}

export function saveLocalAnnouncement(announcement: Announcement): Announcement {
  const list = getLocalAnnouncements();
  const index = list.findIndex(a => a.id === announcement.id);
  let updated: Announcement[];
  if (index >= 0) {
    updated = [...list];
    updated[index] = announcement;
  } else {
    updated = [announcement, ...list];
  }
  safeSetStorage(STORAGE_KEYS.ANNOUNCEMENTS, updated, 'announcements');

  // Broadcast to in-app notifications
  addLocalNotification({
    title: `📢 ${announcement.title}`,
    message: announcement.content,
    type: 'info'
  });

  return announcement;
}

export function deleteLocalAnnouncement(id: string): void {
  const list = getLocalAnnouncements().filter(a => a.id !== id);
  safeSetStorage(STORAGE_KEYS.ANNOUNCEMENTS, list, 'announcements');
}

// ============================================================================
// DOCUMENTS API
// ============================================================================

export function getLocalDocuments(): DocumentItem[] {
  return safeGetStorage<DocumentItem[]>(STORAGE_KEYS.DOCUMENTS, initialDocuments);
}

export function saveLocalDocuments(list: DocumentItem[]): DocumentItem[] {
  return safeSetStorage(STORAGE_KEYS.DOCUMENTS, list, 'documents');
}

export function saveLocalDocument(doc: DocumentItem): DocumentItem {
  const docs = getLocalDocuments();
  const index = docs.findIndex(d => d.id === doc.id);
  let updated: DocumentItem[];
  if (index >= 0) {
    updated = [...docs];
    updated[index] = doc;
  } else {
    updated = [doc, ...docs];
  }
  safeSetStorage(STORAGE_KEYS.DOCUMENTS, updated, 'documents');
  return doc;
}

export function deleteLocalDocument(id: string): void {
  const docs = getLocalDocuments().filter(d => d.id !== id);
  safeSetStorage(STORAGE_KEYS.DOCUMENTS, docs, 'documents');
}

// ============================================================================
// EVENTS API
// ============================================================================

export function getLocalEvents(): EventItem[] {
  return safeGetStorage<EventItem[]>(STORAGE_KEYS.EVENTS, initialEvents);
}

export function saveLocalEvents(list: EventItem[]): EventItem[] {
  return safeSetStorage(STORAGE_KEYS.EVENTS, list, 'events');
}

export function saveLocalEvent(event: EventItem): EventItem {
  const events = getLocalEvents();
  const index = events.findIndex(e => e.id === event.id);
  let updated: EventItem[];
  if (index >= 0) {
    updated = [...events];
    updated[index] = event;
  } else {
    updated = [event, ...events];
  }
  safeSetStorage(STORAGE_KEYS.EVENTS, updated, 'events');
  return event;
}

export function deleteLocalEvent(id: string): void {
  const events = getLocalEvents().filter(e => e.id !== id);
  safeSetStorage(STORAGE_KEYS.EVENTS, events, 'events');
}

// ============================================================================
// AUDIT LOGS API
// ============================================================================

export function getLocalAuditLogs(): AuditLog[] {
  return safeGetStorage<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, initialAuditLogs);
}

export function saveLocalAuditLogs(list: AuditLog[]): AuditLog[] {
  return safeSetStorage(STORAGE_KEYS.AUDIT_LOGS, list, 'audit_logs');
}

export function addLocalAuditLog(actorName: string, actorRole: string, action: string, details: string): AuditLog {
  const logs = getLocalAuditLogs();
  const newLog: AuditLog = {
    id: `audit-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    actorName,
    actorRole,
    action,
    details,
    ipAddress: '127.0.0.1 (Local System)'
  };
  const updated = [newLog, ...logs];
  safeSetStorage(STORAGE_KEYS.AUDIT_LOGS, updated, 'audit_logs');
  return newLog;
}

// ============================================================================
// CMS FILES API
// ============================================================================

export function getLocalCMSFiles(): CMSFile[] {
  return safeGetStorage<CMSFile[]>(STORAGE_KEYS.CMS_FILES, initialCMSFiles);
}

export function saveLocalCMSFiles(filesList: CMSFile[]): CMSFile[] {
  if (!Array.isArray(filesList)) return getLocalCMSFiles();
  return safeSetStorage(STORAGE_KEYS.CMS_FILES, filesList, 'cms_files');
}

export function saveLocalCMSFile(file: CMSFile): CMSFile {
  const files = getLocalCMSFiles();
  const updated = [file, ...files];
  safeSetStorage(STORAGE_KEYS.CMS_FILES, updated, 'cms_files');
  return file;
}

export function deleteLocalCMSFile(id: string): void {
  const files = getLocalCMSFiles().filter(f => f.id !== id);
  safeSetStorage(STORAGE_KEYS.CMS_FILES, files, 'cms_files');
}

// ============================================================================
// EXECUTIVES, NEWS, GALLERY, CONTACT MESSAGES, RENEWALS
// ============================================================================

export function getLocalExecutives(): Executive[] {
  return safeGetStorage<Executive[]>(STORAGE_KEYS.EXECUTIVES, initialExecutives);
}

export function saveLocalExecutives(list: Executive[]): Executive[] {
  return safeSetStorage(STORAGE_KEYS.EXECUTIVES, list, 'executives');
}

export function getLocalNews(): NewsArticle[] {
  return safeGetStorage<NewsArticle[]>(STORAGE_KEYS.NEWS, initialNews);
}

export function saveLocalNews(list: NewsArticle[]): NewsArticle[] {
  return safeSetStorage(STORAGE_KEYS.NEWS, list, 'news');
}

export function getLocalGallery(): GalleryAlbum[] {
  return safeGetStorage<GalleryAlbum[]>(STORAGE_KEYS.GALLERY, initialGallery);
}

export function saveLocalGallery(list: GalleryAlbum[]): GalleryAlbum[] {
  return safeSetStorage(STORAGE_KEYS.GALLERY, list, 'gallery');
}

export function getLocalContactMessages(): ContactMessage[] {
  return safeGetStorage<ContactMessage[]>(STORAGE_KEYS.CONTACT_MESSAGES, initialContactMessages);
}

export function saveLocalContactMessages(list: ContactMessage[]): ContactMessage[] {
  return safeSetStorage(STORAGE_KEYS.CONTACT_MESSAGES, list, 'contact_messages');
}

export function getLocalRenewals(): RenewalRequest[] {
  return safeGetStorage<RenewalRequest[]>(STORAGE_KEYS.RENEWALS, initialRenewalRequests);
}

export function saveLocalRenewals(list: RenewalRequest[]): RenewalRequest[] {
  return safeSetStorage(STORAGE_KEYS.RENEWALS, list, 'renewals');
}
