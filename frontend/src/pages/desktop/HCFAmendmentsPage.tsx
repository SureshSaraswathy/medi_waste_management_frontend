import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { canCreateMasterData } from '../../utils/permissions';
import { hcfAmendmentService, HcfAmendmentResponse } from '../../services/hcfAmendmentService';
import { companyService, CompanyResponse } from '../../services/companyService';
import { hcfService, HcfResponse } from '../../services/hcfService';
import './hcfAmendmentsPage.css';
import '../desktop/dashboardPage.css';

interface HCFAmendment {
  id: string;
  hcfId: string; // Backend UUID
  hcfCode?: string; // Display code
  companyName?: string; // Display name
  amendmentType: string;
  amendmentDate: string;
  description?: string;
  status?: string; // amendmentStatus from backend
  approvedBy?: string;
  approvedDate?: string;
  createdBy: string | null;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string;
}

const HCFAmendmentsPage = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const canCreate = canCreateMasterData(user);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAmendment, setEditingAmendment] = useState<HCFAmendment | null>(null);
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Master data - Load from API
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [hcfs, setHcfs] = useState<HcfResponse[]>([]);
  const [amendments, setAmendments] = useState<HCFAmendment[]>([]);

  // Load companies
  const loadCompanies = useCallback(async () => {
    try {
      const data = await companyService.getAllCompanies(undefined, true);
      setCompanies(data);
    } catch (err: any) {
      console.error('Failed to load companies:', err);
      setError('Failed to load companies');
    }
  }, []);

  // Load HCFs
  const loadHcfs = useCallback(async () => {
    try {
      const data = await hcfService.getAllHcfs(undefined, true);
      setHcfs(data);
    } catch (err: any) {
      console.error('Failed to load HCFs:', err);
      setError('Failed to load HCFs');
    }
  }, []);

  // Load amendments - independent of companies/hcfs for initial load
  const loadAmendments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading amendments...');
      const data = await hcfAmendmentService.getAllHcfAmendments();
      console.log('Amendments loaded:', data);
      setAmendments(data.map(a => ({
        id: a.id,
        hcfId: a.hcfId,
        amendmentType: a.amendmentType,
        amendmentDate: a.amendmentDate,
        description: a.description,
        status: a.status,
        approvedBy: a.approvedBy,
        approvedDate: a.approvedDate,
        createdBy: a.createdBy,
        createdOn: a.createdOn,
        modifiedBy: a.modifiedBy,
        modifiedOn: a.modifiedOn,
      })));
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to load amendments:', err);
      setError(err.message || 'Failed to load amendments');
      setAmendments([]); // Clear amendments on error
      setLoading(false);
    }
  }, []);

  // Map amendments with company/HCF info when they're available
  useEffect(() => {
    if (amendments.length > 0 && companies.length > 0 && hcfs.length > 0) {
      setAmendments(prev => {
        // Check if mapping is needed
        const needsMapping = prev.some(a => !a.hcfCode || !a.companyName);
        if (!needsMapping) {
          return prev; // No change needed
        }
        
        // Map amendments
        const mapped = prev.map(amendment => {
          // Skip if already mapped
          if (amendment.hcfCode && amendment.companyName) {
            return amendment;
          }
          const hcf = hcfs.find(h => h.id === amendment.hcfId);
          const company = hcf ? companies.find(c => c.id === hcf.companyId) : null;
          return {
            ...amendment,
            hcfCode: hcf?.hcfCode || '',
            companyName: company?.companyName || '',
          };
        });
        
        // Only update if something actually changed
        const hasChanges = mapped.some((m, i) => 
          m.hcfCode !== prev[i]?.hcfCode || m.companyName !== prev[i]?.companyName
        );
        
        return hasChanges ? mapped : prev;
      });
    }
  }, [companies, hcfs]); // Only re-map when companies/hcfs change, not amendments

  // Initial load
  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      try {
        setLoading(true);
        // Load all data in parallel
        const [companiesData, hcfsData] = await Promise.all([
          companyService.getAllCompanies(undefined, true).catch((err) => {
            console.error('Failed to load companies:', err);
            return [];
          }),
          hcfService.getAllHcfs(undefined, true).catch((err) => {
            console.error('Failed to load HCFs:', err);
            return [];
          }),
        ]);
        
        if (!mounted) return;
        
        setCompanies(companiesData);
        setHcfs(hcfsData);
        
        // Load amendments after companies/HCFs are set
        await loadAmendments();
      } catch (err: any) {
        console.error('Failed to initialize:', err);
        if (mounted) {
          setError('Failed to load data');
          setLoading(false);
        }
      }
    };
    initialize();
    
    return () => {
      mounted = false;
    };
  }, [loadAmendments]);

  const filteredAmendments = amendments.filter(amendment =>
    (amendment.companyName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (amendment.hcfCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    amendment.amendmentType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (amendment.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = () => {
    setEditingAmendment(null);
    setShowModal(true);
  };

  const handleEdit = (amendment: HCFAmendment) => {
    setEditingAmendment(amendment);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this amendment?')) {
      try {
        setLoading(true);
        await hcfAmendmentService.deleteHcfAmendment(id);
        await loadAmendments();
      } catch (err: any) {
        console.error('Failed to delete amendment:', err);
        alert(err.message || 'Failed to delete amendment');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (data: Partial<HCFAmendment>) => {
    try {
      setSaving(true);
      setError(null);

      if (editingAmendment) {
        // Update existing amendment
        const updateData: any = {};
        if (data.amendmentType !== undefined) updateData.amendmentType = data.amendmentType;
        if (data.amendmentDate !== undefined) updateData.amendmentDate = data.amendmentDate;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.status !== undefined) updateData.amendmentStatus = data.status; // Map status to amendmentStatus
        if (data.approvedBy !== undefined) updateData.approvedBy = data.approvedBy;
        if (data.approvedDate !== undefined) updateData.approvedDate = data.approvedDate;

        await hcfAmendmentService.updateHcfAmendment(editingAmendment.id, updateData);
      } else {
        // Create new amendment
        if (!data.hcfId) {
          throw new Error('HCF is required');
        }
        if (!data.amendmentType) {
          throw new Error('Amendment type is required');
        }
        if (!data.amendmentDate) {
          throw new Error('Amendment date is required');
        }

        await hcfAmendmentService.createHcfAmendment({
          hcfId: data.hcfId,
          amendmentType: data.amendmentType,
          amendmentDate: data.amendmentDate,
          description: data.description,
          status: data.status,
          approvedBy: data.approvedBy,
          approvedDate: data.approvedDate,
        });
      }

      await loadAmendments();
      setShowModal(false);
      setEditingAmendment(null);
    } catch (err: any) {
      console.error('Failed to save amendment:', err);
      setError(err.message || 'Failed to save amendment');
      alert(err.message || 'Failed to save amendment');
    } finally {
      setSaving(false);
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
            <span className="breadcrumb">/ Masters / HCF Amendments</span>
          </div>
        </header>

        <div className="hcf-amendments-page">
          {error && (
            <div className="error-message" style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
              {error}
            </div>
          )}
          {loading && amendments.length === 0 && (
            <div className="loading-message" style={{ padding: '10px', marginBottom: '20px', textAlign: 'center' }}>
              Loading amendments...
            </div>
          )}
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
            {canCreate && (
              <button className="add-amendment-btn" onClick={handleAdd}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Amendment
              </button>
            )}
          </div>

          <div className="hcf-amendments-table-container">
            <table className="hcf-amendments-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>HCF</th>
                  <th>Amendment Type</th>
                  <th>Amendment Date</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Approved By</th>
                  <th>Approved Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && amendments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-message">
                      Loading amendments...
                    </td>
                  </tr>
                ) : filteredAmendments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-message">
                      No amendment records found
                    </td>
                  </tr>
                ) : (
                  filteredAmendments.map((amendment) => {
                    const hcf = hcfs.find(h => h.id === amendment.hcfId);
                    return (
                      <tr key={amendment.id}>
                        <td>{amendment.companyName || '-'}</td>
                        <td>{hcf ? `${hcf.hcfCode} - ${hcf.hcfName}` : amendment.hcfCode || '-'}</td>
                        <td>{amendment.amendmentType || '-'}</td>
                        <td>{amendment.amendmentDate ? new Date(amendment.amendmentDate).toLocaleDateString() : '-'}</td>
                        <td>{amendment.description || '-'}</td>
                        <td>
                          <span className={`status-badge status-badge--${(amendment.status || 'Pending').toLowerCase()}`}>
                            {amendment.status || 'Pending'}
                          </span>
                        </td>
                        <td>{amendment.approvedBy || '-'}</td>
                        <td>{amendment.approvedDate ? new Date(amendment.approvedDate).toLocaleDateString() : '-'}</td>
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
            setError(null);
          }}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
};

// Amendment Form Modal Component
interface AmendmentFormModalProps {
  amendment: HCFAmendment | null;
  companies: CompanyResponse[];
  hcfs: HcfResponse[];
  onClose: () => void;
  onSave: (data: Partial<HCFAmendment>) => void;
  saving?: boolean;
}

const AmendmentFormModal = ({ amendment, companies, hcfs, onClose, onSave, saving = false }: AmendmentFormModalProps) => {
  // Initialize form data with hcfId if editing
  const getInitialFormData = (): Partial<HCFAmendment> => {
    if (amendment) {
      return {
        ...amendment,
        hcfId: amendment.hcfId,
      };
    }
    return {
      hcfId: '',
      amendmentType: '',
      amendmentDate: new Date().toISOString().split('T')[0],
      description: '',
      status: 'Active',
      approvedBy: '',
      approvedDate: '',
    };
  };

  const [formData, setFormData] = useState<Partial<HCFAmendment>>(getInitialFormData());
  
  // Initialize selectedCompanyId from amendment's HCF
  const getInitialCompanyId = (): string => {
    if (amendment && amendment.hcfId) {
      const hcf = hcfs.find(h => h.id === amendment.hcfId);
      return hcf?.companyId || '';
    }
    return '';
  };
  
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(getInitialCompanyId());

  // Update hcfId when company changes
  useEffect(() => {
    if (selectedCompanyId && !amendment) {
      setFormData(prev => ({ ...prev, hcfId: '' }));
    }
  }, [selectedCompanyId, amendment]);

  // Update selectedCompanyId when HCFs load and we're editing
  useEffect(() => {
    if (amendment && amendment.hcfId && hcfs.length > 0 && !selectedCompanyId) {
      const hcf = hcfs.find(h => h.id === amendment.hcfId);
      if (hcf) {
        setSelectedCompanyId(hcf.companyId);
      }
    }
  }, [amendment, hcfs, selectedCompanyId]);

  // Filter HCFs based on selected company
  const filteredHCFs = selectedCompanyId
    ? hcfs.filter(hcf => hcf.companyId === selectedCompanyId && hcf.status === 'Active')
    : hcfs;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hcfId) {
      alert('Please select an HCF');
      return;
    }
    if (!formData.amendmentType) {
      alert('Amendment type is required');
      return;
    }
    if (!formData.amendmentDate) {
      alert('Amendment date is required');
      return;
    }
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
                <label>Company *</label>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    setFormData({ ...formData, hcfId: '' });
                  }}
                  required
                  disabled={!!amendment}
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>HCF *</label>
                <select
                  value={formData.hcfId || ''}
                  onChange={(e) => setFormData({ ...formData, hcfId: e.target.value })}
                  required
                  disabled={!selectedCompanyId && !amendment}
                >
                  <option value="">Select HCF</option>
                  {filteredHCFs.length === 0 && (selectedCompanyId || amendment) ? (
                    <option value="" disabled>No HCFs available for selected company</option>
                  ) : (
                    filteredHCFs.map((hcf) => (
                      <option key={hcf.id} value={hcf.id}>
                        {hcf.hcfCode} - {hcf.hcfName}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="form-group">
                <label>Amendment Type *</label>
                <input
                  type="text"
                  value={formData.amendmentType || ''}
                  onChange={(e) => setFormData({ ...formData, amendmentType: e.target.value })}
                  required
                  placeholder="Enter amendment type"
                />
              </div>
              <div className="form-group">
                <label>Amendment Date *</label>
                <input
                  type="date"
                  value={formData.amendmentDate || ''}
                  onChange={(e) => setFormData({ ...formData, amendmentDate: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="form-section">
            <h3 className="form-section-title">Description</h3>
            <div className="form-grid">
              <div className="form-group form-group--full">
                <label>Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter amendment description"
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Approval Information */}
          <div className="form-section">
            <h3 className="form-section-title">Approval Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status || 'Pending'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="form-group">
                <label>Approved By</label>
                <input
                  type="text"
                  value={formData.approvedBy || ''}
                  onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })}
                  placeholder="Enter approver name or ID"
                />
              </div>
              <div className="form-group">
                <label>Approved Date</label>
                <input
                  type="date"
                  value={formData.approvedDate || ''}
                  onChange={(e) => setFormData({ ...formData, approvedDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving...' : (amendment ? 'Update' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HCFAmendmentsPage;
