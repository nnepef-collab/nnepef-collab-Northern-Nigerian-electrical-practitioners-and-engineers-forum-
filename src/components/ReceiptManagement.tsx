import React, { useState } from 'react';
import { PaymentRecord, Member, ForumSettings, NotificationDeliveryLog, NotificationItem } from '../types';
import { dispatchEventNotification } from '../utils/notificationDispatcher';
import { deleteItemFromCollection } from '../services/sqliteService';
import { DualImageUpload } from './DualImageUpload';
import { NORTHERN_STATES } from '../data/initialData';
import { handleImageError, getValidImageUrl, downloadFileSafely } from '../utils/imageHelpers';
import { 
  CreditCard, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  Download, 
  Trash2, 
  Edit3, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RefreshCw, 
  Upload, 
  MessageSquare, 
  MapPin, 
  Calendar, 
  DollarSign, 
  FileText,
  AlertTriangle,
  X,
  Maximize2
} from 'lucide-react';

interface ReceiptManagementProps {
  payments: PaymentRecord[];
  onUpdatePayments: (updated: PaymentRecord[]) => void;
  onAddAuditLog: (action: string, details: string) => void;
  members?: Member[];
  settings?: ForumSettings;
  onUpdateNotificationLogs?: (logs: NotificationDeliveryLog[]) => void;
  onUpdateNotifications?: (notifs: NotificationItem[]) => void;
}

export const ReceiptManagement: React.FC<ReceiptManagementProps> = ({
  payments,
  onUpdatePayments,
  onAddAuditLog,
  members,
  settings,
  onUpdateNotificationLogs,
  onUpdateNotifications,
}) => {
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('all');
  const [selectedLga, setSelectedLga] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // Active Receipt Modal States
  const [activeReceipt, setActiveReceipt] = useState<PaymentRecord | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Rejection Modal State
  const [rejectingPayment, setRejectingPayment] = useState<PaymentRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Replace Receipt State
  const [replacingPayment, setReplacingPayment] = useState<PaymentRecord | null>(null);
  const [newReceiptUrl, setNewReceiptUrl] = useState('');

  // Edit Remarks State
  const [editingRemarksPayment, setEditingRemarksPayment] = useState<PaymentRecord | null>(null);
  const [tempRemarks, setTempRemarks] = useState('');

  // Delete Confirm State
  const [deletingPayment, setDeletingPayment] = useState<PaymentRecord | null>(null);

  // Filter Payments Logic
  const filteredPayments = payments.filter((p) => {
    const matchesSearch = 
      p.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.membershipId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reference.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesState = selectedState === 'all' || p.state === selectedState;
    const matchesLga = !selectedLga || (p.lga && p.lga.toLowerCase().includes(selectedLga.toLowerCase()));
    const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
    const matchesType = selectedType === 'all' || p.type === selectedType;
    const matchesDate = !dateFilter || p.date === dateFilter;

    return matchesSearch && matchesState && matchesLga && matchesStatus && matchesType && matchesDate;
  });

  // Action Handlers
  const handleApprove = async (payment: PaymentRecord) => {
    const updated = payments.map((p) => 
      p.id === payment.id 
        ? { 
            ...p, 
            status: 'Verified' as const, 
            approvedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            approvedBy: 'Super Admin',
            remarks: p.remarks ? `${p.remarks} (Approved by Super Admin)` : 'Approved by Super Admin'
          } 
        : p
    );
    onUpdatePayments(updated);
    onAddAuditLog('RECEIPT_APPROVE', `Super Admin approved receipt ${payment.reference} for ${payment.memberName} (₦${payment.amount.toLocaleString()})`);

    // Find member to send payment_received notification
    const matchedMember = members?.find((m) => m.id === payment.memberId || m.membershipId === payment.membershipId) || {
      id: payment.memberId || `m-${Date.now()}`,
      membershipId: payment.membershipId || '',
      fullName: payment.memberName,
      email: '',
      phone: '',
      gender: 'Male',
      dob: '',
      nin: '',
      state: payment.state || 'Kano',
      lga: payment.lga || '',
      address: '',
      occupation: '',
      specialization: '',
      yearsOfExperience: 0,
      company: '',
      passportUrl: '',
      paymentReceiptUrl: payment.receiptUrl || '',
      status: 'approved',
      role: 'member',
      registeredAt: payment.date
    };

    const { logs: newLogs, inAppNotif } = await dispatchEventNotification({
      event: 'payment_received',
      member: matchedMember as Member,
      settings: settings || {} as ForumSettings,
      amount: payment.amount,
      reference: payment.reference
    });

    if (newLogs.length > 0 && onUpdateNotificationLogs) {
      onUpdateNotificationLogs(newLogs);
    }
    if (inAppNotif && onUpdateNotifications) {
      onUpdateNotifications([inAppNotif]);
    }
  };

  const handleConfirmReject = () => {
    if (!rejectingPayment) return;
    const updated = payments.map((p) => 
      p.id === rejectingPayment.id 
        ? { 
            ...p, 
            status: 'Rejected' as const, 
            rejectionReason: rejectionReason || 'Receipt verification failed.',
            remarks: `Rejected: ${rejectionReason || 'Invalid proof of payment'}`
          } 
        : p
    );
    onUpdatePayments(updated);
    onAddAuditLog('RECEIPT_REJECT', `Super Admin rejected receipt ${rejectingPayment.reference} for ${rejectingPayment.memberName}. Reason: ${rejectionReason}`);
    setRejectingPayment(null);
    setRejectionReason('');
  };

  const handleConfirmReplace = () => {
    if (!replacingPayment || !newReceiptUrl) return;
    const updated = payments.map((p) => 
      p.id === replacingPayment.id 
        ? { ...p, receiptUrl: newReceiptUrl, remarks: (p.remarks || '') + ' [Receipt Replaced by Admin]' } 
        : p
    );
    onUpdatePayments(updated);
    onAddAuditLog('RECEIPT_REPLACE', `Super Admin replaced receipt document for ${replacingPayment.memberName} (${replacingPayment.reference})`);
    setReplacingPayment(null);
    setNewReceiptUrl('');
  };

  const handleSaveRemarks = () => {
    if (!editingRemarksPayment) return;
    const updated = payments.map((p) => 
      p.id === editingRemarksPayment.id 
        ? { ...p, remarks: tempRemarks } 
        : p
    );
    onUpdatePayments(updated);
    onAddAuditLog('RECEIPT_REMARKS_UPDATE', `Updated remarks for receipt ${editingRemarksPayment.reference}`);
    setEditingRemarksPayment(null);
    setTempRemarks('');
  };

  const handleConfirmDelete = async () => {
    if (!deletingPayment) return;
    const targetId = deletingPayment.id;
    const targetRef = deletingPayment.reference;
    const targetMember = deletingPayment.memberName;
    const updated = payments.filter((p) => p.id !== targetId);
    onUpdatePayments(updated);
    try {
      await deleteItemFromCollection('payments', targetId);
    } catch (err) {
      console.error('Failed to delete payment from database:', err);
    }
    onAddAuditLog('RECEIPT_DELETE', `Deleted receipt record ${targetRef} for ${targetMember}`);
    setDeletingPayment(null);
  };

  const handleExportPaymentsCSV = () => {
    if (filteredPayments.length === 0) {
      alert('No payment receipt records available to export for the selected criteria.');
      return;
    }

    const headers = [
      'S/N',
      'Receipt Reference',
      'Member Name',
      'Membership ID',
      'State Chapter',
      'Local Govt Area (LGA)',
      'Payment Type',
      'Amount (NGN)',
      'Payment Status',
      'Transaction Date',
      'Payment Method',
      'Verified By',
      'Verification Date',
      'Remarks / Notes',
      'Receipt Proof URL'
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      const val = str !== undefined && str !== null ? String(str).replace(/"/g, '""') : '';
      return `"${val}"`;
    };

    const rows = filteredPayments.map((p, index) => [
      escapeCsv(index + 1),
      escapeCsv(p.reference),
      escapeCsv(p.memberName),
      escapeCsv(p.membershipId || 'PENDING'),
      escapeCsv(p.state || 'N/A'),
      escapeCsv(p.lga || 'N/A'),
      escapeCsv(p.type),
      escapeCsv(p.amount),
      escapeCsv(p.status.toUpperCase()),
      escapeCsv(p.date),
      escapeCsv(p.paymentMethod || 'Bank Transfer'),
      escapeCsv(p.approvedBy || 'N/A'),
      escapeCsv(p.approvedAt || 'N/A'),
      escapeCsv(p.remarks || ''),
      escapeCsv(p.receiptUrl || '')
    ]);

    // UTF-8 BOM (\uFEFF) ensures accurate display in Microsoft Excel & Google Sheets
    const csvContent = '\uFEFF' + [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `NNEPEF_Payment_Receipts_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onAddAuditLog('RECEIPT_EXPORT_CSV', `Super Admin exported ${filteredPayments.length} payment receipt record(s) to CSV spreadsheet`);
  };

  const handleDownloadReceipt = (receiptUrl: string, reference: string, e?: React.MouseEvent) => {
    downloadFileSafely(receiptUrl, `NNEPEF-Receipt-${reference}.jpeg`, e);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#0A2E73] dark:text-[#2EA3F2]" />
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Super Admin Receipt Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audit, verify, zoom, replace, and manage member payment receipts across 19 Northern States &amp; FCT.
          </p>
        </div>

        {/* Stats Summary Pills & Export Action */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <span>Total:</span>
            <span className="text-[#0A2E73] dark:text-[#2EA3F2]">{payments.length}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Verified:</span>
            <span>{payments.filter(p => p.status === 'Verified').length}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending:</span>
            <span>{payments.filter(p => p.status === 'Pending').length}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/60 text-xs font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            <span>Rejected:</span>
            <span>{payments.filter(p => p.status === 'Rejected').length}</span>
          </div>
          <button
            type="button"
            onClick={handleExportPaymentsCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold shadow transition-all ml-1 cursor-pointer"
            title="Download Payments and Receipts as Excel/CSV Spreadsheet"
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
          <span>Filter &amp; Search Receipts</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          
          {/* Search Field */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search member name, ID or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2EA3F2] outline-none"
            />
          </div>

          {/* State Filter */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2EA3F2] outline-none"
          >
            <option value="all">All States</option>
            {NORTHERN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* LGA Filter */}
          <input
            type="text"
            placeholder="Filter LGA..."
            value={selectedLga}
            onChange={(e) => setSelectedLga(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2EA3F2] outline-none"
          />

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2EA3F2] outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Verified">Verified</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2EA3F2] outline-none"
          />

        </div>
      </div>

      {/* RECEIPT CARDS LIST */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
          <CreditCard className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
          <h3 className="font-display font-bold text-slate-700 dark:text-slate-300 text-sm">
            No payment receipts match your filter criteria.
          </h3>
          <p className="text-xs text-slate-500">
            Try adjusting state, LGA, or payment status filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPayments.map((payment) => (
            <div 
              key={payment.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header Row: Status Badge & Amount */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      payment.status === 'Verified'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : payment.status === 'Pending'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                    }`}>
                      {payment.status === 'Verified' && <CheckCircle2 className="w-3 h-3" />}
                      {payment.status === 'Pending' && <Clock className="w-3 h-3" />}
                      {payment.status === 'Rejected' && <XCircle className="w-3 h-3" />}
                      <span>{payment.status}</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-display font-extrabold text-base text-[#0A2E73] dark:text-[#2EA3F2]">
                      ₦{payment.amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Member Info */}
                <div>
                  <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white leading-tight">
                    {payment.memberName}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span className="font-mono text-sky-600 dark:text-sky-400 font-bold">
                      {payment.membershipId || 'PENDING ID'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {payment.state || 'Kano'} {payment.lga ? `(${payment.lga})` : ''}
                    </span>
                  </div>
                </div>

                {/* Payment Category & Reference */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Category:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{payment.type}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Ref No:</span>
                    <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">{payment.reference}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Date Paid:</span>
                    <span>{payment.date}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Method:</span>
                    <span>{payment.paymentMethod}</span>
                  </div>
                </div>

                {/* Receipt Image Thumbnail */}
                <div 
                  onClick={() => { setActiveReceipt(payment); setZoomLevel(1); setRotation(0); }}
                  className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 h-36 bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-inner"
                >
                  <img 
                    src={getValidImageUrl(payment.receiptUrl, 'receipt')} 
                    alt="Uploaded receipt" 
                    onError={(e) => handleImageError(e, 'receipt')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs">
                    <ZoomIn className="w-5 h-5 text-sky-400" />
                    <span>View &amp; Zoom</span>
                  </div>
                </div>

                {/* Remarks & Admin Notes */}
                {payment.remarks && (
                  <div className="text-[11px] bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-2.5 rounded-xl flex items-start gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
                    <span className="leading-tight">{payment.remarks}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons Toolbar */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                
                {/* Approve / Reject Controls */}
                <div className="flex items-center gap-1.5">
                  {payment.status !== 'Verified' && (
                    <button
                      onClick={() => handleApprove(payment)}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 transition-all flex items-center gap-1 shadow-sm"
                      title="Approve Receipt"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}

                  {payment.status !== 'Rejected' && (
                    <button
                      onClick={() => { setRejectingPayment(payment); setRejectionReason(''); }}
                      className="px-2.5 py-1.5 rounded-xl bg-red-600 text-white font-bold text-[11px] hover:bg-red-700 transition-all flex items-center gap-1 shadow-sm"
                      title="Reject Receipt"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  )}
                </div>

                {/* Secondary Actions */}
                <div className="flex items-center gap-1">
                  
                  {/* Zoom Modal Launcher */}
                  <button
                    onClick={() => { setActiveReceipt(payment); setZoomLevel(1); setRotation(0); }}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-100 dark:hover:bg-sky-950 hover:text-sky-600 transition-colors"
                    title="Zoom Receipt Image"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>

                  {/* Download Receipt */}
                  <button
                    onClick={() => handleDownloadReceipt(payment.receiptUrl, payment.reference)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-100 dark:hover:bg-sky-950 hover:text-sky-600 transition-colors"
                    title="Download Receipt"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Replace Receipt */}
                  <button
                    onClick={() => { setReplacingPayment(payment); setNewReceiptUrl(payment.receiptUrl); }}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950 hover:text-amber-600 transition-colors"
                    title="Replace Uploaded Receipt"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  {/* Edit Remarks */}
                  <button
                    onClick={() => { setEditingRemarksPayment(payment); setTempRemarks(payment.remarks || ''); }}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-indigo-950 hover:text-indigo-600 transition-colors"
                    title="Add or Edit Remarks"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>

                  {/* Delete Receipt */}
                  <button
                    onClick={() => setDeletingPayment(payment)}
                    className="p-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                    title="Delete Receipt Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                </div>

              </div>

            </div>
          ))}
        </div>
      )}

      {/* 1. ZOOM & DETAIL LIGHTBOX MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-white">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  Payment Receipt Document ({activeReceipt.memberName})
                </h3>
                <p className="text-xs text-sky-400 font-mono">
                  Ref: {activeReceipt.reference} • ₦{activeReceipt.amount.toLocaleString()} ({activeReceipt.type})
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Zoom Controls */}
                <button
                  onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
                  title="Rotate Image"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => { setZoomLevel(1); setRotation(0); }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  Reset Zoom
                </button>

                <button
                  onClick={() => handleDownloadReceipt(activeReceipt.receiptUrl, activeReceipt.reference)}
                  className="px-3.5 py-2 rounded-xl bg-[#0A2E73] hover:bg-sky-700 text-xs font-bold text-white flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-[#2EA3F2]" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => setActiveReceipt(null)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body with Zoom Canvas */}
            <div className="p-6 flex-1 overflow-auto bg-slate-950/90 flex items-center justify-center min-h-[380px]">
              <div className="transition-transform duration-200" style={{ transform: `scale(${zoomLevel}) rotate(${rotation}deg)` }}>
                <img 
                  src={getValidImageUrl(activeReceipt.receiptUrl, 'receipt')} 
                  alt="High-Res Receipt" 
                  onError={(e) => handleImageError(e, 'receipt')}
                  className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-2xl border border-slate-700" 
                />
              </div>
            </div>

            {/* Modal Footer Info */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-4">
              <div>
                <span>State/LGA: <strong className="text-white">{activeReceipt.state || 'Kano'} ({activeReceipt.lga || 'N/A'})</strong></span>
                <span className="mx-2">•</span>
                <span>Payment Method: <strong className="text-white">{activeReceipt.paymentMethod}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                {activeReceipt.status !== 'Verified' && (
                  <button
                    onClick={() => { handleApprove(activeReceipt); setActiveReceipt(null); }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Receipt</span>
                  </button>
                )}

                {activeReceipt.status !== 'Rejected' && (
                  <button
                    onClick={() => { setRejectingPayment(activeReceipt); setActiveReceipt(null); }}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Receipt</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 2. REJECT RECEIPT MODAL */}
      {rejectingPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-display font-bold text-base text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Reject Payment Receipt</span>
              </h3>
              <button onClick={() => setRejectingPayment(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              You are rejecting the payment receipt submitted by <strong>{rejectingPayment.memberName}</strong> (Ref: {rejectingPayment.reference}).
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Rejection Reason / Remarks for Member *
              </label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Transaction reference unreadable, bank teller image truncated, or payment amount mismatch."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingPayment(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. REPLACE RECEIPT MODAL */}
      {replacingPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-500" />
                <span>Replace Uploaded Receipt</span>
              </h3>
              <button onClick={() => setReplacingPayment(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Override and upload a clearer receipt image for member <strong>{replacingPayment.memberName}</strong>.
            </p>

            <div className="space-y-3">
              <DualImageUpload
                label="New Receipt Document / Teller"
                subLabel="Take camera photo or choose from gallery"
                currentUrl={newReceiptUrl}
                onImageChange={(url) => setNewReceiptUrl(url)}
                icon={CreditCard}
                aspectRatio="receipt"
                required
                bucket="receipts"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReplacingPayment(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReplace}
                className="px-4 py-2 rounded-xl bg-[#0A2E73] hover:bg-sky-700 text-white text-xs font-bold shadow-md"
              >
                Save Replaced Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. EDIT REMARKS MODAL */}
      {editingRemarksPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-500" />
                <span>Add / Edit Remarks</span>
              </h3>
              <button onClick={() => setEditingRemarksPayment(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Admin Remarks / Comments
              </label>
              <textarea
                rows={3}
                placeholder="Enter audit notes or transaction verification remarks..."
                value={tempRemarks}
                onChange={(e) => setTempRemarks(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingRemarksPayment(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRemarks}
                className="px-4 py-2 rounded-xl bg-[#0A2E73] hover:bg-sky-700 text-white text-xs font-bold"
              >
                Save Remarks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. DELETE RECEIPT CONFIRM MODAL */}
      {deletingPayment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-600 font-bold text-base">
              <Trash2 className="w-5 h-5" />
              <span>Confirm Delete Receipt</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Are you sure you want to permanently delete receipt record <strong>{deletingPayment.reference}</strong> for {deletingPayment.memberName}?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingPayment(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
