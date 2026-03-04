import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { districtService, DistrictResponse } from '../../services/districtService';
import { stateService, StateResponse } from '../../services/stateService';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import PageHeader from '../../components/layout/PageHeader';
import '../desktop/dashboardPage.css';
import './districtMasterPage.css';
import toast from 'react-hot-toast';
import NotificationBell from '../../components/NotificationBell';

interface District {
  id: string;
  districtCode: string;
  districtName: string;
  stateId?: string;
  stateName?: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

const DistrictMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [states, setStates] = useState<StateResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  interface AdvancedFilters {
    districtCode: string;
    districtName: string;
    stateName: string;
  }
  
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    districtCode: '',
    districtName: '',
    stateName: '',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load states from API
  const loadStates = async () => {
    try {
      const apiStates = await stateService.getAllStates(true);
      setStates(apiStates);
    } catch (err) {
      console.error('Error loading states:', err);
    }
  };

  // Load districts from API
  const loadDistricts = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiDistricts = await districtService.getAllDistricts(true);
      const mappedDistricts: District[] = apiDistricts.map((apiDistrict: DistrictResponse) => {
        let stateName = '';
        if (apiDistrict.stateId) {
          const state = states.find(s => s.id === apiDistrict.stateId);
          stateName = state?.stateName || '';
        }
        return {
          id: apiDistrict.id,
          districtCode: apiDistrict.districtCode,
          districtName: apiDistrict.districtName,
          stateId: apiDistrict.stateId,
          stateName: stateName,
          status: apiDistrict.status,
          createdBy: apiDistrict.createdBy || '',
          createdOn: apiDistrict.createdOn,
          modifiedBy: apiDistrict.modifiedBy || '',
          modifiedOn: apiDistrict.modifiedOn,
        };
      });
      setDistricts(mappedDistricts);
    } catch (err: any) {
      // Handle endpoint not found gracefully
      if (err?.isEndpointMissing || err?.status === 404) {
        // Only show error in console for missing endpoints (backend not implemented yet)
        console.warn('⚠️ District API endpoint not found. Backend needs to implement: GET /api/v1/districts');
        console.info('📋 Implementation checklist:', {
          endpoint: 'GET /api/v1/districts',
          queryParams: ['activeOnly (optional)'],
          responseFormat: '{ success: boolean, data: DistrictResponse[], message: string }'
        });
        setDistricts([]); // Set empty array instead of crashing
        // Don't show error banner for missing endpoints - backend will be implemented later
        // setError('The District API endpoint is not available. Please contact your administrator to implement the backend API endpoint: GET /api/v1/districts');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load districts';
        setError(errorMessage);
        console.error('Error loading districts:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load states first, then districts
  useEffect(() => {
    const initializeData = async () => {
      await loadStates();
    };
    initializeData();
  }, []);

  // Load districts when states are loaded
  useEffect(() => {
    if (states.length > 0) {
      loadDistricts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [states]);

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  const filteredDistricts = districts.filter(district => {
    const query = searchQuery.trim().toLowerCase();
    const codeQuery = advancedFilters.districtCode.trim().toLowerCase();
    const nameQuery = advancedFilters.districtName.trim().toLowerCase();
    const stateQuery = advancedFilters.stateName.trim().toLowerCase();
    
    const matchesSearch = !query ||
      district.districtName.toLowerCase().includes(query) ||
      district.districtCode.toLowerCase().includes(query) ||
      (district.stateName || '').toLowerCase().includes(query);
    
    const matchesCode = !codeQuery || district.districtCode.toLowerCase().includes(codeQuery);
    const matchesName = !nameQuery || district.districtName.toLowerCase().includes(nameQuery);
    const matchesState = !stateQuery || (district.stateName || '').toLowerCase().includes(stateQuery);
    const matchesStatus = statusFilter === 'all' || district.status === statusFilter;
    
    return matchesSearch && matchesCode && matchesName && matchesState && matchesStatus;
  });

  const handleAdd = () => {
    setEditingDistrict(null);
    setShowModal(true);
  };

  const handleEdit = (district: District) => {
    setEditingDistrict(district);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this district?')) {
      try {
        setLoading(true);
        
        // Validate deletion using validation service
        const { validateDistrictDelete } = await import('../../utils/deleteValidationService');
        const validation = await validateDistrictDelete(id);
        if (!validation.canDelete) {
          toast.error(validation.message);
          setLoading(false);
          return;
        }
        
        await districtService.deleteDistrict(id);
        await loadDistricts(); // Reload districts after deletion
        toast.success('District deleted successfully', {
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
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete district';
        toast.error(`Error: ${errorMessage}`);
        console.error('Error deleting district:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (formData: Partial<District>) => {
    try {
      setLoading(true);
      setError(null);
      
      if (editingDistrict) {
        // Update existing - only status can be updated (districtCode and districtName are immutable)
        await districtService.updateDistrict(editingDistrict.id, {
          status: formData.status,
          stateId: formData.stateId,
        });
        toast.success('District updated successfully', {
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
        // Add new
        if (!formData.districtCode || !formData.districtName) {
          toast.error('Please complete the required fields.');
          return;
        }
        await districtService.createDistrict({
          districtCode: formData.districtCode,
          districtName: formData.districtName,
          stateId: formData.stateId,
        });
        toast.success('District created successfully', {
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
      setEditingDistrict(null);
      await loadDistricts(); // Reload districts after save
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save district';
      setError(errorMessage);
      toast.error(`Error: ${errorMessage}`);
      console.error('Error saving district:', err);
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
          title="District Master"
          subtitle="Manage district master data"
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
                  <strong style={{ fontSize: '14px', fontWeight: 600 }}>API Endpoint Not Found</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', lineHeight: '1.5' }}>
                    {error.includes('endpoint') ? error : `The District API endpoint is not available. Please ensure the backend API is running and implements: GET /api/v1/districts`}
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
            {error.includes('endpoint') && (
              <div style={{ 
                marginTop: '8px', 
                padding: '12px', 
                background: '#fff', 
                borderRadius: '4px',
                fontSize: '12px',
                color: '#495057',
                border: '1px solid #dee2e6'
              }}>
                <strong>Backend Implementation Required:</strong>
                <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                  <li>Create a District controller in the backend</li>
                  <li>Implement GET /api/v1/districts endpoint</li>
                  <li>Support optional query parameter: activeOnly</li>
                  <li>Return districts in the format: {'{'} id, districtCode, districtName, stateId, status {'}'}</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !districts.length && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading districts...
          </div>
        )}

        <div className="district-master-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">District Master</h1>
              <p className="ra-page-subtitle">Manage district information and details</p>
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
                placeholder="Search by district code, name, state..."
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
                Add District
              </button>
            </div>
          </div>

          {/* Districts Table */}
          <div className="district-master-table-container">
            <table className="district-master-table">
              <thead>
                <tr>
                  <th>DISTRICT CODE</th>
                  <th>DISTRICT NAME</th>
                  <th>STATE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredDistricts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-message">
                      {loading ? 'Loading...' : 'No districts found'}
                    </td>
                  </tr>
                ) : (
                  filteredDistricts.map((district) => (
                    <tr key={district.id}>
                      <td>{district.districtCode || '-'}</td>
                      <td>{district.districtName || '-'}</td>
                      <td>{district.stateName || '-'}</td>
                      <td>
                        <div className="ra-cell-center">
                          <span className={`status-badge status-badge--${district.status.toLowerCase()}`}>
                            {district.status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons ra-actions">
                          <button
                            className="action-btn action-btn--view"
                            onClick={() => handleEdit(district)}
                            title="View"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEdit(district)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => handleDelete(district.id)}
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
            Showing {filteredDistricts.length} of {districts.length} items
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
            setAdvancedFilters({ districtCode: '', districtName: '', stateName: '' });
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
        <DistrictFormModal
          district={editingDistrict}
          states={states.filter(s => s.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingDistrict(null);
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
              <div className="cm-filter-subtitle">Filter districts by multiple criteria</div>
            </div>
          </div>
          <button className="cm-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="cm-filter-modal-body">
          <div className="cm-filter-grid">
            <div className="cm-filter-field">
              <label>District Code</label>
              <input
                type="text"
                value={draft.districtCode}
                onChange={(e) => setDraft({ ...draft, districtCode: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter district code"
              />
            </div>

            <div className="cm-filter-field">
              <label>District Name</label>
              <input
                type="text"
                value={draft.districtName}
                onChange={(e) => setDraft({ ...draft, districtName: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter district name"
              />
            </div>

            <div className="cm-filter-field">
              <label>State Name</label>
              <input
                type="text"
                value={draft.stateName}
                onChange={(e) => setDraft({ ...draft, stateName: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter state name"
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
              setDraft({ districtCode: '', districtName: '', stateName: '' });
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

// District Form Modal Component
interface DistrictFormModalProps {
  district: District | null;
  states: StateResponse[];
  onClose: () => void;
  onSave: (data: Partial<District>) => void;
}

const DistrictFormModal = ({ district, states, onClose, onSave }: DistrictFormModalProps) => {
  const [formData, setFormData] = useState<Partial<District>>(
    district || {
      districtCode: '',
      districtName: '',
      stateId: '',
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
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div>
              <h2 className="modal-title ra-assignment-modal-title">{district ? 'Edit District' : 'Add District'}</h2>
              <p className="ra-assignment-modal-subtitle">{district ? 'Update district details.' : 'Create a new district record.'}</p>
            </div>
          </div>
          <button className="modal-close-btn ra-assignment-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="district-form ra-assignment-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-grid ra-assignment-form-grid">
              <div className="form-group">
                <label>District Code *</label>
                <input
                  type="text"
                  value={formData.districtCode || ''}
                  onChange={(e) => setFormData({ ...formData, districtCode: e.target.value })}
                  required
                  maxLength={10}
                  disabled={!!district} // Disable when editing (immutable field)
                  style={district ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group">
                <label>District Name *</label>
                <input
                  type="text"
                  value={formData.districtName || ''}
                  onChange={(e) => setFormData({ ...formData, districtName: e.target.value })}
                  required
                  disabled={!!district} // Disable when editing (immutable field)
                  style={district ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group">
                <label>State</label>
                <select
                  value={formData.stateId || ''}
                  onChange={(e) => setFormData({ ...formData, stateId: e.target.value })}
                >
                  <option value="">Select State</option>
                  {states.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.stateCode} - {state.stateName}
                    </option>
                  ))}
                </select>
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
              {district ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DistrictMasterPage;
