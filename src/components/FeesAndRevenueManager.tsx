import React, { useState, useMemo, useEffect } from 'react';
import { ForumSettings, FeeCategory, BankAccount, PaymentRecord, Member } from '../types';
import { 
  CreditCard, 
  Plus, 
  Save, 
  Trash2, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Edit,
  DollarSign,
  ShieldCheck,
  Check,
  TrendingUp,
  Info,
  Calendar,
  Filter,
  Download,
  Search,
  Receipt,
  FileSpreadsheet,
  Clock,
  XCircle,
  Eye,
  Sliders,
  ExternalLink,
  Layers,
  HelpCircle,
  Copy,
  RefreshCw,
  Lock
} from 'lucide-react';
import { 
  saveFeeCategoryToSupabase, 
  deleteFeeCategoryFromSupabase, 
  fetchFeeCategoriesFromSupabase,
  saveBankAccountToSupabase,
  deleteBankAccountFromSupabase,
  fetchBankAccountsFromSupabase,
  savePaymentToSupabase,
  deletePaymentFromSupabase
} from '../services/supabaseService';
import { getLocalBankAccounts, saveLocalBankAccounts } from '../services/localDatabaseService';

interface FeesAndRevenueManagerProps {
  settings: ForumSettings;
  payments: PaymentRecord[];
  members: Member[];
  onUpdateSettings: (newSettings: ForumSettings) => void;
  onUpdatePayments: (newPayments: PaymentRecord[]) => void;
  onAddAuditLog: (action: string, details: string) => void;
  currentAdminName?: string;
  currentAdminRole?: string;
}

type DateFilterRange = 'all' | 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';
type ActiveSubTab = 'overview' | 'fee_types' | 'transactions' | 'bank_accounts';

export const FeesAndRevenueManager: React.FC<FeesAndRevenueManagerProps> = ({
  settings,
  payments = [],
  members = [],
  onUpdateSettings,
  onUpdatePayments,
  onAddAuditLog,
  currentAdminName = 'Admin User',
  currentAdminRole = 'Admin',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('overview');

  // Fee Categories state
  const [feeCategories, setFeeCategories] = useState<FeeCategory[]>(() => {
    return settings.feeCategories && settings.feeCategories.length > 0
      ? settings.feeCategories
      : [
          {
            id: 'fee-1',
            name: 'New Membership Registration Fee',
            code: 'registration',
            amount: 25000,
            enabled: true,
            description: 'Official one-time registration fee for new electrical practitioners & engineers.',
            instructions: 'Required for initial verification and membership ID issuance.'
          },
          {
            id: 'fee-2',
            name: 'Membership Renewal Fee',
            code: 'renewal',
            amount: 15000,
            enabled: true,
            description: 'Annual membership renewal and practicing license validation.',
            instructions: 'Payable annually by active registered members.'
          },
          {
            id: 'fee-3',
            name: 'ID Card Renewal Fee',
            code: 'id_card_renewal',
            amount: 10000,
            enabled: true,
            description: 'Fee for renewing or upgrading membership smart ID card.',
            instructions: 'Submit along with updated passport photo and digital signature.'
          },
          {
            id: 'fee-4',
            name: 'Replacement ID Card Fee',
            code: 'id_card_replacement',
            amount: 12000,
            enabled: true,
            description: 'Fee for lost, damaged, or stolen membership ID card replacement.',
            instructions: 'Includes fast-track printing and security seal re-verification.'
          }
        ];
  });

  // Sync fee categories from Supabase on mount
  useEffect(() => {
    fetchFeeCategoriesFromSupabase().then((data) => {
      if (data && data.length > 0) {
        setFeeCategories(data);
      }
    });
  }, []);

  // Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => getLocalBankAccounts());

  useEffect(() => {
    fetchBankAccountsFromSupabase().then((data) => {
      if (data && data.length > 0) {
        setBankAccounts(data);
      }
    });
  }, [settings.bankAccounts]);

  const [paymentInstructions, setPaymentInstructions] = useState<string>(
    settings.paymentInstructions || 
    'Please make payment into our official N-NEPEF Bank Account listed above. After payment, upload a clear picture or PDF of your transaction receipt for instant verification.'
  );

  // Date Range Filtering for Financial Controls
  const [dateRange, setDateRange] = useState<DateFilterRange>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Transaction Ledger Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Verified' | 'Pending' | 'Rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals & Form States
  const [isAddingFee, setIsAddingFee] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeCategory | null>(null);
  const [feeFormData, setFeeFormData] = useState({
    name: '',
    code: '',
    amount: 5000,
    description: '',
    instructions: '',
    enabled: true,
    deadline: ''
  });

  const [isAddingBank, setIsAddingBank] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [bankFormData, setBankFormData] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
    paymentInstructions: '',
    notes: ''
  });

  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    memberId: '',
    type: 'Annual Levy',
    amount: 25000,
    reference: '',
    paymentMethod: 'Bank Transfer',
    remarks: ''
  });

  const [viewingReceiptPayment, setViewingReceiptPayment] = useState<PaymentRecord | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Settings updated successfully!');
  const [copiedAccNum, setCopiedAccNum] = useState(false);

  // Filter payments based on date range
  const filteredPaymentsByDate = useMemo(() => {
    if (dateRange === 'all') return payments;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return payments.filter((p) => {
      if (!p.date) return false;
      const paymentDate = new Date(p.date);
      const pDateStr = p.date.split('T')[0];

      if (dateRange === 'today') {
        return pDateStr === todayStr;
      }

      if (dateRange === 'this_week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return paymentDate >= weekAgo && paymentDate <= now;
      }

      if (dateRange === 'this_month') {
        return (
          paymentDate.getFullYear() === now.getFullYear() &&
          paymentDate.getMonth() === now.getMonth()
        );
      }

      if (dateRange === 'this_year') {
        return paymentDate.getFullYear() === now.getFullYear();
      }

      if (dateRange === 'custom') {
        if (customStartDate && pDateStr < customStartDate) return false;
        if (customEndDate && pDateStr > customEndDate) return false;
        return true;
      }

      return true;
    });
  }, [payments, dateRange, customStartDate, customEndDate]);

  // Dynamic Financial Controls & Statistics (Calculated strictly from real database records)
  const financialStats = useMemo(() => {
    const verifiedPayments = filteredPaymentsByDate.filter(
      (p) => p.status === 'Verified' || (p.status as string) === 'Approved'
    );
    const pendingPayments = filteredPaymentsByDate.filter((p) => p.status === 'Pending');
    const rejectedPayments = filteredPaymentsByDate.filter((p) => p.status === 'Rejected');

    const totalRevenue = verifiedPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const totalFeesCollected = totalRevenue;
    const pendingAmount = pendingPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    const paidTransactionsCount = verifiedPayments.length;
    const pendingTransactionsCount = pendingPayments.length;
    const rejectedTransactionsCount = rejectedPayments.length;
    const totalTransactionsCount = filteredPaymentsByDate.length;

    // Revenue by Fee Type
    const revenueByTypeMap = new Map<string, { amount: number; count: number }>();
    verifiedPayments.forEach((p) => {
      const typeKey = p.type || 'Other Fee';
      const existing = revenueByTypeMap.get(typeKey) || { amount: 0, count: 0 };
      revenueByTypeMap.set(typeKey, {
        amount: existing.amount + (Number(p.amount) || 0),
        count: existing.count + 1
      });
    });

    const revenueByType = Array.from(revenueByTypeMap.entries()).map(([type, data]) => ({
      type,
      amount: data.amount,
      count: data.count,
      percentage: totalRevenue > 0 ? Math.round((data.amount / totalRevenue) * 100) : 0
    }));

    return {
      totalRevenue,
      totalFeesCollected,
      pendingAmount,
      paidTransactionsCount,
      pendingTransactionsCount,
      rejectedTransactionsCount,
      totalTransactionsCount,
      revenueByType
    };
  }, [filteredPaymentsByDate]);

  // Filtered transactions for the ledger table
  const ledgerTransactions = useMemo(() => {
    return filteredPaymentsByDate.filter((p) => {
      // Status filter
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'all' && p.type !== typeFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.memberName || '').toLowerCase().includes(q);
        const matchId = (p.membershipId || '').toLowerCase().includes(q);
        const matchRef = (p.reference || '').toLowerCase().includes(q);
        const matchState = (p.state || '').toLowerCase().includes(q);
        const matchType = (p.type || '').toLowerCase().includes(q);
        return matchName || matchId || matchRef || matchState || matchType;
      }

      return true;
    });
  }, [filteredPaymentsByDate, statusFilter, typeFilter, searchQuery]);

  // FEE CATEGORY HANDLERS
  const handleOpenAddFee = () => {
    setEditingFee(null);
    setFeeFormData({
      name: '',
      code: `fee_${Date.now()}`,
      amount: 10000,
      description: '',
      instructions: '',
      enabled: true,
      deadline: ''
    });
    setIsAddingFee(true);
  };

  const handleOpenEditFee = (fee: FeeCategory) => {
    setEditingFee(fee);
    setFeeFormData({
      name: fee.name,
      code: fee.code,
      amount: fee.amount,
      description: fee.description || '',
      instructions: fee.instructions || '',
      enabled: fee.enabled,
      deadline: fee.deadline || ''
    });
    setIsAddingFee(true);
  };

  const handleSaveFeeForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeFormData.name.trim()) return;

    let updatedFee: FeeCategory;

    if (editingFee) {
      updatedFee = {
        ...editingFee,
        name: feeFormData.name.trim(),
        code: feeFormData.code || editingFee.code,
        amount: Math.max(0, Number(feeFormData.amount)),
        description: feeFormData.description.trim() || undefined,
        instructions: feeFormData.instructions.trim() || undefined,
        enabled: feeFormData.enabled,
        deadline: feeFormData.deadline || undefined
      };

      const updatedList = feeCategories.map((f) => (f.id === editingFee.id ? updatedFee : f));
      setFeeCategories(updatedList);
      await saveFeeCategoryToSupabase(updatedFee);

      onUpdateSettings({
        ...settings,
        feeCategories: updatedList
      });

      onAddAuditLog(
        'FEE_TYPE_UPDATE',
        `Admin (${currentAdminName}) updated fee type "${updatedFee.name}" amount to ₦${updatedFee.amount.toLocaleString()} (Active: ${updatedFee.enabled}).`
      );
    } else {
      updatedFee = {
        id: `fee-${Date.now()}`,
        name: feeFormData.name.trim(),
        code: feeFormData.code.trim() || `fee_${Date.now()}`,
        amount: Math.max(0, Number(feeFormData.amount)),
        description: feeFormData.description.trim() || 'Official fee schedule category.',
        instructions: feeFormData.instructions.trim() || 'Pay into official secretariat bank account.',
        enabled: feeFormData.enabled,
        deadline: feeFormData.deadline || undefined
      };

      const updatedList = [...feeCategories, updatedFee];
      setFeeCategories(updatedList);
      await saveFeeCategoryToSupabase(updatedFee);

      onUpdateSettings({
        ...settings,
        feeCategories: updatedList
      });

      onAddAuditLog(
        'FEE_TYPE_CREATE',
        `Admin (${currentAdminName}) created fee type "${updatedFee.name}" with amount ₦${updatedFee.amount.toLocaleString()}.`
      );
    }

    setIsAddingFee(false);
    setEditingFee(null);
    setSuccessMessage(`Fee type "${updatedFee.name}" saved successfully to database.`);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleToggleFeeActive = async (fee: FeeCategory) => {
    const toggled: FeeCategory = { ...fee, enabled: !fee.enabled };
    const updatedList = feeCategories.map((f) => (f.id === fee.id ? toggled : f));
    setFeeCategories(updatedList);
    await saveFeeCategoryToSupabase(toggled);

    onUpdateSettings({
      ...settings,
      feeCategories: updatedList
    });

    onAddAuditLog(
      'FEE_TYPE_STATUS_TOGGLE',
      `Admin (${currentAdminName}) set fee type "${fee.name}" status to ${toggled.enabled ? 'ACTIVE' : 'DEACTIVATED'}.`
    );
  };

  const handleDeleteFee = async (feeId: string) => {
    const target = feeCategories.find((f) => f.id === feeId);
    if (!target) return;

    if (
      window.confirm(
        `Are you sure you want to permanently delete or deactivate the fee type "${target.name}"?`
      )
    ) {
      const updatedList = feeCategories.filter((f) => f.id !== feeId);
      setFeeCategories(updatedList);
      await deleteFeeCategoryFromSupabase(feeId);

      onUpdateSettings({
        ...settings,
        feeCategories: updatedList
      });

      onAddAuditLog(
        'FEE_TYPE_DELETE',
        `Admin (${currentAdminName}) deleted fee category "${target.name}".`
      );

      setSuccessMessage(`Fee type "${target.name}" removed from active fee schedule.`);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    }
  };

  // PAYMENT ACTIONS
  const handleVerifyPayment = async (payment: PaymentRecord) => {
    const updated: PaymentRecord = {
      ...payment,
      status: 'Verified',
      approvedAt: new Date().toISOString(),
      approvedBy: `${currentAdminName} (${currentAdminRole})`
    };

    const updatedList = payments.map((p) => (p.id === payment.id ? updated : p));
    onUpdatePayments(updatedList);
    await savePaymentToSupabase(updated);

    onAddAuditLog(
      'PAYMENT_VERIFY',
      `Verified payment ₦${updated.amount.toLocaleString()} (${updated.type}) for member ${updated.memberName} [Ref: ${updated.reference}]`
    );

    setSuccessMessage(`Payment record ${updated.reference} verified and added to official revenue.`);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleRejectPayment = async (payment: PaymentRecord) => {
    const reason = window.prompt(
      `Enter reason for rejecting payment reference ${payment.reference}:`,
      'Invalid bank teller receipt or amount mismatch.'
    );
    if (reason === null) return;

    const updated: PaymentRecord = {
      ...payment,
      status: 'Rejected',
      rejectionReason: reason || 'Receipt rejected by Administrator.',
      approvedBy: `${currentAdminName} (${currentAdminRole})`
    };

    const updatedList = payments.map((p) => (p.id === payment.id ? updated : p));
    onUpdatePayments(updatedList);
    await savePaymentToSupabase(updated);

    onAddAuditLog(
      'PAYMENT_REJECT',
      `Rejected payment ₦${payment.amount.toLocaleString()} for ${payment.memberName}. Reason: ${updated.rejectionReason}`
    );

    setSuccessMessage(`Payment record ${payment.reference} rejected.`);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleDeletePaymentRecord = async (paymentId: string) => {
    const target = payments.find((p) => p.id === paymentId);
    if (!target) return;

    if (
      window.confirm(
        `Are you sure you want to permanently delete transaction record [${target.reference}] for ${target.memberName}?`
      )
    ) {
      const updatedList = payments.filter((p) => p.id !== paymentId);
      onUpdatePayments(updatedList);
      await deletePaymentFromSupabase(paymentId);

      onAddAuditLog(
        'PAYMENT_DELETE',
        `Admin (${currentAdminName}) deleted payment record ${target.reference} (₦${target.amount.toLocaleString()})`
      );

      setSuccessMessage(`Payment record ${target.reference} permanently removed.`);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    }
  };

  const handleCreateManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedMember = members.find((m) => m.id === newPayment.memberId) || members[0];
    if (!selectedMember) {
      alert('Please select a valid member.');
      return;
    }

    const refCode =
      newPayment.reference.trim() ||
      `REF-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const rec: PaymentRecord = {
      id: `pay-${Date.now()}`,
      memberId: selectedMember.id,
      memberName: selectedMember.fullName,
      membershipId: selectedMember.membershipId || 'PENDING',
      state: selectedMember.state,
      lga: selectedMember.lga,
      amount: Math.max(0, Number(newPayment.amount)),
      type: newPayment.type,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: newPayment.paymentMethod,
      reference: refCode,
      receiptUrl:
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=400',
      status: 'Verified',
      remarks: newPayment.remarks || 'Manual recording by Secretariat Admin',
      approvedAt: new Date().toISOString(),
      approvedBy: `${currentAdminName} (${currentAdminRole})`
    };

    const updatedList = [rec, ...payments];
    onUpdatePayments(updatedList);
    await savePaymentToSupabase(rec);

    setShowAddPaymentModal(false);
    setNewPayment({
      memberId: '',
      type: 'Annual Levy',
      amount: 25000,
      reference: '',
      paymentMethod: 'Bank Transfer',
      remarks: ''
    });

    onAddAuditLog(
      'PAYMENT_MANUAL_RECORD',
      `Recorded manual verified payment ₦${rec.amount.toLocaleString()} (${rec.type}) for ${rec.memberName} [Ref: ${rec.reference}]`
    );

    setSuccessMessage(`Manual payment ₦${rec.amount.toLocaleString()} recorded for ${rec.memberName}.`);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  // BANK ACCOUNT HANDLERS
  const handleSetActiveBank = async (bankId: string) => {
    const updated = bankAccounts.map((b) => ({
      ...b,
      isActive: b.id === bankId
    }));
    setBankAccounts(updated);
    saveLocalBankAccounts(updated);

    const activeBank = updated.find((b) => b.id === bankId);
    if (activeBank) {
      await saveBankAccountToSupabase(activeBank);

      onAddAuditLog(
        'BANK_ACCOUNT_SET_ACTIVE',
        `Admin (${currentAdminName}) changed primary active bank account to ${activeBank.bankName} (${activeBank.accountNumber}).`
      );

      onUpdateSettings({
        ...settings,
        bankAccounts: updated,
        bankName: activeBank.bankName,
        bankAccountName: activeBank.accountName,
        bankAccountNumber: activeBank.accountNumber,
        paymentInstructions: activeBank.paymentInstructions || settings.paymentInstructions
      });
    }
  };

  const handleSaveBankForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankFormData.bankName || !bankFormData.accountNumber || !bankFormData.accountName) return;

    let updatedList: BankAccount[] = [];

    if (editingBank) {
      const updatedBank: BankAccount = {
        ...editingBank,
        bankName: bankFormData.bankName.trim(),
        accountName: bankFormData.accountName.trim(),
        accountNumber: bankFormData.accountNumber.trim(),
        branch: bankFormData.branch.trim() || undefined,
        paymentInstructions: bankFormData.paymentInstructions.trim() || undefined,
        notes: bankFormData.notes.trim() || undefined
      };

      updatedList = bankAccounts.map((b) => (b.id === editingBank.id ? updatedBank : b));
      setBankAccounts(updatedList);
      setEditingBank(null);
      await saveBankAccountToSupabase(updatedBank);

      onAddAuditLog(
        'BANK_ACCOUNT_UPDATE',
        `Admin (${currentAdminName}) updated bank account [${updatedBank.bankName} - ${updatedBank.accountNumber}]`
      );
    } else {
      const newBank: BankAccount = {
        id: `bank-${Date.now()}`,
        bankName: bankFormData.bankName.trim(),
        accountName: bankFormData.accountName.trim(),
        accountNumber: bankFormData.accountNumber.trim(),
        branch: bankFormData.branch.trim() || undefined,
        paymentInstructions: bankFormData.paymentInstructions.trim() || undefined,
        isActive: bankAccounts.length === 0,
        notes: bankFormData.notes.trim() || undefined
      };

      updatedList = [...bankAccounts, newBank];
      setBankAccounts(updatedList);
      setIsAddingBank(false);
      await saveBankAccountToSupabase(newBank);

      onAddAuditLog(
        'BANK_ACCOUNT_ADD',
        `Admin (${currentAdminName}) added bank account: ${newBank.bankName} (${newBank.accountNumber}).`
      );
    }

    setBankFormData({
      bankName: '',
      accountName: '',
      accountNumber: '',
      branch: '',
      paymentInstructions: '',
      notes: ''
    });

    const verifiedAccounts = saveLocalBankAccounts(updatedList);
    setBankAccounts(verifiedAccounts);

    const activeBank =
      verifiedAccounts.find((b) => b.isActive) ||
      (verifiedAccounts.length > 0 ? verifiedAccounts[0] : null);

    onUpdateSettings({
      ...settings,
      bankAccounts: verifiedAccounts,
      bankName: activeBank ? activeBank.bankName : '',
      bankAccountName: activeBank ? activeBank.accountName : '',
      bankAccountNumber: activeBank ? activeBank.accountNumber : '',
      paymentInstructions: activeBank?.paymentInstructions || settings.paymentInstructions
    });

    setSuccessMessage('Bank account saved and synchronized across portal.');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleDeleteBank = async (bankId: string) => {
    const target = bankAccounts.find((b) => b.id === bankId);
    if (!target) return;

    if (
      window.confirm(
        `Are you sure you want to delete bank account "${target.bankName} (${target.accountNumber})"?`
      )
    ) {
      const remaining = bankAccounts.filter((b) => b.id !== bankId);
      if (target.isActive && remaining.length > 0) {
        remaining[0].isActive = true;
      }
      setBankAccounts(remaining);
      saveLocalBankAccounts(remaining);
      await deleteBankAccountFromSupabase(bankId);

      onAddAuditLog(
        'BANK_ACCOUNT_DELETE',
        `Admin (${currentAdminName}) deleted bank account: ${target.bankName} (${target.accountNumber}).`
      );

      const activeBank =
        remaining.find((b) => b.isActive) || (remaining.length > 0 ? remaining[0] : null);

      onUpdateSettings({
        ...settings,
        bankAccounts: remaining,
        bankName: activeBank ? activeBank.bankName : '',
        bankAccountName: activeBank ? activeBank.accountName : '',
        bankAccountNumber: activeBank ? activeBank.accountNumber : ''
      });

      setSuccessMessage(`Bank account ${target.bankName} deleted.`);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    }
  };

  // EXPORT FINANCIAL LEDGER TO CSV
  const handleExportFinancialCSV = () => {
    const headers = [
      'Transaction Reference',
      'Date',
      'Member Name',
      'Membership ID',
      'State',
      'LGA',
      'Fee Category',
      'Amount (NGN)',
      'Payment Method',
      'Status',
      'Approved By',
      'Remarks'
    ];

    const rows = ledgerTransactions.map((t) => [
      `"${t.reference || ''}"`,
      `"${t.date || ''}"`,
      `"${(t.memberName || '').replace(/"/g, '""')}"`,
      `"${t.membershipId || ''}"`,
      `"${t.state || ''}"`,
      `"${t.lga || ''}"`,
      `"${(t.type || '').replace(/"/g, '""')}"`,
      t.amount || 0,
      `"${t.paymentMethod || 'Bank Transfer'}"`,
      `"${t.status || 'Pending'}"`,
      `"${(t.approvedBy || '').replace(/"/g, '""')}"`,
      `"${(t.remarks || '').replace(/"/g, '""')}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `NNEPEF_Financial_Statement_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddAuditLog(
      'FINANCIAL_REPORT_EXPORT',
      `Admin (${currentAdminName}) exported financial ledger (${ledgerTransactions.length} records, Range: ${dateRange}) to CSV.`
    );
  };

  // Quick Bank Details copy helper
  const copyAccountNumber = (acc: string) => {
    navigator.clipboard.writeText(acc);
    setCopiedAccNum(true);
    setTimeout(() => setCopiedAccNum(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#0A2E73] dark:text-[#2EA3F2]">
            <DollarSign className="w-6 h-6 text-emerald-500" />
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white">
              Fees &amp; Revenue Management Suite
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl">
            Protected Secretariat Financial Control Panel. Configure fee schedules in Nigerian Naira (₦), track verified collections dynamically, filter revenue by date range, manage payment ledgers, and maintain official bank accounts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleExportFinancialCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all border border-slate-300 dark:border-slate-700"
            title="Export filtered financial statement as CSV"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Export Statement (CSV)</span>
          </button>

          <button
            onClick={() => setShowAddPaymentModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Success Alert Banner */}
      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/90 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 px-2 py-0.5 rounded font-mono">
            Live Database Sync
          </span>
        </div>
      )}

      {/* SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'overview', label: 'Financial Controls & Analytics', icon: TrendingUp },
          { id: 'fee_types', label: 'Fee Schedule & Levies Types', icon: Sliders },
          { id: 'transactions', label: 'Transaction & Payment Ledger', icon: Receipt },
          { id: 'bank_accounts', label: 'Official Bank Accounts', icon: Building2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as ActiveSubTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#0A2E73] text-white dark:bg-[#2EA3F2] dark:text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.id === 'transactions' && financialStats.pendingTransactionsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-mono font-bold">
                  {financialStats.pendingTransactionsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* DATE RANGE FILTER BAR (Applied dynamically across financial statistics) */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Calendar className="w-4 h-4 text-[#2EA3F2]" />
          <span>Financial Accounting Period:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'this_year', label: 'This Year' },
            { id: 'custom', label: 'Custom Range' }
          ].map((range) => (
            <button
              key={range.id}
              onClick={() => setDateRange(range.id as DateFilterRange)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateRange === range.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: FINANCIAL CONTROLS & ANALYTICS OVERVIEW */}
      {/* ========================================================================= */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Financial Metric Cards (Dynamic calculations strictly from database) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Revenue */}
            <div className="glass-card p-5 rounded-3xl space-y-2 border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/40 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="font-display font-extrabold text-2xl sm:text-3xl text-emerald-700 dark:text-emerald-400 font-mono">
                ₦{financialStats.totalRevenue.toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Verified Collections</span>
                <span className="font-bold text-emerald-600">{financialStats.paidTransactionsCount} paid</span>
              </div>
            </div>

            {/* Card 2: Total Fees Collected */}
            <div className="glass-card p-5 rounded-3xl space-y-2 border-l-4 border-l-sky-500 bg-gradient-to-br from-sky-50/40 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/20">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Total Fees Collected</span>
                <div className="p-2 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="font-display font-extrabold text-2xl sm:text-3xl text-sky-700 dark:text-sky-400 font-mono">
                ₦{financialStats.totalFeesCollected.toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Total Active Schedules</span>
                <span className="font-bold text-sky-600">{feeCategories.filter((f) => f.enabled).length} types</span>
              </div>
            </div>

            {/* Card 3: Pending Payments */}
            <div className="glass-card p-5 rounded-3xl space-y-2 border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/40 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Pending Verification</span>
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="font-display font-extrabold text-2xl sm:text-3xl text-amber-700 dark:text-amber-400 font-mono">
                ₦{financialStats.pendingAmount.toLocaleString()}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Awaiting Audit</span>
                <span className="font-bold text-amber-600">{financialStats.pendingTransactionsCount} pending</span>
              </div>
            </div>

            {/* Card 4: Total Transactions */}
            <div className="glass-card p-5 rounded-3xl space-y-2 border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50/40 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Transaction Volume</span>
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="font-display font-extrabold text-2xl sm:text-3xl text-indigo-700 dark:text-indigo-400 font-mono">
                {financialStats.totalTransactionsCount}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Success Rate</span>
                <span className="font-bold text-emerald-600">
                  {financialStats.totalTransactionsCount > 0
                    ? `${Math.round((financialStats.paidTransactionsCount / financialStats.totalTransactionsCount) * 100)}%`
                    : '100%'}
                </span>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown by Fee Category */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 glass-card p-6 rounded-3xl space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                    Revenue Breakdown by Fee Category
                  </h3>
                  <p className="text-xs text-slate-500">
                    Distribution of collected dues and registration levies ({dateRange.replace('_', ' ')})
                  </p>
                </div>
                <button
                  onClick={() => setActiveSubTab('fee_types')}
                  className="text-xs font-bold text-[#0A2E73] dark:text-[#2EA3F2] hover:underline"
                >
                  Manage Fee Types &rarr;
                </button>
              </div>

              {financialStats.revenueByType.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-500 text-xs">
                  No verified payment transactions recorded for the selected period.
                </div>
              ) : (
                <div className="space-y-4">
                  {financialStats.revenueByType.map((item) => (
                    <div key={item.type} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-800 dark:text-slate-200">{item.type}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 font-normal">{item.count} transaction(s)</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">
                            ₦{item.amount.toLocaleString()} ({item.percentage}%)
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(item.percentage, 4)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Action & Official Secretariat Account Preview */}
            <div className="lg:col-span-4 glass-card p-6 rounded-3xl space-y-4 bg-gradient-to-br from-[#0A2E73] to-slate-950 text-white">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Primary Bank Account</span>
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  Active
                </span>
              </div>

              {bankAccounts.length === 0 ? (
                <div className="p-4 text-center text-xs text-rose-300 bg-rose-950/30 rounded-xl border border-rose-800/30">
                  No bank account configured yet.
                </div>
              ) : (
                (() => {
                  const active = bankAccounts.find((b) => b.isActive) || bankAccounts[0];
                  return (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Bank</span>
                        <div className="font-bold text-base text-white">{active.bankName}</div>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Account Name</span>
                        <div className="font-bold text-xs text-sky-200">{active.accountName}</div>
                      </div>

                      <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-mono block">Account Number</span>
                          <div className="font-mono font-extrabold text-xl text-amber-300 tracking-wider">
                            {active.accountNumber}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyAccountNumber(active.accountNumber)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          {copiedAccNum ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedAccNum ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })()
              )}

              <div className="pt-2 border-t border-white/10">
                <button
                  onClick={() => setActiveSubTab('bank_accounts')}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-sky-200 transition-colors text-center block"
                >
                  Configure Bank Accounts &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: FEE TYPES & LEVIES SCHEDULE MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSubTab === 'fee_types' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                Official Fee Schedules &amp; Membership Levies
              </h3>
              <p className="text-xs text-slate-500">
                Create, modify, activate, or deactivate fee types dynamically in Nigerian Naira (₦). Changes update immediately in the database.
              </p>
            </div>

            <button
              onClick={handleOpenAddFee}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A2E73] text-white text-xs font-bold hover:bg-sky-800 transition-all shadow-md active:scale-95 flex-shrink-0"
            >
              <Plus className="w-4 h-4 text-[#2EA3F2]" />
              <span>Create New Fee Type</span>
            </button>
          </div>

          {/* Fee Schedule Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feeCategories.map((fee) => (
              <div
                key={fee.id}
                className={`glass-card p-6 rounded-3xl border transition-all space-y-4 ${
                  fee.enabled
                    ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
                    : 'border-slate-300 dark:border-slate-800/60 opacity-60 bg-slate-50 dark:bg-slate-950/40'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                        {fee.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          fee.enabled
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {fee.enabled ? 'Active' : 'Deactivated'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      Code: {fee.code}
                    </span>
                  </div>

                  <div className="font-mono font-extrabold text-xl text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex-shrink-0">
                    ₦{fee.amount.toLocaleString()}
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {fee.description || 'No description provided.'}
                </p>

                {fee.instructions && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-sky-600 dark:text-sky-400 block text-[11px] mb-0.5">
                      Instructions for Members:
                    </span>
                    {fee.instructions}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleFeeActive(fee)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                      fee.enabled
                        ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                        : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    {fee.enabled ? 'Deactivate Fee' : 'Activate Fee'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditFee(fee)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                      title="Edit fee amount and details"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFee(fee.id)}
                      className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl transition-colors"
                      title="Delete fee type"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Fee Create/Edit Modal */}
          {isAddingFee && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <h4 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-[#2EA3F2]" />
                    <span>{editingFee ? 'Edit Fee Schedule Type' : 'Create New Fee Schedule Type'}</span>
                  </h4>
                  <button
                    onClick={() => setIsAddingFee(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveFeeForm} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Fee Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Annual Practicing License Renewal"
                      value={feeFormData.name}
                      onChange={(e) => setFeeFormData({ ...feeFormData, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Amount in Naira (₦) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 font-bold text-slate-400">₦</span>
                        <input
                          type="number"
                          required
                          min="0"
                          step="500"
                          value={feeFormData.amount}
                          onChange={(e) =>
                            setFeeFormData({ ...feeFormData, amount: Number(e.target.value) })
                          }
                          className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        System Identifier Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. annual_renewal"
                        value={feeFormData.code}
                        onChange={(e) => setFeeFormData({ ...feeFormData, code: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Description &amp; Purpose
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief description of this fee for member awareness..."
                      value={feeFormData.description}
                      onChange={(e) =>
                        setFeeFormData({ ...feeFormData, description: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Payment Instructions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Upload teller receipt after transfer to official account."
                      value={feeFormData.instructions}
                      onChange={(e) =>
                        setFeeFormData({ ...feeFormData, instructions: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="fee_enabled_checkbox"
                      checked={feeFormData.enabled}
                      onChange={(e) =>
                        setFeeFormData({ ...feeFormData, enabled: e.target.checked })
                      }
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <label
                      htmlFor="fee_enabled_checkbox"
                      className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      Make fee category active immediately in portal
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddingFee(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingFee ? 'Update Fee Schedule' : 'Save New Fee Category'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: TRANSACTION & PAYMENT LEDGER */}
      {/* ========================================================================= */}
      {activeSubTab === 'transactions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                Official Transaction &amp; Payment Ledger
              </h3>
              <p className="text-xs text-slate-500">
                Audited payment receipts, transaction proofs, and manual ledger records ({ledgerTransactions.length} records).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportFinancialCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => setShowAddPaymentModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A2E73] text-white text-xs font-bold shadow hover:bg-sky-800 transition-colors"
              >
                <Plus className="w-4 h-4 text-[#2EA3F2]" />
                <span>Record Manual Payment</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Header Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search member, membership ID, or reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-bold"
              >
                <option value="all">All Payment Statuses</option>
                <option value="Verified">Verified Only</option>
                <option value="Pending">Pending Audit Only</option>
                <option value="Rejected">Rejected Only</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white font-bold"
              >
                <option value="all">All Fee Categories</option>
                {feeCategories.map((f) => (
                  <option key={f.id} value={f.name}>
                    {f.name}
                  </option>
                ))}
                <option value="Annual Levy">Annual Levy</option>
                <option value="Membership Fee">Membership Fee</option>
                <option value="Donation">Donation</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="glass-card rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-900 font-bold border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="p-4">Member / Payer</th>
                    <th className="p-4">Fee Category</th>
                    <th className="p-4">Amount (₦)</th>
                    <th className="p-4">Reference</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-sans">
                  {ledgerTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No transactions found matching the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    ledgerTransactions.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {p.memberName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {p.membershipId || 'PENDING ID'} &bull; {p.state || 'National'}
                          </div>
                        </td>

                        <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                          {p.type}
                        </td>

                        <td className="p-4 font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                          ₦{p.amount.toLocaleString()}
                        </td>

                        <td className="p-4 font-mono text-[11px] text-slate-500">
                          {p.reference}
                        </td>

                        <td className="p-4 text-slate-500 text-[11px]">
                          {p.date ? p.date.split('T')[0] : 'N/A'}
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                              p.status === 'Verified' || (p.status as string) === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : p.status === 'Pending'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {p.receiptUrl && (
                              <button
                                type="button"
                                onClick={() => setViewingReceiptPayment(p)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg"
                                title="View uploaded receipt"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {p.status === 'Pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleVerifyPayment(p)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                                  title="Verify payment"
                                >
                                  Verify
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectPayment(p)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold"
                                  title="Reject payment"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeletePaymentRecord(p.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Record Manual Payment Modal */}
          {showAddPaymentModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <h4 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-500" />
                    <span>Record Member Payment</span>
                  </h4>
                  <button
                    onClick={() => setShowAddPaymentModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateManualPayment} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Select Member *
                    </label>
                    <select
                      required
                      value={newPayment.memberId}
                      onChange={(e) => setNewPayment({ ...newPayment, memberId: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Choose Member --</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName} ({m.membershipId || 'Pending ID'}) &bull; {m.state}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Fee Category *
                      </label>
                      <select
                        value={newPayment.type}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = feeCategories.find((f) => f.name === val);
                          setNewPayment({
                            ...newPayment,
                            type: val,
                            amount: found ? found.amount : newPayment.amount
                          });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        {feeCategories.map((f) => (
                          <option key={f.id} value={f.name}>
                            {f.name} (₦{f.amount.toLocaleString()})
                          </option>
                        ))}
                        <option value="Annual Levy">Annual Levy</option>
                        <option value="Membership Fee">Membership Fee</option>
                        <option value="Donation">Donation</option>
                        <option value="Conference Registration">Conference Registration</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Amount in Naira (₦) *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={newPayment.amount}
                        onChange={(e) =>
                          setNewPayment({ ...newPayment, amount: Number(e.target.value) })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Bank Reference / Teller No.
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. TRF-8392193"
                        value={newPayment.reference}
                        onChange={(e) =>
                          setNewPayment({ ...newPayment, reference: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Payment Method
                      </label>
                      <select
                        value={newPayment.paymentMethod}
                        onChange={(e) =>
                          setNewPayment({ ...newPayment, paymentMethod: e.target.value })
                        }
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Direct Bank Deposit">Direct Bank Deposit</option>
                        <option value="Online Gateway">Online Gateway</option>
                        <option value="POS / Cash">POS / Cash</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Notes / Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Paid at Kano chapter secretariat"
                      value={newPayment.remarks}
                      onChange={(e) => setNewPayment({ ...newPayment, remarks: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAddPaymentModal(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Verified Payment</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Receipt Proof Viewer Modal */}
          {viewingReceiptPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">
                    Payment Receipt: {viewingReceiptPayment.reference}
                  </h4>
                  <button
                    onClick={() => setViewingReceiptPayment(null)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {viewingReceiptPayment.memberName} ({viewingReceiptPayment.membershipId || 'Pending'})
                    </div>
                    <div className="text-slate-500">
                      Type: <span className="font-bold text-slate-700 dark:text-slate-300">{viewingReceiptPayment.type}</span> &bull; Amount: <span className="font-mono font-bold text-emerald-600">₦{viewingReceiptPayment.amount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-72 flex items-center justify-center bg-slate-950">
                    <img
                      src={viewingReceiptPayment.receiptUrl}
                      alt="Payment Receipt"
                      className="max-h-72 w-full object-contain"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setViewingReceiptPayment(null)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-xl font-bold"
                    >
                      Close
                    </button>
                    {viewingReceiptPayment.status === 'Pending' && (
                      <button
                        type="button"
                        onClick={() => {
                          handleVerifyPayment(viewingReceiptPayment);
                          setViewingReceiptPayment(null);
                        }}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                      >
                        Verify Payment
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: OFFICIAL BANK ACCOUNTS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeSubTab === 'bank_accounts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                Official Secretariat Bank Accounts
              </h3>
              <p className="text-xs text-slate-500">
                Configure bank account details displayed to members and prospective applicants for official dues and registration levies.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingBank(null);
                setBankFormData({
                  bankName: '',
                  accountName: '',
                  accountNumber: '',
                  branch: '',
                  paymentInstructions: '',
                  notes: ''
                });
                setIsAddingBank(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A2E73] text-white text-xs font-bold hover:bg-sky-800 transition-all shadow-md active:scale-95 flex-shrink-0"
            >
              <Plus className="w-4 h-4 text-[#2EA3F2]" />
              <span>Add Bank Account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.map((bank) => (
              <div
                key={bank.id}
                className={`glass-card p-6 rounded-3xl border transition-all space-y-4 ${
                  bank.isActive
                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-50/20 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-2xl ${
                        bank.isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">
                        {bank.bankName}
                      </h4>
                      <span className="text-xs text-slate-500">{bank.accountName}</span>
                    </div>
                  </div>

                  {bank.isActive ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Primary Active</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetActiveBank(bank.id)}
                      className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      Set As Primary
                    </button>
                  )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">
                        Account Number
                      </span>
                      <span className="font-mono font-extrabold text-xl text-slate-900 dark:text-white tracking-wider">
                        {bank.accountNumber}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyAccountNumber(bank.accountNumber)}
                      className="p-2 bg-white dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition-colors shadow-sm"
                      title="Copy account number"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>

                  {bank.branch && (
                    <div className="text-xs text-slate-500">
                      Branch: <span className="text-slate-700 dark:text-slate-300 font-medium">{bank.branch}</span>
                    </div>
                  )}
                </div>

                {bank.paymentInstructions && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">
                    &ldquo;{bank.paymentInstructions}&rdquo;
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBank(bank);
                      setBankFormData({
                        bankName: bank.bankName,
                        accountName: bank.accountName,
                        accountNumber: bank.accountNumber,
                        branch: bank.branch || '',
                        paymentInstructions: bank.paymentInstructions || '',
                        notes: bank.notes || ''
                      });
                      setIsAddingBank(true);
                    }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteBank(bank.id)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Bank Create/Edit Modal */}
          {isAddingBank && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                  <h4 className="font-display font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#2EA3F2]" />
                    <span>{editingBank ? 'Edit Bank Account' : 'Add Official Secretariat Bank Account'}</span>
                  </h4>
                  <button
                    onClick={() => setIsAddingBank(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveBankForm} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Zenith Bank Plc, Jaiz Bank, First Bank"
                      value={bankFormData.bankName}
                      onChange={(e) =>
                        setBankFormData({ ...bankFormData, bankName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Account Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Northern Nigeria Electrical Practitioners Educational Forum"
                      value={bankFormData.accountName}
                      onChange={(e) =>
                        setBankFormData({ ...bankFormData, accountName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Account Number (10 Digits) *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        placeholder="e.g. 1012345678"
                        value={bankFormData.accountNumber}
                        onChange={(e) =>
                          setBankFormData({ ...bankFormData, accountNumber: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold tracking-wider"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Branch
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Kano Main Branch"
                        value={bankFormData.branch}
                        onChange={(e) =>
                          setBankFormData({ ...bankFormData, branch: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Special Payment Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Instructions shown to applicant on public/member portal..."
                      value={bankFormData.paymentInstructions}
                      onChange={(e) =>
                        setBankFormData({ ...bankFormData, paymentInstructions: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddingBank(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingBank ? 'Update Bank Account' : 'Save Bank Account'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
