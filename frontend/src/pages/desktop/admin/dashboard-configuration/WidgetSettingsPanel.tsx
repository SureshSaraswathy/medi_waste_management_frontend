/**
 * Widget Settings Panel Component
 * 
 * Configuration-only screen - no impact on existing application logic
 * 
 * Displays widget settings when a widget is selected from the canvas.
 * Allows SuperAdmin to configure widget properties.
 */

import React from 'react';
import { WidgetConfig } from '../../../../types/dashboard';
import './widgetSettingsPanel.css';

interface WidgetSettingsPanelProps {
  widget: WidgetConfig | null;
  onUpdateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => void;
}

const WidgetSettingsPanel: React.FC<WidgetSettingsPanelProps> = ({ widget, onUpdateWidget }) => {
  if (!widget) {
    return (
      <div className="widget-settings-panel">
        <div className="widget-settings-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="widget-settings-empty-icon">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
          </svg>
          <p className="widget-settings-empty-text">No widget selected</p>
          <p className="widget-settings-empty-hint">
            Select a widget from the canvas to configure its settings
          </p>
        </div>
      </div>
    );
  }

  const handleTitleChange = (newTitle: string) => {
    onUpdateWidget(widget.id, { title: newTitle });
  };

  const handleDescriptionChange = (newDescription: string) => {
    onUpdateWidget(widget.id, { description: newDescription });
  };

  const handleSizeChange = (newSize: number) => {
    onUpdateWidget(widget.id, { gridColumn: newSize });
  };

  const handleChartTypeChange = (newChartType: string) => {
    onUpdateWidget(widget.id, {
      chartConfig: {
        ...widget.chartConfig,
        type: newChartType as 'line' | 'bar',
      },
    });
  };

  return (
    <div className="widget-settings-panel">
      <div className="widget-settings-header">
        <h2 className="widget-settings-title">Widget Settings</h2>
        <p className="widget-settings-subtitle">Configure selected widget properties</p>
      </div>
      <div className="widget-settings-content">
        <div className="widget-settings-section">
          <label className="widget-settings-label">Widget ID</label>
          <div className="widget-settings-readonly">{widget.id}</div>
        </div>

        <div className="widget-settings-section">
          <label className="widget-settings-label">Widget Type</label>
          <div className="widget-settings-readonly">{widget.type}</div>
        </div>

        <div className="widget-settings-section">
          <label className="widget-settings-label" htmlFor="widget-title">
            Title
          </label>
          <input
            id="widget-title"
            type="text"
            value={widget.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="widget-settings-input"
            placeholder="Widget title"
          />
        </div>

        <div className="widget-settings-section">
          <label className="widget-settings-label" htmlFor="widget-description">
            Description (Optional)
          </label>
          <textarea
            id="widget-description"
            value={widget.description || ''}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            className="widget-settings-textarea"
            placeholder="Widget description"
            rows={3}
          />
        </div>

        <div className="widget-settings-section">
          <label className="widget-settings-label" htmlFor="widget-size">
            Size
          </label>
          <select
            id="widget-size"
            value={widget.gridColumn}
            onChange={(e) => handleSizeChange(parseInt(e.target.value, 10))}
            className="widget-settings-select"
          >
            <option value="1">Quarter (1/4 width)</option>
            <option value="2">Half (1/2 width)</option>
            <option value="4">Full (full width)</option>
          </select>
        </div>

        {widget.type === 'chart' && widget.chartConfig && (
          <div className="widget-settings-section">
            <label className="widget-settings-label" htmlFor="widget-chart-type">
              Chart Type
            </label>
            <select
              id="widget-chart-type"
              value={widget.chartConfig.type || 'line'}
              onChange={(e) => handleChartTypeChange(e.target.value)}
              className="widget-settings-select"
            >
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
            </select>
          </div>
        )}

        {widget.dataSource && (
          <div className="widget-settings-section">
            <label className="widget-settings-label">API Endpoint</label>
            <div className="widget-settings-readonly">{widget.dataSource.endpoint}</div>
            <p className="widget-settings-hint">
              This endpoint is read-only and does not modify business logic
            </p>
          </div>
        )}

        {widget.permissions && (
          <div className="widget-settings-section">
            <label className="widget-settings-label">Permissions</label>
            <div className="widget-settings-permissions">
              {widget.permissions.view && (
                <div className="widget-settings-permission">
                  <span className="widget-settings-permission-label">View:</span>
                  <span className="widget-settings-permission-value">{widget.permissions.view}</span>
                </div>
              )}
              {widget.permissions.actions && Object.entries(widget.permissions.actions).map(([action, permission]) => (
                <div key={action} className="widget-settings-permission">
                  <span className="widget-settings-permission-label">{action}:</span>
                  <span className="widget-settings-permission-value">{permission}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WidgetSettingsPanel;
