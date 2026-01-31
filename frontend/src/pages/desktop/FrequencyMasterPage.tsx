import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { canCreateMasterData } from '../../utils/permissions';
import { frequencyService, FrequencyResponse } from '../../services/frequencyService';
import { companyService, CompanyResponse } from '../../services/companyService';
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
  const { logout, user } = useAuth();
  const location = useLocation();
  const canCreate = canCreateMasterData(user);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingFrequency, setEditingFrequency] = useState<Frequency | null>(null);
  const [frequencies, setFrequencies] = useState<Frequency[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Load companies from API
  const loadCompanies = async () => {
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
  };

  // Load frequencies from API
  const loadFrequencies = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiFrequencies = await frequencyService.getAllFrequencies(undefined, true);
      const mappedFrequencies: Frequency[] = apiFrequencies.map((apiFrequency: FrequencyResponse) => {
        const company = companies.find(c => c.id === apiFrequency.companyId);
        return {
          id: apiFrequency.id,
          frequencyCode: apiFrequency.frequencyCode,
          frequencyName: apiFrequency.frequencyName,
          companyName: company?.companyName || 'Unknown Company',
          status: apiFrequency.status,
          createdBy: apiFrequency.createdBy || '',
          createdOn: apiFrequency.createdOn,
          modifiedBy: apiFrequency.modifiedBy || '',
          modifiedOn: apiFrequency.modifiedOn,
        };
      });
      setFrequencies(mappedFrequencies);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load frequencies';
      setError(errorMessage);
      console.error('Error loading frequencies:', err);
      setFrequencies([]);
    } finally {
      setLoading(false);
    }
  };

  // Load companies first, then frequencies
  useEffect(() => {
    const initializeData = async () => {
      await loadCompanies();
    };
    initializeData();
  }, []);

  // Load frequencies when companies are loaded
  useEffect(() => {
    if (companies.length > 0) {
      loadFrequencies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies.length]);

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

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this frequency?')) {
      try {
        setLoading(true);
        await frequencyService.deleteFrequency(id);
        await loadFrequencies();
        alert('Frequency deleted successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete frequency';
        alert(`Error: ${errorMessage}`);
        console.error('Error deleting frequency:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (data: Partial<Frequency>) => {
    try {
      setLoading(true);
      setError(null);
      
      // Find company ID from company name
      const selectedCompany = companies.find(c => c.companyName === data.companyName);
      if (!selectedCompany) {
        alert('Please select a valid company');
        return;
      }

      if (editingFrequency) {
        // Update existing - only status can be updated (frequencyCode, frequencyName, companyId are immutable)
        await frequencyService.updateFrequency(editingFrequency.id, {
          status: data.status,
        });
        alert('Frequency updated successfully');
      } else {
        // Add new
        if (!data.frequencyCode || !data.frequencyName || !data.companyName) {
          alert('Please fill in all required fields');
          return;
        }
        await frequencyService.createFrequency({
          frequencyCode: data.frequencyCode,
          frequencyName: data.frequencyName,
          companyId: selectedCompany.id,
        });
        alert('Frequency created successfully');
      }
      
      setShowModal(false);
      setEditingFrequency(null);
      await loadFrequencies();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save frequency';
      setError(errorMessage);
      alert(`Error: ${errorMessage}`);
      console.error('Error saving frequency:', err);
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
            <span className="breadcrumb">/ Masters / Frequency Master</span>
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
        {loading && !frequencies.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading frequencies...
          </div>
        )}

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
            {canCreate && (
              <button className="add-frequency-btn" onClick={handleAdd}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Frequency
              </button>
            )}
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
                  disabled={!!frequency} // Disable when editing (immutable field)
                  style={frequency ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
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
                  disabled={!!frequency} // Disable when editing (immutable field)
                  style={frequency ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
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
                  disabled={!!frequency} // Disable when editing (immutable field)
                  style={frequency ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
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
