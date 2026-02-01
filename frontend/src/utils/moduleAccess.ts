import { hasPermission } from '../services/permissionService';

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

const MODULE_ANY_PERMISSIONS: Record<DesktopModuleKey, string[]> = {
  dashboard: ['DASHBOARD_VIEW', 'DASHBOARD.VIEW'],
  transaction: [
    'MENU_TRANSACTION_VIEW',
    'ROUTE_ASSIGNMENT_VIEW',
    'BARCODE_LABEL_VIEW',
    'WASTE_COLLECTION_VIEW',
    'WASTE_TRANSACTION_VIEW',
    'VEHICLE_WASTE_COLLECTION_VIEW',
    'WASTE_PROCESS_VIEW',
  ],
  finance: ['FINANCE_VIEW', 'FINANCE.VIEW', 'INVOICE_VIEW', 'INVOICE.VIEW'],
  commercial: [
    'MENU_COMMERCIAL_VIEW',
    'CONTRACT_VIEW',
    'AGREEMENT_VIEW',
    'AGREEMENT_CLAUSE_VIEW',
  ],
  compliance: ['MENU_COMPLIANCE_VIEW', 'TRAINING_CERTIFICATE_VIEW', 'TRAINING_CERTIFICATE.VIEW'],
  master: [
    'MENU_MASTER_VIEW',
    'COMPANY_VIEW',
    'STATE_VIEW',
    'AREA_VIEW',
    'CATEGORY_VIEW',
    'PCB_ZONE_VIEW',
    'COLOR_VIEW',
    'FREQUENCY_VIEW',
    'HCF_TYPE_VIEW',
    'HCF_VIEW',
    'ROUTE_VIEW',
    'FLEET_VIEW',
    'ROUTE_HCF_VIEW',
    'USER_VIEW',
    'ROLE_VIEW',
  ],
  report: ['MENU_REPORTS_VIEW', 'REPORTS_VIEW', 'REPORTS.VIEW'],
};

export function canAccessDesktopModule(userPermissions: string[] | undefined, moduleKey: DesktopModuleKey): boolean {
  const perms = Array.isArray(userPermissions) ? userPermissions : [];
  if (perms.includes('*')) return true;
  const candidates = MODULE_ANY_PERMISSIONS[moduleKey] || [];
  return candidates.some((p) => hasPermission(perms, p));
}

