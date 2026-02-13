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

// Strict module gating:
// - Modules are visible only when the explicit MENU_*_VIEW permission is present.
// - Dashboard shell is always visible for authenticated users (widgets/APIs remain protected separately).
const MODULE_MENU_PERMISSIONS: Record<Exclude<DesktopModuleKey, 'dashboard'>, string[]> = {
  // Keep this aligned with backend auth/menu-config hasAny(...) rules.
  transaction: [
    'MENU_TRANSACTION_VIEW', 'MENU_TRANSACTION.VIEW',
    'ROUTE_ASSIGNMENT_VIEW', 'ROUTE_ASSIGNMENT.VIEW',
    'BARCODE_LABEL_VIEW', 'BARCODE_LABEL.VIEW',
    'WASTE_COLLECTION_VIEW', 'WASTE_COLLECTION.VIEW',
    'WASTE_TRANSACTION_VIEW', 'WASTE_TRANSACTION.VIEW',
    'VEHICLE_WASTE_COLLECTION_VIEW', 'VEHICLE_WASTE_COLLECTION.VIEW',
    'WASTE_PROCESS_VIEW', 'WASTE_PROCESS.VIEW',
  ],
  finance: [
    'MENU_FINANCE_VIEW', 'MENU_FINANCE.VIEW',
    'FINANCE_VIEW', 'FINANCE.VIEW',
    'INVOICE_VIEW', 'INVOICE.VIEW',
  ],
  commercial: [
    'MENU_COMMERCIAL_VIEW', 'MENU_COMMERCIAL.VIEW',
    'CONTRACT_VIEW', 'CONTRACT.VIEW',
    'AGREEMENT_VIEW', 'AGREEMENT.VIEW',
    'AGREEMENT_CLAUSE_VIEW', 'AGREEMENT_CLAUSE.VIEW',
  ],
  compliance: [
    'MENU_COMPLIANCE_VIEW', 'MENU_COMPLIANCE.VIEW',
    'TRAINING_CERTIFICATE_VIEW', 'TRAINING_CERTIFICATE.VIEW',
  ],
  // Backward compatibility:
  // - Older seed/migrations used MASTERS_VIEW for module-level access.
  // - Keep MENU_MASTER_VIEW as the preferred explicit menu permission.
  master: [
    'MENU_MASTER_VIEW', 'MENU_MASTER.VIEW',
    'MASTERS_VIEW', 'MASTERS.VIEW', 'MASTER_VIEW', 'MASTER.VIEW',
    'COMPANY_VIEW', 'COMPANY.VIEW',
    'STATE_VIEW', 'STATE.VIEW',
    'AREA_VIEW', 'AREA.VIEW',
    'CATEGORY_VIEW', 'CATEGORY.VIEW',
    'COLOR_VIEW', 'COLOR.VIEW',
    'PCB_ZONE_VIEW', 'PCB_ZONE.VIEW',
    'FREQUENCY_VIEW', 'FREQUENCY.VIEW',
    'HCF_TYPE_VIEW', 'HCF_TYPE.VIEW',
    'HCF_VIEW', 'HCF.VIEW',
    'ROUTE_VIEW', 'ROUTE.VIEW',
    'FLEET_VIEW', 'FLEET.VIEW',
    'ROUTE_HCF_VIEW', 'ROUTE_HCF.VIEW',
    'USER_VIEW', 'USER.VIEW',
    'ROLE_VIEW', 'ROLE.VIEW',
  ],
  report: ['MENU_REPORTS_VIEW', 'MENU_REPORTS.VIEW', 'REPORTS_VIEW', 'REPORTS.VIEW'],
};

export function canAccessDesktopModule(userPermissions: string[] | undefined, moduleKey: DesktopModuleKey): boolean {
  const perms = Array.isArray(userPermissions) ? userPermissions : [];
  if (perms.includes('*')) return true;
  if (moduleKey === 'dashboard') return true;
  const candidates = MODULE_MENU_PERMISSIONS[moduleKey] || [];
  return candidates.some((p) => hasPermission(perms, p));
}

