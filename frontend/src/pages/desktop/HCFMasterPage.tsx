import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './hcfMasterPage.css';
import '../desktop/dashboardPage.css';

interface HCF {
  id: string;
  companyName: string;
  companyID: string;
  hcfCode: string;
  password: string;
  hcfTypeCode: string;
  hcfName: string;
  hcfShortName: string;
  areaID: string;
  pincode: string;
  district: string;
  stateCode: string;
  groupCode: string;
  pcbZone: string;
  billingName: string;
  billingAddress: string;
  serviceAddress: string;
  gstin: string;
  regnNum: string;
  hospRegnDate: string;
  billingType: string;
  advAmount: string;
  billingOption: string;
  bedCount: string;
  bedRate: string;
  kgRate: string;
  lumpsum: string;
  accountsLandline: string;
  accountsMobile: string;
  accountsEmail: string;
  contactName: string;
  contactDesignation: string;
  contactMobile: string;
  contactEmail: string;
  agrSignAuthName: string;
  agrSignAuthDesignation: string;
  drName: string;
  drPhNo: string;
  drEmail: string;
  serviceStartDate: string;
  serviceEndDate: string;
  category: string;
  route: string;
  executive_Assigned: string;
  submitBy: string;
  agrID: string;
  sortOrder: string;
  isGovt: boolean;
  isGSTExempt: boolean;
  autoGen: boolean;
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

interface Area {
  id: string;
  areaName: string;
  status: 'Active' | 'Inactive';
}

interface State {
  id: string;
  stateCode: string;
  stateName: string;
  status: 'Active' | 'Inactive';
}

interface PCBZone {
  id: string;
  pcbZoneName: string;
  status: 'Active' | 'Inactive';
}

interface Category {
  id: string;
  categoryName: string;
  status: 'Active' | 'Inactive';
}

interface Route {
  id: string;
  routeName: string;
  status: 'Active' | 'Inactive';
}

const HCFMasterPage = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingHCF, setEditingHCF] = useState<HCF | null>(null);

  // Master data - Load from respective masters
  const [companies] = useState<Company[]>([
    { id: '1', companyCode: 'COMP001', companyName: 'Sample Company', status: 'Active' },
    { id: '2', companyCode: 'COMP002', companyName: 'ABC Industries', status: 'Active' },
    { id: '3', companyCode: 'COMP003', companyName: 'XYZ Corporation', status: 'Active' },
  ]);

  const [areas] = useState<Area[]>([
    { id: '1', areaName: 'Area A', status: 'Active' },
    { id: '2', areaName: 'Area B', status: 'Active' },
    { id: '3', areaName: 'Area C', status: 'Active' },
  ]);

  const [states] = useState<State[]>([
    { id: '1', stateCode: 'MH', stateName: 'Maharashtra', status: 'Active' },
    { id: '2', stateCode: 'DL', stateName: 'Delhi', status: 'Active' },
    { id: '3', stateCode: 'KA', stateName: 'Karnataka', status: 'Active' },
  ]);

  const [pcbZones] = useState<PCBZone[]>([
    { id: '1', pcbZoneName: 'Zone A', status: 'Active' },
    { id: '2', pcbZoneName: 'Zone B', status: 'Active' },
    { id: '3', pcbZoneName: 'Zone C', status: 'Active' },
  ]);

  const [categories] = useState<Category[]>([
    { id: '1', categoryName: 'Category A', status: 'Active' },
    { id: '2', categoryName: 'Category B', status: 'Active' },
    { id: '3', categoryName: 'Category C', status: 'Active' },
  ]);

  const [routes] = useState<Route[]>([
    { id: '1', routeName: 'Route 1', status: 'Active' },
    { id: '2', routeName: 'Route 2', status: 'Active' },
    { id: '3', routeName: 'Route 3', status: 'Active' },
  ]);

  const [hcfs, setHcfs] = useState<HCF[]>([
    {
      id: '1',
      companyName: 'Sample Company',
      companyID: 'COMP001',
      hcfCode: 'HCF001',
      password: '********',
      hcfTypeCode: 'TYPE001',
      hcfName: 'City Hospital',
      hcfShortName: 'CH',
      areaID: 'Area A',
      pincode: '400001',
      district: 'Mumbai',
      stateCode: 'MH',
      groupCode: 'GRP001',
      pcbZone: 'Zone A',
      billingName: 'City Hospital Billing',
      billingAddress: '123 Hospital Street',
      serviceAddress: '123 Hospital Street',
      gstin: '27ABCDE1234F1Z5',
      regnNum: 'REG001',
      hospRegnDate: '2020-01-15',
      billingType: 'Monthly',
      advAmount: '50000',
      billingOption: 'Per Bed',
      bedCount: '100',
      bedRate: '500',
      kgRate: '50',
      lumpsum: '100000',
      accountsLandline: '022-12345678',
      accountsMobile: '+91-9876543210',
      accountsEmail: 'accounts@cityhospital.com',
      contactName: 'John Doe',
      contactDesignation: 'Manager',
      contactMobile: '+91-9876543211',
      contactEmail: 'contact@cityhospital.com',
      agrSignAuthName: 'Jane Smith',
      agrSignAuthDesignation: 'Director',
      drName: 'Dr. Robert Wilson',
      drPhNo: '+91-9876543212',
      drEmail: 'doctor@cityhospital.com',
      serviceStartDate: '2020-01-01',
      serviceEndDate: '2025-12-31',
      category: 'Category A',
      route: 'Route 1',
      executive_Assigned: 'Executive 1',
      submitBy: 'Admin',
      agrID: 'AGR001',
      sortOrder: '1',
      isGovt: false,
      isGSTExempt: false,
      autoGen: true,
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
  ]);

  const filteredHCFs = hcfs.filter(hcf =>
    hcf.hcfName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hcf.hcfCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hcf.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hcf.hcfShortName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingHCF(null);
    setShowModal(true);
  };

  const handleEdit = (hcf: HCF) => {
    setEditingHCF(hcf);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this HCF?')) {
      setHcfs(hcfs.filter(hcf => hcf.id !== id));
    }
  };

  const handleSave = (data: Partial<HCF>) => {
    if (editingHCF) {
      setHcfs(hcfs.map(hcf => hcf.id === editingHCF.id ? { ...hcf, ...data } : hcf));
    } else {
      const newHCF: HCF = {
        ...data as HCF,
        id: Date.now().toString(),
        createdBy: 'System',
        createdOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'System',
        modifiedOn: new Date().toISOString().split('T')[0],
      };
      setHcfs([...hcfs, newHCF]);
    }
    setShowModal(false);
    setEditingHCF(null);
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
            <span className="breadcrumb">/ Masters / HCF Master</span>
          </div>
        </header>

        <div className="hcf-master-page">
          <div className="hcf-master-header">
            <h1 className="hcf-master-title">HCF Master</h1>
          </div>

          <div className="hcf-master-actions">
            <div className="hcf-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="hcf-search-input"
                placeholder="Search HCF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="add-hcf-btn" onClick={handleAdd}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add HCF
            </button>
          </div>

          <div className="hcf-table-container">
            <table className="hcf-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>HCF Code</th>
                  <th>HCF Name</th>
                  <th>HCF Short Name</th>
                  <th>State Code</th>
                  <th>District</th>
                  <th>Pincode</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHCFs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-message">
                      No HCF records found
                    </td>
                  </tr>
                ) : (
                  filteredHCFs.map((hcf) => (
                    <tr key={hcf.id}>
                      <td>{hcf.companyName || '-'}</td>
                      <td>{hcf.hcfCode || '-'}</td>
                      <td>{hcf.hcfName || '-'}</td>
                      <td>{hcf.hcfShortName || '-'}</td>
                      <td>{hcf.stateCode || '-'}</td>
                      <td>{hcf.district || '-'}</td>
                      <td>{hcf.pincode || '-'}</td>
                      <td>
                        <span className={`status-badge status-badge--${hcf.status.toLowerCase()}`}>
                          {hcf.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="action-btn action-btn--edit"
                          onClick={() => handleEdit(hcf)}
                          title="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          className="action-btn action-btn--delete"
                          onClick={() => handleDelete(hcf.id)}
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
          <div className="hcf-pagination-info">
            Showing {filteredHCFs.length} of {hcfs.length} Items
          </div>
        </div>
      </main>

      {/* HCF Add/Edit Modal */}
      {showModal && (
        <HCFFormModal
          hcf={editingHCF}
          companies={companies.filter(c => c.status === 'Active')}
          areas={areas.filter(a => a.status === 'Active')}
          states={states.filter(s => s.status === 'Active')}
          pcbZones={pcbZones.filter(z => z.status === 'Active')}
          categories={categories.filter(c => c.status === 'Active')}
          routes={routes.filter(r => r.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingHCF(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// HCF Form Modal Component
interface HCFFormModalProps {
  hcf: HCF | null;
  companies: Company[];
  areas: Area[];
  states: State[];
  pcbZones: PCBZone[];
  categories: Category[];
  routes: Route[];
  onClose: () => void;
  onSave: (data: Partial<HCF>) => void;
}

const HCFFormModal = ({ hcf, companies, areas, states, pcbZones, categories, routes, onClose, onSave }: HCFFormModalProps) => {
  const [formData, setFormData] = useState<Partial<HCF>>(
    hcf || {
      companyName: '',
      companyID: '',
      hcfCode: '',
      password: '',
      hcfTypeCode: '',
      hcfName: '',
      hcfShortName: '',
      areaID: '',
      pincode: '',
      district: '',
      stateCode: '',
      groupCode: '',
      pcbZone: '',
      billingName: '',
      billingAddress: '',
      serviceAddress: '',
      gstin: '',
      regnNum: '',
      hospRegnDate: '',
      billingType: '',
      advAmount: '',
      billingOption: '',
      bedCount: '',
      bedRate: '',
      kgRate: '',
      lumpsum: '',
      accountsLandline: '',
      accountsMobile: '',
      accountsEmail: '',
      contactName: '',
      contactDesignation: '',
      contactMobile: '',
      contactEmail: '',
      agrSignAuthName: '',
      agrSignAuthDesignation: '',
      drName: '',
      drPhNo: '',
      drEmail: '',
      serviceStartDate: '',
      serviceEndDate: '',
      category: '',
      route: '',
      executive_Assigned: '',
      submitBy: '',
      agrID: '',
      sortOrder: '',
      isGovt: false,
      isGSTExempt: false,
      autoGen: false,
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
          <h2 className="modal-title">{hcf ? 'Edit HCF' : 'Add HCF'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="hcf-form" onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="form-section">
            <h3 className="form-section-title">Basic Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Company Name *</label>
                <select
                  value={formData.companyName || ''}
                  onChange={(e) => {
                    const selectedCompany = companies.find(c => c.companyName === e.target.value);
                    setFormData({ ...formData, companyName: e.target.value, companyID: selectedCompany?.companyCode || '' });
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
                <label>Company ID</label>
                <input
                  type="text"
                  value={formData.companyID || ''}
                  readOnly
                  style={{ backgroundColor: '#f1f5f9' }}
                />
              </div>
              <div className="form-group">
                <label>HCF Code *</label>
                <input
                  type="text"
                  value={formData.hcfCode || ''}
                  onChange={(e) => setFormData({ ...formData, hcfCode: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>HCF Type Code</label>
                <input
                  type="text"
                  value={formData.hcfTypeCode || ''}
                  onChange={(e) => setFormData({ ...formData, hcfTypeCode: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>HCF Name *</label>
                <input
                  type="text"
                  value={formData.hcfName || ''}
                  onChange={(e) => setFormData({ ...formData, hcfName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>HCF Short Name</label>
                <input
                  type="text"
                  value={formData.hcfShortName || ''}
                  onChange={(e) => setFormData({ ...formData, hcfShortName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Group Code</label>
                <input
                  type="text"
                  value={formData.groupCode || ''}
                  onChange={(e) => setFormData({ ...formData, groupCode: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="form-section">
            <h3 className="form-section-title">Location Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Area ID *</label>
                <select
                  value={formData.areaID || ''}
                  onChange={(e) => setFormData({ ...formData, areaID: e.target.value })}
                  required
                >
                  <option value="">Select Area</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.areaName}>
                      {area.areaName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>State Code *</label>
                <select
                  value={formData.stateCode || ''}
                  onChange={(e) => setFormData({ ...formData, stateCode: e.target.value })}
                  required
                >
                  <option value="">Select State</option>
                  {states.map((state) => (
                    <option key={state.id} value={state.stateCode}>
                      {state.stateCode} - {state.stateName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>District *</label>
                <input
                  type="text"
                  value={formData.district || ''}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Pincode *</label>
                <input
                  type="text"
                  value={formData.pincode || ''}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>PCB Zone</label>
                <select
                  value={formData.pcbZone || ''}
                  onChange={(e) => setFormData({ ...formData, pcbZone: e.target.value })}
                >
                  <option value="">Select PCB Zone</option>
                  {pcbZones.map((zone) => (
                    <option key={zone.id} value={zone.pcbZoneName}>
                      {zone.pcbZoneName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="form-section">
            <h3 className="form-section-title">Address Information</h3>
            <div className="form-grid">
              <div className="form-group form-group--full">
                <label>Billing Address</label>
                <textarea
                  value={formData.billingAddress || ''}
                  onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group form-group--full">
                <label>Service Address</label>
                <textarea
                  value={formData.serviceAddress || ''}
                  onChange={(e) => setFormData({ ...formData, serviceAddress: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Billing Name</label>
                <input
                  type="text"
                  value={formData.billingName || ''}
                  onChange={(e) => setFormData({ ...formData, billingName: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Registration & GST Information */}
          <div className="form-section">
            <h3 className="form-section-title">Registration & GST Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>GSTIN</label>
                <input
                  type="text"
                  value={formData.gstin || ''}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Registration Number</label>
                <input
                  type="text"
                  value={formData.regnNum || ''}
                  onChange={(e) => setFormData({ ...formData, regnNum: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Hospital Registration Date</label>
                <input
                  type="date"
                  value={formData.hospRegnDate || ''}
                  onChange={(e) => setFormData({ ...formData, hospRegnDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Is GST Exempt</label>
                <select
                  value={formData.isGSTExempt ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, isGSTExempt: e.target.value === 'true' })}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
              <div className="form-group">
                <label>Is Government</label>
                <select
                  value={formData.isGovt ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, isGovt: e.target.value === 'true' })}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Billing Information */}
          <div className="form-section">
            <h3 className="form-section-title">Billing Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Billing Type</label>
                <select
                  value={formData.billingType || ''}
                  onChange={(e) => setFormData({ ...formData, billingType: e.target.value })}
                >
                  <option value="">Select Billing Type</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Billing Option</label>
                <select
                  value={formData.billingOption || ''}
                  onChange={(e) => setFormData({ ...formData, billingOption: e.target.value })}
                >
                  <option value="">Select Billing Option</option>
                  <option value="Per Bed">Per Bed</option>
                  <option value="Per Kg">Per Kg</option>
                  <option value="Lumpsum">Lumpsum</option>
                </select>
              </div>
              <div className="form-group">
                <label>Advance Amount</label>
                <input
                  type="text"
                  value={formData.advAmount || ''}
                  onChange={(e) => setFormData({ ...formData, advAmount: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Bed Count</label>
                <input
                  type="text"
                  value={formData.bedCount || ''}
                  onChange={(e) => setFormData({ ...formData, bedCount: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Bed Rate</label>
                <input
                  type="text"
                  value={formData.bedRate || ''}
                  onChange={(e) => setFormData({ ...formData, bedRate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Kg Rate</label>
                <input
                  type="text"
                  value={formData.kgRate || ''}
                  onChange={(e) => setFormData({ ...formData, kgRate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Lumpsum</label>
                <input
                  type="text"
                  value={formData.lumpsum || ''}
                  onChange={(e) => setFormData({ ...formData, lumpsum: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Accounts Contact */}
          <div className="form-section">
            <h3 className="form-section-title">Accounts Contact</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Accounts Landline</label>
                <input
                  type="tel"
                  value={formData.accountsLandline || ''}
                  onChange={(e) => setFormData({ ...formData, accountsLandline: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Accounts Mobile</label>
                <input
                  type="tel"
                  value={formData.accountsMobile || ''}
                  onChange={(e) => setFormData({ ...formData, accountsMobile: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Accounts Email</label>
                <input
                  type="email"
                  value={formData.accountsEmail || ''}
                  onChange={(e) => setFormData({ ...formData, accountsEmail: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="form-section">
            <h3 className="form-section-title">Contact Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Contact Name</label>
                <input
                  type="text"
                  value={formData.contactName || ''}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contact Designation</label>
                <input
                  type="text"
                  value={formData.contactDesignation || ''}
                  onChange={(e) => setFormData({ ...formData, contactDesignation: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contact Mobile</label>
                <input
                  type="tel"
                  value={formData.contactMobile || ''}
                  onChange={(e) => setFormData({ ...formData, contactMobile: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input
                  type="email"
                  value={formData.contactEmail || ''}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Agreement Signatory */}
          <div className="form-section">
            <h3 className="form-section-title">Agreement Signatory</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Agreement Signatory Auth Name</label>
                <input
                  type="text"
                  value={formData.agrSignAuthName || ''}
                  onChange={(e) => setFormData({ ...formData, agrSignAuthName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Agreement Signatory Auth Designation</label>
                <input
                  type="text"
                  value={formData.agrSignAuthDesignation || ''}
                  onChange={(e) => setFormData({ ...formData, agrSignAuthDesignation: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Agreement ID</label>
                <input
                  type="text"
                  value={formData.agrID || ''}
                  onChange={(e) => setFormData({ ...formData, agrID: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Doctor Information */}
          <div className="form-section">
            <h3 className="form-section-title">Doctor Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Doctor Name</label>
                <input
                  type="text"
                  value={formData.drName || ''}
                  onChange={(e) => setFormData({ ...formData, drName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Doctor Phone Number</label>
                <input
                  type="tel"
                  value={formData.drPhNo || ''}
                  onChange={(e) => setFormData({ ...formData, drPhNo: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Doctor Email</label>
                <input
                  type="email"
                  value={formData.drEmail || ''}
                  onChange={(e) => setFormData({ ...formData, drEmail: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Service Information */}
          <div className="form-section">
            <h3 className="form-section-title">Service Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Service Start Date</label>
                <input
                  type="date"
                  value={formData.serviceStartDate || ''}
                  onChange={(e) => setFormData({ ...formData, serviceStartDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Service End Date</label>
                <input
                  type="date"
                  value={formData.serviceEndDate || ''}
                  onChange={(e) => setFormData({ ...formData, serviceEndDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.categoryName}>
                      {cat.categoryName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Route</label>
                <select
                  value={formData.route || ''}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                >
                  <option value="">Select Route</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.routeName}>
                      {r.routeName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Executive Assigned</label>
                <input
                  type="text"
                  value={formData.executive_Assigned || ''}
                  onChange={(e) => setFormData({ ...formData, executive_Assigned: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Submit By</label>
                <input
                  type="text"
                  value={formData.submitBy || ''}
                  onChange={(e) => setFormData({ ...formData, submitBy: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="form-section">
            <h3 className="form-section-title">Additional Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Sort Order</label>
                <input
                  type="text"
                  value={formData.sortOrder || ''}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Auto Generate</label>
                <select
                  value={formData.autoGen ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, autoGen: e.target.value === 'true' })}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
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
              {hcf ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HCFMasterPage;
