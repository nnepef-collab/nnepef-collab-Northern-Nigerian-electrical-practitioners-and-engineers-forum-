import React, { useState } from 'react';
import { Member } from '../types';
import { ShieldCheck, Search, AlertCircle, CheckCircle2, Lock, ArrowLeft, Award, MapPin, Building2, Phone, Hash, Copy, Check, Printer } from 'lucide-react';
import { handleImageError, getValidImageUrl } from '../utils/imageHelpers';
import { verifyMemberByMembershipAndPhone, PublicVerifiedMember } from '../services/supabaseService';

interface MemberVerificationProps {
  members?: Member[];
  setCurrentView: (view: string) => void;
}

export const MemberVerification: React.FC<MemberVerificationProps> = ({ setCurrentView }) => {
  const [membershipNumber, setMembershipNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [verifiedMember, setVerifiedMember] = useState<PublicVerifiedMember | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  const showCopyFeedback = (msg: string) => {
    setCopied(true);
    setCopiedMessage(msg);
    setTimeout(() => {
      setCopied(false);
      setCopiedMessage(null);
    }, 3500);
  };

  const copyToClipboard = (text: string, feedbackMsg: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showCopyFeedback(feedbackMsg);
      }).catch(() => fallbackCopy(text, feedbackMsg));
    } else {
      fallbackCopy(text, feedbackMsg);
    }
  };

  const fallbackCopy = (text: string, feedbackMsg: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showCopyFeedback(feedbackMsg);
    } catch (err) {
      console.error('Copy fallback failed:', err);
    }
  };

  const handleCopyFullResult = () => {
    if (!verifiedMember) return;
    const textToCopy = `====================================================
N-NEPEF 2020 OFFICIAL MEMBER VERIFICATION RESULT
Northern Nigeria Electrical Practitioners & Engineers Forum
====================================================
Status: APPROVED & CERTIFIED PRACTITIONER
Full Name: ${verifiedMember.fullName}
Official Membership ID: ${verifiedMember.membershipId}
Position: ${verifiedMember.position || 'Practicing Member'}
Membership Type: ${verifiedMember.membershipType || 'Full Member'}
Discipline / Occupation: ${verifiedMember.occupation || 'Electrical Practitioner'}
${verifiedMember.specialization ? `Area of Specialization: ${verifiedMember.specialization}\n` : ''}Chapter Jurisdiction: ${verifiedMember.state} State Chapter${verifiedMember.lga ? ` (${verifiedMember.lga} LGA)` : ''}
Organization: Northern Nigeria Electrical Practitioners & Engineers Forum (N-NEPEF 2020)
Verification Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
Portal Reference: Verified against official database records
====================================================`;

    copyToClipboard(textToCopy, 'An kwafi cikakken sakamakon tantancewa zuwa ga clipboard!');
  };

  const handleCopyIdOnly = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!verifiedMember?.membershipId) return;
    copyToClipboard(verifiedMember.membershipId, `An kwafi lambar memba: ${verifiedMember.membershipId}`);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = membershipNumber.trim();
    const cleanPhone = phoneNumber.trim();

    if (!cleanId || !cleanPhone) {
      setSearchError('Both Official Membership Number and Registered Phone Number are required for verification.');
      return;
    }

    setHasSearched(true);
    setIsSearching(true);
    setSearchError(null);
    setVerifiedMember(null);

    try {
      const result = await verifyMemberByMembershipAndPhone(cleanId, cleanPhone);
      if (result) {
        setVerifiedMember(result);
      } else {
        setVerifiedMember(null);
      }
    } catch (err: any) {
      setSearchError('An error occurred during verification check. Please check your network connection.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentView('home')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#0A2E73] dark:hover:text-sky-400"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
        <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <Lock className="w-3 h-3" />
          <span>Dual-Factor Public Verification</span>
        </span>
      </div>

      {/* Header Box */}
      <div className="glass-card p-8 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 bg-sky-100 dark:bg-sky-950 rounded-2xl flex items-center justify-center text-[#0A2E73] dark:text-[#2EA3F2] mx-auto">
          <ShieldCheck className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
            Official Member Verification
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
            Verify official certified electrical engineers and practitioners in Northern Nigeria. To protect member privacy and prevent unauthorized checks, <strong>BOTH</strong> the <strong>Official Membership Number</strong> and the <strong>Registered Phone Number</strong> are strictly required.
          </p>
        </div>

        {/* Dual Input Verification Form */}
        <form onSubmit={handleSearch} className="max-w-xl mx-auto pt-2 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Membership ID Input */}
            <div className="relative flex items-center">
              <Hash className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="text"
                required
                value={membershipNumber}
                onChange={(e) => {
                  setMembershipNumber(e.target.value);
                  setHasSearched(false);
                }}
                placeholder="Official ID (e.g. NNEPEF/KN/0001)"
                className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-medium text-slate-900 dark:text-white focus:border-[#2EA3F2] outline-none shadow-sm"
              />
            </div>

            {/* Phone Number Input */}
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setHasSearched(false);
                }}
                placeholder="Registered Phone (e.g. 080...)"
                className="w-full pl-10 pr-3 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-900 dark:text-white focus:border-[#2EA3F2] outline-none shadow-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSearching || !membershipNumber.trim() || !phoneNumber.trim()}
            className="w-full py-3 rounded-xl bg-[#0A2E73] text-white text-xs font-bold hover:bg-sky-700 transition-colors shadow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            <span>{isSearching ? 'Verifying with Supabase...' : 'Verify Official Membership Record'}</span>
          </button>
        </form>

        {searchError && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200">
            {searchError}
          </div>
        )}

        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1 pt-1">
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
          <span>Strict Privacy Protection: Verification requires both fields. Confidential data (NIN, DOB, home address, next of kin, phone, receipts) is never disclosed.</span>
        </p>
      </div>

      {/* VERIFICATION RESULTS DISPLAY */}
      {hasSearched ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Verification Result
            </h3>
            <span className="text-xs text-slate-500">Only Active Certified Members Displayed</span>
          </div>

          {!verifiedMember ? (
            <div className="p-8 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-3xl text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <h4 className="font-bold text-lg text-red-800 dark:text-red-300">Member Record Not Verified</h4>
              <p className="text-xs text-red-700 dark:text-red-300 max-w-lg mx-auto leading-relaxed">
                No active approved member record was found matching Official ID "<strong>{membershipNumber}</strong>" and Phone Number "<strong>{phoneNumber}</strong>" in the official N-NEPEF database. Both the membership number and registered phone number must match an approved record. Unapproved or pending applications cannot be verified publicly.
              </p>
            </div>
          ) : (
            <div className="glass-card p-6 sm:p-8 rounded-3xl border-2 border-emerald-500/50 dark:border-emerald-500/60 relative overflow-hidden space-y-6 shadow-2xl">
              {/* Status Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                      OFFICIAL CERTIFIED MEMBER
                    </h3>
                    <p className="text-[11px] text-slate-500">Verified against official N-NEPEF 2020 register</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyFullResult}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow cursor-pointer"
                    title="Kwafi Cikakken Sakamakon Tantancewa"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'An Kwafa!' : 'Kwafi Sakamako'}</span>
                  </button>
                  <div className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-300 dark:border-emerald-800">
                    VERIFIED ACTIVE
                  </div>
                </div>
              </div>

              {/* Toast Feedback Notification Banner */}
              {copiedMessage && (
                <div className="flex items-center justify-between gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-900 dark:text-emerald-200 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <span>{copiedMessage}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-200/60 dark:bg-emerald-900 px-2 py-0.5 rounded">
                    Copied
                  </span>
                </div>
              )}

              {/* Profile Card */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <img 
                  src={getValidImageUrl(verifiedMember.passportUrl, 'avatar')} 
                  alt={verifiedMember.fullName} 
                  onError={(e) => handleImageError(e, 'avatar')}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-[#0A2E73] dark:border-sky-400 shadow-lg flex-shrink-0"
                />
                <div className="space-y-1.5 text-center sm:text-left flex-1">
                  <h4 className="font-display font-extrabold text-xl sm:text-2xl text-slate-900 dark:text-white leading-tight">
                    {verifiedMember.fullName}
                  </h4>
                  <div className="inline-flex items-center gap-2 font-mono text-xs font-extrabold text-[#0A2E73] dark:text-[#2EA3F2] bg-sky-50 dark:bg-sky-950 px-3 py-1 rounded-lg border border-sky-200 dark:border-sky-800">
                    <span>{verifiedMember.membershipId}</span>
                    <button
                      type="button"
                      onClick={handleCopyIdOnly}
                      className="p-1 hover:bg-sky-200 dark:hover:bg-sky-900 rounded transition-colors text-slate-600 dark:text-slate-300 hover:text-sky-900 cursor-pointer"
                      title="Kwafi Lambar Memba (Copy ID)"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {verifiedMember.position || 'Practicing Member'} &bull; {verifiedMember.membershipType || 'Full Member'}
                  </p>
                </div>
              </div>

              {/* Public Verification Attributes Grid (EXCLUSIVELY ALLOWED SAFE FIELDS) */}
              <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl space-y-2.5 text-xs border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-[#2EA3F2]" />
                    Occupation / Discipline:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {verifiedMember.occupation || 'Electrical Practitioner'}
                  </span>
                </div>

                {verifiedMember.specialization && (
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#2EA3F2]" />
                      Area of Specialization:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-right">
                      {verifiedMember.specialization}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#2EA3F2]" />
                    Chapter Jurisdiction:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {verifiedMember.state} State Chapter {verifiedMember.lga ? `(${verifiedMember.lga} LGA)` : ''}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#2EA3F2]" />
                    Membership Status:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    APPROVED &amp; CERTIFIED
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#2EA3F2]" />
                    Official Organization:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">
                    N-NEPEF 2020
                  </span>
                </div>
              </div>

              {/* Verified Certificate Note */}
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 text-center font-bold">
                Officially certified practitioner under Northern Nigeria Electrical Practitioners &amp; Engineers Forum (N-NEPEF 2020). Certified in accordance with Forum registration criteria.
              </div>

              {/* Action Buttons: Copy Result & Print */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCopyFullResult}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#0A2E73] hover:bg-[#08245a] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  title="Kwafi Cikakken Sakamako"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'An Kwafi Sakamako! (Copied!)' : 'Kwafi Sakamakon Tantancewa (Copy Result)'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyIdOnly}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                    title="Kwafi Lambar Memba"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Kwafi ID</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                    title="Buga Takardar Sakamako"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Buga (Print)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Please enter the member's <strong>Official Membership ID</strong> (e.g. <strong>NNEPEF/KN/0001</strong>) and their <strong>Registered Phone Number</strong> above, then click <strong>Verify</strong>.
          </p>
        </div>
      )}

    </div>
  );
};

