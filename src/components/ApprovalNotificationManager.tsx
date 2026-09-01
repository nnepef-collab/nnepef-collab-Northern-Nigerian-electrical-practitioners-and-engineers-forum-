import React, { useState, useEffect } from 'react';
import { Member, ForumSettings, NotificationDeliveryLog, NotificationItem } from '../types';
import { dispatchEventNotification } from '../utils/notificationDispatcher';
import { saveNotificationLogToSQLite, deleteNotificationLogFromSQLite, clearAllNotificationLogsFromSQLite } from '../services/sqliteService';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Send, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Sliders, 
  Eye, 
  FileText, 
  Sparkles,
  ShieldCheck,
  RotateCcw,
  UserCheck,
  Users,
  User,
  Trash2,
  CheckSquare,
  Square,
  Info,
  Filter,
  Layers,
  ChevronRight,
  Server,
  Zap,
  Radio
} from 'lucide-react';

interface ApprovalNotificationManagerProps {
  settings: ForumSettings;
  onUpdateSettings: (settings: ForumSettings) => void;
  notificationLogs: NotificationDeliveryLog[];
  onUpdateNotificationLogs: (logs: NotificationDeliveryLog[]) => void;
  notifications?: NotificationItem[];
  onUpdateNotifications?: (notifs: NotificationItem[]) => void;
  members: Member[];
  onAddAuditLog: (action: string, details: string) => void;
  currentAdminRole?: string;
}

export function formatWelcomeTemplate(
  template: string,
  data: { fullName: string; membershipId: string; position: string; approvalDate: string }
): string {
  return template
    .replace(/\{Full Name\}/g, data.fullName)
    .replace(/\{Membership ID\}/g, data.membershipId)
    .replace(/\{Position\}/g, data.position)
    .replace(/\{Approval Date\}/g, data.approvalDate);
}

export const ApprovalNotificationManager: React.FC<ApprovalNotificationManagerProps> = ({
  settings,
  onUpdateSettings,
  notificationLogs,
  onUpdateNotificationLogs,
  notifications = [],
  onUpdateNotifications,
  members,
  onAddAuditLog,
  currentAdminRole = 'admin',
}) => {
  const isAuthorized = currentAdminRole === 'super_admin' || currentAdminRole === 'admin' || currentAdminRole?.includes('Admin');

  // Main Sub-Tab State
  const [activeSubTab, setActiveSubTab] = useState<'compose' | 'settings' | 'logs'>('compose');

  // Server Integration Status
  const [serverStatus, setServerStatus] = useState<{
    simulationMode: boolean;
    email: { configured: boolean; activeProvider: string; senderEmail: string; brevoApiKeyConfigured: boolean; smtpConfigured: boolean; smtpHost: string; smtpPort: string };
    sms: { configured: boolean; activeProvider: string; twilioConfigured: boolean; termiiConfigured: boolean };
    whatsapp: { configured: boolean; activeProvider: string };
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Test Email State
  const [testEmailRecipient, setTestEmailRecipient] = useState('admin@nepef.org.ng');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; provider?: string; messageId?: string; error?: string } | null>(null);

  // Fetch real notification status from Express backend
  const fetchServerStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/notifications/status');
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch notification server status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchServerStatus();
  }, []);

  // Handle Send Test Email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailRecipient.trim()) {
      showToast('error', 'Please enter a test recipient email address.');
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: testEmailRecipient.trim(),
          memberName: 'N-NEPEF Verified Admin',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          provider: data.provider,
          messageId: data.messageId,
        });
        showToast('success', `Test email successfully sent via ${data.provider}! Message ID: ${data.messageId}`);
        if (data.log) {
          const newLog: NotificationDeliveryLog = {
            id: data.log.id,
            recipientName: data.log.member_name,
            recipientEmail: testEmailRecipient.trim(),
            recipientPhone: 'N/A',
            membershipId: 'ADMIN',
            channel: 'Email',
            subject: data.log.subject,
            message: data.log.message,
            status: 'Sent',
            sentAt: new Date().toLocaleString(),
            provider: data.provider,
            messageId: data.messageId,
          };
          onUpdateNotificationLogs([newLog, ...notificationLogs]);
        }
      } else {
        setTestResult({
          success: false,
          error: data.error || data.errorMessage || 'Email delivery configuration missing.',
        });
        showToast('error', `Test email failed: ${data.error || 'Configuration missing.'}`);
      }
    } catch (err) {
      const errorStr = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, error: errorStr });
      showToast('error', `Test email failed: ${errorStr}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  // ==================== COMPOSE CUSTOM MESSAGE STATE ====================
  const [recipientMode, setRecipientMode] = useState<'single' | 'selected' | 'all'>('single');
  const [selectedSingleMemberId, setSelectedSingleMemberId] = useState<string>(members[0]?.id || '');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberStateFilter, setMemberStateFilter] = useState('all');

  const [deliveryMethod, setDeliveryMethod] = useState<'Email' | 'SMS' | 'WhatsApp' | 'Both' | 'All'>('Both');
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Filtered members for member selector
  const filteredMembersForSelection = members.filter(m => {
    const matchesSearch = 
      m.fullName.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      m.phone.includes(memberSearchQuery) ||
      (m.membershipId && m.membershipId.toLowerCase().includes(memberSearchQuery.toLowerCase()));
    const matchesState = memberStateFilter === 'all' || m.state === memberStateFilter;
    return matchesSearch && matchesState;
  });

  const handleToggleSelectMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter(i => i !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredMembersForSelection.map(m => m.id);
    const combined = Array.from(new Set([...selectedMemberIds, ...ids]));
    setSelectedMemberIds(combined);
  };

  const handleDeselectAll = () => {
    setSelectedMemberIds([]);
  };

  // Dispatch Custom Message
  const handleSendCustomNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customSubject.trim() || !customMessage.trim()) {
      showToast('error', 'Please enter both Subject and Message body.');
      return;
    }

    // Determine target members list
    let targetMembers: Member[] = [];
    if (recipientMode === 'single') {
      const target = members.find(m => m.id === selectedSingleMemberId);
      if (!target) {
        showToast('error', 'Please select a valid target member.');
        return;
      }
      targetMembers = [target];
    } else if (recipientMode === 'selected') {
      targetMembers = members.filter(m => selectedMemberIds.includes(m.id));
      if (targetMembers.length === 0) {
        showToast('error', 'Please select at least one member from the list.');
        return;
      }
    } else {
      targetMembers = members;
      if (targetMembers.length === 0) {
        showToast('error', 'No members found in system database.');
        return;
      }
    }

    setIsSending(true);

    try {
      const newLogs: NotificationDeliveryLog[] = [];
      const newInAppNotifs: NotificationItem[] = [];

      for (const member of targetMembers) {
        const { logs: generatedLogs, inAppNotif } = await dispatchEventNotification({
          event: 'custom_message',
          member,
          settings,
          customSubject: customSubject.trim(),
          customMessage: customMessage.trim(),
          deliveryMethod
        });

        newLogs.push(...generatedLogs);
        if (inAppNotif) {
          newInAppNotifs.push(inAppNotif);
        }
      }

      // Update state & audit log
      if (newLogs.length > 0) {
        onUpdateNotificationLogs([...newLogs, ...notificationLogs]);
      }
      if (newInAppNotifs.length > 0 && onUpdateNotifications) {
        onUpdateNotifications([...newInAppNotifs, ...notifications]);
      }

      onAddAuditLog(
        'CUSTOM_NOTIFICATION_DISPATCH',
        `Dispatched custom notification ("${customSubject}") via ${deliveryMethod} to ${targetMembers.length} member(s).`
      );

      showToast('success', `Notification dispatched to ${targetMembers.length} recipient(s) via ${deliveryMethod}. Check Delivery History for real status.`);
      setCustomSubject('');
      setCustomMessage('');
      if (recipientMode === 'selected') setSelectedMemberIds([]);
    } catch (err) {
      console.error('Failed to dispatch notifications:', err);
      showToast('error', 'Failed to send notification. Please check server configurations.');
    } finally {
      setIsSending(false);
    }
  };

  // ==================== AUTO TEMPLATE SETTINGS STATE ====================
  const [templateForm, setTemplateForm] = useState({
    emailNotifications: settings.emailNotifications ?? true,
    smsNotifications: settings.smsNotifications ?? true,
    pushNotifications: settings.pushNotifications ?? true,
    welcomeEmailSubject: settings.welcomeEmailSubject || 'N-NEPEF 2020 Membership Approved',
    senderName: settings.senderName || 'Northern Nigerian Electrical Practitioners & Engineers Forum (N-NEPEF 2020)',
    senderEmail: settings.senderEmail || 'admin@nepef.org.ng',
    welcomeMessageTemplate: settings.welcomeMessageTemplate || `Congratulations!\nYour N-NEPEF 2020 membership registration has been successfully approved.\n\nYou can now log in to your account and access all member services.\n\nThank you for being part of N-NEPEF 2020.`,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      emailNotifications: templateForm.emailNotifications,
      smsNotifications: templateForm.smsNotifications,
      pushNotifications: templateForm.pushNotifications,
      welcomeEmailSubject: templateForm.welcomeEmailSubject,
      senderName: templateForm.senderName,
      senderEmail: templateForm.senderEmail,
      welcomeMessageTemplate: templateForm.welcomeMessageTemplate,
    });
    onAddAuditLog('UPDATE_NOTIFICATION_SETTINGS', 'Updated automated approval email/SMS template and settings');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // ==================== DELIVERY LOGS SEARCH & FILTER ====================
  const [logSearch, setLogSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewLogModal, setViewLogModal] = useState<NotificationDeliveryLog | null>(null);

  const filteredLogs = notificationLogs.filter((log) => {
    const matchesSearch =
      log.recipientName.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.recipientEmail.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.recipientPhone.includes(logSearch) ||
      (log.membershipId && log.membershipId.toLowerCase().includes(logSearch.toLowerCase())) ||
      log.subject.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.message.toLowerCase().includes(logSearch.toLowerCase()) ||
      (log.provider && log.provider.toLowerCase().includes(logSearch.toLowerCase()));

    const matchesChannel = channelFilter === 'all' || log.channel.toLowerCase() === channelFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || log.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesChannel && matchesStatus;
  });

  // Resend Notification from History Log via Backend API
  const handleResendNotification = async (log: NotificationDeliveryLog) => {
    const targetMember = members.find(m => m.email === log.recipientEmail || m.phone === log.recipientPhone || m.fullName === log.recipientName);
    const recipient = log.channel === 'Email' ? log.recipientEmail : log.recipientPhone;

    try {
      const res = await fetch('/api/notifications/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId: log.id,
          type: log.channel === 'Email' ? 'email' : log.channel === 'WhatsApp' ? 'whatsapp' : 'sms',
          recipient,
          memberName: log.recipientName,
          membershipId: log.membershipId,
          subject: log.subject,
          customMessage: log.message,
          memberId: targetMember?.id,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        showToast('success', `Notification re-sent successfully via ${resData.provider}! Message ID: ${resData.messageId}`);
        if (resData.log) {
          const updatedLog: NotificationDeliveryLog = {
            id: resData.log.id,
            recipientName: resData.log.member_name,
            recipientEmail: log.recipientEmail,
            recipientPhone: log.recipientPhone,
            membershipId: resData.log.membership_id,
            channel: log.channel,
            subject: resData.log.subject,
            message: resData.log.message,
            status: resData.log.status === 'Sent' ? 'Sent' : 'Failed',
            sentAt: new Date().toLocaleString(),
            provider: resData.provider,
            messageId: resData.messageId,
            errorMessage: resData.log.error_message || undefined,
          };
          onUpdateNotificationLogs([updatedLog, ...notificationLogs]);
          await saveNotificationLogToSQLite(updatedLog);
        }
      } else {
        showToast('error', `Resend failed: ${resData.error || resData.errorMessage || 'Configuration error'}`);
      }
    } catch (err) {
      showToast('error', `Resend request error: ${err instanceof Error ? err.message : String(err)}`);
    }

    onAddAuditLog('NOTIFICATION_RESEND', `Attempted resend for ${log.channel} notification to ${log.recipientName}`);
  };

  // Delete Individual Log Item
  const handleDeleteLog = async (logId: string) => {
    if (!window.confirm('Are you sure you want to delete this notification record from history?')) return;

    await deleteNotificationLogFromSQLite(logId);
    const updated = notificationLogs.filter(l => l.id !== logId);
    onUpdateNotificationLogs(updated);
    onAddAuditLog('NOTIFICATION_LOG_DELETE', `Deleted notification log entry ID: ${logId}`);
    showToast('success', 'Notification log deleted.');
  };

  // Clear All History Logs
  const handleClearAllLogs = async () => {
    if (notificationLogs.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently clear all ${notificationLogs.length} notification history records? This cannot be undone.`)) {
      return;
    }

    await clearAllNotificationLogsFromSQLite(notificationLogs);
    onUpdateNotificationLogs([]);
    onAddAuditLog('NOTIFICATION_LOG_CLEAR_ALL', 'Cleared all notification delivery history logs');
    showToast('success', 'All notification history logs have been cleared.');
  };

  if (!isAuthorized) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 p-8 rounded-3xl border border-rose-200 dark:border-rose-900 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
        <h3 className="font-display font-bold text-lg text-rose-900 dark:text-rose-200">Access Restricted</h3>
        <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
          Only authenticated Admins and Super Admins can dispatch member notifications and manage logs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-sky-100 dark:bg-sky-950 text-[#0A2E73] dark:text-[#2EA3F2]">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-white">
                Member Notification Center
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real Email (Brevo / SMTP), SMS (Twilio / Termii), and WhatsApp delivery engine with delivery verification.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 self-stretch sm:self-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('compose')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'compose'
                ? 'bg-[#0A2E73] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Send className="w-4 h-4 text-[#2EA3F2]" />
            <span>Compose Message</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'settings'
                ? 'bg-[#0A2E73] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 text-[#2EA3F2]" />
            <span>Auto Rules &amp; Templates</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('logs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeSubTab === 'logs'
                ? 'bg-[#0A2E73] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-[#2EA3F2]" />
            <span>Delivery History ({notificationLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Live Server Configuration & Delivery Status Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#2EA3F2]" />
            <span className="font-display font-bold text-sm">Active Notification Delivery Providers</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              SIMULATION DISABLED
            </span>
          </div>

          <button
            type="button"
            onClick={fetchServerStatus}
            disabled={statusLoading}
            className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Status</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Email Provider Status */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sky-300">
                <Mail className="w-4 h-4" />
                <span>Email Provider</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                serverStatus?.email.configured
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {serverStatus?.email.configured ? serverStatus.email.activeProvider : 'Missing Keys'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {serverStatus?.email.configured
                ? `Ready via ${serverStatus.email.activeProvider} (${serverStatus.email.senderEmail})`
                : 'Set BREVO_API_KEY or SMTP_USER/SMTP_PASS in env variables.'}
            </p>
          </div>

          {/* SMS Provider Status */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Smartphone className="w-4 h-4" />
                <span>SMS Provider</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                serverStatus?.sms.configured
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}>
                {serverStatus?.sms.configured ? serverStatus.sms.activeProvider : 'Not Set'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {serverStatus?.sms.configured
                ? `Ready via ${serverStatus.sms.activeProvider}`
                : 'Set TWILIO_ACCOUNT_SID or TERMII_API_KEY in env variables.'}
            </p>
          </div>

          {/* WhatsApp Provider Status */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Cloud API</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                serverStatus?.whatsapp.configured
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {serverStatus?.whatsapp.configured ? 'Active' : 'Not Set'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {serverStatus?.whatsapp.configured
                ? 'Ready via Meta WhatsApp Cloud API'
                : 'Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN.'}
            </p>
          </div>
        </div>

        {/* Real Test Email Delivery Tool */}
        <form onSubmit={handleSendTestEmail} className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Mail className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <input
              type="email"
              required
              placeholder="Enter recipient email for live delivery test..."
              value={testEmailRecipient}
              onChange={(e) => setTestEmailRecipient(e.target.value)}
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSendingTest}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Zap className="w-4 h-4 fill-current text-amber-300" />
            <span>{isSendingTest ? 'Sending Real Email...' : 'Send Test Email'}</span>
          </button>
        </form>

        {testResult && (
          <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between border ${
            testResult.success
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
          }`}>
            <div>
              {testResult.success ? (
                <span>✅ Real Email Delivered via <strong>{testResult.provider}</strong> (Message ID: {testResult.messageId})</span>
              ) : (
                <span>⚠️ Email Delivery Failed: <strong>{testResult.error}</strong></span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setTestResult(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Toast Banner */}
      {toastMessage && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 shadow-md transition-all ${
          toastMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100'
            : 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* SUB-TAB 1: COMPOSE CUSTOM MESSAGE */}
      {activeSubTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Form */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-[#2EA3F2]" />
                  <span>Compose Custom Notification</span>
                </h3>
                <p className="text-xs text-slate-500">Send direct communications to single, multiple, or all forum members.</p>
              </div>
            </div>

            <form onSubmit={handleSendCustomNotification} className="space-y-6">
              
              {/* Recipient Mode Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  1. Target Recipients
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setRecipientMode('single')}
                    className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      recipientMode === 'single'
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-[#2EA3F2] text-[#0A2E73] dark:text-[#2EA3F2] font-bold shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <User className="w-5 h-5 text-[#2EA3F2]" />
                    <div>
                      <div className="text-xs font-bold">Single Member</div>
                      <div className="text-[10px] text-slate-500">Choose 1 recipient</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipientMode('selected')}
                    className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      recipientMode === 'selected'
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-[#2EA3F2] text-[#0A2E73] dark:text-[#2EA3F2] font-bold shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Users className="w-5 h-5 text-[#2EA3F2]" />
                    <div>
                      <div className="text-xs font-bold">Selected Members</div>
                      <div className="text-[10px] text-slate-500">Pick specific list</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRecipientMode('all')}
                    className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      recipientMode === 'all'
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-[#2EA3F2] text-[#0A2E73] dark:text-[#2EA3F2] font-bold shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Layers className="w-5 h-5 text-[#2EA3F2]" />
                    <div>
                      <div className="text-xs font-bold">All Members</div>
                      <div className="text-[10px] text-slate-500">Broadcast ({members.length})</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recipient Picker: Single Mode */}
              {recipientMode === 'single' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Select Member
                  </label>
                  <select
                    value={selectedSingleMemberId}
                    onChange={(e) => setSelectedSingleMemberId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.membershipId || 'Pending ID'}) - {m.email} / {m.phone} [{m.state}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Recipient Picker: Selected Mode */}
              {recipientMode === 'selected' && (
                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Select Members ({selectedMemberIds.length} of {members.length} selected)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className="text-[11px] font-bold text-[#2EA3F2] hover:underline"
                      >
                        Select All Filtered ({filteredMembersForSelection.length})
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={handleDeselectAll}
                        className="text-[11px] font-bold text-rose-500 hover:underline"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Search inside selector */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Search member name, email, phone, or ID..."
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Scrollable Checkbox List */}
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-2">
                    {filteredMembersForSelection.map((m) => {
                      const isChecked = selectedMemberIds.includes(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => handleToggleSelectMember(m.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition-colors ${
                            isChecked
                              ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 text-slate-900 dark:text-white'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            )}
                            <div>
                              <span className="font-bold">{m.fullName}</span>
                              <span className="text-[10px] text-slate-500 ml-2">({m.membershipId || 'Pending'})</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{m.email}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Delivery Method Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  2. Delivery Channel
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('Both')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      deliveryMethod === 'Both'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Email &amp; SMS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('Email')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      deliveryMethod === 'Email'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('SMS')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      deliveryMethod === 'SMS'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>SMS Only</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('WhatsApp')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      deliveryMethod === 'WhatsApp'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('All')}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      deliveryMethod === 'All'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>All Channels</span>
                  </button>
                </div>
              </div>

              {/* Message Subject */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  3. Subject Line
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. N-NEPEF 2020 Membership Approved / Important Meeting Notice"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
                />
              </div>

              {/* Message Content */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  4. Message Content
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Type message content here..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2] leading-relaxed"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs text-slate-500 font-medium">
                  Recipient Count: <strong className="text-slate-900 dark:text-white">{
                    recipientMode === 'single' ? '1 Member' : recipientMode === 'selected' ? `${selectedMemberIds.length} Members` : `${members.length} Members`
                  }</strong>
                </span>

                <button
                  type="submit"
                  disabled={isSending}
                  className="px-6 py-3 rounded-2xl bg-[#0A2E73] hover:bg-sky-800 text-white font-display font-bold text-xs shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-4 h-4 text-[#2EA3F2]" />
                  <span>{isSending ? 'Dispatching Notifications...' : 'Dispatch Notification'}</span>
                </button>
              </div>

            </form>
          </div>

          {/* Right Live Preview Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4 border border-slate-800 shadow-lg sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-sky-400">
                  <Eye className="w-4 h-4" />
                  <span className="font-display font-bold text-xs uppercase tracking-wider">Live Preview</span>
                </div>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded-full font-mono">
                  {deliveryMethod}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-mono block">Subject:</span>
                  <p className="font-bold text-amber-300">
                    {customSubject || 'N-NEPEF 2020 Membership Approved'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase text-slate-400 font-mono block">Recipient:</span>
                  <p className="font-medium text-slate-200">
                    {recipientMode === 'single'
                      ? members.find(m => m.id === selectedSingleMemberId)?.fullName || 'Sample Member'
                      : recipientMode === 'selected'
                      ? `${selectedMemberIds.length} Selected Members`
                      : `All ${members.length} Forum Members`}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 space-y-1">
                  <span className="text-[10px] uppercase text-slate-400 font-mono block">Rendered Message:</span>
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-slate-300 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                    {customMessage || `Congratulations!\nYour N-NEPEF 2020 membership registration has been successfully approved.\n\nYou can now log in to your account and access all member services.\n\nThank you for being part of N-NEPEF 2020.`}
                  </div>
                </div>

                <div className="p-3 bg-slate-800/50 rounded-xl text-[10px] text-slate-400 flex items-start gap-2 border border-slate-700/50">
                  <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                  <span>Dispatched notifications execute via real API/SMTP with delivery logging to local SQLite database.</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 2: AUTO RULES & TEMPLATES */}
      {activeSubTab === 'settings' && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#2EA3F2]" />
              <span>Automated Notification Rules &amp; Templates</span>
            </h3>
            <p className="text-xs text-slate-500">
              Configure automatic Email/SMS notifications for Registration, Approvals, Rejections, Profile Updates, and Password Resets.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-[#2EA3F2]" /> Automatic Emails
                  </div>
                  <div className="text-[10px] text-slate-500">Send automatic emails via Brevo/SMTP</div>
                </div>
                <input
                  type="checkbox"
                  checked={templateForm.emailNotifications}
                  onChange={(e) => setTemplateForm({ ...templateForm, emailNotifications: e.target.checked })}
                  className="w-5 h-5 text-[#2EA3F2] rounded focus:ring-[#2EA3F2]"
                />
              </label>

              <label className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-amber-500" /> Automatic SMS
                  </div>
                  <div className="text-[10px] text-slate-500">Send automatic SMS via Twilio/Termii</div>
                </div>
                <input
                  type="checkbox"
                  checked={templateForm.smsNotifications}
                  onChange={(e) => setTemplateForm({ ...templateForm, smsNotifications: e.target.checked })}
                  className="w-5 h-5 text-[#2EA3F2] rounded focus:ring-[#2EA3F2]"
                />
              </label>

              <label className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-purple-500" /> In-App Banners
                  </div>
                  <div className="text-[10px] text-slate-500">Push in-app alerts to member portal</div>
                </div>
                <input
                  type="checkbox"
                  checked={templateForm.pushNotifications}
                  onChange={(e) => setTemplateForm({ ...templateForm, pushNotifications: e.target.checked })}
                  className="w-5 h-5 text-[#2EA3F2] rounded focus:ring-[#2EA3F2]"
                />
              </label>
            </div>

            {/* Default Approval Subject & Template */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Registration Approval Email Subject
                </label>
                <input
                  type="text"
                  required
                  value={templateForm.welcomeEmailSubject}
                  onChange={(e) => setTemplateForm({ ...templateForm, welcomeEmailSubject: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Registration Approval Message Body
                </label>
                <textarea
                  required
                  rows={8}
                  value={templateForm.welcomeMessageTemplate}
                  onChange={(e) => setTemplateForm({ ...templateForm, welcomeMessageTemplate: e.target.value })}
                  className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2] leading-relaxed font-mono"
                />
              </div>
            </div>

            {/* Sender Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sender Display Name</label>
                <input
                  type="text"
                  value={templateForm.senderName}
                  onChange={(e) => setTemplateForm({ ...templateForm, senderName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sender Contact Email</label>
                <input
                  type="email"
                  value={templateForm.senderEmail}
                  onChange={(e) => setTemplateForm({ ...templateForm, senderEmail: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              {savedSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Template settings saved successfully!
                </span>
              )}
              <button
                type="submit"
                className="ml-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
              >
                Save Notification Rules
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 3: DELIVERY HISTORY & LOGS */}
      {activeSubTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2EA3F2]" />
                <span>Notification Delivery History ({notificationLogs.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Permanent delivery log with Provider, Message ID, Status, and Error tracking.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClearAllLogs}
              disabled={notificationLogs.length === 0}
              className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-900 flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Clear History</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search history by member name, email, phone, ID, provider, or subject..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="all">All Channels</option>
                <option value="Email">Email</option>
                <option value="SMS">SMS</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="In-App">In-App</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Sent">Sent</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          {filteredLogs.length === 0 ? (
            <div className="p-10 text-center bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <Bell className="w-10 h-10 text-slate-400 mx-auto opacity-40" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No notification logs match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <th className="p-3.5">Date &amp; Time</th>
                    <th className="p-3.5">Member Name</th>
                    <th className="p-3.5">Recipient</th>
                    <th className="p-3.5">Channel</th>
                    <th className="p-3.5">Provider &amp; Msg ID</th>
                    <th className="p-3.5">Subject / Details</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-800 dark:text-slate-200">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {log.sentAt}
                      </td>
                      <td className="p-3.5 font-bold">
                        <div>{log.recipientName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{log.membershipId || 'Pending'}</div>
                      </td>
                      <td className="p-3.5 font-mono text-[11px]">
                        <div>{log.channel === 'Email' ? log.recipientEmail : log.recipientPhone}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${
                          log.channel === 'Email' ? 'bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-300' :
                          log.channel === 'SMS' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300' :
                          log.channel === 'WhatsApp' ? 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-300' :
                          'bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300'
                        }`}>
                          {log.channel}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[10px]">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{log.provider || 'N/A'}</div>
                        <div className="text-slate-400 truncate max-w-[120px]">{log.messageId || '-'}</div>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white truncate">{log.subject}</div>
                        {log.errorMessage ? (
                          <div className="text-[10px] text-rose-500 font-medium truncate">{log.errorMessage}</div>
                        ) : (
                          <div className="text-[10px] text-slate-400 truncate">{log.message}</div>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'Sent' || log.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewLogModal(log)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                            title="View Full Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-sky-500" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResendNotification(log)}
                            className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950 hover:bg-sky-100 text-sky-700 dark:text-sky-300"
                            title="Retry / Resend"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-[#2EA3F2]" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 hover:bg-rose-100 text-rose-600"
                            title="Delete Log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* VIEW LOG DETAILS MODAL */}
      {viewLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-[#0A2E73] dark:text-[#2EA3F2]">
                <FileText className="w-5 h-5" />
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                  Notification Delivery Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewLogModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-mono block">Recipient Name &amp; ID:</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewLogModal.recipientName}</span>
                <span className="text-slate-500 ml-2">({viewLogModal.membershipId || 'Pending'})</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-mono block">Recipient Email:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{viewLogModal.recipientEmail || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-mono block">Recipient Phone:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{viewLogModal.recipientPhone || 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-mono block">Delivery Provider:</span>
                  <span className="font-bold text-[#2EA3F2]">{viewLogModal.provider || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-mono block">Message SID / ID:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{viewLogModal.messageId || 'None'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-mono block">Channel:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{viewLogModal.channel}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-mono block">Status:</span>
                  <span className={`font-bold ${viewLogModal.status === 'Sent' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {viewLogModal.status}
                  </span>
                </div>
              </div>

              {viewLogModal.errorMessage && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-[10px] uppercase text-rose-500 font-mono block font-bold">Delivery Error Message:</span>
                  <p className="text-rose-600 font-mono text-[11px] font-bold">{viewLogModal.errorMessage}</p>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] uppercase text-slate-400 font-mono block">Dispatched At:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{viewLogModal.sentAt}</span>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] uppercase text-slate-400 font-mono block mb-1">Subject:</span>
                <p className="font-bold text-slate-900 dark:text-white">{viewLogModal.subject}</p>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] uppercase text-slate-400 font-mono block mb-1">Message Body:</span>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {viewLogModal.message}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  handleResendNotification(viewLogModal);
                  setViewLogModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry / Resend</span>
              </button>

              <button
                type="button"
                onClick={() => setViewLogModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
