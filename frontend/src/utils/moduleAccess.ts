import { hasPermission } from '../services/permissionService';
import { isModuleEntitled } from './entitlements';
import { MODULE_HUB_PERMISSIONS } from './modulePermissions';

/**
 * Module-level permission gating for desktop sidebar menus.
 *
 * Why this exists:
 * - Many desktop pages render a static sidebar.
 * - If a user has NO permissions (role_permissions empty), we must NOT show all menus.
 * - We treat menus as visible if the user has ANY relevant VIEW permission for that module.
 *
 * Notes:
 * - Uses `hasPermission` which supports underscore and dot variants (e.g. INVOICE_VIEW and INVOICE.VIEW).
 * - SUPER_ADMIN wildcard '*' enables everything.
 */
export type DesktopModuleKey =
  | 'dashboard'
  | 'transaction'
  | 'finance'
  | 'commercial'
  | 'compliance'
  | 'master'
  | 'report';

// Strict module gating:
// - A module item is visible only when the user holds one of the permissions that open the module's HUB page. The lists are shared
//   with the hub route guards in App.tsx (utils/modulePermissions.ts), so a link is never shown to someone the route would refuse.
// - Dashboard shell is always visible for authenticated users (widgets/APIs remain protected separately).
const MODULE_MENU_PERMISSIONS: Record<Exclude<DesktopModuleKey, 'dashboard'>, string[]> = MODULE_HUB_PERMISSIONS;

/**
 * Core Administration pages (User Management, Roles & Permissions). They belong to the core ADMINISTRATION entitlement module, so
 * they never depend on the Master entitlement. These lists mirror the route guards in App.tsx.
 */
export const ADMINISTRATION_PERMISSIONS = {
  users: ['USER_VIEW', 'USER_CREATE', 'USER_EDIT', 'USER_DELETE', 'USER_ACTIVATE', 'USER_DEACTIVATE'],
  roles: ['ROLE_VIEW', 'ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE', 'ROLE_PERMISSIONS_MANAGE'],
};

/** First core Administration page the user may open, or null (SuperAdmin included: they always can). */
export function firstAdministrationPath(userPermissions: string[] | undefined): string | null {
  const perms = Array.isArray(userPermissions) ? userPermissions : [];
  if (perms.includes('*')) return '/master/user-management';
  if (ADMINISTRATION_PERMISSIONS.users.some((p) => hasPermission(perms, p))) return '/master/user-management';
  if (ADMINISTRATION_PERMISSIONS.roles.some((p) => hasPermission(perms, p))) return '/master/roles-permissions';
  return null;
}

export function canAccessDesktopModule(userPermissions: string[] | undefined, moduleKey: DesktopModuleKey): boolean {
  const perms = Array.isArray(userPermissions) ? userPermissions : [];
  if (perms.includes('*')) return true;
  if (moduleKey === 'dashboard') return true;
  // Customer entitlement (only restricts when licensing mode is ENFORCE; SuperAdmin returned above)
  if (!isModuleEntitled(moduleKey)) return false;
  const candidates = MODULE_MENU_PERMISSIONS[moduleKey] || [];
  return candidates.some((p) => hasPermission(perms, p));
}

