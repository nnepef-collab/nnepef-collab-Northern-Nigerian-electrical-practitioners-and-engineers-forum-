import React from 'react';
import { Member } from '../types';
import { Clock, ShieldAlert, LogOut, RefreshCw, AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface PendingVerificationViewProps {
  currentUser: Member;
  setCurrentUser: (user: Member | null) => void;
  setCurrentView: (view: string) => void;
  onRefreshMemberStatus?: () => void;
}

export const PendingVerificationView: React.FC<PendingVerificationViewProps> = ({
  currentUser,
  setCurrentUser,
  setCurrentView,
  onRefreshMemberStatus
}) => {
  const isPending = currentUser.status === 'pending';
  const isSuspended = currentUser.status === 'suspended';
  const isRejected = currentUser.status === 'rejected';

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('home');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      
      {/* Top Header Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#0A2E73] dark:hover:text-sky-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Home</span>
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold hover:bg-red-100 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Main Status Card - Strictly Protected Pending Dashboard */}
      <div className="glass-card p-8 sm:p-12 rounded-3xl border-2 border-amber-500/30 dark:border-amber-500/40 shadow-2xl space-y-6 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-sky-500 to-amber-500 animate-pulse" />

        {/* Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/80 border-2 border-amber-400 flex items-center justify-center shadow-lg">
          {isPending && <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400 animate-bounce" />}
          {isSuspended && <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />}
          {isRejected && <ShieldAlert className="w-10 h-10 text-slate-600 dark:text-slate-400" />}
        </div>

        {/* Required Standard Security Messages */}
        <div className="space-y-4 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Registration Submitted Successfully</span>
          </div>

          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            Application Under Administrative Review
          </h2>

          <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-slate-700 dark:text-slate-300 text-sm leading-relaxed text-left">
            <p className="font-semibold text-center text-slate-900 dark:text-white">
              Your application is under review by the administrator.
            </p>
            <p className="text-xs text-center text-slate-500 dark:text-slate-400">
              You will be notified after verification. All membership credentials, ID cards, and portal access remain protected until formal Super Admin approval.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {onRefreshMemberStatus && (
            <button
              onClick={onRefreshMemberStatus}
              className="px-6 py-3 rounded-xl bg-[#0A2E73] text-white text-xs font-bold hover:bg-sky-800 transition-all flex items-center gap-2 shadow"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Check Verification Status</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="px-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition-all"
          >
            Sign Out
          </button>
        </div>

      </div>

    </div>
  );
};

