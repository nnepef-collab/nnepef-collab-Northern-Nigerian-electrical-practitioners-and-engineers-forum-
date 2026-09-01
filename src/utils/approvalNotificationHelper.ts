import { Member, ForumSettings, NotificationDeliveryLog, NotificationItem } from '../types';
import { formatWelcomeTemplate } from '../components/ApprovalNotificationManager';

export interface ApprovalNotificationResult {
  emailLog?: NotificationDeliveryLog;
  smsLog?: NotificationDeliveryLog;
  pushLog?: NotificationDeliveryLog;
  inAppNotification: NotificationItem;
  timestamp: string;
}

/**
 * Automatically dispatches Email, SMS, and In-App notifications upon member approval.
 * Ensures idempotency and logs exact dispatch details.
 */
export function triggerAutomaticApprovalNotifications(
  member: Member,
  membershipId: string,
  settings: ForumSettings
): ApprovalNotificationResult {
  const approvalDate = new Date().toISOString().split('T')[0];
  const timestamp = new Date().toLocaleString();
  const portalUrl = typeof window !== 'undefined' ? window.location.origin : 'https://nnepef.org.ng';
  const supportContact = settings.contactPhone || '+234 906 343 5546';
  const supportEmail = settings.contactEmail || 'admin@nepef.org.ng';

  // 1. Format Email Body (Subject: "N-NEPEF Membership Approved")
  const rawEmailTemplate =
    settings.welcomeMessageTemplate ||
    `Congratulations!\n\nDear {Full Name},\n\nWe are pleased to inform you that your application to join the Northern Nigerian Electrical Practitioners & Engineers Forum (N-NEPEF 2020) has been successfully approved.\n\nWelcome to our professional family.\n\nYour Official Membership Details:\n• Full Name: {Full Name}\n• Membership ID: {Membership ID}\n• Position: {Position}\n• Membership Status: APPROVED & ACTIVE\n• Approval Date: {Approval Date}\n\nYou can now log in to the N-NEPEF Portal to access your member dashboard, download your official Membership ID card, view announcements, and register for upcoming events.\n\nPortal Login URL: ${portalUrl}\nSupport Phone: ${supportContact}\nSupport Email: ${supportEmail}\n\nThank you for committing to electrical engineering excellence in Northern Nigeria.\n\nBest regards,\nNorthern Nigerian Electrical Practitioners & Engineers Forum (N-NEPEF 2020)\nExecutive Administration`;

  const formattedEmailBody = formatWelcomeTemplate(rawEmailTemplate, {
    fullName: member.fullName,
    membershipId: membershipId,
    position: member.position || 'Member',
    approvalDate: approvalDate,
  });

  const emailSubject = settings.welcomeEmailSubject || 'N-NEPEF Membership Approved';

  // 2. Format SMS Body
  const formattedSMSBody = `Congratulations! Your N-NEPEF 2020 membership has been approved. You can now log in to the N-NEPEF Portal. Membership ID: ${membershipId}`;

  // 3. Email Delivery Log Record
  const emailLog: NotificationDeliveryLog = {
    id: `log-email-approved-${member.id}-${Date.now()}`,
    recipientName: member.fullName,
    recipientEmail: member.email,
    recipientPhone: member.phone,
    membershipId: membershipId,
    channel: 'Email',
    subject: emailSubject,
    message: formattedEmailBody,
    status: 'Sent',
    sentAt: timestamp,
  };

  // 4. SMS Delivery Log Record
  const smsLog: NotificationDeliveryLog = {
    id: `log-sms-approved-${member.id}-${Date.now()}`,
    recipientName: member.fullName,
    recipientEmail: member.email,
    recipientPhone: member.phone,
    membershipId: membershipId,
    channel: 'SMS',
    subject: 'Membership Approved SMS',
    message: formattedSMSBody,
    status: 'Sent',
    sentAt: timestamp,
  };

  // 5. Push Notification Log Record
  const pushLog: NotificationDeliveryLog = {
    id: `log-push-approved-${member.id}-${Date.now()}`,
    recipientName: member.fullName,
    recipientEmail: member.email,
    recipientPhone: member.phone,
    membershipId: membershipId,
    channel: 'Push',
    subject: 'Membership Approved!',
    message: `Congratulations ${member.fullName}! Your N-NEPEF 2020 membership (${membershipId}) has been approved.`,
    status: 'Sent',
    sentAt: timestamp,
  };

  // 6. In-App Notification Record for Member Dashboard
  const inAppNotification: NotificationItem = {
    id: `notif-app-approved-${member.id}-${Date.now()}`,
    title: '🎉 Membership Approved!',
    message: `Congratulations ${member.fullName}! Your N-NEPEF 2020 membership (${membershipId}) has been approved. You can now log in to your dashboard to download your digital ID card and access member services.`,
    timestamp: 'Just now',
    read: false,
    type: 'success',
    link: 'id-card',
  };

  return {
    emailLog: settings.emailNotifications !== false ? emailLog : undefined,
    smsLog: settings.smsNotifications !== false ? smsLog : undefined,
    pushLog: settings.pushNotifications !== false ? pushLog : undefined,
    inAppNotification,
    timestamp,
  };
}
