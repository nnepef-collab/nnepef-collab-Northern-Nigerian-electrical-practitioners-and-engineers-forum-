import React, { useState, useRef } from 'react';
import { Member, ForumSettings, RenewalRequest, PaymentRecord } from '../types';
import { DualImageUpload } from './DualImageUpload';
import { 
  CreditCard, 
  Upload, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  PenTool, 
  Camera, 
  FileCheck, 
  Sparkles,
  Building2,
  RefreshCcw,
  Eraser
} from 'lucide-react';

interface MemberRenewalModuleProps {
  currentUser: Member;
  settings: ForumSettings;
  onSubmitRenewal: (newRequest: RenewalRequest, paymentRecord: PaymentRecord) => void;
}

export const MemberRenewalModule: React.FC<MemberRenewalModuleProps> = ({
  currentUser,
  settings,
  onSubmitRenewal,
}) => {
  // Fetch dynamic fees for ID card renewal and replacement from Super Admin settings
  const idCardRenewalFeeObj = settings.feeCategories?.find(f => f.code === 'id_card_renewal') || { amount: 10000 };
  const idCardReplacementFeeObj = settings.feeCategories?.find(f => f.code === 'id_card_replacement') || { amount: 15000 };
  
  const renewalFeeAmount = idCardRenewalFeeObj.amount;
  const replacementFeeAmount = idCardReplacementFeeObj.amount;

  // Form State
  const [formData, setFormData] = useState({
    fullName: currentUser.fullName,
    membershipId: currentUser.membershipId || 'NEPEF/2020/KN/001',
    position: currentUser.position || 'Practicing Electrical Engineer',
    passportUrl: currentUser.passportUrl || '',
    receiptUrl: currentUser.paymentReceiptUrl || '',
  });

  // Digital Signature Mode: 'draw' | 'upload'
  const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>('draw');
  const [signatureUrl, setSignatureUrl] = useState<string>('https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&q=80&w=300');

  // Canvas Refs for Drawing Signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  // Success state
  const [submittedRequest, setSubmittedRequest] = useState<RenewalRequest | null>(null);

  // Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasDrawnSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0A2E73';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureUrl(canvasRef.current.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawnSignature(false);
    }
  };

  // Upload Handlers
  const handlePassportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, passportUrl: URL.createObjectURL(e.target.files[0]) });
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, receiptUrl: URL.createObjectURL(e.target.files[0]) });
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSignatureUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newRequest: RenewalRequest = {
      id: `ren-${Date.now()}`,
      memberId: currentUser.id,
      fullName: formData.fullName,
      membershipId: formData.membershipId,
      position: formData.position,
      passportUrl: formData.passportUrl,
      signatureUrl: signatureUrl,
      receiptUrl: formData.receiptUrl,
      state: currentUser.state,
      lga: currentUser.lga,
      requestDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      remarks: `Submitted renewal request with ₦${renewalFeeAmount.toLocaleString()} payment receipt.`
    };

    const newPaymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}`,
      memberId: currentUser.id,
      memberName: formData.fullName,
      membershipId: formData.membershipId,
      state: currentUser.state,
      lga: currentUser.lga,
      type: 'ID Card Renewal Fee',
      amount: renewalFeeAmount,
      status: 'Pending',
      receiptUrl: formData.receiptUrl,
      date: new Date().toISOString().split('T')[0],
      reference: `NEPEF-REN-${Math.floor(100000 + Math.random() * 900000)}`,
      paymentMethod: 'Bank Transfer / Deposit'
    };

    onSubmitRenewal(newRequest, newPaymentRecord);
    setSubmittedRequest(newRequest);
  };

  if (submittedRequest) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6 max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/80 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-md">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">
            Request Submitted
          </h2>
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 max-w-md mx-auto p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-200 dark:border-emerald-800">
            Your request has been submitted successfully and is awaiting Super Admin approval.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 text-left text-xs space-y-2">
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-slate-500">Request ID:</span>
            <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{submittedRequest.id}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-slate-500">Member Name:</span>
            <span className="font-bold text-slate-900 dark:text-white">{submittedRequest.fullName}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-slate-500">Membership ID:</span>
            <span className="font-mono font-bold">{submittedRequest.membershipId}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
            <span className="text-slate-500">Position:</span>
            <span className="font-bold">{submittedRequest.position}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] uppercase">
              {submittedRequest.status}
            </span>
          </div>
        </div>

        <button
          onClick={() => setSubmittedRequest(null)}
          className="px-6 py-3 rounded-2xl bg-[#0A2E73] text-white font-bold text-xs hover:bg-sky-700 transition-all shadow-md"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 text-[#0A2E73] dark:text-[#2EA3F2]">
          <RefreshCcw className="w-6 h-6" />
          <h2 className="font-display font-extrabold text-xl text-slate-900 dark:text-white">
            Renew / Replace Membership ID Card
          </h2>
        </div>

        {/* Current Member Details Overview Box */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Current Membership Status</span>
            <p className="font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">{currentUser.status}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Membership ID Number</span>
            <p className="font-mono font-extrabold text-[#2EA3F2]">{currentUser.membershipId || 'PENDING ASSIGNMENT'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Current Position</span>
            <p className="font-bold text-slate-900 dark:text-white">{currentUser.position || 'Practicing Electrical Engineer'}</p>
          </div>
        </div>
      </div>

      {/* Dynamic Super Admin Fees & Instructions Banner */}
      <div className="bg-gradient-to-r from-[#0A2E73] to-[#08245A] text-white p-6 rounded-3xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/20 pb-3 gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#2EA3F2]" />
            <span className="font-display font-bold text-xs uppercase tracking-wider text-sky-300">
              Official Super Admin Fee Schedule
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-300 block text-[10px]">Renewal Fee:</span>
              <strong className="text-emerald-400 font-display text-base">₦{renewalFeeAmount.toLocaleString()}</strong>
            </div>
            <div className="border-l border-white/20 pl-4">
              <span className="text-slate-300 block text-[10px]">Replacement Fee:</span>
              <strong className="text-amber-300 font-display text-base">₦{replacementFeeAmount.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {(() => {
          const bankAccounts = settings?.bankAccounts || [];
          const activeBank = bankAccounts.find(b => b.isActive) || bankAccounts[0] || (settings?.bankName ? {
            bankName: settings.bankName,
            accountName: settings.bankAccountName || '',
            accountNumber: settings.bankAccountNumber || '',
            branch: '',
            paymentInstructions: settings.paymentInstructions
          } : null);

          if (!activeBank || !activeBank.bankName || !activeBank.accountNumber) {
            return (
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-rose-500/30 text-rose-300 text-xs font-bold text-center">
                No payment account has been configured. Please contact the Administrator.
              </div>
            );
          }

          return (
            <div className="text-xs space-y-1 text-slate-200">
              <p className="font-bold text-sky-300 uppercase tracking-wider text-[10px]">Official Bank Account for Renewal Fee Payment:</p>
              <p>Bank Name: <strong>{activeBank.bankName}</strong></p>
              <p>Account Name: <strong>{activeBank.accountName}</strong></p>
              <p>Account Number: <strong className="font-mono text-sky-300 tracking-wider">{activeBank.accountNumber}</strong></p>
              {activeBank.branch ? <p>Branch: <strong>{activeBank.branch}</strong></p> : null}
              <p className="text-[11px] text-slate-300 pt-1.5 italic bg-white/10 p-3 rounded-xl border border-white/10">
                {activeBank.paymentInstructions || settings.paymentInstructions || 'Pay the prescribed fee to the official N-NEPEF bank account above, keep your bank transfer receipt, and upload it below along with your passport photograph and signature.'}
              </p>
            </div>
          );
        })()}
      </div>

      {/* Renewal Submission Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        
        {/* 1. Member Information */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-sm text-[#0A2E73] dark:text-[#2EA3F2] uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <User className="w-4 h-4" />
            <span>1. Member Profile &amp; Position</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Membership ID Number *</label>
              <input
                type="text"
                required
                value={formData.membershipId}
                onChange={(e) => setFormData({ ...formData, membershipId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2] font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Position / Designation *</label>
            <input
              type="text"
              required
              placeholder="e.g. National Vice Chairperson, Kano State Coordinator, Senior Consultant"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#2EA3F2]"
            />
          </div>
        </div>

        {/* 2. Passport Photograph */}
        <div className="space-y-2">
          <DualImageUpload
            label="2. Passport Photograph"
            subLabel="Clear front-facing passport photograph with white/plain background."
            currentUrl={formData.passportUrl}
            onImageChange={(url) => setFormData({ ...formData, passportUrl: url })}
            icon={Camera}
            aspectRatio="square"
            required
            bucket="passports"
          />
        </div>

        {/* 3. Digital Signature */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="font-display font-bold text-sm text-[#0A2E73] dark:text-[#2EA3F2] uppercase tracking-wider flex items-center gap-2">
              <PenTool className="w-4 h-4" />
              <span>3. Digital Signature</span>
            </h3>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setSignatureMode('draw')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  signatureMode === 'draw' ? 'bg-[#0A2E73] text-white' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Draw Signature
              </button>
              <button
                type="button"
                onClick={() => setSignatureMode('upload')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  signatureMode === 'upload' ? 'bg-[#0A2E73] text-white' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Upload File
              </button>
            </div>
          </div>

          {signatureMode === 'draw' ? (
            <div className="space-y-2">
              <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-2xl p-2 text-center">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={120}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-28 cursor-crosshair rounded-xl touch-none bg-white"
                />
                {!hasDrawnSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium">
                    Draw your signature here with cursor or touch...
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-red-50 hover:text-red-600 flex items-center gap-1 transition-colors"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Clear Pad</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="w-40 h-16 bg-white dark:bg-slate-900 border rounded-xl flex items-center justify-center p-2 shadow-inner">
                <img src={signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
              </div>

              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A2E73] text-white text-xs font-bold cursor-pointer hover:bg-sky-700 transition-colors shadow-sm">
                <Upload className="w-3.5 h-3.5" />
                <span>Choose Signature Image</span>
                <input type="file" accept="image/*" onChange={handleSignatureUpload} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* 4. Renewal Payment Receipt */}
        <div className="space-y-2">
          <DualImageUpload
            label={`4. Payment Receipt (₦${renewalFeeAmount.toLocaleString()})`}
            subLabel="Upload clear evidence of bank payment or online transfer for the ID card renewal fee."
            currentUrl={formData.receiptUrl}
            onImageChange={(url) => setFormData({ ...formData, receiptUrl: url })}
            icon={CreditCard}
            aspectRatio="receipt"
            required
            bucket="receipts"
          />
        </div>

        {/* Form Footer Note & Submit */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
          <div>
            <strong>Super Admin Verification Notice:</strong> Your renewal request will be thoroughly reviewed. The Super Admin will verify your payment receipt, update issue/expiry dates, and regenerate your official high-security membership card.
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-4 rounded-2xl bg-[#0A2E73] text-white font-display font-extrabold text-sm hover:bg-[#08245A] transition-all flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl active:scale-95"
        >
          <FileCheck className="w-5 h-5 text-[#2EA3F2]" />
          <span>Submit ID Card Renewal Request</span>
        </button>

      </form>

    </div>
  );
};
