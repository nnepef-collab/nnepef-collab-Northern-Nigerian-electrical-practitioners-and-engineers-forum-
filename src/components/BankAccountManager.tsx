import React, { useState, useEffect } from 'react';
import { ForumSettings, BankAccount } from '../types';
import { getLocalBankAccounts, saveLocalBankAccounts } from '../services/localDatabaseService';
import { 
  Building2, 
  Plus, 
  Save, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Check, 
  Info,
  Layers,
  HelpCircle,
  Copy
} from 'lucide-react';

interface BankAccountManagerProps {
  settings: ForumSettings;
  onUpdateSettings: (newSettings: ForumSettings) => void;
  onAddAuditLog: (action: string, details: string) => void;
  currentAdminName?: string;
  currentAdminRole?: string;
}

export const BankAccountManager: React.FC<BankAccountManagerProps> = ({
  settings,
  onUpdateSettings,
  onAddAuditLog,
  currentAdminName = 'Admin User',
  currentAdminRole = 'Admin',
}) => {
  const isAuthorized = currentAdminRole === 'super_admin' || currentAdminRole === 'admin' || currentAdminRole?.includes('Admin');

  // Bank Accounts State - Initialized from Authoritative Local Storage
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => getLocalBankAccounts());

  useEffect(() => {
    const current = getLocalBankAccounts();
    setBankAccounts(current);
  }, [settings.bankAccounts]);

  // Form & Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    branch: '',
    paymentInstructions: '',
    notes: '',
    isActive: false
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Helper to sync updated bank accounts array to global settings & database with read-back verification
  const saveBankAccountsToSettings = (updatedAccounts: BankAccount[], actionMsg?: string) => {
    // 1. Read, save, and verify in Authoritative Local Storage
    const verifiedAccounts = saveLocalBankAccounts(updatedAccounts);
    setBankAccounts(verifiedAccounts);

    const activeBank = verifiedAccounts.find(b => b.isActive) || (verifiedAccounts.length > 0 ? verifiedAccounts[0] : null);

    const updatedSettings: ForumSettings = {
      ...settings,
      bankAccounts: verifiedAccounts,
      bankName: activeBank ? activeBank.bankName : '',
      bankAccountName: activeBank ? activeBank.accountName : '',
      bankAccountNumber: activeBank ? activeBank.accountNumber : '',
      paymentInstructions: activeBank?.paymentInstructions || settings.paymentInstructions || ''
    };

    onUpdateSettings(updatedSettings);

    if (actionMsg) {
      onAddAuditLog('BANK_ACCOUNT_MANAGEMENT', `${actionMsg} by ${currentAdminName} (${currentAdminRole})`);
    }
  };

  // Open modal for adding
  const handleOpenAdd = () => {
    setEditingBank(null);
    setFormData({
      bankName: '',
      accountName: '',
      accountNumber: '',
      branch: '',
      paymentInstructions: '',
      notes: '',
      isActive: bankAccounts.length === 0
    });
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (bank: BankAccount) => {
    setEditingBank(bank);
    setFormData({
      bankName: bank.bankName || '',
      accountName: bank.accountName || '',
      accountNumber: bank.accountNumber || '',
      branch: bank.branch || '',
      paymentInstructions: bank.paymentInstructions || '',
      notes: bank.notes || '',
      isActive: !!bank.isActive
    });
    setIsModalOpen(true);
  };

  // Submit form (Add or Edit)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bankName.trim() || !formData.accountName.trim() || !formData.accountNumber.trim()) {
      showToast('error', 'Please fill in all required fields (Bank Name, Account Name, Account Number).');
      return;
    }

    let updatedList: BankAccount[] = [];

    if (editingBank) {
      // Edit existing
      updatedList = bankAccounts.map(b => {
        if (b.id === editingBank.id) {
          return {
            ...b,
            bankName: formData.bankName.trim(),
            accountName: formData.accountName.trim(),
            accountNumber: formData.accountNumber.trim(),
            branch: formData.branch.trim() || undefined,
            paymentInstructions: formData.paymentInstructions.trim() || undefined,
            notes: formData.notes.trim() || undefined,
            isActive: formData.isActive,
            updatedAt: new Date().toISOString()
          };
        }
        // If the edited one is set to active, unset others
        if (formData.isActive) {
          return { ...b, isActive: false };
        }
        return b;
      });

      showToast('success', `Bank account "${formData.bankName}" updated successfully.`);
      saveBankAccountsToSettings(updatedList, `Updated bank account "${formData.bankName}" (${formData.accountNumber})`);
    } else {
      // Add new
      const newAccount: BankAccount = {
        id: `bank-${Date.now()}`,
        bankName: formData.bankName.trim(),
        accountName: formData.accountName.trim(),
        accountNumber: formData.accountNumber.trim(),
        branch: formData.branch.trim() || undefined,
        paymentInstructions: formData.paymentInstructions.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        isActive: formData.isActive || bankAccounts.length === 0,
        createdAt: new Date().toISOString()
      };

      // If new account is active, unset others
      if (newAccount.isActive) {
        updatedList = bankAccounts.map(b => ({ ...b, isActive: false }));
        updatedList.push(newAccount);
      } else {
        updatedList = [...bankAccounts, newAccount];
      }

      showToast('success', `New bank account "${newAccount.bankName}" added successfully.`);
      saveBankAccountsToSettings(updatedList, `Added new bank account "${newAccount.bankName}" (${newAccount.accountNumber})`);
    }

    setBankAccounts(updatedList);
    setIsModalOpen(false);
  };

  // Permanently delete bank account
  const handleDelete = (bank: BankAccount) => {
    if (!window.confirm(`Are you sure you want to permanently delete the bank account "${bank.bankName} - ${bank.accountNumber}"? This action cannot be undone.`)) {
      return;
    }

    const remaining = bankAccounts.filter(b => b.id !== bank.id);
    
    // If deleted bank was active and remaining exist, make first remaining account active
    if (bank.isActive && remaining.length > 0) {
      remaining[0].isActive = true;
    }

    setBankAccounts(remaining);
    showToast('success', `Bank account "${bank.bankName}" was permanently deleted.`);
    saveBankAccountsToSettings(remaining, `Deleted bank account "${bank.bankName}" (${bank.accountNumber})`);
  };

  // Toggle active account
  const handleSetActive = (bankId: string) => {
    const updated = bankAccounts.map(b => ({
      ...b,
      isActive: b.id === bankId
    }));

    const target = updated.find(b => b.id === bankId);
    setBankAccounts(updated);
    showToast('success', `Set "${target?.bankName}" as primary active payment account.`);
    saveBankAccountsToSettings(updated, `Set active primary bank account to "${target?.bankName}" (${target?.accountNumber})`);
  };

  if (!isAuthorized) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 p-8 rounded-3xl border border-rose-200 dark:border-rose-900 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
        <h3 className="font-display font-bold text-lg text-rose-900 dark:text-rose-200">Access Restricted</h3>
        <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
          Only authenticated Admins and Super Admins can manage bank account information.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-2xl bg-sky-100 dark:bg-sky-950 text-[#0A2E73] dark:text-[#2EA3F2]">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-white">
                Bank Account Management
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dynamically add, edit, or delete official payment accounts. All changes take effect immediately on the public website and mobile app.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Role: {currentAdminRole === 'super_admin' ? 'Super Admin' : 'Admin'}</span>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-5 py-3 rounded-2xl bg-[#0A2E73] hover:bg-sky-800 text-white font-display font-bold text-xs shadow-lg transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4 text-[#2EA3F2]" />
            <span>Add Bank Account</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 shadow-md transition-all ${
          notification.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100'
            : 'bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Accounts List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#2EA3F2]" />
            <span>Configured Payment Accounts ({bankAccounts.length})</span>
          </h3>
        </div>

        {bankAccounts.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No payment account has been configured. Please contact the Administrator.
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click the "Add Bank Account" button above to configure an official bank account for collecting registration and renewal fees.
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Bank Account</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {bankAccounts.map((bank) => (
              <div
                key={bank.id}
                className={`p-6 rounded-3xl border transition-all space-y-4 relative ${
                  bank.isActive
                    ? 'bg-gradient-to-br from-sky-50/90 via-white to-sky-100/50 dark:from-sky-950/60 dark:via-slate-900 dark:to-slate-900 border-sky-400 dark:border-sky-600 shadow-md ring-2 ring-sky-400/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                {/* Top Badge & Active Toggle */}
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase flex items-center gap-1.5 ${
                    bank.isActive
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {bank.isActive ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
                    {bank.isActive ? 'Primary Active Account' : 'Inactive / Secondary'}
                  </span>

                  {!bank.isActive && (
                    <button
                      type="button"
                      onClick={() => handleSetActive(bank.id)}
                      className="text-xs font-bold text-[#0A2E73] dark:text-[#2EA3F2] hover:underline"
                    >
                      Set as Active
                    </button>
                  )}
                </div>

                {/* Account Info Details */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-mono block">Bank Name</span>
                    <h4 className="font-display font-extrabold text-base text-slate-900 dark:text-white">
                      {bank.bankName}
                    </h4>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-mono block">Account Name</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-sky-200">
                      {bank.accountName}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-mono block">Account Number</span>
                    <p className="text-xl font-mono font-extrabold text-amber-600 dark:text-amber-300 tracking-wider">
                      {bank.accountNumber}
                    </p>
                  </div>

                  {bank.branch && (
                    <div>
                      <span className="text-[10px] uppercase text-slate-400 font-mono block">Branch</span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {bank.branch}
                      </p>
                    </div>
                  )}

                  {bank.paymentInstructions && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] uppercase text-sky-600 dark:text-sky-400 font-bold block mb-0.5">Payment Instructions:</span>
                      <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                        {bank.paymentInstructions}
                      </p>
                    </div>
                  )}

                  {bank.notes && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                      <span className="font-semibold">Internal Note:</span> {bank.notes}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(bank)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5 text-sky-500" />
                      <span>Edit Information</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(bank)}
                      className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition-colors"
                      title="Permanently Delete Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {bank.isActive && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Live on Website
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD / EDIT BANK ACCOUNT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-[#0A2E73] dark:text-[#2EA3F2]">
                <Building2 className="w-5 h-5" />
                <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                  {editingBank ? 'Edit Bank Account Information' : 'Add New Bank Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Bank Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Bank Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. First Bank, Guaranty Trust Bank, UBA"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
                />
              </div>

              {/* Account Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Account Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Northern Nigeria Electrical Practitioners & Engineers Forum"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
                />
              </div>

              {/* Account Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Account Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1017492014"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
                />
              </div>

              {/* Branch (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Branch (Optional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Secretariat Branch, Kano"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
                />
              </div>

              {/* Payment Instructions (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Payment Instructions (Optional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Include your Full Name or Membership ID in the bank transfer memo."
                  value={formData.paymentInstructions}
                  onChange={(e) => setFormData({ ...formData, paymentInstructions: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
                />
              </div>

              {/* Internal Notes / Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Internal Description / Label</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Primary Membership Revenue Account"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
                />
              </div>

              {/* Active Account Checkbox */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-[#2EA3F2] focus:ring-[#2EA3F2]"
                  />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Set as Primary Active Account (Displayed on Website & App)
                  </span>
                </label>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
                >
                  {editingBank ? 'Save Changes' : 'Add Bank Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
