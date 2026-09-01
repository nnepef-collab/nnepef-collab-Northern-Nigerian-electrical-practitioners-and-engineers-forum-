import React, { useState } from 'react';
import { Logo } from './Logo';
import { OFFICIAL_NNEPEF_LOGO } from '../constants/logo';
import { 
  ShieldCheck, 
  UserPlus, 
  Zap, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Calendar, 
  Clock, 
  MapPin, 
  Newspaper, 
  Send, 
  Users, 
  Building2, 
  FileText, 
  Sparkles,
  Phone,
  Mail,
  HelpCircle,
  Copy,
  Check,
  Coins,
  Receipt,
  CreditCard
} from 'lucide-react';
import { Member, Executive, NewsArticle, EventItem, Announcement, GalleryAlbum, ForumSettings } from '../types';

interface PublicHomeProps {
  setCurrentView: (view: string) => void;
  executives: Executive[];
  news: NewsArticle[];
  events: EventItem[];
  announcements: Announcement[];
  gallery: GalleryAlbum[];
  members: Member[];
  settings?: ForumSettings;
}

export const PublicHome: React.FC<PublicHomeProps> = ({
  setCurrentView,
  executives,
  news,
  events,
  announcements,
  gallery,
  members,
  settings,
}) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [execTier, setExecTier] = useState<'national' | 'state' | 'lga'>('national');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [copiedAccNum, setCopiedAccNum] = useState(false);
  const [copiedAccName, setCopiedAccName] = useState(false);

  const bankAccounts = settings?.bankAccounts || [];
  const activeBank = bankAccounts.find(b => b.isActive) || bankAccounts[0] || (settings?.bankName ? {
    id: 'active',
    bankName: settings.bankName,
    accountName: settings.bankAccountName || '',
    accountNumber: settings.bankAccountNumber || '',
    branch: '',
    paymentInstructions: settings.paymentInstructions
  } : null);

  const bankName = activeBank?.bankName || '';
  const bankAccountName = activeBank?.accountName || '';
  const bankAccountNumber = activeBank?.accountNumber || '';
  const bankBranch = activeBank?.branch || '';
  const bankInstructions = activeBank?.paymentInstructions || settings?.paymentInstructions || 'Pay via Bank Transfer or Deposit. Include your full name or ID as payment memo, then upload receipt.';

  const copyToClipboard = (text: string, type: 'num' | 'name') => {
    navigator.clipboard.writeText(text);
    if (type === 'num') {
      setCopiedAccNum(true);
      setTimeout(() => setCopiedAccNum(false), 2500);
    } else {
      setCopiedAccName(true);
      setTimeout(() => setCopiedAccName(false), 2500);
    }
  };
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactForm({ name: '', email: '', phone: '', subject: '', message: '' });
    }, 4000);
  };

  const faqs = settings?.faqs && settings.faqs.length > 0 
    ? settings.faqs.map(f => ({ q: f.question, a: f.answer })) 
    : [
    {
      q: 'What is N-NEPEF 2020 and who can join?',
      a: 'N-NEPEF (Northern Nigerian Electrical Practitioners & Engineers Forum) is the apex body for electrical engineers, power technologists, technicians, contractors, and safety inspectors operating across the 19 Northern States of Nigeria. Anyone with electrical qualifications or practicing experience can apply for membership.'
    },
    {
      q: 'How do I obtain my official N-NEPEF Membership status?',
      a: 'After completing the online registration form and uploading your required documents and payment receipt, your application is submitted for Admin verification. Once reviewed and approved by Super Admin, your membership becomes active and can be verified publicly on our Verify Member page.'
    },
    {
      q: 'How can the public verify if an electrical practitioner is approved by N-NEPEF?',
      a: 'Use our public "Verify Member" tool on this website. Simply enter the engineer\'s Name or Membership ID. Only active, approved members will be displayed along with their specialization and position, strictly protecting sensitive personal data like NIN or phone numbers.'
    },
    {
      q: 'What are the benefits of N-NEPEF membership?',
      a: 'Members receive official professional certification badges, access to state safety code audits, technical summit registration discounts, direct listing on the public verification database, state chapter networking, and legal/regulatory advocacy.'
    }
  ];

  const approvedMembersCount = members.filter(m => m.status === 'approved').length;

  return (
    <div className="space-y-16 lg:space-y-24 pb-12">
      
      {/* 1. HERO SECTION WITH WELCOME BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0A2E73] via-[#08245A] to-[#05193C] text-white pt-12 pb-20 lg:pt-16 lg:pb-28">
        {/* Background circuit lines pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#2EA3F2_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Main Centered Homepage Header Block */}
          <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto mb-10 sm:mb-14 space-y-4 sm:space-y-5">
            
            {/* Organization Logo */}
            <div className="relative group cursor-pointer" onClick={() => setCurrentView('home')}>
              <img 
                src={settings?.logoUrl && settings.logoUrl.trim() !== '' && settings.logoUrl !== '/logo.png' ? settings.logoUrl : OFFICIAL_NNEPEF_LOGO} 
                alt="N-NEPEF 2020 Logo" 
                className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 lg:w-48 lg:h-48 object-contain relative z-10 transition-transform duration-300 group-hover:scale-105"
                style={{
                  filter: 'none',
                  WebkitFilter: 'none',
                  mixBlendMode: 'normal',
                  opacity: 1,
                  forcedColorAdjust: 'none'
                }}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== OFFICIAL_NNEPEF_LOGO) {
                    target.src = OFFICIAL_NNEPEF_LOGO;
                  }
                }}
              />
            </div>

            {/* "NNEPEF 2020" Title directly below the logo with appropriate spacing */}
            <div className="pt-2 sm:pt-3 space-y-2">
              <h1 className="font-display font-extrabold text-3xl sm:text-5xl md:text-6xl tracking-tight leading-none text-white drop-shadow-lg">
                NNEPEF <span className="text-[#2EA3F2]">2020</span>
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-sky-200 font-semibold uppercase tracking-widest max-w-2xl mx-auto pt-1">
                Northern Nigerian Electrical Practitioners &amp; Engineers Forum
              </p>
            </div>

            {/* Welcome Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sky-300 text-xs sm:text-sm font-semibold mt-1">
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span>Official Northern Nigeria Electrical Engineering Portal</span>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center border-t border-white/10 pt-10">
            
            {/* Left Headline & Subtitle */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight text-white">
                Empowering Electrical Excellence &amp; Safety Across <span className="text-[#2EA3F2]">Northern Nigeria</span>
              </h2>
              
              <p className="text-slate-200 text-sm sm:text-base max-w-2xl font-normal leading-relaxed">
                {settings?.heroSubtitle || 'Northern Nigerian Electrical Practitioners & Engineers Forum (N-NEPEF 2020) provides professional accreditation, electrical safety code enforcement, state chapter collaboration, and power sector innovation.'}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => setCurrentView('register')}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#2EA3F2] text-slate-950 font-bold text-sm hover:bg-sky-400 transition-all shadow-lg hover:shadow-sky-500/25 active:scale-95"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>{settings?.heroCtaButtonText || 'Apply for Membership'}</span>
                </button>

                <button
                  onClick={() => setCurrentView('verify')}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 backdrop-blur-md text-white font-bold text-sm border border-white/25 hover:bg-white/20 transition-all active:scale-95"
                >
                  <ShieldCheck className="w-5 h-5 text-sky-400" />
                  <span>{settings?.heroSecondaryButtonText || 'Public Member Verification'}</span>
                </button>
              </div>

              {/* Quick Stat Bar */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
                <div className="text-center lg:text-left">
                  <div className="font-display font-extrabold text-2xl sm:text-3xl text-sky-300">19</div>
                  <div className="text-xs text-slate-300 font-medium">Northern States</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="font-display font-extrabold text-2xl sm:text-3xl text-sky-300">2,500+</div>
                  <div className="text-xs text-slate-300 font-medium">Certified Practitioners</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="font-display font-extrabold text-2xl sm:text-3xl text-sky-300">100%</div>
                  <div className="text-xs text-slate-300 font-medium">Public Verified</div>
                </div>
              </div>
            </div>

            {/* Right Card / Official Portal Status Badge */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md bg-white/10 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/20 shadow-2xl text-center space-y-5">
                <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-3xl bg-gradient-to-tr from-[#0A2E73] via-[#2EA3F2] to-sky-400 p-0.5 shadow-2xl flex items-center justify-center relative group">
                  <div className="w-full h-full bg-[#05193C] rounded-[22px] flex items-center justify-center text-[#2EA3F2] transition-transform duration-300 group-hover:scale-105">
                    <ShieldCheck className="w-12 h-12 sm:w-14 sm:h-14 text-sky-400 animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-extrabold text-[9px] uppercase tracking-wider shadow-md">
                    VERIFIED
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="font-display font-bold text-xl sm:text-2xl text-white">NNEPEF <span className="text-[#2EA3F2]">2020</span> Portal</h3>
                  <p className="text-xs text-slate-300">
                    Official Central Portal for Membership Registration, Public Verification, Event Registrations, and Super Admin Governance.
                  </p>
                </div>

                <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-semibold text-sky-300">Public Status:</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">ONLINE</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-semibold">Active Members:</span>
                    <span>{approvedMembersCount} Approved Profiles</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-semibold">Verification System:</span>
                    <span className="text-emerald-400 font-bold">Active &amp; Secure</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. ANNOUNCEMENTS MARQUEE / TICKER */}
      {announcements.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0A2E73] dark:text-sky-300 uppercase tracking-wider bg-sky-200 dark:bg-sky-900 px-3 py-1.5 rounded-lg flex-shrink-0">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Official Bulletin:</span>
            </div>
            <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium flex-1">
              {announcements[0].title} — <span className="text-slate-600 dark:text-slate-400">{announcements[0].content}</span>
            </div>
            <button
              onClick={() => setCurrentView('news')}
              className="text-xs font-bold text-[#0A2E73] dark:text-sky-400 hover:underline flex-shrink-0"
            >
              View Bulletins →
            </button>
          </div>
        </section>
      )}

      {/* 3. ABOUT N-NEPEF, MISSION, VISION, OBJECTIVES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold text-[#2EA3F2] uppercase tracking-widest">About Our Forum</span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Unifying Electrical Science &amp; Engineering Across Northern Nigeria
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm">
            Founded in 2020, N-NEPEF is dedicated to raising electrical installation standards, safeguarding lives, and advancing power infrastructure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Mission */}
          <div className="glass-card p-8 rounded-2xl space-y-4 hover:border-[#2EA3F2] transition-all group">
            <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-[#0A2E73] dark:text-[#2EA3F2] group-hover:bg-[#0A2E73] group-hover:text-white transition-colors">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">Our Mission</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              To promote rigorous electrical code compliance, continuous professional capacity building, and collaborative technological solutions for reliable power distribution across Northern Nigeria.
            </p>
          </div>

          {/* Vision */}
          <div className="glass-card p-8 rounded-2xl space-y-4 hover:border-[#2EA3F2] transition-all group">
            <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-[#0A2E73] dark:text-[#2EA3F2] group-hover:bg-[#0A2E73] group-hover:text-white transition-colors">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">Our Vision</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              To be the leading, authoritative authority in electrical engineering practice, renewable energy adoption, and electrical fire safety standards in Northern Nigeria.
            </p>
          </div>

          {/* Objectives */}
          <div className="glass-card p-8 rounded-2xl space-y-4 hover:border-[#2EA3F2] transition-all group">
            <div className="w-12 h-12 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-[#0A2E73] dark:text-[#2EA3F2] group-hover:bg-[#0A2E73] group-hover:text-white transition-colors">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">Core Objectives</h3>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Verify and accredit electrical practitioners across 19 Northern states.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Eliminate quackery and sub-standard electrical wiring in public buildings.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>Foster solar PV and off-grid mini-grid energy expansion.</span>
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* 4.5 PUBLISHED REGISTRATION FEE & OFFICIAL BANK ACCOUNT DETAILS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-[#0A2E73] via-[#08245A] to-slate-900 text-white p-8 sm:p-12 rounded-3xl border-2 border-[#2EA3F2]/40 shadow-2xl space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-400/30">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Official Published Financial Policy</span>
              </div>
              <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
                Registration Fees &amp; Official Secretariat Account
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                N-NEPEF 2020 maintains full financial transparency. All payments must be made directly into our official secretariat bank account. Keep your transaction teller / receipt for upload during registration.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentView('register')}
                className="px-6 py-3.5 rounded-2xl bg-[#2EA3F2] text-slate-950 font-extrabold text-xs hover:bg-sky-400 transition-all shadow-lg flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Proceed to Member Registration</span>
              </button>
            </div>
          </div>

          {/* Grid layout for Account Details & Fee Schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Bank Card Box */}
            <div className="lg:col-span-6 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-[#2EA3F2]" />
                  <span className="font-bold text-sm text-sky-200 uppercase tracking-wider">Official Bank Account</span>
                </div>
                {bankName ? (
                  <span className="text-xs bg-amber-400/20 text-amber-300 font-bold px-3 py-1 rounded-full border border-amber-400/30">
                    {bankName}
                  </span>
                ) : null}
              </div>

              {!activeBank || !bankName || !bankAccountNumber ? (
                <div className="p-8 text-center bg-slate-950/80 rounded-2xl border border-rose-500/30 text-rose-300 text-xs font-bold space-y-2">
                  <p>No payment account has been configured. Please contact the Administrator.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Bank Name</span>
                      <span className="font-display font-bold text-base text-white">{bankName}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Account Name</span>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="font-display font-extrabold text-xs sm:text-sm text-sky-200 leading-snug">{bankAccountName}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(bankAccountName, 'name')}
                          className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sky-300 transition-colors flex-shrink-0"
                          title="Copy Account Name"
                        >
                          {copiedAccName ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Account Number</span>
                      <div className="flex items-center justify-between gap-3 mt-1">
                        <span className="font-mono font-extrabold text-2xl sm:text-3xl text-amber-300 tracking-widest">{bankAccountNumber}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(bankAccountNumber, 'num')}
                          className="px-3.5 py-2 rounded-xl bg-[#2EA3F2] text-slate-950 font-bold text-xs hover:bg-sky-400 transition-colors flex items-center gap-1.5 shadow"
                        >
                          {copiedAccNum ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-950" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copy Number</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {bankBranch ? (
                      <div className="pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Branch</span>
                        <span className="text-xs text-slate-200 font-medium">{bankBranch}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-xl text-xs text-slate-300 leading-relaxed border border-slate-800">
                    <span className="font-bold text-sky-300 block mb-0.5">Payment Instructions:</span>
                    {bankInstructions}
                  </div>
                </>
              )}
            </div>

            {/* Fee Schedule Categories */}
            <div className="lg:col-span-6 bg-white/5 p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-bold text-sm text-sky-200 uppercase tracking-wider flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-400" />
                  <span>Approved Fee Schedule</span>
                </span>
                <span className="text-xs text-emerald-400 font-bold">2026/2027 Schedule</span>
              </div>

              <div className="space-y-3">
                {settings?.feeCategories && settings.feeCategories.length > 0 ? (
                  settings.feeCategories.map((fee) => (
                    <div key={fee.id} className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-white text-xs sm:text-sm">{fee.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{fee.description}</div>
                      </div>
                      <div className="font-mono font-extrabold text-base text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-800/60 flex-shrink-0">
                        ₦{fee.amount.toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs sm:text-sm">New Membership Registration Fee</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">One-time registration &amp; credential audit</div>
                      </div>
                      <div className="font-mono font-extrabold text-base text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-800/60">
                        ₦25,000
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs sm:text-sm">Membership Annual Renewal Dues</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Annual practicing license validation</div>
                      </div>
                      <div className="font-mono font-extrabold text-base text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-800/60">
                        ₦15,000
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white text-xs sm:text-sm">Digital Smart ID Card Renewal Fee</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Upgraded plastic smart ID card</div>
                      </div>
                      <div className="font-mono font-extrabold text-base text-emerald-400 bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-800/60">
                        ₦10,000
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 5. EXECUTIVE LEADERSHIP COUNCIL */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-[#2EA3F2] uppercase tracking-widest">Official Governance</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Leadership Directory
            </h2>
          </div>

          {/* Tier Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-300 dark:border-slate-800 text-xs font-bold self-start sm:self-auto">
            <button
              onClick={() => setExecTier('national')}
              className={`px-4 py-2 rounded-xl transition-all ${
                execTier === 'national' 
                  ? 'bg-[#0A2E73] text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              National Council
            </button>
            <button
              onClick={() => setExecTier('state')}
              className={`px-4 py-2 rounded-xl transition-all ${
                execTier === 'state' 
                  ? 'bg-[#0A2E73] text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              State Council
            </button>
            <button
              onClick={() => setExecTier('lga')}
              className={`px-4 py-2 rounded-xl transition-all ${
                execTier === 'lga' 
                  ? 'bg-[#0A2E73] text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              LGA Council
            </button>
          </div>
        </div>

        {/* Display filtered executives */}
        {(() => {
          const filteredExecs = executives
            .filter(e => e.tier === execTier && e.active !== false)
            .sort((a, b) => (a.order || 99) - (b.order || 99));

          if (filteredExecs.length === 0) {
            return (
              <div className="p-8 text-center bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                No active executive officers published in this directory tier yet.
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredExecs.map((exec) => (
                <div key={exec.id} className="glass-card p-6 rounded-3xl text-center space-y-4 hover:border-[#2EA3F2] transition-all relative">
                  <img 
                    src={exec.photoUrl} 
                    alt={exec.name} 
                    className="w-24 h-24 rounded-2xl mx-auto object-cover border-4 border-[#2EA3F2] shadow-md"
                  />
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-sky-600 uppercase tracking-widest block">
                      {exec.tier === 'national' ? 'National' : exec.tier === 'state' ? `${exec.state || ''} State` : `${exec.lga || ''} LGA (${exec.state || ''})`}
                    </span>
                    <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">{exec.name}</h4>
                    <p className="text-xs font-extrabold text-[#2EA3F2]">{exec.position}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Term: {exec.term}</p>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed">{exec.bio}</p>
                </div>
              ))}
            </div>
          );
        })()}
      </section>

      {/* 6. UPCOMING EVENTS & NEWS PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Events Left Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-6 h-6 text-[#2EA3F2]" />
                <span>Upcoming Events</span>
              </h3>
              <button onClick={() => setCurrentView('events')} className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">
                View All Events →
              </button>
            </div>

            <div className="space-y-4">
              {events.map((ev) => (
                <div key={ev.id} className="glass-card p-6 rounded-2xl space-y-3 hover:border-sky-400 transition-all">
                  <div className="flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {ev.date} ({ev.time})
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                      {ev.state}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">{ev.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{ev.description}</p>
                  
                  <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-200 dark:border-slate-800">
                    <span className="flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-[#2EA3F2]" />
                      {ev.location}
                    </span>
                    <button
                      onClick={() => setCurrentView('events')}
                      className="px-3 py-1.5 rounded-lg bg-[#0A2E73] text-white font-bold text-xs hover:bg-sky-600 transition-colors"
                    >
                      RSVP ({ev.rsvpCount} Attending)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* News Right Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-white flex items-center gap-2">
                <Newspaper className="w-6 h-6 text-[#2EA3F2]" />
                <span>Latest News &amp; Articles</span>
              </h3>
              <button onClick={() => setCurrentView('news')} className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">
                View All News →
              </button>
            </div>

            <div className="space-y-4">
              {news.map((n) => (
                <div key={n.id} className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center hover:border-sky-400 transition-all">
                  <img src={n.imageUrl} alt="" className="w-full sm:w-28 h-24 rounded-xl object-cover flex-shrink-0" />
                  <div className="space-y-1 text-left flex-1">
                    <span className="text-[10px] font-bold text-[#2EA3F2] uppercase tracking-wider">{n.category} • {n.date}</span>
                    <h4 className="font-display font-bold text-sm text-slate-900 dark:text-white line-clamp-2">{n.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{n.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 7. GALLERY PREVIEW */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">Media</span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold">Photo &amp; Activity Gallery</h2>
            </div>
            <button onClick={() => setCurrentView('gallery')} className="text-xs font-bold text-sky-400 hover:underline">
              Explore All Albums →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gallery.map((alb) => (
              <div key={alb.id} onClick={() => setCurrentView('gallery')} className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-video shadow-lg">
                <img src={alb.coverUrl} alt={alb.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent p-6 flex flex-col justify-end">
                  <span className="text-[10px] font-bold text-sky-300 uppercase">{alb.category} • {alb.date}</span>
                  <h4 className="font-display font-bold text-base text-white">{alb.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. PARTNERS & INSTITUTIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Collaborating Energy &amp; Regulatory Partners</span>
        <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-12 opacity-80 dark:opacity-90">
          <div className="font-display font-extrabold text-sm sm:text-base text-slate-700 dark:text-slate-300 tracking-wider">
            NIGERIAN SOCIETY OF ENGINEERS (NSE)
          </div>
          <div className="font-display font-extrabold text-sm sm:text-base text-slate-700 dark:text-slate-300 tracking-wider">
            COREN ACCREDITED
          </div>
          <div className="font-display font-extrabold text-sm sm:text-base text-slate-700 dark:text-slate-300 tracking-wider">
            TCN TRANSMISSION GRID
          </div>
          <div className="font-display font-extrabold text-sm sm:text-base text-slate-700 dark:text-slate-300 tracking-wider">
            KEDCO &amp; KAEDCO UTILITIES
          </div>
        </div>
      </section>

      {/* 9. FAQ ACCORDION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-[#2EA3F2] uppercase tracking-widest">Help Center</span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="glass-card rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 font-display font-bold text-sm text-slate-900 dark:text-white"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#2EA3F2] flex-shrink-0" />
                  {faq.q}
                </span>
                {openFaq === idx ? <ChevronUp className="w-5 h-5 text-[#2EA3F2]" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/50 dark:border-slate-800 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 10. CONTACT US FORM & SECRETARIAT DETAILS */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Secretariat Official Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-start gap-4 hover:border-[#2EA3F2] transition-all shadow-md">
            <div className="p-3 bg-[#0A2E73] text-white rounded-2xl flex-shrink-0 shadow">
              <MapPin className="w-6 h-6 text-[#2EA3F2]" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-[#2EA3F2] uppercase tracking-wider block">Headquarters</span>
              <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">Head Office Address</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                No. 2, Gwarzo Road, Opposite Rijiyar Zaki Bus Stop, Kano State, Nigeria.
              </p>
            </div>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-start gap-4 hover:border-[#2EA3F2] transition-all shadow-md">
            <div className="p-3 bg-[#0A2E73] text-white rounded-2xl flex-shrink-0 shadow">
              <Phone className="w-6 h-6 text-[#2EA3F2]" />
            </div>
            <div className="space-y-1 flex-1">
              <span className="text-[10px] font-bold text-[#2EA3F2] uppercase tracking-wider block">Helplines</span>
              <h4 className="font-display font-bold text-base text-slate-900 dark:text-white">Official Phone Numbers</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 pt-1">
                <a href="tel:+2349063435546" className="hover:text-[#2EA3F2] transition-colors">+234 906 343 5546</a>
                <a href="tel:+2348030559938" className="hover:text-[#2EA3F2] transition-colors">+234 803 055 9938</a>
                <a href="tel:+2348133771460" className="hover:text-[#2EA3F2] transition-colors">+234 813 377 1460</a>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-8 shadow-xl">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-[#2EA3F2] uppercase tracking-widest">Get In Touch</span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Contact Secretariat
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Have questions regarding membership, verification, or chapter events? Send us a direct message.
            </p>
          </div>

          {contactSubmitted ? (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-800 dark:text-emerald-200 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-lg">Message Delivered Successfully!</h4>
              <p className="text-xs">Thank you. The N-NEPEF Secretariat will review your inquiry and respond promptly.</p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="Engr. Sani Kano"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2EA3F2] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="engineer@gmail.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2EA3F2] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number</label>
                  <input
                    type="text"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="+234 803 000 0000"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2EA3F2] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject</label>
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    placeholder="Membership / Event Inquiry"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2EA3F2] outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Message *</label>
                <textarea
                  rows={4}
                  required
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="Type your message here..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#2EA3F2] outline-none resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#0A2E73] text-white font-bold text-sm hover:bg-[#08245A] transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Send className="w-4 h-4 text-[#2EA3F2]" />
                <span>Submit Message to Secretariat</span>
              </button>
            </form>
          )}
        </div>
      </section>

    </div>
  );
};
