/**
 * Dashboard Canvas Component
 * 
 * Configuration-only screen - no impact on existing application logic
 * 
 * Displays dashboard layout preview and allows SuperAdmin to:
 * - Add widgets from catalog
 * - Reorder widgets vertically
 * - Set widget size (full / half / quarter)
 */

import React from 'react';
import { WidgetConfig } from '../../../../types/dashboard';
import './dashboardCanvas.css';

interface DashboardCanvasProps {
  widgets: WidgetConfig[];
  selectedWidgetId: string | null;
  onSelectWidget: (widgetId: string | null) => void;
  onUpdateWidget: (widgetId: string, updates: Partial<WidgetConfig>) => void;
  onRemoveWidget: (widgetId: string) => void;
  onReorderWidget: (widgetId: string, direction: 'up' | 'down') => void;
}

const DashboardCanvas: React.FC<DashboardCanvasProps> = ({
  widgets,
  selectedWidgetId,
  onSelectWidget,
  onUpdateWidget,
  onRemoveWidget,
  onReorderWidget,
}) => {
  const getSizeLabel = (gridColumn: number): string => {
    if (gridColumn === 4) return 'Full';
    if (gridColumn === 2) return 'Half';
    if (gridColumn === 1) return 'Quarter';
    return `${gridColumn}/4`;
  };

  const handleSizeChange = (widgetId: string, newSize: number) => {
    onUpdateWidget(widgetId, { gridColumn: newSize });
  };

  return (
    <div className="dashboard-canvas">
      <div className="dashboard-canvas-header">
        <h2 className="dashboard-canvas-title">Dashboard Layout</h2>
        <p className="dashboard-canvas-subtitle">
          Configure widget layout and order. Click a widget to edit settings.
        </p>
      </div>
      <div className="dashboard-canvas-content">
        {widgets.length === 0 ? (
          <div className="dashboard-canvas-empty">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dashboard-canvas-empty-icon">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>
            <p className="dashboard-canvas-empty-text">No widgets configured</p>
            <p className="dashboard-canvas-empty-hint">
              Add widgets from the catalog panel on the left
            </p>
          </div>
        ) : (
          <div className="dashboard-canvas-widgets">
            {widgets.map((widget, index) => {
              const isSelected = selectedWidgetId === widget.id;
              const canMoveUp = index > 0;
              const canMoveDown = index < widgets.length - 1;

              return (
                <div
                  key={widget.id || `widget-${index}`}
                  className={`dashboard-canvas-widget ${isSelected ? 'selected' : ''}`}
                  style={{
                    gridColumn: `span ${widget.gridColumn}`,
                  }}
                  onClick={() => onSelectWidget(widget.id)}
                >
                  <div className="dashboard-canvas-widget-header">
                    <div className="dashboard-canvas-widget-info">
                      <span className="dashboard-canvas-widget-title">{widget.title}</span>
                      <span className="dashboard-canvas-widget-type">{widget.type}</span>
                    </div>
                    <div className="dashboard-canvas-widget-actions">
                      <select
                        value={widget.gridColumn}
                        onChange={(e) => handleSizeChange(widget.id, parseInt(e.target.value, 10))}
                        onClick={(e) => e.stopPropagation()}
                        className="dashboard-canvas-widget-size-select"
                      >
                        <option value="1">Quarter</option>
                        <option value="2">Half</option>
                        <option value="4">Full</option>
                      </select>
                      <button
                        className="dashboard-canvas-widget-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canMoveUp) onReorderWidget(widget.id, 'up');
                        }}
                        disabled={!canMoveUp}
                        title="Move up"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                      </button>
                      <button
                        className="dashboard-canvas-widget-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canMoveDown) onReorderWidget(widget.id, 'down');
                        }}
                        disabled={!canMoveDown}
                        title="Move down"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>
                      <button
                        className="dashboard-canvas-widget-action-btn danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Remove this widget from the dashboard?')) {
                            onRemoveWidget(widget.id);
                          }
                        }}
                        title="Remove widget"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="dashboard-canvas-widget-preview">
                    <div className="dashboard-canvas-widget-preview-content">
                      <span className="dashboard-canvas-widget-preview-text">
                        {widget.type === 'metric' && 'Metric Widget'}
                        {widget.type === 'chart' && 'Chart Widget'}
                        {widget.type === 'table' && 'Table Widget'}
                        {widget.type === 'task-list' && '✓ Task List Widget'}
                        {widget.type === 'alert' && 'Alert Widget'}
                        {!['metric', 'chart', 'table', 'task-list', 'alert'].includes(widget.type) && 'Widget Preview'}
                      </span>
                      <span className="dashboard-canvas-widget-size-badge">
                        {getSizeLabel(widget.gridColumn)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCanvas;
