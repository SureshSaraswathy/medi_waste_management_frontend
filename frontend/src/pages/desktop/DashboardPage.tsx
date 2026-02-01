/**
 * Dashboard Page Component
 * 
 * Main dashboard page that renders widgets dynamically based on:
 * - Role configuration (from backend API)
 * - User-specific permission overrides
 * - Preview mode (for SuperAdmin)
 * 
 * Widgets are rendered in a responsive grid:
 * - 4 columns on desktop
 * - 2 columns on tablet
 * - 1 column on mobile
 */

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { dashboardService } from '../../services/dashboardService';
import { fetchWidgetData } from '../../services/widgetDataService';
import { hasPermission } from '../../services/permissionService';
import { WidgetConfig, Role } from '../../types/dashboard';
import { MetricWidget } from '../../components/dashboard/widgets/MetricWidget';
import { ChartWidget } from '../../components/dashboard/widgets/ChartWidget';
import { TableWidget } from '../../components/dashboard/widgets/TableWidget';
import { TaskListWidget } from '../../components/dashboard/widgets/TaskListWidget';
import { ApprovalQueueWidget } from '../../components/dashboard/widgets/ApprovalQueueWidget';
import { AlertWidget } from '../../components/dashboard/widgets/AlertWidget';
import { ActivityTimelineWidget } from '../../components/dashboard/widgets/ActivityTimelineWidget';
import './dashboardPage.css';

// Lazy load widget components for better performance
const WidgetRenderer: React.FC<{ widget: WidgetConfig; permissions: Record<string, boolean>; isPreviewMode: boolean }> = ({
  widget,
  permissions,
  isPreviewMode,
}) => {
  const [widgetData, setWidgetData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validate widget before processing
  if (!widget || typeof widget !== 'object' || Array.isArray(widget)) {
    console.error('[WidgetRenderer] Invalid widget passed:', widget);
    return null;
  }

  if (!widget.id || !widget.type) {
    console.error('[WidgetRenderer] Widget missing required properties (id or type):', widget);
    return null;
  }

  // Check if user has permission to view this widget
  const canView = useMemo(() => {
    if (!widget.permissions?.view) return true;
    return permissions[widget.permissions.view] === true;
  }, [widget.permissions, permissions]);

  // Load widget data from backend API
  useEffect(() => {
    // Validate widget again in useEffect
    if (!widget || !widget.id || !widget.type) {
      console.error('[WidgetRenderer] Widget validation failed in useEffect:', widget);
      setLoading(false);
      return;
    }

    // Debug: Log widget configuration
    console.log(`[WidgetRenderer] Widget ${widget.id} check:`, {
      hasDataSource: !!widget.dataSource,
      hasEndpoint: !!widget.dataSource?.endpoint,
      endpoint: widget.dataSource?.endpoint,
      canView,
      permissions: widget.permissions,
      widgetType: widget.type,
    });
    
    if (!widget.dataSource?.endpoint) {
      console.warn(`[WidgetRenderer] Widget ${widget.id} has no dataSource.endpoint, skipping API call`, {
        widgetId: widget.id,
        widgetTitle: widget.title,
        widgetType: widget.type,
        dataSource: widget.dataSource,
        fullWidget: widget,
      });
      setLoading(false);
      return;
    }
    
    if (!canView) {
      console.warn(`[WidgetRenderer] Widget ${widget.id} cannot be viewed (permission check failed)`, {
        widgetId: widget.id,
        widgetTitle: widget.title,
        requiredPermission: widget.permissions?.view,
        permissions: permissions,
      });
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`[WidgetRenderer] Loading data for widget:`, {
          id: widget.id,
          type: widget.type,
          endpoint: widget.dataSource?.endpoint,
          fullWidget: widget,
        });
        
        // Fetch data from backend dashboard API
        const data = await fetchWidgetData(widget);
        
        console.log(`[WidgetRenderer] Data loaded for widget ${widget.id}:`, {
          data,
          hasValue: data?.value !== undefined,
          value: data?.value,
          fullData: data,
        });
        
        // Validate data before setting
        if (data === null || data === undefined) {
          console.warn(`[WidgetRenderer] Widget ${widget.id} returned null/undefined data`);
          setWidgetData({ value: 0 });
        } else {
          setWidgetData(data);
        }
      } catch (err: any) {
        console.error(`[WidgetRenderer] Failed to load data for widget ${widget.id}:`, err);
        console.error(`[WidgetRenderer] Error type:`, typeof err);
        console.error(`[WidgetRenderer] Error message:`, err?.message);
        console.error(`[WidgetRenderer] Error stack:`, err?.stack);
        console.error(`[WidgetRenderer] Widget config:`, widget);
        setError('Failed to load data');
        // Set default data on error to prevent widget from breaking
        setWidgetData({ value: 0 });
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Auto-refresh if refreshInterval is configured
    let refreshInterval: NodeJS.Timeout | null = null;
    if (widget.dataSource.refreshInterval && widget.dataSource.refreshInterval > 0) {
      refreshInterval = setInterval(loadData, widget.dataSource.refreshInterval * 1000);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [widget, canView]);

  if (!canView) {
    return null;
  }

  // Normalize widget type (handle variations from backend)
  const normalizedType = (widget.type?.toLowerCase().trim() || 'metric');
  
  // Render widget based on type
  // All widget rendering is configuration-driven - no hardcoded role checks
  switch (normalizedType) {
    case 'metric':
    case 'kpi':
      return (
        <MetricWidget
          title={widget.title}
          value={widgetData?.value || 0}
          unit={widgetData?.unit}
          label={widgetData?.label}
          trend={widgetData?.trend}
          loading={loading}
        />
      );

    case 'chart':
      return (
        <ChartWidget
          title={widget.title}
          type={widget.chartConfig?.type || 'line'}
          data={widgetData?.data || widgetData || []}
          loading={loading}
          xAxis={widget.chartConfig?.xAxis}
          yAxis={widget.chartConfig?.yAxis}
          series={widget.chartConfig?.series}
        />
      );

    case 'table':
      return (
        <TableWidget
          title={widget.title}
          columns={widgetData?.columns || []}
          data={widgetData?.data || []}
          loading={loading}
          maxRows={widget.props?.maxRows || 5}
          onRowClick={isPreviewMode ? undefined : widgetData?.onRowClick}
        />
      );

    case 'task-list':
      return (
        <TaskListWidget
          title={widget.title}
          tasks={widgetData?.tasks || []}
          loading={loading}
          maxItems={widget.props?.maxItems || 5}
          onTaskClick={isPreviewMode ? undefined : widgetData?.onTaskClick}
        />
      );

    case 'approval-queue':
      return (
        <ApprovalQueueWidget
          title={widget.title}
          items={widgetData?.items || []}
          loading={loading}
          maxItems={widget.props?.maxItems || 5}
          onApprove={isPreviewMode ? undefined : widgetData?.onApprove}
          onReject={isPreviewMode ? undefined : widgetData?.onReject}
          onView={isPreviewMode ? undefined : widgetData?.onView}
          canApprove={permissions[widget.permissions?.actions?.approve || ''] || false}
          canReject={permissions[widget.permissions?.actions?.approve || ''] || false}
        />
      );

    case 'activity-timeline':
      return (
        <ActivityTimelineWidget
          title={widget.title}
          activities={widgetData?.activities || []}
          loading={loading}
          maxItems={widget.props?.maxItems || 10}
          onItemClick={isPreviewMode ? undefined : widgetData?.onItemClick}
        />
      );

    case 'alert':
      return (
        <AlertWidget
          title={widget.title}
          alerts={widgetData?.alerts || []}
          loading={loading}
          maxItems={widget.props?.maxItems || 5}
        />
      );

    default:
      console.warn(`[WidgetRenderer] Unknown widget type: "${widget.type}" (normalized: "${normalizedType}")`, widget);
      return (
        <div className="dashboard-widget-error">
          <p>Unknown widget type: {widget.type || 'undefined'}</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            Widget ID: {widget.id || 'N/A'}
          </p>
        </div>
      );
  }
};


const DashboardPage: React.FC = () => {
  const { user, permissions: userPermissions, logout } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [widgetPermissions, setWidgetPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [previewMode, setPreviewMode] = useState<{ enabled: boolean; role: Role | null }>({ enabled: false, role: null });

  // Check for preview mode from URL or sessionStorage
  useEffect(() => {
    const isPreview = searchParams.get('preview') === 'true';
    const previewConfig = sessionStorage.getItem('dashboard-preview-config');
    const previewRole = sessionStorage.getItem('dashboard-preview-role');

    if (isPreview && previewConfig && previewRole) {
      try {
        const config = JSON.parse(previewConfig);
        setPreviewMode({ enabled: true, role: previewRole as Role });
        setWidgets(config.widgets || []);
        setWidgetPermissions(config.permissions || {});
        setLoading(false);
      } catch (error) {
        console.error('Failed to load preview config:', error);
      }
    }
  }, [searchParams]);

  // Get current role (from preview mode or user)
  const currentRole: Role = previewMode.enabled && previewMode.role
    ? previewMode.role
    : ((user?.roles?.[0] as Role) || 'viewer');

  const isPreviewMode = previewMode.enabled;
  // SUPER_ADMIN is inferred from permissions wildcard; avoids hardcoding role names.
  const isSuperAdminUser = userPermissions.includes('*') || hasPermission(userPermissions, 'DASHBOARD_CONFIG.VIEW');

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleStartPreview = (role: Role) => {
    setPreviewMode({ enabled: true, role });
  };

  const handleExitPreview = () => {
    setPreviewMode({ enabled: false, role: null });
  };

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ), 
      active: location.pathname === '/dashboard' 
    },
    { 
      path: '/transaction', 
      label: 'Transaction', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      ), 
      active: location.pathname === '/transaction' || location.pathname.startsWith('/transaction')
    },
    { 
      path: '/finance', 
      label: 'Finance', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ), 
      active: location.pathname === '/finance' || location.pathname.startsWith('/finance')
    },
    { 
      path: '/commercial-agreements', 
      label: 'Commercial / Agreements', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ), 
      active: location.pathname === '/commercial-agreements' || location.pathname.startsWith('/commercial-agreements')
    },
    { 
      path: '/compliance-training', 
      label: 'Compliance & Training', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      ), 
      active: location.pathname === '/compliance-training' || location.pathname.startsWith('/compliance-training')
    },
    { 
      path: '/master', 
      label: 'Master', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
        </svg>
      ), 
      active: location.pathname === '/master' || location.pathname.startsWith('/master') 
    },
    { 
      path: '/report', 
      label: 'Reports', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ), 
      active: location.pathname.startsWith('/report')
    },
    // Dashboard Configuration menu item - ONLY visible for SuperAdmin
    // This menu item is additive and does not affect existing navigation
    ...(isSuperAdminUser ? [{
      path: '/admin/dashboard-configuration',
      label: 'Dashboard Configuration',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      ),
      active: location.pathname === '/admin/dashboard-configuration' || location.pathname.startsWith('/admin/dashboard-configuration')
    }] : []),
  ];

  // Load dashboard configuration
  useEffect(() => {
    // Skip loading if in preview mode (already loaded from sessionStorage)
    if (previewMode.enabled) {
      return;
    }

    const loadDashboard = async () => {
      setLoading(true);
      try {
        console.log('[DashboardPage] Loading dashboard for role:', currentRole);
        
        // Load role configuration from backend
        const roleConfig = await dashboardService.getDashboardConfig(currentRole);
        
        console.log('[DashboardPage] Loaded role config:', {
          role: roleConfig.role,
          widgetsCount: Array.isArray(roleConfig.widgets) ? roleConfig.widgets.length : 0,
          widgets: roleConfig.widgets,
        });
        
        // Load user overrides if available
        const userOverrides = user?.id
          ? await dashboardService.getUserOverrides(user.id)
          : null;

        // Compute final permissions and widgets
        const computed = dashboardService.computePermissions(roleConfig, userOverrides);
        
        console.log('[DashboardPage] Computed widgets:', {
          widgetsCount: Array.isArray(computed.widgets) ? computed.widgets.length : 0,
          widgets: computed.widgets,
        });
        
        // Normalize widgets array - handle cases where widgets might be nested or malformed
        let widgetsToProcess: any[] = [];
        
        if (Array.isArray(computed.widgets)) {
          // Flatten widgets if they're nested in arrays
          computed.widgets.forEach((item: any) => {
            if (Array.isArray(item)) {
              // If item is an array, add each element that is a valid widget object
              item.forEach((widget: any) => {
                if (widget && typeof widget === 'object' && !Array.isArray(widget)) {
                  widgetsToProcess.push(widget);
                }
              });
            } else if (item && typeof item === 'object' && !Array.isArray(item)) {
              // If item is a valid widget object, add it directly
              widgetsToProcess.push(item);
            }
          });
        } else if (computed.widgets && typeof computed.widgets === 'object' && !Array.isArray(computed.widgets)) {
          // If widgets is a single object, wrap it in an array
          widgetsToProcess = [computed.widgets];
        }
        
        console.log('[DashboardPage] Processed widgets:', {
          originalCount: Array.isArray(computed.widgets) ? computed.widgets.length : 0,
          processedCount: widgetsToProcess.length,
          widgets: widgetsToProcess,
        });
        
        // Validate and normalize widgets
        const validatedWidgets = widgetsToProcess
          .filter((widget) => {
            // First filter: Remove invalid entries (null, undefined, arrays, non-objects)
            if (!widget || typeof widget !== 'object' || Array.isArray(widget)) {
              console.warn('[DashboardPage] Filtering out invalid widget entry (not an object):', widget);
              return false;
            }
            return true;
          })
          .map((widget, index) => {
          // Ensure widget has required fields
          if (!widget.id) {
            widget.id = `widget-${Date.now()}-${index}-${Math.random()}`;
          }
          
          // Ensure dataSource exists
          if (!widget.dataSource) {
            widget.dataSource = {};
          }
          
          // If endpoint is missing, try to construct it from widget ID, title, or type
          if (!widget.dataSource.endpoint) {
            // Try to infer endpoint from widget ID, title, or type
            const widgetId = widget.id.toLowerCase();
            const widgetTitle = (widget.title || '').toLowerCase();
            const searchText = `${widgetId} ${widgetTitle}`;
            
            let inferredEndpoint: string | null = null;
            
            // Check by ID patterns first (most reliable for saved widgets)
            // Check for common widget ID patterns
            if (widgetId.includes('total-invoices') || widgetId.includes('totalinvoices') || widgetId.startsWith('metric-total-invoices')) {
              inferredEndpoint = '/dashboard/kpi/total-invoices';
            } else if (widgetId.includes('pending-invoices') || widgetId.includes('pendinginvoices') || widgetId.startsWith('metric-pending-invoices')) {
              inferredEndpoint = '/dashboard/kpi/pending-invoices';
            } else if (widgetId.includes('total-revenue') || widgetId.includes('totalrevenue') || widgetId.startsWith('metric-total-revenue')) {
              inferredEndpoint = '/dashboard/kpi/total-revenue';
            } else if (widgetId.includes('pending-payments') || widgetId.includes('pendingpayments') || widgetId.startsWith('metric-pending-payments')) {
              inferredEndpoint = '/dashboard/kpi/pending-payments';
            } else if (widgetId.includes('receipts-today') || widgetId.includes('receiptstoday')) {
              inferredEndpoint = '/dashboard/kpi/receipts-today';
            } else if (widgetId.includes('active-users') || widgetId.includes('activeusers')) {
              inferredEndpoint = '/dashboard/kpi/active-users';
            } else if (widgetId.includes('errors-today') || widgetId.includes('errorstoday')) {
              inferredEndpoint = '/dashboard/kpi/errors-today';
            } else if (widgetId.includes('monthly-revenue') || widgetId.includes('monthlyrevenue') || widgetId.startsWith('chart-monthly-revenue')) {
              inferredEndpoint = '/dashboard/chart/monthly-revenue';
            } else if (widgetId.includes('payment-status') || widgetId.includes('paymentstatus')) {
              inferredEndpoint = '/dashboard/chart/payment-status';
            } else if (widgetId.includes('invoice-aging') || widgetId.includes('invoiceaging')) {
              inferredEndpoint = '/dashboard/chart/invoice-aging';
            } else if (widgetId.includes('recent-invoices') || widgetId.includes('recentinvoices') || widgetId.startsWith('table-recent-invoices')) {
              inferredEndpoint = '/dashboard/table/recent-invoices';
            } else if (widgetId.includes('recent-payments') || widgetId.includes('recentpayments')) {
              inferredEndpoint = '/dashboard/table/recent-payments';
            } else if (widgetId.includes('pending-receipts') || widgetId.includes('pendingreceipts')) {
              inferredEndpoint = '/dashboard/table/pending-receipts';
            } else if (widgetId.includes('pending-approvals') || widgetId.includes('pendingapprovals') || widgetId.includes('approval-queue') || widgetId.startsWith('approval-queue')) {
              inferredEndpoint = '/dashboard/tasks/pending-approvals';
            } else if (widgetId.includes('assigned-tasks') || widgetId.includes('assignedtasks')) {
              inferredEndpoint = '/dashboard/tasks/assigned';
            } else if (widgetId.includes('payment-overdue') || widgetId.includes('paymentoverdue')) {
              inferredEndpoint = '/dashboard/alerts/payment-overdue';
            } else if (widgetId.includes('compliance-expiry') || widgetId.includes('complianceexpiry')) {
              inferredEndpoint = '/dashboard/alerts/compliance-expiry';
            }
            
            // If not found by ID, check by title (more reliable)
            if (!inferredEndpoint) {
              if (searchText.includes('total invoices') || searchText.includes('totalinvoices')) {
                inferredEndpoint = '/dashboard/kpi/total-invoices';
              } else if (searchText.includes('pending invoices') || searchText.includes('pendinginvoices')) {
                inferredEndpoint = '/dashboard/kpi/pending-invoices';
              } else if (searchText.includes('total revenue') || searchText.includes('totalrevenue')) {
                inferredEndpoint = '/dashboard/kpi/total-revenue';
              } else if (searchText.includes('pending payments') || searchText.includes('pendingpayments')) {
                inferredEndpoint = '/dashboard/kpi/pending-payments';
              } else if (searchText.includes('receipts today') || searchText.includes('receiptstoday')) {
                inferredEndpoint = '/dashboard/kpi/receipts-today';
              } else if (searchText.includes('active users') || searchText.includes('activeusers')) {
                inferredEndpoint = '/dashboard/kpi/active-users';
              } else if (searchText.includes('errors today') || searchText.includes('errorstoday')) {
                inferredEndpoint = '/dashboard/kpi/errors-today';
              } else if (searchText.includes('monthly revenue') || searchText.includes('monthlyrevenue')) {
                inferredEndpoint = '/dashboard/chart/monthly-revenue';
              } else if (searchText.includes('payment status') || searchText.includes('paymentstatus')) {
                inferredEndpoint = '/dashboard/chart/payment-status';
              } else if (searchText.includes('invoice aging') || searchText.includes('invoiceaging')) {
                inferredEndpoint = '/dashboard/chart/invoice-aging';
              } else if (searchText.includes('recent invoices') || searchText.includes('recentinvoices')) {
                inferredEndpoint = '/dashboard/table/recent-invoices';
              } else if (searchText.includes('recent payments') || searchText.includes('recentpayments')) {
                inferredEndpoint = '/dashboard/table/recent-payments';
              } else if (searchText.includes('pending receipts') || searchText.includes('pendingreceipts')) {
                inferredEndpoint = '/dashboard/table/pending-receipts';
              } else if (searchText.includes('pending approvals') || searchText.includes('pendingapprovals') || searchText.includes('approval queue')) {
                inferredEndpoint = '/dashboard/tasks/pending-approvals';
              } else if (searchText.includes('assigned tasks') || searchText.includes('assignedtasks')) {
                inferredEndpoint = '/dashboard/tasks/assigned';
              } else if (searchText.includes('payment overdue') || searchText.includes('paymentoverdue')) {
                inferredEndpoint = '/dashboard/alerts/payment-overdue';
              } else if (searchText.includes('compliance expiry') || searchText.includes('complianceexpiry')) {
                inferredEndpoint = '/dashboard/alerts/compliance-expiry';
              }
            }
            
            // If still no endpoint, use index-based assignment for different endpoints
            if (!inferredEndpoint) {
              // Use index to assign different endpoints to prevent all widgets from using the same endpoint
              const endpointMap = [
                '/dashboard/kpi/total-invoices',
                '/dashboard/kpi/pending-invoices',
                '/dashboard/kpi/total-revenue',
                '/dashboard/kpi/pending-payments',
                '/dashboard/kpi/receipts-today',
                '/dashboard/kpi/active-users',
                '/dashboard/kpi/errors-today',
                '/dashboard/chart/monthly-revenue',
              ];
              
              if (widget.type === 'metric' || widget.type === 'kpi') {
                inferredEndpoint = endpointMap[index % endpointMap.length] || '/dashboard/kpi/total-invoices';
              } else if (widget.type === 'chart') {
                inferredEndpoint = '/dashboard/chart/monthly-revenue';
              } else if (widget.type === 'table') {
                inferredEndpoint = '/dashboard/table/recent-invoices';
              } else if (widget.type === 'task-list' || widget.type === 'approval-queue') {
                inferredEndpoint = '/dashboard/tasks/pending-approvals';
              } else if (widget.type === 'alert') {
                inferredEndpoint = '/dashboard/alerts/payment-overdue';
              } else {
                inferredEndpoint = endpointMap[index % endpointMap.length] || '/dashboard/kpi/total-invoices';
              }
              
              console.log(`[DashboardPage] Widget ${widget.id} missing endpoint, using index-based assignment:`, {
                widgetId: widget.id,
                widgetTitle: widget.title,
                widgetType: widget.type,
                widgetIndex: index,
                assignedEndpoint: inferredEndpoint,
              });
            } else {
              console.log(`[DashboardPage] Widget ${widget.id} endpoint inferred from ID/title:`, {
                widgetId: widget.id,
                widgetTitle: widget.title,
                inferredEndpoint: inferredEndpoint,
              });
            }
            
            // Always set the endpoint (never leave it undefined)
            widget.dataSource.endpoint = inferredEndpoint;
          }
          
          // Ensure title is set (use endpoint-based title if missing)
          if (!widget.title) {
            const endpoint = widget.dataSource?.endpoint || '';
            if (endpoint.includes('total-invoices')) {
              widget.title = 'Total Invoices';
            } else if (endpoint.includes('pending-invoices')) {
              widget.title = 'Pending Invoices';
            } else if (endpoint.includes('total-revenue')) {
              widget.title = 'Total Revenue';
            } else if (endpoint.includes('pending-payments')) {
              widget.title = 'Pending Payments';
            } else if (endpoint.includes('receipts-today')) {
              widget.title = 'Receipts Today';
            } else if (endpoint.includes('active-users')) {
              widget.title = 'Active Users';
            } else if (endpoint.includes('errors-today')) {
              widget.title = 'Errors Today';
            } else if (endpoint.includes('monthly-revenue')) {
              widget.title = 'Monthly Revenue';
            } else if (endpoint.includes('payment-status')) {
              widget.title = 'Payment Status';
            } else if (endpoint.includes('invoice-aging')) {
              widget.title = 'Invoice Aging';
            } else if (endpoint.includes('recent-invoices')) {
              widget.title = 'Recent Invoices';
            } else if (endpoint.includes('recent-payments')) {
              widget.title = 'Recent Payments';
            } else if (endpoint.includes('pending-receipts')) {
              widget.title = 'Pending Receipts';
            } else if (endpoint.includes('pending-approvals')) {
              widget.title = 'Pending Approvals';
            } else if (endpoint.includes('assigned-tasks')) {
              widget.title = 'Assigned Tasks';
            } else if (endpoint.includes('payment-overdue')) {
              widget.title = 'Payment Overdue';
            } else if (endpoint.includes('compliance-expiry')) {
              widget.title = 'Compliance Expiry';
            } else {
              widget.title = `Widget ${index + 1}`;
            }
            console.log(`[DashboardPage] Widget ${widget.id} missing title, inferred from endpoint:`, {
              widgetId: widget.id,
              inferredTitle: widget.title,
              endpoint: widget.dataSource?.endpoint,
            });
          }
          
          if (!widget.type) {
            // Try to infer type from dataSource endpoint if type is missing
            const endpoint = widget.dataSource?.endpoint || '';
            if (endpoint.includes('/kpi/') || endpoint.includes('/dashboard/kpi/')) {
              widget.type = 'metric';
            } else if (endpoint.includes('/chart/') || endpoint.includes('/dashboard/chart/')) {
              widget.type = 'chart';
            } else if (endpoint.includes('/table/') || endpoint.includes('/dashboard/table/')) {
              widget.type = 'table';
            } else if (endpoint.includes('/tasks/') || endpoint.includes('/approval') || endpoint.includes('/dashboard/tasks/')) {
              widget.type = 'task-list';
            } else if (endpoint.includes('/alerts/') || endpoint.includes('/dashboard/alerts/')) {
              widget.type = 'alert';
            } else if (endpoint.includes('/activity') || endpoint.includes('/timeline')) {
              widget.type = 'activity-timeline';
            } else {
              // Only warn if we can't infer the type and it's not a default widget
              if (widget.id && !widget.id.startsWith('widget-')) {
                console.warn('[DashboardPage] Widget missing type and cannot infer from endpoint:', {
                  id: widget.id,
                  title: widget.title,
                  endpoint: endpoint || 'none',
                });
              }
              widget.type = 'metric'; // Default fallback
            }
          }
          // Normalize widget type
          const normalizedType = widget.type.toLowerCase().trim();
          // Map common variations to standard types
          const typeMap: Record<string, WidgetType> = {
            'kpi': 'metric',
            'metric': 'metric',
            'chart': 'chart',
            'table': 'table',
            'task-list': 'task-list',
            'tasklist': 'task-list',
            'tasks': 'task-list',
            'approval-queue': 'approval-queue',
            'approvalqueue': 'approval-queue',
            'approvals': 'approval-queue',
            'alert': 'alert',
            'alerts': 'alert',
            'activity-timeline': 'activity-timeline',
            'activitytimeline': 'activity-timeline',
            'timeline': 'activity-timeline',
            'custom': 'custom',
          };
          const mappedType = typeMap[normalizedType];
          if (mappedType) {
            widget.type = mappedType;
          } else if (!['metric', 'chart', 'table', 'task-list', 'approval-queue', 'alert', 'activity-timeline', 'custom'].includes(normalizedType)) {
            // Unknown type, default to metric and log warning
            console.warn(`[DashboardPage] Unknown widget type "${widget.type}", defaulting to "metric"`, widget);
            widget.type = 'metric';
          }
          
          // Ensure gridColumn is set
          if (!widget.gridColumn || widget.gridColumn < 1) {
            widget.gridColumn = 1;
          }
          if (widget.gridColumn > 4) {
            widget.gridColumn = 4;
          }
          
          // Final check: ensure endpoint is always set
          if (!widget.dataSource?.endpoint) {
            console.error(`[DashboardPage] Widget ${widget.id} still missing endpoint after validation!`, widget);
            widget.dataSource = widget.dataSource || {};
            widget.dataSource.endpoint = '/dashboard/kpi/total-invoices'; // Emergency fallback
          }
          
          // Log final widget configuration
          console.log(`[DashboardPage] Validated widget:`, {
            id: widget.id,
            title: widget.title,
            type: widget.type,
            endpoint: widget.dataSource?.endpoint,
            hasEndpoint: !!widget.dataSource?.endpoint,
          });
          
          return widget;
        }).filter((widget) => {
          // Filter out invalid widgets
          // First check if widget is a valid object
          if (!widget || typeof widget !== 'object' || Array.isArray(widget)) {
            console.warn('[DashboardPage] Filtering out invalid widget (not an object):', widget);
            return false;
          }
          
          // Check if widget has required properties
          if (!widget.id || !widget.type) {
            console.warn('[DashboardPage] Filtering out invalid widget (missing id or type):', widget);
            return false;
          }
          
          // Check if widget has valid type
          const validTypes: WidgetType[] = ['metric', 'chart', 'table', 'task-list', 'approval-queue', 'alert', 'activity-timeline', 'custom'];
          if (!validTypes.includes(widget.type)) {
            console.warn('[DashboardPage] Filtering out invalid widget (invalid type):', widget);
            return false;
          }
          
          // Check if widget has dataSource with endpoint
          if (!widget.dataSource || !widget.dataSource.endpoint) {
            console.warn('[DashboardPage] Filtering out invalid widget (missing dataSource.endpoint):', widget);
            return false;
          }
          
          return true;
        });
        
        console.log('[DashboardPage] Final validated widgets:', {
          count: validatedWidgets.length,
          widgets: validatedWidgets,
        });
        
        setWidgets(validatedWidgets);
        setWidgetPermissions(computed.permissions);
      } catch (error) {
        console.error('[DashboardPage] Failed to load dashboard:', error);
        setWidgets([]);
        setWidgetPermissions({});
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [currentRole, user?.id, previewMode.enabled, location.pathname]);

  // Removed: Load available roles for preview mode (preview selector removed)


  // Group widgets by row for grid layout
  const widgetRows = useMemo(() => {
    const rows: WidgetConfig[][] = [];
    let currentRow: WidgetConfig[] = [];
    let currentRowWidth = 0;

    widgets.forEach((widget) => {
      const widgetWidth = widget.gridColumn || 1;
      
      if (currentRowWidth + widgetWidth > 4) {
        rows.push(currentRow);
        currentRow = [widget];
        currentRowWidth = widgetWidth;
      } else {
        currentRow.push(widget);
        currentRowWidth += widgetWidth;
      }
    });

    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  }, [widgets]);

  return (
    <div className="dashboard-page">
      {/* Left Sidebar - Same as MasterPage */}
      <aside className={`dashboard-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          {!isSidebarCollapsed && <span className="brand-name">MEDI-WASTE</span>}
        </div>

        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isSidebarCollapsed ? (
              <polyline points="9 18 15 12 9 6"></polyline>
            ) : (
              <polyline points="15 18 9 12 15 6"></polyline>
            )}
          </svg>
        </button>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`nav-link ${item.active ? 'nav-link--active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!isSidebarCollapsed && <span className="nav-label">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-notification-btn" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="notification-badge">3</span>
          </button>
          <Link
            to="/profile"
            className={`sidebar-profile-btn ${location.pathname === '/profile' ? 'sidebar-profile-btn--active' : ''}`}
            title="My Profile"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            {!isSidebarCollapsed && <span>Profile</span>}
          </Link>
          <button onClick={logout} className="sidebar-logout-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Dashboard</span>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="dashboard-page-content" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Preview Mode Banner */}
          {isPreviewMode && (
            <div className="dashboard-preview-selector" style={{ 
              background: '#fef3c7', 
              border: '1px solid #fbbf24',
              padding: '12px 16px',
              borderRadius: '6px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span style={{ fontWeight: '600', color: '#92400e' }}>
                  Preview Mode: {previewMode.role?.charAt(0).toUpperCase() + previewMode.role?.slice(1)}
                </span>
              </div>
              <button
                onClick={handleExitPreview}
                style={{
                  padding: '6px 16px',
                  background: '#fbbf24',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#78350f'
                }}
              >
                Exit Preview
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="dashboard-loading">
              <div className="dashboard-loading-spinner"></div>
              <p>Loading dashboard...</p>
            </div>
          )}

          {/* Widget Grid */}
          {!loading && (
            <div className="dashboard-widget-grid">
              {widgetRows.map((row, rowIndex) => (
                <div key={`row-${rowIndex}`} className="dashboard-widget-row">
                  {row.map((widget, widgetIndex) => {
                    // Validate widget before rendering
                    if (!widget || typeof widget !== 'object' || Array.isArray(widget) || !widget.id || !widget.type) {
                      console.error('[DashboardPage] Invalid widget in render:', widget);
                      return (
                        <div
                          key={`invalid-widget-${rowIndex}-${widgetIndex}`}
                          className="dashboard-widget-cell"
                          style={{
                            gridColumn: `span 1`,
                          }}
                        >
                          <div className="widget-error">Invalid widget configuration</div>
                        </div>
                      );
                    }
                    
                    return (
                      <div
                        key={widget.id || `widget-${rowIndex}-${widgetIndex}`}
                        className="dashboard-widget-cell"
                        style={{
                          gridColumn: `span ${widget.gridColumn || 1}`,
                          gridRow: widget.gridRow ? `span ${widget.gridRow}` : undefined,
                        }}
                      >
                        <Suspense fallback={<div className="widget-loading">Loading widget...</div>}>
                          <WidgetRenderer
                            widget={widget}
                            permissions={widgetPermissions}
                            isPreviewMode={isPreviewMode}
                          />
                        </Suspense>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && widgets.length === 0 && (
            <div className="dashboard-empty-state">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <h2>No widgets configured</h2>
              <p>Your dashboard is empty. Contact your administrator to configure widgets for your role.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
