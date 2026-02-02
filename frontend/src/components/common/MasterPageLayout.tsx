import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../services/permissionService';
import DataTable, { Column } from './DataTable';
import './masterPageLayout.css';

interface MasterPageLayoutProps<T> {
  title: string;
  breadcrumb: string;
  data: T[];
  filteredData: T[];
  columns: Column<T>[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAdd: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  getId: (item: T) => string;
  addButtonLabel?: string;
  emptyMessage?: string;
  children?: React.ReactNode; // For custom content like tabs
  // Strict permissions for actions (recommended).
  // If omitted, action is hidden by default (strict mode).
  createPermissions?: string[];
  editPermissions?: string[];
  deletePermissions?: string[];
  // Optional override (kept for backward compatibility)
  showAddButton?: boolean;
}

function MasterPageLayout<T extends Record<string, any>>({
  title,
  breadcrumb,
  data,
  filteredData,
  columns,
  searchQuery,
  onSearchChange,
  onAdd,
  onEdit,
  onDelete,
  getId,
  addButtonLabel = 'Add',
  emptyMessage,
  children,
  createPermissions,
  editPermissions,
  deletePermissions,
  showAddButton,
}: MasterPageLayoutProps<T>) {
  const { permissions } = useAuth();
  const perms = Array.isArray(permissions) ? permissions : [];
  const hasAny = (codes?: string[]) => {
    if (!codes || codes.length === 0) return false;
    return codes.some((c) => hasPermission(perms, c));
  };

  // Strict: Use explicit permissions; if none provided, hide action.
  const canCreate = showAddButton !== undefined ? showAddButton : hasAny(createPermissions);
  const canEdit = hasAny(editPermissions);
  const canDelete = hasAny(deletePermissions);

  return (
    <div className="master-page-layout">
      <div className="master-page-header">
        <h1 className="master-page-title">{title}</h1>
      </div>

      {/* Custom content like tabs */}
      {children && <div className="master-page-content">{children}</div>}

      {/* Search and Add Button */}
      <div className="master-page-actions">
        <div className="master-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            className="master-search-input"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        {canCreate && (
          <button className="add-item-btn" onClick={onAdd}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            {addButtonLabel}
          </button>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        data={filteredData}
        columns={columns}
        onEdit={canEdit ? onEdit : undefined}
        onDelete={canDelete ? onDelete : undefined}
        getId={getId}
        emptyMessage={emptyMessage}
      />

      {/* Pagination Info */}
      <div className="master-pagination-info">
        Showing {filteredData.length} of {data.length} Items
      </div>
    </div>
  );
}

export default MasterPageLayout;
