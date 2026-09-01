import { AppRole } from '../types';

export type PermissionKey =
  | 'MANAGE_REGISTRATION_FEE'
  | 'MANAGE_BANK_ACCOUNTS'
  | 'MANAGE_ORGANIZATION_INFO'
  | 'MANAGE_CONTACT_DETAILS'
  | 'MANAGE_PUBLIC_PAGES'
  | 'MANAGE_REGISTRATION_SETTINGS'
  | 'MANAGE_MEMBER_INFO'
  | 'MANAGE_LEADERSHIP_DIRECTORY'
  | 'MANAGE_ANNOUNCEMENTS'
  | 'MANAGE_GALLERY'
  | 'MANAGE_DOWNLOADS'
  | 'MANAGE_NEWS'
  | 'MANAGE_EVENTS'
  | 'MANAGE_FINANCIALS'
  // Super Admin Exclusive
  | 'MANAGE_ADMIN_ACCOUNTS'
  | 'ASSIGN_PERMISSIONS'
  | 'SYSTEM_SECURITY'
  | 'BACKUP_RESTORE'
  | 'AUDIT_LOGS';

export interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  description: string;
  superAdminOnly: boolean;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: 'MANAGE_REGISTRATION_FEE',
    label: 'Manage Official Registration Fee',
    description: 'Set, edit, enable/disable, increase or decrease official registration fee amount.',
    superAdminOnly: false,
  },
  {
    key: 'MANAGE_BANK_ACCOUNTS',
    label: 'Manage Bank Account Details',
    description: 'Add, edit, replace, delete, and set active bank accounts & payment instructions.',
    superAdminOnly: false,
  },
  {
    key: 'MANAGE_ORGANIZATION_INFO',
    label: 'Manage Organization Information',
    description: 'Edit Forum Name, Tagline, Official Logo, Headquarters, Mission, and Vision.',
    superAdminOnly: false,
  },
  {
    key: 'MANAGE_CONTACT_DETAILS',
    label: 'Manage Contact Details',
    description: 'Update Secretariat Email, Helpline Phone Numbers, and Social Media links.',
    superAdminOnly: false,
  },
  {
    key: 'MANAGE_PUBLIC_PAGES',
    label: 'Manage Public Pages & Content',
    description: 'Update Homepage Hero, Top Announcement Ticker, and FAQ Items.',
    superAdminOnly: false,
  },
  {
    key: 'MANAGE_REGISTRATION_SETTINGS',
    label: 'Manage Registration Settings',
    description: 'Toggle online member registration open/closed and public verification tool.',
    superAdminOnly: false,
  },
  {
    key: 'MANAGE_MEMBER_INFO',
    label: 'Manage Member Information',
    description: 'Full CRUD on member applications, membership ID generation, approvals, and status overrides.',
    superAdminOnly: false,
  },
  {
    key: 'MANAGE_LEADERSHIP_DIRECTORY',
    label: 'Manage Leadership Directory',
    description: 'Add, edit, reorder, and remove National, State, and LGA Executives.',
    superAdminOnly: false,
  },
  {
    key: 'MANAGE_ANNOUNCEMENTS',
    label: 'Manage Announcements & Bulletins',
    description: 'Create, publish, pin, and delete official public & member bulletins.',
    superAdminOnly: false,
  },
  {
    key: 'MANAGE_GALLERY',
    label: 'Manage Photo & Video Gallery',
    description: 'Upload, organize, and delete gallery albums and media assets.',
    superAdminOnly: false,
  },
  {
    key: 'MANAGE_DOWNLOADS',
    label: 'Manage Documents & Downloads',
    description: 'Upload, categorize, and delete constitution, policy, and circular documents.',
    superAdminOnly: false,
  },
  {
    key: 'MANAGE_NEWS',
    label: 'Manage News Articles',
    description: 'Publish, edit, and archive official engineering news and updates.',
    superAdminOnly: false,
  },
  {
    key: 'MANAGE_EVENTS',
    label: 'Manage Events & Attendance',
    description: 'Schedule events, manage RSVPs, and issue event attendance certificates.',
    superAdminOnly: false,
  },
  {
    key: 'MANAGE_FINANCIALS',
    label: 'Manage Financials & Levies',
    description: 'Verify payment receipts, process renewal requests, and issue official receipts.',
    superAdminOnly: false,
  },
  // Super Admin Exclusive
  {
    key: 'MANAGE_ADMIN_ACCOUNTS',
    label: 'Manage Admin Accounts',
    description: 'Provision or delete administrative personnel accounts.',
    superAdminOnly: true,
  },
  {
    key: 'ASSIGN_PERMISSIONS',
    label: 'Assign System Permissions',
    description: 'Modify role-based permission sets for administrative accounts.',
    superAdminOnly: true,
  },
  {
    key: 'SYSTEM_SECURITY',
    label: 'System Security & Maintenance Mode',
    description: 'Toggle full system maintenance mode, session security, and password resets.',
    superAdminOnly: true,
  },
  {
    key: 'BACKUP_RESTORE',
    label: 'Backup & Restore Database',
    description: 'Export uncompressed database JSON snapshots and restore system state.',
    superAdminOnly: true,
  },
  {
    key: 'AUDIT_LOGS',
    label: 'Audit Trail Logs',
    description: 'Access and export immutable system security audit logs.',
    superAdminOnly: true,
  },
];

/**
 * Enforces Role-Based Access Control (RBAC) permission logic.
 * - Admin (and higher roles like super_admin, national_admin, state_admin, etc.)
 *   can perform all standard CRUD operations on settings, fees, bank accounts,
 *   members, announcements, gallery, leadership, docs, etc.
 * - ONLY 'super_admin' retains exclusive access to:
 *   Admin account creation/deletion, assigning permissions, maintenance mode,
 *   database backup & restore, and viewing immutable audit logs.
 */
export function hasPermission(role: AppRole | string, permission: PermissionKey): boolean {
  if (role === 'super_admin') {
    return true;
  }

  const def = PERMISSION_DEFINITIONS.find((p) => p.key === permission);
  if (!def) return false;

  // Exclusive to Super Admin
  if (def.superAdminOnly) {
    return false;
  }

  // Admin roles (national_admin, state_admin, lga_admin, treasurer, secretary, moderator)
  // have full access to non-exclusive administrative functions
  const adminRoles = [
    'admin',
    'national_admin',
    'state_admin',
    'lga_admin',
    'treasurer',
    'secretary',
    'moderator',
  ];

  return adminRoles.includes(role.toLowerCase());
}
