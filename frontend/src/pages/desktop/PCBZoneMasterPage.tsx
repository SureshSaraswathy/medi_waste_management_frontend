import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { pcbZoneService, PcbZoneResponse } from '../../services/pcbZoneService';
import '../desktop/dashboardPage.css';
import './pcbZoneMasterPage.css';

interface PCBZone {
  id: string;
  pcbZoneName: string;
  pcbZoneAddress: string;
  contactNum: string;
  contactEmail: string;
  alertEmail: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

const PCBZoneMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPCBZone, setEditingPCBZone] = useState<PCBZone | null>(null);
  const [pcbZones, setPcbZones] = useState<PCBZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  interface AdvancedFilters {
    pcbZoneName: string;
    contactEmail: string;
  }
  
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    pcbZoneName: '',
    contactEmail: '',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load PCB Zones from API
  const loadPcbZones = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiZones = await pcbZoneService.getAllPcbZones(true); // Get only active zones
      const mappedZones: PCBZone[] = apiZones.map((apiZone: PcbZoneResponse) => ({
        id: apiZone.id,
        pcbZoneName: apiZone.pcbZoneName,
        pcbZoneAddress: apiZone.pcbZoneAddress || '',
        contactNum: apiZone.contactNum || '',
        contactEmail: apiZone.contactEmail || '',
        alertEmail: apiZone.alertEmail || '',
        status: apiZone.status,
        createdBy: apiZone.createdBy || '',
        createdOn: apiZone.createdOn,
        modifiedBy: apiZone.modifiedBy || '',
        modifiedOn: apiZone.modifiedOn,
      }));
      setPcbZones(mappedZones);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load PCB zones';
      setError(errorMessage);
      console.error('Error loading PCB zones:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load PCB zones on component mount
  useEffect(() => {
    loadPcbZones();
  }, []);

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  const filteredPCBZones = pcbZones.filter(zone => {
    const query = searchQuery.trim().toLowerCase();
    const nameQuery = advancedFilters.pcbZoneName.trim().toLowerCase();
    const emailQuery = advancedFilters.contactEmail.trim().toLowerCase();
    
    const matchesSearch = !query ||
      zone.pcbZoneName.toLowerCase().includes(query) ||
      zone.pcbZoneAddress.toLowerCase().includes(query) ||
      zone.contactEmail.toLowerCase().includes(query);
    
    const matchesName = !nameQuery || zone.pcbZoneName.toLowerCase().includes(nameQuery);
    const matchesEmail = !emailQuery || zone.contactEmail.toLowerCase().includes(emailQuery);
    const matchesStatus = statusFilter === 'all' || zone.status === statusFilter;
    
    return matchesSearch && matchesName && matchesEmail && matchesStatus;
  });

  const handleAdd = () => {
    setEditingPCBZone(null);
    setShowModal(true);
  };

  const handleEdit = (zone: PCBZone) => {
    setEditingPCBZone(zone);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this PCB Zone?')) {
      try {
        setLoading(true);
        await pcbZoneService.deletePcbZone(id);
        await loadPcbZones(); // Reload zones after deletion
        alert('PCB Zone deleted successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete PCB zone';
        alert(`Error: ${errorMessage}`);
        console.error('Error deleting PCB zone:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (formData: Partial<PCBZone>) => {
    try {
      setLoading(true);
      setError(null);
      
      if (editingPCBZone) {
        // Update existing - only updatable fields can be changed (pcbZoneName is immutable)
        await pcbZoneService.updatePcbZone(editingPCBZone.id, {
          pcbZoneAddress: formData.pcbZoneAddress,
          contactNum: formData.contactNum,
          contactEmail: formData.contactEmail,
          alertEmail: formData.alertEmail,
          status: formData.status,
        });
        alert('PCB Zone updated successfully');
      } else {
        // Add new
        if (!formData.pcbZoneName) {
          alert('Please fill in PCB Zone Name');
          return;
        }
        await pcbZoneService.createPcbZone({
          pcbZoneName: formData.pcbZoneName,
          pcbZoneAddress: formData.pcbZoneAddress,
          contactNum: formData.contactNum,
          contactEmail: formData.contactEmail,
          alertEmail: formData.alertEmail,
        });
        alert('PCB Zone created successfully');
      }
      
      setShowModal(false);
      setEditingPCBZone(null);
      await loadPcbZones(); // Reload zones after save
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save PCB zone';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      console.error('Error saving PCB zone:', err);
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
            <span className="breadcrumb">Home &nbsp;&gt;&nbsp; PCB Zone Master</span>
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
        {loading && !pcbZones.length && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading PCB zones...
          </div>
        )}

        <div className="pcb-zone-master-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">PCB Zone Master</h1>
              <p className="ra-page-subtitle">Manage PCB zone information and details</p>
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
                placeholder="Search by PCB zone name, address, email..."
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
                Add PCB Zone
              </button>
            </div>
          </div>

          {/* PCB Zones Table */}
          <div className="pcb-zone-master-table-container">
            <table className="pcb-zone-master-table">
              <thead>
                <tr>
                  <th>PCB ZONE NAME</th>
                  <th>PCB ZONE ADDRESS</th>
                  <th>CONTACT NUMBER</th>
                  <th>CONTACT EMAIL</th>
                  <th>ALERT EMAIL</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPCBZones.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-message">
                      {loading ? 'Loading...' : 'No PCB zones found'}
                    </td>
                  </tr>
                ) : (
                  filteredPCBZones.map((zone) => (
                    <tr key={zone.id}>
                      <td>{zone.pcbZoneName || '-'}</td>
                      <td>{zone.pcbZoneAddress || '-'}</td>
                      <td>{zone.contactNum || '-'}</td>
                      <td>{zone.contactEmail || '-'}</td>
                      <td>{zone.alertEmail || '-'}</td>
                      <td>
                        <div className="ra-cell-center">
                          <span className={`status-badge status-badge--${zone.status.toLowerCase()}`}>
                            {zone.status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons ra-actions">
                          <button
                            className="action-btn action-btn--view"
                            onClick={() => handleEdit(zone)}
                            title="View"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEdit(zone)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => handleDelete(zone.id)}
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
            Showing {filteredPCBZones.length} of {pcbZones.length} items
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
            setAdvancedFilters({ pcbZoneName: '', contactEmail: '' });
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
        <PCBZoneFormModal
          pcbZone={editingPCBZone}
          onClose={() => {
            setShowModal(false);
            setEditingPCBZone(null);
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
              <div className="cm-filter-subtitle">Filter PCB zones by multiple criteria</div>
            </div>
          </div>
          <button className="cm-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="cm-filter-modal-body">
          <div className="cm-filter-grid">
            <div className="cm-filter-field">
              <label>PCB Zone Name</label>
              <input
                type="text"
                value={draft.pcbZoneName}
                onChange={(e) => setDraft({ ...draft, pcbZoneName: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter PCB zone name"
              />
            </div>

            <div className="cm-filter-field">
              <label>Contact Email</label>
              <input
                type="text"
                value={draft.contactEmail}
                onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter contact email"
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
              setDraft({ pcbZoneName: '', contactEmail: '' });
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

// PCB Zone Form Modal Component
interface PCBZoneFormModalProps {
  pcbZone: PCBZone | null;
  onClose: () => void;
  onSave: (data: Partial<PCBZone>) => void;
}

const PCBZoneFormModal = ({ pcbZone, onClose, onSave }: PCBZoneFormModalProps) => {
  const [formData, setFormData] = useState<Partial<PCBZone>>(
    pcbZone || {
      pcbZoneName: '',
      pcbZoneAddress: '',
      contactNum: '',
      contactEmail: '',
      alertEmail: '',
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
          <h2 className="modal-title">{pcbZone ? 'Edit PCB Zone' : 'Add PCB Zone'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="pcb-zone-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label>PCB Zone Name *</label>
                <input
                  type="text"
                  value={formData.pcbZoneName || ''}
                  onChange={(e) => setFormData({ ...formData, pcbZoneName: e.target.value })}
                  required
                  disabled={!!pcbZone} // Disable when editing (immutable field)
                  style={pcbZone ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group form-group--full">
                <label>PCB Zone Address *</label>
                <textarea
                  value={formData.pcbZoneAddress || ''}
                  onChange={(e) => setFormData({ ...formData, pcbZoneAddress: e.target.value })}
                  required
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Contact Number *</label>
                <input
                  type="tel"
                  value={formData.contactNum || ''}
                  onChange={(e) => setFormData({ ...formData, contactNum: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Contact Email *</label>
                <input
                  type="email"
                  value={formData.contactEmail || ''}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Alert Email *</label>
                <input
                  type="email"
                  value={formData.alertEmail || ''}
                  onChange={(e) => setFormData({ ...formData, alertEmail: e.target.value })}
                  required
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
              {pcbZone ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PCBZoneMasterPage;
