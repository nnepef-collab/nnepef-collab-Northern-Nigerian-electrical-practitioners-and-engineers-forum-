/**
 * N-NEPEF 2020 DIGITAL PORTAL - LOCAL STORAGE UTILITIES
 * 
 * ARCHITECTURAL DIRECTIVE:
 * Supabase PostgreSQL (`public.members`) is the SOLE AUTHORITATIVE SOURCE OF TRUTH
 * for all member records.
 * 
 * Local storage, IndexedDB, SQLite, and in-memory caches are STRICTLY FORBIDDEN
 * from storing, caching, or providing fallback data for member records.
 */

import { Member } from '../types';

export const MEMBERS_STORAGE_KEY = 'nnepef_members';
const LEGACY_MEMBER_KEYS = ['nnepef_db_members', 'nnepef_members', 'members', 'memberData', 'registeredMembers', 'adminMembers'];

/**
 * Disabled: Strict prohibition against automatic local data deletion.
 */
function purgeLegacyMemberStorage(): void {
  // Do nothing. Never delete local data automatically.
}

// Do not purge on module load


/**
 * Deprecated member accessors: Always return empty arrays / null.
 * All queries must go directly to Supabase PostgreSQL (`public.members`).
 */
export function getMembers(): Member[] {
  return [];
}

export function saveMembers(_membersList: Member[]): Member[] {
  // Disallowed: Member persistence is strictly handled in Supabase PostgreSQL
  return [];
}

export function addMember(newMember: Member): Member {
  // Disallowed: Member persistence is strictly handled in Supabase PostgreSQL
  return newMember;
}

export function updateMember(updatedMember: Member): Member {
  // Disallowed: Member persistence is strictly handled in Supabase PostgreSQL
  return updatedMember;
}

export function deleteMember(_memberId: string): Member[] {
  // Disallowed: Member persistence is strictly handled in Supabase PostgreSQL
  return [];
}

export function getMemberById(_idOrMembershipId: string): Member | undefined {
  return undefined;
}

export function clearMembers(): void {
  purgeLegacyMemberStorage();
}

