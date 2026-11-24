import { API_BASE_URL } from './apiBaseUrl';

export type RolloutMode = 'OFF' | 'SHADOW' | 'ENFORCE';

export interface MyEntitlements {
  mode: RolloutMode;
  tenantMode: RolloutMode;
  version: string;
  isSuperAdmin: boolean;
  modules: string[];
  submodules: string[];
  features: string[];
}

export interface EntitlementNode {
  code: string;
  name: string;
  type: 'MODULE' | 'SUBMODULE' | 'FEATURE';
  core: boolean;
  stored: boolean | null;
  effective: boolean;
  isNew: boolean;
  introducedIn: string | null;
  submodules?: EntitlementNode[];
  features?: EntitlementNode[];
}

/** One customer in the SuperAdmin list. Shape = GET /admin/entitlements/companies (camelCase, as the backend sends it). */
export interface CompanySummary {
  companyId: string;
  companyCode: string;
  companyName: string;
  status: string;
  enabledModules: number;
  totalModules: number;
  newItems: number;
}

/** Shape = GET /admin/entitlements/companies/:id */
export interface CompanyTree {
  company: { companyId: string; companyCode: string; companyName: string };
  version: string;
  modes: { mode: RolloutMode; tenantMode: RolloutMode };
  totals: { items: number; effective: number; newItems: number };
  modules: EntitlementNode[];
}

/** Shape = rows of GET /admin/entitlements/companies/:id/audit */
export interface AuditRow {
  auditId: string;
  batchId: string | null;
  companyId: string;
  entityCode: string;
  oldValue: boolean | null;
  newValue: boolean | null;
  action: string;
  changedBy: string | null;
  changedByName: string | null;
  changedOn: string;
  reason: string | null;
}

export class EntitlementApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const getAuthToken = (): string | null => {
  try {
    const raw = localStorage.getItem('mw-auth-user');
    if (raw) return JSON.parse(raw).token || null;
  } catch {
    /* ignore */
  }
  return null;
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    const msg = Array.isArray(body?.message) ? body.message.join(', ') : body?.message || `HTTP ${res.status}`;
    throw new EntitlementApiError(msg, res.status, body?.code);
  }
  return (body?.data ?? body) as T;
}

export const entitlementService = {
  me: () => call<MyEntitlements>('/entitlements/me'),
  companies: () => call<CompanySummary[]>('/admin/entitlements/companies'),
  companyTree: (id: string) => call<CompanyTree>(`/admin/entitlements/companies/${id}`),
  save: (id: string, changes: Array<{ code: string; enabled: boolean }>, expectedVersion: string, reason?: string) =>
    call<{ changed: number; batchId: string | null; version: string }>(`/admin/entitlements/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ changes, expectedVersion, reason: reason || null }),
    }),
  audit: (id: string, page = 1, pageSize = 25) =>
    call<{ page: number; pageSize: number; total: number; rows: AuditRow[] }>(
      `/admin/entitlements/companies/${id}/audit?page=${page}&pageSize=${pageSize}`,
    ),
  modes: () => call<{ mode: RolloutMode; tenantMode: RolloutMode }>('/admin/entitlements/mode'),
  setModes: (m: { mode?: RolloutMode; tenantMode?: RolloutMode }) =>
    call<{ mode: RolloutMode; tenantMode: RolloutMode }>('/admin/entitlements/mode', { method: 'PUT', body: JSON.stringify(m) }),
  shadowReport: (days = 14) => call<any>(`/admin/entitlements/shadow-report?days=${days}`),
};
