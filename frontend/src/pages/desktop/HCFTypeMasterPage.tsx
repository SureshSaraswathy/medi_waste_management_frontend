import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../services/permissionService';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { hcfTypeService, HcfTypeResponse } from '../../services/hcfTypeService';
import { companyService, CompanyResponse } from '../../services/companyService';
import PageHeader from '../../components/layout/PageHeader';
import './hcfTypeMasterPage.css';
import '../desktop/dashboardPage.css';

interface HCFType {
  id: string;
  companyName: string;
  hcfTypeCode: string;
  hcfTypeName: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

const HCFTypeMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const canCreate = hasPermission(Array.isArray(permissions) ? permissions : [], 'HCF_TYPE_CREATE');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingHCFType, setEditingHCFType] = useState<HCFType | null>(null);
  const [hcfTypes, setHcfTypes] = useState<HCFType[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  interface AdvancedFilters {
    hcfTypeCode: string;
    hcfTypeName: string;
    companyName: string;
  }
  
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    hcfTypeCode: '',
    hcfTypeName: '',
    companyName: '',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Load companies from API
  const loadCompanies = async () => {
    try {
      const apiCompanies = await companyService.getAllCompanies(true);
      const mappedCompanies: Company[] = apiCompanies.map((apiCompany: CompanyResponse) => ({
        id: apiCompany.id,
        companyCode: apiCompany.companyCode,
        companyName: apiCompany.companyName,
        status: apiCompany.status,
      }));
      setCompanies(mappedCompanies);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  };

  // Load HCF Types from API
  const loadHcfTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiHcfTypes = await hcfTypeService.getAllHcfTypes(undefined, true);
      const mappedHcfTypes: HCFType[] = apiHcfTypes.map((apiHcfType: HcfTypeResponse) => {
        const company = companies.find(c => c.id === apiHcfType.companyId);
        return {
          id: apiHcfType.id,
          companyName: company?.companyName || 'Unknown Company',
          hcfTypeCode: apiHcfType.hcfTypeCode,
          hcfTypeName: apiHcfType.hcfTypeName,
          status: apiHcfType.status,
          createdBy: apiHcfType.createdBy || '',
          createdOn: apiHcfType.createdOn,
          modifiedBy: apiHcfType.modifiedBy || '',
          modifiedOn: apiHcfType.modifiedOn,
        };
      });
      setHcfTypes(mappedHcfTypes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load HCF types';
      setError(errorMessage);
      console.error('Error loading HCF types:', err);
      setHcfTypes([]);
    } finally {
      setLoading(false);
    }
  };

  // Load companies first, then HCF types
  useEffect(() => {
    const initializeData = async () => {
      await loadCompanies();
    };
    initializeData();
  }, []);

  // Load HCF types when companies are loaded
  useEffect(() => {
    if (companies.length > 0) {
      loadHcfTypes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies.length]);

  const filteredHCFTypes = hcfTypes.filter(hcfType => {
    const query = searchQuery.trim().toLowerCase();
    const codeQuery = advancedFilters.hcfTypeCode.trim().toLowerCase();
    const nameQuery = advancedFilters.hcfTypeName.trim().toLowerCase();
    const companyQuery = advancedFilters.companyName.trim().toLowerCase();
    
    const matchesSearch = !query ||
      hcfType.companyName.toLowerCase().includes(query) ||
      hcfType.hcfTypeCode.toLowerCase().includes(query) ||
      hcfType.hcfTypeName.toLowerCase().includes(query);
    
    const matchesCode = !codeQuery || hcfType.hcfTypeCode.toLowerCase().includes(codeQuery);
    const matchesName = !nameQuery || hcfType.hcfTypeName.toLowerCase().includes(nameQuery);
    const matchesCompany = !companyQuery || hcfType.companyName.toLowerCase().includes(companyQuery);
    const matchesStatus = statusFilter === 'all' || hcfType.status === statusFilter;
    
    return matchesSearch && matchesCode && matchesName && matchesCompany && matchesStatus;
  });

  const handleAdd = () => {
    setEditingHCFType(null);
    setShowModal(true);
  };

  const handleEdit = (hcfType: HCFType) => {
    setEditingHCFType(hcfType);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this HCF Type?')) {
      try {
        setLoading(true);
        await hcfTypeService.deleteHcfType(id);
        await loadHcfTypes();
        alert('HCF Type deleted successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete HCF type';
        alert(`Error: ${errorMessage}`);
        console.error('Error deleting HCF type:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (data: Partial<HCFType>) => {
    try {
      setLoading(true);
      setError(null);
      
      // Find company ID from company name
      const selectedCompany = companies.find(c => c.companyName === data.companyName);
      if (!selectedCompany) {
        alert('Please select a valid company');
        return;
      }

      if (editingHCFType) {
        // Update existing - only status can be updated (hcfTypeCode, hcfTypeName, companyId are immutable)
        await hcfTypeService.updateHcfType(editingHCFType.id, {
          status: data.status,
        });
        alert('HCF Type updated successfully');
      } else {
        // Add new
        if (!data.hcfTypeCode || !data.hcfTypeName || !data.companyName) {
          alert('Please fill in all required fields');
          return;
        }
        await hcfTypeService.createHcfType({
          hcfTypeCode: data.hcfTypeCode,
          hcfTypeName: data.hcfTypeName,
          companyId: selectedCompany.id,
        });
        alert('HCF Type created successfully');
      }
      
      setShowModal(false);
      setEditingHCFType(null);
      await loadHcfTypes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save HCF type';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      console.error('Error saving HCF type:', err);
    } finally {
      setLoading(false);
    }
  };

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  return (
    <div className="dashboard-page">
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

      <main className="dashboard-main">
        <PageHeader 
          title="HCF Type Master"
          subtitle="Manage HCF type master data"
        />

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
        {loading && !hcfTypes.length && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading HCF types...
          </div>
        )}

        <div className="hcf-type-master-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">HCF Type Master</h1>
              <p className="ra-page-subtitle">Manage HCF type information and details</p>
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
                placeholder="Search by HCF type code, name, company..."
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
              {canCreate && (
                <button className="ra-add-btn" onClick={handleAdd}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add HCF Type
                </button>
              )}
            </div>
          </div>

          {/* HCF Types Table */}
          <div className="hcf-type-master-table-container">
            <table className="hcf-type-master-table">
              <thead>
                <tr>
                  <th>COMPANY NAME</th>
                  <th>HCF TYPE CODE</th>
                  <th>HCF TYPE NAME</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredHCFTypes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-message">
                      {loading ? 'Loading...' : 'No HCF Type records found'}
                    </td>
                  </tr>
                ) : (
                  filteredHCFTypes.map((hcfType) => (
                    <tr key={hcfType.id}>
                      <td>{hcfType.companyName || '-'}</td>
                      <td>{hcfType.hcfTypeCode || '-'}</td>
                      <td>{hcfType.hcfTypeName || '-'}</td>
                      <td>
                        <div className="ra-cell-center">
                          <span className={`status-badge status-badge--${hcfType.status.toLowerCase()}`}>
                            {hcfType.status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons ra-actions">
                          <button
                            className="action-btn action-btn--view"
                            onClick={() => handleEdit(hcfType)}
                            title="View"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEdit(hcfType)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => handleDelete(hcfType.id)}
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
            Showing {filteredHCFTypes.length} of {hcfTypes.length} items
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
            setAdvancedFilters({ hcfTypeCode: '', hcfTypeName: '', companyName: '' });
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

      {/* HCF Type Add/Edit Modal */}
      {showModal && (
        <HCFTypeFormModal
          hcfType={editingHCFType}
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingHCFType(null);
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
              <div className="cm-filter-subtitle">Filter HCF types by multiple criteria</div>
            </div>
          </div>
          <button className="cm-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="cm-filter-modal-body">
          <div className="cm-filter-grid">
            <div className="cm-filter-field">
              <label>HCF Type Code</label>
              <input
                type="text"
                value={draft.hcfTypeCode}
                onChange={(e) => setDraft({ ...draft, hcfTypeCode: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter HCF type code"
              />
            </div>

            <div className="cm-filter-field">
              <label>HCF Type Name</label>
              <input
                type="text"
                value={draft.hcfTypeName}
                onChange={(e) => setDraft({ ...draft, hcfTypeName: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter HCF type name"
              />
            </div>

            <div className="cm-filter-field">
              <label>Company Name</label>
              <input
                type="text"
                value={draft.companyName}
                onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter company name"
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
              setDraft({ hcfTypeCode: '', hcfTypeName: '', companyName: '' });
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

// HCF Type Form Modal Component
interface HCFTypeFormModalProps {
  hcfType: HCFType | null;
  companies: Company[];
  onClose: () => void;
  onSave: (data: Partial<HCFType>) => void;
}

const HCFTypeFormModal = ({ hcfType, companies, onClose, onSave }: HCFTypeFormModalProps) => {
  const [formData, setFormData] = useState<Partial<HCFType>>(
    hcfType || {
      companyName: '',
      hcfTypeCode: '',
      hcfTypeName: '',
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
          <h2 className="modal-title">{hcfType ? 'Edit HCF Type' : 'Add HCF Type'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="hcf-type-form" onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name *</label>
                <select
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                  disabled={!!hcfType} // Disable when editing (immutable field)
                  style={hcfType ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.companyName}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>HCF Type Code *</label>
                <input
                  type="text"
                  value={formData.hcfTypeCode || ''}
                  onChange={(e) => setFormData({ ...formData, hcfTypeCode: e.target.value })}
                  required
                  placeholder="Enter HCF Type Code"
                  disabled={!!hcfType} // Disable when editing (immutable field)
                  style={hcfType ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group">
                <label>HCF Type Name *</label>
                <input
                  type="text"
                  value={formData.hcfTypeName || ''}
                  onChange={(e) => setFormData({ ...formData, hcfTypeName: e.target.value })}
                  required
                  placeholder="Enter HCF Type Name"
                  disabled={!!hcfType} // Disable when editing (immutable field)
                  style={hcfType ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
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
              {hcfType ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HCFTypeMasterPage;
