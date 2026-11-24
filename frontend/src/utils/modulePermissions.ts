/**
 * Permissions that open each module's HUB page. This is the SINGLE definition used by BOTH
 *  - the hub route guards in App.tsx (RequireAnyPermission), and
 *  - the sidebar visibility rules in moduleAccess.ts,
 * so a sidebar link is shown exactly when the hub behind it would open (never "link visible, then Not Authorized").
 *
 * Underscore and dot variants are both listed because that is what the route guards have always accepted.
 * Narrower per-page permissions (e.g. INVOICE_VIEW, CONTRACT_VIEW, ROUTE_ASSIGNMENT_VIEW) open individual pages, not the hub, and
 * therefore do not make the hub's sidebar item appear.
 *
 * The backend /auth/menu-config `visible` flags mirror these lists (a contract test checks both stay identical).
 */
export const MODULE_HUB_PERMISSIONS: Record<'transaction' | 'finance' | 'commercial' | 'compliance' | 'master' | 'report', string[]> = {
  transaction: ['MENU_TRANSACTION_VIEW', 'MENU_TRANSACTION.VIEW'],
  finance: ['MENU_FINANCE_VIEW', 'MENU_FINANCE.VIEW', 'FINANCE_VIEW', 'FINANCE.VIEW'],
  commercial: ['MENU_COMMERCIAL_VIEW', 'MENU_COMMERCIAL.VIEW'],
  compliance: ['MENU_COMPLIANCE_VIEW', 'MENU_COMPLIANCE.VIEW'],
  // MASTERS_VIEW / MASTER_VIEW are kept for older role seeds.
  master: ['MENU_MASTER_VIEW', 'MENU_MASTER.VIEW', 'MASTERS_VIEW', 'MASTERS.VIEW', 'MASTER_VIEW', 'MASTER.VIEW'],
  report: ['MENU_REPORTS_VIEW', 'MENU_REPORTS.VIEW', 'REPORTS_VIEW', 'REPORTS.VIEW'],
};
