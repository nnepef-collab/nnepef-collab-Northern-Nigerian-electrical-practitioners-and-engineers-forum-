import { Member } from '../types';

export interface SafeNextOfKin {
  name: string;
  relation: string;
  phone: string;
  address: string;
  altPhone?: string;
}

export interface SafeEducationDetails {
  institution: string;
  courseOfStudy: string;
  graduationYear: string;
  highestQualification: string;
  otherQualifications: string;
  professionalCertificates: string;
}

/**
 * Safely parse any Next of Kin value (JSON string, object, or undefined)
 * into a typed, well-formed object with guaranteed non-null string properties.
 */
export function parseNextOfKin(raw: any, fallbackPhone?: string | null): SafeNextOfKin {
  if (!raw) {
    return {
      name: '',
      relation: 'Spouse',
      phone: fallbackPhone ? String(fallbackPhone).trim() : '',
      address: '',
      altPhone: undefined
    };
  }

  let parsed: any = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {
        parsed = { name: trimmed };
      }
    } else {
      parsed = { name: trimmed };
    }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    parsed = {};
  }

  return {
    name: String(parsed.name || '').trim(),
    relation: String(parsed.relation || '').trim() || 'Spouse',
    phone: String(parsed.phone || fallbackPhone || '').trim(),
    address: String(parsed.address || '').trim(),
    altPhone: parsed.altPhone ? String(parsed.altPhone).trim() : undefined
  };
}

/**
 * Safely extract and parse School / Education qualifications from a member object
 * or database row, inspecting both direct fields and qualification_details.
 */
export function parseEducationDetails(raw: any): SafeEducationDetails {
  let qualObj: any = {};
  const rawQual = raw?.qualification_details || raw?.qualificationDetails;
  if (rawQual) {
    if (typeof rawQual === 'object' && rawQual !== null) {
      qualObj = rawQual;
    } else if (typeof rawQual === 'string') {
      try {
        qualObj = JSON.parse(rawQual);
      } catch (e) {}
    }
  }

  return {
    institution: String(raw?.institution || qualObj.institution || raw?.company_name || raw?.company || '').trim(),
    courseOfStudy: String(raw?.courseOfStudy || qualObj.courseOfStudy || raw?.course_of_study || '').trim(),
    graduationYear: String(raw?.graduationYear || qualObj.graduationYear || raw?.graduation_year || '').trim(),
    highestQualification: String(raw?.highestQualification || raw?.qualification || qualObj.highestQualification || '').trim(),
    otherQualifications: String(raw?.otherQualifications || qualObj.otherQualifications || raw?.other_qualifications || '').trim(),
    professionalCertificates: String(raw?.professionalCertificates || qualObj.professionalCertificates || raw?.professional_certificates || '').trim()
  };
}

/**
 * Safely merge incoming member record with existing member state.
 * CRITICAL DIRECTIVE: A partial or incomplete API response must NEVER erase
 * existing populated fields (School, Next of Kin, Phone, NIN, Photos, Approved status).
 */
export function safeMergeMember(prev: Member, incoming: Partial<Member> | null | undefined): Member {
  if (!incoming) return prev;

  const merged: Member = { ...prev };

  for (const [k, v] of Object.entries(incoming)) {
    const key = k as keyof Member;

    // Skip undefined, null, or empty string values if existing record already has a value
    if (v === undefined || v === null) {
      continue;
    }

    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed === '') {
        // Do not overwrite an existing non-empty value with empty string
        if (!prev[key]) {
          (merged as any)[key] = '';
        }
      } else {
        (merged as any)[key] = trimmed;
      }
      continue;
    }

    if (key === 'nextOfKin') {
      const existingNok = parseNextOfKin(prev.nextOfKin);
      const incomingNok = parseNextOfKin(v);
      merged.nextOfKin = {
        name: incomingNok.name || existingNok.name || '',
        relation: incomingNok.relation || existingNok.relation || 'Spouse',
        phone: incomingNok.phone || existingNok.phone || '',
        address: incomingNok.address || existingNok.address || '',
        altPhone: incomingNok.altPhone || existingNok.altPhone || undefined
      };
      continue;
    }

    // Default assignment for numbers, booleans, and other non-empty objects
    (merged as any)[key] = v;
  }

  // Deep protection for Next of Kin: ensure valid existing emergency contact is never lost
  if (!merged.nextOfKin || (!merged.nextOfKin.name && !merged.nextOfKin.phone)) {
    if (prev.nextOfKin) {
      merged.nextOfKin = parseNextOfKin(prev.nextOfKin);
    }
  }

  // Deep protection for School / Educational Information
  const prevEdu = parseEducationDetails(prev);
  const incomingEdu = parseEducationDetails(incoming);
  merged.institution = incomingEdu.institution || prevEdu.institution || '';
  merged.courseOfStudy = incomingEdu.courseOfStudy || prevEdu.courseOfStudy || '';
  merged.graduationYear = incomingEdu.graduationYear || prevEdu.graduationYear || '';
  merged.highestQualification = incomingEdu.highestQualification || prevEdu.highestQualification || '';
  merged.qualification = merged.highestQualification || prev.qualification || '';
  merged.otherQualifications = incomingEdu.otherQualifications || prevEdu.otherQualifications || undefined;
  merged.professionalCertificates = incomingEdu.professionalCertificates || prevEdu.professionalCertificates || undefined;

  // Deep protection for Authentic Photos (never replace real photo with placeholder or empty)
  const isPlaceholderOrEmpty = (url?: string) => !url || url.includes('images.unsplash.com');
  if (prev.passportUrl && !isPlaceholderOrEmpty(prev.passportUrl) && isPlaceholderOrEmpty(merged.passportUrl)) {
    merged.passportUrl = prev.passportUrl;
  }
  if (prev.passportPhotoUrl && !isPlaceholderOrEmpty(prev.passportPhotoUrl) && isPlaceholderOrEmpty(merged.passportPhotoUrl)) {
    merged.passportPhotoUrl = prev.passportPhotoUrl;
  }
  if (prev.paymentReceiptUrl && !isPlaceholderOrEmpty(prev.paymentReceiptUrl) && isPlaceholderOrEmpty(merged.paymentReceiptUrl)) {
    merged.paymentReceiptUrl = prev.paymentReceiptUrl;
  }

  // Deep protection for Approved Status & Assigned Membership ID
  if (prev.status === 'approved' && merged.status !== 'approved') {
    merged.status = 'approved';
  }
  if (prev.membershipId && !merged.membershipId) {
    merged.membershipId = prev.membershipId;
  }
  if (prev.registeredAt && !merged.registeredAt) {
    merged.registeredAt = prev.registeredAt;
  }

  return merged;
}

/**
 * Normalizes National Identity Number (NIN):
 * - Removes all non-digit characters (spaces, hyphens, punctuation)
 * - Trims whitespace
 */
export function normalizeNin(rawNin: any): string {
  if (!rawNin) return '';
  return String(rawNin).replace(/\D/g, '').trim();
}

/**
 * Validates whether a given NIN is an 11-digit number.
 */
export function isValidNin(rawNin: any): boolean {
  const norm = normalizeNin(rawNin);
  return norm.length === 11;
}

/**
 * Normalizes Nigerian phone numbers to standard 11-digit local format:
 * - Strips non-digit characters (spaces, hyphens, brackets, '+')
 * - Maps +234XXXXXXXXXX, 234XXXXXXXXXX, 0XXXXXXXXXX, or XXXXXXXXXX to 0XXXXXXXXXX
 */
export function normalizePhone(rawPhone: any): string {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '').trim();
  if (!digits) return '';

  if (digits.length >= 10) {
    const last10 = digits.slice(-10);
    return `0${last10}`;
  }
  return digits;
}

/**
 * Returns the 10-digit core identifier of a Nigerian phone number for database matching.
 */
export function getPhoneCore10(rawPhone: any): string {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '').trim();
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Validates whether a phone number has at least 10 digits and at most 14 digits.
 */
export function isValidPhone(rawPhone: any): boolean {
  const digits = String(rawPhone || '').replace(/\D/g, '').trim();
  return digits.length >= 10 && digits.length <= 14;
}

/**
 * Generates all equivalent Nigerian phone number representations for broad matching
 * across legacy data formats (+234..., 234..., 0..., 10-digit...).
 */
export function getPhoneLookupVariations(rawPhone: any): string[] {
  if (!rawPhone) return [];
  const digits = String(rawPhone).replace(/\D/g, '').trim();
  if (digits.length < 10) {
    return digits ? [digits] : [];
  }
  const last10 = digits.slice(-10);
  return [
    `0${last10}`,
    `+234${last10}`,
    `234${last10}`,
    last10
  ];
}
