import { API_BASE_URL } from './apiBaseUrl';

export type PermissionAdminItem = {
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  moduleName: string;
  description: string | null;
  isActive: boolean;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

const authedFetch = async <T>(token: string, path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...(init || {}),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok) {
    const msg = (json as any)?.message || (json as any)?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  if (!json?.success) throw new Error(json?.message || 'Request failed');
  return json.data;
};

export const permissionAdminService = {
  listAllPermissions: (token: string) => authedFetch<PermissionAdminItem[]>(token, '/permissions'),
  getRolePermissionCodes: (token: string, roleId: string) =>
    authedFetch<string[]>(token, `/permissions/roles/${roleId}`),
  replaceRolePermissions: (token: string, roleId: string, permissionCodes: string[]) =>
    authedFetch<string[]>(
      token,
      `/permissions/roles/${roleId}`,
      { method: 'PUT', body: JSON.stringify({ permissionCodes }) },
    ),
};

