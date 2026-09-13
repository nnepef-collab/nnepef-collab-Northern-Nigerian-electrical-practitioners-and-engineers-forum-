import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Member, ForumSettings } from '../types';
import { OFFICIAL_NNEPEF_LOGO, OFFICIAL_ID_CARD_LOGO } from '../constants/logo';
import { OFFICIAL_SECRETARY_SIGNATURE } from '../constants/signature';
import { downloadFileSafely } from '../utils/imageHelpers';

/**
 * Safely loads an image as base64 data URL for embedding into jsPDF
 */
async function getBase64ImageFromUrl(url: string | undefined | null, fallbacks: string[] = []): Promise<string | null> {
  const candidates = [url, ...fallbacks].filter((u): u is string => Boolean(u && typeof u === 'string' && u.trim() && u !== 'undefined' && u !== 'null'));
  if (candidates.length === 0) return null;

  for (const candidate of candidates) {
    const cleanUrl = candidate.trim();
    if (cleanUrl.startsWith('data:image/')) {
      return cleanUrl;
    }

    try {
      const fullUrl = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')
        ? cleanUrl
        : (typeof window !== 'undefined' && window.location ? `${window.location.origin}${cleanUrl.startsWith('/') ? cleanUrl : '/' + cleanUrl}` : cleanUrl);
      const response = await fetch(fullUrl, { mode: 'cors', cache: 'no-cache' });
      if (response.ok) {
        const blob = await response.blob();
        const base64 = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
        if (base64 && base64.startsWith('data:image/')) {
          return base64;
        }
      }
    } catch (e) {
      console.warn('[PDF Service] Error fetching image for PDF:', candidate, e);
    }
  }

  return null;
}

/**
 * Downloads an official, beautifully styled Member Profile PDF document
 */
export async function downloadMemberProfilePdf(member: Member, settings?: ForumSettings): Promise<void> {
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
 * Generates and downloads the Official Membership Approval Slip PDF
 * with official N-NEPEF logo, member photo, verification QR code, and Secretary General signature
 */
export async function downloadApprovalSlipPdf(member: Member, settings?: ForumSettings): Promise<void> {
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
 * Draw 4 distinct badge icons for canvas info rows
 */
function drawBadgeUser(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = '#00A3FF';
  drawCanvasRoundRect(ctx, x, y, size, size, 10);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  const cx = x + size / 2;
  ctx.beginPath();
  ctx.arc(cx, y + size * 0.35, size * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, y + size * 0.85, size * 0.32, Math.PI, 0);
  ctx.fill();
}

function drawBadgeId(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = '#002B66';
  drawCanvasRoundRect(ctx, x, y, size, size, 10);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  const cw = size * 0.68;
  const ch = size * 0.52;
  const cx = x + (size - cw) / 2;
  const cy = y + (size - ch) / 2;
  drawCanvasRoundRect(ctx, cx, cy, cw, ch, 4);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cx + 4, cy + 4, 8, 8);
  ctx.fillRect(cx + 15, cy + 5, cw - 19, 2.5);
  ctx.fillRect(cx + 15, cy + 10, cw - 19, 2.5);
  ctx.fillRect(cx + 4, cy + 16, cw - 8, 2);
}

function drawBadgeBuilding(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = '#D81B60';
  drawCanvasRoundRect(ctx, x, y, size, size, 10);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  const bx = x + size * 0.18;
  const bw = size * 0.64;
  ctx.beginPath();
  ctx.moveTo(x + size / 2, y + size * 0.22);
  ctx.lineTo(bx, y + size * 0.38);
  ctx.lineTo(bx + bw, y + size * 0.38);
  ctx.closePath();
  ctx.fill();

  ctx.fillRect(bx, y + size * 0.38, bw, 3);
  const colW = 4;
  const colH = size * 0.32;
  const colY = y + size * 0.44;
  ctx.fillRect(bx + 4, colY, colW, colH);
  ctx.fillRect(x + size / 2 - colW / 2, colY, colW, colH);
  ctx.fillRect(bx + bw - 4 - colW, colY, colW, colH);
  ctx.fillRect(bx - 2, colY + colH, bw + 4, 4);
}

function drawBadgeCalendar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = '#00A3FF';
  drawCanvasRoundRect(ctx, x, y, size, size, 10);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  const cw = size * 0.62;
  const ch = size * 0.54;
  const cx = x + (size - cw) / 2;
  const cy = y + (size - ch) / 2 + 2;
  drawCanvasRoundRect(ctx, cx, cy, cw, ch, 4);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cx + 6, cy - 3, 3, 5);
  ctx.fillRect(cx + cw - 9, cy - 3, 3, 5);
  ctx.fillRect(cx, cy + 6, cw, 2);

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.fillRect(cx + 5 + c * 7, cy + 11 + r * 5, 2.5, 2.5);
    }
  }
}

function drawBadgeSpecialization(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = '#00A3FF';
  drawCanvasRoundRect(ctx, x, y, size, size, 10);
  ctx.fill();

  // Lightning bolt / zap icon in white
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.moveTo(cx - 1, cy - size * 0.32);
  ctx.lineTo(cx + size * 0.22, cy - size * 0.05);
  ctx.lineTo(cx + 2, cy - size * 0.05);
  ctx.lineTo(cx + size * 0.12, cy + size * 0.32);
  ctx.lineTo(cx - size * 0.22, cy + size * 0.05);
  ctx.lineTo(cx - 2, cy + size * 0.05);
  ctx.closePath();
  ctx.fill();
}

function drawElectricalEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.save();
  ctx.strokeStyle = '#00A3FF';
  ctx.lineWidth = 4;

  for (const angle of [45, -45]) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.85, radius * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = '#00A3FF';
  ctx.beginPath();
  ctx.moveTo(cx - 2, cy - 14);
  ctx.lineTo(cx + 8, cy - 2);
  ctx.lineTo(cx + 1, cy - 2);
  ctx.lineTo(cx + 4, cy + 14);
  ctx.lineTo(cx - 8, cy + 2);
  ctx.lineTo(cx - 1, cy + 2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Generates an ultra-high resolution HTML5 Canvas of the Official Vertical / Portrait Membership ID Card
 * exactly following the reference image layout, typography, proportions, and position-based bottom color rule.
 */
export async function generateVerticalIdCardCanvas(
  member: Member,
  settings?: ForumSettings,
  side: 'front' | 'back' = 'front'
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  // High resolution portrait CR80 ratio (800 x 1268px - exact 54mm x 85.6mm ratio)
  canvas.width = 800;
  canvas.height = 1268;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // Preload graphics safely via base64
  const [logoImg, photoImg, sigImg] = await Promise.all([
    loadHtmlImage(OFFICIAL_ID_CARD_LOGO, ['/nnepef-id-card-logo.jpg', '/nnepef-id-card-logo.png', settings?.logoUrl || OFFICIAL_NNEPEF_LOGO]),
    loadHtmlImage(member.passportUrl || member.passportPhotoUrl),
    loadHtmlImage((settings as any)?.signatureUrl || OFFICIAL_SECRETARY_SIGNATURE, [OFFICIAL_SECRETARY_SIGNATURE, '/secretary-signature.png'])
  ]);

  const cleanName = (member.fullName || 'REGISTERED MEMBER').toUpperCase();
  const formattedId = formatFourDigitMembershipId(member.membershipId);
  const cleanId = (formattedId || (member.applicationReference ? `REF-${member.applicationReference}` : 'PENDING')).toUpperCase();
  const cleanPosition = (member.position || 'MEMBER').trim().toUpperCase();
  const cleanSpecialization = (member.specialization || (member as any).speciality || member.occupation || 'ELECTRICAL ENGINEERING').toUpperCase();
  const cleanExpiry = formatCardExpiry(member.expiryDate, member.issueDate);
  const isExecutive = hasExecutiveColoredBottom(cleanPosition);
  const isExactMember = cleanPosition === 'MEMBER';

  if (side === 'front') {
    // 1. Blue Outer Card Background
    ctx.fillStyle = '#0052CC';
    drawCanvasRoundRect(ctx, 0, 0, 800, 1268, 44);
    ctx.fill();

    // 2. Top Header on Blue Background (Shifted slightly downward to create clean space at top)
    // Line 1: NORTHERN NIGERIAN ELECTRICAL — MUST BE STRONG YELLOW ONLY
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFDE00';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText('NORTHERN NIGERIAN ELECTRICAL', 400, 80);

    // Line 2: PRACTITIONERS & ENGINEERS — White
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText('PRACTITIONERS & ENGINEERS', 400, 122);

    // Line 3: FORUM (N-NPEEF) — FORUM in white, (N-NPEEF) in pink/magenta
    const forumWord = 'FORUM ';
    const acronymWord = '(N-NPEEF)';
    ctx.font = 'bold 36px Arial, sans-serif';
    const forumW = ctx.measureText(forumWord).width;
    const acronymW = ctx.measureText(acronymWord).width;
    const startL3X = 400 - (forumW + acronymW) / 2;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(forumWord, startL3X, 164);
    ctx.fillStyle = '#E11D48';
    ctx.fillText(acronymWord, startL3X + forumW, 164);

    // 3. MEMBERSHIP I.D CARD Pill Ribbon (White pill badge with pink/magenta text style) - NO address on front
    const pillW = 450;
    const pillH = 48;
    const pillX = 400 - pillW / 2;
    const pillY = 200;

    ctx.fillStyle = '#FFFFFF';
    drawCanvasRoundRect(ctx, pillX, pillY, pillW, pillH, 24);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#E11D48';
    ctx.font = 'bold 25px Arial, sans-serif';
    ctx.fillText('MEMBERSHIP I.D CARD', 400, pillY + 33);

    // 4. Inner White Central Container with Cyan Rounded Border
    const whiteX = 38;
    const whiteY = 270;
    const whiteW = 724;
    const whiteH = 932;
    const whiteR = 36;

    // Fill white
    ctx.fillStyle = '#FFFFFF';
    drawCanvasRoundRect(ctx, whiteX, whiteY, whiteW, whiteH, whiteR);
    ctx.fill();

    // Cyan Border
    ctx.strokeStyle = '#00A3FF';
    ctx.lineWidth = 7;
    drawCanvasRoundRect(ctx, whiteX, whiteY, whiteW, whiteH, whiteR);
    ctx.stroke();

    // 5. Inside White Container
    // Top-Left: New Official Master ID Card Logo (LARGER and MORE PROMINENT)
    if (logoImg) {
      try {
        ctx.save();
        ctx.drawImage(logoImg, 56, 284, 150, 150);
        ctx.restore();
      } catch (e) {
        console.warn('Canvas logo error:', e);
      }
    }

    // Top-Right: Cyan / Blue Electrical Atom Northern Symbol
    drawElectricalEmblem(ctx, 688, 359, 56);

    // Center: Member Photograph in Prominent Circular Frame (Natural face, perfectly proportioned)
    const photoCx = 400;
    const photoCy = 449;
    const photoR = 145;

    // Outer Deep Blue Ring
    ctx.strokeStyle = '#0052CC';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(photoCx, photoCy, photoR + 10, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Cyan Ring
    ctx.strokeStyle = '#00A3FF';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(photoCx, photoCy, photoR + 3, 0, Math.PI * 2);
    ctx.stroke();

    // Clip & Draw Photo inside Circle - Aspect-ratio preserving (NEVER squeezed or distorted)
    ctx.save();
    ctx.beginPath();
    ctx.arc(photoCx, photoCy, photoR, 0, Math.PI * 2);
    ctx.clip();

    if (photoImg) {
      try {
        const imgW = (photoImg as any).naturalWidth || photoImg.width || 1;
        const imgH = (photoImg as any).naturalHeight || photoImg.height || 1;
        let sx = 0, sy = 0, sSize = Math.min(imgW, imgH);
        if (imgW > imgH) {
          sx = (imgW - imgH) / 2;
        } else if (imgH > imgW) {
          sy = (imgH - imgW) / 2;
        }
        ctx.drawImage(photoImg, sx, sy, sSize, sSize, photoCx - photoR, photoCy - photoR, photoR * 2, photoR * 2);
      } catch (err) {
        console.warn('Canvas photo draw error:', err);
        drawCanvasCircularAvatar(ctx, photoCx, photoCy, photoR);
      }
    } else {
      drawCanvasCircularAvatar(ctx, photoCx, photoCy, photoR);
    }
    ctx.restore();

    // 6. Member Info Rows (4 Rows on Front: Name, ID, Position, Expiry — SPECIALITY IS ON BACK ONLY)
    // Row 1: Member Name — PINK/MAGENTA, NOTICEABLY LARGER, BOLD and highly prominent
    const row1BadgeY = 644;
    const row1TextY = 689;
    drawBadgeUser(ctx, 66, row1BadgeY, 58);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#E11D48';
    let nameFontSize = 44;
    ctx.font = `bold ${nameFontSize}px Arial, sans-serif`;
    while (140 + ctx.measureText(cleanName).width > 735 && nameFontSize > 28) {
      nameFontSize -= 1;
      ctx.font = `bold ${nameFontSize}px Arial, sans-serif`;
    }
    ctx.fillText(cleanName, 140, row1TextY);

    // Row 2: Membership ID Number — DARK BLUE/NAVY, NOTICEABLY LARGER & BOLDER
    const row2BadgeY = 764;
    const row2TextY = 807;
    drawBadgeId(ctx, 66, row2BadgeY, 58);
    ctx.font = 'bold 33px Georgia, serif';
    ctx.fillStyle = '#002B66';
    const idPrefix = 'MEMBERSHIP ID: ';
    ctx.fillText(idPrefix, 140, row2TextY);
    const idLabelW = ctx.measureText(idPrefix).width;

    let idFontSize = 36;
    ctx.font = `bold ${idFontSize}px Arial, sans-serif`;
    while (140 + idLabelW + ctx.measureText(cleanId).width > 735 && idFontSize > 22) {
      idFontSize -= 1;
      ctx.font = `bold ${idFontSize}px Arial, sans-serif`;
    }
    ctx.fillStyle = '#002B66';
    ctx.fillText(cleanId, 140 + idLabelW, row2TextY);

    // Row 3: POSITION — GREEN, NOTICEABLY LARGER & PROMINENT
    const row3BadgeY = 884;
    const row3TextY = 927;
    drawBadgeBuilding(ctx, 66, row3BadgeY, 58);
    ctx.font = 'bold 33px Georgia, serif';
    ctx.fillStyle = '#002B66';
    ctx.fillText('POSITION: ', 140, row3TextY);
    const posLabelW = ctx.measureText('POSITION: ').width;
    ctx.font = 'bold 36px Georgia, serif';
    ctx.fillStyle = '#15803D';
    ctx.fillText(cleanPosition, 140 + posLabelW, row3TextY);

    // Row 4: Expiry — "EXPIRES: " in navy, date in pink/magenta — LARGER & HIGHLY READABLE
    const row4BadgeY = 1004;
    const row4TextY = 1047;
    drawBadgeCalendar(ctx, 66, row4BadgeY, 58);
    ctx.font = 'bold 33px Georgia, serif';
    ctx.fillStyle = '#002B66';
    ctx.fillText('EXPIRES: ', 140, row4TextY);
    const expLabelW = ctx.measureText('EXPIRES: ').width;
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillStyle = '#E11D48';
    ctx.fillText(cleanExpiry, 140 + expLabelW, row4TextY);

    // 7. POSITION-BASED BOTTOM SECTION
    // RULE 1: If POSITION === 'MEMBER' -> Bottom is BLUE ONLY
    // RULE 2: If POSITION !== 'MEMBER' (Executive) -> Preserved subtle executive curved accent
    if (isExecutive) {
      ctx.save();
      drawCanvasRoundRect(ctx, 0, 0, 800, 1268, 44);
      ctx.clip();

      ctx.fillStyle = '#E11D48';
      ctx.beginPath();
      ctx.moveTo(0, 1268);
      ctx.lineTo(0, 1205);
      ctx.bezierCurveTo(240, 1246, 560, 1246, 800, 1205);
      ctx.lineTo(800, 1268);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#00A3FF';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(0, 1205);
      ctx.bezierCurveTo(240, 1246, 560, 1246, 800, 1205);
      ctx.stroke();

      ctx.restore();
    }
  } else {
    // =========================================================================
    // BACK SIDE OF VERTICAL CARD (Strong Blue Identity, Official Kano Office & Tel)
    // =========================================================================
    // 1. Outer Blue Background
    ctx.fillStyle = '#0052CC';
    drawCanvasRoundRect(ctx, 0, 0, 800, 1268, 44);
    ctx.fill();

    // 2. White Container with Cyan Border
    const whiteX = 38;
    const whiteY = 38;
    const whiteW = 724;
    const whiteH = 1192;
    const whiteR = 40;

    ctx.fillStyle = '#FFFFFF';
    drawCanvasRoundRect(ctx, whiteX, whiteY, whiteW, whiteH, whiteR);
    ctx.fill();

    ctx.strokeStyle = '#00A3FF';
    ctx.lineWidth = 8;
    drawCanvasRoundRect(ctx, whiteX, whiteY, whiteW, whiteH, whiteR);
    ctx.stroke();

    // 3. Organization Header on White Container
    ctx.textAlign = 'center';
    ctx.fillStyle = '#002B66';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText('NORTHERN NIGERIAN ELECTRICAL', 400, 115);

    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText('PRACTITIONERS & ENGINEERS', 400, 152);

    ctx.font = 'bold 28px Arial, sans-serif';
    const bForumTxt = 'FORUM ';
    const bAcronymTxt = '(N-NPEEF)';
    const bForumW = ctx.measureText(bForumTxt).width;
    const bAcronymW = ctx.measureText(bAcronymTxt).width;
    const bTotalL3W = bForumW + bAcronymW;
    const bStartL3X = 400 - bTotalL3W / 2;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#002B66';
    ctx.fillText(bForumTxt, bStartL3X, 190);
    ctx.fillStyle = '#E11D48';
    ctx.fillText(bAcronymTxt, bStartL3X + bForumW, 190);

    // Head Office Line: In official Deep Blue
    ctx.font = 'bold 15px Arial, sans-serif';
    const bHeadPrefix = 'Head Office: ';
    const bHeadBody = settings?.headquarters || 'Beside Tashar Rigiyar Zaki, opp. Brilliant Academy, Kano';
    const bHeadPreW = ctx.measureText(bHeadPrefix).width;
    const bHeadBodyW = ctx.measureText(bHeadBody).width;
    const bHeadTotalW = bHeadPreW + bHeadBodyW;
    const bHeadStartX = 400 - bHeadTotalW / 2;

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0052CC';
    ctx.fillText(bHeadPrefix, bHeadStartX, 230);
    ctx.fillStyle = '#002B66';
    ctx.fillText(bHeadBody, bHeadStartX + bHeadPreW, 230);

    // Tel Line: EXACTLY THREE phone numbers: 07036144377, 08133771460, 09067543760
    const bTelPrefix = 'Tel: ';
    const bTelBody = '07036144377, 08133771460, 09067543760';
    const bTelPreW = ctx.measureText(bTelPrefix).width;
    const bTelBodyW = ctx.measureText(bTelBody).width;
    const bTelTotalW = bTelPreW + bTelBodyW;
    const bTelStartX = 400 - bTelTotalW / 2;

    ctx.fillStyle = '#0052CC';
    ctx.fillText(bTelPrefix, bTelStartX, 258);
    ctx.fillStyle = '#002B66';
    ctx.fillText(bTelBody, bTelStartX + bTelPreW, 258);

    // 4. AREA OF SPECIALITY / FIELD (MOVED TO BACK OF ID CARD - PROMINENT & PROFESSIONAL)
    const specBoxX = 70;
    const specBoxY = 286;
    const specBoxW = 660;
    const specBoxH = 78;
    ctx.fillStyle = '#F0F9FF';
    drawCanvasRoundRect(ctx, specBoxX, specBoxY, specBoxW, specBoxH, 16);
    ctx.fill();

    ctx.strokeStyle = '#00A3FF';
    ctx.lineWidth = 2.5;
    drawCanvasRoundRect(ctx, specBoxX, specBoxY, specBoxW, specBoxH, 16);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#0052CC';
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.fillText('AREA OF SPECIALITY / FIELD', 400, specBoxY + 28);

    ctx.fillStyle = '#002B66';
    let specFontSize = 25;
    ctx.font = `bold ${specFontSize}px Georgia, serif`;
    while (ctx.measureText(cleanSpecialization).width > 620 && specFontSize > 16) {
      specFontSize -= 1;
      ctx.font = `bold ${specFontSize}px Georgia, serif`;
    }
    ctx.fillText(cleanSpecialization, 400, specBoxY + 60);

    // 5. Large Centered QR Code
    const verifyUrl = `https://nepef.org.ng/verify?id=${encodeURIComponent(cleanId)}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 380,
        margin: 1,
        color: {
          dark: '#002B66',
          light: '#FFFFFF'
        }
      });
      const qrImg = await loadHtmlImage(qrDataUrl);
      if (qrImg) {
        ctx.strokeStyle = '#BAE6FD';
        ctx.lineWidth = 1.5;
        drawCanvasRoundRect(ctx, 205, 385, 390, 390, 16);
        ctx.stroke();

        ctx.drawImage(qrImg, 210, 390, 380, 380);
      }
    } catch (e) {
      console.warn('QR code generation error:', e);
    }

    // 6. MEMBERSHIP I.D CARD Pill Button with Cyan Border in Blue
    const bPillW = 440;
    const bPillH = 58;
    const bPillX = 400 - bPillW / 2;
    const bPillY = 800;

    ctx.fillStyle = '#FFFFFF';
    drawCanvasRoundRect(ctx, bPillX, bPillY, bPillW, bPillH, 18);
    ctx.fill();

    ctx.strokeStyle = '#00A3FF';
    ctx.lineWidth = 4.5;
    drawCanvasRoundRect(ctx, bPillX, bPillY, bPillW, bPillH, 18);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#002B66';
    ctx.font = 'bold 27px "Arial Black", Arial, sans-serif';
    ctx.fillText('MEMBERSHIP I.D CARD', 400, bPillY + 39);

    // 7. Authorized Signature on Back Side ONLY (Exact Match to User Reference Photo)
    if (sigImg) {
      try {
        ctx.drawImage(sigImg, 260, 875, 280, 150);
      } catch (e) {
        console.warn('Back canvas signature draw error:', e);
      }
    }

    // Signature title line
    ctx.textAlign = 'center';
    ctx.fillStyle = '#002B66';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText('SECRETARY GENERAL', 400, 1045);

    ctx.fillStyle = '#64748B';
    ctx.font = 'normal 15px Arial, sans-serif';
    ctx.fillText('This card remains the property of N-NEPEF 2020.', 400, 1074);
    ctx.fillText('If found, please return to the Head Office address above.', 400, 1096);

  }

  return canvas;
}

/**
 * Downloads the Official High-Quality Vertical / Portrait Membership ID Card as a PDF
 * (Strictly Portrait CR80 format, centered, high-resolution, compatible with Android/mobile & desktop)
 */
export async function downloadMemberIdCardPdf(member: Member, settings?: ForumSettings): Promise<void> {
  // 1. Generate Front and Back High-Resolution Canvas Images
  const frontCanvas = await generateVerticalIdCardCanvas(member, settings, 'front');
  const backCanvas = await generateVerticalIdCardCanvas(member, settings, 'back');

  const frontDataUrl = frontCanvas.toDataURL('image/png');
  const backDataUrl = backCanvas.toDataURL('image/png');

  // Standard CR80 ISO/IEC 7810 vertical card size in mm (54mm x 85.6mm)
  const cardWidthMm = 54;
  const cardHeightMm = 85.6;

  // 2. Initialize jsPDF in strictly Portrait orientation
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [cardWidthMm, cardHeightMm]
  });

  // Page 1: Front of the vertical card
  doc.addImage(frontDataUrl, 'PNG', 0, 0, cardWidthMm, cardHeightMm, undefined, 'FAST');

  // Page 2: Back of the vertical card
  doc.addPage([cardWidthMm, cardHeightMm], 'portrait');
  doc.addImage(backDataUrl, 'PNG', 0, 0, cardWidthMm, cardHeightMm, undefined, 'FAST');

  // 3. Save via blob and downloadFileSafely for 100% Android / Mobile / Desktop reliability
  const cleanId = (member.membershipId || member.fullName || 'Member').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `NNEPEF-Vertical-IDCard-${cleanId}.pdf`;

  const pdfBlob = doc.output('blob');
  const blobUrl = URL.createObjectURL(pdfBlob);
  await downloadFileSafely(blobUrl, filename);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
}



