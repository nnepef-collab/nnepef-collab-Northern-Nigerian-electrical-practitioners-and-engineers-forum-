export type MemberStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'Active' | 'Pending';

export type AppRole = 
  | 'super_admin'
  | 'admin'
  | 'Super Admin'
  | 'Admin'
  | 'national_admin'
  | 'state_admin'
  | 'lga_admin'
  | 'treasurer'
  | 'secretary'
  | 'moderator'
  | 'viewer'
  | 'member'
  | 'Member';

export interface NextOfKin {
  name: string;
  relation: string;
  phone: string;
  altPhone?: string;
  address: string;
}

export interface Member {
  id: string;
  membershipId?: string; // Assigned manually by Admin/Super Admin only
  verificationCode?: string; // Public verification code e.g. VER-XXXXXXXX
  applicationReference?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  dateOfBirth?: string;
  phone: string;
  altPhone?: string;
  alternativePhone?: string;
  email?: string; // Optional metadata, no member login/auth
  nationality?: string;
  nin: string;
  ninNumber?: string;
  otherIdType?: string;
  otherIdNumber?: string;
  state: string;
  lga: string;
  ward?: string;
  address: string;
  residentialAddress?: string;
  highestQualification?: string;
  qualification?: string;
  courseOfStudy?: string;
  institution?: string;
  graduationYear?: string;
  otherQualifications?: string;
  professionalCertificates?: string;
  occupation: string;
  specialization: string;
  membershipType?: string;
  otherSkills?: string;
  yearsOfExperience: number;
  company: string;
  licenseNumber?: string;
  passportUrl: string;
  photoUrl?: string;
  passportPhotoUrl?: string;
  paymentReceiptUrl: string;
  registrationFee?: number;
  status: MemberStatus;
  role: AppRole;
  position?: string; // e.g. "National Chairman", "Kano State Coordinator", "Member"
  issueDate?: string;
  expiryDate?: string;
  registeredAt: string;
  notes?: string;
  approvalNotificationSent?: boolean;
  approvalNotificationSentAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  nextOfKin?: NextOfKin;
}

export interface Executive {
  id: string;
  name: string;
  position: string;
  tier: 'national' | 'state' | 'lga' | 'committee';
  state?: string;
  lga?: string;
  committee?: string;
  photoUrl: string;
  email: string;
  phone: string;
  bio: string;
  term: string; // e.g. "2024 - 2026"
  order?: number;
  active?: boolean;
}

export interface NewsArticle {
  id: string;
  title: string;
  category: 'Announcements' | 'Engineering' | 'Policy' | 'Events' | 'Projects';
  summary: string;
  content: string;
  imageUrl: string;
  author: string;
  date: string;
  featured: boolean;
  commentsCount: number;
  views: number;
  tags: string[];
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  state: string;
  description: string;
  isVirtual: boolean;
  virtualLink?: string;
  rsvpCount: number;
  capacity: number;
  qrCode: string;
  certificatesEnabled: boolean;
  photos: string[];
  videos: string[];
  speakers: string[];
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  targetGroup: 'all' | 'executives' | 'state_members' | 'selected';
  targetState?: string;
  createdAt: string;
  scheduledDate?: string;
  pushSent: boolean;
  author: string;
}

export interface FeeCategory {
  id: string;
  name: string;
  code: 'registration' | 'renewal' | 'id_card_renewal' | 'id_card_replacement' | string;
  amount: number;
  enabled: boolean;
  description?: string;
  instructions?: string;
  deadline?: string;
}

export interface PaymentRecord {
  id: string;
  memberId: string;
  memberName: string;
  membershipId: string;
  state?: string;
  lga?: string;
  type: string;
  amount: number;
  status: 'Verified' | 'Pending' | 'Rejected';
  receiptUrl: string;
  date: string;
  reference: string;
  paymentMethod: string;
  remarks?: string;
  rejectionReason?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface RenewalRequest {
  id: string;
  memberId: string;
  fullName: string;
  membershipId: string;
  position: string;
  passportUrl: string;
  signatureUrl: string;
  receiptUrl: string;
  state: string;
  lga: string;
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  remarks?: string;
  rejectionReason?: string;
  approvalDate?: string;
  expiryDate?: string;
  printedCount?: number;
  idCardDesignUrl?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: 'Constitution' | 'Circular' | 'Minutes' | 'Policy' | 'Form';
  fileUrl: string;
  fileSize: string;
  format: 'PDF' | 'DOCX' | 'IMAGE';
  minRole: 'all' | 'approved_members' | 'executives' | 'admin';
  uploadDate: string;
  downloadsCount: number;
}

export interface GalleryAlbum {
  id: string;
  title: string;
  category: string;
  date: string;
  coverUrl: string;
  photos: string[];
  videos: string[];
  description: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  date: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  reply?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface AdminAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  username?: string;
  password?: string;
  passwordHash?: string;
  role: AppRole;
  state?: string;
  lga?: string;
  status: 'active' | 'suspended';
  permissions: string[];
  lastLogin?: string;
  createdAt: string;
}

export interface CMSFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'doc' | 'other';
  size: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  details: string;
  ipAddress: string;
  deviceInfo?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
  paymentInstructions?: string;
  isActive?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ForumSettings {
  // General Site Settings
  forumName: string;
  tagline: string;
  logoUrl: string;
  heroBannerUrl?: string;
  primaryColor: string;
  skyColor: string;
  themeMode?: 'light' | 'dark' | 'auto';

  // Announcement Bar
  announcementBarText?: string;
  announcementBarEnabled?: boolean;

  // Contact & Secretariat
  contactEmail: string;
  contactPhone: string;
  contactPhoneSecondary?: string;
  contactPhoneTertiary?: string;
  headquarters: string;
  socialFacebook?: string;
  socialTwitter?: string;
  socialLinkedin?: string;
  socialYoutube?: string;

  // System Controls
  registrationEnabled: boolean;
  maintenanceMode: boolean;
  allowPublicMemberVerification: boolean;

  // Banking & Fees
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankAccounts?: BankAccount[];
  paymentInstructions?: string;
  feeCategories?: FeeCategory[];
  registrationFee?: number;
  annualFee?: number;

  // Homepage CMS Content
  heroTitle?: string;
  heroSubtitle?: string;
  heroCtaButtonText?: string;
  heroSecondaryButtonText?: string;
  aboutUsTitle?: string;
  aboutUsContent?: string;
  missionStatement?: string;
  visionStatement?: string;
  termsAndConditions?: string;
  privacyPolicy?: string;
  faqs?: FAQItem[];

  // Notifications & Email
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  welcomeEmailSubject?: string;
  welcomeMessageTemplate?: string;
  senderName?: string;
  senderEmail?: string;
  smtpServer?: string;
  smtpPort?: string;

  // SEO Settings
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogImageUrl?: string;

  // Security Settings
  sessionTimeoutMinutes?: number;
  requireStrongPasswords?: boolean;
  ownerScopedIdCardsOnly?: boolean;

  // Backup & Storage
  autoBackup: boolean;
  lastBackupDate?: string;
}

export interface NotificationDeliveryLog {
  id: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  membershipId: string;
  channel: 'Email' | 'SMS' | 'WhatsApp' | 'In-App' | 'Push';
  subject: string;
  message: string;
  status: 'Sent' | 'Delivered' | 'Failed' | 'Pending' | 'Retried';
  sentAt: string;
  provider?: string;
  messageId?: string;
  errorMessage?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert';
  link?: string;
}
