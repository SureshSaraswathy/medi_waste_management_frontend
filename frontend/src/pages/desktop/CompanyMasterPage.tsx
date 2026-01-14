import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './companyMasterPage.css';
import '../desktop/dashboardPage.css';

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  regdOfficeAddress: string;
  adminOfficeAddress: string;
  factoryAddress: string;
  gstin: string;
  state: string;
  pincode: string;
  prefix: string;
  authPersonName: string;
  authPersonDesignation: string;
  authPersonDOB: string;
  pcbauthNum: string;
  ctoWaterNum: string;
  ctoWaterDate: string;
  ctoWaterValidUpto: string;
  ctoAirNum: string;
  ctoAirDate: string;
  ctoAirValidUpto: string;
  cteWaterNum: string;
  cteWaterDate: string;
  cteWaterValidUpto: string;
  cteAirNum: string;
  cteAirDate: string;
  cteAirValidUpto: string;
  hazardousWasteNum: string;
  pcbZoneID: string;
  gstValidFrom: string;
  gstRate: string;
  status: 'Active' | 'Inactive';
  createdBy: string;
  createdOn: string;
  modifiedBy: string;
  modifiedOn: string;
}

const CompanyMasterPage = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([
    {
      id: '1',
      companyCode: 'COMP001',
      companyName: 'Sample Company',
      regdOfficeAddress: '123 Main St',
      adminOfficeAddress: '456 Admin Ave',
      factoryAddress: '789 Factory Rd',
      gstin: 'GST123456789',
      state: 'Maharashtra',
      pincode: '400001',
      prefix: 'SC',
      authPersonName: 'John Doe',
      authPersonDesignation: 'Manager',
      authPersonDOB: '1990-01-01',
      pcbauthNum: 'PCB001',
      ctoWaterNum: 'CTOW001',
      ctoWaterDate: '2023-01-01',
      ctoWaterValidUpto: '2024-01-01',
      ctoAirNum: 'CTOA001',
      ctoAirDate: '2023-01-01',
      ctoAirValidUpto: '2024-01-01',
      cteWaterNum: 'CTEW001',
      cteWaterDate: '2023-01-01',
      cteWaterValidUpto: '2024-01-01',
      cteAirNum: 'CTEA001',
      cteAirDate: '2023-01-01',
      cteAirValidUpto: '2024-01-01',
      hazardousWasteNum: 'HW001',
      pcbZoneID: 'ZONE001',
      gstValidFrom: '2023-01-01',
      gstRate: '18%',
      status: 'Active',
      createdBy: 'Admin',
      createdOn: '2023-01-01',
      modifiedBy: 'Admin',
      modifiedOn: '2023-01-01',
    },
  ]);

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

  const filteredCompanies = companies.filter(company =>
    company.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.companyCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    company.gstin.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingCompany(null);
    setShowModal(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      setCompanies(companies.filter(c => c.id !== id));
    }
  };

  const handleSave = (formData: Partial<Company>) => {
    if (editingCompany) {
      // Update existing
      setCompanies(companies.map(c => 
        c.id === editingCompany.id 
          ? { ...c, ...formData, modifiedOn: new Date().toISOString().split('T')[0] }
          : c
      ));
    } else {
      // Add new
      const newCompany: Company = {
        id: Date.now().toString(),
        ...formData as Company,
        status: 'Active',
        createdBy: 'Current User',
        createdOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'Current User',
        modifiedOn: new Date().toISOString().split('T')[0],
      };
      setCompanies([...companies, newCompany]);
    }
    setShowModal(false);
    setEditingCompany(null);
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
            <span className="breadcrumb">/ Masters / Company Master</span>
          </div>
        </header>

        {/* Company Master Content */}
        <div className="company-master-page">
          <div className="company-master-header">
            <h1 className="company-master-title">Company Master</h1>
          </div>

          {/* Tabs */}
          <div className="company-master-tabs">
            <button
              className={`tab-button ${activeTab === 'list' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('list')}
            >
              Company List
            </button>
          </div>

          {/* Search and Add Button */}
          <div className="company-master-actions">
            <div className="company-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="company-search-input"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="add-company-btn" onClick={handleAdd}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Company
            </button>
          </div>

          {/* Table */}
          <div className="company-table-container">
            <table className="company-table">
              <thead>
                <tr>
                  <th>Company Code</th>
                  <th>Company Name</th>
                  <th>GSTIN</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((company) => (
                  <tr key={company.id}>
                    <td>{company.companyCode}</td>
                    <td>{company.companyName}</td>
                    <td>{company.gstin}</td>
                    <td>{company.state}</td>
                    <td>
                      <span className={`status-badge status-badge--${company.status.toLowerCase()}`}>
                        {company.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="action-btn action-btn--edit"
                        onClick={() => handleEdit(company)}
                        title="Edit"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        className="action-btn action-btn--delete"
                        onClick={() => handleDelete(company.id)}
                        title="Delete"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Info */}
          <div className="company-pagination-info">
            Showing {filteredCompanies.length} of {companies.length} Items
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showModal && (
        <CompanyFormModal
          company={editingCompany}
          onClose={() => {
            setShowModal(false);
            setEditingCompany(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Company Form Modal Component
interface CompanyFormModalProps {
  company: Company | null;
  onClose: () => void;
  onSave: (data: Partial<Company>) => void;
}

const CompanyFormModal = ({ company, onClose, onSave }: CompanyFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Company>>(
    company || {
      companyCode: '',
      companyName: '',
      regdOfficeAddress: '',
      adminOfficeAddress: '',
      factoryAddress: '',
      gstin: '',
      state: '',
      pincode: '',
      prefix: '',
      authPersonName: '',
      authPersonDesignation: '',
      authPersonDOB: '',
      pcbauthNum: '',
      ctoWaterNum: '',
      ctoWaterDate: '',
      ctoWaterValidUpto: '',
      ctoAirNum: '',
      ctoAirDate: '',
      ctoAirValidUpto: '',
      cteWaterNum: '',
      cteWaterDate: '',
      cteWaterValidUpto: '',
      cteAirNum: '',
      cteAirDate: '',
      cteAirValidUpto: '',
      hazardousWasteNum: '',
      pcbZoneID: '',
      gstValidFrom: '',
      gstRate: '',
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
          <h2 className="modal-title">{company ? 'Edit Company' : 'Add Company'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="company-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Code *</label>
                <input
                  type="text"
                  value={formData.companyCode || ''}
                  onChange={(e) => setFormData({ ...formData, companyCode: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>GSTIN *</label>
                <input
                  type="text"
                  value={formData.gstin || ''}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>State *</label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Pincode</label>
                <input
                  type="text"
                  value={formData.pincode || ''}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Prefix</label>
                <input
                  type="text"
                  value={formData.prefix || ''}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Addresses</h3>
            <div className="form-grid">
              <div className="form-group form-group--full">
                <label>Registered Office Address</label>
                <textarea
                  value={formData.regdOfficeAddress || ''}
                  onChange={(e) => setFormData({ ...formData, regdOfficeAddress: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group form-group--full">
                <label>Admin Office Address</label>
                <textarea
                  value={formData.adminOfficeAddress || ''}
                  onChange={(e) => setFormData({ ...formData, adminOfficeAddress: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group form-group--full">
                <label>Factory Address</label>
                <textarea
                  value={formData.factoryAddress || ''}
                  onChange={(e) => setFormData({ ...formData, factoryAddress: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Authorized Person</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.authPersonName || ''}
                  onChange={(e) => setFormData({ ...formData, authPersonName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Designation</label>
                <input
                  type="text"
                  value={formData.authPersonDesignation || ''}
                  onChange={(e) => setFormData({ ...formData, authPersonDesignation: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={formData.authPersonDOB || ''}
                  onChange={(e) => setFormData({ ...formData, authPersonDOB: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Status</h3>
            <div className="form-grid">
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
              {company ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyMasterPage;
