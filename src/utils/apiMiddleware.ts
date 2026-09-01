import { hasPermission, PermissionKey } from './rbac';
import { AppRole } from '../types';

export interface ApiResponse<T = any> {
  status: number;
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface ApiRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: {
    authorization?: string;
    role?: AppRole | string;
    actorName?: string;
  };
  body?: any;
}

/**
 * Endpoint to Permission Mapping for Backend API Permission Checks.
 */
const API_PERMISSION_MAP: Record<string, { method: string; requiredPermission: PermissionKey }[]> = {
  '/api/settings/fee': [
    { method: 'GET', requiredPermission: 'MANAGE_REGISTRATION_FEE' },
    { method: 'PUT', requiredPermission: 'MANAGE_REGISTRATION_FEE' },
  ],
  '/api/settings/bank-accounts': [
    { method: 'GET', requiredPermission: 'MANAGE_BANK_ACCOUNTS' },
    { method: 'POST', requiredPermission: 'MANAGE_BANK_ACCOUNTS' },
    { method: 'PUT', requiredPermission: 'MANAGE_BANK_ACCOUNTS' },
    { method: 'DELETE', requiredPermission: 'MANAGE_BANK_ACCOUNTS' },
  ],
  '/api/settings/organization': [
    { method: 'GET', requiredPermission: 'MANAGE_ORGANIZATION_INFO' },
    { method: 'PUT', requiredPermission: 'MANAGE_ORGANIZATION_INFO' },
  ],
  '/api/settings/contact': [
    { method: 'GET', requiredPermission: 'MANAGE_CONTACT_DETAILS' },
    { method: 'PUT', requiredPermission: 'MANAGE_CONTACT_DETAILS' },
  ],
  '/api/settings/public-cms': [
    { method: 'GET', requiredPermission: 'MANAGE_PUBLIC_PAGES' },
    { method: 'PUT', requiredPermission: 'MANAGE_PUBLIC_PAGES' },
  ],
  '/api/settings/registration': [
    { method: 'GET', requiredPermission: 'MANAGE_REGISTRATION_SETTINGS' },
    { method: 'PUT', requiredPermission: 'MANAGE_REGISTRATION_SETTINGS' },
  ],
  '/api/members': [
    { method: 'GET', requiredPermission: 'MANAGE_MEMBER_INFO' },
    { method: 'POST', requiredPermission: 'MANAGE_MEMBER_INFO' },
    { method: 'PUT', requiredPermission: 'MANAGE_MEMBER_INFO' },
    { method: 'DELETE', requiredPermission: 'MANAGE_MEMBER_INFO' },
  ],
  '/api/executives': [
    { method: 'GET', requiredPermission: 'MANAGE_LEADERSHIP_DIRECTORY' },
    { method: 'POST', requiredPermission: 'MANAGE_LEADERSHIP_DIRECTORY' },
    { method: 'PUT', requiredPermission: 'MANAGE_LEADERSHIP_DIRECTORY' },
    { method: 'DELETE', requiredPermission: 'MANAGE_LEADERSHIP_DIRECTORY' },
  ],
  '/api/announcements': [
    { method: 'GET', requiredPermission: 'MANAGE_ANNOUNCEMENTS' },
    { method: 'POST', requiredPermission: 'MANAGE_ANNOUNCEMENTS' },
    { method: 'PUT', requiredPermission: 'MANAGE_ANNOUNCEMENTS' },
    { method: 'DELETE', requiredPermission: 'MANAGE_ANNOUNCEMENTS' },
  ],
  '/api/gallery': [
    { method: 'GET', requiredPermission: 'MANAGE_GALLERY' },
    { method: 'POST', requiredPermission: 'MANAGE_GALLERY' },
    { method: 'PUT', requiredPermission: 'MANAGE_GALLERY' },
    { method: 'DELETE', requiredPermission: 'MANAGE_GALLERY' },
  ],
  '/api/documents': [
    { method: 'GET', requiredPermission: 'MANAGE_DOWNLOADS' },
    { method: 'POST', requiredPermission: 'MANAGE_DOWNLOADS' },
    { method: 'PUT', requiredPermission: 'MANAGE_DOWNLOADS' },
    { method: 'DELETE', requiredPermission: 'MANAGE_DOWNLOADS' },
  ],
  // Super Admin Exclusive Endpoints
  '/api/admin-accounts': [
    { method: 'GET', requiredPermission: 'MANAGE_ADMIN_ACCOUNTS' },
    { method: 'POST', requiredPermission: 'MANAGE_ADMIN_ACCOUNTS' },
    { method: 'PUT', requiredPermission: 'MANAGE_ADMIN_ACCOUNTS' },
    { method: 'DELETE', requiredPermission: 'MANAGE_ADMIN_ACCOUNTS' },
  ],
  '/api/system/maintenance': [
    { method: 'PUT', requiredPermission: 'SYSTEM_SECURITY' },
  ],
  '/api/system/backup': [
    { method: 'POST', requiredPermission: 'BACKUP_RESTORE' },
  ],
  '/api/system/restore': [
    { method: 'POST', requiredPermission: 'BACKUP_RESTORE' },
  ],
  '/api/audit-logs': [
    { method: 'GET', requiredPermission: 'AUDIT_LOGS' },
  ],
};

/**
 * Backend API Authorization Checker.
 * Validates whether the caller role has permission to execute the requested endpoint/method.
 */
export function handleApiCall(req: ApiRequest): ApiResponse {
  const userRole = req.headers.role || 'viewer';
  const routes = API_PERMISSION_MAP[req.endpoint];

  if (!routes) {
    return {
      status: 404,
      success: false,
      message: `API Route ${req.endpoint} not found.`,
    };
  }

  const routeMatch = routes.find((r) => r.method === req.method);
  if (!routeMatch) {
    return {
      status: 405,
      success: false,
      message: `Method ${req.method} not allowed on ${req.endpoint}.`,
    };
  }

  const allowed = hasPermission(userRole, routeMatch.requiredPermission);

  if (!allowed) {
    return {
      status: 403,
      success: false,
      message: `HTTP 403 Forbidden: Role "${userRole}" lacks permission "${routeMatch.requiredPermission}" for ${req.method} ${req.endpoint}.`,
      error: 'INSUFFICIENT_PERMISSIONS',
    };
  }

  return {
    status: 200,
    success: true,
    message: `HTTP 200 OK: ${req.method} ${req.endpoint} authorized for role "${userRole}".`,
    data: req.body,
  };
}
