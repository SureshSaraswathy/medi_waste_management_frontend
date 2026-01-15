import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './routeHCFMappingPage.css';
import '../desktop/dashboardPage.css';

interface RouteHCFMapping {
  id: string;
  routeCode: string;
  hcfCode: string;
  companyName: string;
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
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMapping, setEditingMapping] = useState<RouteHCFMapping | null>(null);

  // Master data - Load from respective masters
  const [companies] = useState<Company[]>([
    { id: '1', companyCode: 'COMP001', companyName: 'Sample Company', status: 'Active' },
    { id: '2', companyCode: 'COMP002', companyName: 'ABC Industries', status: 'Active' },
    { id: '3', companyCode: 'COMP003', companyName: 'XYZ Corporation', status: 'Active' },
  ]);

  const [routes] = useState<Route[]>([
    { id: '1', routeCode: 'RT001', routeName: 'North Zone Route', companyName: 'Sample Company', status: 'Active' },
    { id: '2', routeCode: 'RT002', routeName: 'South Zone Route', companyName: 'ABC Industries', status: 'Active' },
    { id: '3', routeCode: 'RT003', routeName: 'East Zone Route', companyName: 'XYZ Corporation', status: 'Active' },
  ]);

  const [hcfs] = useState<HCF[]>([
    { id: '1', hcfCode: 'HCF001', hcfName: 'City Hospital', companyName: 'Sample Company', status: 'Active' },
    { id: '2', hcfCode: 'HCF002', hcfName: 'General Hospital', companyName: 'ABC Industries', status: 'Active' },
    { id: '3', hcfCode: 'HCF003', hcfName: 'Medical Center', companyName: 'XYZ Corporation', status: 'Active' },
  ]);

  const [mappings, setMappings] = useState<RouteHCFMapping[]>([
    {
      id: '1',
      routeCode: 'RT001',
      hcfCode: 'HCF001',
      companyName: 'Sample Company',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
    {
      id: '2',
      routeCode: 'RT002',
      hcfCode: 'HCF002',
      companyName: 'ABC Industries',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-02',
      modifiedBy: 'System',
      modifiedOn: '2023-01-02',
    },
  ]);

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

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this Route-HCF mapping?')) {
      setMappings(mappings.filter(mapping => mapping.id !== id));
    }
  };

  const handleSave = (data: Partial<RouteHCFMapping>) => {
    if (editingMapping) {
      setMappings(mappings.map(mapping => mapping.id === editingMapping.id ? { ...mapping, ...data } : mapping));
    } else {
      const newMapping: RouteHCFMapping = {
        ...data as RouteHCFMapping,
        id: Date.now().toString(),
        createdBy: 'System',
        createdOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'System',
        modifiedOn: new Date().toISOString().split('T')[0],
      };
      setMappings([...mappings, newMapping]);
    }
    setShowModal(false);
    setEditingMapping(null);
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
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2 className="sidebar-logo">Waste Management</h2>
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

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Masters / Route-HCF Mapping</span>
          </div>
        </header>

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
            <button className="add-mapping-btn" onClick={handleAdd}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Mapping
            </button>
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
                    const route = routes.find(r => r.routeCode === mapping.routeCode);
                    const hcf = hcfs.find(h => h.hcfCode === mapping.hcfCode);
                    return (
                      <tr key={mapping.id}>
                        <td>{mapping.companyName || '-'}</td>
                        <td>{route ? `${mapping.routeCode} - ${route.routeName}` : mapping.routeCode}</td>
                        <td>{hcf ? `${mapping.hcfCode} - ${hcf.hcfName}` : mapping.hcfCode}</td>
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
