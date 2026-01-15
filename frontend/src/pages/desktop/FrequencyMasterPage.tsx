import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './frequencyMasterPage.css';
import '../desktop/dashboardPage.css';

interface Frequency {
  id: string;
  frequencyCode: string;
  frequencyName: string;
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

const FrequencyMasterPage = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFrequency, setEditingFrequency] = useState<Frequency | null>(null);

  // Master data - Load from Company Master
  const [companies] = useState<Company[]>([
    { id: '1', companyCode: 'COMP001', companyName: 'Sample Company', status: 'Active' },
    { id: '2', companyCode: 'COMP002', companyName: 'ABC Industries', status: 'Active' },
    { id: '3', companyCode: 'COMP003', companyName: 'XYZ Corporation', status: 'Active' },
  ]);

  const [frequencies, setFrequencies] = useState<Frequency[]>([
    {
      id: '1',
      frequencyCode: 'FREQ001',
      frequencyName: 'Daily',
      companyName: 'Sample Company',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-01',
      modifiedBy: 'System',
      modifiedOn: '2023-01-01',
    },
    {
      id: '2',
      frequencyCode: 'FREQ002',
      frequencyName: 'Weekly',
      companyName: 'ABC Industries',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-02',
      modifiedBy: 'System',
      modifiedOn: '2023-01-02',
    },
    {
      id: '3',
      frequencyCode: 'FREQ003',
      frequencyName: 'Monthly',
      companyName: 'XYZ Corporation',
      status: 'Active',
      createdBy: 'System',
      createdOn: '2023-01-03',
      modifiedBy: 'System',
      modifiedOn: '2023-01-03',
    },
  ]);

  const filteredFrequencies = frequencies.filter(frequency =>
    frequency.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    frequency.frequencyCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    frequency.frequencyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingFrequency(null);
    setShowModal(true);
  };

  const handleEdit = (frequency: Frequency) => {
    setEditingFrequency(frequency);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this frequency?')) {
      setFrequencies(frequencies.filter(frequency => frequency.id !== id));
    }
  };

  const handleSave = (data: Partial<Frequency>) => {
    if (editingFrequency) {
      setFrequencies(frequencies.map(frequency => frequency.id === editingFrequency.id ? { ...frequency, ...data } : frequency));
    } else {
      const newFrequency: Frequency = {
        ...data as Frequency,
        id: Date.now().toString(),
        createdBy: 'System',
        createdOn: new Date().toISOString().split('T')[0],
        modifiedBy: 'System',
        modifiedOn: new Date().toISOString().split('T')[0],
      };
      setFrequencies([...frequencies, newFrequency]);
    }
    setShowModal(false);
    setEditingFrequency(null);
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
            <span className="breadcrumb">/ Masters / Frequency Master</span>
          </div>
        </header>

        <div className="frequency-master-page">
          <div className="frequency-master-header">
            <h1 className="frequency-master-title">Frequency Master</h1>
          </div>

          <div className="frequency-master-actions">
            <div className="frequency-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="frequency-search-input"
                placeholder="Search Frequency..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="add-frequency-btn" onClick={handleAdd}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Frequency
            </button>
          </div>

          <div className="frequency-table-container">
            <table className="frequency-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>Frequency Code</th>
                  <th>Frequency Name</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFrequencies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-message">
                      No frequency records found
                    </td>
                  </tr>
                ) : (
                  filteredFrequencies.map((frequency) => (
                    <tr key={frequency.id}>
                      <td>{frequency.companyName || '-'}</td>
                      <td>{frequency.frequencyCode || '-'}</td>
                      <td>{frequency.frequencyName || '-'}</td>
                      <td>
                        <span className={`status-badge status-badge--${frequency.status.toLowerCase()}`}>
                          {frequency.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="action-btn action-btn--edit"
                          onClick={() => handleEdit(frequency)}
                          title="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          className="action-btn action-btn--delete"
                          onClick={() => handleDelete(frequency.id)}
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
          <div className="frequency-pagination-info">
            Showing {filteredFrequencies.length} of {frequencies.length} Items
          </div>
        </div>
      </main>

      {/* Frequency Add/Edit Modal */}
      {showModal && (
        <FrequencyFormModal
          frequency={editingFrequency}
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingFrequency(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Frequency Form Modal Component
interface FrequencyFormModalProps {
  frequency: Frequency | null;
  companies: Company[];
  onClose: () => void;
  onSave: (data: Partial<Frequency>) => void;
}

const FrequencyFormModal = ({ frequency, companies, onClose, onSave }: FrequencyFormModalProps) => {
  const [formData, setFormData] = useState<Partial<Frequency>>(
    frequency || {
      companyName: '',
      frequencyCode: '',
      frequencyName: '',
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
          <h2 className="modal-title">{frequency ? 'Edit Frequency' : 'Add Frequency'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="frequency-form" onSubmit={handleSubmit}>
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
                <label>Frequency Code *</label>
                <input
                  type="text"
                  value={formData.frequencyCode || ''}
                  onChange={(e) => setFormData({ ...formData, frequencyCode: e.target.value })}
                  required
                  placeholder="Enter Frequency Code"
                />
              </div>
              <div className="form-group">
                <label>Frequency Name *</label>
                <input
                  type="text"
                  value={formData.frequencyName || ''}
                  onChange={(e) => setFormData({ ...formData, frequencyName: e.target.value })}
                  required
                  placeholder="Enter Frequency Name"
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
              {frequency ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FrequencyMasterPage;
