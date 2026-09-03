import React, { useState, useEffect } from 'react';
import { Member, ForumSettings } from '../types';
import { NORTHERN_STATES, SPECIALIZATIONS } from '../data/initialData';
import { DualImageUpload } from './DualImageUpload';
import { generateUUID } from '../utils/uuid';
import { downloadMemberProfilePdf } from '../services/pdfService';
import { 
  User, 
  Phone, 
  MapPin, 
  Briefcase, 
  GraduationCap,
  ShieldCheck, 
  ArrowLeft, 
  Copy, 
  Check, 
  Receipt, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Download,
  Info,
  Clock,
  Sparkles,
  Building2,
  Share2
} from 'lucide-react';

interface MemberRegistrationProps {
  settings?: ForumSettings;
  onRegister: (newMember: Member) => Promise<Member | void>;
  setCurrentView: (view: string) => void;
}

const QUALIFICATION_LEVELS = [
  'B.Sc. / B.Eng. Electrical Engineering',
  'HND Electrical / Electronics',
  'OND Electrical Engineering',
  'M.Sc. / M.Eng. Electrical Engineering',
  'Ph.D. Electrical Engineering',
  'NABTEB / Technical Certificate',
  'Trade Test (Grade I, II, III)',
  'SSCE / WAEC / NECO',
  'Other Professional Certificate'
];

const OCCUPATION_ROLES = [
  'Electrical Engineer',
  'Electrical Contractor / Consultant',
  'Certified Electrical Wireman',
  'Solar PV & Renewable Energy Installer',
  'Industrial Automation & Control Specialist',
  'High-Voltage Substation Technician',
  'Electrical Maintenance Technician',
  'Generator & Power Systems Specialist',
  'Academic / Researcher',
  'Apprentice / Trainee'
];

const IDENTIFICATION_TYPES = [
  'National Identification Number (NIN)',
  "Voter's Card (PVC)",
  "Driver's License",
  'International Passport',
  'National Identity Slip',
  'Other Official ID'
];

export const MemberRegistration: React.FC<MemberRegistrationProps> = ({ 
  settings, 
  onRegister, 
  setCurrentView 
}) => {
  const [submittedMember, setSubmittedMember] = useState<Member | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedAccNum, setCopiedAccNum] = useState(false);
  const [copiedAccName, setCopiedAccName] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const initialForm = {
    // 1. Personal
    fullName: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    dob: '',
    phone: '',
    altPhone: '',
    nationality: 'Nigerian',
    state: 'Kano',
    lga: '',
    address: '',
    passportUrl: '',
    // 2. Identification
    nin: '',
    otherIdType: 'National Identification Number (NIN)',
    otherIdNumber: '',
    // 3. Education
    highestQualification: QUALIFICATION_LEVELS[0],
    courseOfStudy: 'Electrical Engineering',
    institution: '',
    graduationYear: '',
    otherQualifications: '',
    professionalCertificates: '',
    // 4. Professional
    occupation: OCCUPATION_ROLES[0],
    company: '',
    specialization: SPECIALIZATIONS[0],
    otherSkills: '',
    yearsOfExperience: 3,
    licenseNumber: '',
    // 5. Next of Kin
    nextOfKin: {
      name: '',
      relation: 'Spouse',
      phone: '',
      altPhone: '',
      address: ''
    },
    // 6. Payment Receipt
    paymentReceiptUrl: ''
  };

  const [formData, setFormData] = useState(() => {
    try {
      const draft = sessionStorage.getItem('nnepef_registration_draft_v2');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed && typeof parsed === 'object') {
          return { ...initialForm, ...parsed };
        }
      }
    } catch (e) {}
    return initialForm;
  });

  // Preserve form draft in case mobile camera or browser refresh interrupts
  useEffect(() => {
    try {
      if (!submittedMember) {
        sessionStorage.setItem('nnepef_registration_draft_v2', JSON.stringify(formData));
      }
    } catch (e) {}
  }, [formData, submittedMember]);

  const bankAccounts = settings?.bankAccounts || [];
  const activeBank = bankAccounts.find(b => b.isActive) || bankAccounts[0] || (settings?.bankName ? {
    id: 'active',
    bankName: settings.bankName,
    accountName: settings.bankAccountName || '',
    accountNumber: settings.bankAccountNumber || '',
    branch: '',
    paymentInstructions: settings.paymentInstructions
  } : null);

  const bankName = activeBank?.bankName || 'First Bank of Nigeria';
  const bankAccountName = activeBank?.accountName || 'Northern Nigerian Electrical Practitioners & Engineers Forum';
  const bankAccountNumber = activeBank?.accountNumber || '2034981122';
  const registrationFee = settings?.annualFee || (settings as any)?.registrationFee || 10000;

  const copyToClipboard = (text: string, type: 'num' | 'name') => {
    navigator.clipboard.writeText(text);
    if (type === 'num') {
      setCopiedAccNum(true);
      setTimeout(() => setCopiedAccNum(false), 2000);
    } else {
      setCopiedAccName(true);
      setTimeout(() => setCopiedAccName(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation checks
    if (!formData.fullName || !formData.fullName.trim()) {
      setValidationError('Full Name is required.');
      return;
    }

    if (!formData.phone || !formData.phone.trim()) {
      setValidationError('Primary Phone Number is required for membership verification.');
      return;
    }

    if (!formData.state) {
      setValidationError('State of Chapter is required.');
      return;
    }

    if (!formData.lga || !formData.lga.trim()) {
      setValidationError('Local Government Area (LGA) is required.');
      return;
    }

    if (!formData.nin || !formData.nin.trim()) {
      setValidationError('National Identification Number (NIN) is required for verified practitioners.');
      return;
    }

    setIsSubmitting(true);

    try {
      const defaultPassport = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';
      const defaultReceipt = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600';

      const memberId = generateUUID();
      const refSuffix = Math.floor(100000 + Math.random() * 900000);
      const appRef = `APP-${new Date().getFullYear()}-${refSuffix}`;

      const newMember: Member = {
        id: memberId,
        membershipId: '', // Blank until assigned manually by Admin!
        applicationReference: appRef,
        fullName: formData.fullName.trim(),
        gender: formData.gender,
        dob: formData.dob,
        dateOfBirth: formData.dob,
        phone: formData.phone.trim(),
        altPhone: formData.altPhone?.trim() || undefined,
        alternativePhone: formData.altPhone?.trim() || undefined,
        nationality: formData.nationality?.trim() || 'Nigerian',
        nin: formData.nin.trim(),
        ninNumber: formData.nin.trim(),
        otherIdType: formData.otherIdType,
        otherIdNumber: formData.otherIdNumber?.trim() || undefined,
        state: formData.state,
        lga: formData.lga.trim(),
        address: formData.address.trim(),
        residentialAddress: formData.address.trim(),
        highestQualification: formData.highestQualification,
        qualification: formData.highestQualification,
        courseOfStudy: formData.courseOfStudy.trim(),
        institution: formData.institution.trim(),
        graduationYear: formData.graduationYear.trim(),
        otherQualifications: formData.otherQualifications?.trim() || undefined,
        professionalCertificates: formData.professionalCertificates?.trim() || undefined,
        occupation: formData.occupation.trim(),
        company: formData.company.trim(),
        specialization: formData.specialization,
        otherSkills: formData.otherSkills?.trim() || undefined,
        yearsOfExperience: Number(formData.yearsOfExperience) || 0,
        licenseNumber: formData.licenseNumber?.trim() || undefined,
        passportUrl: formData.passportUrl.trim() || defaultPassport,
        passportPhotoUrl: formData.passportUrl.trim() || defaultPassport,
        paymentReceiptUrl: formData.paymentReceiptUrl.trim() || defaultReceipt,
        registrationFee: Number(registrationFee),
        nextOfKin: {
          name: formData.nextOfKin.name.trim(),
          relation: formData.nextOfKin.relation,
          phone: formData.nextOfKin.phone.trim(),
          altPhone: formData.nextOfKin.altPhone?.trim() || undefined,
          address: formData.nextOfKin.address.trim()
        },
        status: 'pending',
        role: 'Member',
        position: 'Member',
        registeredAt: new Date().toISOString()
      };

      const result = await onRegister(newMember);
      const confirmed = (result && typeof result === 'object' && 'id' in result) ? result : newMember;

      try {
        sessionStorage.removeItem('nnepef_registration_draft_v2');
      } catch (e) {}

      setSubmittedMember(confirmed);
    } catch (err: any) {
      console.error('[MemberRegistration] Submission error:', err);
      setValidationError(err?.message || 'Failed to submit registration. Please verify database connection and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadProfile = async () => {
    if (!submittedMember) return;
    setIsDownloadingPdf(true);
    try {
      await downloadMemberProfilePdf(submittedMember, settings);
    } catch (e) {
      console.error('PDF download error:', e);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // -------------------------------------------------------------
  // SUCCESS SCREEN
  // -------------------------------------------------------------
  if (submittedMember) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        
        {/* Top Success Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto ring-4 ring-white/30">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display font-extrabold text-2xl sm:text-3xl uppercase tracking-wide">
              REGISTRATION SUBMITTED SUCCESSFULLY
            </h2>
            <p className="text-emerald-50 text-base font-medium max-w-lg mx-auto">
              Thank you for registering with N-NEPEF 2020.
            </p>
            <p className="text-emerald-100 text-sm max-w-lg mx-auto">
              Your registration has been successfully received and is now under review by the N-NEPEF Secretariat.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider border border-white/30">
                <Clock className="w-4 h-4" />
                Application Status: PENDING REVIEW
              </span>
            </div>
          </div>
        </div>

        {/* Member Application Summary Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <img 
              src={submittedMember.passportUrl || submittedMember.passportPhotoUrl} 
              alt={submittedMember.fullName} 
              className="w-24 h-28 rounded-xl object-cover border-2 border-[#0A2E73] dark:border-[#2EA3F2] shadow-md bg-slate-100 dark:bg-slate-800 flex-shrink-0"
            />
            <div className="text-center sm:text-left space-y-1.5 flex-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Applicant Details
              </span>
              <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">
                {submittedMember.fullName}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {submittedMember.occupation} • {submittedMember.specialization}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  <span>Ref: {submittedMember.applicationReference || submittedMember.id}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const refStr = submittedMember.applicationReference || submittedMember.id;
                      navigator.clipboard.writeText(refStr).then(() => {
                        setCopiedRef(true);
                        setTimeout(() => setCopiedRef(false), 2500);
                      });
                    }}
                    className="p-0.5 hover:bg-sky-200 dark:hover:bg-sky-900 rounded transition-colors text-sky-700 dark:text-sky-300 cursor-pointer"
                    title="Kwafi Lambar Reference (Copy Ref)"
                  >
                    {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {copiedRef && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                    An Kwafa!
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Status: PENDING ADMIN APPROVAL
                </span>
              </div>
            </div>
          </div>

          {/* Quick Guidance Info */}
          <div className="bg-sky-50 dark:bg-sky-950/60 rounded-xl p-4 border border-sky-100 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 space-y-2">
            <h5 className="font-bold flex items-center gap-1.5">
              <Info className="w-4 h-4 text-sky-600" />
              What Happens Next?
            </h5>
            <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
              <li>The <strong>State & National Secretariat</strong> will verify your payment receipt, qualifications, and NIN.</li>
              <li>Upon approval, the Admin assigns your official <strong>Membership ID Number (NNEPEF/...)</strong>.</li>
              <li>Your official smart <strong>Membership ID Card</strong> will be automatically generated and made available on the public verification portal.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleDownloadProfile}
              disabled={isDownloadingPdf}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0A2E73] hover:bg-[#08245a] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#2EA3F2]" />
              <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Application Dossier (PDF)'}</span>
            </button>

            <button
              onClick={() => setCurrentView('verify')}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verify Portal / Search Registry</span>
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => {
                setSubmittedMember(null);
                setFormData(initialForm);
              }}
              className="text-xs text-sky-700 dark:text-sky-400 hover:underline font-semibold"
            >
              Register Another Member
            </button>
          </div>

        </div>

      </div>
    );
  }

  // -------------------------------------------------------------
  // REGISTRATION FORM
  // -------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('home')}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white">
              Official Member Registration
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Northern Nigerian Electrical Practitioners and Engineers Forum (N-NEPEF 2020)
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Central Cloud Registration</span>
        </div>
      </div>

      {validationError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-sm">Submission Incomplete</h5>
            <p>{validationError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* SECTION 1: PERSONAL INFORMATION */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Personal Information
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official applicant identity and contact details
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Full Name */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Engr. Muhammad Ibrahim Bello"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Gender <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Date of Birth */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Primary Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +234 803 123 4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Alt Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Alternative Phone Number
              </label>
              <input
                type="tel"
                placeholder="e.g. +234 802 987 6543"
                value={formData.altPhone}
                onChange={(e) => setFormData({ ...formData, altPhone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Nationality */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Nationality
              </label>
              <input
                type="text"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* State */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                State of Chapter <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              >
                {NORTHERN_STATES.map(st => (
                  <option key={st} value={st}>{st} State</option>
                ))}
              </select>
            </div>

            {/* LGA */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Local Government (LGA) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kano Municipal / Zaria"
                value={formData.lga}
                onChange={(e) => setFormData({ ...formData, lga: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Residential / Workshop Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Suite 4, Dan Agundi Road, Kano State"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Passport Photograph */}
            <div className="sm:col-span-2 lg:col-span-3 pt-2">
              <DualImageUpload
                label="Passport Photograph"
                subLabel="Upload a clear, front-facing passport photo for your official Membership ID card."
                currentUrl={formData.passportUrl}
                onImageChange={(url) => setFormData({ ...formData, passportUrl: url })}
                bucket="passports"
                aspectRatio="square"
                required
              />
            </div>

          </div>
        </div>

        {/* SECTION 2: IDENTIFICATION */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Identification Information
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Statutory identity verification (Membership ID is assigned solely by Admin upon approval)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* NIN */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                National Identification Number (NIN) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={11}
                placeholder="11-digit National Identification Number"
                value={formData.nin}
                onChange={(e) => setFormData({ ...formData, nin: e.target.value.replace(/\D/g, '') })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Other ID Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Secondary ID Type (Optional)
              </label>
              <select
                value={formData.otherIdType}
                onChange={(e) => setFormData({ ...formData, otherIdType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              >
                {IDENTIFICATION_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Other ID Number */}
            <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Secondary ID Number (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. PVC or Driver's License Number"
                value={formData.otherIdNumber}
                onChange={(e) => setFormData({ ...formData, otherIdNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: EDUCATIONAL BACKGROUND */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Educational Background
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Academic and technical qualifications
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Qualification */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Highest Qualification <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.highestQualification}
                onChange={(e) => setFormData({ ...formData, highestQualification: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              >
                {QUALIFICATION_LEVELS.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>

            {/* Course of Study */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Course / Field of Study <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Electrical & Electronics Engineering"
                value={formData.courseOfStudy}
                onChange={(e) => setFormData({ ...formData, courseOfStudy: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Institution */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Institution / School <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Bayero University Kano / Kaduna Poly"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Graduation Year */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Graduation Year
              </label>
              <input
                type="text"
                placeholder="e.g. 2018"
                value={formData.graduationYear}
                onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Other Certifications */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Professional Certificates (NSE, COREN, NEMSA, etc.)
              </label>
              <input
                type="text"
                placeholder="e.g. COREN Reg: R-54321 / NEMSA Certified Wireman"
                value={formData.professionalCertificates}
                onChange={(e) => setFormData({ ...formData, professionalCertificates: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: ELECTRICAL PROFESSIONAL PROFILE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-sm">
              4
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Electrical Professional Profile
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Industry occupation, specialization, and experience
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Occupation */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Current Occupation / Title <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              >
                {OCCUPATION_ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Specialization */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Primary Specialization <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              >
                {SPECIALIZATIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Years of Experience */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Years of Experience <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                max={50}
                required
                value={formData.yearsOfExperience}
                onChange={(e) => setFormData({ ...formData, yearsOfExperience: Number(e.target.value) })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Company / Employer */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Company / Employer / Enterprise Name
              </label>
              <input
                type="text"
                placeholder="e.g. Kano Electricity Distribution PLC / Self Employed"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* License Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Practicing License / Reg No (if any)
              </label>
              <input
                type="text"
                placeholder="e.g. NEMSA/2022/9871"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: NEXT OF KIN */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-sm">
              5
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Next of Kin Details
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Designated emergency contact and relative
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Kin Name */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Next of Kin Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Aisha Muhammad Bello"
                value={formData.nextOfKin.name}
                onChange={(e) => setFormData({
                  ...formData,
                  nextOfKin: { ...formData.nextOfKin, name: e.target.value }
                })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Relationship */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Relationship <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.nextOfKin.relation}
                onChange={(e) => setFormData({
                  ...formData,
                  nextOfKin: { ...formData.nextOfKin, relation: e.target.value }
                })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              >
                <option value="Spouse">Spouse</option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling (Brother / Sister)</option>
                <option value="Child">Child (Son / Daughter)</option>
                <option value="Relative">Relative</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Kin Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Next of Kin Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +234 802 333 4455"
                value={formData.nextOfKin.phone}
                onChange={(e) => setFormData({
                  ...formData,
                  nextOfKin: { ...formData.nextOfKin, phone: e.target.value }
                })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Kin Address */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Next of Kin Address
              </label>
              <input
                type="text"
                placeholder="e.g. Dan Agundi, Kano State"
                value={formData.nextOfKin.address}
                onChange={(e) => setFormData({
                  ...formData,
                  nextOfKin: { ...formData.nextOfKin, address: e.target.value }
                })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: REGISTRATION FEE & PAYMENT RECEIPT */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
              6
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900 dark:text-white">
                Registration Fee &amp; Payment Receipt
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transfer registration fee to the official bank account below and upload your payment slip
              </p>
            </div>
          </div>

          {/* Official Bank Account Information Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 space-y-4 shadow-md border border-slate-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-widest">
                  Official N-NEPEF Bank Account
                </span>
                <h4 className="font-display font-bold text-lg text-white">
                  {bankName}
                </h4>
              </div>
              <div className="px-3 py-1 rounded-lg bg-[#0A2E73] border border-[#2EA3F2]/40 text-xs font-bold text-white">
                Fee: ₦{Number(registrationFee).toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Account Number with 1-click copy */}
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Account Number</span>
                  <span className="font-mono text-base font-extrabold text-[#2EA3F2] tracking-wider">
                    {bankAccountNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(bankAccountNumber, 'num')}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copiedAccNum ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAccNum ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* Account Name with 1-click copy */}
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-[10px] text-slate-400 block font-semibold">Account Name</span>
                  <span className="text-xs font-bold text-slate-200 truncate block">
                    {bankAccountName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(bankAccountName, 'name')}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-xs font-bold flex items-center gap-1 transition-all flex-shrink-0 cursor-pointer"
                >
                  {copiedAccName ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedAccName ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed pt-1">
              <strong>Instructions:</strong> Use your <strong>Full Name</strong> as the transfer description/memo. After payment, take a screenshot or photo of the debit receipt and upload it below.
            </p>
          </div>

          {/* Receipt Photo Upload */}
          <DualImageUpload
            label="Upload Payment Receipt / Teller"
            subLabel="Attach evidence of registration fee payment (PNG, JPG, or screenshot)."
            currentUrl={formData.paymentReceiptUrl}
            onImageChange={(url) => setFormData({ ...formData, paymentReceiptUrl: url })}
            bucket="receipts"
            aspectRatio="receipt"
          />
        </div>

        {/* SUBMISSION ACTION BUTTON */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-start gap-3 text-xs text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              id="confirmConsent"
              required
              className="mt-0.5 w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700"
            />
            <label htmlFor="confirmConsent" className="leading-snug cursor-pointer">
              I solemnly affirm that all electrical engineering credentials, NIN, and personal details provided are authentic and compliant with the Constitution and professional standards of N-NEPEF 2020.
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 px-6 rounded-2xl bg-[#0A2E73] hover:bg-[#08245a] disabled:opacity-50 text-white font-display font-extrabold text-sm sm:text-base transition-all shadow-lg hover:shadow-xl active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Recording in Central Supabase...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 text-[#2EA3F2]" />
                <span>Submit Official Member Application</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};
