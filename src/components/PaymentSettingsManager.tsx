import React, { useState, useEffect } from 'react';
import { ForumSettings, FeeCategory, BankAccount } from '../types';
import { saveBankAccountToSupabase, deleteBankAccountFromSupabase, fetchBankAccountsFromSupabase } from '../services/supabaseService';
import { 
  Settings, 
  CreditCard, 
  Plus, 
  Save, 
  ToggleLeft, 
  ToggleRight, 
  Trash2, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Edit,
  DollarSign,
  ShieldCheck,
  Check,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';

interface PaymentSettingsManagerProps {
  settings: ForumSettings;
  onUpdateSettings: (newSettings: ForumSettings) => void;
  onAddAuditLog: (action: string, details: string) => void;
  currentAdminName?: string;
  currentAdminRole?: string;
}

export const PaymentSettingsManager: React.FC<PaymentSettingsManagerProps> = ({
  settings,
  onUpdateSettings,
  onAddAuditLog,
  currentAdminName = 'Admin User',
  currentAdminRole = 'Admin',
}) => {
  // Fee Categories state
  const [feeCategories, setFeeCategories] = useState<FeeCategory[]>(
    settings.feeCategories || [
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
    ]
  );

  // Bank Accounts State - Initialized from Settings & Supabase
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => settings.bankAccounts || []);

  useEffect(() => {
    if (settings.bankAccounts && settings.bankAccounts.length > 0) {
      setBankAccounts(settings.bankAccounts);
    } else {
      fetchBankAccountsFromSupabase().then(accs => {
        if (accs && accs.length > 0) setBankAccounts(accs);
      });
    }
  }, [settings.bankAccounts]);

  const [paymentInstructions, setPaymentInstructions] = useState<string>(
    settings.paymentInstructions || 
    'Please make payment into our official N-NEPEF Bank Account listed above. After payment, upload a clear picture or PDF of your transaction receipt for instant verification.'
  );

  // Modal / Form States
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

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    amount: 5000,
    description: '',
    instructions: ''
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Settings updated successfully!');

  // Quick Registration Fee Helpers
  const regFeeItem = feeCategories.find(c => c.code === 'registration') || feeCategories[0];

  const handleUpdateRegFeeAmount = (newAmount: number) => {
    const val = Math.max(0, newAmount);
    setFeeCategories(prev => prev.map(cat => 
      cat.code === 'registration' || cat.id === regFeeItem.id ? { ...cat, amount: val } : cat
    ));
  };

  const handleToggleRegFeeEnabled = () => {
    setFeeCategories(prev => prev.map(cat => 
      cat.code === 'registration' || cat.id === regFeeItem.id ? { ...cat, enabled: !cat.enabled } : cat
    ));
  };

  // Toggle general category enabled state
  const handleToggleCategory = (id: string) => {
    setFeeCategories(prev => prev.map(cat => 
      cat.id === id ? { ...cat, enabled: !cat.enabled } : cat
    ));
  };

  // Update amount of a category
  const handleUpdateCategoryAmount = (id: string, newAmount: number) => {
    setFeeCategories(prev => prev.map(cat => 
      cat.id === id ? { ...cat, amount: Math.max(0, newAmount) } : cat
    ));
  };

  // Update deadline of a category
  const handleUpdateCategoryDeadline = (id: string, deadline: string) => {
    setFeeCategories(prev => prev.map(cat => 
      cat.id === id ? { ...cat, deadline } : cat
    ));
  };

  // Add custom fee category
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name) return;

    const created: FeeCategory = {
      id: `fee-${Date.now()}`,
      name: newCategory.name,
      code: `custom_${Date.now()}`,
      amount: Math.max(0, Number(newCategory.amount)),
      enabled: true,
      description: newCategory.description || 'Custom payment category.',
      instructions: newCategory.instructions || 'Pay into the official active N-NEPEF bank account.'
    };

    setFeeCategories([...feeCategories, created]);
    setIsAddingCategory(false);
    setNewCategory({ name: '', amount: 5000, description: '', instructions: '' });

    onAddAuditLog(
      'FEE_CATEGORY_CREATE',
      `Admin (${currentAdminName}) added custom payment category "${created.name}" with amount ₦${created.amount.toLocaleString()}.`
    );
  };

  // Delete custom fee category
  const handleDeleteCategory = (id: string) => {
    const target = feeCategories.find(c => c.id === id);
    if (confirm(`Are you sure you want to delete the payment category "${target?.name}"?`)) {
      setFeeCategories(feeCategories.filter(c => c.id !== id));
      onAddAuditLog(
        'FEE_CATEGORY_DELETE',
        `Admin (${currentAdminName}) deleted custom fee category "${target?.name}".`
      );
    }
  };

  // BANK ACCOUNT HANDLERS
  const handleSetActiveBank = (bankId: string) => {
    const updated = bankAccounts.map(b => ({
      ...b,
      isActive: b.id === bankId
    }));
    setBankAccounts(updated);

    const activeBank = updated.find(b => b.id === bankId);
    if (activeBank) {
      onAddAuditLog(
        'BANK_ACCOUNT_SET_ACTIVE',
        `Admin (${currentAdminName}) changed primary active bank account to ${activeBank.bankName} (${activeBank.accountNumber}).`
      );
      // Immediately sync with settings
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

  const handleSaveBankForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankFormData.bankName || !bankFormData.accountNumber || !bankFormData.accountName) return;

    let updatedList: BankAccount[] = [];

    if (editingBank) {
      // Edit existing
      const prevBank = editingBank;
      updatedList = bankAccounts.map(b => b.id === editingBank.id ? {
        ...b,
        bankName: bankFormData.bankName,
        accountName: bankFormData.accountName,
        accountNumber: bankFormData.accountNumber,
        branch: bankFormData.branch || undefined,
        paymentInstructions: bankFormData.paymentInstructions || undefined,
        notes: bankFormData.notes || undefined
      } : b);

      setBankAccounts(updatedList);
      setEditingBank(null);

      onAddAuditLog(
        'BANK_ACCOUNT_UPDATE',
        `Admin (${currentAdminName}) updated bank account [${prevBank.bankName} -> ${bankFormData.bankName}, Account: ${prevBank.accountNumber} -> ${bankFormData.accountNumber}]`
      );
    } else {
      // Add new
      const newBank: BankAccount = {
        id: `bank-${Date.now()}`,
        bankName: bankFormData.bankName,
        accountName: bankFormData.accountName,
        accountNumber: bankFormData.accountNumber,
        branch: bankFormData.branch || undefined,
        paymentInstructions: bankFormData.paymentInstructions || undefined,
        isActive: bankAccounts.length === 0, // Make primary if first account
        notes: bankFormData.notes || undefined
      };

      updatedList = [...bankAccounts, newBank];
      setBankAccounts(updatedList);
      setIsAddingBank(false);

      onAddAuditLog(
        'BANK_ACCOUNT_ADD',
        `Admin (${currentAdminName}) added new bank account: ${newBank.bankName} (${newBank.accountNumber}).`
      );
    }

    setBankFormData({ bankName: '', accountName: '', accountNumber: '', branch: '', paymentInstructions: '', notes: '' });

    // Sync authoritative bank accounts and settings immediately to Supabase
    setBankAccounts(updatedList);
    for (const acc of updatedList) {
      saveBankAccountToSupabase(acc);
    }

    const activeBank = updatedList.find(b => b.isActive) || (updatedList.length > 0 ? updatedList[0] : null);
    onUpdateSettings({
      ...settings,
      bankAccounts: updatedList,
      bankName: activeBank ? activeBank.bankName : '',
      bankAccountName: activeBank ? activeBank.accountName : '',
      bankAccountNumber: activeBank ? activeBank.accountNumber : '',
      paymentInstructions: activeBank?.paymentInstructions || settings.paymentInstructions
    });
  };

  const handleDeleteBank = async (bankId: string) => {
    const target = bankAccounts.find(b => b.id === bankId);
    if (!target) return;

    if (confirm(`Are you sure you want to delete bank account "${target.bankName} (${target.accountNumber})"?`)) {
      const remaining = bankAccounts.filter(b => b.id !== bankId);
      if (target.isActive && remaining.length > 0) {
        remaining[0].isActive = true;
      }
      await deleteBankAccountFromSupabase(bankId);
      setBankAccounts(remaining);

      onAddAuditLog(
        'BANK_ACCOUNT_DELETE',
        `Admin (${currentAdminName}) deleted bank account: ${target.bankName} (${target.accountNumber}).`
      );

      const activeBank = remaining.find(b => b.isActive) || (remaining.length > 0 ? remaining[0] : null);
      onUpdateSettings({
        ...settings,
        bankAccounts: remaining,
        bankName: activeBank ? activeBank.bankName : '',
        bankAccountName: activeBank ? activeBank.accountName : '',
        bankAccountNumber: activeBank ? activeBank.accountNumber : ''
      });
    }
  };

  // SAVE ALL SETTINGS INSTANTLY TO SYSTEM DATABASE
  const handleSaveAllSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const currentAccounts = bankAccounts;
    const activeBank = currentAccounts.find(b => b.isActive) || (currentAccounts.length > 0 ? currentAccounts[0] : null);

    // Build previous values report for Audit Trail
    const prevRegFee = settings.feeCategories?.find(f => f.code === 'registration')?.amount ?? 25000;
    const currentRegFee = regFeeItem.amount;
    const prevRegEnabled = settings.feeCategories?.find(f => f.code === 'registration')?.enabled ?? true;
    const currentRegEnabled = regFeeItem.enabled;

    const updatedSettings: ForumSettings = {
      ...settings,
      bankName: activeBank ? activeBank.bankName : '',
      bankAccountName: activeBank ? activeBank.accountName : '',
      bankAccountNumber: activeBank ? activeBank.accountNumber : '',
      bankAccounts: currentAccounts,
      paymentInstructions: paymentInstructions,
      feeCategories: feeCategories
    };

    onUpdateSettings(updatedSettings);

    // Audit Log Entry
    const auditDetails = `Admin (${currentAdminName} - ${currentAdminRole}) saved Payment & Fee Settings. Registration Fee: ₦${prevRegFee.toLocaleString()} -> ₦${currentRegFee.toLocaleString()} (Enabled: ${prevRegEnabled} -> ${currentRegEnabled}). Active Bank: ${activeBank?.bankName || 'N/A'} (${activeBank?.accountNumber || 'N/A'}).`;
    onAddAuditLog('OFFICIAL_FEE_PAYMENT_UPDATE', auditDetails);

    setSuccessMessage('Official Registration Fee & Bank Account Details updated! Changes are live across the Web & App instantly.');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 5000);
  };

  const bankInfoFallback = {
    bankName: settings.bankName || '',
    bankAccountName: settings.bankAccountName || '',
    bankAccountNumber: settings.bankAccountNumber || ''
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#0A2E73] dark:text-[#2EA3F2]">
            <Settings className="w-6 h-6" />
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Official Registration Fee &amp; Payment Details Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Admin Control Panel: Modify official registration fee amounts, activate/deactivate fees, add &amp; replace bank accounts, and update payment instructions dynamically.
          </p>
        </div>

        <button
          onClick={() => handleSaveAllSettings()}
          className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#0A2E73] text-white font-display font-bold text-xs hover:bg-sky-700 transition-all shadow-lg active:scale-95 flex-shrink-0"
        >
          <Save className="w-4 h-4 text-[#2EA3F2]" />
          <span>Save Changes Instantly</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/90 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <span className="text-[10px] bg-emerald-200 dark:bg-emerald-900 px-2 py-0.5 rounded font-mono">
            Audited &amp; Saved
          </span>
        </div>
      )}

      {/* SECTION 1: OFFICIAL REGISTRATION FEE CONTROL CARD */}
      <div className="bg-gradient-to-br from-[#0A2E73] via-[#08245A] to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-6 relative overflow-hidden border border-sky-500/30">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <CreditCard className="w-48 h-48 text-sky-400" />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <span className="px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-extrabold uppercase tracking-wider border border-sky-400/30">
              Admin Governance Control
            </span>
            <h3 className="font-display font-extrabold text-xl text-white mt-1 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-amber-400" />
              <span>Official New Member Registration Fee</span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Set and adjust the mandatory registration fee for new applicants. Changes apply immediately to all registration forms.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleRegFeeEnabled}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md ${
                regFeeItem.enabled 
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {regFeeItem.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              <span>{regFeeItem.enabled ? 'FEE IS ACTIVE' : 'FEE IS DISABLED'}</span>
            </button>
          </div>
        </div>

        {/* Amount Control Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10">
          <div>
            <span className="text-xs text-slate-300 block mb-1">Current Registration Fee:</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-sky-400">₦</span>
              <span className="font-display font-black text-4xl text-amber-300 tracking-tight">
                {regFeeItem.amount.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Status: {regFeeItem.enabled ? <strong className="text-emerald-400">Enabled</strong> : <strong className="text-rose-400">Disabled</strong>}
            </p>
          </div>

          {/* Quick Adjustment Controls */}
          <div className="space-y-2 col-span-2">
            <label className="text-xs font-bold text-slate-200 block">
              Edit Amount (Increase / Decrease Amount):
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleUpdateRegFeeAmount(regFeeItem.amount - 5000)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700"
              >
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                - ₦5,000
              </button>
              <button
                type="button"
                onClick={() => handleUpdateRegFeeAmount(regFeeItem.amount - 1000)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700"
              >
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                - ₦1,000
              </button>

              <div className="flex items-center gap-1 bg-slate-900 px-3 py-1.5 rounded-xl border border-sky-400/50">
                <span className="text-xs font-bold text-amber-400">₦</span>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={regFeeItem.amount}
                  onChange={(e) => handleUpdateRegFeeAmount(Number(e.target.value))}
                  className="w-28 font-mono font-bold text-sm bg-transparent text-white outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => handleUpdateRegFeeAmount(regFeeItem.amount + 1000)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                + ₦1,000
              </button>
              <button
                type="button"
                onClick={() => handleUpdateRegFeeAmount(regFeeItem.amount + 5000)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                + ₦5,000
              </button>
            </div>
            <p className="text-[10px] text-sky-300/80 italic pt-1">
              Tip: Click &quot;Save Changes Instantly&quot; above to lock in this amount into the database.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: OFFICIAL BANK ACCOUNT MANAGEMENT */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-display font-bold text-sm text-[#0A2E73] dark:text-[#2EA3F2] uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4.5 h-4.5" />
              <span>2. Official Bank Accounts Management</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add, edit, replace or toggle active official N-NEPEF bank accounts for collecting membership fees.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingBank(null);
              setBankFormData({ bankName: '', accountName: '', accountNumber: '', branch: '', paymentInstructions: '', notes: '' });
              setIsAddingBank(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Bank Account</span>
          </button>
        </div>

        {/* Bank Accounts Table/Cards */}
        <div className="space-y-4">
          {bankAccounts.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              No payment account has been configured. Please contact the Administrator.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankAccounts.map((bank) => (
                <div
                  key={bank.id}
                  className={`p-5 rounded-2xl border transition-all space-y-3 relative ${
                    bank.isActive 
                      ? 'bg-sky-50/80 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 shadow-md ring-2 ring-sky-400/30' 
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1 ${
                      bank.isActive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {bank.isActive ? <Check className="w-3 h-3 text-emerald-600" /> : null}
                      {bank.isActive ? 'PRIMARY ACTIVE ACCOUNT' : 'INACTIVE ACCOUNT'}
                    </span>

                    {!bank.isActive && (
                      <button
                        type="button"
                        onClick={() => handleSetActiveBank(bank.id)}
                        className="text-xs font-bold text-[#0A2E73] dark:text-[#2EA3F2] hover:underline"
                      >
                        Set as Active
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-display font-extrabold text-base text-slate-900 dark:text-white">
                      {bank.bankName}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Account Name: <strong className="text-slate-900 dark:text-white">{bank.accountName}</strong>
                    </p>
                    <p className="text-sm font-mono font-bold text-sky-700 dark:text-sky-300">
                      Account Number: {bank.accountNumber}
                    </p>
                    {bank.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        Note: {bank.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
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
                        className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteBank(bank.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                        title="Delete Bank Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {bank.isActive && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        ★ Showing on Reg Form
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Instructions Text Area */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#2EA3F2]" />
            <span>Member Payment Instructions (Displayed on Registration &amp; Renewal pages):</span>
          </label>
          <textarea
            rows={3}
            required
            value={paymentInstructions}
            onChange={(e) => setPaymentInstructions(e.target.value)}
            placeholder="Instructions displayed on registration and renewal forms..."
            className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
          />
        </div>
      </div>

      {/* SECTION 3: OTHER PAYMENT CATEGORIES & DYNAMIC FEES */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-display font-bold text-sm text-[#0A2E73] dark:text-[#2EA3F2] uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>3. Other Fee Categories &amp; Practicing Levies</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage annual dues, ID card replacement fees, and special project levies.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingCategory(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-sky-950 text-xs font-bold text-[#0A2E73] dark:text-[#2EA3F2] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Payment Category</span>
          </button>
        </div>

        <div className="space-y-4">
          {feeCategories.map((cat) => (
            <div 
              key={cat.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                cat.enabled 
                  ? 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' 
                  : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 opacity-60'
              }`}
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white">
                    {cat.name}
                  </h4>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                    cat.enabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {cat.enabled ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {cat.description || cat.instructions}
                </p>
                {cat.deadline && (
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    Payment Deadline: {cat.deadline}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
                {/* Fee Amount Input */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 shadow-inner">
                  <span className="font-extrabold text-xs text-[#0A2E73] dark:text-[#2EA3F2]">₦</span>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={cat.amount}
                    onChange={(e) => handleUpdateCategoryAmount(cat.id, Number(e.target.value))}
                    className="w-24 font-mono font-bold text-xs bg-transparent text-slate-900 dark:text-white outline-none"
                    title="Set Fee Amount"
                  />
                </div>

                {/* Deadline Input */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500">Deadline:</span>
                  <input
                    type="date"
                    value={cat.deadline || ''}
                    onChange={(e) => handleUpdateCategoryDeadline(cat.id, e.target.value)}
                    className="text-xs bg-transparent text-slate-900 dark:text-white outline-none"
                    title="Payment Deadline"
                  />
                </div>

                {/* Enable / Disable Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleCategory(cat.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    cat.enabled
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {cat.enabled ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                  <span>{cat.enabled ? 'Enabled' : 'Disabled'}</span>
                </button>

                {/* Delete button if custom */}
                {cat.code.startsWith('custom_') && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ADD / EDIT BANK ACCOUNT MODAL */}
      {isAddingBank && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveBankForm} className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Building2 className="w-5 h-5 text-[#2EA3F2]" />
              <span>{editingBank ? 'Edit Bank Account Details' : 'Add Official Bank Account'}</span>
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Bank Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. First Bank, GTBank, UBA"
                value={bankFormData.bankName}
                onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Account Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Northern Nigeria Electrical Forum"
                value={bankFormData.accountName}
                onChange={(e) => setBankFormData({ ...bankFormData, accountName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Account Number *</label>
              <input
                type="text"
                required
                placeholder="10-digit NUBAN account number"
                value={bankFormData.accountNumber}
                onChange={(e) => setBankFormData({ ...bankFormData, accountNumber: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Branch (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Main Secretariat Branch, Kano"
                value={bankFormData.branch}
                onChange={(e) => setBankFormData({ ...bankFormData, branch: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Payment Instructions (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Include full name or Membership ID as transfer memo"
                value={bankFormData.paymentInstructions}
                onChange={(e) => setBankFormData({ ...bankFormData, paymentInstructions: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Internal Notes / Description</label>
              <input
                type="text"
                placeholder="e.g. Primary Membership Revenue Account"
                value={bankFormData.notes}
                onChange={(e) => setBankFormData({ ...bankFormData, notes: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setIsAddingBank(false); setEditingBank(null); }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"
              >
                {editingBank ? 'Update Account' : 'Add Bank Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {isAddingCategory && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddCategorySubmit} className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Plus className="w-5 h-5 text-[#2EA3F2]" />
              <span>Create Additional Payment Category</span>
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Category Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Building Fund Levy, Conference Registration"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Amount (₦) *</label>
              <input
                type="number"
                required
                min={0}
                step={500}
                value={newCategory.amount}
                onChange={(e) => setNewCategory({ ...newCategory, amount: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description</label>
              <textarea
                rows={2}
                placeholder="Brief summary of what this fee covers..."
                value={newCategory.description}
                onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingCategory(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#0A2E73] hover:bg-sky-700 text-white text-xs font-bold shadow-md"
              >
                Create Category
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
