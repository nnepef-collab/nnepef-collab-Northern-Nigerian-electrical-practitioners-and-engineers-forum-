import React, { useState, useEffect } from 'react';
import { Member, ForumSettings } from '../types';
import { NORTHERN_STATES, SPECIALIZATIONS } from '../data/initialData';
import { DualImageUpload } from './DualImageUpload';
import { generateUUID } from '../utils/uuid';
import { downloadRegistrationSlipImage, downloadMemberDetailsImage } from '../services/pdfService';
import { checkMemberDuplicateInSupabase, DUPLICATE_REGISTRATION_MESSAGE } from '../services/supabaseService';
import { normalizeNin, normalizePhone, isValidNin, isValidPhone } from '../utils/memberHelpers';
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
  AlertTriangle,
  CheckCircle2, 
  FileText, 
  Download,
  Info,
  Clock,
  Sparkles,
  Building2,
  Share2,
  Printer,
  Loader2
} from 'lucide-react';
import { OfficialApprovalSlipModal } from './OfficialApprovalSlipModal';

interface MemberRegistrationProps {
  settings?: ForumSettings;
  members?: Member[];
  onRegister: (newMember: Member) => Promise<Member | void>;
  setCurrentView: (view: string) => void;
}

export const OTHER_QUALIFICATION_LABEL = 'Other Qualification (Specify / Rubuta Matsayin Karatu)';

export const QUALIFICATION_LEVELS = [
  'Doctorate / Ph.D. (Ph.D., D.Eng., D.Sc.)',
  'Master’s Degree (M.Sc., M.Eng., M.Tech, MBA, etc.)',
  'Postgraduate Diploma (PGD)',
  'Bachelor’s Degree (B.Eng., B.Sc., B.Tech, etc.)',
  'Higher National Diploma (HND)',
  'National Diploma / OND (ND / OND)',
  'Nigeria Certificate in Education (NCE)',
  'Full Technological Certificate (City & Guilds / FTC)',
  'NABTEB / National Technical Certificate (NTC / ANTC)',
  'Federal Trade Test (Grade I, II, III / Ministry of Labour)',
  'Senior Secondary Certificate (SSCE / WAEC / NECO / GCE)',
  OTHER_QUALIFICATION_LABEL
];

export const OTHER_COURSE_LABEL = 'Other Course / Field of Study (Specify / Rubuta Dakanka)';

export const COMMON_COURSES = [
  'Electrical & Electronics Engineering',
  'Electrical Installation & Maintenance Work',
  'Solar PV Installation & Renewable Energy',
  'CCTV Camera & Electronic Security Systems',
  'Satellite TV & Dish Installation (Setlite)',
  'Fire Alarm & Fire Protection Systems',
  'Electronics & Telecommunications Engineering',
  'Power & High Voltage Systems Engineering',
  'Computer Engineering',
  'Computer Science / Software Engineering / IT',
  'Mechanical Engineering',
  'Mechatronics & Robotics Engineering',
  'Civil & Structural Engineering',
  'Chemical / Petroleum Engineering',
  'Physics / Applied Physics with Electronics',
  'Industrial & Production Engineering',
  'Building Technology & Construction',
  'Technical & Vocational Education (Elect / Mech)',
  'Estate Management / Architecture',
  'Public Administration',
  'Business Administration & Management',
  OTHER_COURSE_LABEL
];

export const OTHER_OCCUPATION_LABEL = 'Other Profession / Occupation (Specify / Rubuta Dakanka)';

export const OCCUPATION_ROLES = [
  'Solar PV & Inverter Installation Specialist',
  'CCTV Camera & Security Systems Installer',
  'Satellite Dish & Cable TV Installer (Setlite)',
  'Fire Alarm & Safety Systems Technician',
  'Certified Electrical Wireman',
  'Electrical Engineer',
  'Electrical Contractor / Consultant',
  'Industrial Automation & Control Specialist',
  'High-Voltage Substation Technician',
  'Electrical Maintenance Technician',
  'Generator & Power Systems Specialist',
  'Building Electrical Installation Specialist',
  'Public Administrator / Policy & Administrative Officer',
  'Academic / Lecturer / Researcher',
  'Allied / Non-Electrical Engineering Specialist',
  'Project Engineer / Site Manager',
  'Technical Officer / Safety Inspector',
  'Student / Graduate Trainee',
  'Apprentice / Trainee',
  OTHER_OCCUPATION_LABEL
];

export const OTHER_SPECIALIZATION_LABEL = 'Other Technical Specialization (Specify / Rubuta Dakanka)';

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
  members,
  onRegister, 
  setCurrentView 
}) => {
  const [submittedMember, setSubmittedMember] = useState<Member | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionRegistrationId, setSessionRegistrationId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedAccNum, setCopiedAccNum] = useState(false);
  const [copiedAccName, setCopiedAccName] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [selectedPdfType, setSelectedPdfType] = useState<'slip' | 'biodata' | 'both'>('slip');
  const [showSlipModal, setShowSlipModal] = useState(false);

  const initialForm = {
    // 1. Personal
    fullName: '',
    gender: 'Male' as 'Male' | 'Female',
    dob: '',
    phone: '',
    altPhone: '',
    email: '',
    nationality: 'Nigerian',
    state: 'Kano',
    lga: '',
    address: '',
    passportUrl: '',
    // 2. Identification
    nin: '',
    membershipId: '',
    existingMembershipId: '',
    otherIdType: 'National Identification Number (NIN)',
    otherIdNumber: '',
    // 3. Education
    highestQualification: 'Bachelor’s Degree (B.Eng., B.Sc., B.Tech, etc.)',
    courseOfStudy: 'Electrical & Electronics Engineering',
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

  // Education & Professional Custom/Other states
  const isQualPredefined = QUALIFICATION_LEVELS.filter(q => q !== OTHER_QUALIFICATION_LABEL).includes(formData.highestQualification);
  const [qualSelectChoice, setQualSelectChoice] = useState<string>(() => {
    return isQualPredefined ? formData.highestQualification : OTHER_QUALIFICATION_LABEL;
  });

  const isCoursePredefined = COMMON_COURSES.filter(c => c !== OTHER_COURSE_LABEL).includes(formData.courseOfStudy);
  const [courseSelectChoice, setCourseSelectChoice] = useState<string>(() => {
    return isCoursePredefined ? formData.courseOfStudy : OTHER_COURSE_LABEL;
  });

  const isOccupationPredefined = OCCUPATION_ROLES.filter(r => r !== OTHER_OCCUPATION_LABEL).includes(formData.occupation);
  const [occupationSelectChoice, setOccupationSelectChoice] = useState<string>(() => {
    return isOccupationPredefined ? formData.occupation : OTHER_OCCUPATION_LABEL;
  });

  const isSpecPredefined = SPECIALIZATIONS.filter(s => s !== OTHER_SPECIALIZATION_LABEL).includes(formData.specialization);
  const [specSelectChoice, setSpecSelectChoice] = useState<string>(() => {
    return isSpecPredefined ? formData.specialization : OTHER_SPECIALIZATION_LABEL;
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
  const activeBank = bankAccounts.find(b => b.isActive) || (bankAccounts.length > 0 ? bankAccounts[0] : null) || (settings?.bankName && settings?.bankAccountNumber ? {
    id: 'active',
    bankName: settings.bankName,
    accountName: settings.bankAccountName || '',
    accountNumber: settings.bankAccountNumber,
    branch: '',
    paymentInstructions: settings.paymentInstructions
  } : null);

  const bankName = activeBank?.bankName || '';
  const bankAccountName = activeBank?.accountName || '';
  const bankAccountNumber = activeBank?.accountNumber || '';
  const isBankConfigured = Boolean(activeBank && bankName && bankAccountNumber);
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
    if (isSubmitting) return;
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

    const cleanNin = normalizeNin(formData.nin);
    if (!cleanNin || !isValidNin(cleanNin)) {
      setValidationError('Please enter a valid 11-digit National Identification Number (NIN).');
      return;
    }

    const cleanPhone = normalizePhone(formData.phone);
    if (!cleanPhone || !isValidPhone(formData.phone)) {
      setValidationError('Please enter a valid primary phone number (e.g. 0803 123 4567).');
      return;
    }

    // Optional Email Validation (Ba dole ba ne, amma idan an saka a tabbatar da ingancinsa)
    if (formData.email && formData.email.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(formData.email.trim())) {
        setValidationError('Please enter a valid email address (e.g. member@example.com) or leave it blank.');
        return;
      }
    }

    // Education & Professional validation
    const trimmedQual = formData.highestQualification?.trim();
    if (!trimmedQual || trimmedQual === OTHER_QUALIFICATION_LABEL) {
      setValidationError('Please select or specify your Highest Educational Qualification (matsayin karatunka).');
      return;
    }

    const trimmedCourse = formData.courseOfStudy?.trim();
    if (!trimmedCourse || trimmedCourse === OTHER_COURSE_LABEL) {
      setValidationError('Please select or specify your Course / Field of Study (fannin karatunka).');
      return;
    }

    if (!formData.institution || !formData.institution.trim()) {
      setValidationError('Please enter your Institution / School name.');
      return;
    }

    const trimmedOccupation = formData.occupation?.trim();
    if (!trimmedOccupation || trimmedOccupation === OTHER_OCCUPATION_LABEL) {
      setValidationError('Please select or specify your Current Occupation / Title (sana\'arka ko matsayin aiki).');
      return;
    }

    const trimmedSpec = formData.specialization?.trim();
    if (!trimmedSpec || trimmedSpec === OTHER_SPECIALIZATION_LABEL) {
      setValidationError('Please select or specify your Primary Specialization (fannin kwarewarka).');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    try {
      // 1. Authoritative pre-check against Supabase database for duplicate NIN or Phone across all member statuses
      const dupCheck = await checkMemberDuplicateInSupabase({ nin: cleanNin, phone: cleanPhone });
      if (dupCheck.isDuplicate) {
        setValidationError(DUPLICATE_REGISTRATION_MESSAGE);
        setIsSubmitting(false);
        return;
      }

      // Also check local loaded members in memory
      const hasDuplicateInCache = members?.some(m => {
        const mNin = normalizeNin(m.nin || m.ninNumber);
        const mPhone = normalizePhone(m.phone);
        return (cleanNin && mNin === cleanNin) || (cleanPhone && mPhone === cleanPhone);
      });
      if (hasDuplicateInCache) {
        setValidationError(DUPLICATE_REGISTRATION_MESSAGE);
        setIsSubmitting(false);
        return;
      }

      const defaultPassport = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400';
      const defaultReceipt = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600';

      const memberId = sessionRegistrationId || generateUUID();
      if (!sessionRegistrationId && memberId) {
        setSessionRegistrationId(memberId);
      }
      const refSuffix = Math.floor(100000 + Math.random() * 900000);
      const appRef = `APP-${new Date().getFullYear()}-${refSuffix}`;

      const memberEnteredId = (formData.membershipId || formData.existingMembershipId || '').trim().toUpperCase();

      const newMember: Member = {
        id: memberId,
        membershipId: memberEnteredId,
        existingMembershipId: memberEnteredId || undefined,
        requestedMembershipId: memberEnteredId || undefined,
        notes: memberEnteredId ? `[Member Entered ID: ${memberEnteredId}]` : undefined,
        applicationReference: appRef,
        fullName: formData.fullName.trim(),
        gender: formData.gender,
        dob: formData.dob,
        dateOfBirth: formData.dob,
        phone: cleanPhone,
        altPhone: formData.altPhone ? normalizePhone(formData.altPhone) : undefined,
        alternativePhone: formData.altPhone ? normalizePhone(formData.altPhone) : undefined,
        email: formData.email?.trim() ? formData.email.trim().toLowerCase() : undefined,
        nationality: formData.nationality?.trim() || 'Nigerian',
        nin: cleanNin,
        ninNumber: cleanNin,
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
          phone: normalizePhone(formData.nextOfKin.phone),
          altPhone: formData.nextOfKin.altPhone ? normalizePhone(formData.nextOfKin.altPhone) : undefined,
          address: formData.nextOfKin.address.trim()
        },
        status: 'pending',
        role: 'Member',
        position: 'Member',
        registeredAt: new Date().toISOString()
      };

      const result = await onRegister(newMember);
      const confirmed = (result && typeof result === 'object' && 'id' in result) ? result : newMember;
      if (confirmed && confirmed.id) {
        setSessionRegistrationId(confirmed.id);
      }

      try {
        sessionStorage.removeItem('nnepef_registration_draft_v2');
      } catch (e) {}

      setSubmittedMember(confirmed);
    } catch (err: any) {
      console.error('[MemberRegistration] Submission error:', err);
      const errMsg = String(err?.message || '');
      if (
        errMsg.includes('already registered') ||
        errMsg.includes('DUPLICATE') ||
        errMsg.includes('23505') ||
        errMsg.includes('duplicate key') ||
        errMsg.includes('unique')
      ) {
        setValidationError(DUPLICATE_REGISTRATION_MESSAGE);
      } else {
        setValidationError(err?.message || 'Failed to submit registration. Please verify database connection and retry.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadProfile = async () => {
    if (!submittedMember) return;
    setIsDownloadingPdf(true);
    try {
      if (selectedPdfType === 'slip') {
        await downloadRegistrationSlipImage(submittedMember, settings);
      } else if (selectedPdfType === 'biodata') {
        await downloadMemberDetailsImage(submittedMember, settings);
      } else if (selectedPdfType === 'both') {
        // Download both documents in sequence
        await downloadRegistrationSlipImage(submittedMember, settings);
        await new Promise(resolve => setTimeout(resolve, 600));
        await downloadMemberDetailsImage(submittedMember, settings);
      }
    } catch (e) {
      console.error('Image download error:', e);
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
                    title="Copy Reference Number"
                  >
                    {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {copiedRef && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                    Copied!
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

          {/* Action: Registration Download Select Box */}
          <div className="bg-slate-50 dark:bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label htmlFor="pdf-type-select" className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Zaɓi Takardar Rijista (Select Registration Document to Download) *</span>
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Zaɓi takardar da kake son saukewa (Official Slip ko Cikakken Fom din Bayanai)
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 w-fit">
                Official Document
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Select Element */}
              <div className="sm:col-span-7">
                <select
                  id="pdf-type-select"
                  value={selectedPdfType}
                  onChange={(e) => setSelectedPdfType(e.target.value as 'slip' | 'biodata' | 'both')}
                  className="w-full px-3.5 py-3 rounded-xl border-2 border-emerald-500/50 dark:border-emerald-500/40 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer shadow-xs"
                >
                  <option value="slip">
                    1. Official Registration Slip (Takardar Shaidar Rijista / Slip Image)
                  </option>
                  <option value="biodata">
                    2. Full Registration Form (Cikakken Fom ɗin Bayanan Mamba / Bio-Data Image)
                  </option>
                  <option value="both">
                    3. Download Both Documents (Zazzage Duka Biyu - Slip & Fom)
                  </option>
                </select>
              </div>

              {/* Download Action Button */}
              <div className="sm:col-span-5">
                <button
                  type="button"
                  onClick={handleDownloadProfile}
                  disabled={isDownloadingPdf}
                  className="w-full h-full min-h-[44px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-75 text-white font-bold text-xs shadow-md transition-all cursor-pointer whitespace-nowrap"
                  title="Download selected official document"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                  ) : (
                    <Download className="w-4 h-4 text-emerald-200" />
                  )}
                  <span>
                    {isDownloadingPdf
                      ? 'Downloading...'
                      : selectedPdfType === 'slip'
                        ? 'Download Slip'
                        : selectedPdfType === 'biodata'
                          ? 'Download Bio-Data Form'
                          : 'Download Both Documents'}
                  </span>
                </button>
              </div>
            </div>

            {/* Description note based on selection */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                {selectedPdfType === 'slip' && (
                  <span>
                    <strong>Official Registration Slip:</strong> Takardar shaida ce mai tambarin N-NEPEF, lambar aikace-aikace (Reference), lambar tantancewa (QR Code), da sa hannun Sakatare Janar. Wannan ce ainihin takardar shaidar neman mambanci.
                  </span>
                )}
                {selectedPdfType === 'biodata' && (
                  <span>
                    <strong>Full Registration Bio-Data Form:</strong> Cikakken fom ɗin rijista ne mai shafuka dake ɗauke da dukkanin bayanan karatunka, sana'arka, Next of Kin, da hoton shaidar biya.
                  </span>
                )}
                {selectedPdfType === 'both' && (
                  <span>
                    <strong>Duka Biyu (Both Documents):</strong> Tsarin zai sauke maka duka takardun biyu (Official Registration Slip tare da Full Bio-Data Form) a jere ba tare da bata lokaci ba.
                  </span>
                )}
              </div>
            </div>

            {/* Print Slip Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowSlipModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#0A2E73] hover:bg-sky-900 text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                title="Open and print the official slip preview directly"
              >
                <Printer className="w-4 h-4 text-[#2EA3F2]" />
                <span>Bude & Buga Takardar Slip (Print Official Slip Preview)</span>
              </button>
            </div>
          </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <button
                onClick={() => setCurrentView('verify')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verify Portal / Search Registry</span>
              </button>

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

          {/* Official Approval / Registration Slip Modal */}
          {showSlipModal && submittedMember && (
            <OfficialApprovalSlipModal
              member={submittedMember}
              settings={settings}
              onClose={() => setShowSlipModal(false)}
            />
          )}

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

            {/* Email Address (Optional / Ba Dole Ba) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Email Address <span className="text-slate-400 font-normal text-[11px]">(Optional / Ba Dole Ba)</span>
              </label>
              <input
                type="email"
                placeholder="e.g. member@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

            {/* Membership ID Number (Entered by Member) */}
            <div className="sm:col-span-2 lg:col-span-3 space-y-2 p-4 rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-gradient-to-r from-sky-50/70 to-blue-50/50 dark:from-sky-950/30 dark:to-blue-950/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Membership ID Number / Lambar Zama Mamba <span className="text-slate-500 dark:text-slate-400 font-normal text-[11px]">(Optional / Idan kana da ita ko wadda aka baka)</span>
                </label>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                  Visible to Admin in Member Information
                </span>
              </div>
              <input
                type="text"
                placeholder="Misali: NNEPEF/KN/2020/001 ko duk wata lambar memba da kake da ita"
                value={formData.membershipId || formData.existingMembershipId || ''}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setFormData({ ...formData, membershipId: val, existingMembershipId: val });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-sky-300 dark:border-sky-700/80 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-sky-500 outline-none uppercase shadow-xs"
              />
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Kuna iya shigar da lambar ku ta Membership ID da kanku a nan. Wannan lambar za ta fito ne kawai ga Admin a sashin <strong>Admin → Member Information</strong> domin dubawa, tantancewa, da kuma amincewa (Approved).
              </p>
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
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Highest Qualification <span className="text-red-500">*</span>
                </label>
                {qualSelectChoice === OTHER_QUALIFICATION_LABEL && (
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                    Custom Entry
                  </span>
                )}
              </div>
              <select
                value={qualSelectChoice}
                onChange={(e) => {
                  const val = e.target.value;
                  setQualSelectChoice(val);
                  if (val === OTHER_QUALIFICATION_LABEL) {
                    if (QUALIFICATION_LEVELS.includes(formData.highestQualification)) {
                      setFormData(prev => ({ ...prev, highestQualification: '' }));
                    }
                  } else {
                    setFormData(prev => ({ ...prev, highestQualification: val }));
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              >
                {QUALIFICATION_LEVELS.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>

              {/* Custom Qualification Input when "Other" is chosen */}
              {qualSelectChoice === OTHER_QUALIFICATION_LABEL && (
                <div className="space-y-1 mt-2 pt-2 border-t border-sky-100 dark:border-sky-900/60 animate-fadeIn">
                  <label className="block text-[11px] font-bold text-sky-700 dark:text-sky-300">
                    Specify Your Qualification (Rubuta Matsayin Karatunka) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ph.D. Engineering, Executive Master's, PGD, etc."
                    value={formData.highestQualification === OTHER_QUALIFICATION_LABEL ? '' : formData.highestQualification}
                    onChange={(e) => setFormData(prev => ({ ...prev, highestQualification: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border-2 border-sky-400 dark:border-sky-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Rubuta cikakken matsayin karatunka idan baya cikin jerin da ke sama.
                  </p>
                </div>
              )}
            </div>

            {/* Course of Study */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Course / Field of Study <span className="text-red-500">*</span>
                </label>
                {courseSelectChoice === OTHER_COURSE_LABEL && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    Non-Electrical / Custom
                  </span>
                )}
              </div>
              <select
                value={courseSelectChoice}
                onChange={(e) => {
                  const val = e.target.value;
                  setCourseSelectChoice(val);
                  if (val === OTHER_COURSE_LABEL) {
                    if (COMMON_COURSES.includes(formData.courseOfStudy)) {
                      setFormData(prev => ({ ...prev, courseOfStudy: '' }));
                    }
                  } else {
                    setFormData(prev => ({ ...prev, courseOfStudy: val }));
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              >
                {COMMON_COURSES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Custom Course Input when "Other" is chosen */}
              {courseSelectChoice === OTHER_COURSE_LABEL && (
                <div className="space-y-1 mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-900/60 animate-fadeIn">
                  <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                    Specify Your Course / Field of Study (Rubuta Fannin Karatunka) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mechanical Engineering, Physics, Accounting, Economics, etc."
                    value={formData.courseOfStudy === OTHER_COURSE_LABEL ? '' : formData.courseOfStudy}
                    onChange={(e) => setFormData(prev => ({ ...prev, courseOfStudy: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border-2 border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Rubuta kowani fannin karatu da kayi ko da ba na electrical ba ne.
                  </p>
                </div>
              )}
            </div>

            {/* Institution */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Institution / School <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Bayero University Kano / Kaduna Poly / ABU Zaria"
                value={formData.institution}
                onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, graduationYear: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Other Additional Qualifications / Accreditations */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Other Qualifications / Accreditations (Karatun Kari)
              </label>
              <input
                type="text"
                placeholder="e.g. PGD Energy Studies, Advanced Diploma in IT"
                value={formData.otherQualifications || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, otherQualifications: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>

            {/* Professional Certificates */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Professional Certificates (NSE, COREN, NEMSA, etc.)
              </label>
              <input
                type="text"
                placeholder="e.g. COREN Reg: R-54321 / NEMSA Certified Wireman / IEEE"
                value={formData.professionalCertificates}
                onChange={(e) => setFormData(prev => ({ ...prev, professionalCertificates: e.target.value }))}
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
                Electrical &amp; Engineering Professional Profile
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Industry occupation, specialization, and experience
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Occupation */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Current Occupation / Title <span className="text-red-500">*</span>
                </label>
                {occupationSelectChoice === OTHER_OCCUPATION_LABEL && (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                    Custom Title
                  </span>
                )}
              </div>
              <select
                value={occupationSelectChoice}
                onChange={(e) => {
                  const val = e.target.value;
                  setOccupationSelectChoice(val);
                  if (val === OTHER_OCCUPATION_LABEL) {
                    if (OCCUPATION_ROLES.includes(formData.occupation)) {
                      setFormData(prev => ({ ...prev, occupation: '' }));
                    }
                  } else {
                    setFormData(prev => ({ ...prev, occupation: val }));
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              >
                {OCCUPATION_ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>

              {/* Custom Occupation Input when "Other" is chosen */}
              {occupationSelectChoice === OTHER_OCCUPATION_LABEL && (
                <div className="space-y-1 mt-2 pt-2 border-t border-amber-100 dark:border-amber-900/60 animate-fadeIn">
                  <label className="block text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    Specify Your Occupation / Title (Rubuta Sana'arka / Matsayin Aikinka) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mechanical Project Engineer, Energy Auditor, etc."
                    value={formData.occupation === OTHER_OCCUPATION_LABEL ? '' : formData.occupation}
                    onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Specialization */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Primary Specialization <span className="text-red-500">*</span>
                </label>
                {specSelectChoice === OTHER_SPECIALIZATION_LABEL && (
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                    Custom Specialization
                  </span>
                )}
              </div>
              <select
                value={specSelectChoice}
                onChange={(e) => {
                  const val = e.target.value;
                  setSpecSelectChoice(val);
                  if (val === OTHER_SPECIALIZATION_LABEL) {
                    if (SPECIALIZATIONS.includes(formData.specialization)) {
                      setFormData(prev => ({ ...prev, specialization: '' }));
                    }
                  } else {
                    setFormData(prev => ({ ...prev, specialization: val }));
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-sky-500 outline-none"
              >
                {SPECIALIZATIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Custom Specialization Input when "Other" is chosen */}
              {specSelectChoice === OTHER_SPECIALIZATION_LABEL && (
                <div className="space-y-1 mt-2 pt-2 border-t border-purple-100 dark:border-purple-900/60 animate-fadeIn">
                  <label className="block text-[11px] font-bold text-purple-700 dark:text-purple-300">
                    Specify Your Specialization (Rubuta Fannin Kwarewarka) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HVAC Systems, Electro-Mechanical Automation, etc."
                    value={formData.specialization === OTHER_SPECIALIZATION_LABEL ? '' : formData.specialization}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border-2 border-purple-400 dark:border-purple-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              )}
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
          {isBankConfigured ? (
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
          ) : (
            <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 space-y-3 shadow-md border border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <h4 className="font-display font-bold text-sm text-amber-300">
                  Payment Account Not Yet Configured
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Official payment bank details have not yet been configured by the Administrator. If you have made payment through official state chapter arrangements, you may still upload your payment teller or receipt below. Otherwise, please contact the Administrator for payment guidance.
              </p>
            </div>
          )}

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
