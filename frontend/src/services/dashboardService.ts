/**
 * Dashboard Service
 * 
 * Handles fetching dashboard configurations, menu items, and permissions
 * from the backend API. Supports role-based configuration and user overrides.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

import { DashboardConfig, MenuItem, WidgetConfig, Role, UserPermissionOverrides, ComputedPermissions } from '../types/dashboard';

/**
 * Get auth token from localStorage
 */
const getAuthToken = (): string | null => {
  const authData = localStorage.getItem('mw-auth-user');
  if (authData) {
    try {
      const user = JSON.parse(authData);
      return user.token || null;
    } catch {
      return null;
    }
  }
  return null;
};

/**
 * API request helper
 */
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const responseText = await response.text();
        if (responseText) {
          const errorData = JSON.parse(responseText);
          if (Array.isArray(errorData.message)) {
            errorMessage = errorData.message.join(', ');
          } else if (typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          }
        }
      } catch {
        // Use default error message
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const responseData = await response.json();
    return responseData;
  } catch (error) {
    console.error('[dashboardService] Request failed:', error);
    throw error;
  }
};

/**
 * Dashboard Service API
 */
export const dashboardService = {
  /**
   * Fetch dashboard configuration for a specific role
   * This should be called from the backend API endpoint: /dashboard/config/:role
   */
  getDashboardConfig: async (role: Role): Promise<DashboardConfig> => {
    try {
      const response = await apiRequest<{ success: boolean; data: DashboardConfig }>(`/dashboard/config/${role}`);
      return response.data;
    } catch (error) {
      console.error('[dashboardService] Failed to fetch dashboard config:', error);
      // Return default configuration if API fails
      return getDefaultDashboardConfig(role);
    }
  },

  /**
   * Fetch user-specific permission overrides
   * Endpoint: /dashboard/user-overrides/:userId
   */
  getUserOverrides: async (userId: string): Promise<UserPermissionOverrides | null> => {
    try {
      const response = await apiRequest<{ success: boolean; data: UserPermissionOverrides }>(`/dashboard/user-overrides/${userId}`);
      return response.data;
    } catch (error) {
      console.error('[dashboardService] Failed to fetch user overrides:', error);
      return null;
    }
  },

  /**
   * Compute final permissions (role + user overrides)
   */
  computePermissions: (
    roleConfig: DashboardConfig,
    userOverrides: UserPermissionOverrides | null
  ): ComputedPermissions => {
    // Start with role permissions
    const permissions = { ...roleConfig.permissions };
    const menuItems = [...roleConfig.menuItems];
    const widgets = [...roleConfig.widgets];

    // Apply user overrides if available
    if (userOverrides) {
      // Override permissions
      Object.entries(userOverrides.permissions).forEach(([key, value]) => {
        permissions[key] = value;
      });

      // Override menu visibility
      if (userOverrides.menuOverrides) {
        menuItems.forEach((item) => {
          if (userOverrides.menuOverrides![item.id] !== undefined) {
            item.visible = userOverrides.menuOverrides![item.id];
          }
        });
      }

      // Override widget visibility
      if (userOverrides.widgetOverrides) {
        widgets.forEach((widget) => {
          if (userOverrides.widgetOverrides![widget.id] !== undefined) {
            // Filter out hidden widgets
            const index = widgets.indexOf(widget);
            if (!userOverrides.widgetOverrides![widget.id] && index !== -1) {
              widgets.splice(index, 1);
            }
          }
        });
      }
    }

    // Filter menu items and widgets based on permissions
    // Recursively filter menu items including children
    const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
      return items
        .filter((item) => {
          if (!item.visible) return false;
          if (item.permission && !permissions[item.permission]) return false;
          return true;
        })
        .map((item) => {
          // Recursively filter children if they exist
          if (item.children && item.children.length > 0) {
            const filteredChildren = filterMenuItems(item.children);
            return {
              ...item,
              children: filteredChildren.length > 0 ? filteredChildren : undefined,
            };
          }
          return item;
        });
    };

    const filteredMenuItems = filterMenuItems(menuItems);

    const filteredWidgets = widgets.filter((widget) => {
      if (widget.permissions?.view && !permissions[widget.permissions.view]) {
        return false;
      }
      return true;
    });

    return {
      permissions,
      menuItems: filteredMenuItems,
      widgets: filteredWidgets,
    };
  },

  /**
   * Get all available roles for preview mode
   * Roles are fetched from backend - no hardcoded list
   */
  getAvailableRoles: async (): Promise<Role[]> => {
    try {
      const response = await apiRequest<{ success: boolean; data: Role[] }>('/dashboard/roles');
      return response.data;
    } catch (error) {
      console.error('[dashboardService] Failed to fetch roles:', error);
      // Return empty array - backend should provide the list
      return [];
    }
  },
};

/**
 * Default dashboard configuration (fallback if API is not available)
 * 
 * NOTE: This is a fallback only. In production, all configurations should come from the backend API.
 * SuperAdmin gets default widgets so it works out of the box without configuration.
 */
function getDefaultDashboardConfig(role: Role): DashboardConfig {
  // SuperAdmin gets default widgets - no configuration needed
  if (role === 'superadmin') {
    return {
      role,
      widgets: [
        {
          id: 'metric-total-users',
          type: 'metric',
          title: 'Total Users',
          gridColumn: 1,
          dataSource: { endpoint: '/api/v1/users/count' },
          props: { unit: '', label: 'Active users' },
        },
        {
          id: 'metric-total-companies',
          type: 'metric',
          title: 'Total Companies',
          gridColumn: 1,
          dataSource: { endpoint: '/api/v1/companies/count' },
          props: { unit: '', label: 'Registered companies' },
        },
        {
          id: 'metric-total-hcfs',
          type: 'metric',
          title: 'Total HCFs',
          gridColumn: 1,
          dataSource: { endpoint: '/api/v1/hcfs/count' },
          props: { unit: '', label: 'Healthcare facilities' },
        },
        {
          id: 'metric-total-invoices',
          type: 'metric',
          title: 'Total Invoices',
          gridColumn: 1,
          dataSource: { endpoint: '/api/v1/invoices/count' },
          props: { unit: '', label: 'This month' },
        },
        {
          id: 'chart-revenue-trend',
          type: 'chart',
          title: 'Revenue Trend',
          gridColumn: 2,
          gridRow: 1,
          chartConfig: { type: 'line', xAxis: 'month', yAxis: 'revenue' },
          dataSource: { endpoint: '/api/v1/reports/revenue' },
        },
        {
          id: 'table-recent-activities',
          type: 'activity-timeline',
          title: 'Recent Activities',
          gridColumn: 2,
          gridRow: 1,
          dataSource: { endpoint: '/api/v1/activities/recent' },
          props: { maxItems: 10 },
        },
        {
          id: 'approval-queue',
          type: 'approval-queue',
          title: 'Pending Approvals',
          gridColumn: 2,
          dataSource: { endpoint: '/api/v1/approvals/pending' },
          permissions: {
            view: 'APPROVAL_VIEW',
            actions: { approve: 'APPROVAL_APPROVE', view: 'APPROVAL_VIEW' },
          },
        },
      ],
      menuItems: [
        { 
          id: 'dashboard', 
          label: 'Dashboard', 
          path: '/dashboard', 
          icon: 'dashboard', 
          visible: true 
        },
        { 
          id: 'transaction', 
          label: 'Transaction', 
          path: '/transaction', 
          icon: 'transaction', 
          visible: true,
          children: [
            { id: 'barcode', label: 'Barcode Generation', path: '/transaction/barcode-generation', icon: 'barcode', visible: true },
          ]
        },
        { 
          id: 'finance', 
          label: 'Finance', 
          path: '/finance', 
          icon: 'finance', 
          visible: true,
          children: [
            { id: 'invoice', label: 'Invoice Management', path: '/finance/invoice-management', icon: 'invoice', visible: true },
            { id: 'payment', label: 'Payment', path: '/finance/payment', icon: 'payment', visible: true },
            { id: 'receipt', label: 'Receipt Management', path: '/finance/receipt-management', icon: 'receipt', visible: true },
            { id: 'balance', label: 'Financial Balance', path: '/finance/financial-balance-summary', icon: 'balance', visible: true },
          ]
        },
        { 
          id: 'commercial', 
          label: 'Commercial / Agreements', 
          path: '/commercial-agreements', 
          icon: 'commercial', 
          visible: true 
        },
        { 
          id: 'compliance', 
          label: 'Compliance & Training', 
          path: '/compliance-training', 
          icon: 'compliance', 
          visible: true 
        },
        { 
          id: 'master', 
          label: 'Master', 
          path: '/master', 
          icon: 'master', 
          visible: true 
        },
        { 
          id: 'report', 
          label: 'Reports', 
          path: '/report', 
          icon: 'report', 
          visible: true 
        },
      ],
      permissions: {
        '*': true, // SuperAdmin has all permissions
      },
    };
  }

  // Other roles get minimal default
  return {
    role,
    widgets: [],
    menuItems: [
      { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'dashboard', visible: true },
    ],
    permissions: {},
  };
}
