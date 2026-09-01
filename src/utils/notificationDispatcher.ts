import { Member, ForumSettings, NotificationDeliveryLog, NotificationItem } from '../types';
import { saveNotificationLogToSQLite, saveNotificationToSQLite } from '../services/sqliteService';

export type NotificationEventType =
  | 'registration_received'
  | 'registration_approved'
  | 'registration_rejected'
  | 'membership_suspended'
  | 'membership_reactivated'
  | 'membership_renewed'
  | 'renewal_submitted'
  | 'payment_received'
  | 'payment_pending'
  | 'profile_updated'
  | 'password_reset'
  | 'test'
  | 'general_announcement'
  | 'custom_message';

export interface DispatchNotificationOptions {
  event: NotificationEventType;
  member: Partial<Member> & { fullName: string };
  settings?: ForumSettings;
  customSubject?: string;
  customMessage?: string;
  reasonOrRemarks?: string;
  reference?: string;
  amount?: number;
  resetCode?: string;
  deliveryMethod?: 'Email' | 'SMS' | 'WhatsApp' | 'Both' | 'In-App' | 'All';
}

/**
 * Dispatch automatic or custom notification to a member.
 * Sends real Email (Brevo/SMTP), SMS (Twilio/Termii), and WhatsApp (Meta Cloud API) via /api/notifications/send.
 * Permanently saves every attempt in local database 'notification_logs' with Provider, Status, Message ID & Error details.
 */
export async function dispatchEventNotification(
  options: DispatchNotificationOptions,
  onAddLog?: (log: NotificationDeliveryLog) => void,
  onAddInApp?: (item: NotificationItem) => void
): Promise<{ logs: NotificationDeliveryLog[]; inAppNotif?: NotificationItem }> {
  try {
    const { event, member, settings, reasonOrRemarks, reference, amount, customSubject, customMessage, deliveryMethod, resetCode } = options;
    const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    const logs: NotificationDeliveryLog[] = [];
    let inAppNotif: NotificationItem | undefined;

  const fullName = member.fullName || 'Member';
  const email = member.email || '';
  const phone = member.phone || '';
  const membershipId = member.membershipId || 'Pending';

  let subject = customSubject || '';
  let body = customMessage || '';
  let inAppType: 'info' | 'success' | 'warning' | 'alert' = 'info';

  let backendEvent: 'REGISTRATION_SUBMITTED' | 'REGISTRATION_APPROVED' | 'REGISTRATION_REJECTED' | 'PROFILE_UPDATED' | 'MEMBER_UPDATED' | 'PASSWORD_RESET' | 'TEST' | 'CUSTOM' = 'CUSTOM';

  switch (event) {
    case 'registration_received':
      backendEvent = 'REGISTRATION_SUBMITTED';
      subject = subject || 'Registration Received - N-NEPEF 2020 Portal';
      body = body || `Dear ${fullName},\n\nYour N-NEPEF 2020 membership registration form and payment details have been successfully received.\n\nRegistration Reference: ${reference || 'N-NEPEF-REG'}\nState: ${member.state || 'N/A'}\n\nOur secretariat team will review your application shortly. You will receive an automated update once verified.`;
      inAppType = 'info';
      break;

    case 'registration_approved':
      backendEvent = 'REGISTRATION_APPROVED';
      subject = subject || '🎉 Membership Approved & Verified - N-NEPEF 2020';
      body = body || `Congratulations ${fullName}!\nYour N-NEPEF 2020 membership registration has been officially verified and APPROVED.\n\nMembership ID: ${membershipId}\nState Chapter: ${member.state || 'N/A'}\n\nYou can now log in to your account and download your digital ID card.`;
      inAppType = 'success';
      break;

    case 'registration_rejected':
      backendEvent = 'REGISTRATION_REJECTED';
      subject = subject || 'Notice regarding your N-NEPEF 2020 Registration';
      body = body || `Dear ${fullName},\n\nWe regret to inform you that your N-NEPEF 2020 membership application was not approved at this time.\n\nReason: ${reasonOrRemarks || 'Document / payment verification discrepancy'}.\n\nIf you believe this was in error, please contact N-NEPEF support.`;
      inAppType = 'warning';
      break;

    case 'profile_updated':
      backendEvent = 'PROFILE_UPDATED';
      subject = subject || 'Account Profile Updated - N-NEPEF 2020';
      body = body || `Hello ${fullName},\n\nYour official N-NEPEF 2020 member record was successfully updated.\n\nMembership ID: ${membershipId}\nIf you did not make this update, please contact support immediately.`;
      inAppType = 'info';
      break;

    case 'password_reset':
      backendEvent = 'PASSWORD_RESET';
      subject = subject || '🔑 Password Reset Verification Code - N-NEPEF 2020';
      body = body || `Hello ${fullName},\n\nYour N-NEPEF 2020 password reset verification code is: ${resetCode || '123456'}.\n\nValid for 15 minutes.`;
      inAppType = 'alert';
      break;

    case 'test':
      backendEvent = 'TEST';
      subject = subject || '✅ Real Delivery Confirmation Test - N-NEPEF 2020';
      body = body || `Hello ${fullName},\n\nThis is a real delivery confirmation test sent from the N-NEPEF 2020 Notification System.`;
      inAppType = 'success';
      break;

    case 'membership_suspended':
    case 'membership_reactivated':
    case 'membership_renewed':
      backendEvent = 'MEMBER_UPDATED';
      subject = subject || `N-NEPEF 2020 Membership Status Notice (${event.replace('_', ' ').toUpperCase()})`;
      body = body || `Dear ${fullName},\n\nYour N-NEPEF 2020 membership status (${membershipId}) has been updated (${event.replace('_', ' ')}).\n\nRemarks: ${reasonOrRemarks || 'Administrative update'}.`;
      inAppType = event === 'membership_suspended' ? 'alert' : 'success';
      break;

    case 'payment_received':
    case 'payment_pending':
      backendEvent = 'MEMBER_UPDATED';
      subject = subject || `N-NEPEF 2020 Payment Notice (${event.replace('_', ' ').toUpperCase()})`;
      body = body || `Dear ${fullName},\n\nPayment status update for ${fullName} (${membershipId}): ₦${amount ? amount.toLocaleString() : '0'} (Ref: ${reference || 'N/A'}).`;
      inAppType = 'info';
      break;

    case 'general_announcement':
    case 'custom_message':
    default:
      backendEvent = 'CUSTOM';
      subject = subject || 'N-NEPEF 2020 Notification';
      body = body || customMessage || 'You have a new notification from N-NEPEF 2020.';
      inAppType = 'info';
      break;
  }

  const method = deliveryMethod || 'Both';
  const sendEmail = (method === 'Email' || method === 'Both' || method === 'All') && (settings?.emailNotifications !== false);
  const sendSMS = (method === 'SMS' || method === 'Both' || method === 'All') && (settings?.smsNotifications !== false);
  const sendWhatsApp = method === 'WhatsApp' || method === 'All';
  const sendInApp = method === 'In-App' || method === 'Both' || method === 'All';

  // 1. Dispatch Real Email Notification
  if (sendEmail && email) {
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          event: backendEvent,
          memberId: member.id,
          memberName: fullName,
          recipient: email,
          membershipId,
          state: member.state,
          qualification: member.qualification,
          reason: reasonOrRemarks,
          resetCode,
          subject,
          customMessage: body,
        }),
      });

      const resData = await res.json();
      const emailLog: NotificationDeliveryLog = {
        id: `log-email-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        recipientName: fullName,
        recipientEmail: email,
        recipientPhone: phone,
        membershipId,
        channel: 'Email',
        subject,
        message: body,
        status: resData.success ? 'Sent' : 'Failed',
        sentAt: timestamp,
        provider: resData.provider || 'Brevo/SMTP',
        messageId: resData.messageId || undefined,
        errorMessage: resData.error || resData.errorMessage || (resData.success ? undefined : 'Email delivery failed'),
      };
      logs.push(emailLog);
      await saveNotificationLogToSQLite(emailLog);
      if (onAddLog) onAddLog(emailLog);
    } catch (err) {
      const emailLog: NotificationDeliveryLog = {
        id: `log-em-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        recipientName: fullName,
        recipientEmail: email,
        recipientPhone: phone,
        membershipId,
        channel: 'Email',
        subject,
        message: body,
        status: 'Failed',
        sentAt: timestamp,
        provider: 'Brevo/SMTP',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
      logs.push(emailLog);
      await saveNotificationLogToSQLite(emailLog);
      if (onAddLog) onAddLog(emailLog);
    }
  }

  // 2. Dispatch Real SMS Notification
  if (sendSMS && phone) {
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sms',
          event: backendEvent,
          memberId: member.id,
          memberName: fullName,
          recipient: phone,
          membershipId,
          state: member.state,
          qualification: member.qualification,
          reason: reasonOrRemarks,
          resetCode,
          customMessage: body,
        }),
      });

      const resData = await res.json();
      const smsLog: NotificationDeliveryLog = {
        id: `log-sms-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        recipientName: fullName,
        recipientEmail: email,
        recipientPhone: phone,
        membershipId,
        channel: 'SMS',
        subject,
        message: body.length > 160 ? body.substring(0, 157) + '...' : body,
        status: resData.success ? 'Sent' : 'Failed',
        sentAt: timestamp,
        provider: resData.provider || 'Twilio/Termii',
        messageId: resData.messageId || undefined,
        errorMessage: resData.error || resData.errorMessage || (resData.success ? undefined : 'SMS delivery failed'),
      };
      logs.push(smsLog);
      await saveNotificationLogToSQLite(smsLog);
      if (onAddLog) onAddLog(smsLog);
    } catch (err) {
      const smsLog: NotificationDeliveryLog = {
        id: `log-sms-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        recipientName: fullName,
        recipientEmail: email,
        recipientPhone: phone,
        membershipId,
        channel: 'SMS',
        subject,
        message: body.length > 160 ? body.substring(0, 157) + '...' : body,
        status: 'Failed',
        sentAt: timestamp,
        provider: 'Twilio/Termii',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
      logs.push(smsLog);
      await saveNotificationLogToSQLite(smsLog);
      if (onAddLog) onAddLog(smsLog);
    }
  }

  // 3. Dispatch Real WhatsApp Notification
  if (sendWhatsApp && phone) {
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'whatsapp',
          event: backendEvent,
          memberId: member.id,
          memberName: fullName,
          recipient: phone,
          membershipId,
          state: member.state,
          qualification: member.qualification,
          reason: reasonOrRemarks,
          resetCode,
          customMessage: body,
        }),
      });

      const resData = await res.json();
      const waLog: NotificationDeliveryLog = {
        id: `log-wa-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        recipientName: fullName,
        recipientEmail: email,
        recipientPhone: phone,
        membershipId,
        channel: 'WhatsApp',
        subject,
        message: body,
        status: resData.success ? 'Sent' : 'Failed',
        sentAt: timestamp,
        provider: resData.provider || 'Meta WhatsApp Cloud API',
        messageId: resData.messageId || undefined,
        errorMessage: resData.error || resData.errorMessage || (resData.success ? undefined : 'WhatsApp delivery failed'),
      };
      logs.push(waLog);
      await saveNotificationLogToSQLite(waLog);
      if (onAddLog) onAddLog(waLog);
    } catch (err) {
      const waLog: NotificationDeliveryLog = {
        id: `log-wa-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        recipientName: fullName,
        recipientEmail: email,
        recipientPhone: phone,
        membershipId,
        channel: 'WhatsApp',
        subject,
        message: body,
        status: 'Failed',
        sentAt: timestamp,
        provider: 'Meta WhatsApp Cloud API',
        errorMessage: err instanceof Error ? err.message : String(err),
      };
      logs.push(waLog);
      await saveNotificationLogToSQLite(waLog);
      if (onAddLog) onAddLog(waLog);
    }
  }

  // 4. In-App Notification Item
  if (sendInApp) {
    inAppNotif = {
      id: `notif-app-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      title: subject,
      message: body,
      timestamp: 'Just now',
      read: false,
      type: inAppType,
      link: event === 'registration_approved' || event === 'membership_renewed' ? 'id-card' : 'dashboard',
    };
    await saveNotificationToSQLite(inAppNotif);
    if (onAddInApp) onAddInApp(inAppNotif);

    const inAppLogItem: NotificationDeliveryLog = {
      id: `log-inapp-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      recipientName: fullName,
      recipientEmail: email,
      recipientPhone: phone,
      membershipId,
      channel: 'In-App',
      subject,
      message: body,
      status: 'Sent',
      sentAt: timestamp,
      provider: 'Portal In-App System',
    };
    logs.push(inAppLogItem);
    await saveNotificationLogToSQLite(inAppLogItem);
    if (onAddLog) onAddLog(inAppLogItem);
  }

  return { logs, inAppNotif };
  } catch (err) {
    console.error('[dispatchEventNotification Top-level Exception]', err);
    return { logs: [], inAppNotif: undefined };
  }
}
