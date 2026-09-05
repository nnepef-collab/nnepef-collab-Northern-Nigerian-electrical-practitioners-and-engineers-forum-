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
  NotificationItem, 
  RenewalRequest, 
  NotificationDeliveryLog, 
  AdminAccount, 
  CMSFile 
} from './types';

import {
  fetchMembersFromSupabase,
  fetchPaymentsFromSupabase,
  subscribeToMembers,
  saveMemberToSupabase,
  deleteMemberFromSupabase,
  updateMemberFieldsInSupabase,
  approveMemberOnServer,
  rejectMemberOnServer,
  fetchApprovedMembersFromSupabase,
  savePaymentToSupabase,
  saveSettingsToSupabase,
  fetchSettingsFromSupabase,
  fetchAnnouncementsFromSupabase,
  saveAnnouncementToSupabase,
  fetchNewsFromSupabase,
  saveNewsToSupabase,
  fetchExecutivesFromSupabase,
  saveExecutiveToSupabase,
  fetchEventsFromSupabase,
  saveEventToSupabase,
  fetchDocumentsFromSupabase,
  saveDocumentToSupabase,
  fetchGalleryFromSupabase,
  saveGalleryToSupabase,
  fetchContactMessagesFromSupabase,
  saveContactMessageToSupabase,
  fetchRenewalsFromSupabase,
  saveRenewalToSupabase,
  fetchCMSFilesFromSupabase,
  saveCMSFileToSupabase,
  fetchNotificationsFromSupabase,
  fetchAuditLogsFromSupabase,
  fetchSupabaseDiagnostics,
  fetchAdminsFromSupabase,
  saveAdminToSupabase,
  fetchNotificationDeliveryLogsFromSupabase,
  saveNotificationDeliveryLogToSupabase,
  saveAuditLogToSupabase,
  saveAndVerifyReceiptInSQLite,
  subscribeToPayments,
  subscribeToNotificationLogs,
  subscribeToNotifications,
  subscribeToAuditLogs,
  subscribeToSettings
} from './services/supabaseService';

import { 
  restoreSupabaseSession, 
  subscribeToAuthState, 
  signOutUser 
} from './services/supabaseAuthService';

import { dispatchEventNotification } from './utils/notificationDispatcher';

import { 
  initializeLocalDatabase, 
  getLocalPayments, 
  saveLocalPaymentsList, 
  saveLocalPayment,
  getLocalSettings, 
  saveLocalSettings, 
  getLocalAdmins, 
  saveLocalAdmins, 
  getLocalCMSFiles, 
  saveLocalCMSFiles,
  getLocalExecutives,
  saveLocalExecutives,
  getLocalNews,
  saveLocalNews,
  getLocalEvents,
  saveLocalEvents,
  getLocalAnnouncements,
  saveLocalAnnouncements,
  getLocalDocuments,
  saveLocalDocuments,
  getLocalGallery,
  saveLocalGallery,
  getLocalContactMessages,
  saveLocalContactMessages,
  getLocalRenewals,
  saveLocalRenewals,
  getLocalNotifications,
  saveLocalNotifications,
  getLocalDeliveryLogs,
  saveLocalDeliveryLogs,
  getLocalAuditLogs,
  addLocalAuditLog
} from './services/localDatabaseService';

import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { PublicHome } from './components/PublicHome';
import { MemberRegistration } from './components/MemberRegistration';
import { MemberVerification } from './components/MemberVerification';
import { MemberPortal } from './components/MemberPortal';
import { AdminDashboard } from './components/AdminDashboard';
import { NewsView } from './components/NewsView';
import { EventsView } from './components/EventsView';
import { GalleryView } from './components/GalleryView';
import { DocumentsView } from './components/DocumentsView';
import { LeadershipView } from './components/LeadershipView';
import { LoginModal } from './components/LoginModal';
import { Wrench, Lock } from 'lucide-react';

export default function App() {
  // Theme State
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Persistent Forum Settings State (Direct from Local Storage)
  const [settings, setSettings] = useState<ForumSettings>(() => getLocalSettings());

  // Persistent Admin Accounts State
  const [admins, setAdmins] = useState<AdminAccount[]>(() => getLocalAdmins());

  // Persistent CMS Files State
  const [cmsFiles, setCmsFiles] = useState<CMSFile[]>(() => getLocalCMSFiles());

  // Authoritative Application Data States (Supabase PostgreSQL is primary single source of truth for members)
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>(() => getLocalPayments());
  const [executives, setExecutives] = useState<Executive[]>(() => getLocalExecutives());
  const [news, setNews] = useState<NewsArticle[]>(() => getLocalNews());
  const [events, setEvents] = useState<EventItem[]>(() => getLocalEvents());
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => getLocalAnnouncements());
  const [renewalRequests, setRenewalRequests] = useState<RenewalRequest[]>(() => getLocalRenewals());
  const [documents, setDocuments] = useState<DocumentItem[]>(() => getLocalDocuments());
  const [gallery, setGallery] = useState<GalleryAlbum[]>(() => getLocalGallery());
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>(() => getLocalContactMessages());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => getLocalAuditLogs());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => getLocalNotifications());
  const [notificationLogs, setNotificationLogs] = useState<NotificationDeliveryLog[]>(() => getLocalDeliveryLogs());

  // User Auth & View State
  const [currentUser, setCurrentUser] = useState<Member | null>(() => {
    try {
      const saved = localStorage.getItem('nnepef_current_user') || sessionStorage.getItem('nnepef_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && (parsed.id || parsed.email || parsed.membershipId)) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nnepef_admin_logged_in') === 'true';
    } catch (e) {
      return false;
    }
  });

  const [currentView, setCurrentView] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.replace(/^#\/?/, '').trim();
        if (hash) return hash;
      }
      const savedView = sessionStorage.getItem('nnepef_current_view') || localStorage.getItem('nnepef_current_view');
      if (savedView && typeof savedView === 'string') {
        return savedView;
      }
    } catch (e) {}
    return 'home';
  });

  // Listen for hashchange and popstate events for robust navigation & Android/browser refresh
  useEffect(() => {
    const handleHashOrPop = () => {
      try {
        if (typeof window !== 'undefined' && window.location.hash) {
          const hash = window.location.hash.replace(/^#\/?/, '').trim();
          if (hash && hash !== currentView) {
            setCurrentView(hash);
          }
        }
      } catch (e) {}
    };
    window.addEventListener('hashchange', handleHashOrPop);
    window.addEventListener('popstate', handleHashOrPop);
    return () => {
      window.removeEventListener('hashchange', handleHashOrPop);
      window.removeEventListener('popstate', handleHashOrPop);
    };
  }, [currentView]);

  // Sync currentView state to URL hash and storage to survive mobile transitions, tab switches, and downloads
  useEffect(() => {
    try {
      if (currentView) {
        sessionStorage.setItem('nnepef_current_view', currentView);
        localStorage.setItem('nnepef_current_view', currentView);
        if (typeof window !== 'undefined') {
          const currentHash = window.location.hash.replace(/^#\/?/, '').trim();
          if (currentHash !== currentView) {
            window.history.replaceState(null, '', `#${currentView}`);
          }
        }
      }
    } catch (e) {}
  }, [currentView]);

  // Sync session states
  useEffect(() => {
    try {
      if (isAdminLoggedIn) {
        localStorage.setItem('nnepef_admin_logged_in', 'true');
        sessionStorage.setItem('nnepef_admin_logged_in', 'true');
        if (!localStorage.getItem('nnepef_current_admin')) {
          localStorage.setItem('nnepef_current_admin', JSON.stringify({ email: 'ahmadhussainiali2020@gmail.com', role: 'super_admin' }));
        }
      } else {
        localStorage.removeItem('nnepef_admin_logged_in');
        sessionStorage.removeItem('nnepef_admin_logged_in');
        localStorage.removeItem('nnepef_current_admin');
      }
    } catch (e) {}
  }, [isAdminLoggedIn]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('nnepef_current_user', JSON.stringify(currentUser));
        sessionStorage.setItem('nnepef_current_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('nnepef_current_user');
        sessionStorage.removeItem('nnepef_current_user');
      }
    } catch (e) {}
  }, [currentUser]);

  // Sync currentUser with updated members database record without erasing valid receipts
  useEffect(() => {
    if (!currentUser?.id || members.length === 0) return;
    const cleanEmail = (currentUser.email || '').trim().toLowerCase();
    const cleanId = (currentUser.membershipId || '').trim().toLowerCase();
    const latest = members.find(m => 
      m.id === currentUser.id || 
      (m.email && m.email.trim().toLowerCase() === cleanEmail) || 
      (m.membershipId && m.membershipId.trim().toLowerCase() === cleanId)
    );
    if (!latest) return;

    setCurrentUser(prev => {
      if (!prev) return null;
      const effectiveReceipt = latest.paymentReceiptUrl || prev.paymentReceiptUrl || '';
      const effectivePassport = latest.passportUrl || prev.passportUrl || '';

      const hasDiff = 
        latest.status !== prev.status ||
        effectiveReceipt !== prev.paymentReceiptUrl ||
        effectivePassport !== prev.passportUrl ||
        latest.membershipId !== prev.membershipId ||
        latest.fullName !== prev.fullName;

      if (!hasDiff) return prev;

      return {
        ...prev,
        ...latest,
        paymentReceiptUrl: effectiveReceipt,
        passportUrl: effectivePassport,
      };
    });
  }, [members, currentUser?.id]);

  // Direct authoritative fetch of members from Supabase on navigation
  useEffect(() => {
    if (
      currentView === 'members' || 
      currentView === 'verification' || 
      currentView === 'portal' || 
      currentView === 'admin-dashboard' || 
      currentView === 'home' ||
      currentView === 'executives'
    ) {
      fetchMembersFromSupabase().then((allMembers) => {
        if (allMembers && Array.isArray(allMembers)) {
          setMembers(allMembers);
        }
      }).catch((err) => console.warn('[App] Supabase members fetch warning:', err));
    }
  }, [currentView]);

  // Self-Contained Supabase Database Startup Load + Auth Session Restoration
  useEffect(() => {
    let isMounted = true;
    async function loadAuthoritativeData() {
      try {
        await initializeLocalDatabase();

        // 1. Restore auth session from Supabase Auth
        const sessionResult = await restoreSupabaseSession();
        if (isMounted && sessionResult && sessionResult.success) {
          if (sessionResult.admin || sessionResult.role === 'Super Admin' || sessionResult.role === 'Admin') {
            setIsAdminLoggedIn(true);
          }
          if (sessionResult.user) {
            setCurrentUser(sessionResult.user);
          }
        }

        // 2. Fetch authoritative data from Supabase
        const [
          freshMembers,
          freshPayments,
          freshSettings,
          freshAnnouncements,
          freshNews,
          freshExecutives,
          freshEvents,
          freshDocuments,
          freshGallery,
          freshContactMessages,
          freshRenewals,
          freshCMS,
          freshAudit,
          freshNotifs,
          freshAdmins,
          freshDeliveryLogs
        ] = await Promise.all([
          fetchMembersFromSupabase(),
          fetchPaymentsFromSupabase(),
          fetchSettingsFromSupabase(),
          fetchAnnouncementsFromSupabase(),
          fetchNewsFromSupabase(),
          fetchExecutivesFromSupabase(),
          fetchEventsFromSupabase(),
          fetchDocumentsFromSupabase(),
          fetchGalleryFromSupabase(),
          fetchContactMessagesFromSupabase(),
          fetchRenewalsFromSupabase(),
          fetchCMSFilesFromSupabase(),
          fetchAuditLogsFromSupabase(),
          fetchNotificationsFromSupabase(),
          fetchAdminsFromSupabase(),
          fetchNotificationDeliveryLogsFromSupabase()
        ]);
        if (isMounted) {
          setMembers(prev => JSON.stringify(prev) === JSON.stringify(freshMembers) ? prev : (freshMembers || []));
          setPayments(prev => JSON.stringify(prev) === JSON.stringify(freshPayments) ? prev : (freshPayments || []));
          setSettings(freshSettings || getLocalSettings());
          setAdmins(freshAdmins && freshAdmins.length > 0 ? freshAdmins : getLocalAdmins());
          setCmsFiles(freshCMS || getLocalCMSFiles());
          setExecutives(freshExecutives || getLocalExecutives());
          setNews(freshNews || getLocalNews());
          setEvents(freshEvents || getLocalEvents());
          setAnnouncements(freshAnnouncements || getLocalAnnouncements());
          setRenewalRequests(freshRenewals || getLocalRenewals());
          setDocuments(freshDocuments || getLocalDocuments());
          setGallery(freshGallery || getLocalGallery());
          setContactMessages(freshContactMessages || getLocalContactMessages());
          setAuditLogs(freshAudit || getLocalAuditLogs());
          setNotifications(freshNotifs || getLocalNotifications());
          setNotificationLogs(freshDeliveryLogs && freshDeliveryLogs.length > 0 ? freshDeliveryLogs : getLocalDeliveryLogs());
        }
      } catch (err) {
        console.error('🔴 [App Startup Error] Supabase/local startup error:', err);
      }
    }
    loadAuthoritativeData();

    // Listen to Supabase auth state changes (sign in, sign out, token refresh)
    const unsubAuth = subscribeToAuthState(async (event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT' || !session) {
        // Clean local session state
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const freshSession = await restoreSupabaseSession();
        if (isMounted && freshSession && freshSession.success) {
          if (freshSession.admin || freshSession.role === 'Super Admin' || freshSession.role === 'Admin') {
            setIsAdminLoggedIn(true);
          }
          if (freshSession.user) {
            setCurrentUser(freshSession.user);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      unsubAuth();
    };
  }, []);

  // Real-Time Local & Supabase Sync Subscriptions
  useEffect(() => {
    const unsubMembers = subscribeToMembers((data) => {
      if (data) {
        setMembers(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
      }
    });
    const unsubPayments = subscribeToPayments((data) => {
      if (data) {
        setPayments(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data);
      }
    });
    const unsubLogs = subscribeToNotificationLogs((data) => setNotificationLogs(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data));
    const unsubNotifs = subscribeToNotifications((data) => setNotifications(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data));
    const unsubAudit = subscribeToAuditLogs((data) => setAuditLogs(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data));
    const unsubSettings = subscribeToSettings((data) => setSettings(prev => JSON.stringify(prev) === JSON.stringify(data) ? prev : data));

    return () => {
      unsubMembers();
      unsubLogs();
      unsubNotifs();
      unsubAudit();
      unsubSettings();
      unsubPayments();
    };
  }, []);

  // Dark Mode side effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Handler for adding Audit Logs
  const handleAddAuditLog = (action: string, details: string) => {
    const actorName = isAdminLoggedIn ? 'Super Admin' : (currentUser?.fullName || 'System User');
    const actorRole = isAdminLoggedIn ? 'Super Admin' : (currentUser?.role || 'Member');
    const newLog = addLocalAuditLog(
      actorName,
      actorRole,
      action,
      details
    );
    setAuditLogs(prev => [newLog, ...prev]);
    saveAuditLogToSupabase(newLog);
  };

  // Register New Member (Authoritative Supabase PostgreSQL Save)
  const handleRegisterMember = async (newMember: Member) => {
    console.log('[handleRegisterMember] Registering member to Supabase:', newMember.id, newMember.fullName);

    const payRecord: PaymentRecord = {
      id: `pay-${newMember.id}`,
      memberId: newMember.id,
      memberName: newMember.fullName,
      membershipId: newMember.membershipId || 'PENDING ID',
      state: newMember.state,
      lga: newMember.lga,
      type: 'Registration Fee',
      amount: 10000,
      status: 'Pending',
      receiptUrl: newMember.paymentReceiptUrl || '',
      date: newMember.registeredAt || new Date().toISOString().split('T')[0],
      reference: `REG-${newMember.id.replace(/^m-/, '')}`,
      paymentMethod: 'Bank Transfer',
      remarks: 'Uploaded during online registration'
    };

    // Save to Supabase (authoritative PostgreSQL database)
    const savedMember = await saveMemberToSupabase(newMember);
    await savePaymentToSupabase(payRecord);

    try {
      const freshMembers = await fetchMembersFromSupabase();
      if (freshMembers && freshMembers.length > 0) {
        const hasSaved = freshMembers.some(m => m.id === savedMember.id);
        if (!hasSaved && savedMember) {
          setMembers([savedMember, ...freshMembers]);
        } else {
          setMembers(freshMembers);
        }
      } else if (savedMember) {
        setMembers(prev => [savedMember, ...prev.filter(m => m.id !== savedMember.id)]);
      }
    } catch (fetchErr) {
      console.warn('[App] Non-blocking notice fetching fresh members:', fetchErr);
    }

    try {
      const freshPayments = await fetchPaymentsFromSupabase();
      setPayments(freshPayments);
    } catch (payFetchErr) {
      console.warn('[App] Non-blocking notice fetching fresh payments:', payFetchErr);
    }

    handleAddAuditLog('MEMBER_REGISTER', `New registration submitted for ${newMember.fullName} (${newMember.state})`);

    // Dispatch Automatic Registration Received & Payment Pending Notifications
    try {
      const { logs: regLogs, inAppNotif } = await dispatchEventNotification({
        event: 'registration_received',
        member: savedMember,
        settings,
        reference: `REG-${newMember.id.substring(2)}`
      });
      if (regLogs.length > 0) {
        setNotificationLogs(prev => [...regLogs, ...prev]);
      }
      if (inAppNotif) {
        setNotifications(prev => [inAppNotif, ...prev]);
      }

      const { logs: payLogs } = await dispatchEventNotification({
        event: 'payment_pending',
        member: savedMember,
        settings,
        reference: `PAY-REG-${newMember.id.substring(2)}`,
        amount: 10000
      });
      if (payLogs.length > 0) {
        setNotificationLogs(prev => [...payLogs, ...prev]);
      }
    } catch (e) {
      console.warn('[Register] Notification dispatch warning:', e);
    }

    return savedMember;
  };

  // Update Members List
  const handleUpdateMembersList = (newList: Member[]) => {
    if (!newList) return;
    setMembers(newList);
  };

  // Update Single Member in Supabase with non-destructive merge
  const handleUpdateMember = async (updated: Member) => {
    if (!updated || !updated.id) return;
    await saveMemberToSupabase(updated);
    const fresh = await fetchMembersFromSupabase();
    setMembers(fresh);
  };

  // Explicit Permanent Delete (Admin delete from Supabase with immediate verification)
  const handleDeleteMemberPermanently = async (memberId: string) => {
    if (!memberId) return;
    const verified = await deleteMemberFromSupabase(memberId);
    setMembers(verified);
    if (currentUser?.id === memberId || currentUser?.membershipId === memberId) {
      setCurrentUser(null);
    }
  };

  // Update Payments List (Supabase Save)
  const handleUpdatePaymentsList = (newList: PaymentRecord[]) => {
    if (!newList) return;
    const verified = saveLocalPaymentsList(newList);
    setPayments(verified);
    newList.forEach(p => savePaymentToSupabase(p));
  };

  // Safe Settings Update (Supabase PostgreSQL Save)
  const handleUpdateSettings = async (newSettings: ForumSettings) => {
    if (!newSettings) return;
    const verified = await saveSettingsToSupabase(newSettings);
    setSettings(verified);
  };

  // Safe Admins Update
  const handleUpdateAdmins = (newAdmins: AdminAccount[]) => {
    if (!newAdmins) return;
    const verified = saveLocalAdmins(newAdmins);
    setAdmins(verified);
    newAdmins.forEach(a => saveAdminToSupabase(a));
  };

  // Safe CMS Files Update
  const handleUpdateCMSFiles = (newFiles: CMSFile[]) => {
    if (!newFiles) return;
    const verified = saveLocalCMSFiles(newFiles);
    setCmsFiles(verified);
    newFiles.forEach(f => saveCMSFileToSupabase(f));
  };

  // Safe Collections Updates
  const handleUpdateExecutives = (list: Executive[]) => {
    const verified = saveLocalExecutives(list);
    setExecutives(verified);
    list.forEach(e => saveExecutiveToSupabase(e));
  };

  const handleUpdateNews = (list: NewsArticle[]) => {
    const verified = saveLocalNews(list);
    setNews(verified);
    list.forEach(n => saveNewsToSupabase(n));
  };

  const handleUpdateEvents = (list: EventItem[]) => {
    const verified = saveLocalEvents(list);
    setEvents(verified);
    list.forEach(ev => saveEventToSupabase(ev));
  };

  const handleUpdateAnnouncements = (list: Announcement[]) => {
    const verified = saveLocalAnnouncements(list);
    setAnnouncements(verified);
    list.forEach(a => saveAnnouncementToSupabase(a));
  };

  const handleUpdateDocuments = (list: DocumentItem[]) => {
    const verified = saveLocalDocuments(list);
    setDocuments(verified);
    list.forEach(d => saveDocumentToSupabase(d));
  };

  const handleUpdateGallery = (list: GalleryAlbum[]) => {
    const verified = saveLocalGallery(list);
    setGallery(verified);
    list.forEach(g => saveGalleryToSupabase(g));
  };

  const handleUpdateContactMessages = (list: ContactMessage[]) => {
    const verified = saveLocalContactMessages(list);
    setContactMessages(verified);
    list.forEach(m => saveContactMessageToSupabase(m));
  };

  const handleUpdateRenewalRequests = (list: RenewalRequest[]) => {
    const verified = saveLocalRenewals(list);
    setRenewalRequests(verified);
    list.forEach(r => saveRenewalToSupabase(r));
  };

  const handleUpdateNotifications = (list: NotificationItem[]) => {
    const verified = saveLocalNotifications(list);
    setNotifications(verified);
  };

  const handleUpdateNotificationLogs = (list: NotificationDeliveryLog[]) => {
    const verified = saveLocalDeliveryLogs(list);
    setNotificationLogs(verified);
    list.forEach(l => saveNotificationDeliveryLogToSupabase(l));
  };

  // Submit Renewal Request
  const handleSubmitRenewal = async (newRequest: RenewalRequest, newPaymentRecord: PaymentRecord) => {
    const updatedRenewals = [newRequest, ...renewalRequests];
    const updatedPayments = [newPaymentRecord, ...payments];

    saveLocalRenewals(updatedRenewals);
    saveLocalPaymentsList(updatedPayments);
    setRenewalRequests(updatedRenewals);
    setPayments(updatedPayments);

    saveRenewalToSupabase(newRequest);
    savePaymentToSupabase(newPaymentRecord);

    if (newRequest.receiptUrl) {
      await saveAndVerifyReceiptInSQLite(newPaymentRecord, newRequest.memberId, newRequest.receiptUrl);
    }

    handleAddAuditLog('RENEWAL_SUBMITTED', `Member ${newRequest.fullName} (${newRequest.membershipId}) submitted ID card renewal request with receipt.`);

    const memberObj = members.find(m => m.id === newRequest.memberId || m.membershipId === newRequest.membershipId) || {
      id: newRequest.memberId,
      membershipId: newRequest.membershipId,
      fullName: newRequest.fullName,
      email: '',
      phone: '',
      gender: 'Male',
      dob: '',
      nin: '',
      state: newRequest.state,
      lga: newRequest.lga,
      address: '',
      occupation: '',
      specialization: '',
      yearsOfExperience: 0,
      category: 'Practitioner' as const,
      membershipTier: 'State' as const,
      status: 'pending' as const,
      paymentReceiptUrl: newRequest.receiptUrl || '',
      registeredAt: new Date().toISOString()
    };

    try {
      const { logs } = await dispatchEventNotification({
        event: 'renewal_submitted',
        member: memberObj,
        settings,
        reference: newRequest.id
      });
      if (logs.length > 0) {
        setNotificationLogs(prev => [...logs, ...prev]);
      }
    } catch (e) {
      console.warn('[Renewal] Notification dispatch warning:', e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 overflow-x-hidden w-full">
      
      {/* Top Main Navigation */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        isAdminLoggedIn={isAdminLoggedIn}
        setIsAdminLoggedIn={setIsAdminLoggedIn}
        settings={settings}
      />

      {/* Maintenance Mode Overlay */}
      {settings.maintenanceMode && !isAdminLoggedIn && currentView !== 'admin-login' && currentView !== 'admin-dashboard' ? (
        <div className="flex-grow flex items-center justify-center p-6 bg-slate-900 text-white text-center">
          <div className="max-w-md space-y-6 glass-card p-8 rounded-3xl border border-amber-500/30">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto">
              <Wrench className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display font-bold text-2xl">Scheduled Maintenance</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                N-NEPEF 2020 Portal is currently undergoing system upgrades. Public access and Member Portal services are temporarily suspended.
              </p>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl text-[11px] text-slate-300 space-y-1 text-left font-mono">
              <div>Secretariat Helpline: {settings.contactPhone}</div>
              <div>Official Email: {settings.contactEmail}</div>
            </div>
            <button
              onClick={() => setCurrentView('admin-login')}
              className="px-6 py-2.5 rounded-xl bg-[#2EA3F2] text-slate-950 font-extrabold text-xs hover:bg-sky-400 transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <Lock className="w-4 h-4" />
              <span>Admin Personnel Login</span>
            </button>
          </div>
        </div>
      ) : (
        /* Main Content View Switcher */
        <main className="flex-grow">
          {currentView === 'home' && (
            <PublicHome
              setCurrentView={setCurrentView}
              executives={executives}
              news={news}
              events={events}
              announcements={announcements}
              gallery={gallery}
              members={members}
              settings={settings}
            />
          )}

          {currentView === 'register' && (
            <MemberRegistration
              settings={settings}
              onRegister={handleRegisterMember}
              setCurrentView={setCurrentView}
            />
          )}

          {currentView === 'verify' && (
            <MemberVerification
              members={members}
              setCurrentView={setCurrentView}
            />
          )}

          {currentView === 'news' && (
            <NewsView
              news={news}
              setCurrentView={setCurrentView}
            />
          )}

          {currentView === 'events' && (
            <EventsView
              events={events}
              setCurrentView={setCurrentView}
            />
          )}

          {currentView === 'gallery' && (
            <GalleryView
              gallery={gallery}
              setCurrentView={setCurrentView}
            />
          )}

          {currentView === 'documents' && (
            <DocumentsView
              documents={documents}
              setCurrentView={setCurrentView}
            />
          )}

          {currentView === 'leadership' && (
            <LeadershipView
              executives={executives}
              setCurrentView={setCurrentView}
              settings={settings}
            />
          )}

          {currentView === 'portal' && (
            currentUser ? (
              <MemberPortal
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
                onUpdateMember={handleUpdateMember}
                events={events}
                announcements={announcements}
                payments={payments}
                documents={documents}
                notifications={notifications}
                settings={settings}
                onSubmitRenewal={handleSubmitRenewal}
                setCurrentView={setCurrentView}
              />
            ) : (
              <LoginModal
                mode="member"
                members={members}
                admins={admins}
                logoUrl={settings?.logoUrl}
                onLoginMemberSuccess={(member) => {
                  setCurrentUser(member);
                  setCurrentView('portal');
                }}
                onLoginAdminSuccess={() => {
                  setIsAdminLoggedIn(true);
                  setCurrentView('admin-dashboard');
                }}
                setCurrentView={setCurrentView}
              />
            )
          )}

          {currentView === 'portal-login' && (
            <LoginModal
              mode="member"
              members={members}
              admins={admins}
              logoUrl={settings?.logoUrl}
              onLoginMemberSuccess={(member) => {
                setCurrentUser(member);
                setCurrentView('portal');
              }}
              onLoginAdminSuccess={() => {
                setIsAdminLoggedIn(true);
                setCurrentView('admin-dashboard');
              }}
              setCurrentView={setCurrentView}
            />
          )}

          {currentView === 'admin-login' && (
            <LoginModal
              mode="admin"
              members={members}
              admins={admins}
              logoUrl={settings?.logoUrl}
              onLoginMemberSuccess={(member) => {
                setCurrentUser(member);
                setCurrentView('portal');
              }}
              onLoginAdminSuccess={() => {
                setIsAdminLoggedIn(true);
                setCurrentView('admin-dashboard');
              }}
              setCurrentView={setCurrentView}
            />
          )}

          {currentView === 'admin-dashboard' && (
            isAdminLoggedIn ? (
              <AdminDashboard
                members={members}
                onUpdateMembers={handleUpdateMembersList}
                onDeleteMemberPermanently={handleDeleteMemberPermanently}
                onUpdateSingleMember={handleUpdateMember}
                executives={executives}
                onUpdateExecutives={handleUpdateExecutives}
                news={news}
                onUpdateNews={handleUpdateNews}
                events={events}
                onUpdateEvents={handleUpdateEvents}
                announcements={announcements}
                onUpdateAnnouncements={handleUpdateAnnouncements}
                payments={payments}
                onUpdatePayments={handleUpdatePaymentsList}
                renewalRequests={renewalRequests}
                onUpdateRenewalRequests={handleUpdateRenewalRequests}
                documents={documents}
                onUpdateDocuments={handleUpdateDocuments}
                gallery={gallery}
                onUpdateGallery={handleUpdateGallery}
                contactMessages={contactMessages}
                onUpdateContactMessages={handleUpdateContactMessages}
                auditLogs={auditLogs}
                onAddAuditLog={handleAddAuditLog}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                admins={admins}
                onUpdateAdmins={handleUpdateAdmins}
                cmsFiles={cmsFiles}
                onUpdateCMSFiles={handleUpdateCMSFiles}
                notifications={notifications}
                onUpdateNotifications={handleUpdateNotifications}
                notificationLogs={notificationLogs}
                onUpdateNotificationLogs={handleUpdateNotificationLogs}
                setCurrentView={setCurrentView}
                onLogout={() => {
                  signOutUser();
                  setIsAdminLoggedIn(false);
                  setCurrentUser(null);
                  setCurrentView('home');
                }}
              />
            ) : (
              <LoginModal
                mode="admin"
                members={members}
                admins={admins}
                logoUrl={settings?.logoUrl}
                onLoginMemberSuccess={(m) => setCurrentUser(m)}
                onLoginAdminSuccess={() => {
                  setIsAdminLoggedIn(true);
                  setCurrentView('admin-dashboard');
                }}
                setCurrentView={setCurrentView}
              />
            )
          )}
        </main>
      )}

      {/* Main Corporate Footer */}
      <Footer setCurrentView={setCurrentView} settings={settings} />

    </div>
  );
}
