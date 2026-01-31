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
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { dashboardService } from '../../services/dashboardService';
import { isSuperAdmin } from '../../services/permissionService';
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

  // Check if user has permission to view this widget
  const canView = useMemo(() => {
    if (!widget.permissions?.view) return true;
    return permissions[widget.permissions.view] === true;
  }, [widget.permissions, permissions]);

  // Load widget data from API
  useEffect(() => {
    if (!widget.dataSource?.endpoint || !canView) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In production, this would call the actual API endpoint
        // For now, we'll simulate data loading
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // Mock data based on widget type
        const mockData = generateMockData(widget);
        setWidgetData(mockData);
      } catch (err) {
        console.error(`Failed to load data for widget ${widget.id}:`, err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [widget, canView]);

  if (!canView) {
    return null;
  }

  // Render widget based on type
  // All widget rendering is configuration-driven - no hardcoded role checks
  switch (widget.type) {
    case 'metric':
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
          data={widgetData?.data || []}
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
      return (
        <div className="dashboard-widget-error">
          <p>Unknown widget type: {widget.type}</p>
        </div>
      );
  }
};

/**
 * Generate mock data for widgets (for demonstration)
 * In production, this would be replaced with actual API calls based on widget.dataSource
 */
function generateMockData(widget: WidgetConfig): any {
  switch (widget.type) {
    case 'metric':
      return {
        value: Math.floor(Math.random() * 10000),
        unit: widget.props?.unit || '',
        label: widget.props?.label || 'Total count',
        trend: {
          value: Math.floor(Math.random() * 20) - 10,
          isPositive: Math.random() > 0.5,
          period: 'vs last month',
        },
      };

    case 'chart':
      return {
        data: Array.from({ length: 12 }, (_, i) => ({
          month: `Month ${i + 1}`,
          value: Math.floor(Math.random() * 1000),
        })),
      };

    case 'table':
      return {
        columns: [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Name' },
          { key: 'status', label: 'Status' },
        ],
        data: Array.from({ length: 5 }, (_, i) => ({
          id: `#${i + 1}`,
          name: `Item ${i + 1}`,
          status: ['Active', 'Pending', 'Completed'][Math.floor(Math.random() * 3)],
        })),
      };

    case 'task-list':
      return {
        tasks: Array.from({ length: 5 }, (_, i) => ({
          id: `task-${i + 1}`,
          title: `Task ${i + 1}`,
          description: `Description for task ${i + 1}`,
          status: ['pending', 'in-progress', 'completed'][Math.floor(Math.random() * 3)] as any,
          dueDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        })),
      };

    case 'approval-queue':
      return {
        items: Array.from({ length: 5 }, (_, i) => ({
          id: `approval-${i + 1}`,
          title: `Pending Approval ${i + 1}`,
          description: `Description for approval ${i + 1}`,
          submittedBy: `User ${i + 1}`,
          submittedOn: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          amount: Math.floor(Math.random() * 100000),
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
          type: 'Invoice',
        })),
      };

    case 'activity-timeline':
      return {
        activities: Array.from({ length: 10 }, (_, i) => ({
          id: `activity-${i + 1}`,
          timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toLocaleString(),
          user: `User ${i + 1}`,
          action: `Action ${i + 1} performed`,
          description: `Details about action ${i + 1}`,
          type: ['info', 'success', 'warning', 'error'][Math.floor(Math.random() * 4)] as any,
        })),
      };

    case 'alert':
      return {
        alerts: Array.from({ length: 3 }, (_, i) => ({
          id: `alert-${i + 1}`,
          type: ['info', 'warning', 'error'][Math.floor(Math.random() * 3)] as any,
          title: `Alert ${i + 1}`,
          message: `This is an alert message ${i + 1}`,
          timestamp: new Date().toLocaleString(),
        })),
      };

    default:
      return null;
  }
}

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [previewMode, setPreviewMode] = useState<{ enabled: boolean; role: Role | null }>({ enabled: false, role: null });

  // Get current role (from preview mode or user)
  const currentRole: Role = previewMode.enabled && previewMode.role
    ? previewMode.role
    : ((user?.roles?.[0] as Role) || 'viewer');

  const isPreviewMode = previewMode.enabled;
  const isSuperAdminUser = isSuperAdmin(user);

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
  ];

  // Load dashboard configuration
  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        // Load role configuration
        const roleConfig = await dashboardService.getDashboardConfig(currentRole);
        
        // Load user overrides if available
        const userOverrides = user?.id
          ? await dashboardService.getUserOverrides(user.id)
          : null;

        // Compute final permissions and widgets
        const computed = dashboardService.computePermissions(roleConfig, userOverrides);
        
        setWidgets(computed.widgets);
        setPermissions(computed.permissions);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
        setWidgets([]);
        setPermissions({});
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [currentRole, user?.id]);

  // Load available roles for preview mode
  useEffect(() => {
    if (isSuperAdminUser) {
      dashboardService.getAvailableRoles().then(setAvailableRoles).catch(console.error);
    }
  }, [isSuperAdminUser]);


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
          {/* SuperAdmin Preview Mode Selector */}
          {isSuperAdminUser && !isPreviewMode && (
            <div className="dashboard-preview-selector">
              <label htmlFor="preview-role-select">View Dashboard As Role:</label>
              <select
                id="preview-role-select"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleStartPreview(e.target.value as Role);
                  }
                }}
                className="dashboard-preview-select"
              >
                <option value="">Select a role...</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Preview Mode Banner */}
          {isPreviewMode && (
            <div className="dashboard-preview-selector" style={{ background: '#fef3c7', border: '1px solid #fbbf24' }}>
              <span>Preview Mode: {previewMode.role}</span>
              <button
                onClick={handleExitPreview}
                style={{
                  marginLeft: '12px',
                  padding: '4px 12px',
                  background: '#fbbf24',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600'
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
                <div key={rowIndex} className="dashboard-widget-row">
                  {row.map((widget) => (
                    <div
                      key={widget.id}
                      className="dashboard-widget-cell"
                      style={{
                        gridColumn: `span ${widget.gridColumn || 1}`,
                        gridRow: widget.gridRow ? `span ${widget.gridRow}` : undefined,
                      }}
                    >
                      <Suspense fallback={<div className="widget-loading">Loading widget...</div>}>
                        <WidgetRenderer
                          widget={widget}
                          permissions={permissions}
                          isPreviewMode={isPreviewMode}
                        />
                      </Suspense>
                    </div>
                  ))}
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
