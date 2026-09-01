import React, { useState } from 'react';
import { RenewalRequest, Member, PaymentRecord, ForumSettings, NotificationDeliveryLog, NotificationItem } from '../types';
import { dispatchEventNotification } from '../utils/notificationDispatcher';
import { DualImageUpload } from './DualImageUpload';
import { MembershipCard } from './MembershipCard';
import { NORTHERN_STATES } from '../data/initialData';
import { handleImageError, getValidImageUrl } from '../utils/imageHelpers';
import { 
  RefreshCcw, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  Edit3, 
  Printer, 
  Download, 
  User, 
  PenTool, 
  Camera, 
  Calendar, 
  Palette, 
  History, 
  Upload, 
  FileCheck, 
  Sparkles,
  AlertCircle,
  X,
  CreditCard,
  ShieldCheck
} from 'lucide-react';

interface SuperAdminRenewalManagementProps {
  renewalRequests: RenewalRequest[];
  onUpdateRenewalRequests: (updated: RenewalRequest[]) => void;
  members: Member[];
  onUpdateMembers: (updated: Member[]) => void;
  payments: PaymentRecord[];
  onUpdatePayments: (updated: PaymentRecord[]) => void;
  onAddAuditLog: (action: string, details: string) => void;
  settings?: ForumSettings;
  onUpdateNotificationLogs?: (logs: NotificationDeliveryLog[]) => void;
  onUpdateNotifications?: (notifs: NotificationItem[]) => void;
}

export const SuperAdminRenewalManagement: React.FC<SuperAdminRenewalManagementProps> = ({
  renewalRequests,
  onUpdateRenewalRequests,
  members,
  onUpdateMembers,
  payments,
  onUpdatePayments,
  onAddAuditLog,
  settings,
  onUpdateNotificationLogs,
  onUpdateNotifications,
}) => {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');

  // Active Renewal Modal for Editing / Regenerating / Printing
  const [activeRequest, setActiveRequest] = useState<RenewalRequest | null>(null);
  
  // Card Design Theme State ('classic_navy' | 'gold_executive' | 'tech_emerald' | 'custom_image')
  const [selectedTheme, setSelectedTheme] = useState<string>('classic_navy');
  const [customDesignUrl, setCustomDesignUrl] = useState<string>('');

  // Edit Fields State for Active Request
  const [editForm, setEditForm] = useState({
    fullName: '',
    membershipId: '',
    position: '',
    state: '',
    lga: '',
    passportUrl: '',
    signatureUrl: '',
    approvalDate: '',
    expiryDate: '',
    remarks: '',
    rejectionReason: ''
  });

  // History Drawer / Modal State
  const [viewHistoryMemberId, setViewHistoryMemberId] = useState<string | null>(null);

  // Filter Logic
  const filteredRequests = renewalRequests.filter((req) => {
    const matchesSearch = 
      req.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.membershipId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesState = stateFilter === 'all' || req.state === stateFilter;

    return matchesSearch && matchesStatus && matchesState;
  });

  // Open Edit & Review Modal
  const handleOpenReviewModal = (req: RenewalRequest) => {
    setActiveRequest(req);
    const today = new Date().toISOString().split('T')[0];
    const defaultExpiry = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setEditForm({
      fullName: req.fullName,
      membershipId: req.membershipId,
      position: req.position,
      state: req.state,
      lga: req.lga,
      passportUrl: req.passportUrl,
      signatureUrl: req.signatureUrl,
      approvalDate: req.approvalDate || today,
      expiryDate: req.expiryDate || defaultExpiry,
      remarks: req.remarks || '',
      rejectionReason: req.rejectionReason || ''
    });
  };

  // Save Edits & Regenerate Card
  const handleSaveAndRegenerate = async (newStatus: 'Approved' | 'Rejected') => {
    if (!activeRequest) return;

    const updatedRequest: RenewalRequest = {
      ...activeRequest,
      fullName: editForm.fullName,
      membershipId: editForm.membershipId,
      position: editForm.position,
      state: editForm.state,
      lga: editForm.lga,
      passportUrl: editForm.passportUrl,
      signatureUrl: editForm.signatureUrl,
      status: newStatus,
      approvalDate: newStatus === 'Approved' ? editForm.approvalDate : activeRequest.approvalDate,
      expiryDate: newStatus === 'Approved' ? editForm.expiryDate : activeRequest.expiryDate,
      remarks: editForm.remarks,
      rejectionReason: newStatus === 'Rejected' ? editForm.rejectionReason : '',
      printedCount: (activeRequest.printedCount || 0) + (newStatus === 'Approved' ? 1 : 0),
      idCardDesignUrl: customDesignUrl || activeRequest.idCardDesignUrl
    };

    // Update Renewal Requests List
    const updatedRequests = renewalRequests.map(r => r.id === activeRequest.id ? updatedRequest : r);
    onUpdateRenewalRequests(updatedRequests);

    // If Approved, sync updated member profile and verified payment receipt
    if (newStatus === 'Approved') {
      const updatedMembers = members.map(m => {
        if (m.id === activeRequest.memberId || m.membershipId === activeRequest.membershipId) {
          return {
            ...m,
            fullName: editForm.fullName,
            membershipId: editForm.membershipId,
            position: editForm.position,
            state: editForm.state,
            lga: editForm.lga,
            passportUrl: editForm.passportUrl,
            issueDate: editForm.approvalDate,
            expiryDate: editForm.expiryDate,
            status: 'approved' as const
          };
        }
        return m;
      });
      onUpdateMembers(updatedMembers);

      // Verify associated payment receipt
      const updatedPayments = payments.map(p => {
        if (p.memberId === activeRequest.memberId && p.receiptUrl === activeRequest.receiptUrl) {
          return {
            ...p,
            status: 'Verified' as const,
            approvedAt: editForm.approvalDate,
            approvedBy: 'Super Admin'
          };
        }
        return p;
      });
      onUpdatePayments(updatedPayments);

      // Dispatch Automatic Membership Renewed Notification
      const targetMember = members.find(m => m.id === activeRequest.memberId || m.membershipId === activeRequest.membershipId) || {
        id: activeRequest.memberId,
        membershipId: activeRequest.membershipId,
        fullName: activeRequest.fullName,
        email: '',
        phone: '',
        gender: 'Male',
        dob: '',
        nin: '',
        state: activeRequest.state,
        lga: activeRequest.lga,
        address: '',
        occupation: '',
        specialization: '',
        yearsOfExperience: 0,
        company: '',
        passportUrl: activeRequest.passportUrl,
        paymentReceiptUrl: activeRequest.receiptUrl,
        status: 'approved',
        role: 'member',
        registeredAt: activeRequest.requestDate
      };

      const { logs: newLogs, inAppNotif } = await dispatchEventNotification({
        event: 'membership_renewed',
        member: targetMember as Member,
        settings: settings || {} as ForumSettings
      });

      if (newLogs.length > 0 && onUpdateNotificationLogs) {
        onUpdateNotificationLogs(newLogs);
      }
      if (inAppNotif && onUpdateNotifications) {
        onUpdateNotifications([inAppNotif]);
      }
    }

    onAddAuditLog(
      `ID_CARD_RENEWAL_${newStatus.toUpperCase()}`,
      `Super Admin ${newStatus.toLowerCase()} ID card renewal request for ${editForm.fullName} (${editForm.membershipId}). Position: ${editForm.position}. Expiry: ${editForm.expiryDate}`
    );

    setActiveRequest(null);
  };

  const handleExportRenewalsCSV = () => {
    if (filteredRequests.length === 0) {
      alert('No renewal requests available to export for the selected filter criteria.');
      return;
    }

    const headers = [
      'S/N',
      'Request ID',
      'Membership ID',
      'Full Name',
      'Assigned Position',
      'State Chapter',
      'Local Govt Area (LGA)',
      'Renewal Status',
      'Request Date',
      'Approval Date',
      'New Expiry Date',
      'Card Print Count',
      'Admin Remarks / Reason',
      'Passport Photo URL',
      'Signature URL',
      'Payment Receipt URL'
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      const val = str !== undefined && str !== null ? String(str).replace(/"/g, '""') : '';
      return `"${val}"`;
    };

    const rows = filteredRequests.map((r, index) => [
      escapeCsv(index + 1),
      escapeCsv(r.id),
      escapeCsv(r.membershipId),
      escapeCsv(r.fullName),
      escapeCsv(r.position),
      escapeCsv(r.state),
      escapeCsv(r.lga),
      escapeCsv(r.status.toUpperCase()),
      escapeCsv(r.requestDate),
      escapeCsv(r.approvalDate || 'N/A'),
      escapeCsv(r.expiryDate || 'N/A'),
      escapeCsv(r.printedCount || 0),
      escapeCsv(r.remarks || r.rejectionReason || ''),
      escapeCsv(r.passportUrl || ''),
      escapeCsv(r.signatureUrl || ''),
      escapeCsv(r.receiptUrl || '')
    ]);

    // UTF-8 BOM (\uFEFF) for Excel and Google Sheets compatibility
    const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `NNEPEF_ID_Card_Renewals_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onAddAuditLog('RENEWAL_EXPORT_CSV', `Super Admin exported ${filteredRequests.length} ID card renewal record(s) to CSV spreadsheet`);
  };

  // Helper object to preview mock member for card renderer
  const previewMemberObj: Member = activeRequest ? {
    id: activeRequest.memberId,
    membershipId: editForm.membershipId,
    fullName: editForm.fullName,
    gender: 'Male',
    dob: '1985-05-15',
    phone: '+234 800 000 0000',
    email: 'member@nepef.org.ng',
    nin: '10293847561',
    state: editForm.state,
    lga: editForm.lga,
    address: 'N-NEPEF Secretariat',
    occupation: 'Electrical Practitioner',
    specialization: 'Power Systems',
    yearsOfExperience: 10,
    company: 'Northern Energy',
    passportUrl: editForm.passportUrl,
    paymentReceiptUrl: activeRequest.receiptUrl,
    status: 'approved',
    role: 'member',
    position: editForm.position,
    issueDate: editForm.approvalDate,
    expiryDate: editForm.expiryDate,
    registeredAt: activeRequest.requestDate
  } : members[0];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-[#0A2E73] dark:text-[#2EA3F2]">
            <RefreshCcw className="w-6 h-6" />
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Super Admin Renewal Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Review submitted renewal requests, edit photos, digital signatures, positions, upload new card designs, regenerate smart ID cards, and record approval/expiry dates.
          </p>
        </div>

        {/* Stats Summary & Export Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span>Requests:</span>
            <span className="text-[#0A2E73] dark:text-[#2EA3F2]">{renewalRequests.length}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review:</span>
            <span>{renewalRequests.filter(r => r.status === 'Pending').length}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved:</span>
            <span>{renewalRequests.filter(r => r.status === 'Approved').length}</span>
          </div>
          <button
            type="button"
            onClick={handleExportRenewalsCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow transition-all ml-1 cursor-pointer"
            title="Download ID Card Renewals as Excel/CSV Spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[#0A2E73] dark:text-[#2EA3F2] uppercase tracking-wider">
          <Filter className="w-4 h-4" />
          <span>Filter Renewal Requests</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search member name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
          >
            <option value="all">All Request Statuses</option>
            <option value="Pending">Pending Review</option>
            <option value="Approved">Approved &amp; Regenerated</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
          >
            <option value="all">All States</option>
            {NORTHERN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* RENEWAL REQUESTS TABLE / GRID */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
          <RefreshCcw className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="font-display font-bold text-slate-700 dark:text-slate-300 text-sm">
            No ID card renewal requests found.
          </h3>
          <p className="text-xs text-slate-500">
            Members submit renewal requests with updated passport photos and signatures via their portal.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.map((request) => (
            <div 
              key={request.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                
                {/* Status Badge & Date */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    request.status === 'Approved'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : request.status === 'Pending'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                  }`}>
                    {request.status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                    {request.status === 'Pending' && <Clock className="w-3 h-3" />}
                    {request.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                    <span>{request.status}</span>
                  </span>

                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Requested: {request.requestDate}
                  </span>
                </div>

                {/* Member Identity Details */}
                <div className="flex items-center gap-3">
                  <img 
                    src={getValidImageUrl(request.passportUrl, 'avatar')} 
                    alt={request.fullName} 
                    onError={(e) => handleImageError(e, 'avatar')}
                    className="w-14 h-16 rounded-xl object-cover border-2 border-[#0A2E73] dark:border-[#2EA3F2] shadow"
                  />
                  <div className="space-y-0.5 overflow-hidden">
                    <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">
                      {request.fullName}
                    </h4>
                    <p className="font-mono font-bold text-xs text-sky-600 dark:text-sky-400 truncate">
                      {request.membershipId}
                    </p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold truncate">
                      {request.position}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {request.state} State Chapter
                    </p>
                  </div>
                </div>

                {/* Thumbnails of Signature & Receipt */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl text-[10px] text-slate-600 dark:text-slate-300">
                  <div className="space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <PenTool className="w-3 h-3 text-[#2EA3F2]" />
                      <span>Signature:</span>
                    </span>
                    <div className="h-10 bg-white dark:bg-slate-900 rounded-lg p-1 border flex items-center justify-center">
                      <img 
                        src={getValidImageUrl(request.signatureUrl, 'document')} 
                        alt="Signature" 
                        onError={(e) => handleImageError(e, 'document')}
                        className="max-h-full object-contain" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-[#2EA3F2]" />
                      <span>Receipt:</span>
                    </span>
                    <div className="h-10 bg-white dark:bg-slate-900 rounded-lg overflow-hidden border">
                      <img 
                        src={getValidImageUrl(request.receiptUrl, 'receipt')} 
                        alt="Receipt" 
                        onError={(e) => handleImageError(e, 'receipt')}
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  </div>
                </div>

                {/* Approval & Expiry Date info if approved */}
                {request.status === 'Approved' && (
                  <div className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl text-emerald-800 dark:text-emerald-200 space-y-0.5 border border-emerald-200 dark:border-emerald-800">
                    <div>Approved: <strong>{request.approvalDate}</strong></div>
                    <div>Valid Until: <strong>{request.expiryDate}</strong></div>
                  </div>
                )}
              </div>

              {/* Action Buttons Toolbar */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenReviewModal(request)}
                  className="flex-1 py-2 rounded-xl bg-[#0A2E73] hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#2EA3F2]" />
                  <span>Review &amp; Edit Request</span>
                </button>

                <button
                  onClick={() => setViewHistoryMemberId(request.memberId)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-100 dark:hover:bg-sky-950 hover:text-sky-600 transition-colors"
                  title="View Member Renewal History"
                >
                  <History className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* FULL SUPER ADMIN REVIEW, EDIT & REGENERATE MODAL */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl my-8 shadow-2xl overflow-hidden flex flex-col text-slate-900 dark:text-slate-100">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <RefreshCcw className="w-6 h-6 text-[#0A2E73] dark:text-[#2EA3F2]" />
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                    Super Admin ID Card Review &amp; Editor
                  </h3>
                  <p className="text-xs text-slate-500">
                    Regenerate membership ID card, update photos, signatures, positions, and validity dates.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setActiveRequest(null)}
                className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900 text-slate-600 dark:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Grid Content */}
            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto max-h-[75vh]">
              
              {/* LEFT COLUMN: EDIT FORM & CONTROLS */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. Member Information Override */}
                <div className="space-y-3">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#0A2E73] dark:text-[#2EA3F2]">
                    1. Edit Submitted Information
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Full Name</label>
                      <input
                        type="text"
                        value={editForm.fullName}
                        onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Membership ID</label>
                      <input
                        type="text"
                        value={editForm.membershipId}
                        onChange={(e) => setEditForm({ ...editForm, membershipId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Position / Title</label>
                      <input
                        type="text"
                        value={editForm.position}
                        onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">State Chapter</label>
                      <select
                        value={editForm.state}
                        onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                      >
                        {NORTHERN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. Photo & Signature Replacement */}
                <div className="space-y-3">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#0A2E73] dark:text-[#2EA3F2]">
                    2. Replace Photo &amp; Digital Signature
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Passport Replacement */}
                    <DualImageUpload
                      label="Passport Photograph"
                      subLabel="Take camera photo or select from gallery"
                      currentUrl={editForm.passportUrl}
                      onImageChange={(url) => setEditForm({ ...editForm, passportUrl: url })}
                      icon={Camera}
                      aspectRatio="square"
                      bucket="passports"
                    />

                    {/* Signature Replacement */}
                    <DualImageUpload
                      label="Digital Signature Scan"
                      subLabel="Take camera photo or select from gallery"
                      currentUrl={editForm.signatureUrl}
                      onImageChange={(url) => setEditForm({ ...editForm, signatureUrl: url })}
                      icon={PenTool}
                      aspectRatio="auto"
                      bucket="documents"
                    />
                  </div>
                </div>

                {/* 3. Dates & Validity Period */}
                <div className="space-y-3">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#0A2E73] dark:text-[#2EA3F2]">
                    3. Record Approval Date &amp; Expiry Date
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Approval / Issue Date</label>
                      <input
                        type="date"
                        value={editForm.approvalDate}
                        onChange={(e) => setEditForm({ ...editForm, approvalDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Expiration Date</label>
                      <input
                        type="date"
                        value={editForm.expiryDate}
                        onChange={(e) => setEditForm({ ...editForm, expiryDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Remarks & Rejection Reason */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Admin Remarks / Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Approval comments or audit notes..."
                    value={editForm.remarks}
                    onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  />
                </div>

              </div>

              {/* RIGHT COLUMN: LIVE REGENERATED CARD PREVIEW & DESIGN STYLES */}
              <div className="lg:col-span-5 space-y-6">
                
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-[#0A2E73] dark:text-[#2EA3F2] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>Live Regenerated Card Preview</span>
                  </h4>
                </div>

                {/* Card Live Rendering */}
                <div className="p-4 bg-slate-100 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-inner flex flex-col items-center justify-center">
                  <MembershipCard member={previewMemberObj} />
                </div>

                {/* Approval & Rejection Decision Bar */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Super Admin Decision &amp; Card Regeneration
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleSaveAndRegenerate('Approved')}
                      className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve &amp; Regenerate</span>
                    </button>

                    <button
                      onClick={() => handleSaveAndRegenerate('Rejected')}
                      className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject Request</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* RENEWAL HISTORY DRAWER */}
      {viewHistoryMemberId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-end p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between space-y-4">
            
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-[#2EA3F2]" />
                  <span>Member Renewal History Log</span>
                </h3>
                <button onClick={() => setViewHistoryMemberId(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[70vh]">
                {renewalRequests.filter(r => r.memberId === viewHistoryMemberId).map((historyItem) => (
                  <div key={historyItem.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    <div className="flex justify-between font-bold">
                      <span>Request ID: {historyItem.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase ${
                        historyItem.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {historyItem.status}
                      </span>
                    </div>
                    <p className="text-slate-500">Date Requested: {historyItem.requestDate}</p>
                    {historyItem.approvalDate && <p className="text-emerald-600">Approved Date: {historyItem.approvalDate}</p>}
                    {historyItem.expiryDate && <p className="text-sky-600">Valid Expiry: {historyItem.expiryDate}</p>}
                    <p className="text-slate-600 dark:text-slate-300 italic">{historyItem.remarks}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setViewHistoryMemberId(null)}
              className="w-full py-3 rounded-2xl bg-[#0A2E73] text-white font-bold text-xs"
            >
              Close History Drawer
            </button>

          </div>
        </div>
      )}

    </div>
  );
};
