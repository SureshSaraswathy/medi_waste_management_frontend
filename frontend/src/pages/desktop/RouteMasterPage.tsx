import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { routeService, RouteResponse } from '../../services/routeService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { frequencyService, FrequencyResponse } from '../../services/frequencyService';
import MasterPageLayout from '../../components/common/MasterPageLayout';
import Tabs from '../../components/common/Tabs';
import { Column } from '../../components/common/DataTable';
import '../desktop/dashboardPage.css';

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
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [showModal, setShowModal] = useState(false);
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

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ), 
      active: location.pathname === '/dashboard' 
    },
    { 
      path: '/transaction', 
      label: 'Transaction', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      ), 
      active: location.pathname === '/transaction' || location.pathname.startsWith('/transaction')
    },
    { 
      path: '/finance', 
      label: 'Finance', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ), 
      active: location.pathname === '/finance' || location.pathname.startsWith('/finance')
    },
    { 
      path: '/commercial-agreements', 
      label: 'Commercial / Agreements', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ), 
      active: location.pathname === '/commercial-agreements' || location.pathname.startsWith('/commercial-agreements')
    },
    { 
      path: '/compliance-training', 
      label: 'Compliance & Training', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M9 15l2 2 4-4"></path>
        </svg>
      ), 
      active: location.pathname === '/compliance-training' || location.pathname.startsWith('/compliance-training')
    },
    { 
      path: '/master', 
      label: 'Master', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
        </svg>
      ), 
      active: location.pathname === '/master' || location.pathname.startsWith('/master') 
    },
    { 
      path: '/report', 
      label: 'Report', 
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ), 
      active: location.pathname === '/report' 
    },
  ];

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

  // Define columns for the table
  const columns: Column<Route>[] = [
    { key: 'companyName', label: 'Company Name', minWidth: 180, allowWrap: true },
    { key: 'routeCode', label: 'Route Code', minWidth: 120 },
    { key: 'routeName', label: 'Route Name', minWidth: 200, allowWrap: true },
    { key: 'frequencyID', label: 'Frequency ID', minWidth: 130 },
    {
      key: 'status',
      label: 'Status',
      minWidth: 100,
      render: (route) => (
        <span className={`status-badge status-badge--${route.status.toLowerCase()}`}>
          {route.status}
        </span>
      ),
    },
  ];

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
            <span className="breadcrumb">/ Masters / Route Master</span>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '12px 16px', 
            background: '#fee', 
            color: '#c33', 
            marginBottom: '16px', 
            borderRadius: '6px',
            border: '1px solid #fcc'
          }}>
            {error}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !routes.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading routes...
          </div>
        )}

        {/* Route Master Content using reusable template */}
        <MasterPageLayout
          title="Route Master"
          breadcrumb="/ Masters / Route Master"
          data={routes}
          filteredData={filteredRoutes}
          columns={columns}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          getId={(route) => route.id}
          addButtonLabel="Add Route"
        >
          {/* Tabs */}
          <Tabs
            tabs={[{ id: 'list', label: 'Route List' }]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as 'list' | 'form')}
          />
        </MasterPageLayout>
      </main>

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
