import { User } from '../context/AuthContext';
import { API_BASE_URL } from './apiBaseUrl';

export interface MenuConfig {
  dashboard: { visible: boolean; permission: string };
  transaction: { visible: boolean; permission: string };
  finance: { visible: boolean; permission: string };
  commercialAgreements: { visible: boolean; permission: string };
  complianceTraining: { visible: boolean; permission: string };
  master: {
    visible: boolean;
    permission: string;
    submenus: {
      [key: string]: { visible: boolean; permission: string };
    };
  };
  report: { visible: boolean; permission: string };
}

export interface PermissionResponse {
  success: boolean;
  data: {
    userId: string;
    permissions: string[];
    isSuperAdmin: boolean;
  };
  message: string;
}

export interface MenuConfigResponse {
  success: boolean;
  data: MenuConfig;
  message: string;
}

// NOTE:
// Do not hardcode role names on the frontend.
// Use permissions returned by the backend (`*` wildcard indicates full access).

/**
 * Fetch user permissions from backend
 */
export const fetchUserPermissions = async (token: string): Promise<string[]> => {
  try {
    // Preferred endpoint (flat list): /permissions/me
    // Backward compatibility: fallback to /auth/permissions if needed.
    const tryFetch = async (url: string) => {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch permissions');
      return response.json();
    };

    try {
      const result = await tryFetch(`${API_BASE_URL}/permissions/me`);
      // { success, data: string[] }
      return (result?.data || []) as string[];
    } catch {
      // Fallback to legacy endpoint
    }

    const response = await fetch(`${API_BASE_URL}/auth/permissions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch permissions');
    }

    const result: PermissionResponse = await response.json();
    return result.data.permissions || [];
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return [];
  }
};

/**
 * Fetch menu configuration from backend
 */
export const fetchMenuConfig = async (token: string): Promise<MenuConfig | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/menu-config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch menu config');
    }

    const result: MenuConfigResponse = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching menu config:', error);
    return null;
  }
};

/**
 * Check if user has a specific permission
 */
export const hasPermission = (permissions: string[], requiredPermission: string): boolean => {
  // SUPER_ADMIN has all permissions (wildcard)
  if (permissions.includes('*')) {
    return true;
  }

  const req = (requiredPermission || '').trim();
  if (!req) return false;

  // Support FEATURE.ACTION <-> FEATURE_ACTION for backward compatibility
  const variants = new Set<string>([req]);
  if (req.includes('.')) variants.add(req.replace(/\./g, '_'));
  if (req.includes('_')) variants.add(req.replace(/_/g, '.'));

  for (const v of variants) {
    if (permissions.includes(v)) return true;
  }

  return false;
};

/**
 * Check if user can access a menu item
 */
export const canAccessMenu = (
  menuConfig: MenuConfig | null,
  menuKey: keyof MenuConfig,
  submenuKey?: string,
): boolean => {
  if (!menuConfig) return false;
  
  const menu = menuConfig[menuKey];
  if (!menu) return false;

  // Check submenu if provided
  if (submenuKey && 'submenus' in menu && menu.submenus) {
    const submenu = menu.submenus[submenuKey];
    return submenu ? submenu.visible : false;
  }

  return menu.visible;
};
