import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { 
  complianceRegisterService, 
  ComplianceRegisterResponse,
  ComplianceRegisterFilters 
} from '../../services/complianceRegisterService';
import PageHeader from '../../components/layout/PageHeader';
import { notifySuccess, notifyError, notifyWarning, notifyLoading, notifyUpdate } from '../../utils/notify';
import './complianceRegisterPage.css';
import '../desktop/dashboardPage.css';

interface ComplianceRegister {
  id: string;
  complianceName: string;
  complianceType: string;
  authority: string;
  referenceNumber?: string | null;
  issueDate: string;
  expiryDate?: string | null;
  reminderDays?: number | null;
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Draft';
  documentUrl?: string | null;
  remarks?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdvancedFilters {
  status: string;
  authority: string;
  complianceType: string;
  dateFrom: string;
  dateTo: string;
  showExpired: boolean;
}

const ComplianceRegisterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCompliance, setEditingCompliance] = useState<ComplianceRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    status: '',
    authority: '',
    complianceType: '',
    dateFrom: '',
    dateTo: '',
    showExpired: false,
  });
  const [compliances, setCompliances] = useState<ComplianceRegister[]>([]);

  // Load compliances
  const loadCompliances = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: ComplianceRegisterFilters = {};
      if (advancedFilters.status) filters.status = advancedFilters.status;
      if (advancedFilters.authority) filters.authority = advancedFilters.authority;
      if (advancedFilters.complianceType) filters.complianceType = advancedFilters.complianceType;
      if (advancedFilters.dateFrom) filters.dateFrom = advancedFilters.dateFrom;
      if (advancedFilters.dateTo) filters.dateTo = advancedFilters.dateTo;
      if (advancedFilters.showExpired) filters.showExpired = true;
      if (searchQuery) filters.search = searchQuery;

      const data = await complianceRegisterService.getAllComplianceRegisters(
        Object.keys(filters).length > 0 ? filters : undefined
      );

      // Calculate status based on expiry date
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const mappedCompliances: ComplianceRegister[] = data.map((item: ComplianceRegisterResponse) => {
        let calculatedStatus = item.status;
        
        if (item.expiryDate) {
          const expiryDate = new Date(item.expiryDate);
          expiryDate.setHours(0, 0, 0, 0);
          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilExpiry < 0) {
            calculatedStatus = 'Expired';
          } else if (daysUntilExpiry <= 30) {
            calculatedStatus = 'Expiring Soon';
          } else if (item.status !== 'Draft') {
            calculatedStatus = 'Active';
          }
        }

        return {
          id: item.id,
          complianceName: item.complianceName,
          complianceType: item.complianceType,
          authority: item.authority,
          referenceNumber: item.referenceNumber,
          issueDate: item.issueDate,
          expiryDate: item.expiryDate,
          reminderDays: item.reminderDays,
          status: calculatedStatus as 'Active' | 'Expiring Soon' | 'Expired' | 'Draft',
          documentUrl: item.documentUrl,
          remarks: item.remarks,
          createdBy: item.createdBy,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      });

      setCompliances(mappedCompliances);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load compliance records';
      setError(errorMessage);
      notifyError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, advancedFilters]);

  // Initialize data
  useEffect(() => {
    loadCompliances();
  }, [loadCompliances]);

  const filteredCompliances = useMemo(() => {
    return compliances.filter((compliance) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        compliance.complianceName.toLowerCase().includes(query) ||
        compliance.authority.toLowerCase().includes(query) ||
        (compliance.referenceNumber && compliance.referenceNumber.toLowerCase().includes(query)) ||
        compliance.complianceType.toLowerCase().includes(query);

      return matchesSearch;
    });
  }, [compliances, searchQuery]);

  const handleAdd = () => {
    setEditingCompliance(null);
    setShowModal(true);
  };

  const handleView = (compliance: ComplianceRegister) => {
    setEditingCompliance(compliance);
    setShowModal(true);
  };

  const handleEdit = (compliance: ComplianceRegister) => {
    setEditingCompliance(compliance);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this compliance record?')) {
      return;
    }

    const loadingToast = notifyLoading('Deleting compliance record...');
    try {
      await complianceRegisterService.deleteComplianceRegister(id);
      notifyUpdate(loadingToast, 'Compliance record deleted successfully', 'success');
      await loadCompliances();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete compliance record';
      notifyUpdate(loadingToast, errorMessage, 'error');
    }
  };

  const handleDownload = async (compliance: ComplianceRegister) => {
    if (!compliance.documentUrl) {
      notifyWarning('No document available for download');
      return;
    }

    const loadingToast = notifyLoading('Downloading document...');
    try {
      const blob = await complianceRegisterService.downloadDocument(compliance.documentUrl);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${compliance.complianceName}_${compliance.referenceNumber || compliance.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      notifyUpdate(loadingToast, 'Document downloaded successfully', 'success');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to download document';
      notifyUpdate(loadingToast, errorMessage, 'error');
    }
  };

  const handleSave = async (data: Partial<ComplianceRegister>) => {
    const loadingToast = notifyLoading(editingCompliance ? 'Updating compliance record...' : 'Creating compliance record...');
    setLoading(true);
    setError(null);

    try {
      if (editingCompliance) {
        await complianceRegisterService.updateComplianceRegister(editingCompliance.id, {
          complianceName: data.complianceName,
          complianceType: data.complianceType,
          authority: data.authority,
          referenceNumber: data.referenceNumber,
          issueDate: data.issueDate,
          expiryDate: data.expiryDate,
          reminderDays: data.reminderDays,
          status: data.status,
          documentUrl: data.documentUrl,
          remarks: data.remarks,
        });
        notifyUpdate(loadingToast, 'Compliance record updated successfully', 'success');
      } else {
        await complianceRegisterService.createComplianceRegister({
          complianceName: data.complianceName || '',
          complianceType: data.complianceType || '',
          authority: data.authority || '',
          referenceNumber: data.referenceNumber,
          issueDate: data.issueDate || '',
          expiryDate: data.expiryDate,
          reminderDays: data.reminderDays,
          status: data.status || 'Draft',
          documentUrl: data.documentUrl,
          remarks: data.remarks,
        });
        notifyUpdate(loadingToast, 'Compliance record created successfully', 'success');
      }

      await loadCompliances();
      setShowModal(false);
      setEditingCompliance(null);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to save compliance record';
      notifyUpdate(loadingToast, errorMessage, 'error');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-badge--active';
      case 'expiring soon':
        return 'status-badge--expiring';
      case 'expired':
        return 'status-badge--expired';
      case 'draft':
        return 'status-badge--draft';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

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
        <PageHeader 
          title="Compliance Register"
          subtitle="Manage compliance records and regulatory documentation"
          breadcrumbOnly
          breadcrumbItems={[
            {
              label: 'Home',
              onClick: () => navigate('/dashboard'),
              isCurrent: false,
            },
            {
              label: 'Transactions',
              onClick: () => navigate('/transaction'),
              isCurrent: false,
            },
            {
              label: 'Compliance Register',
              isCurrent: true,
            },
          ]}
        />

        {/* Error Message */}
        {error && (
          <div className="ra-alert ra-alert--error" role="alert">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ra-alert-close" aria-label="Close error message">
              ×
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !compliances.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading compliance records...
          </div>
        )}

        <div className="route-assignment-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M9 15l2 2 4-4"></path>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Compliance Register</h1>
              <p className="ra-page-subtitle">Manage compliance records and regulatory documentation</p>
            </div>
          </div>

          {/* Search and Actions */}
          <div className="ra-search-actions">
            <div className="ra-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                placeholder="Search by compliance name, authority, document number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ra-search-input"
              />
            </div>
            <div className="ra-actions">
              <button className="ra-filter-btn" onClick={() => setShowAdvancedFilters(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                Filter
              </button>
              <button className="ra-add-btn" onClick={handleAdd}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                + New Compliance
              </button>
            </div>
          </div>

          {/* Compliance Table */}
          <div className="route-assignment-table-container">
            <table className="route-assignment-table">
              <thead>
                <tr>
                  <th>COMPLIANCE ID</th>
                  <th>COMPLIANCE NAME</th>
                  <th>COMPLIANCE TYPE</th>
                  <th>AUTHORITY</th>
                  <th>ISSUE DATE</th>
                  <th>EXPIRY DATE</th>
                  <th>STATUS</th>
                  <th>ATTACHMENT</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompliances.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-message">
                      {loading ? 'Loading...' : 'No compliance records found'}
                    </td>
                  </tr>
                ) : (
                  filteredCompliances.map((compliance) => (
                    <tr key={compliance.id}>
                      <td>{compliance.referenceNumber || compliance.id.slice(0, 8)}</td>
                      <td>{compliance.complianceName}</td>
                      <td>{compliance.complianceType}</td>
                      <td>{compliance.authority}</td>
                      <td>{formatDate(compliance.issueDate)}</td>
                      <td>{formatDate(compliance.expiryDate)}</td>
                      <td>
                        <div className="ra-cell-center">
                          <span className={`status-badge ${getStatusBadgeClass(compliance.status)}`}>
                            {compliance.status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="ra-cell-center">
                          {compliance.documentUrl ? (
                            <button
                              className="action-btn action-btn--download"
                              onClick={() => handleDownload(compliance)}
                              title="Download document"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                              </svg>
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons ra-actions">
                          <button
                            className="action-btn action-btn--view"
                            onClick={() => handleView(compliance)}
                            title="View"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEdit(compliance)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => handleDelete(compliance.id)}
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="route-assignment-pagination-info">
            Showing {filteredCompliances.length} of {compliances.length} items
          </div>
        </div>
      </main>

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <AdvancedFiltersModal
          advancedFilters={advancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onClear={() => {
            setAdvancedFilters({
              status: '',
              authority: '',
              complianceType: '',
              dateFrom: '',
              dateTo: '',
              showExpired: false,
            });
            setSearchQuery('');
          }}
          onApply={(filters) => {
            setAdvancedFilters(filters);
            setShowAdvancedFilters(false);
          }}
        />
      )}

      {/* Compliance Add/Edit Modal */}
      {showModal && (
        <ComplianceFormModal
          compliance={editingCompliance}
          onClose={() => {
            setShowModal(false);
            setEditingCompliance(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Advanced Filters Modal Component
interface AdvancedFiltersModalProps {
  advancedFilters: AdvancedFilters;
  onClose: () => void;
  onClear: () => void;
  onApply: (filters: AdvancedFilters) => void;
}

const AdvancedFiltersModal = ({
  advancedFilters,
  onClose,
  onClear,
  onApply,
}: AdvancedFiltersModalProps) => {
  const [filters, setFilters] = useState<AdvancedFilters>(advancedFilters);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(filters);
  };

  return (
    <div className="modal-overlay ra-assignment-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-assignment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ra-assignment-modal-header">
          <div className="ra-assignment-modal-titlewrap">
            <h2 className="ra-assignment-modal-title">Advanced Filters</h2>
          </div>
          <button className="ra-assignment-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="ra-assignment-form" onSubmit={handleSubmit}>
          <div className="ra-assignment-form-grid">
            <div className="ra-assignment-form-col">
              <div className="ra-assignment-form-group">
                <label htmlFor="filter-status">Status</label>
                <select
                  id="filter-status"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="ra-assignment-select"
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Expiring Soon">Expiring Soon</option>
                  <option value="Expired">Expired</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>

              <div className="ra-assignment-form-group">
                <label htmlFor="filter-authority">Authority</label>
                <input
                  id="filter-authority"
                  type="text"
                  value={filters.authority}
                  onChange={(e) => setFilters({ ...filters, authority: e.target.value })}
                  className="ra-assignment-input"
                  placeholder="Filter by authority"
                />
              </div>

              <div className="ra-assignment-form-group">
                <label htmlFor="filter-type">Compliance Type</label>
                <input
                  id="filter-type"
                  type="text"
                  value={filters.complianceType}
                  onChange={(e) => setFilters({ ...filters, complianceType: e.target.value })}
                  className="ra-assignment-input"
                  placeholder="Filter by type"
                />
              </div>
            </div>

            <div className="ra-assignment-form-col">
              <div className="ra-assignment-form-group">
                <label htmlFor="filter-date-from">Date From</label>
                <input
                  id="filter-date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="ra-assignment-input"
                />
              </div>

              <div className="ra-assignment-form-group">
                <label htmlFor="filter-date-to">Date To</label>
                <input
                  id="filter-date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="ra-assignment-input"
                />
              </div>

              <div className="ra-assignment-form-group">
                <label className="ra-checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.showExpired}
                    onChange={(e) => setFilters({ ...filters, showExpired: e.target.checked })}
                    className="ra-checkbox"
                  />
                  <span>Show Expired</span>
                </label>
              </div>
            </div>
          </div>

          <div className="ra-assignment-modal-footer">
            <button type="button" className="ra-assignment-btn ra-assignment-btn--secondary" onClick={onClear}>
              Clear All
            </button>
            <div>
              <button type="button" className="ra-assignment-btn ra-assignment-btn--secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="ra-assignment-btn ra-assignment-btn--primary">
                Apply Filters
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Compliance Form Modal Component
interface ComplianceFormModalProps {
  compliance: ComplianceRegister | null;
  onClose: () => void;
  onSave: (data: Partial<ComplianceRegister>) => void;
}

const ComplianceFormModal = ({
  compliance,
  onClose,
  onSave,
}: ComplianceFormModalProps) => {
  const [formData, setFormData] = useState<Partial<ComplianceRegister>>(
    compliance || {
      complianceName: '',
      complianceType: '',
      authority: '',
      referenceNumber: '',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      reminderDays: 30,
      status: 'Draft',
      documentUrl: '',
      remarks: '',
    }
  );
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.complianceName?.trim()) {
      errors.complianceName = 'Compliance Name is required';
    }
    if (!formData.complianceType?.trim()) {
      errors.complianceType = 'Compliance Type is required';
    }
    if (!formData.authority?.trim()) {
      errors.authority = 'Authority is required';
    }
    if (!formData.issueDate) {
      errors.issueDate = 'Issue Date is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    } else {
      notifyWarning('Please fill in all required fields');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real implementation, you would upload the file to a server
      // and get back a URL. For now, we'll just store the file name.
      notifyInfo('File upload functionality will be implemented with backend integration');
      // setFormData({ ...formData, documentUrl: file.name });
    }
  };

  return (
    <div className="modal-overlay ra-assignment-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-assignment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ra-assignment-modal-header">
          <div className="ra-assignment-modal-titlewrap">
            <div className="ra-assignment-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <path d="M9 15l2 2 4-4"></path>
              </svg>
            </div>
            <div>
              <h2 className="ra-assignment-modal-title">
                {compliance ? 'Edit Compliance Record' : 'Add Compliance Record'}
              </h2>
              <p className="ra-assignment-modal-subtitle">
                {compliance ? 'Update compliance details' : 'Create a new compliance record.'}
              </p>
            </div>
          </div>
          <button className="ra-assignment-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="ra-assignment-form" onSubmit={handleSubmit}>
          <div className="ra-assignment-form-grid">
            <div className="ra-assignment-form-col">
              <div className="ra-assignment-form-group">
                <label htmlFor="compliance-name">
                  Compliance Name <span className="ra-required">*</span>
                </label>
                <input
                  id="compliance-name"
                  type="text"
                  value={formData.complianceName || ''}
                  onChange={(e) => setFormData({ ...formData, complianceName: e.target.value })}
                  required
                  className={`ra-assignment-input ${validationErrors.complianceName ? 'ra-input-error' : ''}`}
                  placeholder="Enter compliance name"
                />
                {validationErrors.complianceName && (
                  <span className="ra-error-message">{validationErrors.complianceName}</span>
                )}
              </div>

              <div className="ra-assignment-form-group">
                <label htmlFor="compliance-type">
                  Compliance Type <span className="ra-required">*</span>
                </label>
                <select
                  id="compliance-type"
                  value={formData.complianceType || ''}
                  onChange={(e) => setFormData({ ...formData, complianceType: e.target.value })}
                  required
                  className={`ra-assignment-select ${validationErrors.complianceType ? 'ra-input-error' : ''}`}
                >
                  <option value="">Select Type</option>
                  <option value="Audit">Audit</option>
                  <option value="Inspection">Inspection</option>
                  <option value="Certificate">Certificate</option>
                  <option value="License">License</option>
                  <option value="Permit">Permit</option>
                  <option value="Environmental">Environmental</option>
                  <option value="Safety">Safety</option>
                  <option value="Other">Other</option>
                </select>
                {validationErrors.complianceType && (
                  <span className="ra-error-message">{validationErrors.complianceType}</span>
                )}
              </div>

              <div className="ra-assignment-form-group">
                <label htmlFor="authority">
                  Regulatory Authority <span className="ra-required">*</span>
                </label>
                <input
                  id="authority"
                  type="text"
                  value={formData.authority || ''}
                  onChange={(e) => setFormData({ ...formData, authority: e.target.value })}
                  required
                  className={`ra-assignment-input ${validationErrors.authority ? 'ra-input-error' : ''}`}
                  placeholder="Enter regulatory authority"
                />
                {validationErrors.authority && (
                  <span className="ra-error-message">{validationErrors.authority}</span>
                )}
              </div>

              <div className="ra-assignment-form-group">
                <label htmlFor="reference-number">Reference Number</label>
                <input
                  id="reference-number"
                  type="text"
                  value={formData.referenceNumber || ''}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="ra-assignment-input"
                  placeholder="Enter reference number"
                />
              </div>

              <div className="ra-assignment-form-group">
                <label htmlFor="issue-date">
                  Issue Date <span className="ra-required">*</span>
                </label>
                <input
                  id="issue-date"
                  type="date"
                  value={formData.issueDate || ''}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  required
                  className={`ra-assignment-input ${validationErrors.issueDate ? 'ra-input-error' : ''}`}
                />
                {validationErrors.issueDate && (
                  <span className="ra-error-message">{validationErrors.issueDate}</span>
                )}
              </div>
            </div>

            <div className="ra-assignment-form-col">
              <div className="ra-assignment-form-group">
                <label htmlFor="expiry-date">Expiry Date</label>
                <input
                  id="expiry-date"
                  type="date"
                  value={formData.expiryDate || ''}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  className="ra-assignment-input"
                />
              </div>

              <div className="ra-assignment-form-group">
                <label htmlFor="reminder-days">Reminder Before (days)</label>
                <input
                  id="reminder-days"
                  type="number"
                  value={formData.reminderDays || 30}
                  onChange={(e) => setFormData({ ...formData, reminderDays: parseInt(e.target.value) || 30 })}
                  className="ra-assignment-input"
                  min="1"
                  placeholder="30"
                />
              </div>

              <div className="ra-assignment-form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={formData.status || 'Draft'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="ra-assignment-select"
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Expiring Soon">Expiring Soon</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <div className="ra-assignment-form-group">
                <label htmlFor="document-upload">Upload Document</label>
                <input
                  id="document-upload"
                  type="file"
                  onChange={handleFileUpload}
                  className="ra-assignment-input"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                {formData.documentUrl && (
                  <span className="ra-file-name" style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Current: {formData.documentUrl}
                  </span>
                )}
              </div>

              <div className="ra-assignment-form-group ra-assignment-form-group--full">
                <label htmlFor="remarks">Remarks</label>
                <textarea
                  id="remarks"
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="ra-assignment-input"
                  rows={4}
                  placeholder="Enter any additional remarks"
                />
              </div>
            </div>
          </div>

          <div className="ra-assignment-modal-footer">
            <button type="button" className="ra-assignment-btn ra-assignment-btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="ra-assignment-btn ra-assignment-btn--primary">
              {compliance ? 'Update Compliance' : 'Save Compliance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplianceRegisterPage;
