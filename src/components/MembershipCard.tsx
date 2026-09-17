import React, { useState, useEffect } from 'react';
import { Member, ForumSettings } from '../types';
import {
  Download,
  Printer,
  FileDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  User,
  CreditCard,
  Building2,
  Calendar,
  Zap,
  Layers
} from 'lucide-react';
import QRCode from 'qrcode';
import { handleImageError, getValidImageUrl, downloadFileSafely } from '../utils/imageHelpers';
import { OFFICIAL_NNEPEF_LOGO, OFFICIAL_ID_CARD_LOGO } from '../constants/logo';
import { OFFICIAL_SECRETARY_SIGNATURE } from '../constants/signature';
import {
  downloadMemberIdCardPdf,
  generateVerticalIdCardCanvas,
  hasExecutiveColoredBottom,
  formatCardExpiry,
  formatFourDigitMembershipId
} from '../services/pdfService';

export interface MembershipCardProps {
  member: Member;
  logoUrl?: string;
  settings?: ForumSettings;
}

export const MembershipCard: React.FC<MembershipCardProps> = ({ member, logoUrl, settings }) => {
  const displayLogo = OFFICIAL_ID_CARD_LOGO;
  const customSig = (settings as any)?.signatureUrl;
  const displaySignature = customSig && typeof customSig === 'string' && customSig.trim() !== '' ? customSig : OFFICIAL_SECRETARY_SIGNATURE;

  // View Mode: 'both' shows Front and Back together ("ahadasu guri daya"), or 'front' / 'back'
  const [viewMode, setViewMode] = useState<'both' | 'front' | 'back'>('both');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [isGeneratingPng, setIsGeneratingPng] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const passportPhotoSrc = member.passportUrl || member.passportPhotoUrl || '';
  const formattedId = formatFourDigitMembershipId(member.membershipId);
  const memberIdDisplay = (formattedId || (member.applicationReference ? `REF-${member.applicationReference}` : 'PENDING APPROVAL')).toUpperCase();

  // Check if member has an official position
  const rawPosition = (member.position || '').trim().toUpperCase();
  const hasOfficialPosition = Boolean(
    rawPosition &&
    rawPosition !== 'MEMBER' &&
    rawPosition !== 'ORDINARY MEMBER' &&
    rawPosition !== 'PRACTICING MEMBER' &&
    rawPosition !== 'GENERAL MEMBER' &&
    rawPosition !== 'MEMBER ONLY'
  ) || String(member.role || '').toLowerCase().includes('admin');

  // RULE 1:
  // If the member has an official position, display ONLY: SECRETARY GENERAL
  // Do NOT display “SECRETARY”, “Secretary”, or any other position.
  // For a normal member with no official position, display ONLY: MEMBER
  // Do not add any other title or position.
  const displayPosition = hasOfficialPosition ? 'SECRETARY GENERAL' : 'MEMBER';

  const cleanName = (member.fullName || 'REGISTERED MEMBER').toUpperCase();
  const cleanSpecialization = (member.specialization || (member as any).speciality || member.occupation || 'ELECTRICAL ENGINEERING').toUpperCase();
  const formattedExpiry = formatCardExpiry(member.expiryDate);
  const isExecutive = hasOfficialPosition;
  const isExactMember = !hasOfficialPosition;

  // Generate crisp, verifiable QR code for back side
  useEffect(() => {
    const verifyUrl = `https://nepef.org.ng/verify?id=${encodeURIComponent(member.membershipId || member.id || '')}`;
    QRCode.toDataURL(verifyUrl, {
      width: 400,
      margin: 1,
      color: {
        dark: '#002B66',
        light: '#FFFFFF'
      }
    }).then(url => {
      setQrCodeDataUrl(url);
    }).catch(err => {
      console.warn('QR code generation error:', err);
    });
  }, [member.membershipId, member.id]);

  // 1. Download ID Card PDF (Portrait CR80 with both Front & Back)
  const handleDownloadPdf = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsGeneratingPdf(true);
    setErrorMessage(null);
    try {
      await downloadMemberIdCardPdf(member, settings, e);
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 4000);
    } catch (err: any) {
      console.error('[MembershipCard] PDF generation error:', err);
      setErrorMessage(err?.message || 'Failed to download ID Card PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 2. Download ID Card PNG for a specific side ('front' | 'back')
  const handleDownloadCardImage = async (side: 'front' | 'back', e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsGeneratingPng(side);
    setErrorMessage(null);
    try {
      const canvas = await generateVerticalIdCardCanvas(member, settings, side);
      const dataUrl = canvas.toDataURL('image/png');
      const filename = `NNEPEF-Vertical-IDCard-${(member.membershipId || member.fullName || 'Member').replace(/[^a-zA-Z0-9_-]/g, '_')}-${side}.png`;
      await downloadFileSafely(dataUrl, filename, e);
      setDownloadSuccess(side);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err: any) {
      console.error('[MembershipCard] ID card image generation error:', err);
      setErrorMessage(err?.message || 'Failed to generate ID card image.');
    } finally {
      setIsGeneratingPng(null);
    }
  };

  const handlePrintCard = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('Direct print failed:', e);
    }
  };

  // FRONT CARD RENDER FUNCTION
  const renderFrontCard = () => (
    <div
      id="nnepef-vertical-idcard-front"
      data-member-id={member.id || member.membershipId}
      className="w-[348px] sm:w-[364px] rounded-[38px] bg-[#0052CC] text-white p-3 sm:p-3.5 pt-4 sm:pt-4.5 relative overflow-hidden shadow-2xl flex flex-col justify-between select-none"
      style={{ minHeight: '620px', maxHeight: '650px' }}
    >
      {/* TOP HEADER SECTION (on Blue Background) - Shifted slightly downward to create clean space at top */}
      <div className="text-center pt-2 pb-1 relative z-10 px-1">
        {/* Line 1: NORTHERN NIGERIAN ELECTRICAL — MUST BE STRONG YELLOW ONLY */}
        <h3 className="font-extrabold text-[#FFDE00] text-[17.5px] sm:text-[19px] tracking-tight leading-tight uppercase drop-shadow-sm">
          NORTHERN NIGERIAN ELECTRICAL
        </h3>
        {/* Line 2: PRACTITIONERS & ENGINEERS — White */}
        <h3 className="font-extrabold text-white text-[17.5px] sm:text-[19px] tracking-tight leading-tight uppercase mt-0.5 drop-shadow-sm">
          PRACTITIONERS &amp; ENGINEERS
        </h3>
        {/* Line 3: FORUM (N-NPEEF) — FORUM in white, (N-NPEEF) in pink/magenta */}
        <h3 className="font-extrabold text-[17.5px] sm:text-[19px] tracking-tight leading-tight uppercase mt-0.5 drop-shadow-sm">
          <span className="text-white">FORUM </span>
          <span className="text-[#E11D48] font-black">(N-NPEEF)</span>
        </h3>

        {/* Title Ribbon: MEMBERSHIP I.D CARD (Rounded white title box and pink/magenta text style) */}
        <div className="mt-2 mb-0.5 mx-auto px-6 py-1.5 rounded-full bg-white shadow-md text-[#E11D48] font-black text-[13.5px] sm:text-[15px] tracking-wider uppercase text-center w-fit border border-slate-100">
          MEMBERSHIP I.D CARD
        </div>
      </div>

      {/* INNER WHITE CENTRAL AREA WITH CYAN ROUNDED BORDER */}
      <div className="bg-white rounded-[28px] border-4 border-[#00A3FF] p-3.5 sm:p-4 text-slate-900 shadow-xl relative my-1 z-10 flex-1 flex flex-col justify-between">
        {/* Top Row inside White Area: Logo (Left) + Northern Symbol (Right) */}
        <div className="flex items-center justify-between">
          {/* Official master N-NEPEF ID card logo - LARGER and MORE PROMINENT */}
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 bg-white shadow-sm border border-slate-100">
            <img
              src={displayLogo}
              alt="N-NEPEF Logo"
              className="w-full h-full object-contain"
              crossOrigin="anonymous"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== OFFICIAL_ID_CARD_LOGO) {
                  target.src = OFFICIAL_ID_CARD_LOGO;
                }
              }}
            />
          </div>

          {/* Northern Symbol / Electrical Atom */}
          <div className="w-16 h-16 sm:w-18 sm:h-18 flex items-center justify-center text-[#00A3FF] flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-14 h-14 sm:w-15 sm:h-15 stroke-[#00A3FF] fill-none" strokeWidth="6">
              <ellipse cx="50" cy="50" rx="42" ry="18" transform="rotate(45 50 50)" />
              <ellipse cx="50" cy="50" rx="42" ry="18" transform="rotate(-45 50 50)" />
              <polygon points="48,34 58,48 50,48 52,66 42,52 50,52" fill="#00A3FF" stroke="none" />
            </svg>
          </div>
        </div>

        {/* MEMBER PHOTOGRAPH IN A CIRCULAR FRAME - NATURAL FACE, PROPORTIONED */}
        <div className="flex justify-center -mt-8">
          <div className="w-34 h-34 sm:w-36 sm:h-36 rounded-full p-1 border-4 border-[#0052CC] bg-white shadow-lg">
            <div className="w-full h-full rounded-full border-2 border-[#00A3FF] overflow-hidden bg-slate-100 flex items-center justify-center">
              <img
                src={getValidImageUrl(passportPhotoSrc, 'avatar')}
                alt={member.fullName}
                onError={(e) => handleImageError(e, 'avatar')}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            </div>
          </div>
        </div>

        {/* 4 DYNAMIC INFO ROWS ON FRONT (SPECIALITY IS ON BACK ONLY) */}
        <div className="mt-2.5 space-y-1.5 sm:space-y-2 text-left">
          {/* Row 1: Member Name — PINK/MAGENTA, BOLD & PROMINENT */}
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-lg bg-[#0052CC] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h4 className="font-extrabold text-[21px] sm:text-[23px] text-[#E11D48] uppercase truncate leading-tight tracking-tight">
                {cleanName}
              </h4>
            </div>
          </div>

          {/* Row 2: Membership ID Number — DARK BLUE/NAVY, BOLD (NO "MEMBERSHIP ID: " prefix) */}
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-lg bg-[#0052CC] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h4 className="font-serif font-black text-[18px] sm:text-[20px] text-[#002B66] tracking-wider uppercase truncate leading-tight">
                {memberIdDisplay}
              </h4>
            </div>
          </div>

          {/* Row 3: Position — GREEN, BOLD (ONLY "SECRETARY GENERAL" or "MEMBER") */}
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-lg bg-[#0052CC] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h4 className="font-serif font-black text-[17.5px] sm:text-[19.5px] text-[#15803D] uppercase tracking-wide truncate leading-tight">
                {displayPosition}
              </h4>
            </div>
          </div>

          {/* Row 4: Expiry — "EXPIRES: " in navy, date in pink/magenta — EXACTLY "EXPIRES: [DATE]" */}
          <div className="flex items-center gap-2.5">
            <div className="w-8.5 h-8.5 rounded-lg bg-[#0052CC] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0 overflow-visible flex items-baseline">
              <span className="font-sans font-black text-[14px] sm:text-[15.5px] tracking-tight uppercase inline-flex items-baseline whitespace-nowrap leading-tight">
                <span className="text-[#002B66]">EXPIRES:&nbsp;</span>
                <span className="text-[#E11D48]">{formattedExpiry}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* POSITION-BASED BOTTOM SECTION */}
      {isExecutive ? (
        <div className="relative h-9 w-full overflow-hidden -mb-1">
          <svg viewBox="0 0 380 40" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M 0,10 Q 190,32 380,10 L 380,40 L 0,40 Z"
              fill="#E11D48"
            />
            <path
              d="M 0,10 Q 190,32 380,10"
              fill="none"
              stroke="#00A3FF"
              strokeWidth="3"
            />
          </svg>
        </div>
      ) : (
        <div className="h-2.5 w-full bg-[#0052CC]" />
      )}
    </div>
  );

  // BACK CARD RENDER FUNCTION (Exact replica of user's uploaded photo with signature)
  const renderBackCard = () => (
    <div
      id="nnepef-vertical-idcard-back"
      data-member-id={member.id || member.membershipId}
      className="w-[348px] sm:w-[364px] rounded-[38px] bg-[#0052CC] text-white p-3 sm:p-3.5 relative overflow-hidden shadow-2xl flex flex-col justify-between select-none"
      style={{ minHeight: '610px', maxHeight: '640px' }}
    >
      {/* White Panel with Cyan Border */}
      <div className="bg-white rounded-[28px] border-4 border-[#00A3FF] p-4 text-slate-900 shadow-xl relative z-10 flex-1 flex flex-col justify-between items-center text-center">
        {/* Organization Header */}
        <div className="w-full pt-0.5 pb-1.5">
          <h4 className="font-extrabold text-[#002B66] text-[13px] sm:text-[14px] tracking-tight leading-tight uppercase">
            NORTHERN NIGERIAN ELECTRICAL
          </h4>
          <h4 className="font-extrabold text-[#002B66] text-[13px] sm:text-[14px] tracking-tight leading-tight uppercase mt-0.5">
            PRACTITIONERS &amp; ENGINEERS
          </h4>
          <h4 className="font-extrabold text-[#002B66] text-[13px] sm:text-[14px] tracking-tight leading-tight uppercase mt-0.5">
            FORUM <span className="text-[#E11D48] font-black">(N-NPEEF)</span>
          </h4>

          {/* Head Office & Tel */}
          <p className="text-[9px] sm:text-[9.5px] font-bold text-[#002B66] tracking-tight mt-1.5 leading-tight px-1">
            <span className="text-[#0052CC] font-black">Head Office:</span> {settings?.headquarters || 'Beside Tashar Rigiyar Zaki, opp. Brilliant Academy, Kano'}
          </p>
          <p className="text-[9px] sm:text-[9.5px] font-bold text-[#002B66] tracking-tight mt-0.5 leading-tight">
            <span className="text-[#0052CC] font-black">Tel:</span> 07036144377, 08133771460, 09067543760
          </p>
        </div>

        {/* MEMBER SPECIALITY ON BACK SIDE OF ID CARD (Prominent and clearly visible) */}
        <div className="w-full bg-blue-50/90 border-2 border-[#00A3FF] rounded-xl px-3 py-1.5 my-1 text-center shadow-sm">
          <span className="text-[10px] sm:text-[10.5px] font-black text-[#0052CC] uppercase tracking-wider block">
            AREA OF SPECIALITY / FIELD
          </span>
          <span className="font-serif font-black text-[13.5px] sm:text-[15px] text-[#002B66] uppercase tracking-wide block mt-0.5 leading-tight">
            {cleanSpecialization}
          </span>
        </div>

        {/* Large Centered QR Code */}
        <div className="my-auto py-0.5">
          <div className="p-1.5 bg-white rounded-2xl border border-slate-300 shadow-sm inline-block">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="Member Verification QR Code"
                className="w-34 h-34 sm:w-38 sm:h-38 object-contain mx-auto"
              />
            ) : (
              <div className="w-34 h-34 sm:w-38 sm:h-38 flex items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* MEMBERSHIP I.D CARD Pill Button with Cyan Border */}
        <div className="w-full max-w-[270px] py-1.5 px-4 rounded-xl border-2 border-[#00A3FF] bg-white shadow-sm text-center my-1">
          <span className="font-black text-[13px] sm:text-[14px] tracking-wider uppercase text-[#002B66]">
            MEMBERSHIP I.D CARD
          </span>
        </div>

        {/* OFFICIAL SIGNATURE ON BACK SIDE ONLY (Exact Match to User Reference Photo) */}
        <div className="w-full flex flex-col items-center justify-center mt-1 mb-0.5">
          <div className="h-11 flex items-center justify-center">
            <img
              src={displaySignature}
              alt="Authorized Signature"
              className="max-h-10 max-w-[200px] object-contain"
              crossOrigin="anonymous"
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== OFFICIAL_SECRETARY_SIGNATURE) {
                  target.src = OFFICIAL_SECRETARY_SIGNATURE;
                }
              }}
            />
          </div>
          <span className="text-[10.5px] font-bold text-[#002B66] uppercase tracking-wide">
            SECRETARY GENERAL
          </span>
        </div>
      </div>

      {/* POSITION-BASED BOTTOM SECTION (BACK SIDE) */}
      {!isExactMember && isExecutive ? (
        <div className="relative h-9 w-full overflow-hidden -mb-1">
          <svg viewBox="0 0 380 40" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M 0,10 Q 190,32 380,10 L 380,40 L 0,40 Z"
              fill="#E11D48"
            />
            <path
              d="M 0,10 Q 190,32 380,10"
              fill="none"
              stroke="#00A3FF"
              strokeWidth="3"
            />
          </svg>
        </div>
      ) : (
        <div className="h-2.5 w-full bg-[#0052CC]" />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Action Toolbar */}
      <div className="no-print flex flex-col md:flex-row items-center justify-between bg-slate-100 dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#0052CC]/15 text-[#0052CC] dark:text-sky-400">
              <Sparkles className="w-4 h-4" />
            </span>
            <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white">
              Official Membership ID Card (Vertical Standing Badge)
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Full Portrait Credential • Front &amp; Back Sides Available
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: Both Sides ("ahadasu guri daya"), Front Only, or Back Only */}
          <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'both'
                  ? 'bg-[#0052CC] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Display Both Sides Together in One Place"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Both Sides</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('front')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'front'
                  ? 'bg-[#0052CC] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => setViewMode('back')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'back'
                  ? 'bg-[#0052CC] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Back
            </button>
          </div>

          {/* Primary Action: Download ID Card PDF */}
          <button
            type="button"
            disabled={isGeneratingPdf}
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            title="Download Vertical ID Card PDF (Front & Back Complete)"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 text-sky-200 animate-spin" />
                <span>Building PDF...</span>
              </>
            ) : pdfSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>PDF Downloaded!</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 text-sky-200" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          {/* Download Front PNG */}
          <button
            type="button"
            disabled={isGeneratingPng !== null}
            onClick={(e) => handleDownloadCardImage('front', e)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Download Front High-Resolution PNG"
          >
            {isGeneratingPng === 'front' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : downloadSuccess === 'front' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Front PNG</span>
          </button>

          {/* Download Back PNG */}
          <button
            type="button"
            disabled={isGeneratingPng !== null}
            onClick={(e) => handleDownloadCardImage('back', e)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Download Back High-Resolution PNG"
          >
            {isGeneratingPng === 'back' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : downloadSuccess === 'back' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Back PNG</span>
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrintCard}
            className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all cursor-pointer"
            title="Print ID Card"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="no-print p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ID CARD DISPLAY: COMBINED IN ONE PLACE ("ahadasu guri daya") */}
      <div className="flex justify-center p-2">
        {viewMode === 'both' ? (
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 py-2 w-full">
            {/* FRONT SIDE */}
            <div className="flex flex-col items-center">
              <div className="mb-2 px-3.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#0052CC] dark:text-sky-300 text-xs font-black tracking-wider uppercase border border-blue-200 dark:border-blue-800">
                Front Side • Gaban Katin
              </div>
              {renderFrontCard()}
            </div>

            {/* BACK SIDE */}
            <div className="flex flex-col items-center">
              <div className="mb-2 px-3.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[#0052CC] dark:text-sky-300 text-xs font-black tracking-wider uppercase border border-blue-200 dark:border-blue-800">
                Back Side • Bayan Katin
              </div>
              {renderBackCard()}
            </div>
          </div>
        ) : viewMode === 'front' ? (
          <div className="flex flex-col items-center">
            {renderFrontCard()}
            {/* Maintain back card in DOM so DOM capture can always capture both sides accurately */}
            <div style={{ position: 'fixed', left: '-9999px', top: 0, opacity: 1, pointerEvents: 'none', zIndex: -100, visibility: 'visible' }} aria-hidden="true">
              {renderBackCard()}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {renderBackCard()}
            {/* Maintain front card in DOM so DOM capture can always capture both sides accurately */}
            <div style={{ position: 'fixed', left: '-9999px', top: 0, opacity: 1, pointerEvents: 'none', zIndex: -100, visibility: 'visible' }} aria-hidden="true">
              {renderFrontCard()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
