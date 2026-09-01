export interface EmailTemplateData {
  recipientName: string;
  membershipId?: string;
  state?: string;
  category?: string;
  qualification?: string;
  phone?: string;
  email?: string;
  reason?: string;
  resetCode?: string;
  updatedFields?: string[];
  portalUrl?: string;
}

export function getRegistrationSubmittedEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `Registration Received - N-NEPEF 2020 Portal (${data.membershipId || 'Pending Verification'})`;
  const portalUrl = data.portalUrl || 'https://nnepef2020.org';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; color: #1E293B; }
    .container { max-width: 600px; margin: 20px auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #E2E8F0; }
    .header { background: linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; }
    .logo-badge { display: inline-block; background: #2EA3F2; color: #FFFFFF; font-weight: 800; padding: 6px 16px; border-radius: 20px; font-size: 14px; letter-spacing: 1px; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 13px; color: #93C5FD; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 16px; }
    .status-card { background: #EFF6FF; border-left: 4px solid #2EA3F2; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .status-title { font-weight: 700; color: #1E40AF; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-desc { margin-top: 4px; font-size: 13px; color: #3B82F6; }
    .details-table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px; }
    .details-table td { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; }
    .details-table td.label { font-weight: 600; color: #64748B; width: 40%; }
    .details-table td.value { color: #0F172A; font-weight: 600; }
    .btn { display: inline-block; background-color: #1E3A8A; color: #FFFFFF !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-top: 20px; text-align: center; }
    .footer { background-color: #F1F5F9; padding: 20px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">N-NEPEF 2020</div>
      <h1>Registration Received</h1>
      <p>Northern Nigerian Electrical Practitioners & Engineers Forum</p>
    </div>
    <div class="content">
      <div class="greeting">Dear ${data.recipientName},</div>
      <p>Thank you for submitting your membership registration to the N-NEPEF 2020 Digital Portal.</p>
      
      <div class="status-card">
        <div class="status-title">STATUS: UNDER VERIFICATION</div>
        <div class="status-desc">Your application and payment credentials have been queued for administrative review.</div>
      </div>

      <table class="details-table">
        <tr>
          <td class="label">Full Name</td>
          <td class="value">${data.recipientName}</td>
        </tr>
        <tr>
          <td class="label">Membership ID</td>
          <td class="value">${data.membershipId || 'Generating upon approval'}</td>
        </tr>
        ${data.state ? `<tr><td class="label">State Chapter</td><td class="value">${data.state}</td></tr>` : ''}
        ${data.qualification ? `<tr><td class="label">Qualification</td><td class="value">${data.qualification}</td></tr>` : ''}
      </table>

      <p>You will receive an automated notification once your state executive or national admin completes the verification process.</p>
      
      <div style="text-align: center;">
        <a href="${portalUrl}" class="btn">View Portal Status</a>
      </div>
    </div>
    <div class="footer">
      &copy; 2026 N-NEPEF 2020. Official Digital Membership Portal.<br>
      This is an automated operational notification.
    </div>
  </div>
</body>
</html>
  `;

  const text = `Dear ${data.recipientName},\n\nYour N-NEPEF 2020 registration has been successfully received and is currently under verification.\n\nMembership ID: ${data.membershipId || 'Pending'}\nState Chapter: ${data.state || 'N/A'}\n\nYou will be notified once approved.\n\nN-NEPEF 2020 Secretariat`;

  return { subject, html, text };
}

export function getRegistrationApprovedEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `🎉 Membership Approved & Verified - N-NEPEF 2020 (${data.membershipId})`;
  const portalUrl = data.portalUrl || 'https://nnepef2020.org';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; color: #1E293B; }
    .container { max-width: 600px; margin: 20px auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #E2E8F0; }
    .header { background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; }
    .logo-badge { display: inline-block; background: #FFFFFF; color: #059669; font-weight: 800; padding: 6px 16px; border-radius: 20px; font-size: 14px; letter-spacing: 1px; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 13px; color: #D1FAE5; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 16px; }
    .status-card { background: #ECFDF5; border-left: 4px solid #10B981; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .status-title { font-weight: 700; color: #065F46; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-desc { margin-top: 4px; font-size: 13px; color: #047857; }
    .id-badge-box { background: #F1F5F9; border: 2px dashed #CBD5E1; text-align: center; padding: 18px; border-radius: 12px; margin: 20px 0; }
    .id-number { font-size: 24px; font-weight: 800; color: #1E3A8A; letter-spacing: 2px; margin-top: 4px; }
    .details-table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px; }
    .details-table td { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; }
    .details-table td.label { font-weight: 600; color: #64748B; width: 40%; }
    .details-table td.value { color: #0F172A; font-weight: 600; }
    .btn { display: inline-block; background-color: #059669; color: #FFFFFF !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-top: 20px; text-align: center; }
    .footer { background-color: #F1F5F9; padding: 20px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">N-NEPEF 2020</div>
      <h1>Membership Approved!</h1>
      <p>Official Digital Verification Completed</p>
    </div>
    <div class="content">
      <div class="greeting">Congratulations ${data.recipientName},</div>
      <p>We are pleased to inform you that your registration for <strong>N-NEPEF 2020</strong> has been officially verified and APPROVED by the national admin.</p>
      
      <div class="status-card">
        <div class="status-title">STATUS: ACTIVE & VERIFIED MEMBER</div>
        <div class="status-desc">Your digital membership ID card is now active and ready for download in your portal dashboard.</div>
      </div>

      <div class="id-badge-box">
        <div style="font-size: 12px; text-transform: uppercase; color: #64748B; font-weight: 700;">Your Official Membership ID</div>
        <div class="id-number">${data.membershipId || 'NNEPEF-MEMBER'}</div>
      </div>

      <table class="details-table">
        <tr>
          <td class="label">Full Name</td>
          <td class="value">${data.recipientName}</td>
        </tr>
        <tr>
          <td class="label">Membership ID</td>
          <td class="value">${data.membershipId}</td>
        </tr>
        ${data.state ? `<tr><td class="label">State Chapter</td><td class="value">${data.state}</td></tr>` : ''}
      </table>

      <p>Log in to your portal account to access your digital ID card, view member notices, and participate in forum activities.</p>

      <div style="text-align: center;">
        <a href="${portalUrl}" class="btn">Access Member Portal</a>
      </div>
    </div>
    <div class="footer">
      &copy; 2026 N-NEPEF 2020. Official Digital Membership Portal.<br>
      This is an official verification notice.
    </div>
  </div>
</body>
</html>
  `;

  const text = `Congratulations ${data.recipientName}!\n\nYour N-NEPEF 2020 membership registration has been APPROVED!\n\nOfficial Membership ID: ${data.membershipId}\nState Chapter: ${data.state || 'N/A'}\n\nYou can now log in to access your digital ID card.\n\nN-NEPEF 2020 Secretariat`;

  return { subject, html, text };
}

export function getRegistrationRejectedEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `Notice regarding your N-NEPEF 2020 Registration (${data.membershipId || 'Pending'})`;
  const portalUrl = data.portalUrl || 'https://nnepef2020.org';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; color: #1E293B; }
    .container { max-width: 600px; margin: 20px auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #E2E8F0; }
    .header { background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; }
    .logo-badge { display: inline-block; background: #FFFFFF; color: #DC2626; font-weight: 800; padding: 6px 16px; border-radius: 20px; font-size: 14px; letter-spacing: 1px; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 13px; color: #FCA5A5; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 16px; }
    .status-card { background: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .status-title { font-weight: 700; color: #991B1B; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-desc { margin-top: 6px; font-size: 13px; color: #B91C1C; line-height: 1.5; }
    .btn { display: inline-block; background-color: #1E3A8A; color: #FFFFFF !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-top: 20px; text-align: center; }
    .footer { background-color: #F1F5F9; padding: 20px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">N-NEPEF 2020</div>
      <h1>Registration Status Update</h1>
      <p>Verification Unsuccessful</p>
    </div>
    <div class="content">
      <div class="greeting">Dear ${data.recipientName},</div>
      <p>Thank you for your interest in N-NEPEF 2020. During administrative review, your registration submission could not be verified.</p>
      
      <div class="status-card">
        <div class="status-title">REASON FOR REJECTION</div>
        <div class="status-desc">${data.reason || 'Information or payment proof uploaded was incomplete or unverified.'}</div>
      </div>

      <p>You may submit a fresh registration with updated information or contact your state executive for clarification.</p>

      <div style="text-align: center;">
        <a href="${portalUrl}" class="btn">Visit Portal</a>
      </div>
    </div>
    <div class="footer">
      &copy; 2026 N-NEPEF 2020. Official Digital Membership Portal.<br>
      This is an administrative notification.
    </div>
  </div>
</body>
</html>
  `;

  const text = `Dear ${data.recipientName},\n\nYour N-NEPEF 2020 registration submission could not be approved at this time.\n\nReason: ${data.reason || 'Incomplete details or unverified payment proof'}\n\nPlease visit the portal to resubmit with complete details or contact support.\n\nN-NEPEF 2020 Secretariat`;

  return { subject, html, text };
}

export function getProfileUpdatedEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `Account Profile Updated - N-NEPEF 2020 (${data.membershipId || 'Member Record'})`;
  const portalUrl = data.portalUrl || 'https://nnepef2020.org';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; color: #1E293B; }
    .container { max-width: 600px; margin: 20px auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #E2E8F0; }
    .header { background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; }
    .logo-badge { display: inline-block; background: #2EA3F2; color: #FFFFFF; font-weight: 800; padding: 6px 16px; border-radius: 20px; font-size: 14px; letter-spacing: 1px; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 16px; }
    .info-card { background: #EFF6FF; border-left: 4px solid #2EA3F2; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .footer { background-color: #F1F5F9; padding: 20px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">N-NEPEF 2020</div>
      <h1>Profile Information Updated</h1>
    </div>
    <div class="content">
      <div class="greeting">Hello ${data.recipientName},</div>
      <p>This notification confirms that your official N-NEPEF 2020 profile information was updated on ${new Date().toLocaleDateString('en-GB')}.</p>
      
      <div class="info-card">
        <strong>Member Name:</strong> ${data.recipientName}<br>
        <strong>Membership ID:</strong> ${data.membershipId || 'N/A'}<br>
        <strong>State Chapter:</strong> ${data.state || 'N/A'}
      </div>

      <p>If you did not initiate this change, please contact N-NEPEF support immediately.</p>
    </div>
    <div class="footer">
      &copy; 2026 N-NEPEF 2020 Digital Portal.
    </div>
  </div>
</body>
</html>
  `;

  const text = `Hello ${data.recipientName},\n\nYour N-NEPEF 2020 member profile (ID: ${data.membershipId || 'N/A'}) was updated.\n\nIf you did not make this change, contact support immediately.\n\nN-NEPEF 2020 Secretariat`;

  return { subject, html, text };
}

export function getPasswordResetEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `🔑 Password Reset Verification Code - N-NEPEF 2020`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; color: #1E293B; }
    .container { max-width: 600px; margin: 20px auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #E2E8F0; }
    .header { background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; }
    .logo-badge { display: inline-block; background: #2EA3F2; color: #FFFFFF; font-weight: 800; padding: 6px 16px; border-radius: 20px; font-size: 14px; letter-spacing: 1px; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 700; color: #0F172A; margin-bottom: 16px; }
    .code-box { background: #F1F5F9; border: 2px dashed #3B82F6; text-align: center; padding: 20px; border-radius: 12px; margin: 24px 0; }
    .code-number { font-size: 32px; font-weight: 900; color: #1E3A8A; letter-spacing: 6px; font-family: monospace; }
    .footer { background-color: #F1F5F9; padding: 20px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">N-NEPEF 2020</div>
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <div class="greeting">Hello ${data.recipientName},</div>
      <p>We received a request to reset the password for your N-NEPEF 2020 account.</p>
      
      <p>Use the 6-digit verification code below to authorize your password reset:</p>

      <div class="code-box">
        <div style="font-size: 12px; text-transform: uppercase; color: #64748B; font-weight: 700;">Your Verification Code</div>
        <div class="code-number">${data.resetCode || '123456'}</div>
      </div>

      <p style="font-size: 13px; color: #64748B;">This code is valid for 15 minutes. If you did not request a password reset, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      &copy; 2026 N-NEPEF 2020 Digital Portal.
    </div>
  </div>
</body>
</html>
  `;

  const text = `Hello ${data.recipientName},\n\nYour N-NEPEF 2020 password reset verification code is: ${data.resetCode || '123456'}\n\nIf you did not request this code, please ignore this email.\n\nN-NEPEF 2020 Secretariat`;

  return { subject, html, text };
}

export function getTestEmail(data: EmailTemplateData): { subject: string; html: string; text: string } {
  const subject = `✅ Real Email Delivery Test - N-NEPEF 2020 Portal`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #F8FAFC; margin: 0; padding: 0; color: #1E293B; }
    .container { max-width: 600px; margin: 20px auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #E2E8F0; }
    .header { background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; }
    .logo-badge { display: inline-block; background: #FFFFFF; color: #059669; font-weight: 800; padding: 6px 16px; border-radius: 20px; font-size: 14px; letter-spacing: 1px; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .content { padding: 32px 24px; }
    .card { background: #ECFDF5; border-left: 4px solid #10B981; padding: 16px; border-radius: 8px; margin: 20px 0; }
    .footer { background-color: #F1F5F9; padding: 20px; text-align: center; font-size: 12px; color: #64748B; border-top: 1px solid #E2E8F0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">N-NEPEF 2020</div>
      <h1>Real Email Delivery Confirmed</h1>
    </div>
    <div class="content">
      <h2>Hello ${data.recipientName},</h2>
      <p>This test email confirms that your N-NEPEF 2020 email notification system is operational and delivering messages directly via production API/SMTP!</p>

      <div class="card">
        <strong>Status:</strong> CONFIRMED DELIVERED<br>
        <strong>Recipient:</strong> ${data.email || 'Verified Recipient'}<br>
        <strong>Timestamp:</strong> ${new Date().toISOString()}<br>
        <strong>Simulation Mode:</strong> DISABLED 🚫
      </div>
    </div>
    <div class="footer">
      &copy; 2026 N-NEPEF 2020 Digital Portal.
    </div>
  </div>
</body>
</html>
  `;

  const text = `Hello ${data.recipientName},\n\nThis test email confirms real email delivery via N-NEPEF 2020 Portal!\n\nSimulation Mode: DISABLED\nTimestamp: ${new Date().toISOString()}\n\nN-NEPEF 2020 Secretariat`;

  return { subject, html, text };
}
