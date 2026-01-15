import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './hcfAmendmentsPage.css';
import '../desktop/dashboardPage.css';

interface HCFAmendment {
  id: string;
  companyName: string;
  hcfID: string;
  date: string;
  serviceRenewFrom: string;
  validUpto: string;
  billingOption: string;
  billingType: string;
  bedRate: string;
  bedCount: string;
  kgRate: string;
  lumpsum: string;
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

interface HCF {
  id: string;
  hcfCode: string;
  hcfName: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

const HCFAmendmentsPage = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAmendment, setEditingAmendment] = useState<HCFAmendment | null>(null);

  // Master data - Load from respective masters
  const [companies] = useState<Company[]>([
    { id: '1', companyCode: 'COMP001', companyName: 'Sample Company', status: 'Active' },
    { id: '2', companyCode: 'COMP002', companyName: 'ABC Industries', status: 'Active' },
    { id: '3', companyCode: 'COMP003', companyName: 'XYZ Corporation', status: 'Active' },
  ]);

  const [hcfs] = useState<HCF[]>([
    { id: '1', hcfCode: 'HCF001', hcfName: 'City Hospital', companyName: 'Sample Company', status: 'Active' },
    { id: '2', hcfCode: 'HCF002', hcfName: 'General Hospital', companyName: 'ABC Industries', status: 'Active' },
    { id: '3', hcfCode: 'HCF003', hcfName: 'Medical Center', companyName: 'XYZ Corporation', status: 'Active' },
  ]);

  const [amendments, setAmendments] = useState<HCFAmendment[]>([
    {
      id: '1',
      companyName: 'Sample Company',
      hcfID: 'HCF001',
      date: '2024-01-15',
      serviceRenewFrom: '2024-01-01',
      validUpto: '2024-12-31',
      billingOption: 'Per Bed',
      billingType: 'Monthly',
      bedRate: '500',
      bedCount: '100',
      kgRate: '50',
      lumpsum: '100000',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2024-01-15',
      modifiedBy: 'System',
      modifiedOn: '2024-01-15',
    },
  ]);

  const filteredAmendments = amendments.filter(amendment =>
    amendment.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    amendment.hcfID.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hcfs.find(hcf => hcf.hcfCode === amendment.hcfID)?.hcfName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingAmendment(null);
    setShowModal(true);
  };

  const handleEdit = (amendment: HCFAmendment) => {
    setEditingAmendment(amendment);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this amendment?')) {
      setAmendments(amendments.filter(amendment => amendment.id !== id));
    }
  };

  const handleSave = (data: Partial<HCFAmendment>) => {
    if (editingAmendment) {
      setAmendments(amendments.map(amendment => amendment.id === editingAmendment.id ? { ...amendment, ...data } : amendment));
    } else {
      const newAmendment: HCFAmendment = {
        ...data as HCFAmendment,
        id: Date.now().toString(),
        createdBy: 'System',
        createdOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'System',
        modifiedOn: new Date().toISOString().split('T')[0],
      };
      setAmendments([...amendments, newAmendment]);
    }
    setShowModal(false);
    setEditingAmendment(null);
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
            <span className="breadcrumb">/ Masters / HCF Amendments</span>
          </div>
        </header>

        <div className="hcf-amendments-page">
          <div className="hcf-amendments-header">
            <h1 className="hcf-amendments-title">HCF Amendments</h1>
          </div>

          <div className="hcf-amendments-actions">
            <div className="hcf-amendments-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="hcf-amendments-search-input"
                placeholder="Search Amendments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="add-amendment-btn" onClick={handleAdd}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Amendment
            </button>
          </div>

          <div className="hcf-amendments-table-container">
            <table className="hcf-amendments-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>HCF ID</th>
                  <th>Date</th>
                  <th>Service Renew From</th>
                  <th>Valid Upto</th>
                  <th>Billing Type</th>
                  <th>Billing Option</th>
                  <th>Bed Count</th>
                  <th>Bed Rate</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAmendments.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="empty-message">
                      No amendment records found
                    </td>
                  </tr>
                ) : (
                  filteredAmendments.map((amendment) => {
                    const hcf = hcfs.find(h => h.hcfCode === amendment.hcfID);
                    return (
                      <tr key={amendment.id}>
                        <td>{amendment.companyName || '-'}</td>
                        <td>{hcf ? `${amendment.hcfID} - ${hcf.hcfName}` : amendment.hcfID}</td>
                        <td>{amendment.date || '-'}</td>
                        <td>{amendment.serviceRenewFrom || '-'}</td>
                        <td>{amendment.validUpto || '-'}</td>
                        <td>{amendment.billingType || '-'}</td>
                        <td>{amendment.billingOption || '-'}</td>
                        <td>{amendment.bedCount || '-'}</td>
                        <td>{amendment.bedRate || '-'}</td>
                        <td>
                          <span className={`status-badge status-badge--${amendment.status.toLowerCase()}`}>
                            {amendment.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEdit(amendment)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => handleDelete(amendment.id)}
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
          <div className="hcf-amendments-pagination-info">
            Showing {filteredAmendments.length} of {amendments.length} Items
          </div>
        </div>
      </main>

      {/* Amendment Add/Edit Modal */}
      {showModal && (
        <AmendmentFormModal
          amendment={editingAmendment}
          companies={companies.filter(c => c.status === 'Active')}
          hcfs={hcfs.filter(h => h.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingAmendment(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Amendment Form Modal Component
interface AmendmentFormModalProps {
  amendment: HCFAmendment | null;
  companies: Company[];
  hcfs: HCF[];
  onClose: () => void;
  onSave: (data: Partial<HCFAmendment>) => void;
}

const AmendmentFormModal = ({ amendment, companies, hcfs, onClose, onSave }: AmendmentFormModalProps) => {
  const [formData, setFormData] = useState<Partial<HCFAmendment>>(
    amendment || {
      companyName: '',
      hcfID: '',
      date: new Date().toISOString().split('T')[0],
      serviceRenewFrom: '',
      validUpto: '',
      billingOption: '',
      billingType: '',
      bedRate: '',
      bedCount: '',
      kgRate: '',
      lumpsum: '',
      status: 'Active',
    }
  );

  // Filter HCFs based on selected company
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
          <h2 className="modal-title">{amendment ? 'Edit Amendment' : 'Add Amendment'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="amendment-form" onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name *</label>
                <select
                  value={formData.companyName || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, companyName: e.target.value, hcfID: '' });
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
                <label>HCF ID *</label>
                <select
                  value={formData.hcfID || ''}
                  onChange={(e) => setFormData({ ...formData, hcfID: e.target.value })}
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
                <label>Date *</label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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

          {/* Service Period */}
          <div className="form-section">
            <h3 className="form-section-title">Service Period</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Service Renew From *</label>
                <input
                  type="date"
                  value={formData.serviceRenewFrom || ''}
                  onChange={(e) => setFormData({ ...formData, serviceRenewFrom: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Valid Upto *</label>
                <input
                  type="date"
                  value={formData.validUpto || ''}
                  onChange={(e) => setFormData({ ...formData, validUpto: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="form-section">
            <h3 className="form-section-title">Billing Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Billing Type *</label>
                <select
                  value={formData.billingType || ''}
                  onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                  required
                >
                  <option value="">Select Billing Type</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Billing Option *</label>
                <select
                  value={formData.billingOption || ''}
                  onChange={(e) => setFormData({ ...formData, billingOption: e.target.value })}
                  required
                >
                  <option value="">Select Billing Option</option>
                  <option value="Per Bed">Per Bed</option>
                  <option value="Per Kg">Per Kg</option>
                  <option value="Lumpsum">Lumpsum</option>
                </select>
              </div>
            </div>
          </div>

          {/* Rate Information */}
          <div className="form-section">
            <h3 className="form-section-title">Rate Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Bed Count</label>
                <input
                  type="text"
                  value={formData.bedCount || ''}
                  onChange={(e) => setFormData({ ...formData, bedCount: e.target.value })}
                  placeholder="Enter bed count"
                />
              </div>
              <div className="form-group">
                <label>Bed Rate</label>
                <input
                  type="text"
                  value={formData.bedRate || ''}
                  onChange={(e) => setFormData({ ...formData, bedRate: e.target.value })}
                  placeholder="Enter bed rate"
                />
              </div>
              <div className="form-group">
                <label>Kg Rate</label>
                <input
                  type="text"
                  value={formData.kgRate || ''}
                  onChange={(e) => setFormData({ ...formData, kgRate: e.target.value })}
                  placeholder="Enter kg rate"
                />
              </div>
              <div className="form-group">
                <label>Lumpsum</label>
                <input
                  type="text"
                  value={formData.lumpsum || ''}
                  onChange={(e) => setFormData({ ...formData, lumpsum: e.target.value })}
                  placeholder="Enter lumpsum amount"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              {amendment ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HCFAmendmentsPage;
