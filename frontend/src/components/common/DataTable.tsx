import React from 'react';
import './dataTable.css';

export interface Column<T> {
  key: string;
  label: string;
  minWidth?: number;
  render?: (item: T) => React.ReactNode;
  allowWrap?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  getId: (item: T) => string;
  emptyMessage?: string;
}

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  onEdit,
  onDelete,
  getId,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ minWidth: column.minWidth ? `${column.minWidth}px` : 'auto' }}
              >
                {column.label}
              </th>
            ))}
            {(onEdit || onDelete) && <th className="col-actions">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="empty-state">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={getId(item)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={column.allowWrap ? 'allow-wrap' : ''}
                  >
                    {column.render ? column.render(item) : item[column.key] || '-'}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td>
                    {onEdit && (
                      <button
                        className="action-btn action-btn--edit"
                        onClick={() => onEdit(item)}
                        title="Edit"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="action-btn action-btn--delete"
                        onClick={() => onDelete(getId(item))}
                        title="Delete"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
