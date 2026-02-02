import { API_BASE_URL } from './apiBaseUrl';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string;
};

export type AdminPermissionItem = {
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  moduleName: string;
  description?: string | null;
  isActive: boolean;
};

const getAuthToken = (): string | null => {
  const raw = localStorage.getItem('mw-auth-user');
  if (!raw) return null;
  try {
    const user = JSON.parse(raw);
    return user?.token || null;
  } catch {
    return null;
  }
};

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Unauthorized: missing token');
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.message || body?.error || `HTTP ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : String(msg));
  }

  const json = (await res.json()) as ApiResponse<T>;
  return json.data;
}

export const permissionAdminService = {
  listPermissions: async (): Promise<AdminPermissionItem[]> => {
    return apiRequest<AdminPermissionItem[]>('/permissions', { method: 'GET' });
  },

  getRolePermissionCodes: async (roleId: string): Promise<string[]> => {
    return apiRequest<string[]>(`/permissions/roles/${roleId}`, { method: 'GET' });
  },

  replaceRolePermissions: async (roleId: string, permissionCodes: string[]): Promise<string[]> => {
    return apiRequest<string[]>(`/permissions/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify({ permissionCodes }),
    });
  },
};

