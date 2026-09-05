import React, { useState, useEffect } from 'react';
import { Member, EventItem, Announcement, PaymentRecord, DocumentItem, NotificationItem, ForumSettings, RenewalRequest } from '../types';
import { dispatchEventNotification } from '../utils/notificationDispatcher';
import { MemberRenewalModule } from './MemberRenewalModule';
import { MembershipCard } from './MembershipCard';
import { PrintableReceiptModal } from './PrintableReceiptModal';
import { OfficialApprovalSlipModal } from './OfficialApprovalSlipModal';
import { hashPassword } from '../utils/passwordUtils';
import { savePaymentToSQLite } from '../services/sqliteService';
import { signOutUser } from '../services/supabaseAuthService';
import { fetchApprovedMemberById, isSupabaseConfigured } from '../services/supabaseService';
import { handleImageError, getValidImageUrl, downloadFileSafely } from '../utils/imageHelpers';
import { downloadApprovalSlipPdf } from '../services/pdfService';
import { OFFICIAL_NNEPEF_LOGO } from '../constants/logo';
import { OFFICIAL_SECRETARY_SIGNATURE } from '../constants/signature';
import { 
  User, 
  CreditCard, 
  Bell, 
  Calendar, 
  FileText, 
  Download, 
  MessageSquare, 
  LogOut, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  Send,
  MapPin,
  Briefcase,
  Phone,
  Mail,
  Award,
  QrCode,
  RefreshCcw,
  Cloud,
  RefreshCw,
  FileCheck,
  Printer,
  Loader2
} from 'lucide-react';

interface MemberPortalProps {
  currentUser: Member;
  setCurrentUser: (user: Member | null) => void;
  onUpdateMember: (updated: Member) => void;
  events: EventItem[];
  announcements: Announcement[];
  payments: PaymentRecord[];
  documents: DocumentItem[];
  notifications: NotificationItem[];
  settings: ForumSettings;
  onSubmitRenewal: (newRequest: RenewalRequest, paymentRecord: PaymentRecord) => void;
  setCurrentView: (view: string) => void;
}

export const MemberPortal: React.FC<MemberPortalProps> = ({
  currentUser,
  setCurrentUser,
  onUpdateMember,
  events,
  announcements,
  payments,
  documents,
  notifications,
  settings,
  onSubmitRenewal,
  setCurrentView,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'id-card' | 'approval-slip' | 'profile' | 'renew-card' | 'events' | 'announcements' | 'payments' | 'downloads' | 'support'>('dashboard');
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [isDownloadingSlipPdf, setIsDownloadingSlipPdf] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSyncingWithSupabase, setIsSyncingWithSupabase] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  const slipLogo = settings?.logoUrl && settings.logoUrl.trim() !== '' && settings.logoUrl !== '/logo.png'
    ? settings.logoUrl
    : OFFICIAL_NNEPEF_LOGO;

  const [profileForm, setProfileForm] = useState({
    phone: currentUser.phone,
    email: currentUser.email,
    address: currentUser.address,
    company: currentUser.company,
    specialization: currentUser.specialization,
    yearsOfExperience: currentUser.yearsOfExperience
  });

  // Authoritative fetch directly from Supabase members table on every load/mount
  const refreshMemberFromSupabase = async () => {
    setIsSyncingWithSupabase(true);
    try {
      const lookupKey = currentUser.id || currentUser.membershipId || currentUser.email;
      if (lookupKey) {
        const fresh = await fetchApprovedMemberById(lookupKey);
        if (fresh) {
          setCurrentUser(fresh);
          onUpdateMember(fresh);
          setProfileForm({
            phone: fresh.phone,
            email: fresh.email,
            address: fresh.address,
            company: fresh.company,
            specialization: fresh.specialization,
            yearsOfExperience: fresh.yearsOfExperience
          });
          setLastSyncedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      }
    } catch (err) {
      console.warn('[MemberPortal] Supabase refresh error:', err);
    } finally {
      setIsSyncingWithSupabase(false);
    }
  };

  useEffect(() => {
    refreshMemberFromSupabase();
  }, [currentUser.id]);

  const [supportMessage, setSupportMessage] = useState({ subject: '', message: '' });
  const [supportSent, setSupportSent] = useState(false);

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.subject || !supportMessage.message) return;
    setSupportSent(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = { ...currentUser, ...profileForm };
    onUpdateMember(updated);
    setCurrentUser(updated);
    setIsEditingProfile(false);

    try {
      await dispatchEventNotification({
        event: 'profile_updated',
        member: updated,
        settings,
        deliveryMethod: 'Both',
      });
    } catch (err) {
      console.error('Failed to dispatch profile update notification:', err);
    }
  };

  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<PaymentRecord | null>(null);
  const [manualFeeType, setManualFeeType] = useState('Annual Membership Dues');
  const [manualAmount, setManualAmount] = useState(15000);
  const [manualRef, setManualRef] = useState('');
  const [manualSuccessMsg, setManualSuccessMsg] = useState('');

  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRef.trim()) return;

    const newPayment: PaymentRecord = {
      id: `p-${Date.now()}`,
      memberId: currentUser.id,
      memberName: currentUser.fullName,
      membershipId: currentUser.membershipId || 'N/A',
      state: currentUser.state,
      lga: currentUser.lga,
      type: manualFeeType,
      amount: manualAmount,
      status: 'Pending',
      receiptUrl: currentUser.paymentReceiptUrl || '',
      date: new Date().toISOString().split('T')[0],
      reference: manualRef.trim().toUpperCase(),
      paymentMethod: 'Direct Bank Transfer / Deposit',
      remarks: 'Self-submitted bank payment reference for admin confirmation'
    };

    await savePaymentToSQLite(newPayment);
    setManualSuccessMsg(`Payment reference '${newPayment.reference}' submitted successfully! Admin will review and confirm.`);
    setManualRef('');
    setTimeout(() => setManualSuccessMsg(''), 6000);
  };

  const memberPayments = payments.filter(p => p.memberId === currentUser.id || p.membershipId === currentUser.membershipId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Row Level Security Privacy Notice Banner */}
      <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>🔒 <strong>Member Privacy &amp; Row Level Security Active:</strong> Scoped exclusively to account ({currentUser.membershipId || currentUser.email}). Your profile, payment receipts, and documents are strictly isolated.</span>
        </div>
        <span className="text-[10px] font-mono bg-emerald-200 dark:bg-emerald-900 px-2 py-0.5 rounded text-emerald-900 dark:text-emerald-100 hidden sm:inline">RLS ENFORCED</span>
      </div>

      {/* Top Banner Profile Summary */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <img 
            src={getValidImageUrl(currentUser.passportUrl, 'avatar')} 
            alt={currentUser.fullName} 
            onError={(e) => handleImageError(e, 'avatar')}
            className="w-20 h-20 rounded-2xl object-cover border-4 border-[#0A2E73] dark:border-[#2EA3F2] shadow-md"
          />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white">
                {currentUser.fullName}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                currentUser.status === 'approved' 
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {currentUser.status}
              </span>
            </div>

            <p className="font-mono font-extrabold text-xs text-[#2EA3F2]">
              {currentUser.membershipId || 'Membership ID Pending Admin Assignment'}
            </p>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {currentUser.position || 'Practicing Member'} • {currentUser.state} State Chapter
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={refreshMemberFromSupabase}
            disabled={isSyncingWithSupabase}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-300 dark:border-slate-700"
            title="Fetch authoritative approved record directly from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-500 ${isSyncingWithSupabase ? 'animate-spin' : ''}`} />
            <span>{isSyncingWithSupabase ? 'Refreshing...' : 'Refresh from Cloud'}</span>
            {lastSyncedTime && <span className="text-[10px] text-slate-400 font-normal ml-1">({lastSyncedTime})</span>}
          </button>

          <button
            onClick={() => setActiveTab('renew-card')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A2E73] text-white text-xs font-bold hover:bg-sky-700 transition-colors shadow-md"
          >
            <RefreshCcw className="w-4 h-4 text-[#2EA3F2]" />
            <span>Renew / Replace ID Card</span>
          </button>

          <button
            onClick={() => { 
              signOutUser();
              setCurrentUser(null); 
              setCurrentView('home'); 
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 text-xs font-bold border border-red-200 dark:border-red-800 hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Portal Tabs Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: User },
          { id: 'id-card', label: 'My Digital ID Card', icon: CreditCard },
          { id: 'approval-slip', label: 'Official Approval Slip', icon: FileCheck },
          { id: 'profile', label: 'View Profile', icon: Edit3 },
          { id: 'renew-card', label: 'Renew / Replace Membership ID Card', icon: RefreshCcw },
          { id: 'events', label: 'My Events', icon: Calendar },
          { id: 'announcements', label: 'Announcements', icon: Bell },
          { id: 'payments', label: 'Payment History', icon: FileText },
          { id: 'downloads', label: 'Downloads', icon: Download },
          { id: 'support', label: 'Contact Admin', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
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

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          
          {/* Status Alert */}
          {currentUser.status === 'approved' ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Your N-NEPEF Membership is Active &amp; Verified. ID: {currentUser.membershipId}</span>
              </div>
              <button onClick={() => setActiveTab('renew-card')} className="font-bold underline text-emerald-700 dark:text-emerald-300">
                Renew / Replace ID Card
              </button>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <strong>Status Pending:</strong> Your application is currently awaiting Super Admin review and Membership ID assignment.
              </div>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Membership Status</span>
              <div className="font-display font-extrabold text-xl text-emerald-600 dark:text-emerald-400 uppercase">
                {currentUser.status}
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Registered Events</span>
              <div className="font-display font-extrabold text-xl text-slate-900 dark:text-white">
                {events.length} Upcoming
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Specialization</span>
              <div className="font-display font-extrabold text-lg text-slate-900 dark:text-white truncate">
                {currentUser.specialization || 'Electrical Engineering'}
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">State Chapter</span>
              <div className="font-display font-extrabold text-xl text-[#2EA3F2]">
                {currentUser.state}
              </div>
            </div>
          </div>

          {/* Recent Announcements */}
          <div className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#2EA3F2]" />
              <span>Latest Forum Bulletins</span>
            </h3>

            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-sky-600 dark:text-sky-400">
                    <span>{a.title}</span>
                    <span>{a.createdAt}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{a.content}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 1B: MY DIGITAL ID CARD (EXCLUSIVELY FOR VERIFIED ACCOUNT OWNER) */}
      {activeTab === 'id-card' && (
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
            <div>
              <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">Official Membership ID Card</h3>
              <p className="text-xs text-slate-500">Private verified membership credential for {currentUser.fullName}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Owner Scoped Access Only</span>
            </span>
          </div>

          {currentUser.status === 'approved' || (currentUser.status as string) === 'Active' ? (
            <MembershipCard member={currentUser} />
          ) : (
            <div className="p-8 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="font-bold text-lg text-amber-900 dark:text-amber-200">ID Card Access Restricted</h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 max-w-md mx-auto">
                Your application is currently under review by the administrator. Official Membership ID Cards are issued exclusively to verified active members following Super Admin approval.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 1C: OFFICIAL MEMBERSHIP APPROVAL SLIP (WITH SECRETARY GENERAL SIGNATURE) */}
      {activeTab === 'approval-slip' && (
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
            <div>
              <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">Official Membership Approval Slip</h3>
              <p className="text-xs text-slate-500">Certified N-NEPEF 2020 credential bearing the authentic Secretary General digital endorsement</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs text-slate-500 font-mono hidden sm:inline mr-1">Choose Action:</span>
              <button
                type="button"
                onClick={async () => {
                  setIsDownloadingSlipPdf(true);
                  try {
                    await downloadApprovalSlipPdf(currentUser, settings);
                  } catch (e) {
                    console.warn(e);
                    setShowSlipModal(true);
                  } finally {
                    setIsDownloadingSlipPdf(false);
                  }
                }}
                disabled={isDownloadingSlipPdf}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-75 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                title="Download Official Slip as PDF document"
              >
                {isDownloadingSlipPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                ) : (
                  <Download className="w-4 h-4 text-emerald-200" />
                )}
                <span>{isDownloadingSlipPdf ? 'Downloading PDF...' : 'Download PDF Slip'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSlipModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#0A2E73] hover:bg-sky-900 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                title="Open Official Slip to Print or Save as PDF"
              >
                <Printer className="w-4 h-4 text-[#2EA3F2]" />
                <span>Print Official Slip</span>
              </button>
            </div>
          </div>

          {currentUser.status === 'approved' || (currentUser.status as string) === 'Active' ? (
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-xl space-y-6 relative overflow-hidden">
              {/* Top Decorative Brand Bar */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#0A2E73] via-[#2EA3F2] to-[#0A2E73]" />

              {/* Security Watermark in Background */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.04] dark:opacity-[0.03]">
                <img src={slipLogo} alt="" className="w-96 h-96 object-contain" />
              </div>

              {/* Header: Logo, Organization Title, Motto */}
              <div className="relative flex flex-col sm:flex-row items-center sm:items-start justify-between border-b-2 border-slate-800 dark:border-slate-700 pb-5 gap-4">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  <img
                    src={slipLogo}
                    alt="N-NEPEF Logo"
                    className="w-16 h-16 sm:w-20 sm:h-20 object-contain flex-shrink-0"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== OFFICIAL_NNEPEF_LOGO) target.src = OFFICIAL_NNEPEF_LOGO;
                    }}
                  />
                  <div>
                    <h4 className="font-extrabold text-lg sm:text-xl text-[#0A2E73] dark:text-sky-400 uppercase tracking-tight font-serif leading-tight">
                      {settings?.forumName || 'N-NEPEF 2020'}
                    </h4>
                    <p className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 tracking-wide uppercase">
                      Northern Nigerian Electrical Practitioners and Engineers Forum
                    </p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-widest">
                      Unity • Professionalism • Excellence
                    </p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono pt-1">
                      National Secretariat: {settings?.headquarters || 'No. 2 Gwarzo Road, Kano State, Nigeria'} • +234 906 343 5546
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-center sm:items-end gap-1.5 flex-shrink-0">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-[10px] flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>OFFICIALLY APPROVED</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    ID: {currentUser.membershipId || 'PENDING'}
                  </span>
                </div>
              </div>

              {/* Slip Title Ribbon */}
              <div className="relative py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-center">
                <span className="font-display font-black text-xs sm:text-sm tracking-widest text-[#0A2E73] dark:text-sky-400 uppercase">
                  Official Membership Approval &amp; Registration Slip
                </span>
              </div>

              {/* Member Profile Grid */}
              <div className="relative flex flex-col md:flex-row items-start gap-6">
                <div className="w-28 h-36 rounded-2xl overflow-hidden border-2 border-[#0A2E73] dark:border-sky-500 shadow-md bg-slate-200 dark:bg-slate-800 flex-shrink-0 mx-auto md:mx-0">
                  <img
                    src={getValidImageUrl(currentUser.passportUrl || currentUser.passportPhotoUrl, 'avatar')}
                    alt={currentUser.fullName}
                    className="w-full h-full object-cover"
                    onError={(e) => handleImageError(e, 'avatar')}
                  />
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs w-full">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Full Member Name</span>
                    <p className="font-extrabold text-base text-slate-900 dark:text-white uppercase">{currentUser.fullName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Official Membership ID</span>
                    <p className="font-mono font-extrabold text-sm text-[#0A2E73] dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-800 inline-block">
                      {currentUser.membershipId || 'PENDING ASSIGNMENT'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Cadre / Designation</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{currentUser.position || 'Practicing Member'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">State Chapter</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{currentUser.state} State {currentUser.lga ? `(${currentUser.lga} LGA)` : ''}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Engineering Specialization</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{currentUser.specialization || 'Electrical Engineering'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Verification Reference</span>
                    <p className="font-mono text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded inline-block">
                      {currentUser.verificationCode || currentUser.applicationReference || currentUser.id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Authentic Secretary General Endorsement & Signature block */}
              <div className="relative pt-6 border-t-2 border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-9 h-9 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Authentic Secretary General Digital Endorsement</p>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-[11px]">Officially sealed &amp; issued under the authority of National Secretariat Kano Headquarters</p>
                  </div>
                </div>
                
                {/* Digital Signature with Graphic */}
                <div className="text-center sm:text-right flex flex-col items-center sm:items-end flex-shrink-0">
                  <img 
                    src={OFFICIAL_SECRETARY_SIGNATURE} 
                    alt="Secretary General Signature" 
                    className="h-12 sm:h-14 object-contain mb-1"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src !== '/secretary-signature.png') target.src = '/secretary-signature.png';
                    }}
                  />
                  <div className="w-44 border-b border-[#0A2E73] dark:border-sky-400 my-1" />
                  <p className="font-serif font-bold text-xs text-slate-900 dark:text-white">Engr. Hussaini Ali</p>
                  <p className="text-[10px] font-bold text-[#0A2E73] dark:text-sky-400 uppercase tracking-wide">Secretary General, N-NEPEF 2020</p>
                  <p className="text-[8px] text-slate-500 dark:text-slate-400 font-mono">National Secretariat, Kano State Headquarters</p>
                </div>
              </div>

              {/* Bottom Choice Action Toolbar */}
              <div className="relative pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  Official Certified Membership Document
                </span>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsDownloadingSlipPdf(true);
                      try {
                        await downloadApprovalSlipPdf(currentUser, settings);
                      } catch (e) {
                        console.warn(e);
                        setShowSlipModal(true);
                      } finally {
                        setIsDownloadingSlipPdf(false);
                      }
                    }}
                    disabled={isDownloadingSlipPdf}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-75 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    {isDownloadingSlipPdf ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                    ) : (
                      <Download className="w-4 h-4 text-emerald-200" />
                    )}
                    <span>{isDownloadingSlipPdf ? 'Downloading PDF...' : 'Download PDF Slip'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSlipModal(true)}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#0A2E73] hover:bg-sky-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4 text-[#2EA3F2]" />
                    <span>Print Official Slip</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h4 className="font-bold text-lg text-amber-900 dark:text-amber-200">Approval Slip Awaiting Super Admin Verification</h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 max-w-md mx-auto">
                Your application is currently marked as {currentUser.status}. Official certified approval slips are generated only once membership has been ratified by the N-NEPEF National Secretariat.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PROFILE VIEW (READ-ONLY PER PRIVACY POLICY) */}
      {activeTab === 'profile' && (
        <div className="glass-card p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-8 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
            <div>
              <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">Official Member Profile</h3>
              <p className="text-xs text-slate-500">Private profile information protected by N-NEPEF 2020 Data Policy</p>
            </div>
            <button
              onClick={() => {
                setSupportMessage({
                  subject: 'Profile Data Correction Request',
                  message: `Dear Super Admin,\n\nI wish to request a correction to my personal profile details for Member ID ${currentUser.membershipId || currentUser.id}.\n\nDetails to update:\n- `
                });
                setActiveTab('support');
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Request Data Correction from Super Admin</span>
            </button>
          </div>

          {/* Privacy Protection Notice Banner */}
          <div className="p-4 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 rounded-2xl flex items-center gap-3 text-xs text-sky-900 dark:text-sky-200">
            <ShieldCheck className="w-5 h-5 text-[#2EA3F2] flex-shrink-0" />
            <div>
              <strong>Private Information Safeguard:</strong> In accordance with the N-NEPEF Private Membership Policy, members cannot edit personal details directly. If any correction is needed for your name, phone, email, NIN, passport photo, signature, or position, please submit a request to the Super Admin.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-3 bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Full Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentUser.fullName}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Membership ID:</span>
                <span className="font-mono font-bold text-[#2EA3F2]">{currentUser.membershipId || 'PENDING ASSIGNMENT'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Position:</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentUser.position || 'Practicing Member'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Gender &amp; DOB:</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentUser.gender} • {currentUser.dob}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Phone Number:</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentUser.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Email Address:</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentUser.email}</span>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Specialization:</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentUser.specialization}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-slate-500">State Chapter:</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentUser.state} State ({currentUser.lga})</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Experience:</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentUser.yearsOfExperience} Years</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Company / Organization:</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentUser.company || 'Private Practice'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="text-slate-500">Office Address:</span>
                <span className="font-bold text-slate-900 dark:text-white">{currentUser.address}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Approval Status:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold uppercase text-[10px]">
                  {currentUser.status}
                </span>
              </div>
            </div>
          </div>

          {/* Next of Kin Card */}
          <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#2EA3F2]" />
                <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white">Next of Kin Information</h4>
              </div>
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                Official Emergency Contact
              </span>
            </div>

            {currentUser.nextOfKin ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-mono block">Next of Kin Name</span>
                  <p className="font-bold text-slate-900 dark:text-white">{currentUser.nextOfKin.name || 'Not Provided'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-mono block">Relation / Relationship</span>
                  <p className="font-bold text-slate-900 dark:text-white">{currentUser.nextOfKin.relation || 'Not Provided'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-mono block">Phone Number</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">{currentUser.nextOfKin.phone || 'Not Provided'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-mono block">Residential Address</span>
                  <p className="font-bold text-slate-900 dark:text-white">{currentUser.nextOfKin.address || 'Not Provided'}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-500 italic">
                No Next of Kin information recorded. Click "Request Data Correction from Super Admin" above to submit your Next of Kin details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RENEW / REPLACE MEMBERSHIP ID CARD */}
      {activeTab === 'renew-card' && (
        <MemberRenewalModule
          currentUser={currentUser}
          settings={settings}
          onSubmitRenewal={onSubmitRenewal}
        />
      )}

      {/* TAB 4: MY EVENTS & QR TICKETS */}
      {activeTab === 'events' && (
        <div className="glass-card p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-xl">
          <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">My Event Registrations &amp; QR Attendance Pass</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((ev) => (
              <div key={ev.id} className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">{ev.state} State</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">RSVP VERIFIED</span>
                </div>

                <h4 className="font-bold text-base text-slate-900 dark:text-white">{ev.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">{ev.description}</p>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-slate-900 dark:text-white">{ev.date} ({ev.time})</p>
                    <p className="text-slate-500">{ev.location}</p>
                  </div>
                  <div className="p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-slate-800 dark:text-slate-200 font-mono text-[10px] font-bold flex flex-col items-center">
                    <QrCode className="w-8 h-8 text-[#0A2E73] dark:text-[#2EA3F2]" />
                    <span>QR TICKET</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: ANNOUNCEMENTS */}
      {activeTab === 'announcements' && (
        <div className="glass-card p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-xl">
          <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">Official N-NEPEF Bulletins &amp; Notices</h3>
          <div className="space-y-4">
            {announcements.map((a) => (
              <div key={a.id} className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400">
                  <span>{a.author}</span>
                  <span>{a.createdAt}</span>
                </div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">{a.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{a.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: PAYMENT HISTORY */}
      {activeTab === 'payments' && (
        <div className="glass-card p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-xl">
          <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">Payment History &amp; Receipts</h3>
          <div className="space-y-4">
            {memberPayments.map((p) => (
              <div key={p.id} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{p.type}</h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">{p.status}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">REF: {p.reference} • Date: {p.date}</p>
                </div>

                <div className="flex items-center gap-4">
                  <span className="font-display font-extrabold text-base text-[#2EA3F2]">₦{p.amount.toLocaleString()}</span>
                  <button
                    onClick={(e) => downloadFileSafely(p.receiptUrl, `NNEPEF-Receipt-${p.reference}.jpeg`, e)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0A2E73] text-white text-xs font-bold hover:bg-sky-800 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Receipt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: DOWNLOADS */}
      {activeTab === 'downloads' && (
        <div className="glass-card p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-xl">
          <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">Official Documents &amp; Publications</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase">{doc.category} • {doc.fileSize}</span>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">{doc.title}</h4>
                </div>
                <button
                  onClick={(e) => downloadFileSafely(doc.fileUrl, `${doc.title.replace(/\s+/g, '_')}.pdf`, e)}
                  className="px-3 py-2 rounded-xl bg-[#0A2E73] text-white text-xs font-bold flex items-center gap-1 hover:bg-sky-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: CONTACT ADMIN / SUPPORT */}
      {activeTab === 'support' && (
        <div className="space-y-6">
          {/* Official Secretariat Contact Info Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
              <div className="p-2.5 bg-[#0A2E73] text-white rounded-xl flex-shrink-0">
                <MapPin className="w-5 h-5 text-[#2EA3F2]" />
              </div>
              <div className="space-y-0.5 text-xs">
                <span className="font-bold text-[#2EA3F2] uppercase text-[10px]">Headquarters Address</span>
                <h4 className="font-bold text-slate-900 dark:text-white">National Head Office</h4>
                <p className="text-slate-600 dark:text-slate-300 leading-snug">
                  No. 2, Gwarzo Road, Opposite Rijiyar Zaki Bus Stop, Kano State, Nigeria.
                </p>
              </div>
            </div>

            <div className="glass-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
              <div className="p-2.5 bg-[#0A2E73] text-white rounded-xl flex-shrink-0">
                <Phone className="w-5 h-5 text-[#2EA3F2]" />
              </div>
              <div className="space-y-0.5 text-xs flex-1">
                <span className="font-bold text-[#2EA3F2] uppercase text-[10px]">Helpline &amp; Support</span>
                <h4 className="font-bold text-slate-900 dark:text-white">Official Phone Lines</h4>
                <div className="flex flex-wrap gap-x-3 gap-y-1 font-semibold text-slate-700 dark:text-slate-200 pt-0.5">
                  <a href="tel:+2349063435546" className="hover:text-[#2EA3F2]">+234 906 343 5546</a>
                  <a href="tel:+2348030559938" className="hover:text-[#2EA3F2]">+234 803 055 9938</a>
                  <a href="tel:+2348133771460" className="hover:text-[#2EA3F2]">+234 813 377 1460</a>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-xl">
            <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">Contact N-NEPEF Secretariat</h3>
          {supportSent ? (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-base">Support Ticket Submitted!</h4>
              <p className="text-xs">Your query has been dispatched directly to the Secretariat.</p>
            </div>
          ) : (
            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject</label>
                <input
                  type="text"
                  required
                  value={supportMessage.subject}
                  onChange={(e) => setSupportMessage({ ...supportMessage, subject: e.target.value })}
                  placeholder="e.g. Card renewal query / Annual levy receipt"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Message</label>
                <textarea
                  rows={4}
                  required
                  value={supportMessage.message}
                  onChange={(e) => setSupportMessage({ ...supportMessage, message: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-[#0A2E73] text-white font-bold text-xs hover:bg-sky-700 flex items-center gap-2"
              >
                <Send className="w-4 h-4 text-[#2EA3F2]" />
                <span>Send Message to Admin</span>
              </button>
            </form>
          )}
        </div>
      </div>
      )}

      {/* OFFICIAL MEMBERSHIP APPROVAL SLIP MODAL */}
      {showSlipModal && (
        <OfficialApprovalSlipModal
          member={currentUser}
          settings={settings}
          onClose={() => setShowSlipModal(false)}
        />
      )}

    </div>
  );
};
