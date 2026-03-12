import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { placeholderMasterService, PlaceholderMasterResponse } from '../../services/placeholderMasterService';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import PageHeader from '../../components/layout/PageHeader';
import '../desktop/dashboardPage.css';
import './equipmentMasterPage.css';
import toast from 'react-hot-toast';
import NotificationBell from '../../components/NotificationBell';

interface PlaceholderMaster {
  id: string;
  placeholderCode: string;
  placeholderDescription: string;
  sourceTable: string;
  sourceColumn: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

const PlaceholderMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingPlaceholder, setEditingPlaceholder] = useState<PlaceholderMaster | null>(null);
  const [placeholders, setPlaceholders] = useState<PlaceholderMaster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  interface AdvancedFilters {
    placeholderCode: string;
    placeholderDescription: string;
    sourceTable: string;
    sourceColumn: string;
  }
  
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    placeholderCode: '',
    placeholderDescription: '',
    sourceTable: '',
    sourceColumn: '',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load placeholders from API
  const loadPlaceholders = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiPlaceholders = await placeholderMasterService.getAllPlaceholderMasters(true);
      const mappedPlaceholders: PlaceholderMaster[] = apiPlaceholders.map((apiPlaceholder: PlaceholderMasterResponse) => ({
        id: apiPlaceholder.id,
        placeholderCode: apiPlaceholder.placeholderCode,
        placeholderDescription: apiPlaceholder.placeholderDescription,
        sourceTable: apiPlaceholder.sourceTable,
        sourceColumn: apiPlaceholder.sourceColumn,
        status: apiPlaceholder.status,
        createdBy: apiPlaceholder.createdBy || '',
        createdOn: apiPlaceholder.createdOn,
        modifiedBy: apiPlaceholder.modifiedBy || '',
        modifiedOn: apiPlaceholder.modifiedOn,
      }));
      setPlaceholders(mappedPlaceholders);
    } catch (err: any) {
      if (err?.isEndpointMissing || err?.status === 404) {
        console.warn('⚠️ Placeholder Master API endpoint not found.');
        setPlaceholders([]);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load placeholder masters';
        setError(errorMessage);
        console.error('Error loading placeholder masters:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaceholders();
  }, []);

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  const filteredPlaceholders = placeholders.filter(ph => {
    const query = searchQuery.trim().toLowerCase();
    const codeQuery = advancedFilters.placeholderCode.trim().toLowerCase();
    const descQuery = advancedFilters.placeholderDescription.trim().toLowerCase();
    const tableQuery = advancedFilters.sourceTable.trim().toLowerCase();
    const columnQuery = advancedFilters.sourceColumn.trim().toLowerCase();
    
    const matchesSearch = !query ||
      ph.placeholderCode.toLowerCase().includes(query) ||
      ph.placeholderDescription.toLowerCase().includes(query) ||
      ph.sourceTable.toLowerCase().includes(query) ||
      ph.sourceColumn.toLowerCase().includes(query);
    
    const matchesCode = !codeQuery || ph.placeholderCode.toLowerCase().includes(codeQuery);
    const matchesDesc = !descQuery || ph.placeholderDescription.toLowerCase().includes(descQuery);
    const matchesTable = !tableQuery || ph.sourceTable.toLowerCase().includes(tableQuery);
    const matchesColumn = !columnQuery || ph.sourceColumn.toLowerCase().includes(columnQuery);
    const matchesStatus = statusFilter === 'all' || ph.status === statusFilter;
    
    return matchesSearch && matchesCode && matchesDesc && matchesTable && matchesColumn && matchesStatus;
  });

  const handleAdd = () => {
    setEditingPlaceholder(null);
    setShowModal(true);
  };

  const handleEdit = (placeholder: PlaceholderMaster) => {
    setEditingPlaceholder(placeholder);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this placeholder master?')) {
      try {
        setLoading(true);
        await placeholderMasterService.deletePlaceholderMaster(id);
        await loadPlaceholders();
        toast.success('Placeholder Master deleted successfully', {
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ),
          style: {
            background: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
          },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete placeholder master';
        toast.error(`Error: ${errorMessage}`);
        console.error('Error deleting placeholder master:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (formData: Partial<PlaceholderMaster>) => {
    try {
      setLoading(true);
      setError(null);
      
      if (editingPlaceholder) {
        await placeholderMasterService.updatePlaceholderMaster(editingPlaceholder.id, {
          placeholderDescription: formData.placeholderDescription,
          sourceTable: formData.sourceTable,
          sourceColumn: formData.sourceColumn,
          status: formData.status,
        });
        toast.success('Placeholder Master updated successfully', {
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ),
          style: {
            background: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
          },
        });
      } else {
        if (!formData.placeholderCode || !formData.placeholderDescription || !formData.sourceTable || !formData.sourceColumn) {
          toast.error('Please complete the required fields.');
          return;
        }
        await placeholderMasterService.createPlaceholderMaster({
          placeholderCode: formData.placeholderCode!,
          placeholderDescription: formData.placeholderDescription!,
          sourceTable: formData.sourceTable!,
          sourceColumn: formData.sourceColumn!,
        });
        toast.success('Placeholder Master created successfully', {
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ),
          style: {
            background: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
          },
        });
      }
      
      setShowModal(false);
      setEditingPlaceholder(null);
      await loadPlaceholders();
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save placeholder master';
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        toast.error('Placeholder Code already exists.');
      } else {
        setError(errorMessage);
        toast.error(`Error: ${errorMessage}`);
      }
      console.error('Error saving placeholder master:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-page">
      {/* Left Sidebar */}
      <aside className={`dashboard-sidebar sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="logo-container">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <div className="brand-text">
                <span className="brand-title">MEDI-WASTE</span>
                <span className="brand-subtitle">Enterprise Platform</span>
              </div>
            )}
          </div>

          <button
            className="toggle-button"
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              {isSidebarCollapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
        </div>

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
          <NotificationBell variant="sidebar" />
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
        <PageHeader 
          title="Placeholder Master"
          subtitle="Manage dynamic placeholder fields for agreement clauses"
        />

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '16px 20px', 
            background: '#fff3cd', 
            color: '#856404', 
            marginBottom: '20px', 
            borderRadius: '8px',
            border: '1px solid #ffc107',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div>
                  <strong style={{ fontSize: '14px', fontWeight: 600 }}>Error</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', lineHeight: '1.5' }}>
                    {error}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setError(null)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#856404', 
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '0',
                  lineHeight: '1',
                  flexShrink: 0
                }}
                aria-label="Close error message"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !placeholders.length && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading placeholder masters...
          </div>
        )}

        <div className="equipment-master-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Placeholder Master</h1>
              <p className="ra-page-subtitle">Manage dynamic placeholder fields for agreement clauses</p>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="ra-search-actions">
            <div className="ra-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                placeholder="Search by placeholder code, description, table, column..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ra-search-input"
              />
            </div>
            <div className="ra-actions">
              <button className="ra-filter-btn" onClick={() => setShowAdvancedFilters(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Advanced Filter
              </button>
              <button className="ra-add-btn" onClick={handleAdd}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Placeholder
              </button>
            </div>
          </div>

          {/* Placeholder Table */}
          <div className="equipment-master-table-container">
            <table className="equipment-master-table">
              <thead>
                <tr>
                  <th>PLACEHOLDER CODE</th>
                  <th>DESCRIPTION</th>
                  <th>SOURCE TABLE</th>
                  <th>SOURCE COLUMN</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlaceholders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-message">
                      {loading ? 'Loading...' : 'No placeholder masters found'}
                    </td>
                  </tr>
                ) : (
                  filteredPlaceholders.map((ph) => (
                    <tr key={ph.id}>
                      <td>{ph.placeholderCode || '-'}</td>
                      <td>{ph.placeholderDescription || '-'}</td>
                      <td>{ph.sourceTable || '-'}</td>
                      <td>{ph.sourceColumn || '-'}</td>
                      <td>
                        <div className="ra-cell-center">
                          <span className={`ra-status-badge ra-status-badge--${ph.status.toLowerCase()}`}>
                            {ph.status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="ra-cell-center">
                          <button
                            className="ra-action-btn"
                            onClick={() => handleEdit(ph)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="ra-action-btn ra-action-btn--danger"
                            onClick={() => handleDelete(ph.id)}
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Info */}
          <div className="cm-pagination-info">
            Showing {filteredPlaceholders.length} of {placeholders.length} items
          </div>
        </div>
      </main>

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <AdvancedFiltersModal
          statusFilter={statusFilter}
          advancedFilters={advancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onClear={() => {
            setAdvancedFilters({ placeholderCode: '', placeholderDescription: '', sourceTable: '', sourceColumn: '' });
            setStatusFilter('all');
            setSearchQuery('');
          }}
          onApply={(payload) => {
            setStatusFilter(payload.statusFilter);
            setAdvancedFilters(payload.advancedFilters);
            setShowAdvancedFilters(false);
          }}
        />
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <PlaceholderFormModal
          placeholder={editingPlaceholder}
          onClose={() => {
            setShowModal(false);
            setEditingPlaceholder(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Advanced Filters Modal Component
interface AdvancedFiltersModalProps {
  statusFilter: string;
  advancedFilters: AdvancedFilters;
  onClose: () => void;
  onClear: () => void;
  onApply: (payload: { statusFilter: string; advancedFilters: AdvancedFilters }) => void;
}

const AdvancedFiltersModal = ({
  statusFilter,
  advancedFilters,
  onClose,
  onClear,
  onApply,
}: AdvancedFiltersModalProps) => {
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draft, setDraft] = useState<AdvancedFilters>(advancedFilters);

  return (
    <div className="modal-overlay cm-filter-modal-overlay" onClick={onClose}>
      <div className="modal-content cm-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cm-filter-modal-header">
          <div className="cm-filter-modal-titlewrap">
            <div className="cm-filter-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </div>
            <div>
              <div className="cm-filter-title">Advanced Filters</div>
              <div className="cm-filter-subtitle">Filter placeholders by multiple criteria</div>
            </div>
          </div>
          <button className="cm-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="cm-filter-modal-body">
          <div className="cm-filter-grid">
            <div className="cm-filter-field">
              <label>Placeholder Code</label>
              <input
                type="text"
                value={draft.placeholderCode}
                onChange={(e) => setDraft({ ...draft, placeholderCode: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter placeholder code"
              />
            </div>

            <div className="cm-filter-field">
              <label>Description</label>
              <input
                type="text"
                value={draft.placeholderDescription}
                onChange={(e) => setDraft({ ...draft, placeholderDescription: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter description"
              />
            </div>

            <div className="cm-filter-field">
              <label>Source Table</label>
              <input
                type="text"
                value={draft.sourceTable}
                onChange={(e) => setDraft({ ...draft, sourceTable: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter source table"
              />
            </div>

            <div className="cm-filter-field">
              <label>Source Column</label>
              <input
                type="text"
                value={draft.sourceColumn}
                onChange={(e) => setDraft({ ...draft, sourceColumn: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter source column"
              />
            </div>

            <div className="cm-filter-field">
              <label>Status</label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
                className="cm-filter-select"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="cm-filter-modal-footer">
          <button
            type="button"
            className="cm-link-btn"
            onClick={() => {
              setDraftStatus('all');
              setDraft({ placeholderCode: '', placeholderDescription: '', sourceTable: '', sourceColumn: '' });
              onClear();
            }}
          >
            Clear Filters
          </button>
          <button
            type="button"
            className="cm-btn cm-btn--primary cm-btn--sm"
            onClick={() =>
              onApply({
                statusFilter: draftStatus,
                advancedFilters: draft,
              })
            }
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

// Placeholder Form Modal Component
interface PlaceholderFormModalProps {
  placeholder: PlaceholderMaster | null;
  onClose: () => void;
  onSave: (data: Partial<PlaceholderMaster>) => void;
}

const PlaceholderFormModal = ({ placeholder, onClose, onSave }: PlaceholderFormModalProps) => {
  const [formData, setFormData] = useState<Partial<PlaceholderMaster>>(
    placeholder || {
      placeholderCode: '',
      placeholderDescription: '',
      sourceTable: '',
      sourceColumn: '',
      status: 'Active',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay ra-assignment-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-assignment-modal template-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header ra-assignment-modal-header">
          <div className="ra-assignment-modal-titlewrap">
            <div className="ra-assignment-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <div>
              <h2 className="modal-title ra-assignment-modal-title">{placeholder ? 'Edit Placeholder Master' : 'Add Placeholder Master'}</h2>
              <p className="ra-assignment-modal-subtitle">{placeholder ? 'Update placeholder details.' : 'Create a new placeholder master record.'}</p>
            </div>
          </div>
          <button className="modal-close-btn ra-assignment-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="equipment-form ra-assignment-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-grid ra-assignment-form-grid">
              <div className="form-group">
                <label>Placeholder Code *</label>
                <input
                  type="text"
                  value={formData.placeholderCode || ''}
                  onChange={(e) => setFormData({ ...formData, placeholderCode: e.target.value })}
                  required
                  maxLength={50}
                  disabled={!!placeholder}
                  style={placeholder ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                  placeholder="e.g., HCF_NAME"
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <input
                  type="text"
                  value={formData.placeholderDescription || ''}
                  onChange={(e) => setFormData({ ...formData, placeholderDescription: e.target.value })}
                  required
                  maxLength={200}
                  placeholder="e.g., Healthcare Facility Name"
                />
              </div>
              <div className="form-group">
                <label>Source Table *</label>
                <input
                  type="text"
                  value={formData.sourceTable || ''}
                  onChange={(e) => setFormData({ ...formData, sourceTable: e.target.value })}
                  required
                  maxLength={100}
                  placeholder="e.g., hcfs"
                />
              </div>
              <div className="form-group">
                <label>Source Column *</label>
                <input
                  type="text"
                  value={formData.sourceColumn || ''}
                  onChange={(e) => setFormData({ ...formData, sourceColumn: e.target.value })}
                  required
                  maxLength={100}
                  placeholder="e.g., hcf_name"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status || 'Active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer ra-assignment-modal-footer">
            <button type="button" className="btn btn--secondary ra-assignment-btn ra-assignment-btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary ra-assignment-btn ra-assignment-btn--primary">
              {placeholder ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlaceholderMasterPage;
