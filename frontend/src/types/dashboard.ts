/**
 * Dashboard Configuration Types
 * 
 * These types define the structure for role-based dashboard configuration.
 * The dashboard is rendered dynamically based on role + user overrides.
 */

/**
 * Supported roles/departments
 * New roles can be added via backend configuration without frontend changes
 */
export type Role = 
  | 'driver' 
  | 'supervisor' 
  | 'field-executive' 
  | 'accountant' 
  | 'factory-incharge' 
  | 'manager' 
  | 'audit' 
  | 'ao' 
  | 'superadmin' 
  | 'data-entry';

/**
 * Widget types supported by the dashboard system
 * New widget types can be added by creating a component and registering it
 */
export type WidgetType = 
  | 'metric' 
  | 'chart' 
  | 'table' 
  | 'task-list' 
  | 'approval-queue' 
  | 'alert' 
  | 'activity-timeline' 
  | 'custom';

export type ChartType = 'line' | 'bar';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';

/**
 * Menu item configuration for sidebar
 */
export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon: string; // SVG path or icon identifier
  permission?: string; // Required permission code
  visible: boolean; // Whether this menu item is visible
  children?: MenuItem[]; // Submenu items
}

/**
 * Widget configuration
 * 
 * All widgets are driven by this configuration structure.
 * No hardcoded role checks - everything is configuration-based.
 */
export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  // Grid layout: column span (1-4 for desktop, responsive on mobile)
  gridColumn: number;
  gridRow?: number; // Optional row span
  // Permissions: widget visibility and actions
  permissions?: {
    view?: string; // Permission code required to view this widget
    actions?: Record<PermissionAction, string>; // Action-specific permissions
  };
  // Widget-specific configuration
  props?: Record<string, any>;
  // Data source configuration
  dataSource?: {
    endpoint: string;
    method?: 'GET' | 'POST';
    params?: Record<string, any>;
    refreshInterval?: number; // Auto-refresh interval in seconds
  };
  // Chart-specific configuration
  chartConfig?: {
    type: ChartType;
    xAxis?: string;
    yAxis?: string;
    series?: string[];
  };
}

/**
 * Dashboard configuration for a role
 */
export interface DashboardConfig {
  role: Role;
  widgets: WidgetConfig[];
  menuItems: MenuItem[];
  permissions: {
    [key: string]: boolean; // Permission code -> allowed
  };
}

/**
 * User-specific permission overrides
 */
export interface UserPermissionOverrides {
  userId: string;
  permissions: {
    [key: string]: boolean; // Permission code -> override value
  };
  menuOverrides?: {
    [menuId: string]: boolean; // Menu item ID -> visible
  };
  widgetOverrides?: {
    [widgetId: string]: boolean; // Widget ID -> visible
  };
}

/**
 * Final computed permissions (role + user overrides)
 */
export interface ComputedPermissions {
  permissions: {
    [key: string]: boolean;
  };
  menuItems: MenuItem[];
  widgets: WidgetConfig[];
}

/**
 * Preview mode state (for SuperAdmin)
 */
export interface PreviewMode {
  enabled: boolean;
  previewRole: Role | null;
  originalRole: Role;
}
