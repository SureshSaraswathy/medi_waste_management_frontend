/**
 * Frontend permission helpers
 *
 * IMPORTANT:
 * - Do NOT hardcode role names on the frontend.
 * - Use the permission_code list from the backend (`GET /permissions/me`).
 * - Wildcard `*` means full access (SuperAdmin).
 *
 * Convention (recommended):
 * - <FEATURE>.<ACTION>  e.g. INVOICE.VIEW, INVOICE.CREATE
 * Backward compatibility:
 * - Old underscore codes (INVOICE_VIEW) are supported by normalization.
 */

export const hasPermission = (permissions: string[], requiredPermission: string): boolean => {
  if (!Array.isArray(permissions) || permissions.length === 0) return false;
  if (permissions.includes('*')) return true;

  const req = (requiredPermission || '').trim();
  if (!req) return false;

  const variants = new Set<string>([req]);
  if (req.includes('.')) variants.add(req.replace(/\./g, '_'));
  if (req.includes('_')) variants.add(req.replace(/_/g, '.'));

  for (const v of variants) {
    if (permissions.includes(v)) return true;
  }
  return false;
};

/**
 * Check if the user can create master data
 * SuperAdmin and Admin can create master data
 */
export const canCreateMasterData = (permissions: string[]): boolean => {
  // Broad, additive helper: any create permission is considered "can create masters"
  // (Use module-specific permissions for strict control: e.g. HCF.CREATE)
  if (hasPermission(permissions, 'MASTERS.CREATE')) return true;
  return permissions.includes('*') || permissions.some((p) => p.endsWith('.CREATE') || p.endsWith('_CREATE'));
};

/**
 * Check if the user can edit master data
 * SuperAdmin and Admin can edit master data
 */
export const canEditMasterData = (permissions: string[]): boolean => {
  if (hasPermission(permissions, 'MASTERS.EDIT')) return true;
  return permissions.includes('*') || permissions.some((p) => p.endsWith('.EDIT') || p.endsWith('_EDIT') || p.endsWith('.UPDATE') || p.endsWith('_UPDATE'));
};

/**
 * Check if the user can delete master data
 * Only SuperAdmin can delete master data
 */
export const canDeleteMasterData = (permissions: string[]): boolean => {
  if (hasPermission(permissions, 'MASTERS.DELETE')) return true;
  return permissions.includes('*') || permissions.some((p) => p.endsWith('.DELETE') || p.endsWith('_DELETE'));
};
