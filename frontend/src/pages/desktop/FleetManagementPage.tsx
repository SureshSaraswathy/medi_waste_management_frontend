import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './fleetManagementPage.css';
import '../desktop/dashboardPage.css';

interface Fleet {
  id: string;
  companyName: string;
  vehicleNum: string;
  capacity: string;
  vehMake: string;
  vehModel: string;
  mfgYear: string;
  nextFCDate: string;
  pucDateValidUpto: string;
  insuranceValidUpto: string;
  ownerName: string;
  ownerContact: string;
  ownerEmail: string;
  ownerPAN: string;
  ownerAadhaar: string;
  pymtToName: string;
  pymtBankName: string;
  pymtAccNum: string;
  pymtIFSCode: string;
  pymtBranch: string;
  contractAmount: string;
  tdsExemption: boolean;
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

const FleetManagementPage = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFleet, setEditingFleet] = useState<Fleet | null>(null);

  // Master data - Load from Company Master
  const [companies] = useState<Company[]>([
    { id: '1', companyCode: 'COMP001', companyName: 'Sample Company', status: 'Active' },
    { id: '2', companyCode: 'COMP002', companyName: 'ABC Industries', status: 'Active' },
    { id: '3', companyCode: 'COMP003', companyName: 'XYZ Corporation', status: 'Active' },
  ]);

  const [fleets, setFleets] = useState<Fleet[]>([
    {
      id: '1',
      companyName: 'Sample Company',
      vehicleNum: 'MH-01-AB-1234',
      capacity: '5000',
      vehMake: 'Tata',
      vehModel: '407',
      mfgYear: '2020',
      nextFCDate: '2024-12-31',
      pucDateValidUpto: '2024-12-31',
      insuranceValidUpto: '2024-12-31',
      ownerName: 'John Doe',
      ownerContact: '+91-9876543210',
      ownerEmail: 'john.doe@example.com',
      ownerPAN: 'ABCDE1234F',
      ownerAadhaar: '1234-5678-9012',
      pymtToName: 'John Doe',
      pymtBankName: 'State Bank of India',
      pymtAccNum: '123456789012',
      pymtIFSCode: 'SBIN0001234',
      pymtBranch: 'Mumbai Main Branch',
      contractAmount: '50000',
      tdsExemption: false,
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
  ]);

  const filteredFleets = fleets.filter(fleet =>
    fleet.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fleet.vehicleNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fleet.vehMake.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fleet.vehModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fleet.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingFleet(null);
    setShowModal(true);
  };

  const handleEdit = (fleet: Fleet) => {
    setEditingFleet(fleet);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this fleet vehicle?')) {
      setFleets(fleets.filter(fleet => fleet.id !== id));
    }
  };

  const handleSave = (data: Partial<Fleet>) => {
    if (editingFleet) {
      setFleets(fleets.map(fleet => fleet.id === editingFleet.id ? { ...fleet, ...data } : fleet));
    } else {
      const newFleet: Fleet = {
        ...data as Fleet,
        id: Date.now().toString(),
        createdBy: 'System',
        createdOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'System',
        modifiedOn: new Date().toISOString().split('T')[0],
      };
      setFleets([...fleets, newFleet]);
    }
    setShowModal(false);
    setEditingFleet(null);
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
            <span className="breadcrumb">/ Masters / Fleet Management</span>
          </div>
        </header>

        <div className="fleet-management-page">
          <div className="fleet-management-header">
            <h1 className="fleet-management-title">Fleet Management</h1>
          </div>

          <div className="fleet-management-actions">
            <div className="fleet-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="fleet-search-input"
                placeholder="Search Fleet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="add-fleet-btn" onClick={handleAdd}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Vehicle
            </button>
          </div>

          <div className="fleet-table-container">
            <table className="fleet-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Vehicle Number</th>
                  <th>Make</th>
                  <th>Model</th>
                  <th>Capacity</th>
                  <th>Owner Name</th>
                  <th>Owner Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFleets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-message">
                      No fleet records found
                    </td>
                  </tr>
                ) : (
                  filteredFleets.map((fleet) => (
                    <tr key={fleet.id}>
                      <td>{fleet.companyName || '-'}</td>
                      <td>{fleet.vehicleNum || '-'}</td>
                      <td>{fleet.vehMake || '-'}</td>
                      <td>{fleet.vehModel || '-'}</td>
                      <td>{fleet.capacity || '-'}</td>
                      <td>{fleet.ownerName || '-'}</td>
                      <td>{fleet.ownerContact || '-'}</td>
                      <td>
                        <span className={`status-badge status-badge--${fleet.status.toLowerCase()}`}>
                          {fleet.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="action-btn action-btn--edit"
                          onClick={() => handleEdit(fleet)}
                          title="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          className="action-btn action-btn--delete"
                          onClick={() => handleDelete(fleet.id)}
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
          <div className="fleet-pagination-info">
            Showing {filteredFleets.length} of {fleets.length} Items
          </div>
        </div>
      </main>

      {/* Fleet Add/Edit Modal */}
      {showModal && (
        <FleetFormModal
          fleet={editingFleet}
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingFleet(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Fleet Form Modal Component
interface FleetFormModalProps {
  fleet: Fleet | null;
  companies: Company[];
  onClose: () => void;
  onSave: (data: Partial<Fleet>) => void;
}

const FleetFormModal = ({ fleet, companies, onClose, onSave }: FleetFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Fleet>>(
    fleet || {
      companyName: '',
      vehicleNum: '',
      capacity: '',
      vehMake: '',
      vehModel: '',
      mfgYear: '',
      nextFCDate: '',
      pucDateValidUpto: '',
      insuranceValidUpto: '',
      ownerName: '',
      ownerContact: '',
      ownerEmail: '',
      ownerPAN: '',
      ownerAadhaar: '',
      pymtToName: '',
      pymtBankName: '',
      pymtAccNum: '',
      pymtIFSCode: '',
      pymtBranch: '',
      contractAmount: '',
      tdsExemption: false,
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
          <h2 className="modal-title">{fleet ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="fleet-form" onSubmit={handleSubmit}>
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
                <label>Vehicle Number *</label>
                <input
                  type="text"
                  value={formData.vehicleNum || ''}
                  onChange={(e) => setFormData({ ...formData, vehicleNum: e.target.value })}
                  required
                  placeholder="e.g., MH-01-AB-1234"
                />
              </div>
              <div className="form-group">
                <label>Capacity *</label>
                <input
                  type="text"
                  value={formData.capacity || ''}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  required
                  placeholder="Enter capacity in kg"
                />
              </div>
              <div className="form-group">
                <label>Vehicle Make *</label>
                <input
                  type="text"
                  value={formData.vehMake || ''}
                  onChange={(e) => setFormData({ ...formData, vehMake: e.target.value })}
                  required
                  placeholder="e.g., Tata, Mahindra"
                />
              </div>
              <div className="form-group">
                <label>Vehicle Model *</label>
                <input
                  type="text"
                  value={formData.vehModel || ''}
                  onChange={(e) => setFormData({ ...formData, vehModel: e.target.value })}
                  required
                  placeholder="e.g., 407, Bolero"
                />
              </div>
              <div className="form-group">
                <label>Manufacturing Year</label>
                <input
                  type="text"
                  value={formData.mfgYear || ''}
                  onChange={(e) => setFormData({ ...formData, mfgYear: e.target.value })}
                  placeholder="e.g., 2020"
                />
              </div>
            </div>
          </div>

          {/* Compliance Dates */}
          <div className="form-section">
            <h3 className="form-section-title">Compliance Dates</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Next FC Date</label>
                <input
                  type="date"
                  value={formData.nextFCDate || ''}
                  onChange={(e) => setFormData({ ...formData, nextFCDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>PUC Date Valid Upto</label>
                <input
                  type="date"
                  value={formData.pucDateValidUpto || ''}
                  onChange={(e) => setFormData({ ...formData, pucDateValidUpto: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Insurance Valid Upto</label>
                <input
                  type="date"
                  value={formData.insuranceValidUpto || ''}
                  onChange={(e) => setFormData({ ...formData, insuranceValidUpto: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Owner Information */}
          <div className="form-section">
            <h3 className="form-section-title">Owner Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Owner Name *</label>
                <input
                  type="text"
                  value={formData.ownerName || ''}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Owner Contact *</label>
                <input
                  type="tel"
                  value={formData.ownerContact || ''}
                  onChange={(e) => setFormData({ ...formData, ownerContact: e.target.value })}
                  required
                  placeholder="+91-9876543210"
                />
              </div>
              <div className="form-group">
                <label>Owner Email</label>
                <input
                  type="email"
                  value={formData.ownerEmail || ''}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  placeholder="owner@example.com"
                />
              </div>
              <div className="form-group">
                <label>Owner PAN</label>
                <input
                  type="text"
                  value={formData.ownerPAN || ''}
                  onChange={(e) => setFormData({ ...formData, ownerPAN: e.target.value })}
                  placeholder="ABCDE1234F"
                />
              </div>
              <div className="form-group">
                <label>Owner Aadhaar</label>
                <input
                  type="text"
                  value={formData.ownerAadhaar || ''}
                  onChange={(e) => setFormData({ ...formData, ownerAadhaar: e.target.value })}
                  placeholder="1234-5678-9012"
                />
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="form-section">
            <h3 className="form-section-title">Payment Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Payment To Name</label>
                <input
                  type="text"
                  value={formData.pymtToName || ''}
                  onChange={(e) => setFormData({ ...formData, pymtToName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  value={formData.pymtBankName || ''}
                  onChange={(e) => setFormData({ ...formData, pymtBankName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Account Number</label>
                <input
                  type="text"
                  value={formData.pymtAccNum || ''}
                  onChange={(e) => setFormData({ ...formData, pymtAccNum: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>IFSC Code</label>
                <input
                  type="text"
                  value={formData.pymtIFSCode || ''}
                  onChange={(e) => setFormData({ ...formData, pymtIFSCode: e.target.value })}
                  placeholder="SBIN0001234"
                />
              </div>
              <div className="form-group">
                <label>Branch</label>
                <input
                  type="text"
                  value={formData.pymtBranch || ''}
                  onChange={(e) => setFormData({ ...formData, pymtBranch: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Contract Amount</label>
                <input
                  type="text"
                  value={formData.contractAmount || ''}
                  onChange={(e) => setFormData({ ...formData, contractAmount: e.target.value })}
                  placeholder="Enter amount"
                />
              </div>
              <div className="form-group">
                <label>TDS Exemption</label>
                <select
                  value={formData.tdsExemption ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, tdsExemption: e.target.value === 'true' })}
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
              {fleet ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FleetManagementPage;
