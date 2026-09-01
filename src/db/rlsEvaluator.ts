import { AppRole } from '../types';

export type RlsTable =
  | 'forum_settings'
  | 'bank_accounts'
  | 'fee_categories'
  | 'members'
  | 'executives'
  | 'announcements'
  | 'gallery_albums'
  | 'documents'
  | 'news_articles'
  | 'events'
  | 'admin_accounts'
  | 'audit_logs';

export type RlsOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

export interface RlsResult {
  allowed: boolean;
  policyName: string;
  reason: string;
}

/**
 * Evaluates Database Row-Level Security (RLS) policies in code.
 * Matches SQL definitions in /src/db/rls_policies.sql.
 */
export function evaluateRlsPolicy(
  role: AppRole | string,
  table: RlsTable,
  operation: RlsOperation
): RlsResult {
  const normRole = role.toLowerCase();

  // Super Admin bypasses all RLS restrictions
  if (normRole === 'super_admin') {
    return {
      allowed: true,
      policyName: 'Super Admin Bypass',
      reason: 'Super Admin has full database access bypass rights.',
    };
  }

  // Super Admin Exclusive Tables
  if (table === 'admin_accounts' || table === 'audit_logs') {
    return {
      allowed: false,
      policyName: 'Super Admin Exclusive RLS Policy',
      reason: `Access to table "${table}" is strictly restricted to Super Admin role. Role "${role}" denied.`,
    };
  }

  // Admin roles permitted on administrative data tables
  const adminRoles = [
    'admin',
    'national_admin',
    'state_admin',
    'lga_admin',
    'treasurer',
    'secretary',
    'moderator',
  ];

  if (adminRoles.includes(normRole)) {
    return {
      allowed: true,
      policyName: `Admin RLS Policy on ${table}`,
      reason: `Role "${role}" is authorized for ${operation} operations on ${table}.`,
    };
  }

  // Members / Viewers RLS
  if (operation === 'SELECT') {
    return {
      allowed: true,
      policyName: `Public/Member Read RLS Policy on ${table}`,
      reason: `Read operations permitted on public table ${table}.`,
    };
  }

  return {
    allowed: false,
    policyName: `Strict Default Deny RLS Policy on ${table}`,
    reason: `Role "${role}" cannot perform ${operation} on table ${table}.`,
  };
}
