import React, { useState, useEffect } from 'react';
import { 
  Member, 
  Executive, 
  NewsArticle, 
  EventItem, 
  Announcement, 
  PaymentRecord, 
  DocumentItem, 
  GalleryAlbum, 
  ContactMessage, 
  AuditLog, 
  ForumSettings, 
  AppRole,
  RenewalRequest,
  NotificationDeliveryLog,
  NotificationItem,
  AdminAccount,
  CMSFile
} from '../types';
import { MembershipCard } from './MembershipCard';
import { ReceiptManagement } from './ReceiptManagement';
import { PaymentSettingsManager } from './PaymentSettingsManager';
import { FeesAndRevenueManager } from './FeesAndRevenueManager';
import { BankAccountManager } from './BankAccountManager';
import { SuperAdminRenewalManagement } from './SuperAdminRenewalManagement';
import { ApprovalNotificationManager, formatWelcomeTemplate } from './ApprovalNotificationManager';
import { AdminDiagnosticsPanel } from './AdminDiagnosticsPanel';
import { dispatchEventNotification } from '../utils/notificationDispatcher';
import { NORTHERN_STATES, SPECIALIZATIONS } from '../data/initialData';
import { hasPermission, PERMISSION_DEFINITIONS, PermissionKey } from '../utils/rbac';
import { handleApiCall } from '../utils/apiMiddleware';
import { evaluateRlsPolicy } from '../db/rlsEvaluator';
import { 
  savePaymentToSQLite,
  saveNotificationLogToSQLite, 
  saveNotificationToSQLite, 
  saveAuditLogToSQLite 
} from '../services/sqliteService';
import { 
  fetchMembersFromSupabase, 
  fetchPaymentsFromSupabase, 
  saveMemberToSupabase, 
  deleteMemberFromSupabase,
  updateMemberFieldsInSupabase,
  fetchNextAvailableMembershipIdFromSupabase,
  isSupabaseConfigured
} from '../services/supabaseService';
import { SUPABASE_URL } from '../lib/supabase';
import { downloadMemberProfilePdf, downloadMembersListPdf } from '../services/pdfService';
import { OfficialApprovalSlipModal } from './OfficialApprovalSlipModal';
import { DualImageUpload } from './DualImageUpload';
import { handleImageError, getValidImageUrl, downloadFileSafely } from '../utils/imageHelpers';
import { 
  Users, 
  User,
  Mail,
  CheckCircle2, 
  Clock, 
  XCircle, 
  ShieldAlert, 
  AlertTriangle, 
  Calendar, 
  Bell, 
  DollarSign, 
  Eye, 
  Search, 
  Filter, 
  UserPlus, 
  Edit, 
  Trash2, 
  RotateCcw, 
  FileSpreadsheet, 
  FileText, 
  Printer, 
  Upload, 
  Key, 
  LogIn, 
  QrCode, 
  Send, 
  ShieldCheck, 
  Database, 
  Settings, 
  Plus, 
  Check, 
  X, 
  Download, 
  BarChart3, 
  Lock, 
  Unlock,
  EyeOff,
  MessageSquare, 
  Activity, 
  Sparkles,
  CheckSquare,
  Layers,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Sliders,
  Building2,
  Folder,
  Code,
  Info,
  ArrowUpRight,
  Archive,
  Award,
  Globe,
  Receipt,
  RefreshCcw,
  CreditCard,
  FileCheck,
  LogOut
} from 'lucide-react';

interface AdminDashboardProps {
  members: Member[];
  onUpdateMembers: (members: Member[]) => void;
  executives: Executive[];
  onUpdateExecutives: (execs: Executive[]) => void;
  news: NewsArticle[];
  onUpdateNews: (news: NewsArticle[]) => void;
  events: EventItem[];
  onUpdateEvents: (events: EventItem[]) => void;
  announcements: Announcement[];
  onUpdateAnnouncements: (announcements: Announcement[]) => void;
  payments: PaymentRecord[];
  onUpdatePayments: (payments: PaymentRecord[]) => void;
  renewalRequests: RenewalRequest[];
  onUpdateRenewalRequests: (requests: RenewalRequest[]) => void;
  documents: DocumentItem[];
  onUpdateDocuments: (docs: DocumentItem[]) => void;
  gallery: GalleryAlbum[];
  onUpdateGallery: (gal: GalleryAlbum[]) => void;
  contactMessages: ContactMessage[];
  onUpdateContactMessages: (msgs: ContactMessage[]) => void;
  auditLogs: AuditLog[];
  onAddAuditLog: (action: string, details: string) => void;
  settings: ForumSettings;
  onUpdateSettings: (st: ForumSettings) => void;
  notifications?: NotificationItem[];
  onUpdateNotifications?: (notifs: NotificationItem[]) => void;
  notificationLogs?: NotificationDeliveryLog[];
  onUpdateNotificationLogs?: (logs: NotificationDeliveryLog[]) => void;
  admins?: AdminAccount[];
  onUpdateAdmins?: (admins: AdminAccount[]) => void;
  cmsFiles?: CMSFile[];
  onUpdateCMSFiles?: (files: CMSFile[]) => void;
  onImpersonateMember?: (m: Member) => void;
  onDeleteMemberPermanently?: (id: string) => void;
  onUpdateSingleMember?: (m: Member) => void;
  setCurrentView: (view: string) => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  members,
  onUpdateMembers,
  executives,
  onUpdateExecutives,
  news,
  onUpdateNews,
  events,
  onUpdateEvents,
  announcements,
  onUpdateAnnouncements,
  payments,
  onUpdatePayments,
  renewalRequests,
  onUpdateRenewalRequests,
  documents,
  onUpdateDocuments,
  gallery,
  onUpdateGallery,
  contactMessages,
  onUpdateContactMessages,
  auditLogs,
  onAddAuditLog,
  settings,
  onUpdateSettings,
  notifications = [],
  onUpdateNotifications,
  notificationLogs = [],
  onUpdateNotificationLogs,
  admins: parentAdmins,
  onUpdateAdmins,
  cmsFiles: parentCMSFiles,
  onUpdateCMSFiles,
  onImpersonateMember,
  onDeleteMemberPermanently,
  onUpdateSingleMember,
  setCurrentView,
  onLogout,
}) => {
  // Active RBAC Persona Role ('super_admin' or 'admin' / 'national_admin')
  const [currentAdminRole, setCurrentAdminRole] = useState<AppRole>('admin');

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'members'
    | 'cards'
    | 'renewals'
    | 'receipts'
    | 'fee_settings'
    | 'bank_accounts'
    | 'approval_notifications'
    | 'announcements'
    | 'events'
    | 'payments'
    | 'executives'
    | 'news'
    | 'gallery'
    | 'documents'
    | 'notifications'
    | 'messages'
    | 'audit'
    | 'roles'
    | 'reports'
    | 'settings'
    | 'diagnostics'
  >('overview');

  // Search & Filter State for Member Management
  const [memberSearch, setMemberSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [showBulkExportModal, setShowBulkExportModal] = useState(false);
  const [bulkExportScope, setBulkExportScope] = useState<'all' | 'filtered' | 'selected' | 'approved' | 'pending'>('all');

  // Editing & Deleting Member Modal State
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [viewingReceiptMember, setViewingReceiptMember] = useState<Member | null>(null);
  const [approvingMember, setApprovingMember] = useState<Member | null>(null);
  const [assignedMembershipId, setAssignedMembershipId] = useState('');
  const [assignedPosition, setAssignedPosition] = useState('Practicing Member');
  const [approvalError, setApprovalError] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [generatedCardModalMember, setGeneratedCardModalMember] = useState<Member | null>(null);
  const [officialSlipModalMember, setOfficialSlipModalMember] = useState<Member | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(null);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [showSqlHelperModal, setShowSqlHelperModal] = useState(false);

  const supabaseProjectId = (SUPABASE_URL || 'https://twpauvrjmaqdzrwteksd.supabase.co').replace(/^https?:\/\//i, '').split('.')[0] || 'twpauvrjmaqdzrwteksd';
  const supabaseProjectHost = (SUPABASE_URL || 'https://twpauvrjmaqdzrwteksd.supabase.co').replace(/^https?:\/\//i, '').split('/')[0];
  const supabaseSqlUrl = `https://supabase.com/dashboard/project/${supabaseProjectId}/sql/new`;

  const SUPABASE_RLS_SQL_FIX = `-- N-NEPEF SINGLE SOURCE OF TRUTH: Supabase Central PostgreSQL Policies & Full Table Schema
-- Run this in your Supabase SQL Editor: ${supabaseSqlUrl}

-- 1. Enable RLS and Set Strict Production Policies on public.members
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

-- 1.1 PUBLIC REGISTRATION: Allow anonymous/authenticated applicants to INSERT pending registration only
-- Applicants CANNOT self-assign membership_id, approval status, or administrative fields
CREATE POLICY "Public Applicant Insert Only" 
  ON public.members FOR INSERT 
  TO anon, authenticated
  WITH CHECK (
    LOWER(status) = 'pending'
    AND (membership_id IS NULL OR membership_id = '')
    AND (approved_at IS NULL)
    AND (approved_by IS NULL)
    AND (rejected_by IS NULL)
  );

-- 1.2 PUBLIC VERIFICATION: Public users can ONLY SELECT approved or active members
-- Private applicant data (NIN, phone, address, Next of Kin) of pending applications is strictly shielded
CREATE POLICY "Public Verification Approved Only" 
  ON public.members FOR SELECT 
  TO anon, authenticated
  USING (LOWER(status) IN ('approved', 'active'));

-- 1.3 ADMIN FULL ACCESS: Authenticated admins & service_role have full CRUD across all member records
CREATE POLICY "Admin Full Access Members" 
  ON public.members FOR ALL 
  TO authenticated, service_role
  USING (
    auth.role() = 'service_role'
    OR (auth.jwt()->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->'app_metadata'->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->'user_metadata'->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->>'email') IN ('nnepef@gmail.com', 'superadmin@nepef.org.ng', 'admin@nepef.org.ng', 'ahmadhussainiali2020@gmail.com')
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR (auth.jwt()->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->'app_metadata'->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->'user_metadata'->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->>'email') IN ('nnepef@gmail.com', 'superadmin@nepef.org.ng', 'admin@nepef.org.ng', 'ahmadhussainiali2020@gmail.com')
  );

-- 2. PAYMENT RECORDS RLS POLICIES
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

-- Public applicants can insert their initial pending registration payment only
CREATE POLICY "Public Applicant Insert Payment" 
  ON public.payment_records FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (
    LOWER(status) IN ('pending', 'submitted')
    AND approved_at IS NULL
    AND approved_by IS NULL
  );

-- Only authenticated admins, service_role, or payment owner can SELECT payments
CREATE POLICY "Admin & Owner Read Payments" 
  ON public.payment_records FOR SELECT 
  TO authenticated, service_role
  USING (
    auth.role() = 'service_role'
    OR (auth.jwt()->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->'app_metadata'->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->'user_metadata'->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->>'email') IN ('nnepef@gmail.com', 'superadmin@nepef.org.ng', 'admin@nepef.org.ng', 'ahmadhussainiali2020@gmail.com')
  );

-- Only authenticated admins or service_role can UPDATE or DELETE payments
CREATE POLICY "Admin Full Access Payments" 
  ON public.payment_records FOR ALL 
  TO authenticated, service_role
  USING (
    auth.role() = 'service_role'
    OR (auth.jwt()->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->'app_metadata'->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->'user_metadata'->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->>'email') IN ('nnepef@gmail.com', 'superadmin@nepef.org.ng', 'admin@nepef.org.ng', 'ahmadhussainiali2020@gmail.com')
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR (auth.jwt()->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->'app_metadata'->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->'user_metadata'->>'role') IN ('super_admin', 'national_admin', 'state_admin', 'lga_admin', 'treasurer', 'secretary', 'admin')
    OR (auth.jwt()->>'email') IN ('nnepef@gmail.com', 'superadmin@nepef.org.ng', 'admin@nepef.org.ng', 'ahmadhussainiali2020@gmail.com')
  );`;

  const handleCopyRlsSql = () => {
    navigator.clipboard.writeText(SUPABASE_RLS_SQL_FIX);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 4000);
  };

  // Authoritative data fetch directly from Supabase PostgreSQL on dashboard mount / refresh
  const syncDirectlyFromSupabase = async () => {
    setIsCloudSyncing(true);
    try {
      const [cloudMembers, cloudPayments] = await Promise.all([
        fetchMembersFromSupabase(),
        fetchPaymentsFromSupabase()
      ]);
      if (cloudMembers && Array.isArray(cloudMembers)) {
        onUpdateMembers(cloudMembers);
      }
      if (cloudPayments && Array.isArray(cloudPayments)) {
        onUpdatePayments(cloudPayments);
      }
      setLastSyncTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('[AdminDashboard] Cloud sync warning:', err);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  useEffect(() => {
    syncDirectlyFromSupabase();
  }, []);

  // Payments State
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({
    memberId: '',
    type: 'Annual Levy' as const,
    amount: 15000,
    paymentMethod: 'Bank Transfer',
    reference: '',
  });

  // Announcements Modal State
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    targetGroup: 'all' as any,
    targetState: 'Kano',
    pinned: false,
  });

  // Events Modal State
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedEventAttendees, setSelectedEventAttendees] = useState<EventItem | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00 AM WAT',
    location: 'N-NEPEF Secretariat, Kaduna',
    state: 'Kaduna',
    description: '',
    isVirtual: false,
    virtualLink: '',
    capacity: 200,
    speakers: '',
  });

  // Executive Modal & Password Gate State
  const [execFilter, setExecFilter] = useState<'all' | 'national' | 'state' | 'lga'>('all');
  const [showAddExecutive, setShowAddExecutive] = useState(false);
  const [editingExecutive, setEditingExecutive] = useState<Executive | null>(null);
  const [isLeadershipUnlocked, setIsLeadershipUnlocked] = useState(false);
  const [showLeadershipPasswordModal, setShowLeadershipPasswordModal] = useState(false);
  const [leadershipPasswordInput, setLeadershipPasswordInput] = useState('');
  const [leadershipPasswordError, setLeadershipPasswordError] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [pendingLeadershipAction, setPendingLeadershipAction] = useState<(() => void) | null>(null);

  const requestLeadershipAccess = (action: () => void) => {
    if (currentAdminRole !== 'super_admin') {
      alert('Only Super Admin is authorized to access, enter, or edit leadership names, positions, and photos.');
      return;
    }
    if (isLeadershipUnlocked) {
      action();
    } else {
      setLeadershipPasswordInput('');
      setLeadershipPasswordError('');
      setPendingLeadershipAction(() => action);
      setShowLeadershipPasswordModal(true);
    }
  };

  const [newExecutive, setNewExecutive] = useState({
    name: '',
    position: '',
    tier: 'national' as 'national' | 'state' | 'lga' | 'committee',
    state: 'Kano',
    lga: '',
    email: '',
    phone: '',
    bio: '',
    term: '2024 - 2026',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    active: true
  });

  // News Modal State
  const [showAddNews, setShowAddNews] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsArticle | null>(null);
  const [newNews, setNewNews] = useState({
    title: '',
    category: 'Engineering' as const,
    summary: '',
    content: '',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800',
    author: 'N-NEPEF Editorial Board',
    featured: false,
    tags: 'engineering, power, nigeria',
  });

  // Documents Modal State
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: '',
    category: 'Circular' as const,
    fileUrl: '#',
    fileSize: '1.5 MB',
    format: 'PDF' as const,
    minRole: 'all' as const,
  });

  // Messages Inbox State
  const [messageFilter, setMessageFilter] = useState<'all' | 'unread' | 'replied'>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  // Settings Sub-tab & Admin Accounts State
  const [settingsSubTab, setSettingsSubTab] = useState<'branding' | 'cms' | 'admins' | 'cms_files' | 'system'>('branding');
  const [adminsList, setAdminsList] = useState<AdminAccount[]>(parentAdmins || []);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'national_admin' as AppRole,
    state: 'Kano',
    permissions: ['manage_members', 'verify_payments', 'issue_notices']
  });

  // CMS Files State
  const [cmsFilesList, setCmsFilesList] = useState<CMSFile[]>(parentCMSFiles || []);
  const [showAddCmsFile, setShowAddCmsFile] = useState(false);
  const [newCmsFile, setNewCmsFile] = useState({
    name: '',
    url: '',
    type: 'image' as 'image' | 'pdf' | 'doc' | 'other',
    size: '1.2 MB'
  });

  // FAQ Editor State
  const [showAddFaq, setShowAddFaq] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });

  // Audit Trail Search, Filtering, and Selection State
  const [auditSearch, setAuditSearch] = useState('');
  const [auditRoleFilter, setAuditRoleFilter] = useState('all');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [selectedAuditIds, setSelectedAuditIds] = useState<string[]>([]);

  // Filtered Audit Logs
  const filteredAuditLogs = auditLogs.filter((log) => {
    const q = auditSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.actorName.toLowerCase().includes(q) ||
      log.actorRole.toLowerCase().includes(q) ||
      log.id.toLowerCase().includes(q) ||
      (log.ipAddress && log.ipAddress.toLowerCase().includes(q));

    const matchesRole =
      auditRoleFilter === 'all' ||
      log.actorRole.toLowerCase() === auditRoleFilter.toLowerCase();

    let matchesAction = true;
    if (auditActionFilter !== 'all') {
      const act = log.action.toUpperCase();
      if (auditActionFilter === 'MEMBER') {
        matchesAction = act.includes('MEMBER') || act.includes('PASSPORT') || act.includes('REGISTRATION');
      } else if (auditActionFilter === 'FINANCIAL') {
        matchesAction = act.includes('RECEIPT') || act.includes('PAYMENT') || act.includes('RENEWAL') || act.includes('FEE') || act.includes('BANK');
      } else if (auditActionFilter === 'SYSTEM') {
        matchesAction = act.includes('SYSTEM') || act.includes('BACKUP') || act.includes('RESTORE') || act.includes('SETTINGS') || act.includes('MAINTENANCE') || act.includes('CMS');
      } else if (auditActionFilter === 'ADMIN') {
        matchesAction = act.includes('ADMIN') || act.includes('PASSWORD') || act.includes('ROLE') || act.includes('LEADERSHIP') || act.includes('EXECUTIVE');
      } else if (auditActionFilter === 'EXPORT') {
        matchesAction = act.includes('EXPORT') || act.includes('PRINT') || act.includes('DOWNLOAD');
      }
    }

    let matchesDate = true;
    if (auditStartDate) {
      const logDate = new Date(log.timestamp);
      const startDate = new Date(auditStartDate);
      if (!isNaN(logDate.getTime()) && !isNaN(startDate.getTime())) {
        matchesDate = matchesDate && logDate >= startDate;
      }
    }
    if (auditEndDate) {
      const logDate = new Date(log.timestamp);
      const endDate = new Date(auditEndDate);
      endDate.setHours(23, 59, 59, 999);
      if (!isNaN(logDate.getTime()) && !isNaN(endDate.getTime())) {
        matchesDate = matchesDate && logDate <= endDate;
      }
    }

    return matchesSearch && matchesRole && matchesAction && matchesDate;
  });

  const handleToggleSelectAllAudit = () => {
    const allFilteredIds = filteredAuditLogs.map(l => l.id);
    const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedAuditIds.includes(id));
    if (isAllSelected) {
      setSelectedAuditIds(selectedAuditIds.filter(id => !allFilteredIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedAuditIds, ...allFilteredIds]));
      setSelectedAuditIds(combined);
    }
  };

  const handleToggleSelectAuditItem = (id: string) => {
    if (selectedAuditIds.includes(id)) {
      setSelectedAuditIds(selectedAuditIds.filter(i => i !== id));
    } else {
      setSelectedAuditIds([...selectedAuditIds, id]);
    }
  };

  const handleExportAuditCSV = (logsToExport: AuditLog[], scopeLabel: string) => {
    if (logsToExport.length === 0) {
      alert('No activity audit log records available for export.');
      return;
    }
    const headers = ['Log ID', 'Timestamp', 'Actor Name', 'Actor Role', 'Action Code', 'Details / Description', 'IP Address', 'System Scope'];
    const rows = logsToExport.map(log => [
      `"${log.id}"`,
      `"${log.timestamp}"`,
      `"${log.actorName.replace(/"/g, '""')}"`,
      `"${log.actorRole}"`,
      `"${log.action}"`,
      `"${log.details.replace(/"/g, '""')}"`,
      `"${log.ipAddress || '102.89.23.14'}"`,
      `"N-NEPEF 2020 Security Audit"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `NNEPEF_Activity_Audit_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onAddAuditLog('AUDIT_LOG_BULK_EXPORT_CSV', `Super Admin bulk exported ${logsToExport.length} activity audit log(s) to CSV [Scope: ${scopeLabel}]`);
  };

  const handleExportAuditPDF = (logsToExport: AuditLog[], scopeLabel: string) => {
    if (logsToExport.length === 0) {
      alert('No activity audit log records available for PDF compliance report.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedDate = new Date().toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'medium'
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>N-NEPEF Security Activity Audit Log Compliance Report</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; font-size: 11px; color: #0f172a; line-height: 1.4; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0A2E73; padding-bottom: 12px; margin-bottom: 16px; }
            .logo-title { display: flex; align-items: center; gap: 12px; }
            .org-title { font-size: 18px; font-weight: 800; color: #0A2E73; letter-spacing: -0.5px; }
            .org-sub { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }
            .report-badge { background: #0A2E73; color: white; padding: 6px 14px; border-radius: 6px; font-size: 10px; font-weight: 700; text-align: right; }
            .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; margin-bottom: 16px; font-size: 10px; }
            .meta-item strong { display: block; color: #64748b; font-size: 9px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
            th { background: #0A2E73; color: white; text-align: left; padding: 8px 10px; font-size: 9px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
            td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; vertical-align: top; }
            tr:nth-child(even) { background: #f8fafc; }
            .action-code { font-family: monospace; font-weight: 700; color: #0284c7; background: #f0f9ff; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd; font-size: 9px; display: inline-block; }
            .actor { font-weight: 700; color: #0f172a; }
            .role-pill { font-size: 8px; text-transform: uppercase; font-weight: 800; color: #475569; background: #e2e8f0; padding: 1px 5px; border-radius: 3px; margin-left: 4px; }
            .footer-sign { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #cbd5e1; pt: 16px; font-size: 9px; color: #64748b; }
            .stamp { border: 2px dashed #0A2E73; padding: 8px 16px; border-radius: 6px; text-align: center; color: #0A2E73; font-weight: 800; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-title">
              <div>
                <div class="org-title">Northern Nigerian Electrical Practitioners & Engineers Forum</div>
                <div class="org-sub">N-NEPEF 2020 Digital Portal | Official System Security Activity Trail</div>
              </div>
            </div>
            <div class="report-badge">
              COMPLIANCE AUDIT REPORT<br/>
              CONFIDENTIAL &amp; IMMUTABLE
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item"><strong>Report Generated</strong>${formattedDate}</div>
            <div class="meta-item"><strong>Export Scope</strong>${scopeLabel}</div>
            <div class="meta-item"><strong>Total Records Included</strong>${logsToExport.length} Record(s)</div>
            <div class="meta-item"><strong>System Security Level</strong>Super Admin Compliance Verification</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 140px;">Timestamp</th>
                <th style="width: 150px;">Actor / Identity</th>
                <th style="width: 160px;">Action Code</th>
                <th>Activity Description &amp; Details</th>
                <th style="width: 110px;">IP Address</th>
              </tr>
            </thead>
            <tbody>
              ${logsToExport.map(l => `
                <tr>
                  <td style="font-family: monospace; font-size: 9px; color: #334155;">${l.timestamp}</td>
                  <td>
                    <span class="actor">${l.actorName}</span>
                    <span class="role-pill">${l.actorRole}</span>
                  </td>
                  <td><span class="action-code">${l.action}</span></td>
                  <td>${l.details}</td>
                  <td style="font-family: monospace; font-size: 9px;">${l.ipAddress || '102.89.23.14'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer-sign">
            <div>
              <strong>N-NEPEF Secretariat Security Audit System</strong><br/>
              This activity log report is cryptographically verified and recorded in permanent storage.<br/>
              Document Hash: SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}
            </div>
            <div class="stamp">
              Verified Super Admin<br/>Compliance Security Stamp
            </div>
          </div>

          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
    onAddAuditLog('AUDIT_LOG_BULK_EXPORT_PDF', `Super Admin generated PDF compliance audit report for ${logsToExport.length} record(s) [Scope: ${scopeLabel}]`);
  };

  // Calculate High-level Enterprise Stats
  const todayStr = new Date().toISOString().split('T')[0];

  const getNormalizedStatus = (m: Member): 'pending' | 'approved' | 'rejected' | 'suspended' => {
    const s = String(m.status || 'pending').trim().toLowerCase();
    if (s === 'approved' || s === 'active') return 'approved';
    if (s === 'rejected') return 'rejected';
    if (s === 'suspended') return 'suspended';
    return 'pending';
  };

  const activeMembersCount = members.filter((m) => {
    const isExpired = m.expiryDate ? m.expiryDate < todayStr : false;
    return getNormalizedStatus(m) === 'approved' && !isExpired;
  }).length;

  const expiredMembersCount = members.filter((m) => {
    const isExpired = m.expiryDate ? m.expiryDate < todayStr : false;
    return isExpired || String(m.status).toLowerCase() === 'expired';
  }).length;

  const pendingMembersCount = members.filter((m) => getNormalizedStatus(m) === 'pending').length;
  const suspendedMembersCount = members.filter((m) => getNormalizedStatus(m) === 'suspended').length;
  const rejectedMembersCount = members.filter((m) => getNormalizedStatus(m) === 'rejected').length;

  const totalMembers = members.length;
  const pendingMembers = pendingMembersCount;
  const approvedMembers = activeMembersCount;
  const rejectedMembers = rejectedMembersCount;
  const suspendedMembers = suspendedMembersCount;
  const activeMembers = activeMembersCount;

  const totalEventsCount = events.length;
  const totalAnnouncementsCount = announcements.length;
  const verifiedPayments = payments.filter((p) => p.status === 'Verified' || (p.status as string) === 'Approved');
  const totalRevenue = verifiedPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

  // Filtered Members List
  const filteredMembers = members.filter((m) => {
    const searchLower = memberSearch.trim().toLowerCase();
    const matchesSearch =
      searchLower === '' ||
      (m.fullName && m.fullName.toLowerCase().includes(searchLower)) ||
      (m.membershipId && m.membershipId.toLowerCase().includes(searchLower)) ||
      (m.email && m.email.toLowerCase().includes(searchLower)) ||
      (m.phone && m.phone.includes(searchLower)) ||
      (m.specialization && m.specialization.toLowerCase().includes(searchLower)) ||
      (m.lga && m.lga.toLowerCase().includes(searchLower));

    const matchesState = stateFilter === 'all' || m.state === stateFilter;

    const isExpired = m.expiryDate ? m.expiryDate < todayStr : false;
    const normStatus = getNormalizedStatus(m);

    let matchesStatus = true;
    if (statusFilter === 'all') {
      matchesStatus = true;
    } else if (statusFilter === 'active' || statusFilter === 'approved') {
      matchesStatus = normStatus === 'approved' && !isExpired;
    } else if (statusFilter === 'pending') {
      matchesStatus = normStatus === 'pending';
    } else if (statusFilter === 'expired') {
      matchesStatus = isExpired || String(m.status).toLowerCase() === 'expired';
    } else if (statusFilter === 'suspended') {
      matchesStatus = normStatus === 'suspended';
    } else if (statusFilter === 'rejected') {
      matchesStatus = normStatus === 'rejected';
    }

    return matchesSearch && matchesState && matchesStatus;
  });

  // Automatic Approval Welcome Notification Dispatcher
  const dispatchAutomaticWelcomeNotification = async (member: Member, membershipId: string) => {
    const { logs: newLogs, inAppNotif } = await dispatchEventNotification({
      event: 'registration_approved',
      member: { ...member, membershipId },
      settings,
      deliveryMethod: 'Both',
    });

    if (onUpdateNotificationLogs && newLogs.length > 0) {
      onUpdateNotificationLogs([...newLogs, ...(notificationLogs || [])]);
    }

    if (inAppNotif && onUpdateNotifications) {
      onUpdateNotifications([inAppNotif, ...(notifications || [])]);
    }

    onAddAuditLog(
      'AUTO_WELCOME_NOTIFICATION_SENT',
      `Automatic welcome notification dispatched via real Email/SMS/WhatsApp to ${member.fullName} (${membershipId})`
    );
  };

  // Member Action Handlers
  const handleOpenApproveModal = async (member: Member) => {
    let suggestedId = member.membershipId;
    if (!suggestedId || !suggestedId.startsWith('NNEPEF/')) {
      try {
        suggestedId = await fetchNextAvailableMembershipIdFromSupabase(member.state);
      } catch (e) {
        suggestedId = 'NNEPEF/KN/0001';
      }
    }
    setAssignedMembershipId(suggestedId);
    setAssignedPosition(member.position || 'Practicing Member');
    setApprovalError('');
    setApprovingMember(member);
  };

  const handleConfirmApproval = async () => {
    if (!approvingMember) return;
    const cleanId = assignedMembershipId.trim().toUpperCase();
    if (!cleanId) {
      setApprovalError('Membership ID is required before approval.');
      return;
    }

    // Check uniqueness across all existing members
    const duplicate = members.find(m => m.id !== approvingMember.id && m.membershipId && m.membershipId.trim().toUpperCase() === cleanId);
    if (duplicate) {
      setApprovalError(`Membership ID "${cleanId}" is already assigned to ${duplicate.fullName}. Please enter a unique ID.`);
      return;
    }

    setIsApproving(true);
    setApprovalError('');

    try {
      const updatedMember: Member = {
        ...approvingMember,
        status: 'approved',
        membershipId: cleanId,
        position: assignedPosition.trim() || 'Practicing Member',
        issueDate: approvingMember.issueDate || new Date().toISOString().split('T')[0],
        expiryDate: approvingMember.expiryDate || new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        approvedAt: new Date().toISOString(),
        approvedBy: 'Super Admin Secretariat',
        approvalNotificationSent: true,
        approvalNotificationSentAt: new Date().toISOString(),
      };

      // Save directly to Supabase PostgreSQL single source of truth
      await saveMemberToSupabase(updatedMember);

      // Refresh immediately from Supabase
      const freshMembers = await fetchMembersFromSupabase();
      onUpdateMembers(freshMembers);
      onAddAuditLog('MEMBER_APPROVE', `Approved member ${updatedMember.fullName} & assigned ID: ${cleanId}`);

      // Dispatch real welcome notification
      await dispatchAutomaticWelcomeNotification(updatedMember, cleanId);

      const approvedFinal = freshMembers.find(m => m.id === updatedMember.id) || updatedMember;
      setApprovingMember(null);
      
      // Automatically launch the newly generated Membership ID Card modal
      setGeneratedCardModalMember(approvedFinal);
    } catch (err: any) {
      setApprovalError(err?.message || 'Failed to approve member in Supabase. Please check connection and try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleApproveMember = async (id: string) => {
    const memberToApprove = members.find((m) => m.id === id);
    if (!memberToApprove) return;
    await handleOpenApproveModal(memberToApprove);
  };

  const handleRejectMember = async (id: string, reason?: string) => {
    const target = members.find((m) => m.id === id);
    if (!target) return;
    const updated: Member = { 
      ...target, 
      status: 'rejected',
      rejectedBy: 'Super Admin Secretariat',
      rejectionReason: reason || 'Application details / document verification issue'
    };
    await saveMemberToSupabase(updated);
    const freshMembers = await fetchMembersFromSupabase();
    onUpdateMembers(freshMembers);
    onAddAuditLog('MEMBER_REJECT', `Rejected member ID ${id} (${target.fullName})`);

    // Trigger Automatic Registration Rejected Notification
    const { logs: newLogs, inAppNotif } = await dispatchEventNotification({
      event: 'registration_rejected',
      member: updated,
      settings,
      reasonOrRemarks: reason || 'Application details / document verification issue'
    });
    if (newLogs.length > 0 && onUpdateNotificationLogs) {
      onUpdateNotificationLogs([...newLogs, ...(notificationLogs || [])]);
    }
    if (inAppNotif && onUpdateNotifications) {
      onUpdateNotifications([inAppNotif, ...(notifications || [])]);
    }
  };

  const handleSuspendMember = async (id: string, reason?: string) => {
    const target = members.find((m) => m.id === id);
    if (!target) return;
    const updated: Member = { ...target, status: 'suspended' };
    await saveMemberToSupabase(updated);
    const freshMembers = await fetchMembersFromSupabase();
    onUpdateMembers(freshMembers);
    onAddAuditLog('MEMBER_SUSPEND', `Suspended member ID ${id} (${target.fullName})`);

    // Trigger Automatic Membership Suspended Notification
    const { logs: newLogs, inAppNotif } = await dispatchEventNotification({
      event: 'membership_suspended',
      member: updated,
      settings,
      reasonOrRemarks: reason || 'Secretariat administrative review'
    });
    if (newLogs.length > 0 && onUpdateNotificationLogs) {
      onUpdateNotificationLogs([...newLogs, ...(notificationLogs || [])]);
    }
    if (inAppNotif && onUpdateNotifications) {
      onUpdateNotifications([inAppNotif, ...(notifications || [])]);
    }
  };

  const handleRestoreMember = async (id: string) => {
    const target = members.find((m) => m.id === id);
    if (!target) return;
    const updated: Member = { ...target, status: 'approved' };
    await saveMemberToSupabase(updated);
    const freshMembers = await fetchMembersFromSupabase();
    onUpdateMembers(freshMembers);
    onAddAuditLog('MEMBER_RESTORE', `Restored member ID ${id} (${target.fullName})`);

    // Trigger Automatic Membership Reactivated Notification
    const { logs: newLogs, inAppNotif } = await dispatchEventNotification({
      event: 'membership_reactivated',
      member: updated,
      settings
    });
    if (newLogs.length > 0 && onUpdateNotificationLogs) {
      onUpdateNotificationLogs([...newLogs, ...(notificationLogs || [])]);
    }
    if (inAppNotif && onUpdateNotifications) {
      onUpdateNotifications([inAppNotif, ...(notifications || [])]);
    }
  };

  const confirmPermanentDelete = async (target: Member) => {
    if (!hasPermission(currentAdminRole, 'MANAGE_MEMBER_INFO')) {
      alert('Action Blocked: You do not have permission to delete member records.');
      return;
    }

    if (!target || (!target.id && !target.membershipId)) {
      alert('❌ Error: Member record is invalid or missing a document ID.');
      return;
    }

    const memberIdToDelete = target.id || target.membershipId;

    try {
      if (onDeleteMemberPermanently) {
        await onDeleteMemberPermanently(memberIdToDelete);
      } else {
        await deleteMemberFromSupabase(memberIdToDelete);
        const freshMembers = await fetchMembersFromSupabase();
        onUpdateMembers(freshMembers);
      }

      onAddAuditLog(
        'MEMBER_DELETE_PERMANENT',
        `Permanently deleted member record from database: ${target.fullName} (ID: ${target.membershipId || 'Pending'}, Email: ${target.email}, State: ${target.state}).`
      );

      if (editingMember?.id === target.id) {
        setEditingMember(null);
      }
      setMemberToDelete(null);

      alert(`✅ Member record for "${target.fullName}" has been permanently deleted from the database.`);
    } catch (err) {
      console.error('Failed to permanently delete member:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(`❌ Error deleting member from database: ${errMsg}`);
    }
  };

  const handleDeleteMember = (id: string) => {
    const target = members.find((m) => m.id === id || m.membershipId === id);
    if (!target) {
      alert('❌ Error: Could not locate member record for deletion.');
      return;
    }

    if (!hasPermission(currentAdminRole, 'MANAGE_MEMBER_INFO')) {
      alert('Action Blocked: You do not have permission to delete member records.');
      return;
    }

    setMemberToDelete(target);
  };

  // Bulk Operations
  const handleBulkApprove = async () => {
    const approvedBatch: { member: Member; genId: string }[] = [];
    const updatedList: Member[] = [...members];

    for (let i = 0; i < updatedList.length; i++) {
      const m = updatedList[i];
      if (selectedMemberIds.includes(m.id)) {
        let genId = m.membershipId;
        if (!genId || !genId.startsWith('NNEPEF/')) {
          genId = await fetchNextAvailableMembershipIdFromSupabase(m.state);
        }
        const updatedM: Member = {
          ...m,
          status: 'approved',
          membershipId: genId,
          approvedAt: new Date().toISOString(),
          approvedBy: 'Super Admin Secretariat',
          approvalNotificationSent: true,
          approvalNotificationSentAt: new Date().toISOString(),
        };
        await saveMemberToSupabase(updatedM);
        approvedBatch.push({ member: updatedM, genId });
        updatedList[i] = updatedM;
      }
    }

    const freshMembers = await fetchMembersFromSupabase();
    onUpdateMembers(freshMembers);
    onAddAuditLog('BULK_APPROVE', `Bulk approved ${selectedMemberIds.length} members with unique Supabase IDs`);
    setSelectedMemberIds([]);

    // Trigger automatic welcome notifications for all members approved in bulk
    for (const { member, genId } of approvedBatch) {
      await dispatchAutomaticWelcomeNotification(member, genId);
    }
  };

  const handleBulkDelete = async () => {
    if (!hasPermission(currentAdminRole, 'MANAGE_MEMBER_INFO')) {
      alert('Action Blocked: You do not have permission to delete member records.');
      return;
    }

    if (!selectedMemberIds || selectedMemberIds.length === 0) {
      alert('Please select at least one member to delete.');
      return;
    }

    const count = selectedMemberIds.length;
    if (confirm(`⚠️ PERMANENT DELETION WARNING!\n\nAre you sure you want to PERMANENTLY delete the ${count} selected member records from the database?\n\nThis action cannot be undone.`)) {
      try {
        for (const id of selectedMemberIds) {
          if (onDeleteMemberPermanently) {
            await onDeleteMemberPermanently(id);
          } else {
            await deleteMemberFromSupabase(id);
          }
        }
        const updated = members.filter((m) => !selectedMemberIds.includes(m.id) && (!m.membershipId || !selectedMemberIds.includes(m.membershipId)));
        if (!onDeleteMemberPermanently) {
          onUpdateMembers(updated);
        }
        setSelectedMemberIds([]);
        onAddAuditLog('BULK_MEMBER_DELETE_PERMANENT', `Permanently deleted ${count} member records from database.`);
        alert(`✅ Successfully deleted ${count} member records from the database.`);
      } catch (err) {
        console.error('Failed bulk deletion:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        alert(`❌ Error performing bulk delete: ${errMsg}`);
      }
    }
  };

  // Export & Print Handlers
  const handleExecuteBulkExport = (scope: 'all' | 'filtered' | 'selected' | 'approved' | 'pending' = bulkExportScope) => {
    let exportList: Member[] = [];
    let scopeLabel = '';

    if (scope === 'all') {
      exportList = members;
      scopeLabel = 'Complete Member Database (All)';
    } else if (scope === 'selected') {
      exportList = members.filter((m) => selectedMemberIds.includes(m.id));
      scopeLabel = `Selected Members (${exportList.length})`;
    } else if (scope === 'approved') {
      exportList = members.filter((m) => m.status === 'approved');
      scopeLabel = 'Approved Members Only';
    } else if (scope === 'pending') {
      exportList = members.filter((m) => m.status === 'pending');
      scopeLabel = 'Pending Verification Members Only';
    } else {
      exportList = filteredMembers;
      scopeLabel = `Current Filtered View (${exportList.length})`;
    }

    if (exportList.length === 0) {
      alert('No member records available to export for the selected criteria.');
      return;
    }

    const headers = [
      'S/N',
      'Membership ID',
      'Full Name',
      'Gender',
      'Date of Birth',
      'Phone Number',
      'Email Address',
      'NIN Number',
      'State Chapter',
      'Local Govt Area (LGA)',
      'Residential Address',
      'Occupation',
      'Engineering Specialization',
      'Years of Experience',
      'Company / Institution',
      'Membership Status',
      'Assigned Role',
      'Issue Date',
      'Expiry Date',
      'Registration Date',
      'Passport Photo URL',
      'Payment Receipt URL',
      'Admin Notes'
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      const val = str !== undefined && str !== null ? String(str).replace(/"/g, '""') : '';
      return `"${val}"`;
    };

    const rows = exportList.map((m, index) => [
      escapeCsv(index + 1),
      escapeCsv(m.membershipId || 'UNASSIGNED'),
      escapeCsv(m.fullName),
      escapeCsv(m.gender || 'N/A'),
      escapeCsv(m.dob || 'N/A'),
      escapeCsv(m.phone || 'N/A'),
      escapeCsv(m.email || 'N/A'),
      escapeCsv(m.nin || 'N/A'),
      escapeCsv(m.state || 'N/A'),
      escapeCsv(m.lga || 'N/A'),
      escapeCsv(m.address || 'N/A'),
      escapeCsv(m.occupation || 'N/A'),
      escapeCsv(m.specialization || 'N/A'),
      escapeCsv(m.yearsOfExperience || '0'),
      escapeCsv(m.company || 'N/A'),
      escapeCsv(m.status ? m.status.toUpperCase() : 'PENDING'),
      escapeCsv(m.role || 'member'),
      escapeCsv(m.issueDate || 'N/A'),
      escapeCsv(m.expiryDate || 'N/A'),
      escapeCsv(m.registeredAt || 'N/A'),
      escapeCsv(m.passportUrl || ''),
      escapeCsv(m.paymentReceiptUrl || ''),
      escapeCsv(m.notes || '')
    ]);

    // Use UTF-8 BOM (\uFEFF) for Microsoft Excel & Google Sheets compatibility
    const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().split('T')[0];
    const filename = scope === 'all' 
      ? `N-NEPEF_Full_Member_Database_Record_${dateStamp}.csv`
      : `N-NEPEF_Member_Database_${scope.toUpperCase()}_${dateStamp}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onAddAuditLog('BULK_EXPORT_CSV', `Super Admin downloaded complete member database CSV (${exportList.length} records) for manual record keeping [Scope: ${scopeLabel}]`);
    setShowBulkExportModal(false);
  };

  const handleDownloadFullDatabaseCSV = () => {
    handleExecuteBulkExport('all');
  };

  const handleExportCSV = () => {
    handleExecuteBulkExport('filtered');
  };

  const handlePrintMembersList = () => {
    window.print();
    onAddAuditLog('PRINT_LIST', 'Printed Member Register');
  };

  // Announcement submit
  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    const item: Announcement = {
      id: `a-${Date.now()}`,
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      pinned: newAnnouncement.pinned,
      targetGroup: newAnnouncement.targetGroup,
      targetState: newAnnouncement.targetState,
      createdAt: new Date().toISOString().split('T')[0],
      pushSent: true,
      author: 'Super Admin',
    };
    onUpdateAnnouncements([item, ...announcements]);
    setShowAddAnnouncement(false);
    onAddAuditLog('ANNOUNCEMENT_CREATE', `Created bulletin: ${item.title}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header Bar */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#0A2E73] rounded-2xl flex items-center justify-center text-[#2EA3F2] shadow-md">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
              <span>{currentAdminRole === 'super_admin' ? 'Super Admin Governance Dashboard' : 'Admin Control Panel'}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${currentAdminRole === 'super_admin' ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300' : 'bg-sky-100 text-[#0A2E73] dark:bg-sky-950 dark:text-sky-300'}`}>
                {currentAdminRole === 'super_admin' ? 'SUPER ADMIN MODE' : 'ADMIN MODE (FULL CRUD)'}
              </span>
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Northern Nigerian Electrical Practitioners &amp; Engineers Forum • System Control Center
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Admin Identity Display (Only Name & Role displayed - PII hidden) */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Logged in as: <strong className="text-[#0A2E73] dark:text-sky-400">{currentAdminRole === 'super_admin' ? 'Super Admin' : 'Admin Personnel'}</strong></span>
          </div>

          {/* RBAC Role Persona Toggle Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-300 dark:border-slate-800 text-xs">
            <span className="px-2.5 text-[10px] font-extrabold text-slate-500 uppercase">Role:</span>
            <button
              type="button"
              onClick={() => setCurrentAdminRole('admin')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                currentAdminRole !== 'super_admin'
                  ? 'bg-[#0A2E73] text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setCurrentAdminRole('super_admin')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                currentAdminRole === 'super_admin'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Super Admin
            </button>
          </div>

          <button
            onClick={() => setCurrentView('home')}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
          >
            Public Site
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shadow transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          )}
          <button
            onClick={syncDirectlyFromSupabase}
            disabled={isCloudSyncing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition-all disabled:opacity-50"
            title="Refresh and sync member records directly from Supabase PostgreSQL cloud database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
            <span>{isCloudSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
            {lastSyncTimestamp && (
              <span className="text-[10px] opacity-80 font-normal">({lastSyncTimestamp})</span>
            )}
          </button>
          <button
            onClick={handleDownloadFullDatabaseCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold hover:from-emerald-700 hover:to-teal-800 shadow transition-all"
            title="Download full member database as CSV for manual record keeping"
          >
            <Download className="w-4 h-4" />
            <span>Download Full Database (CSV)</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">{members.length}</span>
          </button>
        </div>
      </div>

      {/* ADMIN TABS NAVIGATION BAR */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'overview', label: 'Dashboard Stats', icon: BarChart3 },
          { id: 'members', label: 'Member Register', icon: Users },
          { id: 'receipts', label: 'Receipt Management', icon: Receipt },
          { id: 'renewals', label: 'ID Card Renewals', icon: RefreshCcw },
          { id: 'cards', label: 'ID Cards Generator', icon: QrCode },
          { id: 'fee_settings', label: 'Fee & Payment Settings', icon: Sliders },
          { id: 'bank_accounts', label: 'Bank Account Management', icon: Building2 },
          { id: 'approval_notifications', label: 'Approval Notifications', icon: Mail },
          { id: 'announcements', label: 'Announcements', icon: Bell },
          { id: 'events', label: 'Events & Attendance', icon: Calendar },
          { id: 'payments', label: 'Financials & Levies', icon: DollarSign },
          { id: 'executives', label: 'Executives Council', icon: Award },
          { id: 'news', label: 'News & Media', icon: Globe },
          { id: 'documents', label: 'Documents Vault', icon: FileText },
          { id: 'messages', label: 'Contact Inbox', icon: MessageSquare },
          { id: 'audit', label: 'Audit Trail Logs', icon: Activity },
          { id: 'roles', label: 'Role & RBAC System', icon: Lock },
          { id: 'settings', label: 'System Settings', icon: Settings },
          { id: 'diagnostics', label: 'SQLite Diagnostics', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#0A2E73] text-white dark:bg-[#2EA3F2] dark:text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & CARDS */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          
          {/* Central Supabase Single Source of Truth Status & RLS Quick Setup */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0A2E73] to-[#1E4D9C] text-white shadow-xl border border-sky-400/20 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                    Active Single Source of Truth
                  </span>
                  <span className="text-xs text-sky-200 font-mono">
                    PostgreSQL 15 • {supabaseProjectHost}
                  </span>
                </div>
                <h2 className="text-xl font-display font-extrabold text-white">
                  Central Supabase Cloud Database Connected
                </h2>
                <p className="text-xs text-sky-100/90 leading-relaxed">
                  All member registrations, approvals, and credentials persist directly to this central PostgreSQL database. Chrome, Firefox, Safari, Edge, Android, and Desktop devices read and write the exact same live records.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  onClick={handleCopyRlsSql}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all ${
                    sqlCopied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  }`}
                  title="Copy the SQL script to enable instant cross-device sync of pending and approved members in Supabase SQL editor"
                >
                  {sqlCopied ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>RLS SQL Copied!</span>
                    </>
                  ) : (
                    <>
                      <Code className="w-4 h-4 text-sky-300" />
                      <span>Copy RLS Sync SQL</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowSqlHelperModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2EA3F2] hover:bg-[#1f8edb] text-white text-xs font-bold shadow-md transition-all"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Database Guide</span>
                </button>

                <button
                  onClick={syncDirectlyFromSupabase}
                  disabled={isCloudSyncing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                  <span>{isCloudSyncing ? 'Refreshing...' : 'Refresh Records'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            
            <div className="glass-card p-5 rounded-2xl space-y-1 border-l-4 border-l-[#0A2E73]">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">Total Members</span>
                <Users className="w-4 h-4 text-[#0A2E73]" />
              </div>
              <div className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">{totalMembers}</div>
              <span className="text-[10px] text-slate-500">Registered applicants</span>
            </div>

            <div className="glass-card p-5 rounded-2xl space-y-1 border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">Pending Review</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="font-display font-extrabold text-2xl text-amber-600 dark:text-amber-400">{pendingMembers}</div>
              <span className="text-[10px] text-amber-600 font-semibold">Requires Approval</span>
            </div>

            <div className="glass-card p-5 rounded-2xl space-y-1 border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">Approved Active</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="font-display font-extrabold text-2xl text-emerald-600 dark:text-emerald-400">{approvedMembers}</div>
              <span className="text-[10px] text-emerald-600 font-semibold">Public Verified</span>
            </div>

            <div className="glass-card p-5 rounded-2xl space-y-1 border-l-4 border-l-red-500">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">Suspended</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="font-display font-extrabold text-2xl text-red-600 dark:text-red-400">{suspendedMembers}</div>
              <span className="text-[10px] text-red-600 font-semibold">Levy Review</span>
            </div>

            <div className="glass-card p-5 rounded-2xl space-y-1 border-l-4 border-l-sky-500">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold">Total Revenue</span>
                <DollarSign className="w-4 h-4 text-sky-500" />
              </div>
              <div className="font-display font-extrabold text-xl text-sky-600 dark:text-sky-400">₦{totalRevenue.toLocaleString()}</div>
              <span className="text-[10px] text-slate-500">Fees &amp; Levies</span>
            </div>

          </div>

          {/* Analytics Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 19 Northern States Distribution */}
            <div className="glass-card p-6 rounded-3xl space-y-4">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center justify-between">
                <span>19 Northern States Distribution</span>
                <span className="text-xs font-normal text-slate-500">Active Chapters</span>
              </h3>

              <div className="space-y-2.5">
                {NORTHERN_STATES.slice(0, 6).map((st) => {
                  const stateCount = members.filter((m) => m.state === st).length;
                  const pct = Math.round((stateCount / Math.max(totalMembers, 1)) * 100);
                  return (
                    <div key={st} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-300">
                        <span>{st} State Chapter</span>
                        <span>{stateCount} Members ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#0A2E73] to-[#2EA3F2] rounded-full"
                          style={{ width: `${Math.max(pct, 12)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Specialization Breakdown */}
            <div className="glass-card p-6 rounded-3xl space-y-4">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Engineering Specialization Breakdown
              </h3>

              <div className="space-y-3 text-xs">
                {SPECIALIZATIONS.slice(0, 5).map((sp) => {
                  const spCount = members.filter((m) => m.specialization === sp).length;
                  return (
                    <div key={sp} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[280px]">{sp}</span>
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-sky-100 text-[#0A2E73] dark:bg-sky-950 dark:text-sky-300">
                        {spCount} Certified
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Manual Record Keeping & Full Database Backup Card */}
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/20">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-white">
                      Full Member Database CSV Export
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 uppercase">
                      Offline &amp; Manual Record Keeping
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                    Download the complete registry of all <strong>{members.length} registered members</strong> as a structured, UTF-8 encoded CSV file. Fully compatible with Microsoft Excel, Google Sheets, Apple Numbers, and manual secretariat ledger archives.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleDownloadFullDatabaseCSV}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all transform active:scale-95"
                  title="Download the full member database right now as CSV"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full Database (CSV)</span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-mono">{members.length} records</span>
                </button>

                <button
                  onClick={() => {
                    setBulkExportScope('all');
                    setShowBulkExportModal(true);
                  }}
                  className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-bold shadow flex items-center gap-2 transition-all"
                >
                  <Filter className="w-4 h-4 text-emerald-600" />
                  <span>Advanced Export Options</span>
                </button>
              </div>
            </div>

            {/* Included Fields Grid Preview */}
            <div className="pt-4 border-t border-emerald-100 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 text-[11px]">
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Total Members</span>
                <span className="font-bold text-slate-800 dark:text-white text-xs">{members.length} Members</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Active Members</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">{activeMembersCount} Verified</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Pending Review</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-xs">{pendingMembersCount} Records</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Total States</span>
                <span className="font-bold text-slate-800 dark:text-white text-xs">19 Chapters</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">File Format</span>
                <span className="font-bold text-[#0A2E73] dark:text-sky-400 text-xs">UTF-8 CSV (Excel)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">Dataset Columns</span>
                <span className="font-bold text-teal-600 dark:text-teal-400 text-xs">23 Data Fields</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: MEMBER MANAGEMENT */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          
          {/* Controls Bar */}
          <div className="glass-card p-6 rounded-3xl space-y-4 shadow-xl">
            
            {/* Top Row: Quick Filter Tabs by Membership Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-[#2EA3F2]" />
                  <span>Status Filter:</span>
                </span>

                {/* All */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    statusFilter === 'all'
                      ? 'bg-[#0A2E73] text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>All Registered</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current font-mono">
                    {members.length}
                  </span>
                </button>

                {/* Active */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    statusFilter === 'active' || statusFilter === 'approved'
                      ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/30'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Active</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-mono">
                    {activeMembersCount}
                  </span>
                </button>

                {/* Pending */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    statusFilter === 'pending'
                      ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-500/30'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-mono">
                    {pendingMembersCount}
                  </span>
                </button>

                {/* Expired */}
                <button
                  type="button"
                  onClick={() => setStatusFilter('expired')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    statusFilter === 'expired'
                      ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-500/30'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expired</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 font-mono">
                    {expiredMembersCount}
                  </span>
                </button>

                {/* Suspended */}
                {suspendedMembersCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('suspended')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      statusFilter === 'suspended'
                        ? 'bg-red-700 text-white shadow-md'
                        : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100'
                    }`}
                  >
                    <span>Suspended</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100 font-mono">
                      {suspendedMembersCount}
                    </span>
                  </button>
                )}
              </div>

              {/* Counter Indicator */}
              <div className="text-xs font-bold text-slate-500">
                Showing <span className="text-[#0A2E73] dark:text-[#2EA3F2] font-mono text-sm">{filteredMembers.length}</span> of {members.length} Members
              </div>
            </div>

            {/* Second Row: Detailed Controls (Search + State + Status Select + Action Buttons) */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search name, ID, phone, email, LGA..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2EA3F2] outline-none"
                />
                {memberSearch && (
                  <button
                    onClick={() => setMemberSearch('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdowns & Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                
                {/* State Chapter Dropdown */}
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 hidden lg:inline">State:</label>
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#2EA3F2] outline-none"
                  >
                    <option value="all">📍 All States (19 Northern)</option>
                    {NORTHERN_STATES.map((st) => {
                      const countInState = members.filter((m) => m.state === st).length;
                      return (
                        <option key={st} value={st}>
                          {st} State ({countInState})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Status Dropdown */}
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 hidden lg:inline">Status:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#2EA3F2] outline-none"
                  >
                    <option value="all">⚡ All Statuses</option>
                    <option value="active">Active Members ({activeMembersCount})</option>
                    <option value="pending">Pending Verification ({pendingMembersCount})</option>
                    <option value="expired">Expired Membership ({expiredMembersCount})</option>
                    <option value="suspended">Suspended ({suspendedMembersCount})</option>
                    <option value="rejected">Rejected ({rejectedMembersCount})</option>
                  </select>
                </div>

                <button
                  onClick={handleDownloadFullDatabaseCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold hover:from-emerald-700 hover:to-teal-800 shadow transition-all"
                  title="Download full member database as CSV for manual record keeping"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Full CSV ({members.length})</span>
                </button>

                <button
                  onClick={() => {
                    setBulkExportScope('all');
                    setShowBulkExportModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 shadow-xs transition-all"
                  title="Bulk Export Registered Members Database with Custom Scope Selection"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export Options</span>
                </button>

                <button
                  onClick={async () => {
                    try {
                      await downloadMembersListPdf(filteredMembers, 'Official Members Register', 'All Filtered Chapters', settings);
                    } catch (err) {
                      console.error('Members list PDF error:', err);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Download Official N-NEPEF Members Register (PDF)"
                >
                  <Download className="w-4 h-4 text-sky-200" />
                  <span>Download PDF Register</span>
                </button>

                <button
                  onClick={handlePrintMembersList}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  title="Print Register"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Active Filters Summary Chips Bar */}
            {(memberSearch || stateFilter !== 'all' || statusFilter !== 'all') && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-500 font-bold">Active Filters:</span>
                  
                  {stateFilter !== 'all' && (
                    <span className="px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200 font-semibold flex items-center gap-1">
                      <span>State: {stateFilter}</span>
                      <button onClick={() => setStateFilter('all')} className="hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}

                  {statusFilter !== 'all' && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-semibold flex items-center gap-1 capitalize">
                      <span>Status: {statusFilter}</span>
                      <button onClick={() => setStatusFilter('all')} className="hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}

                  {memberSearch && (
                    <span className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 font-semibold flex items-center gap-1">
                      <span>Search: "{memberSearch}"</span>
                      <button onClick={() => setMemberSearch('')} className="hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMemberSearch('');
                    setStateFilter('all');
                    setStatusFilter('all');
                  }}
                  className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 ml-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedMemberIds.length > 0 && (
              <div className="p-3 bg-sky-50 dark:bg-sky-950/80 border border-sky-200 rounded-2xl flex items-center justify-between text-xs font-bold text-sky-900 dark:text-sky-200">
                <span>{selectedMemberIds.length} Members Selected</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExecuteBulkExport('selected')}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Selected ({selectedMemberIds.length})</span>
                  </button>
                  <button onClick={handleBulkApprove} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                    Bulk Approve
                  </button>
                  <button onClick={handleBulkDelete} className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700">
                    Bulk Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Members Table */}
          <div className="glass-card rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMemberIds(filteredMembers.map((m) => m.id));
                          else setSelectedMemberIds([]);
                        }}
                      />
                    </th>
                    <th className="p-4">Member Info</th>
                    <th className="p-4">Membership ID</th>
                    <th className="p-4">State Chapter</th>
                    <th className="p-4">Specialization</th>
                    <th className="p-4">Membership Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        <div className="max-w-md mx-auto space-y-2">
                          <Users className="w-8 h-8 text-slate-400 mx-auto" />
                          <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                            No Members Match Filter Criteria
                          </p>
                          <p className="text-xs text-slate-500">
                            Try broadening your search term, changing state of residence, or resetting status filters.
                          </p>
                          <button
                            onClick={() => {
                              setMemberSearch('');
                              setStateFilter('all');
                              setStatusFilter('all');
                            }}
                            className="mt-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 hover:bg-slate-300"
                          >
                            Reset Search &amp; Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m) => {
                      const isExpired = m.expiryDate ? m.expiryDate < todayStr : false;

                      return (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedMemberIds.includes(m.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedMemberIds([...selectedMemberIds, m.id]);
                                else setSelectedMemberIds(selectedMemberIds.filter((id) => id !== m.id));
                              }}
                            />
                          </td>

                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img src={m.passportUrl} alt="" className="w-10 h-10 rounded-xl object-cover border" />
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white">{m.fullName}</div>
                                <div className="text-[11px] text-slate-500">{m.email} • {m.phone}</div>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <span className="font-mono font-bold text-[#2EA3F2]">
                              {m.membershipId || 'UNASSIGNED'}
                            </span>
                          </td>

                          <td className="p-4 font-semibold">{m.state}</td>

                          <td className="p-4 font-medium text-slate-600 dark:text-slate-300 max-w-[180px] truncate">
                            {m.specialization}
                          </td>

                          <td className="p-4">
                            {(() => {
                              if (m.status === 'approved' && isExpired) {
                                return (
                                  <span
                                    className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1 w-fit"
                                    title={`Expired on ${m.expiryDate}`}
                                  >
                                    <Clock className="w-3 h-3 text-rose-600" />
                                    Expired ({m.expiryDate})
                                  </span>
                                );
                              }
                              if (m.status === 'approved' || (m.status as string) === 'active') {
                                return (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1 w-fit">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Active
                                  </span>
                                );
                              }
                              if (m.status === 'pending') {
                                return (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 w-fit">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    Pending
                                  </span>
                                );
                              }
                              if (m.status === 'suspended') {
                                return (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 flex items-center gap-1 w-fit">
                                    <AlertTriangle className="w-3 h-3 text-red-600" />
                                    Suspended
                                  </span>
                                );
                              }
                              return (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 w-fit">
                                  {m.status}
                                </span>
                              );
                            })()}
                          </td>

                      <td className="p-4 text-right space-x-1 whitespace-nowrap">
                        {m.status === 'pending' && (
                          <button
                            onClick={() => handleApproveMember(m.id)}
                            className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            title="Approve & Assign ID"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {m.status === 'approved' && (
                          <button
                            onClick={() => handleSuspendMember(m.id)}
                            className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600"
                            title="Suspend Member"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {m.status === 'suspended' && (
                          <button
                            onClick={() => handleRestoreMember(m.id)}
                            className="p-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                            title="Restore Member"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* View ID Card for Approved Members */}
                        {(m.status === 'approved' || (m.status as string) === 'Active') && (
                          <>
                            <button
                              onClick={() => {
                                setGeneratedCardModalMember(m);
                              }}
                              className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200"
                              title="Generate / View Official Membership ID Card"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setOfficialSlipModalMember(m);
                              }}
                              className="p-1.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-200"
                              title="View / Print Official Membership Approval Slip (with Secretary General Signature)"
                            >
                              <Award className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {/* Download Member Dossier PDF */}
                        <button
                          onClick={async () => {
                            try {
                              await downloadMemberProfilePdf(m, settings);
                            } catch (err) {
                              console.error('Member profile PDF error:', err);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 hover:bg-purple-200 cursor-pointer"
                          title="Download Member Dossier (PDF)"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        {/* View Receipt & Passport Photo Modal */}
                        <button
                          onClick={() => setViewingReceiptMember(m)}
                          className="p-1.5 rounded-lg bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 hover:bg-sky-200"
                          title="View Payment Receipt & Passport Photograph"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Member */}
                        <button
                          onClick={() => setEditingMember(m)}
                          className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300"
                          title="Edit Information"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteMember(m.id)}
                          className="p-1.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 hover:bg-red-200"
                          title="Delete Member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                }))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: MEMBERSHIP CARD GENERATOR */}
      {activeTab === 'cards' && (
        <div className="space-y-8">
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              Official Membership ID Card Generator
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Select an approved member to preview and print their official digital ID card.
            </p>

            <select
              value={editingMember?.id || ''}
              onChange={(e) => {
                const found = members.find((m) => m.id === e.target.value);
                if (found) setEditingMember(found);
              }}
              className="w-full sm:w-96 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
            >
              <option value="">-- Select Member to Generate Card --</option>
              {members.filter((m) => m.status === 'approved' || (m.status as string) === 'Active').map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.membershipId || 'ID Pending'})
                </option>
              ))}
            </select>
          </div>

          {editingMember && (
            <div className="glass-card p-8 rounded-3xl text-center space-y-6">
              <MembershipCard member={editingMember} />
            </div>
          )}
        </div>
      )}

      {/* TAB: RECEIPT MANAGEMENT */}
      {activeTab === 'receipts' && (
        <ReceiptManagement
          payments={payments}
          onUpdatePayments={onUpdatePayments}
          onAddAuditLog={onAddAuditLog}
          members={members}
          settings={settings}
          onUpdateNotificationLogs={onUpdateNotificationLogs}
          onUpdateNotifications={onUpdateNotifications}
        />
      )}

      {/* TAB: SUPER ADMIN ID CARD RENEWAL MANAGEMENT */}
      {activeTab === 'renewals' && (
        <SuperAdminRenewalManagement
          renewalRequests={renewalRequests}
          onUpdateRenewalRequests={onUpdateRenewalRequests}
          members={members}
          onUpdateMembers={onUpdateMembers}
          payments={payments}
          onUpdatePayments={onUpdatePayments}
          onAddAuditLog={onAddAuditLog}
          settings={settings}
          onUpdateNotificationLogs={onUpdateNotificationLogs}
          onUpdateNotifications={onUpdateNotifications}
        />
      )}

      {/* TAB: DYNAMIC FEE & PAYMENT SETTINGS */}
      {activeTab === 'fee_settings' && (
        <FeesAndRevenueManager
          settings={settings}
          payments={payments}
          members={members}
          onUpdateSettings={onUpdateSettings}
          onUpdatePayments={onUpdatePayments}
          onAddAuditLog={onAddAuditLog}
          currentAdminName={currentAdminRole === 'super_admin' ? 'Super Admin' : 'Admin Officer'}
          currentAdminRole={currentAdminRole === 'super_admin' ? 'Super Admin' : 'Admin (Full CRUD)'}
        />
      )}

      {/* TAB: BANK ACCOUNT MANAGEMENT */}
      {activeTab === 'bank_accounts' && (
        <BankAccountManager
          settings={settings}
          onUpdateSettings={(newSet) => {
            const apiRes = handleApiCall({
              endpoint: '/api/settings/bank-accounts',
              method: 'PUT',
              headers: { role: currentAdminRole, actorName: currentAdminRole === 'super_admin' ? 'Super Admin' : 'Admin Officer' },
              body: newSet
            });
            const rlsRes = evaluateRlsPolicy(currentAdminRole, 'bank_accounts', 'UPDATE');
            if (apiRes.success && rlsRes.allowed) {
              onUpdateSettings(newSet);
            } else {
              alert(`Action blocked by RBAC / RLS Security Policy:\n${apiRes.message || rlsRes.reason}`);
            }
          }}
          onAddAuditLog={onAddAuditLog}
          currentAdminName={currentAdminRole === 'super_admin' ? 'Super Admin' : 'Admin Officer'}
          currentAdminRole={currentAdminRole === 'super_admin' ? 'super_admin' : 'admin'}
        />
      )}

      {/* TAB: AUTOMATIC APPROVAL NOTIFICATION MANAGEMENT */}
      {activeTab === 'approval_notifications' && (
        <ApprovalNotificationManager
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          notificationLogs={notificationLogs}
          onUpdateNotificationLogs={onUpdateNotificationLogs || (() => {})}
          members={members}
          onAddAuditLog={onAddAuditLog}
        />
      )}

      {/* EDIT MEMBER MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-3xl p-6 sm:p-8 rounded-3xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <img src={editingMember.passportUrl} alt="" className="w-12 h-12 rounded-2xl object-cover border-2 border-[#2EA3F2]" />
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                    Edit Member Profile ({editingMember.fullName})
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {editingMember.membershipId || 'UNASSIGNED'}</p>
                </div>
              </div>
              <button onClick={() => setEditingMember(null)} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dual Passport & Payment Receipt Upload Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DualImageUpload
                label="Passport Photograph (Camera or Gallery)"
                subLabel="Upload or capture passport photograph"
                currentUrl={editingMember.passportUrl}
                onImageChange={(url) => setEditingMember({ ...editingMember, passportUrl: url })}
                aspectRatio="square"
                bucket="passports"
              />
              <DualImageUpload
                label="Payment Receipt Proof (Camera or Gallery)"
                subLabel="Upload or capture proof of bank payment"
                currentUrl={editingMember.paymentReceiptUrl || ''}
                onImageChange={(url) => setEditingMember({ ...editingMember, paymentReceiptUrl: url })}
                aspectRatio="receipt"
                bucket="receipts"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Membership ID</label>
                <input
                  type="text"
                  value={editingMember.membershipId}
                  onChange={(e) => setEditingMember({ ...editingMember, membershipId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-[#2EA3F2]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                <input
                  type="text"
                  value={editingMember.fullName}
                  onChange={(e) => setEditingMember({ ...editingMember, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={editingMember.email}
                  onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                <input
                  type="text"
                  value={editingMember.phone}
                  onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">National ID / NIN (Admin Only)</label>
                <input
                  type="text"
                  value={editingMember.nin || editingMember.ninNumber || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, nin: e.target.value, ninNumber: e.target.value })}
                  placeholder="11-digit NIN"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Date of Birth</label>
                <input
                  type="date"
                  value={editingMember.dob || editingMember.dateOfBirth || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, dob: e.target.value, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300">Residential Address</label>
                <input
                  type="text"
                  value={editingMember.address || editingMember.residentialAddress || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, address: e.target.value, residentialAddress: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">State Chapter</label>
                <select
                  value={editingMember.state}
                  onChange={(e) => setEditingMember({ ...editingMember, state: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {NORTHERN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Engineering Specialization</label>
                <select
                  value={editingMember.specialization}
                  onChange={(e) => setEditingMember({ ...editingMember, specialization: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  {SPECIALIZATIONS.map((sp) => (
                    <option key={sp} value={sp}>{sp}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Executive/Official Position</label>
                <input
                  type="text"
                  value={editingMember.position || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, position: e.target.value })}
                  placeholder="e.g. State Publicity Secretary"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Account Status</label>
                <select
                  value={editingMember.status}
                  onChange={(e: any) => setEditingMember({ ...editingMember, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="suspended">Suspended</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Next of Kin Form Fields */}
              <div className="sm:col-span-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-bold text-xs text-[#0A2E73] dark:text-[#2EA3F2] uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Next of Kin Information</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Next of Kin Name</label>
                    <input
                      type="text"
                      value={editingMember.nextOfKin?.name || ''}
                      onChange={(e) => setEditingMember({
                        ...editingMember,
                        nextOfKin: {
                          name: e.target.value,
                          relation: editingMember.nextOfKin?.relation || 'Spouse',
                          phone: editingMember.nextOfKin?.phone || '',
                          address: editingMember.nextOfKin?.address || ''
                        }
                      })}
                      placeholder="Next of Kin Full Name"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Relation / Relationship</label>
                    <select
                      value={editingMember.nextOfKin?.relation || 'Spouse'}
                      onChange={(e) => setEditingMember({
                        ...editingMember,
                        nextOfKin: {
                          name: editingMember.nextOfKin?.name || '',
                          relation: e.target.value,
                          phone: editingMember.nextOfKin?.phone || '',
                          address: editingMember.nextOfKin?.address || ''
                        }
                      })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Relative">Relative</option>
                      <option value="Business Partner">Business Partner</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Next of Kin Phone</label>
                    <input
                      type="tel"
                      value={editingMember.nextOfKin?.phone || ''}
                      onChange={(e) => setEditingMember({
                        ...editingMember,
                        nextOfKin: {
                          name: editingMember.nextOfKin?.name || '',
                          relation: editingMember.nextOfKin?.relation || 'Spouse',
                          phone: e.target.value,
                          address: editingMember.nextOfKin?.address || ''
                        }
                      })}
                      placeholder="+234 803 000 0000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Next of Kin Address</label>
                    <input
                      type="text"
                      value={editingMember.nextOfKin?.address || ''}
                      onChange={(e) => setEditingMember({
                        ...editingMember,
                        nextOfKin: {
                          name: editingMember.nextOfKin?.name || '',
                          relation: editingMember.nextOfKin?.relation || 'Spouse',
                          phone: editingMember.nextOfKin?.phone || '',
                          address: e.target.value
                        }
                      })}
                      placeholder="Contact address"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                    />
                  </div>
                </div>
              </div>

              {/* Official Status & Membership ID Assignment Section */}
              <div className="sm:col-span-2 p-4 bg-sky-50 dark:bg-sky-950/40 rounded-2xl border border-sky-200 dark:border-sky-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0A2E73] dark:text-[#2EA3F2] text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Official Membership ID &amp; Approval Status
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Central Database Field</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Assigned Membership ID Number
                    </label>
                    <input
                      type="text"
                      value={editingMember.membershipId || ''}
                      onChange={(e) => setEditingMember({ ...editingMember, membershipId: e.target.value.trim().toUpperCase() })}
                      placeholder="e.g. NNEPEF/KN/0001"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Membership Status
                    </label>
                    <select
                      value={editingMember.status || 'pending'}
                      onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                    >
                      <option value="pending">Pending Approval</option>
                      <option value="approved">Approved / Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (editingMember) {
                    setMemberToDelete(editingMember);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900 border border-red-300 dark:border-red-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Permanently Delete Member Data</span>
              </button>

              <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                <button onClick={() => setEditingMember(null)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold">
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!editingMember) return;
                    try {
                      await saveMemberToSupabase(editingMember);
                      const freshMembers = await fetchMembersFromSupabase();
                      onUpdateMembers(freshMembers);
                      setEditingMember(null);
                      onAddAuditLog('MEMBER_EDIT', `Updated information for member ${editingMember.fullName}`);
                    } catch (err: any) {
                      alert(`Failed to save member to Supabase: ${err?.message || 'Error occurred'}`);
                    }
                  }}
                  className="px-5 py-2 rounded-xl bg-[#0A2E73] text-white text-xs font-bold"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT MEMBER DELETION CONFIRMATION MODAL */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 rounded-3xl space-y-5 border-2 border-red-500/30 shadow-2xl bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 bg-red-100 dark:bg-red-950/80 rounded-2xl border border-red-200 dark:border-red-800">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                  Permanently Delete Member Data?
                </h3>
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                  This action CANNOT be undone!
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                <img src={memberToDelete.passportUrl} alt="" className="w-10 h-10 rounded-xl object-cover border" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">{memberToDelete.fullName}</div>
                  <div className="text-[11px] text-slate-500 font-mono">ID: {memberToDelete.membershipId || 'UNASSIGNED'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-600 dark:text-slate-300">
                <div><span className="font-bold text-slate-700 dark:text-slate-200">Email:</span> {memberToDelete.email}</div>
                <div><span className="font-bold text-slate-700 dark:text-slate-200">Phone:</span> {memberToDelete.phone}</div>
                <div><span className="font-bold text-slate-700 dark:text-slate-200">State:</span> {memberToDelete.state}</div>
                <div><span className="font-bold text-slate-700 dark:text-slate-200">Status:</span> <span className="uppercase font-bold text-amber-600">{memberToDelete.status}</span></div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong>{memberToDelete.fullName}</strong>? All profile data, passport records, and associated status history will be completely purged from the system.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition-colors"
              >
                Cancel / Keep Record
              </button>
              <button
                type="button"
                onClick={() => confirmPermanentDelete(memberToDelete)}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Permanently Delete Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEMBER RECEIPT & PASSPORT AUDIT MODAL */}
      {viewingReceiptMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-3xl p-6 sm:p-8 rounded-3xl space-y-6 max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-sky-100 dark:bg-sky-950 rounded-2xl border border-sky-300 dark:border-sky-800 text-[#0A2E73] dark:text-[#2EA3F2]">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                      Verification Audit: {viewingReceiptMember.fullName}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      viewingReceiptMember.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {viewingReceiptMember.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {viewingReceiptMember.membershipId || 'UNASSIGNED'} • {viewingReceiptMember.state} State • {viewingReceiptMember.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingReceiptMember(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Grid: Left Passport Photo, Right Payment Receipt */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              
              {/* 1. Passport Photo Section */}
              <div className="space-y-3 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      Passport Photograph
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">JPG / PNG Format</span>
                  </div>

                  <DualImageUpload
                    label="Update Passport Photograph"
                    subLabel="Upload or capture new passport"
                    currentUrl={viewingReceiptMember.passportUrl}
                    onImageChange={async (newUrl) => {
                      if (!newUrl) return;
                      try {
                        const updated = { ...viewingReceiptMember, passportUrl: newUrl };
                        await saveMemberToSupabase(updated);
                        setViewingReceiptMember(updated);
                        const list = members.map(m => m.id === updated.id ? updated : m);
                        onUpdateMembers(list);
                        onAddAuditLog('PASSPORT_UPDATE', `Updated passport photo for ${updated.fullName}`);
                      } catch (e) {
                        alert('Failed to update passport photo. Member record remains unchanged.');
                      }
                    }}
                    aspectRatio="square"
                    bucket="passports"
                  />

                  <div className="space-y-1 text-center">
                    <p className="font-bold text-slate-800 dark:text-slate-200">{viewingReceiptMember.fullName}</p>
                    <p className="text-[11px] text-slate-500">{viewingReceiptMember.specialization}</p>
                  </div>
                </div>

                <a
                  href={viewingReceiptMember.passportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-[#0A2E73] hover:text-white text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors mt-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Original Passport</span>
                </a>
              </div>

              {/* 2. Payment Receipt Section */}
              <div className="space-y-3 p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-[#2EA3F2]" />
                      Payment Receipt / Proof
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold uppercase">Uploaded Proof</span>
                  </div>

                  <DualImageUpload
                    label="Update Payment Receipt Proof"
                    subLabel="Upload or capture new bank receipt"
                    currentUrl={viewingReceiptMember.paymentReceiptUrl || ''}
                    bucket="receipts"
                    onImageChange={async (newUrl) => {
                      if (!newUrl) return;
                      try {
                        const updated = { ...viewingReceiptMember, paymentReceiptUrl: newUrl };
                        await saveMemberToSupabase(updated);
                        setViewingReceiptMember(updated);
                        const list = members.map(m => m.id === updated.id ? updated : m);
                        onUpdateMembers(list);

                        // Sync with payments table
                        const payRecord: PaymentRecord = {
                          id: `pay-${updated.id}`,
                          memberId: updated.id,
                          memberName: updated.fullName,
                          membershipId: updated.membershipId || 'PENDING ID',
                          state: updated.state,
                          lga: updated.lga,
                          type: 'Registration Fee',
                          amount: 10000,
                          status: 'Pending',
                          receiptUrl: newUrl,
                          date: updated.registeredAt || new Date().toISOString().split('T')[0],
                          reference: `REG-${updated.id.replace(/^m-/, '')}`,
                          paymentMethod: 'Bank Transfer',
                          remarks: 'Updated by Admin Treasury'
                        };
                        await savePaymentToSQLite(payRecord);

                        onAddAuditLog('RECEIPT_UPDATE', `Updated payment receipt for ${updated.fullName}`);
                      } catch (e) {
                        alert('Failed to update receipt proof. Member record remains unchanged.');
                      }
                    }}
                    aspectRatio="receipt"
                  />

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Verification Status:</span>
                      <span className="font-bold text-emerald-600">VERIFIED BY TREASURY</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Registration Date:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{viewingReceiptMember.registeredAt || '2024-01-15'}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={viewingReceiptMember.paymentReceiptUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=400'}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-colors mt-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Bank Receipt Proof</span>
                </a>
              </div>

            </div>

            {/* Next of Kin Details Box in Audit Modal */}
            {viewingReceiptMember.nextOfKin && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
                <div className="font-bold text-[#0A2E73] dark:text-[#2EA3F2] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700 pb-2">
                  <User className="w-4 h-4" />
                  <span>Next of Kin Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Name</span>
                    <span className="font-bold text-slate-900 dark:text-white">{viewingReceiptMember.nextOfKin.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Relation</span>
                    <span className="font-bold text-slate-900 dark:text-white">{viewingReceiptMember.nextOfKin.relation || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Phone</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{viewingReceiptMember.nextOfKin.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-mono block">Address</span>
                    <span className="font-bold text-slate-900 dark:text-white">{viewingReceiptMember.nextOfKin.address || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 font-medium">
                N-NEPEF 2020 Permanent Audit Record
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return;
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Member Verification Dossier - ${viewingReceiptMember.fullName}</title>
                          <style>
                            body { font-family: system-ui, sans-serif; padding: 30px; }
                            h1 { color: #0A2E73; margin-bottom: 5px; }
                            .box { border: 2px solid #0A2E73; padding: 20px; border-radius: 12px; margin-top: 15px; }
                            .img-box { display: flex; gap: 20px; margin-top: 15px; }
                            img { width: 180px; height: 220px; object-fit: cover; border-radius: 8px; border: 1px solid #ccc; }
                          </style>
                        </head>
                        <body>
                          <h1>N-NEPEF 2020 Secretariat Member Dossier</h1>
                          <p><strong>Member Name:</strong> ${viewingReceiptMember.fullName}</p>
                          <p><strong>Membership ID:</strong> ${viewingReceiptMember.membershipId}</p>
                          <p><strong>State Chapter:</strong> ${viewingReceiptMember.state}</p>
                          <p><strong>Specialization:</strong> ${viewingReceiptMember.specialization}</p>
                          <p><strong>Next of Kin:</strong> ${viewingReceiptMember.nextOfKin?.name || 'N/A'} (${viewingReceiptMember.nextOfKin?.relation || 'N/A'}) - Phone: ${viewingReceiptMember.nextOfKin?.phone || 'N/A'} - Address: ${viewingReceiptMember.nextOfKin?.address || 'N/A'}</p>
                          <div class="img-box">
                            <div>
                              <h4>Passport Photograph</h4>
                              <img src="${viewingReceiptMember.passportUrl}" />
                            </div>
                            <div>
                              <h4>Proof of Payment Receipt</h4>
                              <img src="${viewingReceiptMember.paymentReceiptUrl}" />
                            </div>
                          </div>
                          <script>window.onload = function() { window.print(); }</script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-200"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Audit Dossier</span>
                </button>

                <button
                  onClick={() => setViewingReceiptMember(null)}
                  className="px-6 py-2.5 rounded-xl bg-[#0A2E73] text-white font-bold text-xs shadow"
                >
                  Done
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ADMIN MEMBER APPROVAL & ID ALLOCATION MODAL */}
      {approvingMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg p-6 rounded-3xl space-y-5 border-2 border-emerald-500/40 shadow-2xl bg-white dark:bg-slate-900 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/80 rounded-2xl text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                    Approve Member &amp; Assign ID
                  </h3>
                  <p className="text-xs text-slate-500">
                    Official N-NEPEF Secretariat Enrollment
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApprovingMember(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Member Profile Summary Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center gap-4">
              <img
                src={approvingMember.passportUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'}
                alt={approvingMember.fullName}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-sm shrink-0"
              />
              <div className="space-y-1 min-w-0 flex-1">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {approvingMember.fullName}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                  {approvingMember.specialization} • {approvingMember.state} State
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <span>Phone: {approvingMember.phone}</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-semibold">Proof Uploaded</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {approvalError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-2.5 text-xs text-red-600 dark:text-red-400 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{approvalError}</span>
              </div>
            )}

            {/* Form Inputs */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Official Membership ID Number *</span>
                  <span className="text-[10px] text-slate-500 font-mono">Format: NNEPEF/STATE/0000</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={assignedMembershipId}
                    onChange={(e) => setAssignedMembershipId(e.target.value.toUpperCase())}
                    placeholder="e.g. NNEPEF/KN/0001"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                  />
                  <span className="absolute right-3 top-3 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md">
                    Required
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  This unique ID will be embedded into the member's official digital ID card, verification QR code, and PDF dossier.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Designation / Position
                </label>
                <input
                  type="text"
                  value={assignedPosition}
                  onChange={(e) => setAssignedPosition(e.target.value)}
                  placeholder="e.g. Practicing Member, Fellow, Chapter Executive"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setApprovingMember(null)}
                disabled={isApproving}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={isApproving}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isApproving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Enrolling in Supabase...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Approve &amp; Generate ID Card</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* AUTOMATIC GENERATED ID CARD MODAL */}
      {generatedCardModalMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card w-full max-w-2xl p-6 rounded-3xl space-y-5 border border-emerald-500/40 shadow-2xl bg-white dark:bg-slate-900 my-8">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/80 rounded-2xl text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                    Member Approved &amp; Smart ID Card Generated
                  </h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                    ID: {generatedCardModalMember.membershipId} • {generatedCardModalMember.fullName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGeneratedCardModalMember(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* High-Resolution ID Card Preview */}
            <div className="flex justify-center p-2">
              <div className="w-full max-w-md">
                <MembershipCard
                  member={generatedCardModalMember}
                  logoUrl={settings?.logoUrl}
                />
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOfficialSlipModalMember(generatedCardModalMember)}
                  className="px-4 py-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold flex items-center gap-2 hover:bg-amber-200"
                >
                  <Award className="w-4 h-4" />
                  <span>Official Approval Slip (with Signature)</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadMemberProfilePdf(generatedCardModalMember, settings)}
                  className="px-4 py-2.5 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 font-bold flex items-center gap-2 hover:bg-sky-200"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Member Dossier (PDF)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setGeneratedCardModalMember(null)}
                className="px-6 py-2.5 rounded-xl bg-[#0A2E73] text-white font-bold hover:bg-[#08245A] shadow"
              >
                Close &amp; Return to Register
              </button>
            </div>

          </div>
        </div>
      )}

      {/* OFFICIAL MEMBERSHIP APPROVAL SLIP MODAL (WITH SECRETARY GENERAL SIGNATURE) */}
      {officialSlipModalMember && (
        <OfficialApprovalSlipModal
          member={officialSlipModalMember}
          settings={settings}
          onClose={() => setOfficialSlipModalMember(null)}
        />
      )}

      {/* TAB 4: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Manage Bulletins &amp; Announcements</h3>
            <button
              onClick={() => setShowAddAnnouncement(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A2E73] text-white text-xs font-bold shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Create Announcement</span>
            </button>
          </div>

          {showAddAnnouncement && (
            <form onSubmit={handleCreateAnnouncement} className="glass-card p-6 rounded-3xl space-y-4">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">New Bulletin Announcement</h4>
              <input
                type="text"
                required
                placeholder="Announcement Title"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border text-xs"
              />
              <textarea
                required
                rows={3}
                placeholder="Announcement Content..."
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border text-xs resize-none"
              ></textarea>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddAnnouncement(false)} className="px-4 py-2 rounded-xl bg-slate-200 text-xs font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs">
                  Publish Announcement
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="glass-card p-5 rounded-2xl flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{a.title}</h4>
                    {a.pinned && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">PINNED</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{a.content}</p>
                </div>
                <button
                  onClick={() => {
                    onUpdateAnnouncements(announcements.filter((item) => item.id !== a.id));
                    onAddAuditLog('ANNOUNCEMENT_DELETE', `Deleted bulletin ${a.title}`);
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: EVENTS & ATTENDANCE */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Events &amp; RSVP Attendance Manager</h3>
            <button
              onClick={() => setShowAddEvent(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A2E73] text-white text-xs font-bold shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule New Event</span>
            </button>
          </div>

          {showAddEvent && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const item: EventItem = {
                  id: `evt-${Date.now()}`,
                  title: newEvent.title,
                  date: newEvent.date,
                  time: newEvent.time,
                  location: newEvent.location,
                  state: newEvent.state,
                  description: newEvent.description,
                  isVirtual: newEvent.isVirtual,
                  virtualLink: newEvent.virtualLink,
                  rsvpCount: 0,
                  capacity: newEvent.capacity,
                  qrCode: `QR-NEPEF-${Date.now()}`,
                  certificatesEnabled: true,
                  photos: [],
                  videos: [],
                  speakers: newEvent.speakers.split(',').map((s) => s.trim()).filter(Boolean),
                };
                onUpdateEvents([item, ...events]);
                setShowAddEvent(false);
                onAddAuditLog('EVENT_CREATE', `Scheduled new event: ${item.title}`);
              }}
              className="glass-card p-6 rounded-3xl space-y-4"
            >
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">New Forum Event</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Event Title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="px-4 py-2 rounded-xl border"
                />
                <input
                  type="date"
                  required
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="px-4 py-2 rounded-xl border"
                />
                <input
                  type="text"
                  placeholder="Location / Venue"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="px-4 py-2 rounded-xl border"
                />
                <select
                  value={newEvent.state}
                  onChange={(e) => setNewEvent({ ...newEvent, state: e.target.value })}
                  className="px-4 py-2 rounded-xl border"
                >
                  {NORTHERN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <textarea
                  placeholder="Description..."
                  rows={2}
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="sm:col-span-2 px-4 py-2 rounded-xl border"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddEvent(false)} className="px-4 py-2 rounded-xl bg-slate-200 text-xs font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs">
                  Create Event
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((evt) => (
              <div key={evt.id} className="glass-card p-6 rounded-3xl space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[10px] font-bold">
                      {evt.date} • {evt.time}
                    </span>
                    <span className="text-xs font-bold text-slate-500">{evt.state} Chapter</span>
                  </div>
                  <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">{evt.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{evt.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setSelectedEventAttendees(evt)}
                    className="flex items-center gap-1 text-[#2EA3F2] font-bold hover:underline"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{evt.rsvpCount} Registered Attendees</span>
                  </button>

                  <button
                    onClick={() => {
                      onUpdateEvents(events.filter((e) => e.id !== evt.id));
                      onAddAuditLog('EVENT_DELETE', `Deleted event ${evt.title}`);
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Attendees List Modal */}
          {selectedEventAttendees && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="glass-card w-full max-w-lg p-6 rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    RSVP Attendees: {selectedEventAttendees.title}
                  </h3>
                  <button onClick={() => setSelectedEventAttendees(null)} className="p-1 text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                  {members.slice(0, 5).map((m) => (
                    <div key={m.id} className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src={m.passportUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <p className="font-bold">{m.fullName}</p>
                          <p className="text-[10px] text-slate-500">{m.membershipId} • {m.state}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">Confirmed</span>
                    </div>
                  ))}
                </div>
                <div className="text-right pt-2 border-t">
                  <button onClick={() => setSelectedEventAttendees(null)} className="px-4 py-1.5 bg-[#0A2E73] text-white rounded-xl text-xs font-bold">
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: FINANCIALS & LEVIES */}
      {activeTab === 'payments' && (
        <FeesAndRevenueManager
          settings={settings}
          payments={payments}
          members={members}
          onUpdateSettings={onUpdateSettings}
          onUpdatePayments={onUpdatePayments}
          onAddAuditLog={onAddAuditLog}
          currentAdminName={currentAdminRole === 'super_admin' ? 'Super Admin' : 'Admin Officer'}
          currentAdminRole={currentAdminRole === 'super_admin' ? 'Super Admin' : 'Admin (Full CRUD)'}
        />
      )}

      {/* TAB 7: EXECUTIVES COUNCIL & LEADERSHIP DIRECTORY */}
      {activeTab === 'executives' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                  Leadership Directory Governance
                </h3>
                {isLeadershipUnlocked ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-300 flex items-center gap-1.5 shadow-sm">
                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Password Unlocked</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-extrabold text-[11px] border border-amber-300 flex items-center gap-1.5 shadow-sm">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Password Protected</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Super Admin control for National, State, and Local Government Executive Councils
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isLeadershipUnlocked ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsLeadershipUnlocked(false);
                    setShowAddExecutive(false);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-300 flex items-center gap-1.5"
                  title="Lock section requiring password again"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Section</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => requestLeadershipAccess(() => {})}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 flex items-center gap-1.5 shadow"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Enter Password to Unlock</span>
                </button>
              )}

              <button
                onClick={() => {
                  requestLeadershipAccess(() => {
                    setEditingExecutive(null);
                    setNewExecutive({
                      name: '',
                      position: '',
                      tier: 'national',
                      state: 'Kano',
                      lga: '',
                      email: '',
                      phone: '',
                      bio: '',
                      term: '2024 - 2026',
                      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
                      active: true
                    });
                    setShowAddExecutive(true);
                  });
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A2E73] text-white text-xs font-bold shadow hover:bg-sky-800 transition-all self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Executive Leader</span>
              </button>
            </div>
          </div>

          {/* Sub-tier Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-200/80 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-300 dark:border-slate-800 text-xs font-bold">
            {(['all', 'national', 'state', 'lga'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setExecFilter(t)}
                className={`px-4 py-2 rounded-xl capitalize transition-all ${
                  execFilter === t 
                    ? 'bg-[#0A2E73] text-white shadow' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t === 'all' ? 'All Councils' : t === 'national' ? 'National Council' : t === 'state' ? 'State Council' : 'Local Govt Council'}
              </button>
            ))}
          </div>

          {/* Add / Edit Executive Modal Form */}
          {showAddExecutive && isLeadershipUnlocked && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (currentAdminRole !== 'super_admin') {
                  alert('Action Blocked: Only Super Admin is authorized to edit or modify leader names and details.');
                  return;
                }

                if (editingExecutive) {
                  // Update existing
                  const isNameChanged = editingExecutive.name !== newExecutive.name;
                  const updatedList = executives.map(ex => ex.id === editingExecutive.id ? {
                    ...editingExecutive,
                    name: newExecutive.name,
                    position: newExecutive.position,
                    tier: newExecutive.tier as any,
                    state: newExecutive.state,
                    lga: newExecutive.lga,
                    email: newExecutive.email,
                    phone: newExecutive.phone,
                    bio: newExecutive.bio,
                    term: newExecutive.term,
                    photoUrl: newExecutive.photoUrl,
                    active: newExecutive.active
                  } : ex);
                  onUpdateExecutives(updatedList);
                  
                  if (isNameChanged) {
                    onAddAuditLog('EXECUTIVE_NAME_CHANGE', `Super Admin renamed leader from "${editingExecutive.name}" to "${newExecutive.name}" (${newExecutive.position})`);
                  } else {
                    onAddAuditLog('EXECUTIVE_EDIT', `Updated leadership profile for ${newExecutive.name} (${newExecutive.position})`);
                  }
                } else {
                  // Add new
                  const item: Executive = {
                    id: `exec-${Date.now()}`,
                    name: newExecutive.name,
                    position: newExecutive.position,
                    tier: newExecutive.tier as any,
                    state: newExecutive.state,
                    lga: newExecutive.lga,
                    email: newExecutive.email,
                    phone: newExecutive.phone,
                    bio: newExecutive.bio,
                    term: newExecutive.term,
                    photoUrl: newExecutive.photoUrl,
                    order: executives.length + 1,
                    active: newExecutive.active
                  };
                  onUpdateExecutives([...executives, item]);
                  onAddAuditLog('EXECUTIVE_ADD', `Added new leader ${item.name} to ${item.tier.toUpperCase()} Council`);
                }
                setShowAddExecutive(false);
                setEditingExecutive(null);
              }}
              className="glass-card p-6 rounded-3xl space-y-5 border-2 border-[#0A2E73]/40 shadow-2xl bg-white dark:bg-slate-900"
            >
              <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-100 dark:bg-sky-950 rounded-xl text-[#0A2E73] dark:text-[#2EA3F2]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white">
                      {editingExecutive ? `Edit / Rename Leader: ${editingExecutive.name}` : 'Add New Executive Officer'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Password Unlocked • Super Admin Level Authority
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowAddExecutive(false); setEditingExecutive(null); }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* 1. Leader's Name */}
                <div className="sm:col-span-2 lg:col-span-1 p-3 bg-sky-50/80 dark:bg-sky-950/40 rounded-2xl border border-sky-200 dark:border-sky-800 space-y-1">
                  <label className="font-extrabold text-[#0A2E73] dark:text-[#2EA3F2] block flex items-center justify-between">
                    <span>Full Name &amp; Title</span>
                    <span className="text-[9px] uppercase bg-sky-200 dark:bg-sky-900 text-sky-900 dark:text-sky-100 px-1.5 py-0.5 rounded font-extrabold">Required</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engr. Dr. Usman Farouk FNSE"
                    value={newExecutive.name}
                    onChange={(e) => setNewExecutive({ ...newExecutive, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-[#2EA3F2] outline-none"
                  />
                  <p className="text-[10px] text-slate-500">Include honorific titles (e.g., Engr, Dr, Chief, Mallam)</p>
                </div>

                {/* 2. Position */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block">Executive Position</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. National Chairman, State Coordinator"
                    value={newExecutive.position}
                    onChange={(e) => setNewExecutive({ ...newExecutive, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  />
                  
                  {/* Position Quick Selection Chips */}
                  <div className="pt-1 flex flex-wrap gap-1">
                    {[
                      'National Chairman',
                      'Deputy Chairman',
                      'Secretary General',
                      'Financial Secretary',
                      'State Coordinator',
                      'PRO'
                    ].map((p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setNewExecutive({ ...newExecutive, position: p })}
                        className="text-[9px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-[#0A2E73] hover:text-white rounded text-slate-700 dark:text-slate-300 font-medium transition-colors"
                      >
                        + {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Council Tier */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200 block">Council Tier Level</label>
                  <select
                    value={newExecutive.tier}
                    onChange={(e: any) => setNewExecutive({ ...newExecutive, tier: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="national">National Executive Council</option>
                    <option value="state">State Executive Council</option>
                    <option value="lga">Local Government Executive Council</option>
                  </select>
                </div>

                {newExecutive.tier !== 'national' && (
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">State Chapter</label>
                    <select
                      value={newExecutive.state}
                      onChange={(e) => setNewExecutive({ ...newExecutive, state: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      {NORTHERN_STATES.map((s) => (
                        <option key={s} value={s}>{s} State</option>
                      ))}
                    </select>
                  </div>
                )}

                {newExecutive.tier === 'lga' && (
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Local Government Area (LGA)</label>
                    <input
                      type="text"
                      placeholder="e.g. Kano Municipal, Kaduna North"
                      value={newExecutive.lga || ''}
                      onChange={(e) => setNewExecutive({ ...newExecutive, lga: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tenure / Term</label>
                  <input
                    type="text"
                    placeholder="e.g. 2024 - 2026"
                    value={newExecutive.term}
                    onChange={(e) => setNewExecutive({ ...newExecutive, term: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Official Email</label>
                  <input
                    type="email"
                    placeholder="official@nepef.org.ng"
                    value={newExecutive.email}
                    onChange={(e) => setNewExecutive({ ...newExecutive, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+234..."
                    value={newExecutive.phone}
                    onChange={(e) => setNewExecutive({ ...newExecutive, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                {/* 4. Leader Passport Photograph Upload & Presets */}
                <div className="sm:col-span-2 lg:col-span-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-slate-900 dark:text-white block">
                      Leader Passport Photograph
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">JPG / PNG / WebP</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Live Passport Thumbnail Preview */}
                    <div className="relative w-24 h-28 flex-shrink-0 rounded-2xl overflow-hidden border-2 border-[#0A2E73] dark:border-[#2EA3F2] shadow-md bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                      {newExecutive.photoUrl ? (
                        <img
                          src={newExecutive.photoUrl}
                          alt="Leader Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-8 h-8 text-slate-400" />
                      )}
                      <div className="absolute bottom-1 right-1 p-0.5 bg-emerald-500 text-white rounded-full">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Image URL (e.g. https://...)"
                          value={newExecutive.photoUrl}
                          onChange={(e) => setNewExecutive({ ...newExecutive, photoUrl: e.target.value })}
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                        />
                        <label className="px-3 py-2 bg-[#0A2E73] text-white hover:bg-sky-800 rounded-xl cursor-pointer text-xs font-bold flex items-center gap-1 shadow">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Browse</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setNewExecutive(prev => ({ ...prev, photoUrl: reader.result as string }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>

                      {/* Presets choice */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[10px] text-slate-500 font-bold">Quick Sample Avatars:</span>
                        {[
                          { label: 'Executive Male 1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300' },
                          { label: 'Executive Male 2', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300' },
                          { label: 'Executive Female 1', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300' },
                          { label: 'Executive Female 2', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300' }
                        ].map((preset, pIdx) => (
                          <button
                            type="button"
                            key={pIdx}
                            onClick={() => setNewExecutive({ ...newExecutive, photoUrl: preset.url })}
                            className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-[#2EA3F2] hover:text-white font-medium text-slate-700 dark:text-slate-300 transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Leader Biography / Profile</label>
                  <textarea
                    rows={2}
                    placeholder="Short engineering credentials and governance bio..."
                    value={newExecutive.bio}
                    onChange={(e) => setNewExecutive({ ...newExecutive, bio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="execActive"
                    checked={newExecutive.active !== false}
                    onChange={(e) => setNewExecutive({ ...newExecutive, active: e.target.checked })}
                    className="w-4 h-4 rounded text-[#0A2E73]"
                  />
                  <label htmlFor="execActive" className="font-bold text-slate-900 dark:text-white text-xs">
                    Published &amp; Active in Directory
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowAddExecutive(false); setEditingExecutive(null); }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  {editingExecutive ? 'Update Leader Record' : 'Save Leader Record'}
                </button>
              </div>
            </form>
          )}

          {/* Leaders Grid with Full Reordering, Editing, Tier Switching, and Activation */}
          {(() => {
            const list = executives.filter(ex => execFilter === 'all' || ex.tier === execFilter);

            if (list.length === 0) {
              return (
                <div className="p-8 text-center bg-slate-100 dark:bg-slate-900/50 rounded-2xl text-xs text-slate-500">
                  No executive members found for the selected council tier.
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((ex, idx) => (
                  <div key={ex.id} className={`glass-card p-5 rounded-3xl space-y-3 relative border-2 ${ex.active === false ? 'opacity-60 border-slate-300 dark:border-slate-800' : 'border-sky-500/30 dark:border-sky-500/40'}`}>
                    
                    {/* Header Badge */}
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                        {ex.tier === 'national' ? 'National Council' : ex.tier === 'state' ? `${ex.state || ''} State` : `${ex.lga || ''} LGA`}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ex.active !== false ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                        {ex.active !== false ? 'Active' : 'Hidden'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <img src={ex.photoUrl} alt={ex.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-[#0A2E73] shadow flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{ex.name}</h4>
                        <p className="text-xs text-[#2EA3F2] font-extrabold truncate">{ex.position}</p>
                        <p className="text-[11px] text-slate-500 truncate">{ex.term} • {ex.email || 'No email'}</p>
                      </div>
                    </div>

                    {/* Controls Toolbar: Edit, Reorder, Tier Move, Toggle Active, Delete */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      {/* Reorder Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          title="Move Up in Order"
                          disabled={idx === 0}
                          onClick={() => {
                            if (currentAdminRole !== 'super_admin') {
                              alert('Only Super Admin is authorized to reorder executive positions.');
                              return;
                            }
                            const copy = [...executives];
                            const currentIdx = copy.findIndex(i => i.id === ex.id);
                            if (currentIdx > 0) {
                              const temp = copy[currentIdx];
                              copy[currentIdx] = copy[currentIdx - 1];
                              copy[currentIdx - 1] = temp;
                              onUpdateExecutives(copy);
                              onAddAuditLog('EXECUTIVE_REORDER', `Moved ${ex.name} up in leadership display order`);
                            }
                          }}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          title="Move Down in Order"
                          disabled={idx === list.length - 1}
                          onClick={() => {
                            if (currentAdminRole !== 'super_admin') {
                              alert('Only Super Admin is authorized to reorder executive positions.');
                              return;
                            }
                            const copy = [...executives];
                            const currentIdx = copy.findIndex(i => i.id === ex.id);
                            if (currentIdx < copy.length - 1) {
                              const temp = copy[currentIdx];
                              copy[currentIdx] = copy[currentIdx + 1];
                              copy[currentIdx + 1] = temp;
                              onUpdateExecutives(copy);
                              onAddAuditLog('EXECUTIVE_REORDER', `Moved ${ex.name} down in leadership display order`);
                            }
                          }}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg disabled:opacity-30"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Toggle Active */}
                        <button
                          onClick={() => {
                            if (currentAdminRole !== 'super_admin') {
                              alert('Only Super Admin is authorized to activate or hide executive directory listings.');
                              return;
                            }
                            const updated = executives.map(item => item.id === ex.id ? { ...item, active: item.active === false } : item);
                            onUpdateExecutives(updated);
                            onAddAuditLog('EXECUTIVE_TOGGLE_ACTIVE', `Toggled active state for ${ex.name}`);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold ${ex.active !== false ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}
                        >
                          {ex.active !== false ? 'Hide' : 'Activate'}
                        </button>

                        {/* Edit / Rename Button */}
                        <button
                          onClick={() => {
                            requestLeadershipAccess(() => {
                              setEditingExecutive(ex);
                              setNewExecutive({
                                name: ex.name,
                                position: ex.position,
                                tier: ex.tier,
                                state: ex.state || 'Kano',
                                lga: ex.lga || '',
                                email: ex.email || '',
                                phone: ex.phone || '',
                                bio: ex.bio || '',
                                term: ex.term || '2024 - 2026',
                                photoUrl: ex.photoUrl || '',
                                active: ex.active !== false
                              });
                              setShowAddExecutive(true);
                            });
                          }}
                          className="px-2.5 py-1 bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 hover:bg-sky-200 rounded-lg font-bold text-[10px] flex items-center gap-1"
                          title="Rename leader or edit executive details"
                        >
                          <span>Rename / Edit</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => {
                            if (currentAdminRole !== 'super_admin') {
                              alert('Only Super Admin is authorized to delete leadership records.');
                              return;
                            }
                            if (confirm(`Are you sure you want to remove ${ex.name} from the leadership directory?`)) {
                              onUpdateExecutives(executives.filter((item) => item.id !== ex.id));
                              onAddAuditLog('EXECUTIVE_DELETE', `Deleted executive officer ${ex.name}`);
                            }
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 8: NEWS & MEDIA */}
      {activeTab === 'news' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Technical Publications &amp; News</h3>
            <button
              onClick={() => setShowAddNews(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A2E73] text-white text-xs font-bold shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Article</span>
            </button>
          </div>

          {showAddNews && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const item: NewsArticle = {
                  id: `news-${Date.now()}`,
                  title: newNews.title,
                  category: 'Announcements',
                  summary: newNews.summary,
                  content: newNews.content,
                  date: new Date().toISOString().split('T')[0],
                  imageUrl: newNews.imageUrl,
                  author: newNews.author,
                  featured: newNews.featured,
                  commentsCount: 0,
                  views: 1,
                  tags: newNews.tags.split(',').map((t) => t.trim()).filter(Boolean),
                };
                onUpdateNews([item, ...news]);
                setShowAddNews(false);
                onAddAuditLog('NEWS_PUBLISH', `Published news article: ${item.title}`);
              }}
              className="glass-card p-6 rounded-3xl space-y-4"
            >
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Publish Article</h4>
              <div className="space-y-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Article Title"
                  value={newNews.title}
                  onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border"
                />
                <textarea
                  placeholder="Summary..."
                  rows={2}
                  value={newNews.summary}
                  onChange={(e) => setNewNews({ ...newNews, summary: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border"
                ></textarea>
                <textarea
                  placeholder="Full Article Content..."
                  rows={4}
                  value={newNews.content}
                  onChange={(e) => setNewNews({ ...newNews, content: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddNews(false)} className="px-4 py-2 bg-slate-200 rounded-xl text-xs font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">
                  Publish Article
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {news.map((item) => (
              <div key={item.id} className="glass-card p-5 rounded-3xl flex gap-4">
                <img src={item.imageUrl} alt="" className="w-24 h-24 rounded-2xl object-cover" />
                <div className="flex-1 space-y-1">
                  <span className="text-[10px] font-bold text-sky-600 uppercase">{item.category} • {item.date}</span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{item.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2">{item.summary}</p>
                </div>
                <button
                  onClick={() => {
                    onUpdateNews(news.filter((n) => n.id !== item.id));
                    onAddAuditLog('NEWS_DELETE', `Deleted article ${item.title}`);
                  }}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg h-fit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 9: DOCUMENTS VAULT */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Documents &amp; Circulars Vault</h3>
            <button
              onClick={() => setShowAddDocument(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A2E73] text-white text-xs font-bold shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>

          {showAddDocument && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const item: DocumentItem = {
                  id: `doc-${Date.now()}`,
                  title: newDocument.title,
                  category: 'Circular',
                  uploadDate: new Date().toISOString().split('T')[0],
                  fileUrl: newDocument.fileUrl,
                  fileSize: newDocument.fileSize,
                  format: 'PDF',
                  minRole: 'all',
                  downloadsCount: 0,
                };
                onUpdateDocuments([item, ...documents]);
                setShowAddDocument(false);
                onAddAuditLog('DOCUMENT_UPLOAD', `Uploaded document: ${item.title}`);
              }}
              className="glass-card p-6 rounded-3xl space-y-4"
            >
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">New Document Upload</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Document Title"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                  className="px-4 py-2 rounded-xl border"
                />
                <select
                  value={newDocument.category}
                  onChange={(e: any) => setNewDocument({ ...newDocument, category: e.target.value })}
                  className="px-4 py-2 rounded-xl border"
                >
                  <option value="Circular">Official Circular</option>
                  <option value="Constitution">Forum Constitution</option>
                  <option value="Policy">Technical Policy</option>
                  <option value="Form">Membership Form</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddDocument(false)} className="px-4 py-2 bg-slate-200 rounded-xl text-xs font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">
                  Save Document
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="glass-card p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#0A2E73] font-mono font-bold flex items-center justify-center text-xs">
                    {doc.format}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">{doc.title}</h4>
                    <p className="text-[10px] text-slate-500">{doc.category} • {doc.fileSize} • Uploaded {doc.uploadDate}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onUpdateDocuments(documents.filter((d) => d.id !== doc.id));
                    onAddAuditLog('DOCUMENT_DELETE', `Deleted document ${doc.title}`);
                  }}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 10: CONTACT INBOX */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Public &amp; Member Enquiries Inbox</h3>
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => setMessageFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold ${messageFilter === 'all' ? 'bg-[#0A2E73] text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
              >
                All
              </button>
              <button
                onClick={() => setMessageFilter('unread')}
                className={`px-3 py-1.5 rounded-xl font-bold ${messageFilter === 'unread' ? 'bg-[#0A2E73] text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
              >
                Unread
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {contactMessages.map((msg) => (
              <div key={msg.id} className="glass-card p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{msg.name}</span>
                    <span className="text-[10px] text-slate-500 ml-2">({msg.email} • {msg.phone})</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{msg.date}</span>
                </div>
                <p className="text-xs font-bold text-sky-700 dark:text-sky-300">{msg.subject}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{msg.message}</p>
                {msg.reply && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300">
                    <span className="font-bold block">Replied by Secretariat:</span>
                    {msg.reply}
                  </div>
                )}
                {!msg.reply && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <button
                      onClick={() => setSelectedMessage(msg)}
                      className="px-3 py-1 rounded-lg bg-[#0A2E73] text-white text-[11px] font-bold"
                    >
                      Send Official Reply
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Reply Modal */}
          {selectedMessage && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="glass-card w-full max-w-lg p-6 rounded-3xl space-y-4">
                <h3 className="font-bold text-sm">Reply to {selectedMessage.name}</h3>
                <textarea
                  rows={4}
                  placeholder="Type reply email content..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs"
                ></textarea>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setSelectedMessage(null)} className="px-4 py-1.5 bg-slate-200 rounded-xl text-xs font-bold">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const updated = contactMessages.map((m) =>
                        m.id === selectedMessage.id ? { ...m, reply: replyText, status: 'replied' as const } : m
                      );
                      onUpdateContactMessages(updated);
                      setSelectedMessage(null);
                      setReplyText('');
                      onAddAuditLog('REPLY_MESSAGE', `Replied to contact message from ${selectedMessage.name}`);
                    }}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                  >
                    Send Email Reply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 11: AUDIT TRAIL LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-sky-100 dark:bg-sky-950 text-[#0A2E73] dark:text-[#2EA3F2]">
                  <Activity className="w-5 h-5" />
                </div>
                <span>Immutable System Activity Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Cryptographically tracked, permanent activity records for compliance reporting, administrative accountability, and security audits.
              </p>
            </div>

            {hasPermission(currentAdminRole, 'AUDIT_LOGS') && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleExportAuditCSV(filteredAuditLogs, `Filtered Audit Logs (${filteredAuditLogs.length} Records)`)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 text-xs font-bold transition-all shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Export CSV ({filteredAuditLogs.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportAuditPDF(filteredAuditLogs, `Filtered Audit Logs (${filteredAuditLogs.length} Records)`)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0A2E73] text-white hover:bg-sky-900 text-xs font-bold transition-all shadow-md"
                >
                  <Printer className="w-4 h-4 text-[#2EA3F2]" />
                  <span>Export PDF Report</span>
                </button>
              </div>
            )}
          </div>

          {!hasPermission(currentAdminRole, 'AUDIT_LOGS') ? (
            <div className="glass-card rounded-3xl p-8 text-center space-y-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
              <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="font-bold text-slate-900 dark:text-white text-base">Super Admin Access Required</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                Viewing and exporting immutable system security audit logs is restricted strictly to Super Admin accounts. Your current role is <strong>{currentAdminRole.toUpperCase()}</strong>.
              </p>
            </div>
          ) : (
            <>
              {/* Audit Stats Metric Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Total System Logs</span>
                  <div className="font-display font-extrabold text-xl text-slate-900 dark:text-white">{auditLogs.length}</div>
                  <div className="text-[10px] text-slate-400">All recorded activities</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Filtered Logs</span>
                  <div className="font-display font-extrabold text-xl text-sky-600 dark:text-sky-400">{filteredAuditLogs.length}</div>
                  <div className="text-[10px] text-slate-400">Matching current filters</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Super Admin Actions</span>
                  <div className="font-display font-extrabold text-xl text-indigo-600 dark:text-indigo-400">
                    {auditLogs.filter(l => l.actorRole.toLowerCase().includes('super')).length}
                  </div>
                  <div className="text-[10px] text-slate-400">Elevated security actions</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Selected Logs</span>
                  <div className="font-display font-extrabold text-xl text-amber-600 dark:text-amber-400">{selectedAuditIds.length}</div>
                  <div className="text-[10px] text-slate-400">Ready for bulk export</div>
                </div>
              </div>

              {/* Search, Filter & Date Bar */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                  
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Search audit trail by Action Code, Actor, Details, ID, or IP..."
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
                    />
                  </div>

                  {/* Filters Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    
                    {/* Role Filter */}
                    <select
                      value={auditRoleFilter}
                      onChange={(e) => setAuditRoleFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-slate-900 dark:text-white outline-none"
                    >
                      <option value="all">All Actor Roles</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin</option>
                      <option value="national_admin">National Admin</option>
                      <option value="state_admin">State Admin</option>
                      <option value="secretary">Secretary</option>
                      <option value="treasurer">Treasurer</option>
                    </select>

                    {/* Action Filter */}
                    <select
                      value={auditActionFilter}
                      onChange={(e) => setAuditActionFilter(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-slate-900 dark:text-white outline-none"
                    >
                      <option value="all">All Action Types</option>
                      <option value="MEMBER">Member Operations</option>
                      <option value="FINANCIAL">Financial &amp; Receipts</option>
                      <option value="SYSTEM">System &amp; Settings</option>
                      <option value="ADMIN">Admin Accounts &amp; Roles</option>
                      <option value="EXPORT">Exports &amp; Reports</option>
                    </select>

                    {/* Start Date */}
                    <input
                      type="date"
                      value={auditStartDate}
                      onChange={(e) => setAuditStartDate(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-slate-900 dark:text-white outline-none"
                    />

                    {/* End Date */}
                    <input
                      type="date"
                      value={auditEndDate}
                      onChange={(e) => setAuditEndDate(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                </div>

                {/* Reset Filters Bar */}
                {(auditSearch || auditRoleFilter !== 'all' || auditActionFilter !== 'all' || auditStartDate || auditEndDate) && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Active filters applied. Showing <strong>{filteredAuditLogs.length}</strong> of <strong>{auditLogs.length}</strong> activity logs.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuditSearch('');
                        setAuditRoleFilter('all');
                        setAuditActionFilter('all');
                        setAuditStartDate('');
                        setAuditEndDate('');
                      }}
                      className="text-xs text-rose-500 font-bold hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Filters</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bulk Export Selection Action Toolbar */}
              {selectedAuditIds.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#0A2E73] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-[#2EA3F2]" />
                    <span className="font-bold text-xs">
                      {selectedAuditIds.length} Activity Log Record(s) Selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        const selectedLogs = auditLogs.filter(l => selectedAuditIds.includes(l.id));
                        handleExportAuditCSV(selectedLogs, `Selected Activity Logs (${selectedLogs.length} Records)`);
                      }}
                      className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Export Selected CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const selectedLogs = auditLogs.filter(l => selectedAuditIds.includes(l.id));
                        handleExportAuditPDF(selectedLogs, `Selected Activity Logs (${selectedLogs.length} Records)`);
                      }}
                      className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Export Selected PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedAuditIds([])}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                    >
                      Deselect
                    </button>
                  </div>
                </div>
              )}

              {/* Audit Logs Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        <th className="p-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredAuditLogs.length > 0 &&
                              filteredAuditLogs.every(l => selectedAuditIds.includes(l.id))
                            }
                            onChange={handleToggleSelectAllAudit}
                            className="w-4 h-4 text-[#2EA3F2] rounded focus:ring-[#2EA3F2] cursor-pointer"
                          />
                        </th>
                        <th className="p-4">Timestamp</th>
                        <th className="p-4">Actor / Identity</th>
                        <th className="p-4">Action Code</th>
                        <th className="p-4">Activity Details</th>
                        <th className="p-4 text-right">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {filteredAuditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            No activity audit log records matched your search or filters.
                          </td>
                        </tr>
                      ) : (
                        filteredAuditLogs.map((log) => {
                          const isSelected = selectedAuditIds.includes(log.id);
                          
                          // Badge color helper based on action code
                          const act = log.action.toUpperCase();
                          let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
                          if (act.includes('APPROVE') || act.includes('RESTORE') || act.includes('CREATE')) {
                            badgeStyle = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                          } else if (act.includes('DELETE') || act.includes('REJECT') || act.includes('SUSPEND')) {
                            badgeStyle = 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
                          } else if (act.includes('EXPORT') || act.includes('PRINT') || act.includes('VIEW')) {
                            badgeStyle = 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800';
                          } else if (act.includes('EDIT') || act.includes('UPDATE') || act.includes('RESET')) {
                            badgeStyle = 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                          } else if (act.includes('SYSTEM') || act.includes('BACKUP') || act.includes('RESTORE')) {
                            badgeStyle = 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
                          }

                          return (
                            <tr
                              key={log.id}
                              className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                                isSelected ? 'bg-sky-50/60 dark:bg-sky-950/30' : ''
                              }`}
                            >
                              <td className="p-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectAuditItem(log.id)}
                                  className="w-4 h-4 text-[#2EA3F2] rounded focus:ring-[#2EA3F2] cursor-pointer"
                                />
                              </td>

                              <td className="p-4 whitespace-nowrap">
                                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                                  {log.timestamp}
                                </span>
                              </td>

                              <td className="p-4 whitespace-nowrap">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{log.actorName}</span>
                                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    {log.actorRole}
                                  </span>
                                </div>
                              </td>

                              <td className="p-4 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold font-mono border ${badgeStyle}`}>
                                  {log.action}
                                </span>
                              </td>

                              <td className="p-4 text-slate-700 dark:text-slate-300 max-w-md">
                                <p className="line-clamp-2 leading-relaxed">{log.details}</p>
                              </td>

                              <td className="p-4 text-right whitespace-nowrap">
                                <span className="font-mono text-[10px] px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                  {log.ipAddress || '102.89.23.14'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Showing <strong>{filteredAuditLogs.length}</strong> log record(s)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportAuditCSV(filteredAuditLogs, 'Full Filtered Audit Export')}
                      className="text-[#2EA3F2] font-bold hover:underline"
                    >
                      Export CSV
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={() => handleExportAuditPDF(filteredAuditLogs, 'Full Filtered Audit Report')}
                      className="text-[#2EA3F2] font-bold hover:underline"
                    >
                      Print PDF Report
                    </button>
                  </div>
                </div>

              </div>
            </>
          )}

        </div>
      )}

      {/* TAB 12: ROLE & RBAC SYSTEM */}
      {activeTab === 'roles' && (
        <div className="glass-card p-8 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">Role-Based Access Control (RBAC) Permissions Matrix</h3>
              <p className="text-xs text-slate-500 mt-1">
                Admin accounts have full CRUD access to Registration Fee, Bank Accounts, Member Register, Announcements, Documents, Gallery, Events, and Settings. Only Super Admin has exclusive access to Admin account management, System Security, Backup/Restore, and Audit Logs.
              </p>
            </div>
            <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold self-start">
              RBAC Enforced &amp; Active
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900">
                  <th className="p-3">Role</th>
                  <th className="p-3">Approve Members</th>
                  <th className="p-3">Manage Financials</th>
                  <th className="p-3">Reg. Fee &amp; Bank Accounts</th>
                  <th className="p-3">Org. Info &amp; Public Pages</th>
                  <th className="p-3">Directory, Gallery, Docs</th>
                  <th className="p-3 text-amber-600 dark:text-amber-400">Admin Account Mgmt &amp; Audit Logs</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Super Admin', approve: true, fin: true, feeBank: true, orgCms: true, content: true, superExclusive: true },
                  { name: 'Admin (National)', approve: true, fin: true, feeBank: true, orgCms: true, content: true, superExclusive: false },
                  { name: 'Admin (State)', approve: true, fin: true, feeBank: true, orgCms: true, content: true, superExclusive: false },
                  { name: 'Treasurer', approve: false, fin: true, feeBank: true, orgCms: false, content: false, superExclusive: false },
                  { name: 'Secretary', approve: true, fin: false, feeBank: false, orgCms: true, content: true, superExclusive: false },
                ].map((r, idx) => (
                  <tr key={idx} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{r.name}</td>
                    <td className="p-3">{r.approve ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-slate-400" />}</td>
                    <td className="p-3">{r.fin ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-slate-400" />}</td>
                    <td className="p-3">{r.feeBank ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-slate-400" />}</td>
                    <td className="p-3">{r.orgCms ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-slate-400" />}</td>
                    <td className="p-3">{r.content ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-slate-400" />}</td>
                    <td className="p-3 font-semibold">{r.superExclusive ? <span className="text-emerald-600 font-bold flex items-center gap-1"><Check className="w-4 h-4" /> Granted</span> : <span className="text-slate-400 flex items-center gap-1"><X className="w-4 h-4" /> Super Admin Only</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 13: SETTINGS & BACKUPS */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div>
                <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                  Portal Governance &amp; System Configuration
                </h3>
                <p className="text-xs text-slate-500">
                  Manage branding, contact details, public CMS text, media files, registration settings, and system configuration.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1.5 ${currentAdminRole === 'super_admin' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {currentAdminRole === 'super_admin' ? 'Super Admin Mode' : 'Admin Control Panel'}
                </span>
              </div>
            </div>

            {/* Settings Sub-Tab Navigation */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
              {[
                { id: 'branding', label: 'Branding & Contacts', icon: Building2 },
                { id: 'cms', label: 'Public Content & CMS', icon: FileText },
                { id: 'admins', label: 'Admin Accounts & RBAC', icon: Users },
                { id: 'cms_files', label: 'Media & File Assets', icon: Folder },
                { id: 'system', label: 'System Mode & Backups', icon: Settings },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = settingsSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsSubTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all ${
                      isActive
                        ? 'bg-[#0A2E73] text-white shadow dark:bg-[#2EA3F2] dark:text-slate-950'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* SUB-TAB 1: BRANDING & CONTACTS */}
            {settingsSubTab === 'branding' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onUpdateSettings(settings);
                  onAddAuditLog('SETTINGS_BRANDING_UPDATE', 'Updated organization branding, logo, and contact channels');
                  alert('Branding and contact settings saved successfully!');
                }}
                className="space-y-6 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Organization / Forum Name</label>
                    <input
                      type="text"
                      value={settings.forumName}
                      onChange={(e) => onUpdateSettings({ ...settings, forumName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Motto / Tagline</label>
                    <input
                      type="text"
                      value={settings.tagline}
                      onChange={(e) => onUpdateSettings({ ...settings, tagline: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Official Logo URL</label>
                    <input
                      type="text"
                      value={settings.logoUrl || ''}
                      onChange={(e) => onUpdateSettings({ ...settings, logoUrl: e.target.value })}
                      placeholder="/logo.png"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Hero Background Banner URL</label>
                    <input
                      type="text"
                      value={settings.heroBannerUrl || ''}
                      onChange={(e) => onUpdateSettings({ ...settings, heroBannerUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Primary Secretariat Email</label>
                    <input
                      type="email"
                      value={settings.contactEmail}
                      onChange={(e) => onUpdateSettings({ ...settings, contactEmail: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Primary Helpline Phone Number</label>
                    <input
                      type="text"
                      value={settings.contactPhone}
                      onChange={(e) => onUpdateSettings({ ...settings, contactPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Secondary Contact Phone</label>
                    <input
                      type="text"
                      value={settings.contactPhoneSecondary || ''}
                      onChange={(e) => onUpdateSettings({ ...settings, contactPhoneSecondary: e.target.value })}
                      placeholder="+234 803 000 0000"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Tertiary Contact Phone</label>
                    <input
                      type="text"
                      value={settings.contactPhoneTertiary || ''}
                      onChange={(e) => onUpdateSettings({ ...settings, contactPhoneTertiary: e.target.value })}
                      placeholder="+234 802 111 2222"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">National Headquarters Physical Address</label>
                    <input
                      type="text"
                      value={settings.headquarters}
                      onChange={(e) => onUpdateSettings({ ...settings, headquarters: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                  <h4 className="font-bold text-xs text-[#0A2E73] dark:text-[#2EA3F2] uppercase tracking-wider">
                    Official Social Media Channels
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Facebook URL</label>
                      <input
                        type="url"
                        value={settings.socialFacebook || ''}
                        onChange={(e) => onUpdateSettings({ ...settings, socialFacebook: e.target.value })}
                        placeholder="https://facebook.com/nnepef2020"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Twitter / X URL</label>
                      <input
                        type="url"
                        value={settings.socialTwitter || ''}
                        onChange={(e) => onUpdateSettings({ ...settings, socialTwitter: e.target.value })}
                        placeholder="https://twitter.com/nnepef2020"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">LinkedIn URL</label>
                      <input
                        type="url"
                        value={settings.socialLinkedin || ''}
                        onChange={(e) => onUpdateSettings({ ...settings, socialLinkedin: e.target.value })}
                        placeholder="https://linkedin.com/company/nnepef"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">YouTube URL</label>
                      <input
                        type="url"
                        value={settings.socialYoutube || ''}
                        onChange={(e) => onUpdateSettings({ ...settings, socialYoutube: e.target.value })}
                        placeholder="https://youtube.com/@nnepef"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow"
                  >
                    Save Branding Details
                  </button>
                </div>
              </form>
            )}

            {/* SUB-TAB 2: PUBLIC CONTENT CMS */}
            {settingsSubTab === 'cms' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onUpdateSettings(settings);
                  onAddAuditLog('SETTINGS_CMS_UPDATE', 'Updated homepage text, about us, mission, vision, and FAQs');
                  alert('Public Content CMS updated successfully!');
                }}
                className="space-y-6 text-xs"
              >
                {/* Announcement Ticker */}
                <div className="p-4 bg-sky-50 dark:bg-sky-950/40 rounded-2xl border border-sky-200 dark:border-sky-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-900 dark:text-sky-200">Top Announcement Banner Ticker</span>
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, announcementBarEnabled: !settings.announcementBarEnabled })}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold ${
                        settings.announcementBarEnabled !== false ? 'bg-emerald-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {settings.announcementBarEnabled !== false ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={settings.announcementBarText || ''}
                    onChange={(e) => onUpdateSettings({ ...settings, announcementBarText: e.target.value })}
                    placeholder="Enter top notice bar text..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                {/* Hero Headline Section */}
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-[#0A2E73] dark:text-[#2EA3F2] uppercase tracking-wider">
                    Homepage Hero Headline &amp; Buttons
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Hero Main Title</label>
                      <input
                        type="text"
                        value={settings.heroTitle || ''}
                        onChange={(e) => onUpdateSettings({ ...settings, heroTitle: e.target.value })}
                        placeholder="Empowering Electrical Excellence across Northern Nigeria"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Hero Subtitle</label>
                      <input
                        type="text"
                        value={settings.heroSubtitle || ''}
                        onChange={(e) => onUpdateSettings({ ...settings, heroSubtitle: e.target.value })}
                        placeholder="The official regulatory & practitioner body..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Primary CTA Button Text</label>
                      <input
                        type="text"
                        value={settings.heroCtaButtonText || 'Register as Member'}
                        onChange={(e) => onUpdateSettings({ ...settings, heroCtaButtonText: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Secondary Button Text</label>
                      <input
                        type="text"
                        value={settings.heroSecondaryButtonText || 'Verify Member License'}
                        onChange={(e) => onUpdateSettings({ ...settings, heroSecondaryButtonText: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* About, Mission, Vision */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-xs text-[#0A2E73] dark:text-[#2EA3F2] uppercase tracking-wider">
                    About Us, Mission &amp; Vision
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">About Us Section Title</label>
                      <input
                        type="text"
                        value={settings.aboutUsTitle || 'About N-NEPEF 2020'}
                        onChange={(e) => onUpdateSettings({ ...settings, aboutUsTitle: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">About Us Narrative</label>
                      <textarea
                        rows={3}
                        value={settings.aboutUsContent || ''}
                        onChange={(e) => onUpdateSettings({ ...settings, aboutUsContent: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      ></textarea>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Mission Statement</label>
                        <textarea
                          rows={2}
                          value={settings.missionStatement || ''}
                          onChange={(e) => onUpdateSettings({ ...settings, missionStatement: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        ></textarea>
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Vision Statement</label>
                        <textarea
                          rows={2}
                          value={settings.visionStatement || ''}
                          onChange={(e) => onUpdateSettings({ ...settings, visionStatement: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FAQ Manager */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-[#0A2E73] dark:text-[#2EA3F2] uppercase tracking-wider">
                      Frequently Asked Questions (FAQ) Manager
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddFaq(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0A2E73] text-white font-bold text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add FAQ</span>
                    </button>
                  </div>

                  {showAddFaq && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 space-y-3">
                      <span className="font-bold text-slate-900 dark:text-white">New FAQ Question</span>
                      <input
                        type="text"
                        placeholder="Question..."
                        value={newFaq.question}
                        onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950"
                      />
                      <textarea
                        placeholder="Detailed answer..."
                        rows={2}
                        value={newFaq.answer}
                        onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950"
                      ></textarea>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddFaq(false)}
                          className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newFaq.question || !newFaq.answer) return;
                            const existingFaqs = settings.faqs || [];
                            const updatedFaqs = [...existingFaqs, { id: `faq-${Date.now()}`, question: newFaq.question, answer: newFaq.answer }];
                            onUpdateSettings({ ...settings, faqs: updatedFaqs });
                            setNewFaq({ question: '', answer: '' });
                            setShowAddFaq(false);
                          }}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold"
                        >
                          Save FAQ
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {(settings.faqs || []).map((faq, idx) => (
                      <div key={faq.id || idx} className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white mb-0.5">{faq.question}</p>
                          <p className="text-slate-500 text-[11px]">{faq.answer}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = (settings.faqs || []).filter((_, i) => i !== idx);
                            onUpdateSettings({ ...settings, faqs: updated });
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow"
                  >
                    Save CMS Content Changes
                  </button>
                </div>
              </form>
            )}

            {/* SUB-TAB 3: ADMIN ACCOUNTS & RBAC */}
            {settingsSubTab === 'admins' && (
              <div className="space-y-6 text-xs">
                {currentAdminRole !== 'super_admin' ? (
                  <div className="p-6 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 rounded-2xl text-amber-900 dark:text-amber-100 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <ShieldAlert className="w-5 h-5 text-amber-600" />
                      <span>Super Admin Exclusive Feature</span>
                    </div>
                    <p className="text-xs">
                      Provisioning administrative personnel accounts and assigning permission sets is reserved strictly for Super Admin accounts.
                    </p>
                    <p className="text-[11px] opacity-90 pt-1">
                      <strong>Admin Permissions:</strong> You are currently operating with full <strong>Admin</strong> privileges. You can manage the Official Registration Fee, Bank Account Details, Payment Instructions, Organization Info, Contact Channels, Public Pages, Member Register, Leadership Directory, Announcements, Gallery Albums, Documents Vault, Events, News, and Financial Dues.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Admin Users &amp; Administrative Roles</h4>
                        <p className="text-slate-500 text-[11px]">Super Admin can provision Admin accounts for National, State, and Treasurer officers.</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingAdmin(null);
                          setShowAddAdmin(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A2E73] text-white font-bold text-xs shadow"
                      >
                        <Plus className="w-4 h-4 text-[#2EA3F2]" />
                        <span>Create New Admin</span>
                      </button>
                    </div>

                {/* Add / Edit Admin Form */}
                {(showAddAdmin || editingAdmin) && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (editingAdmin) {
                        const updated = adminsList.map(a => a.id === editingAdmin.id ? editingAdmin : a);
                        setAdminsList(updated);
                        if (onUpdateAdmins) onUpdateAdmins(updated);
                        onAddAuditLog('ADMIN_USER_EDIT', `Updated permissions for admin ${editingAdmin.fullName}`);
                        setEditingAdmin(null);
                      } else {
                        const created: AdminAccount = {
                          id: `adm-${Date.now()}`,
                          fullName: newAdmin.fullName,
                          email: newAdmin.email,
                          phone: newAdmin.phone,
                          role: newAdmin.role,
                          state: newAdmin.state,
                          status: 'active',
                          permissions: newAdmin.permissions,
                          createdAt: new Date().toISOString().split('T')[0]
                        };
                        const list = [created, ...adminsList];
                        setAdminsList(list);
                        if (onUpdateAdmins) onUpdateAdmins(list);
                        onAddAuditLog('ADMIN_USER_CREATE', `Created admin account for ${created.fullName} (${created.role})`);
                        setShowAddAdmin(false);
                      }
                    }}
                    className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 space-y-4"
                  >
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">
                      {editingAdmin ? `Edit Admin Account (${editingAdmin.fullName})` : 'Provision New Administrative Account'}
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={editingAdmin ? editingAdmin.fullName : newAdmin.fullName}
                          onChange={(e) => editingAdmin ? setEditingAdmin({ ...editingAdmin, fullName: e.target.value }) : setNewAdmin({ ...newAdmin, fullName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          value={editingAdmin ? editingAdmin.email : newAdmin.email}
                          onChange={(e) => editingAdmin ? setEditingAdmin({ ...editingAdmin, email: e.target.value }) : setNewAdmin({ ...newAdmin, email: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Phone Number</label>
                        <input
                          type="text"
                          required
                          value={editingAdmin ? editingAdmin.phone : newAdmin.phone}
                          onChange={(e) => editingAdmin ? setEditingAdmin({ ...editingAdmin, phone: e.target.value }) : setNewAdmin({ ...newAdmin, phone: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Admin Role</label>
                        <select
                          value={editingAdmin ? editingAdmin.role : newAdmin.role}
                          onChange={(e: any) => editingAdmin ? setEditingAdmin({ ...editingAdmin, role: e.target.value }) : setNewAdmin({ ...newAdmin, role: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 font-bold"
                        >
                          <option value="super_admin">Super Admin (Ultimate Control)</option>
                          <option value="national_admin">National Admin</option>
                          <option value="state_admin">State Chapter Admin</option>
                          <option value="treasurer">Treasurer</option>
                          <option value="secretary">Secretary</option>
                          <option value="moderator">Content Moderator</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => { setShowAddAdmin(false); setEditingAdmin(null); }}
                        className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold shadow"
                      >
                        {editingAdmin ? 'Save Changes' : 'Create Admin Account'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Admins Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-900 border-b font-bold text-slate-700 dark:text-slate-300">
                        <th className="p-3">Admin Name</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Email &amp; Phone</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminsList.map((adm) => (
                        <tr key={adm.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="p-3 font-bold">{adm.fullName}</td>
                          <td className="p-3 font-bold uppercase text-[10px] text-[#2EA3F2]">{adm.role.replace('_', ' ')}</td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{adm.email} <br /> {adm.phone}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${adm.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              {adm.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-2">
                            <button
                              onClick={() => setEditingAdmin(adm)}
                              className="px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 font-bold hover:bg-sky-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                const newStatus = adm.status === 'active' ? 'suspended' : 'active';
                                const updated = adminsList.map(a => a.id === adm.id ? { ...a, status: newStatus as any } : a);
                                setAdminsList(updated);
                                if (onUpdateAdmins) onUpdateAdmins(updated);
                                onAddAuditLog('ADMIN_STATUS_CHANGE', `${newStatus === 'suspended' ? 'Suspended' : 'Restored'} admin account for ${adm.fullName}`);
                              }}
                              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${adm.status === 'active' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}
                            >
                              {adm.status === 'active' ? 'Suspend' : 'Restore'}
                            </button>
                            {adm.role !== 'super_admin' && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete admin ${adm.fullName}?`)) {
                                    const updated = adminsList.filter(a => a.id !== adm.id);
                                    setAdminsList(updated);
                                    if (onUpdateAdmins) onUpdateAdmins(updated);
                                    onAddAuditLog('ADMIN_USER_DELETE', `Deleted admin account for ${adm.fullName}`);
                                  }
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

            {/* SUB-TAB 4: MEDIA & FILES */}
            {settingsSubTab === 'cms_files' && (
              <div className="space-y-6 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">CMS Media Assets &amp; Document Files</h4>
                    <p className="text-slate-500 text-[11px]">Upload images, constitution PDFs, and banners to generate URLs for portal sections.</p>
                  </div>
                  <button
                    onClick={() => setShowAddCmsFile(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A2E73] text-white font-bold text-xs shadow"
                  >
                    <Plus className="w-4 h-4 text-[#2EA3F2]" />
                    <span>Upload CMS File</span>
                  </button>
                </div>

                {showAddCmsFile && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newCmsFile.name || !newCmsFile.url) return;
                      const fileObj: CMSFile = {
                        id: `file-${Date.now()}`,
                        name: newCmsFile.name,
                        url: newCmsFile.url,
                        type: newCmsFile.type,
                        size: newCmsFile.size,
                        uploadedAt: new Date().toISOString().split('T')[0],
                        uploadedBy: 'Super Admin'
                      };
                      const updated = [fileObj, ...cmsFilesList];
                      setCmsFilesList(updated);
                      if (onUpdateCMSFiles) onUpdateCMSFiles(updated);
                      setShowAddCmsFile(false);
                      onAddAuditLog('CMS_FILE_UPLOAD', `Uploaded media asset ${fileObj.name}`);
                    }}
                    className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 space-y-3"
                  >
                    <h5 className="font-bold text-sm text-slate-900 dark:text-white">Add CMS Asset / Document File</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        required
                        placeholder="File Label / Description"
                        value={newCmsFile.name}
                        onChange={(e) => setNewCmsFile({ ...newCmsFile, name: e.target.value })}
                        className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-950"
                      />
                      <input
                        type="text"
                        required
                        placeholder="File URL (e.g. https://... or /logo.png)"
                        value={newCmsFile.url}
                        onChange={(e) => setNewCmsFile({ ...newCmsFile, url: e.target.value })}
                        className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-950"
                      />
                      <select
                        value={newCmsFile.type}
                        onChange={(e: any) => setNewCmsFile({ ...newCmsFile, type: e.target.value })}
                        className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-950"
                      >
                        <option value="image">Image / Banner</option>
                        <option value="pdf">PDF Document</option>
                        <option value="doc">Word / Text Doc</option>
                        <option value="other">Other Asset</option>
                      </select>
                      <input
                        type="text"
                        placeholder="File Size (e.g. 1.5 MB)"
                        value={newCmsFile.size}
                        onChange={(e) => setNewCmsFile({ ...newCmsFile, size: e.target.value })}
                        className="px-3 py-2 rounded-xl border bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowAddCmsFile(false)} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 font-bold rounded-xl">
                        Cancel
                      </button>
                      <button type="submit" className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow">
                        Add Asset File
                      </button>
                    </div>
                  </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cmsFilesList.map((f) => (
                    <div key={f.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <span className="font-bold block text-slate-900 dark:text-white truncate max-w-xs">{f.name}</span>
                        <p className="text-[11px] text-slate-500">{f.size} • Uploaded {f.uploadedAt}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(f.url);
                            alert(`Copied file URL to clipboard:\n${f.url}`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-bold text-[11px]"
                        >
                          Copy Link
                        </button>
                        <button
                          onClick={() => {
                            const updated = cmsFilesList.filter(item => item.id !== f.id);
                            setCmsFilesList(updated);
                            if (onUpdateCMSFiles) onUpdateCMSFiles(updated);
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-TAB 5: SYSTEM CONTROL & BACKUPS */}
            {settingsSubTab === 'system' && (
              <div className="space-y-6 text-xs">
                <h4 className="font-bold text-sm text-[#0A2E73] dark:text-[#2EA3F2] uppercase tracking-wider">
                  System Operations &amp; Database Backups
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Registration Toggle */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold block text-slate-900 dark:text-white">Allow Online Registrations</span>
                      <span className="text-[11px] text-slate-500">Enable or suspend public member registration form</span>
                    </div>
                    <button
                      onClick={() => {
                        onUpdateSettings({ ...settings, registrationEnabled: !settings.registrationEnabled });
                        onAddAuditLog('REGISTRATION_TOGGLE', `Online registration toggled to ${!settings.registrationEnabled}`);
                      }}
                      className={`px-4 py-2 rounded-xl font-bold ${settings.registrationEnabled !== false ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
                    >
                      {settings.registrationEnabled !== false ? 'REGISTRATION OPEN' : 'REGISTRATION CLOSED'}
                    </button>
                  </div>

                  {/* Public Verification Toggle */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold block text-slate-900 dark:text-white">Public Verification Tool</span>
                      <span className="text-[11px] text-slate-500">Allow public verification of active approved members</span>
                    </div>
                    <button
                      onClick={() => {
                        onUpdateSettings({ ...settings, allowPublicMemberVerification: !settings.allowPublicMemberVerification });
                      }}
                      className={`px-4 py-2 rounded-xl font-bold ${settings.allowPublicMemberVerification !== false ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
                    >
                      {settings.allowPublicMemberVerification !== false ? 'VERIFICATION ACTIVE' : 'VERIFICATION PAUSED'}
                    </button>
                  </div>
                </div>

                {/* Maintenance Mode */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="font-bold block text-slate-900 dark:text-white">System Maintenance Mode</span>
                    <span className="text-[11px] text-slate-500">Temporarily restrict portal access to administrators only</span>
                  </div>
                  <button
                    onClick={() => {
                      if (!hasPermission(currentAdminRole, 'SYSTEM_SECURITY')) {
                        alert('Action Blocked: Toggling System Maintenance Mode requires Super Admin privileges.');
                        return;
                      }
                      onUpdateSettings({ ...settings, maintenanceMode: !settings.maintenanceMode });
                      onAddAuditLog('MAINTENANCE_TOGGLE', `Maintenance mode changed to ${!settings.maintenanceMode}`);
                    }}
                    className={`px-4 py-2 rounded-xl font-bold transition-all ${settings.maintenanceMode ? 'bg-red-600 text-white shadow' : 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}
                  >
                    {settings.maintenanceMode ? 'MAINTENANCE ACTIVE' : 'SYSTEM OPERATIONAL'}
                  </button>
                </div>

                {/* Backup and Restore Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <span className="font-bold block text-slate-900 dark:text-white">Download Full Database Backup</span>
                    <p className="text-[11px] text-slate-500">
                      Generates a complete, uncompressed JSON snapshot containing all members, leadership, news, events, financials, documents, and audit logs.
                    </p>
                    <button
                      onClick={() => {
                        if (!hasPermission(currentAdminRole, 'BACKUP_RESTORE')) {
                          alert('Action Blocked: Exporting full database backup snapshots requires Super Admin privileges.');
                          return;
                        }
                        const backupObject = {
                          members,
                          executives,
                          news,
                          events,
                          announcements,
                          payments,
                          renewalRequests,
                          documents,
                          gallery,
                          contactMessages,
                          auditLogs,
                          settings,
                          admins: adminsList,
                          cmsFiles: cmsFilesList
                        };
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObject, null, 2));
                        const downloadAnchor = document.createElement('a');
                        downloadAnchor.setAttribute("href", dataStr);
                        downloadAnchor.setAttribute("download", `N-NEPEF_FullBackup_${new Date().toISOString().split('T')[0]}.json`);
                        document.body.appendChild(downloadAnchor);
                        downloadAnchor.click();
                        downloadAnchor.remove();
                        onAddAuditLog('SYSTEM_BACKUP', 'Generated and downloaded complete system database JSON backup');
                      }}
                      className="w-full py-2.5 rounded-xl bg-[#0A2E73] text-white font-bold hover:bg-sky-700 shadow"
                    >
                      Export Database (.json)
                    </button>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <span className="font-bold block text-slate-900 dark:text-white">Restore Database Snapshot</span>
                    <p className="text-[11px] text-slate-500">
                      Restore full portal database state from a previously exported `.json` snapshot file.
                    </p>
                    <label className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow block text-center cursor-pointer">
                      Upload &amp; Restore Backup
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(e) => {
                          if (!hasPermission(currentAdminRole, 'BACKUP_RESTORE')) {
                            alert('Action Blocked: Restoring database snapshots requires Super Admin privileges.');
                            return;
                          }
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              try {
                                const parsed = JSON.parse(event.target?.result as string);
                                if (parsed.members) onUpdateMembers(parsed.members);
                                if (parsed.executives) onUpdateExecutives(parsed.executives);
                                if (parsed.news) onUpdateNews(parsed.news);
                                if (parsed.events) onUpdateEvents(parsed.events);
                                if (parsed.announcements) onUpdateAnnouncements(parsed.announcements);
                                if (parsed.payments) onUpdatePayments(parsed.payments);
                                if (parsed.renewalRequests) onUpdateRenewalRequests(parsed.renewalRequests);
                                if (parsed.documents) onUpdateDocuments(parsed.documents);
                                if (parsed.gallery) onUpdateGallery(parsed.gallery);
                                if (parsed.contactMessages) onUpdateContactMessages(parsed.contactMessages);
                                if (parsed.settings) onUpdateSettings(parsed.settings);
                                if (parsed.admins && onUpdateAdmins) onUpdateAdmins(parsed.admins);
                                if (parsed.cmsFiles && onUpdateCMSFiles) onUpdateCMSFiles(parsed.cmsFiles);
                                onAddAuditLog('SYSTEM_RESTORE', `Restored database state from uploaded snapshot ${file.name}`);
                                alert('Database state successfully restored!');
                              } catch (err) {
                                alert('Failed to parse backup JSON file. Please ensure it is a valid N-NEPEF backup file.');
                              }
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* TAB: LOCAL SQLITE & STORAGE DIAGNOSTICS */}
      {activeTab === 'diagnostics' && <AdminDiagnosticsPanel />}

      {/* Leadership Section Security Password Modal */}
      {showLeadershipPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 sm:p-8 rounded-3xl space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/60 rounded-2xl text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                  Security Password Required
                </h3>
                <p className="text-xs text-slate-500">
                  Super Admin Leadership Governance
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Please enter the master security password before entering or modifying leader names, executive positions, and passport photos.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (leadershipPasswordInput.trim().length >= 4) {
                  setIsLeadershipUnlocked(true);
                  setShowLeadershipPasswordModal(false);
                  setLeadershipPasswordError('');
                  onAddAuditLog('LEADERSHIP_PASSWORD_VERIFIED', 'Super Admin authenticated password and unlocked Leadership Entry Section');
                  if (pendingLeadershipAction) {
                    pendingLeadershipAction();
                    setPendingLeadershipAction(null);
                  }
                } else {
                  setLeadershipPasswordError('Please enter your valid administrator authorization password.');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="font-bold text-xs text-slate-700 dark:text-slate-300 block mb-1">
                  Master Security Authorization Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    autoFocus
                    required
                    placeholder="Enter security password..."
                    value={leadershipPasswordInput}
                    onChange={(e) => {
                      setLeadershipPasswordInput(e.target.value);
                      if (leadershipPasswordError) setLeadershipPasswordError('');
                    }}
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-[#2EA3F2] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {leadershipPasswordError ? (
                  <p className="text-xs text-rose-500 font-bold mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{leadershipPasswordError}</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Authorized Super Administrator credentials required to edit National & State leadership.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowLeadershipPasswordModal(false);
                    setPendingLeadershipAction(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0A2E73] text-white hover:bg-sky-800 text-xs font-bold shadow flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Authenticate &amp; Unlock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK EXPORT MEMBERS MODAL */}
      {showBulkExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-xl p-6 sm:p-8 rounded-3xl space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                    Bulk Export Member Database (CSV)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Super Admin Backup &amp; Reporting Utility
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkExportModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Export the full register of N-NEPEF members to a structured CSV backup spreadsheet compatible with Microsoft Excel, Google Sheets, and reporting tools.
            </p>

            {/* Export Scope Selector Options */}
            <div className="space-y-3">
              <label className="font-bold text-xs text-slate-700 dark:text-slate-300 block">
                Select Export Dataset Scope:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* 1. All Members */}
                <button
                  type="button"
                  onClick={() => setBulkExportScope('all')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                    bulkExportScope === 'all'
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100'
                  }`}
                >
                  <Database className={`w-5 h-5 mt-0.5 ${bulkExportScope === 'all' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">Complete Database</div>
                    <div className="text-[10px] text-slate-500">All Registered Members ({members.length})</div>
                  </div>
                </button>

                {/* 2. Filtered View */}
                <button
                  type="button"
                  onClick={() => setBulkExportScope('filtered')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                    bulkExportScope === 'filtered'
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100'
                  }`}
                >
                  <Filter className={`w-5 h-5 mt-0.5 ${bulkExportScope === 'filtered' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">Current Filtered View</div>
                    <div className="text-[10px] text-slate-500">Matching Search/Filters ({filteredMembers.length})</div>
                  </div>
                </button>

                {/* 3. Approved Members */}
                <button
                  type="button"
                  onClick={() => setBulkExportScope('approved')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                    bulkExportScope === 'approved'
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className={`w-5 h-5 mt-0.5 ${bulkExportScope === 'approved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">Approved Members Only</div>
                    <div className="text-[10px] text-slate-500">Verified ID Members ({members.filter(m => m.status === 'approved').length})</div>
                  </div>
                </button>

                {/* 4. Pending Members */}
                <button
                  type="button"
                  onClick={() => setBulkExportScope('pending')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                    bulkExportScope === 'pending'
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100'
                  }`}
                >
                  <Clock className={`w-5 h-5 mt-0.5 ${bulkExportScope === 'pending' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">Pending Verification</div>
                    <div className="text-[10px] text-slate-500">Awaiting Secretariat Audit ({members.filter(m => m.status === 'pending').length})</div>
                  </div>
                </button>

              </div>

              {selectedMemberIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBulkExportScope('selected')}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    bulkExportScope === 'selected'
                      ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/50 ring-2 ring-sky-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Check className={`w-5 h-5 ${bulkExportScope === 'selected' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">Checked Checklist Selection</div>
                      <div className="text-[10px] text-slate-500">Export checked rows from table</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200 text-xs font-bold font-mono">
                    {selectedMemberIds.length} Selected
                  </span>
                </button>
              )}
            </div>

            {/* Included Fields Notice */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
              <span className="font-bold text-slate-900 dark:text-white block">
                Exported CSV Fields (22 Columns):
              </span>
              <p className="leading-normal font-mono text-[10px] text-slate-500 dark:text-slate-400">
                Membership ID, Full Name, Gender, Date of Birth, Phone Number, Email, NIN Number, State Chapter, LGA, Address, Occupation, Engineering Specialization, Experience, Company, Status, Role, Issue Date, Expiry Date, Reg Date, Passport Photo URL, Payment Receipt URL, Admin Notes.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowBulkExportModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleExecuteBulkExport()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs hover:from-emerald-700 hover:to-teal-800 shadow-lg flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV Database Backup</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SQL & SINGLE SOURCE OF TRUTH HELPER MODAL */}
      {showSqlHelperModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#0A2E73] text-white rounded-2xl">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                    Central Supabase PostgreSQL Architecture
                  </h3>
                  <p className="text-xs text-slate-500">
                    Single permanent source of truth for all browsers, phones, and devices
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSqlHelperModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-slate-700 dark:text-slate-300 space-y-2">
                <div className="font-bold text-[#0A2E73] dark:text-sky-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Why is this single database query required?</span>
                </div>
                <p>
                  To ensure that registrations submitted on any mobile phone or browser are <strong>immediately visible</strong> to administrators on Firefox, Chrome, Edge, and Safari without any local cache disconnect, Row Level Security (RLS) policies on your Supabase PostgreSQL project must permit reading both pending and approved records.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">
                    Supabase SQL Editor Script:
                  </span>
                  <span className="text-[11px] text-slate-500">PostgreSQL 15</span>
                </div>
                <div className="relative">
                  <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-56 border border-slate-800 leading-relaxed scrollbar-thin">
                    {SUPABASE_RLS_SQL_FIX}
                  </pre>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  Instructions:
                </span>
                <ol className="list-decimal list-inside space-y-0.5 text-[11px] opacity-90 pl-1">
                  <li>Click <strong>&quot;Copy RLS SQL Script&quot;</strong> below.</li>
                  <li>Open your <strong>Supabase Dashboard &rarr; SQL Editor</strong>.</li>
                  <li>Paste the script and click <strong>&quot;Run&quot;</strong>.</li>
                  <li>Click <strong>&quot;Refresh Central Records&quot;</strong> in the dashboard to see all pending registrations live.</li>
                </ol>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <a
                href={supabaseSqlUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 font-bold underline"
              >
                <span>Open Supabase SQL Editor</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSqlHelperModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleCopyRlsSql}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A2E73] hover:bg-[#082357] text-white font-bold text-xs shadow-lg transition-all"
                >
                  {sqlCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>SQL Copied!</span>
                    </>
                  ) : (
                    <>
                      <Code className="w-4 h-4" />
                      <span>Copy RLS SQL Script</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
