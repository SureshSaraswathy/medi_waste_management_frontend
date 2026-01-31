/**
 * Dashboard Configuration Content Component
 * 
 * Configuration-only screen - no impact on existing application logic
 * 
 * Main content area for dashboard configuration with three-panel layout:
 * - Left: Catalog Panel (available widgets)
 * - Center: Dashboard Canvas (layout preview)
 * - Right: Widget Settings Panel (widget configuration)
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../../../../services/dashboardService';
import { DashboardConfig, WidgetConfig, Role } from '../../../../types/dashboard';
import CatalogPanel, { CatalogItem } from './CatalogPanel';
import DashboardCanvas from './DashboardCanvas';
import WidgetSettingsPanel from './WidgetSettingsPanel';
import './dashboardConfigurationContent.css';

const DashboardConfigurationContent: React.FC = () => {
  const navigate = useNavigate();
  const [catalog, setCatalog] = React.useState<{
    kpis: CatalogItem[];
    charts: CatalogItem[];
    tables: CatalogItem[];
    tasks: CatalogItem[];
    alerts: CatalogItem[];
  }>({ kpis: [], charts: [], tables: [], tasks: [], alerts: [] });
  const [availableRoles, setAvailableRoles] = React.useState<Role[]>([]);
  const [selectedTarget, setSelectedTarget] = React.useState<string>('');
  const [targetType, setTargetType] = React.useState<'role' | 'department'>('role');
  const [config, setConfig] = React.useState<DashboardConfig | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load catalog and available roles on mount
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [catalogData, roles] = await Promise.all([
          dashboardService.getCatalog(),
          dashboardService.getAvailableRoles(),
        ]);
        setCatalog(catalogData);
        setAvailableRoles(roles);
      } catch (err) {
        console.error('Failed to load catalog:', err);
        setError('Failed to load dashboard catalog');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Load configuration when target is selected
  React.useEffect(() => {
    if (selectedTarget) {
      const loadConfig = async () => {
        setLoading(true);
        try {
          const loadedConfig = await dashboardService.getDashboardConfigByTarget(selectedTarget);
          setConfig(loadedConfig);
          setSelectedWidgetId(null);
        } catch (err) {
          console.error('Failed to load configuration:', err);
          setError('Failed to load dashboard configuration');
        } finally {
          setLoading(false);
        }
      };
      loadConfig();
    } else {
      setConfig(null);
      setSelectedWidgetId(null);
    }
  }, [selectedTarget, targetType]);

  const handleAddWidget = (item: CatalogItem, type: 'kpi' | 'chart' | 'table' | 'task' | 'alert') => {
    if (!config) {
      alert('Please select a role or department first');
      return;
    }

    const widgetTypeMap: Record<string, 'metric' | 'chart' | 'table' | 'task-list' | 'alert'> = {
      kpi: 'metric',
      chart: 'chart',
      table: 'table',
      task: 'task-list',
      alert: 'alert',
    };

    const newWidget: WidgetConfig = {
      id: `${item.code.toLowerCase()}-${Date.now()}`,
      type: widgetTypeMap[type] || 'metric',
      title: item.title,
      description: item.description,
      gridColumn: 2, // Default to half width
      dataSource: {
        endpoint: item.api,
        method: 'GET',
      },
      ...(type === 'chart' && item.chartTypes && item.chartTypes.length > 0 && {
        chartConfig: {
          type: item.chartTypes[0] as 'line' | 'bar',
        },
      }),
    };

    setConfig({
      ...config,
      widgets: [...config.widgets, newWidget],
    });
    setSelectedWidgetId(newWidget.id);
  };

  const handleUpdateWidget = (widgetId: string, updates: Partial<WidgetConfig>) => {
    if (!config) return;

    setConfig({
      ...config,
      widgets: config.widgets.map((w) => (w.id === widgetId ? { ...w, ...updates } : w)),
    });
  };

  const handleRemoveWidget = (widgetId: string) => {
    if (!config) return;

    setConfig({
      ...config,
      widgets: config.widgets.filter((w) => w.id !== widgetId),
    });
    if (selectedWidgetId === widgetId) {
      setSelectedWidgetId(null);
    }
  };

  const handleReorderWidget = (widgetId: string, direction: 'up' | 'down') => {
    if (!config) return;

    const index = config.widgets.findIndex((w) => w.id === widgetId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= config.widgets.length) return;

    const newWidgets = [...config.widgets];
    [newWidgets[index], newWidgets[newIndex]] = [newWidgets[newIndex], newWidgets[index]];

    setConfig({
      ...config,
      widgets: newWidgets,
    });
  };

  const handleSave = async () => {
    if (!config || !selectedTarget) {
      alert('Please select a role or department and configure widgets');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // Normalize widgets before saving to ensure they're always an array of objects
      const normalizedConfig: DashboardConfig = {
        ...config,
        widgets: (config.widgets || []).filter((w: any) => {
          // Filter out invalid entries
          return w && typeof w === 'object' && !Array.isArray(w);
        }),
        menuItems: Array.isArray(config.menuItems) ? config.menuItems : [],
        permissions: config.permissions && typeof config.permissions === 'object' && !Array.isArray(config.permissions)
          ? config.permissions
          : {},
      };
      
      console.log('[DashboardConfigurationContent] Saving normalized config:', {
        role: normalizedConfig.role,
        widgetsCount: normalizedConfig.widgets.length,
        widgets: normalizedConfig.widgets,
      });
      
      await dashboardService.saveDashboardConfig(normalizedConfig);
      alert('Dashboard configuration saved successfully');
    } catch (err: any) {
      console.error('Failed to save configuration:', err);
      // Show more detailed error message
      const errorMessage = err?.message || 'Failed to save dashboard configuration';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    if (!config || !selectedTarget) {
      alert('Please select a role or department and configure widgets');
      return;
    }

    // Navigate to dashboard with preview mode
    // Store config temporarily for preview
    sessionStorage.setItem('dashboard-preview-config', JSON.stringify(config));
    sessionStorage.setItem('dashboard-preview-role', selectedTarget);
    navigate('/dashboard?preview=true');
  };

  const selectedWidget = config?.widgets.find((w) => w.id === selectedWidgetId) || null;

  return (
    <div className="dashboard-configuration-content-wrapper">
      {/* Top Toolbar */}
      <div className="dashboard-configuration-toolbar">
        <div className="dashboard-configuration-toolbar-left">
          <h1 className="dashboard-configuration-title">Dashboard Configuration</h1>
          <p className="dashboard-configuration-description">
            This screen configures dashboards only and does not affect business logic
          </p>
        </div>
        <div className="dashboard-configuration-toolbar-right">
          <div className="dashboard-configuration-target-selector">
            <select
              value={targetType}
              onChange={(e) => {
                setTargetType(e.target.value as 'role' | 'department');
                setSelectedTarget('');
              }}
              className="dashboard-configuration-type-select"
            >
              <option value="role">Role</option>
              <option value="department">Department</option>
            </select>
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="dashboard-configuration-target-select"
              disabled={loading}
            >
              <option value="">Select {targetType}...</option>
              {targetType === 'role' &&
                availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
            </select>
          </div>
          <button
            className="dashboard-configuration-btn preview"
            onClick={handlePreview}
            disabled={!config || !selectedTarget || config.widgets.length === 0}
            title="Preview dashboard with current configuration"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Preview Dashboard
          </button>
          <button
            className="dashboard-configuration-btn save"
            onClick={handleSave}
            disabled={!config || !selectedTarget || saving}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {error && (
        <div className="dashboard-configuration-error">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          {error}
        </div>
      )}

      {/* Three-Panel Layout */}
      <div className="dashboard-configuration-panels">
        {/* Left Panel: Catalog */}
        <div className="dashboard-configuration-panel-left">
          {loading && !catalog.kpis.length ? (
            <div className="dashboard-configuration-loading">Loading catalog...</div>
          ) : (
            <CatalogPanel catalog={catalog} onAddWidget={handleAddWidget} />
          )}
        </div>

        {/* Center Panel: Canvas */}
        <div className="dashboard-configuration-panel-center">
          {loading && !config ? (
            <div className="dashboard-configuration-loading">Loading configuration...</div>
          ) : config ? (
            <DashboardCanvas
              widgets={config.widgets}
              selectedWidgetId={selectedWidgetId}
              onSelectWidget={setSelectedWidgetId}
              onUpdateWidget={handleUpdateWidget}
              onRemoveWidget={handleRemoveWidget}
              onReorderWidget={handleReorderWidget}
            />
          ) : (
            <div className="dashboard-configuration-empty-state">
              <p>Select a role or department to start configuring the dashboard</p>
            </div>
          )}
        </div>

        {/* Right Panel: Settings */}
        <div className="dashboard-configuration-panel-right">
          <WidgetSettingsPanel widget={selectedWidget} onUpdateWidget={handleUpdateWidget} />
        </div>
      </div>
    </div>
  );
};

export default DashboardConfigurationContent;
