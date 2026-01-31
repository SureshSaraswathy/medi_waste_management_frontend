/**
 * Table Widget Component
 * 
 * Displays tabular data with optional pagination and actions.
 * Used for recent transactions, payments, tasks, etc.
 */

import React from 'react';
import './widgets.css';

interface TableColumn {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface TableWidgetProps {
  title: string;
  columns: TableColumn[];
  data: any[];
  loading?: boolean;
  maxRows?: number;
  onRowClick?: (row: any) => void;
}

export const TableWidget: React.FC<TableWidgetProps> = ({
  title,
  columns,
  data,
  loading = false,
  maxRows = 5,
  onRowClick,
}) => {
  const displayData = data.slice(0, maxRows);

  if (loading) {
    return (
      <div className="widget-panel widget-panel--table">
        <div className="widget-panel__header">
          <h3 className="widget-panel__title">{title}</h3>
        </div>
        <div className="widget-panel__body">
          <div className="widget-panel__skeleton">
            <div className="skeleton-table">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton-row">
                  {columns.map((_, j) => (
                    <div key={j} className="skeleton-cell"></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-panel widget-panel--table">
      <div className="widget-panel__header">
        <h3 className="widget-panel__title">{title}</h3>
        {data.length > maxRows && (
          <span className="widget-panel__badge">{data.length} total</span>
        )}
      </div>
      <div className="widget-panel__body">
        {displayData.length === 0 ? (
          <div className="widget-empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <p>No data available</p>
          </div>
        ) : (
          <div className="table-widget">
            <table className="table-widget__table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayData.map((row, idx) => (
                  <tr
                    key={idx}
                    onClick={() => onRowClick?.(row)}
                    className={onRowClick ? 'table-widget__row--clickable' : ''}
                  >
                    {columns.map((col) => (
                      <td key={col.key}>
                        {col.render ? col.render(row[col.key], row) : row[col.key] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableWidget;
