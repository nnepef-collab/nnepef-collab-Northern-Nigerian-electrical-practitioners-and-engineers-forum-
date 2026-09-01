import React from 'react';
import { PaymentRecord, ForumSettings } from '../types';
import { Printer, Download, X, CheckCircle2, ShieldCheck, Building2, Calendar, FileText, QrCode } from 'lucide-react';
import { OFFICIAL_NNEPEF_LOGO } from '../constants/logo';

interface PrintableReceiptModalProps {
  payment: PaymentRecord | null;
  settings?: ForumSettings;
  onClose: () => void;
}

export const PrintableReceiptModal: React.FC<PrintableReceiptModalProps> = ({ payment, settings, onClose }) => {
  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 max-w-2xl w-full rounded-3xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8 print:shadow-none print:border-none print:m-0 print:w-full print:max-w-none print:rounded-none">
        
        {/* Header Bar - Hidden in print */}
        <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#2EA3F2]" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Official Digital Payment Receipt</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#0A2E73] text-white text-xs font-bold hover:bg-sky-800 transition-all flex items-center gap-1.5 shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Canvas */}
        <div className="p-8 sm:p-10 space-y-8 print:p-6 bg-white text-slate-900 font-sans">
          
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-6">
            <div className="flex items-center gap-4">
              <img 
                src={settings?.logoUrl && settings.logoUrl.trim() !== '' && settings.logoUrl !== '/logo.png' ? settings.logoUrl : OFFICIAL_NNEPEF_LOGO} 
                alt="N-NEPEF Logo" 
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== OFFICIAL_NNEPEF_LOGO) {
                    target.src = OFFICIAL_NNEPEF_LOGO;
                  }
                }}
              />
              <div>
                <h1 className="font-display font-extrabold text-lg text-[#0A2E73] uppercase tracking-tight">
                  {settings?.forumName || 'N-NEPEF 2020 FORUM'}
                </h1>
                <p className="text-[10px] text-slate-600 font-semibold max-w-sm">
                  Northern Nigerian Electrical Practitioners &amp; Engineers Forum
                </p>
                <p className="text-[9px] text-slate-500 font-mono pt-0.5">
                  HQ: No. 2 Gwarzo Road, Kano • admin@nepef.org.ng • +234 906 343 5546
                </p>
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full font-mono text-[10px] font-extrabold tracking-wider uppercase border border-emerald-300">
                {payment.status === 'Verified' ? 'VERIFIED RECEIPT' : payment.status}
              </span>
              <p className="text-xs font-mono font-bold text-slate-900 pt-1">
                REF: {payment.reference}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Issued: {payment.date}
              </p>
            </div>
          </div>

          {/* Receipt Main Details Grid */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 text-xs">
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Payer / Member Name</span>
                <p className="font-extrabold text-sm text-slate-900">{payment.memberName}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Membership ID</span>
                <p className="font-mono font-bold text-sky-800">{payment.membershipId || 'N/A'}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">State Chapter</span>
                <p className="font-bold text-slate-800">{payment.state || 'Kano'} State</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Payment Purpose</span>
                <p className="font-extrabold text-sm text-slate-900">{payment.type}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Payment Method</span>
                <p className="font-bold text-slate-800">{payment.paymentMethod || 'Bank Transfer'}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Verified By Secretariat</span>
                <p className="font-bold text-emerald-700">{payment.approvedBy || 'Super Admin Secretariat'}</p>
              </div>
            </div>
          </div>

          {/* Amount Box */}
          <div className="bg-[#0A2E73] text-white p-6 rounded-2xl flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] text-sky-200 uppercase font-mono font-bold block">Total Amount Paid</span>
              <p className="text-2xl font-extrabold font-display">₦{payment.amount.toLocaleString()}</p>
            </div>
            <div className="text-right text-[10px] text-sky-100 font-mono">
              <p>Currency: Nigerian Naira (NGN)</p>
              <p>Status: FULL PAYMENT CLEARED</p>
            </div>
          </div>

          {/* Stamp & Footer */}
          <div className="pt-6 border-t border-slate-200 flex items-end justify-between">
            <div className="space-y-1 text-[10px] text-slate-500 max-w-xs">
              <p className="font-semibold text-slate-700">Official Verification Note:</p>
              <p>This electronic receipt confirms official payment settlement into N-NEPEF 2020 forum accounts. Valid without manual signature when bearing QR code stamp.</p>
            </div>

            <div className="flex flex-col items-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-[9px] font-mono text-slate-600">
              <QrCode className="w-10 h-10 text-[#0A2E73] mb-1" />
              <span className="font-bold text-slate-800">N-NEPEF VERIFIED</span>
              <span>{payment.reference}</span>
            </div>
          </div>

        </div>

        {/* Action Controls - Hidden in print */}
        <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition-all"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-xl bg-[#0A2E73] text-white text-xs font-bold hover:bg-sky-800 transition-all flex items-center gap-2 shadow"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save PDF Receipt</span>
          </button>
        </div>

      </div>
    </div>
  );
};
