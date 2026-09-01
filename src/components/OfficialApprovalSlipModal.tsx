import React from 'react';
import { Member, ForumSettings } from '../types';
import { Printer, Download, X, CheckCircle2, ShieldCheck, QrCode, Building2, Calendar, Award } from 'lucide-react';
import { OFFICIAL_NNEPEF_LOGO } from '../constants/logo';
import { OFFICIAL_SECRETARY_SIGNATURE, OFFICIAL_SECRETARY_SIGNATURE_URL } from '../constants/signature';
import { downloadApprovalSlipPdf } from '../services/pdfService';

interface OfficialApprovalSlipModalProps {
  member: Member | null;
  settings?: ForumSettings;
  onClose: () => void;
}

export const OfficialApprovalSlipModal: React.FC<OfficialApprovalSlipModalProps> = ({
  member,
  settings,
  onClose
}) => {
  if (!member) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      await downloadApprovalSlipPdf(member, settings);
    } catch (e) {
      console.warn('Direct PDF download fallback to print:', e);
      window.print();
    }
  };

  const displayLogo = settings?.logoUrl && settings.logoUrl.trim() !== '' && settings.logoUrl !== '/logo.png'
    ? settings.logoUrl
    : OFFICIAL_NNEPEF_LOGO;

  const passportPhotoSrc = member.passportUrl || member.passportPhotoUrl || '';
  const memberIdDisplay = member.membershipId || (member.applicationReference ? `REF-${member.applicationReference}` : `APP-${member.id.substring(0, 8).toUpperCase()}`);
  const verificationCode = member.verificationCode || member.applicationReference || `VER-${member.id.substring(0, 8).toUpperCase()}`;
  const verificationUrl = `https://nepef.org.ng/verify?id=${encodeURIComponent(member.membershipId || member.id)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white text-slate-900 max-w-3xl w-full rounded-3xl border-2 border-slate-200 shadow-2xl overflow-hidden my-6 print:shadow-none print:border-none print:m-0 print:w-full print:max-w-none print:rounded-none">
        
        {/* Header Action Bar - Hidden in Print */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Official N-NEPEF 2020 Membership Approval Slip</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-[#2EA3F2] hover:bg-sky-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Slip Canvas */}
        <div className="p-8 sm:p-12 space-y-6 bg-white text-slate-900 font-sans print:p-8 relative">
          
          {/* Security Watermark in Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] overflow-hidden">
            <img src={displayLogo} alt="" className="w-96 h-96 object-contain" />
          </div>

          {/* Top Decorative Border */}
          <div className="h-2.5 w-full bg-gradient-to-r from-[#0A2E73] via-[#2EA3F2] to-[#0A2E73] rounded-full"></div>

          {/* Header Block: Logo, Organization Title, Motto */}
          <div className="flex items-start justify-between border-b-2 border-slate-800 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <img 
                src={displayLogo} 
                alt="N-NEPEF Logo" 
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain flex-shrink-0"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== OFFICIAL_NNEPEF_LOGO) target.src = OFFICIAL_NNEPEF_LOGO;
                }}
              />
              <div className="space-y-0.5">
                <h1 className="font-extrabold text-xl sm:text-2xl text-[#0A2E73] uppercase tracking-tight font-serif leading-tight">
                  {settings?.forumName || 'N-NEPEF 2020'}
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-800 tracking-wide uppercase">
                  Northern Nigerian Electrical Practitioners and Engineers Forum
                </p>
                <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest">
                  Unity • Professionalism • Excellence
                </p>
                <p className="text-[9px] text-slate-500 font-mono pt-1">
                  National Secretariat: {settings?.headquarters || 'No. 2 Gwarzo Road, Kano State, Nigeria'} • +234 906 343 5546 • nepef.org.ng
                </p>
              </div>
            </div>

            <div className="text-right flex flex-col items-end flex-shrink-0">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-400 rounded-full font-mono text-[10px] font-extrabold tracking-wider uppercase shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                OFFICIALLY APPROVED
              </span>
              <p className="text-xs font-mono font-bold text-slate-900 pt-2">
                SLIP REF: {verificationCode}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Date: {member.approvedAt ? new Date(member.approvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB')}
              </p>
            </div>
          </div>

          {/* Slip Title Banner */}
          <div className="bg-[#0A2E73] text-white py-2 px-4 rounded-xl flex items-center justify-between shadow-sm">
            <span className="font-extrabold text-xs sm:text-sm tracking-wide uppercase font-serif">
              Official Membership Certificate &amp; Approval Slip
            </span>
            <span className="text-[10px] font-mono text-sky-200">
              Status: ACTIVE / CERTIFIED
            </span>
          </div>

          {/* Member Main ID & Photo Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            {/* Passport Photo */}
            <div className="flex flex-col items-center justify-center space-y-2 sm:col-span-1 border-b sm:border-b-0 sm:border-r border-slate-200 pb-4 sm:pb-0 sm:pr-4">
              <div className="w-28 h-32 rounded-xl overflow-hidden border-2 border-[#0A2E73] shadow-md bg-slate-200 flex items-center justify-center">
                {passportPhotoSrc ? (
                  <img src={passportPhotoSrc} alt={member.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2 text-slate-400 font-mono text-[10px]">
                    OFFICIAL PHOTO
                  </div>
                )}
              </div>
              <span className="text-[9px] font-mono text-slate-500 uppercase font-semibold">Certified Passport</span>
            </div>

            {/* Member Details Columns */}
            <div className="sm:col-span-3 grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1 col-span-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Full Legal Name</span>
                <p className="font-extrabold text-base text-slate-900 uppercase font-serif">{member.fullName}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Assigned Membership ID</span>
                <p className="font-mono font-extrabold text-sm text-[#0A2E73] bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block">
                  {memberIdDisplay}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Verification Code</span>
                <p className="font-mono font-bold text-xs text-slate-800">
                  {verificationCode}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Designation / Role</span>
                <p className="font-bold text-slate-900">{member.position || 'Practicing Member'}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Specialization</span>
                <p className="font-bold text-slate-900">{member.specialization || member.occupation || 'Electrical Engineering'}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">State Chapter &amp; LGA</span>
                <p className="font-bold text-slate-800">{member.state} State {member.lga ? `(${member.lga} LGA)` : ''}</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Registered Phone</span>
                <p className="font-mono font-bold text-slate-800">{member.phone}</p>
              </div>
            </div>
          </div>

          {/* Secondary Details Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 text-[11px]">
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase block">Gender / DOB</span>
              <span className="font-semibold text-slate-800">{member.gender || '—'} / {member.dob || member.dateOfBirth || '—'}</span>
            </div>
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase block">National ID (NIN)</span>
              <span className="font-mono font-semibold text-slate-800">{member.nin ? `${member.nin.substring(0, 4)}••••${member.nin.substring(member.nin.length - 3)}` : 'Verified'}</span>
            </div>
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase block">Approved Date</span>
              <span className="font-semibold text-emerald-800">{member.approvedAt ? new Date(member.approvedAt).toLocaleDateString('en-GB') : 'Verified'}</span>
            </div>
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase block">Approved Authority</span>
              <span className="font-semibold text-slate-800">{member.approvedBy || 'National Secretariat'}</span>
            </div>
          </div>

          {/* Official Verification & Secretary General Signature Block */}
          <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
            
            {/* Dynamic QR Code */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 sm:col-span-1">
              <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-sm flex-shrink-0">
                <QrCode className="w-12 h-12 text-[#0A2E73]" />
              </div>
              <div className="text-[9px] space-y-0.5">
                <p className="font-bold text-slate-900 uppercase">SCAN TO VERIFY</p>
                <p className="text-slate-500 font-mono break-all">{verificationCode}</p>
                <p className="text-[#2EA3F2] font-semibold">nepef.org.ng/verify</p>
              </div>
            </div>

            {/* Official Security Seal */}
            <div className="flex flex-col items-center justify-center text-center sm:col-span-1 space-y-1">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#0A2E73] flex items-center justify-center text-[#0A2E73] p-1">
                <Award className="w-6 h-6" />
              </div>
              <span className="text-[8px] font-mono font-bold text-[#0A2E73] uppercase tracking-widest">
                OFFICIAL SEAL OF N-NEPEF 2020
              </span>
            </div>

            {/* Dedicated Secretary General Signature Box */}
            <div className="flex flex-col items-center text-center sm:col-span-1 space-y-1">
              <div className="h-16 flex items-end justify-center w-full">
                <img 
                  src={OFFICIAL_SECRETARY_SIGNATURE} 
                  alt="Secretary General Signature" 
                  className="max-h-16 object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== OFFICIAL_SECRETARY_SIGNATURE_URL) {
                      target.src = OFFICIAL_SECRETARY_SIGNATURE_URL;
                    }
                  }}
                />
              </div>
              <div className="w-48 border-b-2 border-slate-900 pt-0.5"></div>
              <div className="text-center">
                <p className="font-extrabold text-xs text-slate-950 font-serif">Engr. Hussaini Ali</p>
                <p className="text-[9px] font-bold text-[#0A2E73] uppercase tracking-wide">Secretary General</p>
                <p className="text-[8px] text-slate-500 font-mono">N-NEPEF 2020 National Secretariat</p>
              </div>
            </div>

          </div>

          {/* Legal Notice Footer */}
          <div className="text-center pt-3 border-t border-slate-200 text-[8px] text-slate-500 font-mono">
            This document is an official certified membership approval slip issued by Northern Nigerian Electrical Practitioners and Engineers Forum (N-NEPEF 2020). For digital authenticity verification, visit https://nepef.org.ng/verify or scan the QR code above.
          </div>

        </div>

        {/* Footer Actions - Hidden in Print */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-500 font-mono">
            N-NEPEF 2020 • Central Verified Record
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl bg-[#0A2E73] hover:bg-sky-900 text-white text-xs font-bold transition-all flex items-center gap-2 shadow"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Slip</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
