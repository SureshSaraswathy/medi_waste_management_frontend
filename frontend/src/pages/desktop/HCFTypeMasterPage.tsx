import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingHCFType, setEditingHCFType] = useState<HCFType | null>(null);

  // Master data - Load from Company Master
  const [companies] = useState<Company[]>([
    { id: '1', companyCode: 'COMP001', companyName: 'Sample Company', status: 'Active' },
    { id: '2', companyCode: 'COMP002', companyName: 'ABC Industries', status: 'Active' },
    { id: '3', companyCode: 'COMP003', companyName: 'XYZ Corporation', status: 'Active' },
  ]);

  const [hcfTypes, setHcfTypes] = useState<HCFType[]>([
    {
      id: '1',
      companyName: 'Sample Company',
      hcfTypeCode: 'TYPE001',
      hcfTypeName: 'Hospital',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
    {
      id: '2',
      companyName: 'ABC Industries',
      hcfTypeCode: 'TYPE002',
      hcfTypeName: 'Clinic',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-02',
      modifiedBy: 'System',
      modifiedOn: '2023-01-02',
    },
    {
      id: '3',
      companyName: 'XYZ Corporation',
      hcfTypeCode: 'TYPE003',
      hcfTypeName: 'Medical Center',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-03',
      modifiedBy: 'System',
      modifiedOn: '2023-01-03',
    },
  ]);

  const filteredHCFTypes = hcfTypes.filter(hcfType =>
    hcfType.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hcfType.hcfTypeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hcfType.hcfTypeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingHCFType(null);
    setShowModal(true);
  };

  const handleEdit = (hcfType: HCFType) => {
    setEditingHCFType(hcfType);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this HCF Type?')) {
      setHcfTypes(hcfTypes.filter(hcfType => hcfType.id !== id));
    }
  };

  const handleSave = (data: Partial<HCFType>) => {
    if (editingHCFType) {
      setHcfTypes(hcfTypes.map(hcfType => hcfType.id === editingHCFType.id ? { ...hcfType, ...data } : hcfType));
    } else {
      const newHCFType: HCFType = {
        ...data as HCFType,
        id: Date.now().toString(),
        createdBy: 'System',
        createdOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'System',
        modifiedOn: new Date().toISOString().split('T')[0],
      };
      setHcfTypes([...hcfTypes, newHCFType]);
    }
    setShowModal(false);
    setEditingHCFType(null);
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
            <span className="breadcrumb">/ Masters / HCF Type Master</span>
          </div>
        </header>

        <div className="hcf-type-master-page">
          <div className="hcf-type-master-header">
            <h1 className="hcf-type-master-title">HCF Type Master</h1>
          </div>

          <div className="hcf-type-master-actions">
            <div className="hcf-type-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="hcf-type-search-input"
                placeholder="Search HCF Type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="add-hcf-type-btn" onClick={handleAdd}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add HCF Type
            </button>
          </div>

          <div className="hcf-type-table-container">
            <table className="hcf-type-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>HCF Type Code</th>
                  <th>HCF Type Name</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHCFTypes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-message">
                      No HCF Type records found
                    </td>
                  </tr>
                ) : (
                  filteredHCFTypes.map((hcfType) => (
                    <tr key={hcfType.id}>
                      <td>{hcfType.companyName || '-'}</td>
                      <td>{hcfType.hcfTypeCode || '-'}</td>
                      <td>{hcfType.hcfTypeName || '-'}</td>
                      <td>
                        <span className={`status-badge status-badge--${hcfType.status.toLowerCase()}`}>
                          {hcfType.status}
                        </span>
                      </td>
                      <td>
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="hcf-type-pagination-info">
            Showing {filteredHCFTypes.length} of {hcfTypes.length} Items
          </div>
        </div>
      </main>

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
