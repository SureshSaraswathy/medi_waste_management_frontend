import { ROUTE_ENTITLEMENTS, ENTITLEMENT_PARENT, CORE_MODULES } from './routeEntitlements.generated';
import type { MyEntitlements, RolloutMode } from '../services/entitlementService';
import type { DesktopModuleKey } from './moduleAccess';

/**
 * Customer entitlements (client side). The backend is the authority; this only hides what a customer has not bought.
 * Fail-open by design: until entitlements are loaded, or when licensing mode is not ENFORCE, nothing is hidden.
 */
export interface EntitlementSnapshot {
  loaded: boolean;
  mode: RolloutMode;
  isSuperAdmin: boolean;
  nodes: Set<string>;
}

const EMPTY: EntitlementSnapshot = { loaded: false, mode: 'OFF', isSuperAdmin: false, nodes: new Set() };
let snapshot: EntitlementSnapshot = EMPTY;
const listeners = new Set<() => void>();

export const getEntitlementSnapshot = () => snapshot;
export const subscribeEntitlements = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export function setEntitlementSnapshot(data: MyEntitlements | null): void {
  snapshot = data
    ? {
        loaded: true,
        mode: data.mode,
        isSuperAdmin: !!data.isSuperAdmin,
        nodes: new Set([...(data.modules || []), ...(data.submodules || []), ...(data.features || [])]),
      }
    : EMPTY;
  listeners.forEach((l) => l());
}

export const isEnforcing = (s: EntitlementSnapshot = snapshot) => s.loaded && s.mode === 'ENFORCE' && !s.isSuperAdmin;

const rootOf = (code: string) => {
  let c = code;
  while (ENTITLEMENT_PARENT[c]) c = ENTITLEMENT_PARENT[c];
  return c;
};

export function isCodeEntitled(code: string, s: EntitlementSnapshot = snapshot): boolean {
  if (!isEnforcing(s)) return true;
  if (CORE_MODULES.includes(rootOf(code))) return true;
  return s.nodes.has(code);
}

/** Entitlement code for a frontend path (longest matching prefix), or null when the route is not licensed. */
export function routeCode(path: string): string | null {
  const p = (path || '').split('?')[0].replace(/\/+$/, '') || '/';
  let best: string | null = null;
  let bestLen = -1;
  for (const [prefix, code] of ROUTE_ENTITLEMENTS) {
    if ((p === prefix || p.startsWith(prefix + '/')) && prefix.length > bestLen) {
      best = code;
      bestLen = prefix.length;
    }
  }
  return best;
}

export const isRouteEntitled = (path: string): boolean => {
  const code = routeCode(path);
  return code ? isCodeEntitled(code) : true;
};

const MODULE_CODES: Partial<Record<DesktopModuleKey, string>> = {
  transaction: 'TRANSACTION',
  finance: 'FINANCE',
  commercial: 'COMMERCIAL',
  compliance: 'COMPLIANCE',
  report: 'REPORTS',
};

/** dashboard and master stay visible: Dashboard is core and Master hosts the core Administration pages. */
export const isModuleEntitled = (key: DesktopModuleKey): boolean => {
  const code = MODULE_CODES[key];
  return code ? isCodeEntitled(code) : true;
};
