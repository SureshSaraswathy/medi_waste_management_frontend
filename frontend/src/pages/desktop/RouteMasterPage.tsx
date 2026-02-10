import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { routeService, RouteResponse } from '../../services/routeService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { frequencyService, FrequencyResponse } from '../../services/frequencyService';
import '../desktop/dashboardPage.css';
import './routeMasterPage.css';

interface Route {
  id: string;
  companyName: string;
  routeCode: string;
  routeName: string;
  frequencyID: string;
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

interface Frequency {
  id: string;
  frequencyCode: string;
  frequencyName: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

const RouteMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  interface AdvancedFilters {
    routeCode: string;
    routeName: string;
    companyName: string;
  }
  
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    routeCode: '',
    routeName: '',
    companyName: '',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [frequencies, setFrequencies] = useState<Frequency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load companies from API
  const loadCompanies = async () => {
    try {
      const apiCompanies = await companyService.getAllCompanies(true); // Get only active companies
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

  // Load frequencies from API
  const loadFrequencies = async () => {
    try {
      const apiFrequencies = await frequencyService.getAllFrequencies(undefined, true); // Get only active frequencies
      const mappedFrequencies: Frequency[] = apiFrequencies.map((apiFrequency: FrequencyResponse) => ({
        id: apiFrequency.id,
        frequencyCode: apiFrequency.frequencyCode,
        frequencyName: apiFrequency.frequencyName,
        companyName: apiFrequency.companyName || '',
        status: apiFrequency.status,
      }));
      setFrequencies(mappedFrequencies);
    } catch (err) {
      console.error('Error loading frequencies:', err);
    }
  };

  // Load routes from API
  const loadRoutes = async () => {
    setLoading(true);
    setError(null);
    try {
      // Ensure companies and frequencies are loaded
      let currentCompanies = companies;
      if (currentCompanies.length === 0) {
        const apiCompanies = await companyService.getAllCompanies(true);
        currentCompanies = apiCompanies.map((apiCompany: CompanyResponse) => ({
          id: apiCompany.id,
          companyCode: apiCompany.companyCode,
          companyName: apiCompany.companyName,
          status: apiCompany.status,
        }));
        setCompanies(currentCompanies);
      }

      let currentFrequencies = frequencies;
      if (currentFrequencies.length === 0) {
        const apiFrequencies = await frequencyService.getAllFrequencies(undefined, true);
        currentFrequencies = apiFrequencies.map((apiFrequency: FrequencyResponse) => ({
          id: apiFrequency.id,
          frequencyCode: apiFrequency.frequencyCode,
          frequencyName: apiFrequency.frequencyName,
          companyName: apiFrequency.companyName || '',
          status: apiFrequency.status,
        }));
        setFrequencies(currentFrequencies);
      }

      const apiRoutes = await routeService.getAllRoutes(true); // Get only active routes
      const mappedRoutes: Route[] = apiRoutes.map((apiRoute: RouteResponse) => {
        // Find company name
        const company = currentCompanies.find(c => c.id === apiRoute.companyId);
        const companyName = company?.companyName || 'Unknown';

        // Find frequency code
        const frequency = currentFrequencies.find(f => f.id === apiRoute.frequencyId);
        const frequencyCode = frequency?.frequencyCode || apiRoute.frequencyId || '';

        return {
          id: apiRoute.id,
          companyName: companyName,
          routeCode: apiRoute.routeCode,
          routeName: apiRoute.routeName,
          frequencyID: frequencyCode,
          status: apiRoute.status,
          createdBy: apiRoute.createdBy || '',
          createdOn: apiRoute.createdOn,
          modifiedBy: apiRoute.modifiedBy || '',
          modifiedOn: apiRoute.modifiedOn,
        };
      });
      setRoutes(mappedRoutes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load routes';
      setError(errorMessage);
      console.error('Error loading routes:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const initializeData = async () => {
      await loadCompanies();
      await loadFrequencies();
      await loadRoutes();
    };
    initializeData();
  }, []);

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  const filteredRoutes = routes.filter(route =>
    route.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.routeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.frequencyID.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingRoute(null);
    setShowModal(true);
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      try {
        setLoading(true);
        await routeService.deleteRoute(id);
        await loadRoutes();
        alert('Route deleted successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete route';
        alert(`Error: ${errorMessage}`);
        console.error('Error deleting route:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (formData: Partial<Route>) => {
    try {
      setLoading(true);
      setError(null);
      
      // Find company ID from company name
      const selectedCompany = companies.find(c => c.companyName === formData.companyName);
      if (!selectedCompany) {
        alert('Please select a valid company');
        return;
      }

      // Find frequency ID from frequency code
      const selectedFrequency = frequencies.find(f => f.frequencyCode === formData.frequencyID);

      if (editingRoute) {
        // Update existing - only frequencyId and status can be updated (routeCode, routeName, companyId are immutable)
        await routeService.updateRoute(editingRoute.id, {
          frequencyId: selectedFrequency?.id,
          status: formData.status,
        });
        alert('Route updated successfully');
      } else {
        // Add new
        if (!formData.routeCode || !formData.routeName || !formData.companyName) {
          alert('Please fill in all required fields');
          return;
        }
        await routeService.createRoute({
          routeCode: formData.routeCode,
          routeName: formData.routeName,
          companyId: selectedCompany.id,
          frequencyId: selectedFrequency?.id,
        });
        alert('Route created successfully');
      }
      
      setShowModal(false);
      setEditingRoute(null);
      await loadRoutes();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save route';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      console.error('Error saving route:', err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="dashboard-page">
      {/* Left Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <span className="brand-name">MEDI-WASTE</span>
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
                  <span className="nav-label">{item.label}</span>
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
            <span>Profile</span>
          </Link>
          <button onClick={logout} className="sidebar-logout-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">Home &nbsp;&gt;&nbsp; Route Master</span>
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
        {loading && !routes.length && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading routes...
          </div>
        )}

        <div className="route-master-page">
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
              <h1 className="ra-page-title">Route Master</h1>
              <p className="ra-page-subtitle">Manage route information and details</p>
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
                placeholder="Search by route code, name, company..."
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
                Add Route
              </button>
            </div>
          </div>

          {/* Routes Table */}
          <div className="route-master-table-container">
            <table className="route-master-table">
              <thead>
                <tr>
                  <th>COMPANY NAME</th>
                  <th>ROUTE CODE</th>
                  <th>ROUTE NAME</th>
                  <th>FREQUENCY ID</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-message">
                      {loading ? 'Loading...' : 'No routes found'}
                    </td>
                  </tr>
                ) : (
                  filteredRoutes.map((route) => (
                    <tr key={route.id}>
                      <td>{route.companyName || '-'}</td>
                      <td>{route.routeCode || '-'}</td>
                      <td>{route.routeName || '-'}</td>
                      <td>{route.frequencyID || '-'}</td>
                      <td>
                        <div className="ra-cell-center">
                          <span className={`status-badge status-badge--${route.status.toLowerCase()}`}>
                            {route.status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons ra-actions">
                          <button
                            className="action-btn action-btn--view"
                            onClick={() => handleEdit(route)}
                            title="View"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEdit(route)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => handleDelete(route.id)}
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
            Showing {filteredRoutes.length} of {routes.length} items
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
            setAdvancedFilters({ routeCode: '', routeName: '', companyName: '' });
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
        <RouteFormModal
          route={editingRoute}
          companies={companies.filter(c => c.status === 'Active')}
          frequencies={frequencies.filter(f => f.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingRoute(null);
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
              <div className="cm-filter-subtitle">Filter routes by multiple criteria</div>
            </div>
          </div>
          <button className="cm-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="cm-filter-modal-body">
          <div className="cm-filter-grid">
            <div className="cm-filter-field">
              <label>Route Code</label>
              <input
                type="text"
                value={draft.routeCode}
                onChange={(e) => setDraft({ ...draft, routeCode: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter route code"
              />
            </div>

            <div className="cm-filter-field">
              <label>Route Name</label>
              <input
                type="text"
                value={draft.routeName}
                onChange={(e) => setDraft({ ...draft, routeName: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter route name"
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
              setDraft({ routeCode: '', routeName: '', companyName: '' });
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

// Route Form Modal Component
interface RouteFormModalProps {
  route: Route | null;
  companies: Company[];
  frequencies: Frequency[];
  onClose: () => void;
  onSave: (data: Partial<Route>) => void;
}

const RouteFormModal = ({ route, companies, frequencies, onClose, onSave }: RouteFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Route>>(
    route || {
      companyName: '',
      routeCode: '',
      routeName: '',
      frequencyID: '',
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
          <h2 className="modal-title">{route ? 'Edit Route' : 'Add Route'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="route-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name *</label>
                <select
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                  disabled={!!route} // Disable when editing (immutable field)
                  style={route ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
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
                <label>Route Code *</label>
                <input
                  type="text"
                  value={formData.routeCode || ''}
                  onChange={(e) => setFormData({ ...formData, routeCode: e.target.value })}
                  required
                  placeholder="Enter Route Code"
                  disabled={!!route} // Disable when editing (immutable field)
                  style={route ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group">
                <label>Route Name *</label>
                <input
                  type="text"
                  value={formData.routeName || ''}
                  onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                  required
                  placeholder="Enter Route Name"
                  disabled={!!route} // Disable when editing (immutable field)
                  style={route ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="form-group">
                <label>Frequency</label>
                <select
                  value={formData.frequencyID || ''}
                  onChange={(e) => setFormData({ ...formData, frequencyID: e.target.value })}
                >
                  <option value="">Select Frequency</option>
                  {frequencies.map((frequency) => (
                    <option key={frequency.id} value={frequency.frequencyCode}>
                      {frequency.frequencyName} ({frequency.frequencyCode})
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

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              {route ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RouteMasterPage;
