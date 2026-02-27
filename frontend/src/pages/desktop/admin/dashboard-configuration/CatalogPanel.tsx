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
  // UI-only: template-style widget library (search + tabs + cards).
  // No API or add-widget behavior changes.
  type WidgetType = 'kpi' | 'chart' | 'table' | 'task' | 'alert';
  type CatalogEntry = CatalogItem & { widgetType: WidgetType };

  const [query, setQuery] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'all' | WidgetType>('all');

  const allItems = React.useMemo<CatalogEntry[]>(() => {
    const items: CatalogEntry[] = [];
    for (const it of catalog.kpis) items.push({ ...it, widgetType: 'kpi' });
    for (const it of catalog.charts) items.push({ ...it, widgetType: 'chart' });
    for (const it of catalog.tables) items.push({ ...it, widgetType: 'table' });
    for (const it of catalog.tasks) items.push({ ...it, widgetType: 'task' });
    for (const it of catalog.alerts) items.push({ ...it, widgetType: 'alert' });
    return items;
  }, [catalog]);

  const visibleItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems
      .filter((it) => (activeTab === 'all' ? true : it.widgetType === activeTab))
      .filter((it) => {
        if (!q) return true;
        const hay = `${it.title} ${it.code} ${it.description || ''} ${it.widgetType}`.toLowerCase();
        return hay.includes(q);
      });
  }, [allItems, activeTab, query]);

  const tabDefs: Array<{ key: 'all' | WidgetType; label: string }> = [
    { key: 'all', label: 'All Widgets' },
    { key: 'kpi', label: 'KPIs' },
    { key: 'chart', label: 'Charts' },
    { key: 'table', label: 'Tables' },
    { key: 'task', label: 'Tasks' },
    { key: 'alert', label: 'Alerts' },
  ];

  const typeLabel: Record<WidgetType, string> = {
    kpi: 'Metric',
    chart: 'Chart',
    table: 'Table',
    task: 'Task',
    alert: 'Alert',
  };

  return (
    <div className="catalog-panel">
      <div className="catalog-panel-header catalog-panel-header--library">
        <div className="catalog-library-title-row">
          <div className="catalog-library-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z"></path>
            </svg>
          </div>
          <div className="catalog-library-title-text">
            <h2 className="catalog-panel-title">Widget Library</h2>
            <p className="catalog-panel-subtitle">Choose widgets to add to your dashboard</p>
          </div>
        </div>

        <div className="catalog-library-search">
          <svg className="catalog-library-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="catalog-library-search-input"
            placeholder="Search widgets... (try 'revenue', 'users', 'invoices')"
          />
        </div>

        <div className="catalog-library-tabs" role="tablist" aria-label="Widget categories">
          {tabDefs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`catalog-library-tab ${activeTab === t.key ? 'active' : ''}`}
              onClick={() => setActiveTab(t.key as any)}
              aria-selected={activeTab === t.key}
              role="tab"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="catalog-panel-content catalog-panel-content--library">
        {visibleItems.length === 0 ? (
          <div className="catalog-empty">No widgets match your search.</div>
        ) : (
          <div className="catalog-library-grid">
            {visibleItems.map((it) => (
              <div key={`${it.widgetType}:${it.code}`} className="catalog-library-card">
                <div className="catalog-library-card-top">
                  <div className="catalog-library-card-icon" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20"></path>
                      <path d="M2 12h20"></path>
                    </svg>
                  </div>
                  <span className={`catalog-library-badge catalog-library-badge--${it.widgetType}`}>
                    {typeLabel[it.widgetType]}
                  </span>
                </div>

                <div className="catalog-library-card-title">{it.title}</div>
                <div className="catalog-library-card-desc">{it.description || '—'}</div>

                <button
                  type="button"
                  className="catalog-library-add"
                  onClick={() => onAddWidget(it, it.widgetType)}
                  title="Add widget"
                >
                  <span className="catalog-library-add-plus">＋</span> Add Widget
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="catalog-library-footer">
        <span className="catalog-library-footer-count">{allItems.length} widgets available</span>
      </div>
    </div>
  );
};

export default CatalogPanel;
