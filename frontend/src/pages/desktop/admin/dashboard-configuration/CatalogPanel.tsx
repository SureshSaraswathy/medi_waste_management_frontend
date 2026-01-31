/**
 * Catalog Panel Component
 * 
 * Configuration-only screen - no impact on existing application logic
 * 
 * Displays available dashboard APIs (KPIs, Charts, Tables) grouped by type.
 * Allows SuperAdmin to add widgets to the dashboard configuration.
 */

import React from 'react';
import './catalogPanel.css';

export interface CatalogItem {
  code: string;
  title: string;
  api: string;
  format?: string;
  chartTypes?: string[];
  roles: string[];
  description?: string;
}

interface CatalogPanelProps {
  catalog: {
    kpis: CatalogItem[];
    charts: CatalogItem[];
    tables: CatalogItem[];
    tasks: CatalogItem[];
    alerts: CatalogItem[];
  };
  onAddWidget: (item: CatalogItem, type: 'kpi' | 'chart' | 'table' | 'task' | 'alert') => void;
}

const CatalogPanel: React.FC<CatalogPanelProps> = ({ catalog, onAddWidget }) => {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    kpis: true,
    charts: true,
    tables: true,
    tasks: true,
    alerts: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderCatalogGroup = (
    title: string,
    items: CatalogItem[],
    type: 'kpi' | 'chart' | 'table' | 'task' | 'alert',
    sectionKey: string
  ) => {
    const isExpanded = expandedSections[sectionKey];

    return (
      <div className="catalog-group">
        <button
          className="catalog-group-header"
          onClick={() => toggleSection(sectionKey)}
        >
          <span className="catalog-group-title">{title}</span>
          <span className="catalog-group-count">({items.length})</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`catalog-group-arrow ${isExpanded ? 'expanded' : ''}`}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        {isExpanded && (
          <div className="catalog-group-items">
            {items.length === 0 ? (
              <div className="catalog-empty">No items available</div>
            ) : (
              items.map((item) => (
                <div
                  key={item.code}
                  className="catalog-item"
                  onClick={() => onAddWidget(item, type)}
                >
                  <div className="catalog-item-header">
                    <span className="catalog-item-title">{item.title}</span>
                    <button
                      className="catalog-item-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddWidget(item, type);
                      }}
                      title="Add to dashboard"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                  </div>
                  {item.description && (
                    <div className="catalog-item-description">{item.description}</div>
                  )}
                  <div className="catalog-item-meta">
                    <span className="catalog-item-type">{type.toUpperCase()}</span>
                    {item.format && (
                      <span className="catalog-item-format">{item.format}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="catalog-panel">
      <div className="catalog-panel-header">
        <h2 className="catalog-panel-title">Available Widgets</h2>
        <p className="catalog-panel-subtitle">
          Click to add widgets to the dashboard configuration
        </p>
      </div>
      <div className="catalog-panel-content">
        {renderCatalogGroup('KPIs', catalog.kpis, 'kpi', 'kpis')}
        {renderCatalogGroup('Charts', catalog.charts, 'chart', 'charts')}
        {renderCatalogGroup('Tables', catalog.tables, 'table', 'tables')}
        {renderCatalogGroup('Tasks', catalog.tasks, 'task', 'tasks')}
        {renderCatalogGroup('Alerts', catalog.alerts, 'alert', 'alerts')}
      </div>
    </div>
  );
};

export default CatalogPanel;
