import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { canCreateMasterData } from '../../utils/permissions';
import { routeHcfService, RouteHcfMappingResponse } from '../../services/routeHcfService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { routeService, RouteResponse } from '../../services/routeService';
import { hcfService, HcfResponse } from '../../services/hcfService';
import './routeHCFMappingPage.css';
import '../desktop/dashboardPage.css';

interface RouteHCFMapping {
  id: string;
  routeId: string;
  routeCode: string;
  routeName: string;
  hcfId: string;
  hcfCode: string;
  hcfName: string;
  companyId: string;
  companyName: string;
  sequenceOrder?: number;
  status: 'Active' | 'Inactive';
  createdBy: string | null;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string;
}

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

interface Route {
  id: string;
  routeCode: string;
  routeName: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

interface HCF {
  id: string;
  hcfCode: string;
  hcfName: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

const RouteHCFMappingPage = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const canCreate = canCreateMasterData(user);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<RouteHCFMapping | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Master data - Load from respective masters
  const [companies, setCompanies] = useState<Company[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [hcfs, setHcfs] = useState<HCF[]>([]);
  const [mappings, setMappings] = useState<RouteHCFMapping[]>([]);

  // Load companies from API
  const loadCompanies = useCallback(async () => {
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
  }, []);

  // Load routes from API
  const loadRoutes = useCallback(async () => {
    try {
      const apiRoutes = await routeService.getAllRoutes(true);
      const mappedRoutes: Route[] = await Promise.all(
        apiRoutes.map(async (apiRoute: RouteResponse) => {
          const company = companies.find(c => c.id === apiRoute.companyId);
          return {
            id: apiRoute.id,
            routeCode: apiRoute.routeCode,
            routeName: apiRoute.routeName,
            companyName: company?.companyName || 'Unknown',
            status: apiRoute.status,
          };
        })
      );
      setRoutes(mappedRoutes);
    } catch (err) {
      console.error('Error loading routes:', err);
    }
  }, [companies]);

  // Load HCFs from API
  const loadHcfs = useCallback(async () => {
    try {
      const apiHcfs = await hcfService.getAllHcfs(undefined, true);
      const mappedHcfs: HCF[] = await Promise.all(
        apiHcfs.map(async (apiHcf: HcfResponse) => {
          const company = companies.find(c => c.id === apiHcf.companyId);
          return {
            id: apiHcf.id,
            hcfCode: apiHcf.hcfCode,
            hcfName: apiHcf.hcfName,
            companyName: company?.companyName || 'Unknown',
            status: apiHcf.status,
          };
        })
      );
      setHcfs(mappedHcfs);
    } catch (err) {
      console.error('Error loading HCFs:', err);
    }
  }, [companies]);

  // Load mappings from API
  const loadMappings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiMappings = await routeHcfService.getAllRouteHcfMappings(undefined, undefined, undefined, true);
      
      // Map backend response to frontend format
      const mappedMappings: RouteHCFMapping[] = apiMappings.map((apiMapping: RouteHcfMappingResponse) => {
        const route = routes.find(r => r.id === apiMapping.routeId);
        const hcf = hcfs.find(h => h.id === apiMapping.hcfId);
        const company = companies.find(c => c.id === apiMapping.companyId);
        
        return {
          id: apiMapping.id,
          routeId: apiMapping.routeId,
          routeCode: route?.routeCode || '',
          routeName: route?.routeName || '',
          hcfId: apiMapping.hcfId,
          hcfCode: hcf?.hcfCode || '',
          hcfName: hcf?.hcfName || '',
          companyId: apiMapping.companyId,
          companyName: company?.companyName || 'Unknown',
          sequenceOrder: apiMapping.sequenceOrder,
          status: apiMapping.status,
          createdBy: apiMapping.createdBy,
          createdOn: apiMapping.createdOn,
          modifiedBy: apiMapping.modifiedBy,
          modifiedOn: apiMapping.modifiedOn,
        };
      });
      setMappings(mappedMappings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load mappings';
      setError(errorMessage);
      console.error('Error loading mappings:', err);
    } finally {
      setLoading(false);
    }
  }, [routes, hcfs, companies]);

  // Load data on component mount
  useEffect(() => {
    const initializeData = async () => {
      await loadCompanies();
    };
    initializeData();
  }, [loadCompanies]);

  // Load routes and HCFs when companies are loaded
  useEffect(() => {
    if (companies.length > 0) {
      loadRoutes();
      loadHcfs();
    }
  }, [companies, loadRoutes, loadHcfs]);

  // Load mappings when routes, HCFs, and companies are loaded
  useEffect(() => {
    if (routes.length > 0 && hcfs.length > 0 && companies.length > 0) {
      loadMappings();
    }
  }, [routes, hcfs, companies, loadMappings]);

  const filteredMappings = mappings.filter(mapping =>
    mapping.routeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mapping.hcfCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mapping.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    routes.find(r => r.routeCode === mapping.routeCode)?.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hcfs.find(h => h.hcfCode === mapping.hcfCode)?.hcfName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingMapping(null);
    setShowModal(true);
  };

  const handleEdit = (mapping: RouteHCFMapping) => {
    setEditingMapping(mapping);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this Route-HCF mapping?')) {
      try {
        setLoading(true);
        setError(null);
        await routeHcfService.deleteRouteHcfMapping(id);
        setSuccessMessage('Mapping deleted successfully');
        await loadMappings();
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } catch (err) {
        let errorMessage = 'Failed to delete mapping';
        if (err instanceof Error) {
          errorMessage = err.message;
          if (errorMessage.includes('not found')) {
            errorMessage = 'This mapping could not be found. It may have already been deleted.';
          } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
            errorMessage = 'You do not have permission to delete this mapping.';
          }
        }
        setError(errorMessage);
        console.error('Error deleting mapping:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Helper function to format error messages
  const formatErrorMessage = (error: any, selectedRoute?: Route, selectedHcf?: HCF): string => {
    let errorMessage = 'Failed to save mapping';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check if it's a duplicate mapping error
      if (errorMessage.includes('already exists') || errorMessage.includes('mapping between')) {
        if (selectedRoute && selectedHcf) {
          errorMessage = `This mapping already exists: Route "${selectedRoute.routeCode} - ${selectedRoute.routeName}" and HCF "${selectedHcf.hcfCode} - ${selectedHcf.hcfName}" are already mapped together. Each route-HCF combination can only be mapped once.`;
        } else {
          errorMessage = 'This mapping already exists. Each route-HCF combination can only be mapped once.';
        }
      }
      
      // Handle other common error patterns
      else if (errorMessage.includes('not found')) {
        errorMessage = 'One or more selected items (Route, HCF, or Company) could not be found. Please refresh and try again.';
      } else if (errorMessage.includes('invalid')) {
        errorMessage = 'Invalid data provided. Please check your inputs and try again.';
      } else if (errorMessage.includes('required')) {
        errorMessage = 'Please fill in all required fields.';
      } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (errorMessage.includes('HTTP 409') || errorMessage.includes('Conflict')) {
        errorMessage = 'A conflict occurred. This mapping may already exist.';
      } else if (errorMessage.includes('HTTP 400') || errorMessage.includes('Bad Request')) {
        errorMessage = 'Invalid request. Please check your inputs and try again.';
      } else if (errorMessage.includes('HTTP 500') || errorMessage.includes('Internal Server Error')) {
        errorMessage = 'An internal server error occurred. Please try again later or contact support.';
      }
    }
    
    return errorMessage;
  };

  const handleSave = async (data: Partial<RouteHCFMapping>) => {
    try {
      setLoading(true);
      setError(null);

      // Find company ID from company name
      const selectedCompany = companies.find(c => c.companyName === data.companyName);
      if (!selectedCompany) {
        setError('Please select a valid company');
        return;
      }

      // Find route ID from route code
      const selectedRoute = routes.find(r => r.routeCode === data.routeCode && r.companyName === data.companyName);
      if (!selectedRoute) {
        setError('Please select a valid route');
        return;
      }

      // Find HCF ID from HCF code
      const selectedHcf = hcfs.find(h => h.hcfCode === data.hcfCode && h.companyName === data.companyName);
      if (!selectedHcf) {
        setError('Please select a valid HCF');
        return;
      }

      if (editingMapping) {
        // Update existing mapping
        await routeHcfService.updateRouteHcfMapping(editingMapping.id, {
          sequenceOrder: data.sequenceOrder,
          status: data.status,
        });
        setError(null);
        setSuccessMessage('Mapping updated successfully');
        setShowModal(false);
        setEditingMapping(null);
        await loadMappings();
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        // Create new mapping
        await routeHcfService.createRouteHcfMapping({
          routeId: selectedRoute.id,
          hcfId: selectedHcf.id,
          companyId: selectedCompany.id,
          sequenceOrder: data.sequenceOrder,
        });
        setError(null);
        setSuccessMessage('Mapping created successfully');
        setShowModal(false);
        setEditingMapping(null);
        await loadMappings();
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }
    } catch (err) {
      const selectedRoute = routes.find(r => r.routeCode === data.routeCode && r.companyName === data.companyName);
      const selectedHcf = hcfs.find(h => h.hcfCode === data.hcfCode && h.companyName === data.companyName);
      const errorMessage = formatErrorMessage(err, selectedRoute, selectedHcf);
      setError(errorMessage);
      console.error('Error saving mapping:', err);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', active: location.pathname === '/dashboard' },
    { path: '/transaction', label: 'Transaction', icon: '💼', active: location.pathname === '/transaction' },
    { path: '/finance', label: 'Finance', icon: '💰', active: location.pathname === '/finance' },
    { path: '/commercial-agreements', label: 'Commercial Agreements', icon: '📝', active: location.pathname === '/commercial-agreements' },
    { path: '/compliance-training', label: 'Compliance & Training', icon: '✅', active: location.pathname === '/compliance-training' },
    { path: '/master', label: 'Masters', icon: '📋', active: location.pathname.startsWith('/master') },
    { path: '/report/billing-finance', label: 'Reports', icon: '📈', active: location.pathname.startsWith('/report') },
  ];

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
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Masters / Route-HCF Mapping</span>
          </div>
        </header>

        {/* Success Message */}
        {successMessage && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#d4edda', 
            color: '#155724', 
            marginBottom: '16px', 
            borderRadius: '6px',
            border: '1px solid #c3e6cb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#155724',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 8px',
                lineHeight: '1'
              }}
              aria-label="Close success message"
            >
              ×
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#fee', 
            color: '#c33', 
            marginBottom: '16px', 
            borderRadius: '6px',
            border: '1px solid #fcc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
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
                padding: '0 8px',
                lineHeight: '1'
              }}
              aria-label="Close error message"
            >
              ×
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !mappings.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading mappings...
          </div>
        )}

        <div className="route-hcf-mapping-page">
          <div className="route-hcf-mapping-header">
            <h1 className="route-hcf-mapping-title">Route-HCF Mapping</h1>
          </div>

          <div className="route-hcf-mapping-actions">
            <div className="route-hcf-mapping-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="route-hcf-mapping-search-input"
                placeholder="Search Mapping..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {canCreate && (
              <button className="add-mapping-btn" onClick={handleAdd}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Mapping
              </button>
            )}
          </div>

          <div className="route-hcf-mapping-table-container">
            <table className="route-hcf-mapping-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Route Code</th>
                  <th>HCF Code</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMappings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-message">
                      No mapping records found
                    </td>
                  </tr>
                ) : (
                  filteredMappings.map((mapping) => {
                    return (
                      <tr key={mapping.id}>
                        <td>{mapping.companyName || '-'}</td>
                        <td>{mapping.routeCode ? `${mapping.routeCode} - ${mapping.routeName}` : '-'}</td>
                        <td>{mapping.hcfCode ? `${mapping.hcfCode} - ${mapping.hcfName}` : '-'}</td>
                        <td>
                          <span className={`status-badge status-badge--${mapping.status.toLowerCase()}`}>
                            {mapping.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEdit(mapping)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => handleDelete(mapping.id)}
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="route-hcf-mapping-pagination-info">
            Showing {filteredMappings.length} of {mappings.length} Items
          </div>
        </div>
      </main>

      {/* Mapping Add/Edit Modal */}
      {showModal && (
        <MappingFormModal
          mapping={editingMapping}
          companies={companies.filter(c => c.status === 'Active')}
          routes={routes.filter(r => r.status === 'Active')}
          hcfs={hcfs.filter(h => h.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingMapping(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Mapping Form Modal Component
interface MappingFormModalProps {
  mapping: RouteHCFMapping | null;
  companies: Company[];
  routes: Route[];
  hcfs: HCF[];
  onClose: () => void;
  onSave: (data: Partial<RouteHCFMapping>) => void;
}

const MappingFormModal = ({ mapping, companies, routes, hcfs, onClose, onSave }: MappingFormModalProps) => {
  const [formData, setFormData] = useState<Partial<RouteHCFMapping>>(
    mapping || {
      companyName: '',
      routeCode: '',
      hcfCode: '',
      status: 'Active',
    }
  );

  // Filter routes and HCFs based on selected company
  const filteredRoutes = formData.companyName
    ? routes.filter(route => route.companyName === formData.companyName)
    : routes;

  const filteredHCFs = formData.companyName
    ? hcfs.filter(hcf => hcf.companyName === formData.companyName)
    : hcfs;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{mapping ? 'Edit Mapping' : 'Add Mapping'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="mapping-form" onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="form-section-title">Mapping Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name *</label>
                <select
                  value={formData.companyName || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, companyName: e.target.value, routeCode: '', hcfCode: '' });
                  }}
                  required
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
                <select
                  value={formData.routeCode || ''}
                  onChange={(e) => setFormData({ ...formData, routeCode: e.target.value })}
                  required
                  disabled={!formData.companyName}
                >
                  <option value="">Select Route</option>
                  {filteredRoutes.map((route) => (
                    <option key={route.id} value={route.routeCode}>
                      {route.routeCode} - {route.routeName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>HCF Code *</label>
                <select
                  value={formData.hcfCode || ''}
                  onChange={(e) => setFormData({ ...formData, hcfCode: e.target.value })}
                  required
                  disabled={!formData.companyName}
                >
                  <option value="">Select HCF</option>
                  {filteredHCFs.map((hcf) => (
                    <option key={hcf.id} value={hcf.hcfCode}>
                      {hcf.hcfCode} - {hcf.hcfName}
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
              {mapping ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RouteHCFMappingPage;
