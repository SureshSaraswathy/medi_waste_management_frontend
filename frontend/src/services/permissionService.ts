import { User } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

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

/**
 * Check if user is SUPER_ADMIN
 */
export const isSuperAdmin = (user: User | null): boolean => {
  if (!user) return false;
  
  // Check by role
  if (user.roles && Array.isArray(user.roles) && user.roles.includes('superadmin')) {
    return true;
  }
  
  // Check by email
  const email = user.email?.toLowerCase()?.trim();
  if (email === 'superadmin@medi-waste.io' || email === 'superadmin') {
    return true;
  }
  
  return false;
};

/**
 * Fetch user permissions from backend
 */
export const fetchUserPermissions = async (token: string): Promise<string[]> => {
  try {
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
  return permissions.includes(requiredPermission);
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
