import QRCode from 'qrcode';
import { Member, ForumSettings } from '../types';
import { OFFICIAL_NNEPEF_LOGO } from '../constants/logo';
import { OFFICIAL_SECRETARY_SIGNATURE } from '../constants/signature';
import { downloadFileSafely, loadHtmlImageFast } from '../utils/imageHelpers';
import { formatFourDigitMembershipId } from './pdfService';

/**
 * Loads an image safely with memory caching to eliminate duplicate network requests
 */
async function loadHtmlImage(url: string | null | undefined, fallbacks: string[] = []): Promise<HTMLImageElement | null> {
  return loadHtmlImageFast(url, fallbacks);
}

/**
 * Safely draws a rounded rectangle on a canvas context
 */
function drawCanvasRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/**
 * Draws the official decorative security seal on the canvas
 */
function drawOfficialSecuritySeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.save();

  // Outer circle with dashed border
  ctx.strokeStyle = '#0A2E73';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Inner solid circle
  ctx.strokeStyle = '#2EA3F2';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
  ctx.stroke();

  // Innermost gold accent ring
  ctx.strokeStyle = '#B45309';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 14, 0, Math.PI * 2);
  ctx.stroke();

  // Center Star & Badge
  ctx.fillStyle = '#0A2E73';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.fillText('★', cx, cy - 14);

  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#0A2E73';
  ctx.fillText('N-NEPEF 2020', cx, cy + 6);

  ctx.font = 'bold 8.5px monospace';
  ctx.fillStyle = '#B45309';
  ctx.fillText('OFFICIAL SEAL', cx, cy + 20);

  ctx.font = '7px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText('UNITY • EXCELLENCE', cx, cy + 32);

  ctx.restore();
}

/**
 * Generates an optimized, print-ready HTML5 Canvas for the Official Approval Slip / Registration Slip
 * Exact match to the approved N-NEPEF design, colors, typography, and information.
 */
export async function generateOfficialSlipCanvas(
  member: Member,
  settings?: ForumSettings,
  slipType: 'approved' | 'registration' = 'approved'
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  // High-clarity standard A4 proportional dimensions (1200 x 1700px)
  canvas.width = 1200;
  canvas.height = 1700;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Preload graphics safely
  const logoUrl = settings?.logoUrl && settings.logoUrl.trim() !== '' && settings.logoUrl !== '/logo.png'
    ? settings.logoUrl
    : OFFICIAL_NNEPEF_LOGO;

  const [logoImg, photoImg, sigImg] = await Promise.all([
    loadHtmlImage(logoUrl, [OFFICIAL_NNEPEF_LOGO, '/logo.png', '/logo.jpg']),
    loadHtmlImage(member.passportUrl || member.passportPhotoUrl),
    loadHtmlImage((settings as any)?.signatureUrl || OFFICIAL_SECRETARY_SIGNATURE, [OFFICIAL_SECRETARY_SIGNATURE, '/secretary-signature.png', '/secretary-signature.jpg'])
  ]);

  const isApproved = slipType === 'approved' || member.status === 'approved' || (member.status as string) === 'Active';
  const verificationCode = member.verificationCode || member.applicationReference || `VER-${member.id.substring(0, 8).toUpperCase()}`;
  const formattedId = formatFourDigitMembershipId(member.membershipId);
  const displayId = formattedId || (member.applicationReference ? `REF-${member.applicationReference}` : `APP-${member.id.substring(0, 8).toUpperCase()}`);
  const dateStr = member.approvedAt
    ? new Date(member.approvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // 1. Background Fill
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 1200, 1700);

  // 2. Subtle Central Watermark Logo
  if (logoImg) {
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.drawImage(logoImg, 350, 600, 500, 500);
    ctx.restore();
  }

  // 3. Top Decorative Brand Bars
  ctx.fillStyle = '#0A2E73'; // Deep Navy
  ctx.fillRect(0, 0, 1200, 14);
  ctx.fillStyle = '#2EA3F2'; // Sky Blue
  ctx.fillRect(0, 14, 1200, 8);

  // 4. Header Section: Logo, Title, Subtitle, Motto, Secretariat
  if (logoImg) {
    ctx.drawImage(logoImg, 60, 50, 110, 110);
  }

  const headerLeft = 190;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Title: N-NEPEF 2020
  ctx.font = 'bold 36px Georgia, serif';
  ctx.fillStyle = '#0A2E73';
  ctx.fillText(settings?.forumName || 'N-NEPEF 2020', headerLeft, 88);

  // Subtitle
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillStyle = '#1E293B';
  ctx.fillText('NORTHERN NIGERIAN ELECTRICAL PRACTITIONERS AND ENGINEERS FORUM', headerLeft, 115);

  // Motto
  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillStyle = '#B45309';
  ctx.fillText('UNITY • PROFESSIONALISM • EXCELLENCE', headerLeft, 138);

  // Secretariat Info
  ctx.font = '11px Arial, sans-serif';
  ctx.fillStyle = '#64748B';
  const secretariatText = `National Secretariat: ${settings?.headquarters || 'No. 2 Gwarzo Road, Kano State, Nigeria'} • +234 906 343 5546 • nepef.org.ng`;
  ctx.fillText(secretariatText, headerLeft, 160);

  // Right Header Status Pill & Ref
  const pillW = 220;
  const pillH = 34;
  const pillX = 1140 - pillW;
  const pillY = 55;

  if (isApproved) {
    ctx.fillStyle = '#ECFDF5';
    drawCanvasRoundRect(ctx, pillX, pillY, pillW, pillH, 17);
    ctx.fill();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#065F46';
    ctx.fillText('✓ OFFICIALLY APPROVED', pillX + pillW / 2, pillY + 22);
  } else {
    ctx.fillStyle = '#FEF3C7';
    drawCanvasRoundRect(ctx, pillX, pillY, pillW, pillH, 17);
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#92400E';
    ctx.fillText('REGISTERED APPLICANT', pillX + pillW / 2, pillY + 22);
  }

  ctx.textAlign = 'right';
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#0F172A';
  ctx.fillText(`SLIP REF: ${verificationCode}`, 1140, 118);

  ctx.font = '11.5px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText(`Date: ${dateStr}`, 1140, 142);

  // Divider Line below Header
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 185);
  ctx.lineTo(1140, 185);
  ctx.stroke();

  // 5. Document Title Ribbon
  ctx.fillStyle = '#0A2E73';
  drawCanvasRoundRect(ctx, 60, 205, 1080, 50, 10);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillStyle = '#FFFFFF';
  const bannerTitle = isApproved
    ? 'OFFICIAL MEMBERSHIP CERTIFICATE & APPROVAL SLIP'
    : 'OFFICIAL MEMBERSHIP REGISTRATION & VERIFICATION SLIP';
  ctx.fillText(bannerTitle, 85, 237);

  ctx.textAlign = 'right';
  ctx.font = 'bold 12.5px monospace';
  ctx.fillStyle = '#BAE6FD';
  const statusSub = isApproved ? 'STATUS: ACTIVE / CERTIFIED' : 'STATUS: PENDING RATIFICATION';
  ctx.fillText(statusSub, 1115, 236);

  // 6. Member Main Profile Box
  const profileBoxY = 275;
  const profileBoxH = 295;
  ctx.fillStyle = '#F8FAFC';
  drawCanvasRoundRect(ctx, 60, profileBoxY, 1080, profileBoxH, 14);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Passport Photo Frame
  const photoFrameX = 85;
  const photoFrameY = profileBoxY + 20;
  const photoFrameW = 185;
  const photoFrameH = 230;

  drawCanvasRoundRect(ctx, photoFrameX, photoFrameY, photoFrameW, photoFrameH, 8);
  ctx.fillStyle = '#F1F5F9';
  ctx.fill();
  ctx.strokeStyle = '#0A2E73';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (photoImg) {
    ctx.save();
    drawCanvasRoundRect(ctx, photoFrameX + 3, photoFrameY + 3, photoFrameW - 6, photoFrameH - 6, 6);
    ctx.clip();
    ctx.drawImage(photoImg, photoFrameX + 3, photoFrameY + 3, photoFrameW - 6, photoFrameH - 6);
    ctx.restore();
  } else {
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PASSPORT', photoFrameX + photoFrameW / 2, photoFrameY + photoFrameH / 2 - 6);
    ctx.fillText('PHOTOGRAPH', photoFrameX + photoFrameW / 2, photoFrameY + photoFrameH / 2 + 10);
  }

  ctx.textAlign = 'center';
  ctx.font = 'bold 10.5px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText('CERTIFIED PASSPORT', photoFrameX + photoFrameW / 2, photoFrameY + photoFrameH + 20);

  // Vertical Separator
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(295, profileBoxY + 20);
  ctx.lineTo(295, profileBoxY + profileBoxH - 20);
  ctx.stroke();

  // Identity Details
  const detX = 320;
  ctx.textAlign = 'left';

  // Full Legal Name
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText('FULL LEGAL NAME', detX, profileBoxY + 36);

  ctx.font = 'bold 23px Georgia, serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText((member.fullName || 'Registered Member').toUpperCase(), detX, profileBoxY + 64);

  // Membership ID Box
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText('ASSIGNED MEMBERSHIP ID', detX, profileBoxY + 98);

  const idBoxW = 320;
  const idBoxH = 32;
  ctx.fillStyle = '#E0F2FE';
  drawCanvasRoundRect(ctx, detX, profileBoxY + 106, idBoxW, idBoxH, 6);
  ctx.fill();
  ctx.strokeStyle = '#7DD3FC';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#0A2E73';
  ctx.fillText(displayId, detX + 12, profileBoxY + 127);

  // 2-Column Specs inside Profile Card
  const col1X = detX;
  const col2X = 730;

  // Row A
  ctx.font = 'bold 10.5px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText('DESIGNATION / ROLE', col1X, profileBoxY + 168);
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText(member.position || 'Practicing Member', col1X, profileBoxY + 186);

  ctx.font = 'bold 10.5px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText('SPECIALIZATION', col2X, profileBoxY + 168);
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText(member.specialization || member.occupation || 'Electrical Engineering', col2X, profileBoxY + 186);

  // Row B
  ctx.font = 'bold 10.5px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText('STATE CHAPTER & LGA', col1X, profileBoxY + 220);
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText(`${member.state} State ${member.lga ? `(${member.lga} LGA)` : ''}`, col1X, profileBoxY + 238);

  ctx.font = 'bold 10.5px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText('VERIFICATION REF', col2X, profileBoxY + 220);
  ctx.font = 'bold 13.5px monospace';
  ctx.fillStyle = '#0A2E73';
  ctx.fillText(verificationCode, col2X, profileBoxY + 238);

  // Row C
  ctx.font = 'bold 10.5px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText('CONTACT PHONE', col1X, profileBoxY + 268);
  ctx.font = 'bold 13.5px monospace';
  ctx.fillStyle = '#0F172A';
  ctx.fillText(member.phone || '—', col1X, profileBoxY + 286);

  ctx.font = 'bold 10.5px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText('MEMBERSHIP STATUS', col2X, profileBoxY + 268);
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = isApproved ? '#059669' : '#D97706';
  ctx.fillText(isApproved ? 'OFFICIALLY APPROVED / ACTIVE' : 'PENDING RATIFICATION', col2X, profileBoxY + 286);

  // 7. Detailed Particulars Table
  const tableY = 590;
  const rowHeight = 44;
  const tableData = [
    ['Full Legal Name:', member.fullName || '—', 'Gender / Date of Birth:', `${member.gender || '—'} / ${member.dob || member.dateOfBirth || '—'}`],
    ['Phone Number:', member.phone || '—', 'Email Address:', member.email || 'None'],
    ['Specialization:', member.specialization || member.occupation || 'Electrical Engineering', 'Years of Experience:', `${member.yearsOfExperience || 0} Years`],
    ['Residential Address:', member.address || member.residentialAddress || '—', 'Nationality:', member.nationality || 'Nigerian'],
    ['Chapter & State:', `${member.state || 'Kano'} State Chapter`, 'Approval Date:', isApproved ? dateStr : 'Pending Ratification']
  ];

  tableData.forEach((row, i) => {
    const ry = tableY + i * rowHeight;
    ctx.fillStyle = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    ctx.fillRect(60, ry, 1080, rowHeight);

    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, ry + rowHeight);
    ctx.lineTo(1140, ry + rowHeight);
    ctx.stroke();

    // Col 1 & 2
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#64748B';
    ctx.fillText(row[0], 75, ry + 27);

    ctx.font = '13px Arial, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(row[1], 270, ry + 27);

    // Col 3 & 4
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#64748B';
    ctx.fillText(row[2], 640, ry + 27);

    ctx.font = '13px Arial, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(row[3], 840, ry + 27);
  });

  // Table Outer Border
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  drawCanvasRoundRect(ctx, 60, tableY, 1080, tableData.length * rowHeight, 10);
  ctx.stroke();

  // 8. Academic / Professional Credentials Row (if available)
  let nextSectionY = tableY + tableData.length * rowHeight + 20;
  const hasAcademic = Boolean(member.highestQualification || member.qualification || member.courseOfStudy || member.institution);
  if (hasAcademic) {
    const acadH = 70;
    ctx.fillStyle = '#F8FAFC';
    drawCanvasRoundRect(ctx, 60, nextSectionY, 1080, acadH, 10);
    ctx.fill();
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3 Columns inside
    ctx.textAlign = 'left';
    ctx.font = 'bold 10.5px monospace';
    ctx.fillStyle = '#64748B';
    ctx.fillText('HIGHEST QUALIFICATION', 85, nextSectionY + 25);
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(member.highestQualification || member.qualification || '—', 85, nextSectionY + 48);

    ctx.font = 'bold 10.5px monospace';
    ctx.fillStyle = '#64748B';
    ctx.fillText('COURSE / FIELD OF STUDY', 450, nextSectionY + 25);
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(member.courseOfStudy || '—', 450, nextSectionY + 48);

    ctx.font = 'bold 10.5px monospace';
    ctx.fillStyle = '#64748B';
    ctx.fillText('INSTITUTION / SCHOOL', 820, nextSectionY + 25);
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(`${member.institution || '—'} ${member.graduationYear ? `(${member.graduationYear})` : ''}`, 820, nextSectionY + 48);

    nextSectionY += acadH + 20;
  }

  // 9. Official Verification & Secretary General Signature Box
  const footerBoxY = nextSectionY;
  const footerBoxH = 265;
  ctx.fillStyle = '#F8FAFC';
  drawCanvasRoundRect(ctx, 60, footerBoxY, 1080, footerBoxH, 14);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Column 1: Dynamic QR Code
  const qrBoxX = 85;
  const qrBoxY = footerBoxY + 20;
  const verifyUrl = `https://nepef.org.ng/verify?id=${encodeURIComponent(member.membershipId || member.id)}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: 150,
      margin: 1,
      color: {
        dark: '#0A2E73',
        light: '#FFFFFF'
      }
    });
    const qrImage = await loadHtmlImage(qrDataUrl);
    if (qrImage) {
      ctx.fillStyle = '#FFFFFF';
      drawCanvasRoundRect(ctx, qrBoxX, qrBoxY, 150, 150, 8);
      ctx.fill();
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.drawImage(qrImage, qrBoxX + 5, qrBoxY + 5, 140, 140);
    }
  } catch (e) {
    console.warn('QR Code generation failed:', e);
  }

  ctx.textAlign = 'left';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('SCAN TO VERIFY', qrBoxX + 165, qrBoxY + 30);

  ctx.font = '10.5px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText(verificationCode, qrBoxX + 165, qrBoxY + 52);

  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.fillStyle = '#0284C7';
  ctx.fillText('nepef.org.ng/verify', qrBoxX + 165, qrBoxY + 74);

  ctx.font = '9.5px Arial, sans-serif';
  ctx.fillStyle = '#94A3B8';
  ctx.fillText('Central National Registry', qrBoxX + 165, qrBoxY + 94);

  // Column 2: Official Security Seal
  drawOfficialSecuritySeal(ctx, 580, footerBoxY + 120, 68);

  // Column 3: Dedicated Secretary General Signature Box
  const sigBoxX = 760;
  const sigBoxY = footerBoxY + 20;

  if (sigImg) {
    ctx.drawImage(sigImg, sigBoxX + 40, sigBoxY + 10, 220, 75);
  }

  // Signature Line
  ctx.strokeStyle = '#0A2E73';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sigBoxX + 20, sigBoxY + 105);
  ctx.lineTo(sigBoxX + 300, sigBoxY + 105);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('Engr. Hussaini Ali', sigBoxX + 160, sigBoxY + 130);

  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillStyle = '#0A2E73';
  ctx.fillText('Secretary General', sigBoxX + 160, sigBoxY + 152);

  ctx.font = '11px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText('N-NEPEF 2020 National Secretariat', sigBoxX + 160, sigBoxY + 172);

  // 10. Legal Notice Footer
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 1630);
  ctx.lineTo(1140, 1630);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = '10px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText(
    'This document is an official certified membership document issued by Northern Nigerian Electrical Practitioners and Engineers Forum (N-NEPEF 2020).',
    600,
    1652
  );
  ctx.fillText(
    'For digital authenticity verification, visit https://nepef.org.ng/verify or scan the official QR code above.',
    600,
    1668
  );

  return canvas;
}

/**
 * Downloads the Official Approved Slip as an optimized high-quality image (JPG)
 */
export async function downloadApprovalSlipImage(member: Member, settings?: ForumSettings): Promise<void> {
  const canvas = await generateOfficialSlipCanvas(member, settings, 'approved');
  // High quality JPG (0.94) provides razor-sharp text and photos under ~300KB file size
  const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
  const cleanId = (member.membershipId || member.fullName || 'Member').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `NNEPEF-ApprovedSlip-${cleanId}.jpg`;
  await downloadFileSafely(dataUrl, filename);
}

/**
 * Downloads the Official Registration Slip as an optimized high-quality image (JPG)
 */
export async function downloadRegistrationSlipImage(member: Member, settings?: ForumSettings): Promise<void> {
  const canvas = await generateOfficialSlipCanvas(member, settings, 'registration');
  const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
  const cleanRef = (member.applicationReference || member.membershipId || member.fullName || 'Applicant').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `NNEPEF-RegistrationSlip-${cleanRef}.jpg`;
  await downloadFileSafely(dataUrl, filename);
}

/**
 * Generates an optimized, print-ready HTML5 Canvas for Admin Membership Details (Bio-Data Dossier)
 */
export async function generateMemberDetailsCanvas(member: Member, settings?: ForumSettings): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  // Extended height A4 proportional dimensions (1200 x 1880px) to accommodate all 6 sections
  canvas.width = 1200;
  canvas.height = 1880;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  const logoUrl = settings?.logoUrl && settings.logoUrl.trim() !== '' && settings.logoUrl !== '/logo.png'
    ? settings.logoUrl
    : OFFICIAL_NNEPEF_LOGO;

  const [logoImg, photoImg, sigImg] = await Promise.all([
    loadHtmlImage(logoUrl, [OFFICIAL_NNEPEF_LOGO, '/logo.png', '/logo.jpg']),
    loadHtmlImage(member.passportUrl || member.passportPhotoUrl),
    loadHtmlImage((settings as any)?.signatureUrl || OFFICIAL_SECRETARY_SIGNATURE, [OFFICIAL_SECRETARY_SIGNATURE, '/secretary-signature.png', '/secretary-signature.jpg'])
  ]);

  const isApproved = member.status === 'approved' || (member.status as string) === 'Active';
  const verificationCode = member.verificationCode || member.applicationReference || `VER-${member.id.substring(0, 8).toUpperCase()}`;
  const formattedId = formatFourDigitMembershipId(member.membershipId);
  const displayId = formattedId || (member.applicationReference ? `REF-${member.applicationReference}` : 'PENDING ASSIGNMENT');

  // 1. Background Fill
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 1200, 1880);

  // 2. Central Watermark
  if (logoImg) {
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.drawImage(logoImg, 350, 650, 500, 500);
    ctx.restore();
  }

  // 3. Top Decorative Brand Bars
  ctx.fillStyle = '#0A2E73';
  ctx.fillRect(0, 0, 1200, 14);
  ctx.fillStyle = '#2EA3F2';
  ctx.fillRect(0, 14, 1200, 8);

  // 4. Header: Logo, Organization Title, Subtitle, Motto
  if (logoImg) {
    ctx.drawImage(logoImg, 60, 50, 110, 110);
  }

  ctx.textAlign = 'left';
  ctx.font = 'bold 36px Georgia, serif';
  ctx.fillStyle = '#0A2E73';
  ctx.fillText(settings?.forumName || 'N-NEPEF 2020', 190, 88);

  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillStyle = '#1E293B';
  ctx.fillText('NORTHERN NIGERIAN ELECTRICAL PRACTITIONERS AND ENGINEERS FORUM', 190, 115);

  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillStyle = '#B45309';
  ctx.fillText('UNITY • PROFESSIONALISM • EXCELLENCE', 190, 138);

  ctx.font = '11px Arial, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText(`National Secretariat: ${settings?.headquarters || 'No. 2 Gwarzo Road, Kano State, Nigeria'} • +234 906 343 5546 • nepef.org.ng`, 190, 160);

  // Right Header Ref
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#0F172A';
  ctx.fillText(`DOSSIER REF: ${verificationCode}`, 1140, 100);
  ctx.font = '11.5px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText(`Date: ${new Date().toLocaleDateString('en-GB')}`, 1140, 125);

  // Divider Line
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 185);
  ctx.lineTo(1140, 185);
  ctx.stroke();

  // 5. Title Banner
  ctx.fillStyle = '#0A2E73';
  drawCanvasRoundRect(ctx, 60, 205, 1080, 50, 10);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('OFFICIAL MEMBER REGISTRATION & VERIFICATION DOSSIER', 600, 237);

  // 6. Top Card: Summary & Passport Photo
  const topCardY = 275;
  const topCardH = 220;
  const photoW = 160;
  const photoH = 190;
  const photoX = 1140 - photoW - 15;
  const photoY = topCardY + 15;

  // Left Summary Box
  const summaryW = photoX - 60 - 20;
  ctx.fillStyle = '#F8FAFC';
  drawCanvasRoundRect(ctx, 60, topCardY, summaryW, topCardH, 12);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText((member.fullName || 'Registered Member').toUpperCase(), 85, topCardY + 42);

  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillStyle = '#0A2E73';
  ctx.fillText(`Designation: ${member.position || 'Registered Member'}`, 85, topCardY + 70);

  ctx.font = '13px Arial, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('Membership ID: ', 85, topCardY + 102);
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#0A2E73';
  ctx.fillText(displayId, 210, topCardY + 102);

  ctx.font = '13px Arial, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(`Application Ref: ${member.applicationReference || member.id}`, 85, topCardY + 132);

  ctx.fillText('Membership Status: ', 85, topCardY + 162);
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = isApproved ? '#059669' : '#D97706';
  ctx.fillText(isApproved ? 'APPROVED / ACTIVE' : (member.status || 'PENDING').toUpperCase(), 245, topCardY + 162);

  ctx.font = '11px Arial, sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText(`Registered: ${new Date(member.registeredAt || Date.now()).toLocaleDateString('en-GB')}`, 85, topCardY + 192);

  // Passport Photo Box
  drawCanvasRoundRect(ctx, photoX, photoY, photoW, photoH, 8);
  ctx.fillStyle = '#F1F5F9';
  ctx.fill();
  ctx.strokeStyle = '#0A2E73';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (photoImg) {
    ctx.save();
    drawCanvasRoundRect(ctx, photoX + 3, photoY + 3, photoW - 6, photoH - 6, 6);
    ctx.clip();
    ctx.drawImage(photoImg, photoX + 3, photoY + 3, photoW - 6, photoH - 6);
    ctx.restore();
  } else {
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PASSPORT', photoX + photoW / 2, photoY + photoH / 2 - 5);
    ctx.fillText('PHOTO', photoX + photoW / 2, photoY + photoH / 2 + 10);
  }

  // Helper function for Sections
  let curY = topCardY + topCardH + 20;

  const drawSectionHeader = (title: string) => {
    ctx.fillStyle = '#0A2E73';
    ctx.fillRect(60, curY, 6, 26);

    ctx.textAlign = 'left';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillStyle = '#0A2E73';
    ctx.fillText(title, 76, curY + 18);
    curY += 34;
  };

  const drawTable = (rows: [string, string, string, string][]) => {
    const rH = 34;
    rows.forEach((r, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      ctx.fillRect(60, curY, 1080, rH);

      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, curY + rH);
      ctx.lineTo(1140, curY + rH);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = 'bold 10.5px monospace';
      ctx.fillStyle = '#64748B';
      ctx.fillText(r[0], 75, curY + 22);

      ctx.font = '12px Arial, sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText(r[1] || '—', 240, curY + 22);

      ctx.font = 'bold 10.5px monospace';
      ctx.fillStyle = '#64748B';
      ctx.fillText(r[2], 640, curY + 22);

      ctx.font = '12px Arial, sans-serif';
      ctx.fillStyle = '#0F172A';
      ctx.fillText(r[3] || '—', 840, curY + 22);

      curY += rH;
    });

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    drawCanvasRoundRect(ctx, 60, curY - rows.length * rH, 1080, rows.length * rH, 8);
    ctx.stroke();

    curY += 16;
  };

  // Section 1: Personal & Contact
  drawSectionHeader('1. PERSONAL & CONTACT INFORMATION');
  drawTable([
    ['Full Name:', member.fullName || '—', 'Gender:', member.gender || '—'],
    ['Date of Birth:', member.dob || member.dateOfBirth || '—', 'Phone Number:', member.phone || '—'],
    ['Alternative Phone:', member.altPhone || member.alternativePhone || 'None', 'Nationality:', member.nationality || 'Nigerian'],
    ['State of Chapter:', `${member.state} State`, 'Local Govt (LGA):', member.lga || '—'],
    ['Resident Address:', member.address || member.residentialAddress || '—', 'Email:', member.email || 'None']
  ]);

  // Section 2: Official Membership & Secretariat Records
  drawSectionHeader('2. OFFICIAL MEMBERSHIP & SECRETARIAT RECORDS');
  drawTable([
    ['Application Ref:', member.applicationReference || member.id, 'Verification Code:', verificationCode],
    ['Assigned Member ID:', displayId, 'Membership Status:', isApproved ? 'Active / Approved' : 'Pending Verification'],
    ['Membership Type:', member.membershipType || 'Full Member', 'Chapter State:', `${member.state} State`]
  ]);

  // Section 3: Educational Background
  drawSectionHeader('3. EDUCATIONAL BACKGROUND');
  drawTable([
    ['Highest Qualification:', member.highestQualification || member.qualification || '—', 'Course / Study:', member.courseOfStudy || '—'],
    ['Institution / School:', member.institution || '—', 'Graduation Year:', member.graduationYear || '—'],
    ['Other Qualifications:', member.otherQualifications || 'None', 'Professional Certs:', member.professionalCertificates || 'None']
  ]);

  // Section 4: Electrical Professional Profile
  drawSectionHeader('4. ELECTRICAL PROFESSIONAL PROFILE');
  drawTable([
    ['Current Occupation:', member.occupation || '—', 'Company / Employer:', member.company || '—'],
    ['Main Specialization:', member.specialization || '—', 'Years of Experience:', `${member.yearsOfExperience || 0} Years`],
    ['Other Skills:', member.otherSkills || 'None', 'License / Cert No:', member.licenseNumber || 'None']
  ]);

  // Section 5: Next of Kin
  drawSectionHeader('5. NEXT OF KIN INFORMATION');
  drawTable([
    ['Next of Kin Name:', member.nextOfKin?.name || '—', 'Relationship:', member.nextOfKin?.relation || '—'],
    ['Next of Kin Phone:', member.nextOfKin?.phone || '—', 'Next of Kin Alt Phone:', member.nextOfKin?.altPhone || 'None'],
    ['Next of Kin Address:', member.nextOfKin?.address || '—', '', '']
  ]);

  // Section 6: Official Secretariat Verification & Authorization Box
  const authBoxH = 175;
  ctx.fillStyle = '#F8FAFC';
  drawCanvasRoundRect(ctx, 60, curY, 1080, authBoxH, 12);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillStyle = '#0A2E73';
  ctx.fillText('OFFICIAL SECRETARIAT VERIFICATION & AUTHORIZATION', 85, curY + 30);

  ctx.font = '11.5px Arial, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText(`Approved By: ${member.approvedBy || (isApproved ? 'Super Admin Secretariat' : 'Pending Authorization')}`, 85, curY + 60);
  ctx.fillText(`Approval Date: ${member.approvedAt ? new Date(member.approvedAt).toLocaleDateString('en-GB') : (isApproved ? 'Confirmed' : 'Pending')}`, 85, curY + 84);
  ctx.fillText(`Verification Ref: ${verificationCode}`, 85, curY + 108);
  ctx.fillText(`Printed On: ${new Date().toLocaleString('en-GB')} • Doc Ref: NNEPEF-DOSSIER-${member.id.substring(0, 8).toUpperCase()}`, 85, curY + 132);

  // Secretary Signature on Right
  const authSigX = 840;
  if (sigImg) {
    ctx.drawImage(sigImg, authSigX, curY + 15, 200, 65);
  }

  ctx.strokeStyle = '#0A2E73';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(authSigX - 20, curY + 95);
  ctx.lineTo(authSigX + 220, curY + 95);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillStyle = '#0F172A';
  ctx.fillText('Engr. Hussaini Ali', authSigX + 100, curY + 118);

  ctx.font = 'bold 12px Arial, sans-serif';
  ctx.fillStyle = '#0A2E73';
  ctx.fillText('Secretary General, N-NEPEF 2020', authSigX + 100, curY + 138);

  // Footer
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 1830);
  ctx.lineTo(1140, 1830);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = '10px monospace';
  ctx.fillStyle = '#64748B';
  ctx.fillText(
    'This official dossier is generated from the central N-NEPEF 2020 database repository. Verification: https://nepef.org.ng/verify',
    600,
    1852
  );

  return canvas;
}

/**
 * Downloads Admin Membership Details (Bio-Data Dossier) as an optimized high-quality image (JPG)
 */
export async function downloadMemberDetailsImage(member: Member, settings?: ForumSettings): Promise<void> {
  const canvas = await generateMemberDetailsCanvas(member, settings);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
  const cleanId = (member.membershipId || member.fullName || 'Member').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `NNEPEF-MemberDetails-${cleanId}.jpg`;
  await downloadFileSafely(dataUrl, filename);
}
