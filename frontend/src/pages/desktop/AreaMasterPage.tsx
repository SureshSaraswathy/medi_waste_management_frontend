import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { areaService, AreaResponse } from '../../services/areaService';
import '../desktop/dashboardPage.css';
import './areaMasterPage.css';

interface Area {
  id: string;
  areaCode: string;
  areaName: string;
  areaPincode: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

const AreaMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  interface AdvancedFilters {
    areaCode: string;
    areaName: string;
    areaPincode: string;
  }
  
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    areaCode: '',
    areaName: '',
    areaPincode: '',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load areas from API
  const loadAreas = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiAreas = await areaService.getAllAreas(true); // Get only active areas
      const mappedAreas: Area[] = apiAreas.map((apiArea: AreaResponse) => ({
        id: apiArea.id,
        areaCode: apiArea.areaCode,
        areaName: apiArea.areaName,
        areaPincode: apiArea.areaPincode,
        status: apiArea.status,
        createdBy: apiArea.createdBy || '',
        createdOn: apiArea.createdOn,
        modifiedBy: apiArea.modifiedBy || '',
        modifiedOn: apiArea.modifiedOn,
      }));
      setAreas(mappedAreas);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load areas';
      setError(errorMessage);
      console.error('Error loading areas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load areas on component mount
  useEffect(() => {
    loadAreas();
  }, []);

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  const filteredAreas = areas.filter(area => {
    const query = searchQuery.trim().toLowerCase();
    const codeQuery = advancedFilters.areaCode.trim().toLowerCase();
    const nameQuery = advancedFilters.areaName.trim().toLowerCase();
    const pincodeQuery = advancedFilters.areaPincode.trim().toLowerCase();
    
    const matchesSearch = !query ||
      area.areaName.toLowerCase().includes(query) ||
      area.areaCode.toLowerCase().includes(query) ||
      area.areaPincode.toLowerCase().includes(query);
    
    const matchesCode = !codeQuery || area.areaCode.toLowerCase().includes(codeQuery);
    const matchesName = !nameQuery || area.areaName.toLowerCase().includes(nameQuery);
    const matchesPincode = !pincodeQuery || area.areaPincode.toLowerCase().includes(pincodeQuery);
    const matchesStatus = statusFilter === 'all' || area.status === statusFilter;
    
    return matchesSearch && matchesCode && matchesName && matchesPincode && matchesStatus;
  });

  const handleAdd = () => {
    setEditingArea(null);
    setShowModal(true);
  };

  const handleEdit = (area: Area) => {
    setEditingArea(area);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this area?')) {
      try {
        setLoading(true);
        await areaService.deleteArea(id);
        await loadAreas(); // Reload areas after deletion
        alert('Area deleted successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete area';
        alert(`Error: ${errorMessage}`);
        console.error('Error deleting area:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (formData: Partial<Area>) => {
    try {
      setLoading(true);
      setError(null);
      
      if (editingArea) {
        // Update existing - only areaPincode and status can be updated (areaCode and areaName are immutable)
        await areaService.updateArea(editingArea.id, {
          areaPincode: formData.areaPincode,
          status: formData.status,
        });
        alert('Area updated successfully');
      } else {
        // Add new
        if (!formData.areaCode || !formData.areaName || !formData.areaPincode) {
          alert('Please fill in all required fields');
          return;
        }
        await areaService.createArea({
          areaCode: formData.areaCode,
          areaName: formData.areaName,
          areaPincode: formData.areaPincode,
        });
        alert('Area created successfully');
      }
      
      setShowModal(false);
      setEditingArea(null);
      await loadAreas(); // Reload areas after save
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save area';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      console.error('Error saving area:', err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="dashboard-page">
      {/* Left Sidebar */}
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
            <span className="breadcrumb">Home &nbsp;&gt;&nbsp; Area Master</span>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#fee', 
            color: '#c33', 
            marginBottom: '16px', 
            borderRadius: '4px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{error}</span>
            <button 
              onClick={() => setError(null)} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#c33', 
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 8px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !areas.length && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading areas...
          </div>
        )}

        <div className="area-master-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Area Master</h1>
              <p className="ra-page-subtitle">Manage area information and details</p>
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
                placeholder="Search by area code, name, pincode..."
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
                Add Area
              </button>
            </div>
          </div>

          {/* Areas Table */}
          <div className="area-master-table-container">
            <table className="area-master-table">
              <thead>
                <tr>
                  <th>AREA CODE</th>
                  <th>AREA NAME</th>
                  <th>AREA PINCODE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredAreas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-message">
                      {loading ? 'Loading...' : 'No areas found'}
                    </td>
                  </tr>
                ) : (
                  filteredAreas.map((area) => (
                    <tr key={area.id}>
                      <td>{area.areaCode || '-'}</td>
                      <td>{area.areaName || '-'}</td>
                      <td>{area.areaPincode || '-'}</td>
                      <td>
                        <div className="ra-cell-center">
                          <span className={`status-badge status-badge--${area.status.toLowerCase()}`}>
                            {area.status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons ra-actions">
                          <button
                            className="action-btn action-btn--view"
                            onClick={() => handleEdit(area)}
                            title="View"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEdit(area)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => handleDelete(area.id)}
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
            Showing {filteredAreas.length} of {areas.length} items
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
            setAdvancedFilters({ areaCode: '', areaName: '', areaPincode: '' });
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
        <AreaFormModal
          area={editingArea}
          onClose={() => {
            setShowModal(false);
            setEditingArea(null);
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
              <div className="cm-filter-subtitle">Filter areas by multiple criteria</div>
            </div>
          </div>
          <button className="cm-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="cm-filter-modal-body">
          <div className="cm-filter-grid">
            <div className="cm-filter-field">
              <label>Area Code</label>
              <input
                type="text"
                value={draft.areaCode}
                onChange={(e) => setDraft({ ...draft, areaCode: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter area code"
              />
            </div>

            <div className="cm-filter-field">
              <label>Area Name</label>
              <input
                type="text"
                value={draft.areaName}
                onChange={(e) => setDraft({ ...draft, areaName: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter area name"
              />
            </div>

            <div className="cm-filter-field">
              <label>Area Pincode</label>
              <input
                type="text"
                value={draft.areaPincode}
                onChange={(e) => setDraft({ ...draft, areaPincode: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter area pincode"
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
              setDraft({ areaCode: '', areaName: '', areaPincode: '' });
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

// Area Form Modal Component
interface AreaFormModalProps {
  area: Area | null;
  onClose: () => void;
  onSave: (data: Partial<Area>) => void;
}

const AreaFormModal = ({ area, onClose, onSave }: AreaFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Area>>(
    area || {
      areaCode: '',
      areaName: '',
      areaPincode: '',
      status: 'Active',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{area ? 'Edit Area' : 'Add Area'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="area-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label>Area Code *</label>
                <input
                  type="text"
                  value={formData.areaCode || ''}
                  onChange={(e) => setFormData({ ...formData, areaCode: e.target.value })}
                  required
                  disabled={!!area} // Disable when editing (immutable field)
                  style={area ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group">
                <label>Area Name *</label>
                <input
                  type="text"
                  value={formData.areaName || ''}
                  onChange={(e) => setFormData({ ...formData, areaName: e.target.value })}
                  required
                  disabled={!!area} // Disable when editing (immutable field)
                  style={area ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group">
                <label>Area Pincode *</label>
                <input
                  type="text"
                  value={formData.areaPincode || ''}
                  onChange={(e) => setFormData({ ...formData, areaPincode: e.target.value })}
                  required
                  maxLength={10}
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

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              {area ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AreaMasterPage;
