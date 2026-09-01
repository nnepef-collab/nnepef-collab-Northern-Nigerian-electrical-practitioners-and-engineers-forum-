import { 
  Member, 
  Executive, 
  NewsArticle, 
  EventItem, 
  Announcement, 
  PaymentRecord, 
  DocumentItem, 
  GalleryAlbum, 
  ContactMessage, 
  AuditLog, 
  ForumSettings,
  NotificationItem,
  RenewalRequest,
  FeeCategory,
  NotificationDeliveryLog,
  AdminAccount,
  CMSFile
} from '../types';

export const NORTHERN_STATES = [
  'Kano', 'Kaduna', 'Katsina', 'Sokoto', 'Borno', 
  'Adamawa', 'Bauchi', 'Jigawa', 'Niger', 'Plateau', 
  'Nasarawa', 'Kwara', 'Taraba', 'Yobe', 'Kebbi', 
  'Zamfara', 'Gombe', 'Benue', 'FCT Abuja'
];

export const SPECIALIZATIONS = [
  'Power Systems & Smart Grid Engineering',
  'Renewable Energy & Solar PV Installation',
  'High Voltage Transmission & Distribution',
  'Industrial Electrical Automation & Controls',
  'Building Electrical Systems & Lighting Design',
  'Electrical Safety, Code Inspection & Auditing',
  'Transformer Maintenance & Substation Design',
  'Telecommunications & SCADA Networks'
];

export const initialMembers: Member[] = [];

export const initialExecutives: Executive[] = [
  {
    id: 'e-1',
    name: 'Engr. Dr. Kabir Muhammad Kano',
    position: 'National Chairman',
    tier: 'national',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300',
    email: 'kabir.kano@nepef.org.ng',
    phone: '+234 803 123 4567',
    bio: 'Fellow of the Nigerian Society of Engineers with over 18 years in power grid modernization across Northern Nigeria.',
    term: '2024 - 2026',
    order: 1,
    active: true
  },
  {
    id: 'e-2',
    name: 'Engr. Fatima Bello Garba',
    position: 'National Vice Chairperson',
    tier: 'national',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
    email: 'fatima.bello@nepef.org.ng',
    phone: '+234 802 987 6543',
    bio: 'Renowned expert in off-grid solar mini-grids, advancing rural electrification projects in Kaduna, Kano, and Jigawa.',
    term: '2024 - 2026',
    order: 2,
    active: true
  },
  {
    id: 'e-3',
    name: 'Engr. Alhassan Abubakar',
    position: 'General Secretary',
    tier: 'national',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
    email: 'alhassan.a@nepef.org.ng',
    phone: '+234 806 555 1212',
    bio: 'Grid reliability strategist driving regulatory compliance, membership standards, and technical publications.',
    term: '2024 - 2026',
    order: 3,
    active: true
  },
  {
    id: 'e-4',
    name: 'Engr. Usman Ibrahim Katsina',
    position: 'Katsina State Chairman',
    tier: 'state',
    state: 'Katsina',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300',
    email: 'usman.kt@yahoo.com',
    phone: '+234 813 444 8899',
    bio: 'Pioneer of community electrical safety codes and state chapter empowerment programs in Katsina state.',
    term: '2025 - 2027',
    order: 1,
    active: true
  },
  {
    id: 'e-5',
    name: 'Engr. Salisu Aliyu Kano',
    position: 'Kano State Chairman',
    tier: 'state',
    state: 'Kano',
    photoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=300',
    email: 'salisu.kano@nepef.org.ng',
    phone: '+234 803 777 9900',
    bio: 'Leading electrical safety auditor and state chapter coordinator managing local government council integration in Kano.',
    term: '2024 - 2026',
    order: 2,
    active: true
  },
  {
    id: 'e-6',
    name: 'Engr. Rabiu Bello Municipal',
    position: 'Kano Municipal LGA Executive Chairman',
    tier: 'lga',
    state: 'Kano',
    lga: 'Kano Municipal',
    photoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300',
    email: 'rabiu.lga@nepef.org.ng',
    phone: '+234 805 111 2233',
    bio: 'Grassroots LGA engineering leader overseeing transformer maintenance and artisan certification in Kano Municipal.',
    term: '2025 - 2027',
    order: 1,
    active: true
  }
];

export const initialNews: NewsArticle[] = [
  {
    id: 'n-1',
    title: 'N-NEPEF Unveils Northern Solar Mini-Grid Masterplan at 2026 Energy Forum',
    category: 'Engineering',
    summary: 'A comprehensive technical blueprint aimed at deploying 120MW of decentralized solar power across rural farming clusters in Northern Nigeria.',
    content: 'The Northern Nigerian Electrical Practitioners & Engineers Forum (N-NEPEF 2020) during its quarterly executive briefing in Kaduna presented a groundbreaking policy roadmap for off-grid power solutions. The initiative focuses on agricultural solar processing plants, cold chain refrigeration, and localized smart distribution grids.',
    imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&q=80&w=800',
    author: 'Engr. Fatima Bello Garba',
    date: '2026-07-15',
    featured: true,
    commentsCount: 14,
    views: 1240,
    tags: ['Solar', 'Mini-Grid', 'Northern Power', 'Renewable']
  },
  {
    id: 'n-2',
    title: 'Mandatory Electrical Code Inspection Standard Adopted for Commercial Structures in Kano & Kaduna',
    category: 'Policy',
    summary: 'N-NEPEF collaborates with state urban planning authorities to enforce certified electrical wiring inspections to prevent fire hazards.',
    content: 'In response to recent market electrical fire occurrences, N-NEPEF certified inspectors will work alongside state housing ministries to conduct mandatory safety audits before building energization.',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=800',
    author: 'Engr. Dr. Kabir Muhammad Kano',
    date: '2026-07-02',
    featured: false,
    commentsCount: 8,
    views: 890,
    tags: ['Safety', 'Inspection', 'Code Compliance', 'Wiring']
  },
  {
    id: 'n-3',
    title: 'N-NEPEF Launches Youth Electrical Engineering Internship & Mentorship Drive',
    category: 'Announcements',
    summary: 'Over 500 young electrical engineering graduates from Ahmadu Bello University, Bayero University Kano, and ATBU Bauchi paired with industry mentors.',
    content: 'Empowering the next generation of Northern Nigerian power engineers through practical hands-on field training, substation design workshops, and professional licensure preparation.',
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=800',
    author: 'Engr. Alhassan Abubakar',
    date: '2026-06-20',
    featured: false,
    commentsCount: 22,
    views: 2100,
    tags: ['Mentorship', 'Engineers', 'ABU Zaria', 'BUK', 'ATBU']
  }
];

export const initialEvents: EventItem[] = [
  {
    id: 'ev-1',
    title: 'N-NEPEF 2026 Grand Northern Power Systems & Green Energy Summit',
    date: '2026-09-15',
    time: '09:00 AM - 04:30 PM WAT',
    location: 'Arewa House Conference Centre, Kaduna',
    state: 'Kaduna',
    description: 'The premier annual gathering of electrical engineers, power utility operators, policymakers, and renewable technology manufacturers across Northern Nigeria.',
    isVirtual: false,
    rsvpCount: 340,
    capacity: 500,
    qrCode: 'N-NEPEF-EV-2026-SUMMIT-KADUNA',
    certificatesEnabled: true,
    photos: [
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=600'
    ],
    videos: ['https://www.youtube.com/watch?v=sample1'],
    speakers: ['Engr. Dr. Kabir Muhammad Kano', 'Engr. Fatima Bello Garba', 'Prof. Sani Zaria']
  },
  {
    id: 'ev-2',
    title: 'High-Voltage Substation Safety & Relay Protection Workshop',
    date: '2026-08-10',
    time: '10:00 AM - 02:00 PM WAT',
    location: 'Virtual Zoom & BUK Electrical Auditorium, Kano',
    state: 'Kano',
    description: 'Specialized technical training on numerical relay configuration, transformer gas analysis, and busbar protection schemes.',
    isVirtual: true,
    virtualLink: 'https://nepef.org.ng/zoom/hv-safety-2026',
    rsvpCount: 185,
    capacity: 300,
    qrCode: 'N-NEPEF-EV-2026-HV-WORKSHOP',
    certificatesEnabled: true,
    photos: [],
    videos: [],
    speakers: ['Engr. Alhassan Abubakar', 'Engr. Amina Shehu Sokoto']
  }
];

export const initialAnnouncements: Announcement[] = [
  {
    id: 'a-1',
    title: '2026 Annual Membership ID Card Renewal & Stamp Verification Notice',
    content: 'All registered electrical practitioners and engineers across the 19 Northern states are requested to verify their membership status and update payment receipts via the member portal prior to August 30, 2026.',
    pinned: true,
    targetGroup: 'all',
    createdAt: '2026-07-01',
    pushSent: true,
    author: 'General Secretary Office'
  },
  {
    id: 'a-2',
    title: 'State Executive Committee Quarterly Progress Reports Due',
    content: 'All 19 State Coordinators must submit their Q2 membership expansion, training, and state inspection logs by Friday.',
    pinned: false,
    targetGroup: 'executives',
    createdAt: '2026-07-12',
    pushSent: false,
    author: 'National Chairman Secretariat'
  }
];

export const initialPayments: PaymentRecord[] = [];

export const initialRenewalRequests: RenewalRequest[] = [];

export const initialDocuments: DocumentItem[] = [
  {
    id: 'doc-1',
    title: 'N-NEPEF Constitution & Bye-Laws (2020 Revised Edition)',
    category: 'Constitution',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileSize: '2.4 MB',
    format: 'PDF',
    minRole: 'all',
    uploadDate: '2020-10-01',
    downloadsCount: 1420
  },
  {
    id: 'doc-2',
    title: 'Northern Nigerian Electrical Safety Code & Wiring Standard Guidelines',
    category: 'Policy',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileSize: '4.8 MB',
    format: 'PDF',
    minRole: 'approved_members',
    uploadDate: '2022-04-15',
    downloadsCount: 890
  },
  {
    id: 'doc-3',
    title: 'N-NEPEF Official Registration & Membership Verification Form',
    category: 'Form',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    fileSize: '650 KB',
    format: 'PDF',
    minRole: 'all',
    uploadDate: '2021-01-05',
    downloadsCount: 2310
  }
];

export const initialGallery: GalleryAlbum[] = [
  {
    id: 'gal-1',
    title: '2025 Northern Renewable Energy Exhibition in Kano',
    category: 'Exhibitions',
    date: '2025-11-20',
    coverUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&q=80&w=600',
    photos: [
      'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=600'
    ],
    videos: [],
    description: 'Exhibition of local solar inverter manufacturing, smart meters, and transformer protection devices.'
  },
  {
    id: 'gal-2',
    title: 'Kaduna Chapter Engineering Excellence Awards',
    category: 'Ceremony',
    date: '2025-12-10',
    coverUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600',
    photos: [
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=600'
    ],
    videos: [],
    description: 'Recognizing veteran engineers and young innovators contributing to power sector stability.'
  }
];

export const initialContactMessages: ContactMessage[] = [
  {
    id: 'c-1',
    name: 'Sani Usman Zaria',
    email: 'sani.zaria@gmail.com',
    phone: '+234 803 999 1122',
    subject: 'Membership ID Generation Query for Kaduna Branch',
    message: 'Good day secretariat, I completed my payment receipt upload 3 days ago. Kindly assist with administrative approval and ID card allocation.',
    date: '2026-07-25',
    status: 'unread'
  },
  {
    id: 'c-2',
    name: 'Engr. Bello Yola',
    email: 'bello.yola@adamawapower.org',
    phone: '+234 802 111 4433',
    subject: 'Partnership Proposal for Adamawa Off-Grid Solar Project',
    message: 'We request N-NEPEF technical endorsement for our upcoming solar water pumping project in Mubi, Adamawa state.',
    date: '2026-07-22',
    status: 'read'
  }
];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    timestamp: '2026-07-27 06:15:20',
    actorName: 'Engr. Dr. Kabir Muhammad Kano',
    actorRole: 'Super Admin',
    action: 'MEMBER_APPROVAL',
    details: 'Approved member application for Engr. Amina Shehu Sokoto (NEPEF/2020/SK/006)',
    ipAddress: '102.89.23.14'
  },
  {
    id: 'log-2',
    timestamp: '2026-07-26 14:22:05',
    actorName: 'Engr. Fatima Bello Garba',
    actorRole: 'National Admin',
    action: 'ANNOUNCEMENT_CREATE',
    details: 'Published announcement: "2026 Annual Membership ID Card Renewal Notice"',
    ipAddress: '197.210.8.92'
  },
  {
    id: 'log-3',
    timestamp: '2026-07-24 10:05:44',
    actorName: 'Engr. Alhassan Abubakar',
    actorRole: 'Secretary',
    action: 'DOCUMENT_UPLOAD',
    details: 'Uploaded document: N-NEPEF Constitution & Bye-Laws PDF',
    ipAddress: '102.88.11.205'
  }
];

export const initialAdmins: AdminAccount[] = [
  {
    id: 'adm-root',
    fullName: 'National Executive Secretariat Administrator',
    email: 'nnepef@gmail.com',
    username: 'nnepef',
    phone: '08133771460',
    role: 'super_admin',
    status: 'active',
    permissions: ['all'],
    lastLogin: '2026-08-27 08:00:00',
    createdAt: '2020-01-01'
  },
  {
    id: 'adm-1',
    fullName: 'Super Admin - Executive Secretariat',
    email: 'admin@nepef.org.ng',
    phone: '08133771460',
    role: 'super_admin',
    status: 'active',
    permissions: ['all'],
    lastLogin: '2026-07-28 02:15:00',
    createdAt: '2020-01-01'
  },
  {
    id: 'adm-2',
    fullName: 'Kano Chapter Administrator',
    email: 'kano.admin@nepef.org.ng',
    phone: '+234 803 055 9938',
    role: 'state_admin',
    state: 'Kano',
    status: 'active',
    permissions: ['manage_members', 'verify_payments', 'issue_notices'],
    lastLogin: '2026-07-27 18:30:00',
    createdAt: '2022-03-15'
  }
];

export const initialCMSFiles: CMSFile[] = [
  {
    id: 'file-1',
    name: 'N-NEPEF Official Constitution 2020.pdf',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    type: 'pdf',
    size: '1.8 MB',
    uploadedAt: '2026-01-10',
    uploadedBy: 'Super Admin'
  },
  {
    id: 'file-2',
    name: 'N-NEPEF Official Emblem Logo.png',
    url: '/logo.png',
    type: 'image',
    size: '12 KB',
    uploadedAt: '2026-02-14',
    uploadedBy: 'Super Admin'
  },
  {
    id: 'file-3',
    name: 'Northern Engineering Safety Code Guidelines.pdf',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    type: 'pdf',
    size: '2.4 MB',
    uploadedAt: '2026-03-20',
    uploadedBy: 'Super Admin'
  }
];

export const initialForumSettings: ForumSettings = {
  forumName: 'Northern Nigerian Electrical Practitioners & Engineers Forum',
  tagline: 'Promoting Electrical Safety, Innovation & Power Sector Excellence Across Northern Nigeria',
  logoUrl: '/logo.png',
  heroBannerUrl: '',
  primaryColor: '#0A2E73',
  skyColor: '#2EA3F2',
  themeMode: 'auto',
  announcementBarText: '⚡ 2026 Grand Northern Power Summit & Annual ID Card Renewal - Registrations Now Open!',
  announcementBarEnabled: true,
  contactEmail: 'info@nepef.org.ng',
  contactPhone: '+234 906 343 5546',
  contactPhoneSecondary: '+234 803 055 9938',
  contactPhoneTertiary: '+234 813 377 1460',
  headquarters: 'No. 2, Gwarzo Road, Opposite Rijiyar Zaki Bus Stop, Kano State, Nigeria.',
  socialFacebook: 'https://facebook.com/nnepef2020',
  socialTwitter: 'https://x.com/nnepef2020',
  socialLinkedin: 'https://linkedin.com/company/nnepef2020',
  socialYoutube: 'https://youtube.com/@nnepef2020',
  registrationEnabled: true,
  maintenanceMode: false,
  allowPublicMemberVerification: true,
  bankName: '',
  bankAccountName: '',
  bankAccountNumber: '',
  bankAccounts: [],
  paymentInstructions: 'Please make payment into the official N-NEPEF bank account listed above. After payment, upload a clear picture or PDF of your transaction receipt for verification.',
  
  // Homepage CMS Content
  heroTitle: 'Empowering Electrical Excellence & Safety Across Northern Nigeria',
  heroSubtitle: 'The official professional body advancing electrical engineering standards, grid safety compliance, and power sector technology across the 19 Northern States of Nigeria.',
  heroCtaButtonText: 'Register as Member',
  heroSecondaryButtonText: 'Verify Engineer ID',
  aboutUsTitle: 'About N-NEPEF 2020',
  aboutUsContent: 'The Northern Nigerian Electrical Practitioners & Engineers Forum (N-NEPEF 2020) was established to foster unity, maintain strict safety standards, and drive technological advancement in power generation, distribution, and industrial installation across Northern Nigeria.',
  missionStatement: 'To professionalize electrical engineering practice, eliminate quackery, safeguard lives and property, and facilitate clean energy innovation throughout the 19 Northern States.',
  visionStatement: 'To be the premiere regional electrical engineering forum driving sustainable power access, industrial automation, and professional excellence in Nigeria.',
  termsAndConditions: 'Membership in N-NEPEF 2020 requires strict adherence to COREN/NSE electrical safety codes, prompt settlement of annual dues, and commitment to public safety. All submitted documents are subjected to administrative verification.',
  privacyPolicy: 'N-NEPEF 2020 strictly guards member privacy. Personal identifiers such as National Identification Numbers (NIN), home addresses, and payment transaction receipts are encrypted and accessible exclusively by designated Super Admins.',
  faqs: [
    {
      id: 'faq-1',
      question: 'What is N-NEPEF 2020 and who can join?',
      answer: 'N-NEPEF (Northern Nigerian Electrical Practitioners & Engineers Forum) is the apex body for electrical engineers, power technologists, technicians, contractors, and safety inspectors operating across the 19 Northern States of Nigeria. Anyone with electrical qualifications or practicing experience can apply for membership.'
    },
    {
      id: 'faq-2',
      question: 'How do I obtain my official N-NEPEF Membership ID and Card?',
      answer: 'After completing the online registration form and uploading your credentials and payment receipt, your application undergoes administrative verification. Upon approval, Super Admin generates your unique Membership ID, allowing you to log into the Member Portal and download/print your high-security digital ID card with QR Code verification.'
    },
    {
      id: 'faq-3',
      question: 'How can the public verify if an electrical practitioner is approved by N-NEPEF?',
      answer: 'Use our public "Verify Member" tool on this website. Simply enter the engineer\'s Name or Membership ID. Only active, approved members will be displayed along with their specialization and position, strictly protecting sensitive personal data.'
    },
    {
      id: 'faq-4',
      question: 'What are the benefits of N-NEPEF membership?',
      answer: 'Members receive official professional certification badges, access to state safety code audits, technical summit registration discounts, direct listing on the public verification database, state chapter networking, and legal/regulatory advocacy.'
    }
  ],

  // Notifications & Email
  emailNotifications: true,
  smsNotifications: true,
  pushNotifications: true,
  welcomeEmailSubject: '🎉 Welcome to N-NEPEF 2020',
  senderName: 'Northern Nigerian Electrical Practitioners & Engineers Forum (N-NEPEF 2020)',
  senderEmail: 'admin@nepef.org.ng',
  smtpServer: 'smtp.nepef.org.ng',
  smtpPort: '587',

  // SEO & Security
  seoTitle: 'N-NEPEF 2020 - Northern Nigerian Electrical Practitioners & Engineers Forum',
  seoDescription: 'Official Portal of N-NEPEF 2020. Verify member engineers, register for practicing membership, and stay updated on power sector engineering across Northern Nigeria.',
  seoKeywords: 'N-NEPEF, Electrical Engineers Nigeria, Kano Electrical Forum, COREN, Northern Nigeria Power',
  ogImageUrl: '/logo.png',
  sessionTimeoutMinutes: 30,
  requireStrongPasswords: true,
  ownerScopedIdCardsOnly: true,

  autoBackup: true,
  lastBackupDate: '2026-07-28 02:00:00',
  feeCategories: [
    {
      id: 'fee-1',
      name: 'New Membership Registration Fee',
      code: 'registration',
      amount: 25000,
      enabled: true,
      description: 'One-time registration fee for new electrical practitioners & engineers.',
      instructions: 'Required for initial verification and membership ID issuance.'
    },
    {
      id: 'fee-2',
      name: 'Membership Renewal Fee',
      code: 'renewal',
      amount: 15000,
      enabled: true,
      description: 'Annual membership renewal and practicing license validation.',
      instructions: 'Payable annually by active registered members.'
    },
    {
      id: 'fee-3',
      name: 'ID Card Renewal Fee',
      code: 'id_card_renewal',
      amount: 10000,
      enabled: true,
      description: 'Fee for renewing or upgrading membership smart ID card.',
      instructions: 'Submit along with updated passport photo and digital signature.'
    },
    {
      id: 'fee-4',
      name: 'Replacement ID Card Fee',
      code: 'id_card_replacement',
      amount: 12000,
      enabled: true,
      description: 'Fee for lost, damaged, or stolen membership ID card replacement.',
      instructions: 'Includes fast-track printing and security seal re-verification.'
    }
  ]
};

export const sampleNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Membership Approved',
    message: 'Your N-NEPEF membership status is active. Your official ID card is ready for download.',
    timestamp: '2 hours ago',
    read: false,
    type: 'success'
  },
  {
    id: 'notif-2',
    title: 'Upcoming Power Summit 2026',
    message: 'RSVP is now open for the Annual Grand Northern Power Summit in Kaduna.',
    timestamp: '1 day ago',
    read: true,
    type: 'info'
  }
];

export const initialNotificationLogs: NotificationDeliveryLog[] = [
  {
    id: 'log-101',
    recipientName: 'Engr. Dr. Kabir Muhammad Kano',
    recipientEmail: 'kabir.kano@nepef.org.ng',
    recipientPhone: '+234 803 123 4567',
    membershipId: 'NEPEF/2020/KN/001',
    channel: 'Email',
    subject: '🎉 Welcome to N-NEPEF 2020',
    message: 'Dear Engr. Dr. Kabir Muhammad Kano, We are pleased to inform you that your application to join N-NEPEF 2020 has been successfully approved...',
    status: 'Sent',
    sentAt: '2026-07-26 14:32:10'
  },
  {
    id: 'log-102',
    recipientName: 'Engr. Dr. Kabir Muhammad Kano',
    recipientEmail: 'kabir.kano@nepef.org.ng',
    recipientPhone: '+234 803 123 4567',
    membershipId: 'NEPEF/2020/KN/001',
    channel: 'SMS',
    subject: 'N-NEPEF Welcome SMS',
    message: 'Welcome to N-NEPEF 2020! Your membership ID is NEPEF/2020/KN/001. Status: ACTIVE.',
    status: 'Sent',
    sentAt: '2026-07-26 14:32:12'
  },
  {
    id: 'log-103',
    recipientName: 'Engr. Fatima Bello Garba',
    recipientEmail: 'fatima.bello@nepef.org.ng',
    recipientPhone: '+234 802 987 6543',
    membershipId: 'NEPEF/2020/KD/002',
    channel: 'Email',
    subject: '🎉 Welcome to N-NEPEF 2020',
    message: 'Dear Engr. Fatima Bello Garba, We are pleased to inform you that your application to join N-NEPEF 2020 has been successfully approved...',
    status: 'Sent',
    sentAt: '2026-07-25 09:15:00'
  }
];
