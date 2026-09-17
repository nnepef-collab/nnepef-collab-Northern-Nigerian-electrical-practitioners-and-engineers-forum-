import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { Member, ForumSettings } from '../types';
import { OFFICIAL_NNEPEF_LOGO, OFFICIAL_ID_CARD_LOGO } from '../constants/logo';
import { OFFICIAL_SECRETARY_SIGNATURE } from '../constants/signature';
import { downloadFileSafely, DEFAULT_AVATAR_SVG, getCachedBase64Image, loadHtmlImageFast } from '../utils/imageHelpers';
import {
  generateOfficialSlipCanvas,
  downloadApprovalSlipImage,
  downloadRegistrationSlipImage,
  generateMemberDetailsCanvas,
  downloadMemberDetailsImage
} from './slipImageService';

export {
  generateOfficialSlipCanvas,
  downloadApprovalSlipImage,
  downloadRegistrationSlipImage,
  generateMemberDetailsCanvas,
  downloadMemberDetailsImage
};

/**
 * Safely loads an image as base64 data URL for embedding into jsPDF using memory cache
 */
async function getBase64ImageFromUrl(url: string | undefined | null, fallbacks: string[] = []): Promise<string | null> {
  const result = await getCachedBase64Image(url, fallbacks);
  return result && result.startsWith('data:') ? result : null;
}

/**
 * Downloads official Member Details (Bio-Data Dossier) as an optimized high-quality image
 */
export async function downloadMemberProfilePdf(member: Member, settings?: ForumSettings): Promise<void> {
  // Delegate directly to optimized image download
  await downloadMemberDetailsImage(member, settings);
}

/**
 * Legacy PDF generator retained for explicit PDF export needs
 */
export async function generateMemberProfilePdfLegacy(member: Member, settings?: ForumSettings): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = margin;

  // 1. Top Decorative Brand Bar
  doc.setFillColor(10, 46, 115); // Deep Blue #0A2E73
  doc.rect(0, 0, pageWidth, 8, 'F');
  doc.setFillColor(46, 163, 242); // Sky Blue #2EA3F2
  doc.rect(0, 8, pageWidth, 2, 'F');

  currentY = 16;

  // 2. Official Header with Logo
  const logoData = await getBase64ImageFromUrl(settings?.logoUrl || OFFICIAL_NNEPEF_LOGO, [
    OFFICIAL_NNEPEF_LOGO,
    '/logo.png',
    '/logo.jpg',
    '/nnepef-logo.png'
  ]);
  if (logoData) {
    try {
      const format = logoData.includes('image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(logoData, format, margin, currentY, 20, 20);
    } catch (e) {
      console.warn('[PDF Service] Logo render fallback:', e);
    }
  }

  // Header Title
  const headerLeft = logoData ? margin + 24 : margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(10, 46, 115);
  doc.text(settings?.forumName || 'N-NEPEF 2020', headerLeft, currentY + 5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(70, 80, 95);
  doc.text('NORTHERN NIGERIAN ELECTRICAL PRACTITIONERS AND ENGINEERS FORUM', headerLeft, currentY + 10);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 110, 125);
  doc.text(`National Secretariat: ${settings?.headquarters || 'Kano State, Nigeria'} • Phone: ${settings?.contactPhone || '+234 802 333 3937'}`, headerLeft, currentY + 15);
  doc.text(`Official Web Portal: nnepef.org.ng • Email: ${settings?.contactEmail || 'contact@nnepef.org.ng'}`, headerLeft, currentY + 19);

  currentY += 25;

  // Divider line
  doc.setDrawColor(200, 215, 230);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  currentY += 6;

  // Document Title Banner
  doc.setFillColor(240, 246, 255);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(10, 46, 115);
  doc.text('OFFICIAL MEMBER REGISTRATION & VERIFICATION DOSSIER', pageWidth / 2, currentY + 6.5, { align: 'center' });

  currentY += 14;

  // 3. Top Card: Passport Photo + Key Identifiers Box
  const photoWidth = 32;
  const photoHeight = 40;
  const photoX = pageWidth - margin - photoWidth;
  const photoY = currentY;

  // Draw Photo Frame
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(180, 195, 210);
  doc.setLineWidth(0.6);
  doc.rect(photoX, photoY, photoWidth, photoHeight, 'FD');

  // Load Passport Image
  const photoData = await getBase64ImageFromUrl(member.passportUrl || member.passportPhotoUrl);
  if (photoData) {
    try {
      doc.addImage(photoData, 'JPEG', photoX + 1, photoY + 1, photoWidth - 2, photoHeight - 2);
    } catch (e) {
      console.warn('[PDF Service] Passport photo load failed:', e);
      doc.setFontSize(7.5);
      doc.setTextColor(120, 130, 140);
      doc.text('PHOTO', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
    }
  } else {
    doc.setFontSize(7.5);
    doc.setTextColor(120, 130, 140);
    doc.text('PASSPORT\nPHOTO', photoX + photoWidth / 2, photoY + photoHeight / 2 - 2, { align: 'center' });
  }

  // Left Details: Full Name, Status, Membership ID
  const summaryBoxWidth = photoX - margin - 4;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, summaryBoxWidth, photoHeight, 2, 2, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, summaryBoxWidth, photoHeight, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(member.fullName || 'N/A', margin + 5, currentY + 8);

  // Position Badge
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 46, 115);
  doc.text(`Designation: ${member.position || 'Registered Member'}`, margin + 5, currentY + 14);

  // Status & Membership ID
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  
  const statusColor = (member.status === 'approved' || member.status === 'Active') ? [16, 185, 129] : [245, 158, 11];
  doc.text(`Membership ID: `, margin + 5, currentY + 20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 46, 115);
  doc.text(member.membershipId || 'PENDING ASSIGNMENT (By Admin)', margin + 30, currentY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(`Application Ref: ${member.applicationReference || member.id}`, margin + 5, currentY + 26);
  doc.text(`Membership Status: `, margin + 5, currentY + 32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text((member.status || 'pending').toUpperCase(), margin + 35, currentY + 32);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.text(`Registered: ${new Date(member.registeredAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, margin + 5, currentY + 37);

  currentY += photoHeight + 6;

  // Helper function to draw section header
  const drawSectionHeader = (title: string) => {
    doc.setFillColor(10, 46, 115);
    doc.rect(margin, currentY, 3, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(10, 46, 115);
    doc.text(title, margin + 5, currentY + 4);
    currentY += 6;
  };

  // Helper function for 2-column info tables
  const drawInfoTable = (data: [string, string, string, string][]) => {
    const colWidth1 = 38;
    const colWidth2 = 54;
    const colWidth3 = 38;
    const colWidth4 = 52;
    const rowHeight = 6;

    data.forEach((row) => {
      doc.setFillColor(252, 253, 255);
      doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F');
      doc.setDrawColor(235, 240, 245);
      doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

      // Col 1 & 2
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(row[0], margin + 2, currentY + 4);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(row[1] || '—', margin + colWidth1, currentY + 4);

      // Col 3 & 4
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(row[2], margin + colWidth1 + colWidth2 + 2, currentY + 4);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(row[3] || '—', margin + colWidth1 + colWidth2 + colWidth3, currentY + 4);

      currentY += rowHeight;
    });
    currentY += 3;
  };

  // Section A: Personal & Contact Information
  drawSectionHeader('1. PERSONAL & CONTACT INFORMATION');
  drawInfoTable([
    ['Full Name:', member.fullName || '—', 'Gender:', member.gender || '—'],
    ['Date of Birth:', member.dob || member.dateOfBirth || '—', 'Phone Number:', member.phone || '—'],
    ['Alternative Phone:', member.altPhone || member.alternativePhone || 'None', 'Nationality:', member.nationality || 'Nigerian'],
    ['State of Chapter:', `${member.state} State`, 'Local Govt (LGA):', member.lga || '—'],
    ['Resident Address:', member.address || member.residentialAddress || '—', 'Email (Optional):', member.email || 'None']
  ]);

  // Section B: Official Membership & Secretariat Records
  drawSectionHeader('2. OFFICIAL MEMBERSHIP & SECRETARIAT RECORDS');
  drawInfoTable([
    ['Application Ref:', member.applicationReference || member.id, 'Verification Code:', member.verificationCode || 'VERIFIED'],
    ['Assigned Member ID:', member.membershipId || 'Pending Admin Allocation', 'Membership Status:', (member.status === 'approved' ? 'Active / Approved' : 'Pending Verification')],
    ['Membership Type:', member.membershipType || 'Full Member', 'Chapter State:', `${member.state} State`]
  ]);

  // Section C: Educational Background
  drawSectionHeader('3. EDUCATIONAL BACKGROUND');
  drawInfoTable([
    ['Highest Qualification:', member.highestQualification || member.qualification || '—', 'Course / Study:', member.courseOfStudy || '—'],
    ['Institution / School:', member.institution || '—', 'Graduation Year:', member.graduationYear || '—'],
    ['Other Qualifications:', member.otherQualifications || 'None', 'Professional Certs:', member.professionalCertificates || 'None']
  ]);

  // Section D: Electrical Professional Profile
  drawSectionHeader('4. ELECTRICAL PROFESSIONAL PROFILE');
  drawInfoTable([
    ['Current Occupation:', member.occupation || '—', 'Company / Employer:', member.company || '—'],
    ['Main Specialization:', member.specialization || '—', 'Years of Experience:', `${member.yearsOfExperience || 0} Years`],
    ['Other Skills:', member.otherSkills || 'None', 'License / Cert No:', member.licenseNumber || 'None']
  ]);

  // Section E: Next of Kin
  drawSectionHeader('5. NEXT OF KIN INFORMATION');
  drawInfoTable([
    ['Next of Kin Name:', member.nextOfKin?.name || '—', 'Relationship:', member.nextOfKin?.relation || '—'],
    ['Next of Kin Phone:', member.nextOfKin?.phone || '—', 'Next of Kin Alt Phone:', member.nextOfKin?.altPhone || 'None'],
    ['Next of Kin Address:', member.nextOfKin?.address || '—', '', '']
  ]);

  // Section F: Official Approval & Verification Footer Box
  if (currentY > pageHeight - 35) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 28, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 28, 2, 2, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(10, 46, 115);
  doc.text('OFFICIAL SECRETARIAT VERIFICATION & AUTHORIZATION', margin + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Approved By: ${member.approvedBy || (member.status === 'approved' ? 'Super Admin Secretariat' : 'Pending Authorization')}`, margin + 4, currentY + 10);
  doc.text(`Approval Date: ${member.approvedAt ? new Date(member.approvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (member.status === 'approved' ? 'Confirmed' : 'Pending')}`, margin + 4, currentY + 14);
  doc.text(`Verification Ref: ${member.verificationCode || member.applicationReference || member.id}`, margin + 4, currentY + 18);
  doc.text(`Printed On: ${new Date().toLocaleString('en-GB')} • Doc Ref: NNEPEF-SLIP-${member.id.substring(0, 8).toUpperCase()}`, margin + 4, currentY + 22);

  // Dedicated Secretary General Signature Block
  const sigX = pageWidth - margin - 55;
  const sigData = await getBase64ImageFromUrl(OFFICIAL_SECRETARY_SIGNATURE, [
    OFFICIAL_SECRETARY_SIGNATURE,
    '/secretary-signature.png',
    '/secretary-signature.jpg'
  ]);
  if (sigData) {
    try {
      const sigFormat = sigData.includes('image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(sigData, sigFormat, sigX + 2, currentY + 2, 40, 14);
    } catch (e) {
      console.warn('[PDF Service] Signature render notice:', e);
    }
  }

  doc.setDrawColor(10, 46, 115);
  doc.setLineWidth(0.5);
  doc.line(sigX, currentY + 18, sigX + 46, currentY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Engr. Hussaini Ali', sigX + 23, currentY + 21.5, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setTextColor(10, 46, 115);
  doc.text('Secretary General, N-NEPEF 2020', sigX + 23, currentY + 25, { align: 'center' });

  // Footer
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This official document is generated from the central N-NEPEF 2020 database repository. Verification: https://nepef.org.ng/verify', pageWidth / 2, pageHeight - 4, { align: 'center' });

  // Save the PDF
  const filename = `NNEPEF-OfficialSlip-${(member.membershipId || member.fullName || 'Member').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(filename);
}

/**
 * Generates and downloads the Official Members List PDF Report
 */
export async function downloadMembersListPdf(
  members: Member[],
  title: string = 'OFFICIAL REGISTERED MEMBERS DIRECTORY',
  filterDescription?: string,
  settings?: ForumSettings
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // 1. Header Bar
  doc.setFillColor(10, 46, 115);
  doc.rect(0, 0, pageWidth, 7, 'F');
  doc.setFillColor(46, 163, 242);
  doc.rect(0, 7, pageWidth, 1.5, 'F');

  let currentY = 14;

  // Logo if available
  const logoData = await getBase64ImageFromUrl(settings?.logoUrl || OFFICIAL_NNEPEF_LOGO);
  if (logoData) {
    try {
      doc.addImage(logoData, 'PNG', margin, currentY, 14, 14);
    } catch (e) {}
  }

  const headerLeft = logoData ? margin + 17 : margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(10, 46, 115);
  doc.text(settings?.forumName || 'N-NEPEF 2020', headerLeft, currentY + 4);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(70, 80, 95);
  doc.text('NORTHERN NIGERIAN ELECTRICAL PRACTITIONERS AND ENGINEERS FORUM', headerLeft, currentY + 8);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 110, 125);
  doc.text(`Central Member Database Report • Generated: ${new Date().toLocaleString('en-GB')}`, headerLeft, currentY + 12);

  currentY += 17;

  // Document Title Box
  doc.setFillColor(240, 246, 255);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 8, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(10, 46, 115);
  doc.text(title.toUpperCase(), margin + 5, currentY + 5.5);

  const approvedCount = members.filter(m => m.status === 'approved' || m.status === 'Active').length;
  const pendingCount = members.filter(m => m.status === 'pending' || m.status === 'Pending').length;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const statsText = `Total Listed: ${members.length}  |  Approved: ${approvedCount}  |  Pending: ${pendingCount}${filterDescription ? `  |  Filter: ${filterDescription}` : ''}`;
  doc.text(statsText, pageWidth - margin - 5, currentY + 5.5, { align: 'right' });

  currentY += 11;

  // Table Data
  const tableRows = members.map((m, index) => [
    index + 1,
    m.fullName || '—',
    m.phone || '—',
    m.state || '—',
    m.lga || '—',
    m.position || 'Member',
    m.specialization || m.occupation || '—',
    m.membershipId || 'PENDING',
    (m.status || 'pending').toUpperCase()
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 12 },
    head: [['S/N', 'Full Name', 'Phone Number', 'State', 'LGA', 'Position', 'Specialization', 'Membership ID', 'Status']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [10, 46, 115],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 46, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 22 },
      4: { cellWidth: 24 },
      5: { cellWidth: 32 },
      6: { cellWidth: 44 },
      7: { cellWidth: 38, fontStyle: 'bold', textColor: [10, 46, 115] },
      8: { cellWidth: 20, fontStyle: 'bold' }
    },
    didDrawPage: (data) => {
      // Page Number & Footer
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${data.pageNumber} of ${doc.getNumberOfPages()} • N-NEPEF 2020 Official Portal (nepef.org.ng)`,
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }
  });

  const filename = `NNEPEF-Members-List-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Generates and downloads the Official Membership Approval / Registration Slip as an image
 */
export async function downloadApprovalSlipPdf(member: Member, settings?: ForumSettings): Promise<void> {
  if (member.status === 'approved' || (member.status as string) === 'Active') {
    await downloadApprovalSlipImage(member, settings);
  } else {
    await downloadRegistrationSlipImage(member, settings);
  }
}

/**
 * Legacy PDF generator for approval slip
 */
export async function generateApprovalSlipPdfLegacy(member: Member, settings?: ForumSettings): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  let currentY = 12;

  // 1. Top Decorative Brand Bars
  doc.setFillColor(10, 46, 115); // Deep Navy #0A2E73
  doc.rect(0, 0, pageWidth, 8, 'F');
  doc.setFillColor(46, 163, 242); // Sky Blue #2EA3F2
  doc.rect(0, 8, pageWidth, 2.5, 'F');

  currentY = 18;

  // 2. Header: Logo + Organization Title + Info
  const logoData = await getBase64ImageFromUrl(settings?.logoUrl || OFFICIAL_NNEPEF_LOGO, [
    OFFICIAL_NNEPEF_LOGO,
    '/logo.png',
    '/logo.jpg',
    '/nnepef-logo.png'
  ]);
  if (logoData) {
    try {
      const format = logoData.includes('image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(logoData, format, margin, currentY, 22, 22);
    } catch (e) {
      console.warn('[PDF Service] Logo render fallback:', e);
    }
  }

  const headerLeft = logoData ? margin + 26 : margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(10, 46, 115);
  doc.text(settings?.forumName || 'N-NEPEF 2020', headerLeft, currentY + 6);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('NORTHERN NIGERIAN ELECTRICAL PRACTITIONERS AND ENGINEERS FORUM', headerLeft, currentY + 11);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9);
  doc.text('UNITY • PROFESSIONALISM • EXCELLENCE', headerLeft, currentY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`National Secretariat: ${settings?.headquarters || 'No. 2 Gwarzo Road, Kano State, Nigeria'} • +234 906 343 5546 • nepef.org.ng`, headerLeft, currentY + 20);

  currentY += 28;

  // 3. Document Title Ribbon
  doc.setFillColor(10, 46, 115);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(255, 255, 255);
  doc.text('OFFICIAL MEMBERSHIP APPROVAL & REGISTRATION SLIP', pageWidth / 2, currentY + 6.8, { align: 'center' });

  currentY += 16;

  // 4. Member Main Profile Box (Photo on left, Key Details on right)
  const photoW = 34;
  const photoH = 42;
  const photoX = margin + 4;
  const photoY = currentY + 4;

  const boxW = pageWidth - margin * 2;
  const boxH = 50;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, boxW, boxH, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, currentY, boxW, boxH, 3, 3, 'S');

  // Draw Passport Frame
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(10, 46, 115);
  doc.setLineWidth(0.6);
  doc.rect(photoX, photoY, photoW, photoH, 'FD');

  const photoData = await getBase64ImageFromUrl(member.passportUrl || member.passportPhotoUrl);
  if (photoData) {
    try {
      doc.addImage(photoData, 'JPEG', photoX + 1, photoY + 1, photoW - 2, photoH - 2);
    } catch (e) {
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('PASSPORT\nPHOTO', photoX + photoW / 2, photoY + photoH / 2 - 2, { align: 'center' });
    }
  } else {
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('PASSPORT\nPHOTO', photoX + photoW / 2, photoY + photoH / 2 - 2, { align: 'center' });
  }

  // Member Identity Information
  const infoX = photoX + photoW + 8;
  let infoY = currentY + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(member.fullName || 'Registered Member', infoX, infoY);

  infoY += 7;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 46, 115);
  doc.text(`Membership ID: `, infoX, infoY);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.text(member.membershipId || 'PENDING ASSIGNMENT', infoX + 32, infoY);

  infoY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Designation: `, infoX, infoY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(member.position || 'Practicing Member', infoX + 26, infoY);

  infoY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`State Chapter: `, infoX, infoY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${member.state} State ${member.lga ? `(${member.lga} LGA)` : ''}`, infoX + 26, infoY);

  infoY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Verification Ref: `, infoX, infoY);
  doc.setFont('courier', 'bold');
  doc.setTextColor(10, 46, 115);
  doc.text(member.verificationCode || member.applicationReference || member.id, infoX + 26, infoY);

  infoY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Status: `, infoX, infoY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('OFFICIALLY APPROVED / ACTIVE', infoX + 26, infoY);

  currentY += boxH + 8;

  // 5. Detailed Particulars Table
  const tableData = [
    ['Full Legal Name:', member.fullName || '—', 'Gender / DOB:', `${member.gender || '—'} / ${member.dob || member.dateOfBirth || '—'}`],
    ['Phone Number:', member.phone || '—', 'Email Address:', member.email || 'None'],
    ['Specialization:', member.specialization || member.occupation || 'Electrical Engineering', 'Years of Exp:', `${member.yearsOfExperience || 0} Years`],
    ['Residential Address:', member.address || member.residentialAddress || '—', 'Nationality:', member.nationality || 'Nigerian'],
    ['Chapter & State:', `${member.state || 'Kano'} State Chapter`, 'Approval Date:', member.approvedAt ? new Date(member.approvedAt).toLocaleDateString('en-GB') : 'Confirmed']
  ];

  const col1W = 38;
  const col2W = 54;
  const col3W = 38;
  const col4W = 48;
  const rowH = 7;

  tableData.forEach((row) => {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, currentY, pageWidth - margin * 2, rowH, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY + rowH, pageWidth - margin, currentY + rowH);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(row[0], margin + 2, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(row[1], margin + col1W, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(row[2], margin + col1W + col2W + 2, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(row[3], margin + col1W + col2W + col3W, currentY + 4.5);

    currentY += rowH;
  });

  currentY += 12;

  // 6. Security Seal & Dedicated Secretary General Signature Box
  const footerBoxH = 45;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, footerBoxH, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, footerBoxH, 2, 2, 'S');

  // Left side: Verification Information
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(10, 46, 115);
  doc.text('OFFICIAL VERIFICATION & AUTHENTICITY', margin + 4, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(`Digital Verification URL: nepef.org.ng/verify`, margin + 4, currentY + 12);
  doc.text(`Verification Ref: ${member.verificationCode || member.applicationReference || member.id}`, margin + 4, currentY + 17);
  doc.text(`Issuing Authority: N-NEPEF National Secretariat`, margin + 4, currentY + 22);
  doc.text(`Security Level: Tier-1 Verified Practitioner Record`, margin + 4, currentY + 27);
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, margin + 4, currentY + 32);

  // Right side: Dedicated Secretary General Signature Area
  const sigBoxX = pageWidth - margin - 60;
  const sigBoxY = currentY + 4;

  const sigData = await getBase64ImageFromUrl(OFFICIAL_SECRETARY_SIGNATURE, [
    OFFICIAL_SECRETARY_SIGNATURE,
    '/secretary-signature.png',
    '/secretary-signature.jpg'
  ]);
  if (sigData) {
    try {
      const sigFormat = sigData.includes('image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(sigData, sigFormat, sigBoxX + 2, sigBoxY, 44, 20);
    } catch (e) {
      console.warn('[PDF Service] Signature render error:', e);
    }
  }

  // Signature Line
  doc.setDrawColor(10, 46, 115);
  doc.setLineWidth(0.6);
  doc.line(sigBoxX, currentY + 25, sigBoxX + 50, currentY + 25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Engr. Hussaini Ali', sigBoxX + 25, currentY + 29, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(10, 46, 115);
  doc.text('Secretary General', sigBoxX + 25, currentY + 33, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text('N-NEPEF 2020 National Secretariat', sigBoxX + 25, currentY + 37, { align: 'center' });

  // 7. Page Bottom Notice
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'This official document is generated from the central N-NEPEF 2020 Supabase database repository. Tampering or forgery is strictly punishable under law.',
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' }
  );

  const filename = `NNEPEF-ApprovalSlip-${(member.membershipId || member.fullName || 'Member').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(filename);
}

/**
 * Helper to safely draw rounded rectangles on canvas
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
 * Safe circular avatar fallback for canvas
 */
function drawCanvasCircularAvatar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#94A3B8';
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.18, r * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.85, r * 0.68, Math.PI, 0);
  ctx.fill();
  ctx.restore();
}

/**
 * Loads an image from base64 or URL safely into an HTMLImageElement
 */
/**
 * Determines whether a member position requires the executive Red/Magenta bottom swoop
 * RULE 1: POSITION = MEMBER -> BLUE bottom ONLY
 * RULE 2: POSITION != MEMBER (SECRETARY, CHAIRMAN, TREASURER, etc.) -> BLUE + RED/MAGENTA bottom
 */
export function hasExecutiveColoredBottom(position?: string | null): boolean {
  if (!position) return false;
  const p = position.trim().toUpperCase();
  if (p === 'MEMBER' || p === 'ORDINARY MEMBER' || p === 'PRACTICING MEMBER' || p === 'GENERAL MEMBER') {
    return false;
  }
  return true;
}

/**
 * Calculates a member's expiry date as exactly 2 years after issued or approval date.
 */
export function calculateTwoYearExpiryDate(issueDateStr?: string | null): string {
  const base = issueDateStr ? new Date(issueDateStr) : new Date();
  const validBase = isNaN(base.getTime()) ? new Date() : base;
  const exp = new Date(validBase);
  exp.setFullYear(exp.getFullYear() + 2);
  return exp.toISOString().split('T')[0];
}

/**
 * Ensures the Membership ID number is cleanly formatted (e.g. NNEPEF/KN/001).
 * If the trailing sequence has fewer than 3 digits (e.g. NNEPEF/KN/1), it pads to 3 digits (e.g. NNEPEF/KN/001).
 * If it has 3 or 4 digits already (e.g. NNEPEF/KN/001 or NNEPEF/KN/0021), it preserves them cleanly.
 */
export function formatFourDigitMembershipId(idStr?: string | null): string {
  if (!idStr || typeof idStr !== 'string') return '';
  const trimmed = idStr.trim().toUpperCase();
  if (!trimmed) return '';

  // If ends with a delimiter (/ or -) followed by digits, e.g. "NNEPEF/KN/1" or "NNEPEF/KN/001"
  const match = trimmed.match(/^(.*[\/\-])(\d+)$/);
  if (match) {
    const prefix = match[1];
    const digits = match[2];
    if (digits.length < 3) {
      return `${prefix}${digits.padStart(3, '0')}`;
    }
    return trimmed;
  }

  // If purely numeric e.g. "1" or "42"
  if (/^\d+$/.test(trimmed) && trimmed.length < 3) {
    return trimmed.padStart(3, '0');
  }

  return trimmed;
}

/**
 * Formats expiry date to standard card presentation (e.g. 11TH SEPTEMBER 2028).
 * Automatically calculates exactly 2 years from member.issueDate if dateStr is missing or invalid.
 */
export function formatCardExpiry(dateStr?: string | null, issueDateStr?: string | null): string {
  let clean = (dateStr && dateStr.trim()) || '';
  if (!clean || clean === 'N/A') {
    clean = calculateTwoYearExpiryDate(issueDateStr);
  }

  // Strip any leading "EXPIRES:" prefix if present
  clean = clean.replace(/^EXPIRES:\s*/i, '').trim();

  // Strip ISO time component e.g. "2028-09-10T00:00:00+00:00" -> "2028-09-10"
  if (clean.includes('T')) {
    clean = clean.split('T')[0];
  }

  const months = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  // If already formatted with month name e.g. "11TH SEPTEMBER 2028"
  const upper = clean.toUpperCase();
  if (months.some(m => upper.includes(m))) {
    return upper;
  }

  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    let year = parts[0];
    let month = parseInt(parts[1], 10);
    let day = parseInt(parts[2], 10);

    if (year.length <= 2 && parts[2].length === 4) {
      year = parts[2];
      day = parseInt(parts[0], 10);
    }

    const getOrdinal = (n: number) => {
      const s = ['TH', 'ST', 'ND', 'RD'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    if (months[month - 1] && !isNaN(day) && !isNaN(month)) {
      return `${getOrdinal(day)} ${months[month - 1]} ${year}`;
    }
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const day = parsed.getDate();
    const month = parsed.getMonth();
    const year = parsed.getFullYear();
    const getOrdinal = (n: number) => {
      const s = ['TH', 'ST', 'ND', 'RD'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    return `${getOrdinal(day)} ${months[month]} ${year}`;
  }

  return clean.toUpperCase();
}

/**
 * Loads an image from base64 or URL safely into an HTMLImageElement
 */
async function loadHtmlImage(url: string | null | undefined, fallbacks: string[] = []): Promise<HTMLImageElement | null> {
  const base64 = await getBase64ImageFromUrl(url, fallbacks);
  if (!base64) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = base64;
  });
}

/**
 * Captures an exact, razor-sharp HTML5 Canvas directly from the rendered DOM element of the Membership ID Card.
 * Uses html2canvas with 3x scale print resolution and preserves 100% of typography, spacing, colors, and layout.
 */
export async function captureCardElementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  // 1. Wait for document fonts to be fully loaded and rendered
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue if font API unavailable
    }
  }

  // 2. Pre-load all images inside the element and convert external URLs to base64 Data URLs
  // This guarantees that html2canvas will NOT perform remote network requests or trigger CORS/canvas taint issues.
  const imgs = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    imgs.map(async (img) => {
      if (!img.complete) {
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(resolve, 1500);
        });
      }
      const src = img.currentSrc || img.src;
      if (src && !src.startsWith('data:')) {
        try {
          const dataUrl = await getCachedBase64Image(src);
          if (dataUrl && dataUrl.startsWith('data:')) {
            img.src = dataUrl;
          }
        } catch {
          // Continue
        }
      }
    })
  );

  // 3. Small delay to let browser paint
  await new Promise((resolve) => setTimeout(resolve, 60));

  // 4. Capture element with html2canvas at 3x scale (300+ DPI razor-sharp print quality)
  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: 1200,
    windowHeight: 1200,
    onclone: (_clonedDoc, clonedEl) => {
      if (clonedEl) {
        clonedEl.style.opacity = '1';
        clonedEl.style.visibility = 'visible';
        clonedEl.style.transform = 'none';
        clonedEl.style.boxShadow = 'none';
        // Enforce standard desktop width for card rendering
        clonedEl.style.width = '364px';
        clonedEl.style.minWidth = '364px';
        clonedEl.style.maxWidth = '364px';
      }
    }
  });

  return canvas;
}

/**
 * Ensures that the rendered DOM elements for both front and back of the Membership ID Card
 * are available for capture.
 * If the card is already in the DOM (e.g. preview modal or page), it returns the existing elements.
 * If not, it mounts the exact same MembershipCard React component into an offscreen container,
 * waits for rendering/images to settle, and provides a cleanup callback to unmount it.
 */
export async function ensureRenderedCardElements(
  member: Member,
  settings?: ForumSettings
): Promise<{ frontEl: HTMLElement; backEl: HTMLElement; cleanup: () => void }> {
  const memberMatchId = String(member.id || member.membershipId || '');

  // 1. Check if both front and back elements are already in the active DOM for this member
  const existingFront = document.getElementById('nnepef-vertical-idcard-front');
  const existingBack = document.getElementById('nnepef-vertical-idcard-back');

  if (existingFront && existingBack) {
    const frontId = existingFront.getAttribute('data-member-id');
    const backId = existingBack.getAttribute('data-member-id');
    const matchFront = !memberMatchId || !frontId || frontId === memberMatchId;
    const matchBack = !memberMatchId || !backId || backId === memberMatchId;

    if (matchFront && matchBack) {
      return {
        frontEl: existingFront,
        backEl: existingBack,
        cleanup: () => {}
      };
    }
  }

  // 2. Otherwise dynamically mount the exact MembershipCard React component offscreen
  const container = document.createElement('div');
  container.id = `temp-pdf-card-host-${Date.now()}`;
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0px';
  container.style.width = '420px';
  container.style.opacity = '1';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-9999';
  container.style.visibility = 'visible';
  document.body.appendChild(container);

  const { createRoot } = await import('react-dom/client');
  const React = await import('react');
  const { MembershipCard } = await import('../components/MembershipCard');

  const root = createRoot(container);
  root.render(
    React.createElement(MembershipCard, {
      member,
      settings,
      logoUrl: settings?.logoUrl
    })
  );

  const startTime = Date.now();
  while (Date.now() - startTime < 4000) {
    const frontEl = container.querySelector('#nnepef-vertical-idcard-front') as HTMLElement;
    const backEl = container.querySelector('#nnepef-vertical-idcard-back') as HTMLElement;
    if (frontEl && backEl) {
      // Allow QR code generation and layout to settle
      await new Promise((resolve) => setTimeout(resolve, 250));
      return {
        frontEl,
        backEl,
        cleanup: () => {
          try {
            root.unmount();
            if (document.body.contains(container)) {
              document.body.removeChild(container);
            }
          } catch (e) {
            console.warn('[pdfService] Cleanup error:', e);
          }
        }
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error('Failed to mount MembershipCard preview for PDF export');
}

/**
 * Generates an ultra-high resolution HTML5 Canvas of the Official Vertical Membership ID Card side.
 * Captures directly from the EXACT rendered Preview component.
 * WHAT YOU SEE IN THE PREVIEW = EXACTLY WHAT YOU GET IN THE PDF / DOWNLOAD.
 */
export async function generateVerticalIdCardCanvas(
  member: Member,
  settings?: ForumSettings,
  side: 'front' | 'back' = 'front'
): Promise<HTMLCanvasElement> {
  const { frontEl, backEl, cleanup } = await ensureRenderedCardElements(member, settings);
  try {
    const targetEl = side === 'front' ? frontEl : backEl;
    return await captureCardElementToCanvas(targetEl);
  } finally {
    cleanup();
  }
}

/**
 * Downloads the Official High-Quality Vertical / Portrait Membership ID Card as a PDF
 * (Strictly Portrait CR80 format, centered, high-resolution, compatible with Android/mobile & desktop)
 * Highly optimized with JPEG resource compression for minimal file size (<300KB) while preserving sharp readability.
 */
export async function downloadMemberIdCardPdf(
  member: Member,
  settings?: ForumSettings,
  clickEvent?: MouseEvent | React.MouseEvent
): Promise<void> {
  // 1. Ensure card preview is mounted and capture both sides simultaneously
  const { frontEl, backEl, cleanup } = await ensureRenderedCardElements(member, settings);
  let frontCanvas: HTMLCanvasElement;
  let backCanvas: HTMLCanvasElement;

  try {
    [frontCanvas, backCanvas] = await Promise.all([
      captureCardElementToCanvas(frontEl),
      captureCardElementToCanvas(backEl)
    ]);
  } finally {
    cleanup();
  }

  // Convert to high-quality JPEG (0.95) for instant jsPDF embedding and razor-sharp 300+ DPI print quality
  const frontDataUrl = frontCanvas.toDataURL('image/jpeg', 0.95);
  const backDataUrl = backCanvas.toDataURL('image/jpeg', 0.95);

  // Standard CR80 width in mm
  const cardWidthMm = 54;
  // Exact proportional height matching the rendered card aspect ratio
  const frontRatio = (frontCanvas.height || 1268) / (frontCanvas.width || 800);
  const backRatio = (backCanvas.height || 1268) / (backCanvas.width || 800);

  const frontHeightMm = Number((cardWidthMm * frontRatio).toFixed(2));
  const backHeightMm = Number((cardWidthMm * backRatio).toFixed(2));

  // 2. Initialize jsPDF in strictly Portrait orientation matching exact card dimensions
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [cardWidthMm, frontHeightMm],
    compress: true
  });

  // Page 1: Front of the vertical card (1:1 pixel-perfect reproduction of preview)
  doc.addImage(frontDataUrl, 'JPEG', 0, 0, cardWidthMm, frontHeightMm, undefined, 'FAST');

  // Page 2: Back of the vertical card
  doc.addPage([cardWidthMm, backHeightMm], 'portrait');
  doc.addImage(backDataUrl, 'JPEG', 0, 0, cardWidthMm, backHeightMm, undefined, 'FAST');

  // 3. Multi-strategy download to guarantee the PDF downloads across all devices, mobile browsers & iframes
  const cleanId = (member.membershipId || member.fullName || 'Member').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `NNEPEF-Vertical-IDCard-${cleanId}.pdf`;

  // Strategy A: Blob URL with application/octet-stream (fastest, cleanest, zero browser hang)
  try {
    const pdfBlob = doc.output('blob');
    const octetBlob = new Blob([pdfBlob], { type: 'application/octet-stream' });
    const blobUrl = URL.createObjectURL(octetBlob);
    const downloaded = await downloadFileSafely(blobUrl, filename, clickEvent);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
    if (downloaded) return;
  } catch (errA) {
    console.warn('[pdfService] Strategy A (blob URL) failed:', errA);
  }

  // Strategy B: Base64 octet-stream Data URI download
  try {
    const rawDataUri = doc.output('datauristring');
    const octetStreamUri = rawDataUri.replace(/^data:application\/[^;]+/, 'data:application/octet-stream');
    const downloaded = await downloadFileSafely(octetStreamUri, filename, clickEvent);
    if (downloaded) return;
  } catch (errB) {
    console.warn('[pdfService] Strategy B (octet-stream data URI) failed:', errB);
  }

  // Strategy C: Native doc.save
  try {
    doc.save(filename);
  } catch (errC) {
    console.warn('[pdfService] Strategy C (doc.save) failed:', errC);
  }
}



