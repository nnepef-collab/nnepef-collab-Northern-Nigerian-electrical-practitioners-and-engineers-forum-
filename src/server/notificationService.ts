import nodemailer from 'nodemailer';
import {
  EmailTemplateData,
  getRegistrationSubmittedEmail,
  getRegistrationApprovedEmail,
  getRegistrationRejectedEmail,
  getProfileUpdatedEmail,
  getPasswordResetEmail,
  getTestEmail,
} from './emailTemplates.js';

export interface NotificationPayload {
  type: 'email' | 'sms' | 'whatsapp';
  event: 'REGISTRATION_SUBMITTED' | 'REGISTRATION_APPROVED' | 'REGISTRATION_REJECTED' | 'PROFILE_UPDATED' | 'MEMBER_UPDATED' | 'PASSWORD_RESET' | 'TEST' | 'CUSTOM';
  memberId?: string;
  memberName: string;
  recipient: string; // Email address or Phone number
  membershipId?: string;
  state?: string;
  qualification?: string;
  reason?: string;
  resetCode?: string;
  subject?: string;
  customMessage?: string;
}

export interface SendResult {
  success: boolean;
  provider: string; // 'Brevo API' | 'SMTP' | 'Twilio SMS' | 'Termii SMS' | 'Meta WhatsApp' | 'none'
  messageId?: string;
  errorMessage?: string;
  rawResponse?: unknown;
  attempts?: number;
}

// Helper to format Nigerian / International phone numbers for SMS & WhatsApp (E.164 standard)
function formatPhoneE164(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+234' + cleaned.slice(1);
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

/**
 * Retry helper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delayMs: number = 1000
): Promise<{ result?: T; attempts: number; lastError?: unknown }> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    attempt++;
    try {
      const result = await fn();
      return { result, attempts: attempt };
    } catch (err) {
      lastError = err;
      if (attempt <= retries) {
        console.warn(`[Notification Retry] Attempt ${attempt} failed:`, err, `Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }
  }

  return { attempts: attempt, lastError };
}

/**
 * Send Real Email via Brevo REST API or Nodemailer SMTP
 * Simulation mode is completely DISABLED.
 */
export async function sendEmailNotification(payload: NotificationPayload): Promise<SendResult> {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || brevoApiKey;
  const senderEmail = process.env.SMTP_FROM || process.env.BREVO_SENDER_EMAIL || 'notifications@nnepef2020.org';
  const senderName = process.env.BREVO_SENDER_NAME || 'N-NEPEF 2020 Portal';

  const templateData: EmailTemplateData = {
    recipientName: payload.memberName,
    membershipId: payload.membershipId,
    state: payload.state,
    qualification: payload.qualification,
    reason: payload.reason,
    email: payload.recipient,
    resetCode: payload.resetCode,
  };

  let emailContent: { subject: string; html: string; text: string };

  switch (payload.event) {
    case 'REGISTRATION_SUBMITTED':
      emailContent = getRegistrationSubmittedEmail(templateData);
      break;
    case 'REGISTRATION_APPROVED':
      emailContent = getRegistrationApprovedEmail(templateData);
      break;
    case 'REGISTRATION_REJECTED':
      emailContent = getRegistrationRejectedEmail(templateData);
      break;
    case 'PROFILE_UPDATED':
    case 'MEMBER_UPDATED':
      emailContent = getProfileUpdatedEmail(templateData);
      break;
    case 'PASSWORD_RESET':
      emailContent = getPasswordResetEmail(templateData);
      break;
    case 'TEST':
      emailContent = getTestEmail(templateData);
      break;
    case 'CUSTOM':
    default:
      emailContent = {
        subject: payload.subject || `N-NEPEF 2020 Notification for ${payload.memberName}`,
        html: `<p>Dear ${payload.memberName},</p><p>${payload.customMessage || 'You have a new update from N-NEPEF 2020 Digital Portal.'}</p>`,
        text: `Dear ${payload.memberName},\n\n${payload.customMessage || 'You have a new update from N-NEPEF 2020 Digital Portal.'}`,
      };
      break;
  }

  if (payload.subject) {
    emailContent.subject = payload.subject;
  }

  // 1. Option 1: Brevo REST API
  if (brevoApiKey && brevoApiKey.trim() !== '') {
    const sendViaBrevo = async () => {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey.trim(),
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: payload.recipient, name: payload.memberName }],
          subject: emailContent.subject,
          htmlContent: emailContent.html,
          textContent: emailContent.text,
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        const errorMsg = (resData as { message?: string }).message || JSON.stringify(resData);
        throw new Error(`Brevo API Error (${response.status}): ${errorMsg}`);
      }
      return resData as { messageId?: string };
    };

    const { result, attempts, lastError } = await withRetry(sendViaBrevo, 2, 1000);

    if (result) {
      return {
        success: true,
        provider: 'Brevo API',
        messageId: result.messageId || `brevo-api-${Date.now()}`,
        rawResponse: result,
        attempts,
      };
    } else {
      return {
        success: false,
        provider: 'Brevo API',
        errorMessage: lastError instanceof Error ? lastError.message : String(lastError),
        attempts,
      };
    }
  }

  // 2. Option 2: Nodemailer SMTP
  if (smtpUser && smtpUser.trim() !== '' && smtpPass && smtpPass.trim() !== '') {
    const sendViaSmtp = async () => {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: payload.recipient,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      return info;
    };

    const { result, attempts, lastError } = await withRetry(sendViaSmtp, 2, 1000);

    if (result) {
      return {
        success: true,
        provider: 'SMTP',
        messageId: result.messageId,
        rawResponse: result,
        attempts,
      };
    } else {
      return {
        success: false,
        provider: 'SMTP',
        errorMessage: lastError instanceof Error ? lastError.message : String(lastError),
        attempts,
      };
    }
  }

  // No email credentials configured — return explicit error!
  return {
    success: false,
    provider: 'none',
    errorMessage: 'Email delivery configuration missing. Please set BREVO_API_KEY or SMTP credentials (SMTP_USER & SMTP_PASS) in environment variables.',
    attempts: 0,
  };
}

/**
 * Send Real SMS via Twilio or Termii API
 * Simulation mode is completely DISABLED.
 */
export async function sendSmsNotification(payload: NotificationPayload): Promise<SendResult> {
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  const termiiApiKey = process.env.TERMII_API_KEY;
  const termiiSenderId = process.env.TERMII_SENDER_ID || 'NNEPEF';

  const e164Phone = formatPhoneE164(payload.recipient);

  let smsMessage = '';

  switch (payload.event) {
    case 'REGISTRATION_SUBMITTED':
      smsMessage = `Dear ${payload.memberName}, your N-NEPEF registration is received. Status: Under Verification.`;
      break;
    case 'REGISTRATION_APPROVED':
      smsMessage = `Congratulations ${payload.memberName}! Your N-NEPEF 2020 Membership (${payload.membershipId}) has been APPROVED. Welcome!`;
      break;
    case 'REGISTRATION_REJECTED':
      smsMessage = `Dear ${payload.memberName}, your N-NEPEF registration was not approved. Reason: ${payload.reason || 'Verification incomplete'}.`;
      break;
    case 'PROFILE_UPDATED':
    case 'MEMBER_UPDATED':
      smsMessage = `Hello ${payload.memberName}, your N-NEPEF membership profile (${payload.membershipId || 'N/A'}) was updated.`;
      break;
    case 'PASSWORD_RESET':
      smsMessage = `Hello ${payload.memberName}, your N-NEPEF password reset code is: ${payload.resetCode || '123456'}. Valid for 15 mins.`;
      break;
    case 'TEST':
      smsMessage = `N-NEPEF 2020 SMS Delivery Test confirmed for ${payload.memberName}! Real delivery active.`;
      break;
    case 'CUSTOM':
    default:
      smsMessage = payload.customMessage || `Dear ${payload.memberName}, you have an update regarding your N-NEPEF membership.`;
      break;
  }

  // 1. Option 1: Twilio SMS API
  if (twilioSid && twilioSid.trim() !== '' && twilioToken && twilioToken.trim() !== '') {
    const sendViaTwilio = async () => {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid.trim()}/Messages.json`;
      const auth = Buffer.from(`${twilioSid.trim()}:${twilioToken.trim()}`).toString('base64');

      const bodyParams = new URLSearchParams();
      bodyParams.append('To', e164Phone);
      bodyParams.append('From', twilioPhone || '+1234567890');
      bodyParams.append('Body', smsMessage);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });

      const resData = await response.json();
      if (!response.ok) {
        const errorMsg = (resData as { message?: string }).message || JSON.stringify(resData);
        throw new Error(`Twilio Error (${response.status}): ${errorMsg}`);
      }

      return resData as { sid?: string };
    };

    const { result, attempts, lastError } = await withRetry(sendViaTwilio, 2, 1000);

    if (result) {
      return {
        success: true,
        provider: 'Twilio SMS',
        messageId: result.sid || `twilio-${Date.now()}`,
        rawResponse: result,
        attempts,
      };
    } else {
      return {
        success: false,
        provider: 'Twilio SMS',
        errorMessage: lastError instanceof Error ? lastError.message : String(lastError),
        attempts,
      };
    }
  }

  // 2. Option 2: Termii SMS API
  if (termiiApiKey && termiiApiKey.trim() !== '') {
    const termiiPhone = e164Phone.replace(/^\+/, ''); // Termii prefers 23480... without +
    const sendViaTermii = async () => {
      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: termiiPhone,
          from: termiiSenderId,
          sms: smsMessage,
          type: 'plain',
          channel: 'generic',
          api_key: termiiApiKey.trim(),
        }),
      });

      const resData = await response.json();
      if (!response.ok || ((resData as { code?: string }).code !== 'ok' && !(resData as { message_id?: string }).message_id)) {
        const errorMsg = (resData as { message?: string }).message || JSON.stringify(resData);
        throw new Error(`Termii Error: ${errorMsg}`);
      }

      return resData as { message_id?: string };
    };

    const { result, attempts, lastError } = await withRetry(sendViaTermii, 2, 1000);

    if (result) {
      return {
        success: true,
        provider: 'Termii SMS',
        messageId: result.message_id || `termii-${Date.now()}`,
        rawResponse: result,
        attempts,
      };
    } else {
      return {
        success: false,
        provider: 'Termii SMS',
        errorMessage: lastError instanceof Error ? lastError.message : String(lastError),
        attempts,
      };
    }
  }

  // No SMS credentials configured
  return {
    success: false,
    provider: 'none',
    errorMessage: 'SMS delivery configuration missing. Please set TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN or TERMII_API_KEY in environment variables.',
    attempts: 0,
  };
}

/**
 * Send WhatsApp Notification via Meta WhatsApp Cloud API
 * Simulation mode is completely DISABLED.
 */
export async function sendWhatsAppNotification(payload: NotificationPayload): Promise<SendResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !phoneNumberId.trim() || !accessToken || !accessToken.trim()) {
    return {
      success: false,
      provider: 'none',
      errorMessage: 'WhatsApp configuration missing. Please set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in environment variables.',
      attempts: 0,
    };
  }

  const e164Phone = formatPhoneE164(payload.recipient).replace(/^\+/, ''); // Meta API expects number without +

  let whatsappMessage = '';
  switch (payload.event) {
    case 'REGISTRATION_SUBMITTED':
      whatsappMessage = `Dear ${payload.memberName}, your N-NEPEF 2020 registration has been received and is under verification.`;
      break;
    case 'REGISTRATION_APPROVED':
      whatsappMessage = `🎉 Congratulations ${payload.memberName}! Your N-NEPEF 2020 Membership (${payload.membershipId}) is APPROVED. Access your ID card at https://nnepef2020.org.`;
      break;
    case 'REGISTRATION_REJECTED':
      whatsappMessage = `Dear ${payload.memberName}, your N-NEPEF registration could not be approved. Reason: ${payload.reason || 'Verification pending'}.`;
      break;
    case 'PROFILE_UPDATED':
    case 'MEMBER_UPDATED':
      whatsappMessage = `Hello ${payload.memberName}, your N-NEPEF profile details (${payload.membershipId || 'N/A'}) were updated.`;
      break;
    case 'PASSWORD_RESET':
      whatsappMessage = `Hello ${payload.memberName}, your N-NEPEF password reset code is *${payload.resetCode || '123456'}*.`;
      break;
    case 'TEST':
      whatsappMessage = `✅ N-NEPEF 2020 WhatsApp Delivery Test confirmed for ${payload.memberName}! Real delivery active.`;
      break;
    case 'CUSTOM':
    default:
      whatsappMessage = payload.customMessage || `Dear ${payload.memberName}, you have an update regarding your N-NEPEF membership.`;
      break;
  }

  const sendViaWhatsApp = async () => {
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId.trim()}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: e164Phone,
        type: 'text',
        text: { preview_url: false, body: whatsappMessage },
      }),
    });

    const resData = await response.json();
    if (!response.ok) {
      const errorMsg = (resData as { error?: { message?: string } }).error?.message || JSON.stringify(resData);
      throw new Error(`Meta WhatsApp Cloud API Error (${response.status}): ${errorMsg}`);
    }

    return resData as { messages?: Array<{ id: string }> };
  };

  const { result, attempts, lastError } = await withRetry(sendViaWhatsApp, 2, 1000);

  if (result) {
    const msgId = result.messages?.[0]?.id || `wa-${Date.now()}`;
    return {
      success: true,
      provider: 'Meta WhatsApp',
      messageId: msgId,
      rawResponse: result,
      attempts,
    };
  } else {
    return {
      success: false,
      provider: 'Meta WhatsApp',
      errorMessage: lastError instanceof Error ? lastError.message : String(lastError),
      attempts,
    };
  }
}
