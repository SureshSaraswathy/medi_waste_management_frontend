import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { etpRegisterService, ETPRegisterResponse } from '../../services/etpRegisterService';
import { companyService, CompanyResponse } from '../../services/companyService';
import PageHeader from '../../components/layout/PageHeader';
import './etpRegisterPage.css';
import '../desktop/dashboardPage.css';

interface ETPRegister {
  id: string;
  etpRegNum: string;
  companyId: string;
  companyName: string;
  date: string;
  inflow: number;
  treated: number;
  ph: number;
  bod: number;
  cod: number;
  tss: number;
  oilGrease: number;
  dischargeMode: string;
  complianceStatus: string;
  status: 'Active' | 'Inactive';
  createdBy?: string | null;
  createdOn: string;
  modifiedBy?: string | null;
  modifiedOn: string;
}

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  status: 'Active' | 'Inactive';
}

interface AdvancedFilters {
  etpRegNum: string;
  companyName: string;
  dischargeMode: string;
  complianceStatus: string;
}

const ETPRegisterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingETP, setEditingETP] = useState<ETPRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    etpRegNum: '',
    companyName: '',
    dischargeMode: '',
    complianceStatus: '',
  });

  // Master data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [etpRegisters, setEtpRegisters] = useState<ETPRegister[]>([]);

  // Load companies
  const loadCompanies = useCallback(async () => {
    try {
      const apiCompanies = await companyService.getAllCompanies(true);
      const mappedCompanies: Company[] = apiCompanies.map((c: CompanyResponse) => ({
        id: c.id,
        companyCode: c.companyCode,
        companyName: c.companyName,
        status: c.status,
      }));
      setCompanies(mappedCompanies);
    } catch (err) {
      console.error('Error loading companies:', err);
    }
  }, []);

  // Load ETP registers
  const loadETPRegisters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiETPs = await etpRegisterService.getAllETPRegisters(
        undefined,
        statusFilter !== 'all' ? statusFilter : undefined
      );

      // Map backend response to frontend format with names
      const mappedETPs: ETPRegister[] = await Promise.all(
        apiETPs.map(async (apiETP: ETPRegisterResponse) => {
          const company = companies.find(c => c.id === apiETP.companyId);

          return {
            id: apiETP.id,
            etpRegNum: apiETP.etpRegNum,
            companyId: apiETP.companyId,
            companyName: company?.companyName || 'Unknown',
            date: apiETP.date,
            inflow: apiETP.inflow,
            treated: apiETP.treated,
            ph: apiETP.ph,
            bod: apiETP.bod,
            cod: apiETP.cod,
            tss: apiETP.tss,
            oilGrease: apiETP.oilGrease,
            dischargeMode: apiETP.dischargeMode,
            complianceStatus: apiETP.complianceStatus,
            status: apiETP.status,
            createdBy: apiETP.createdBy,
            createdOn: apiETP.createdOn,
            modifiedBy: apiETP.modifiedBy,
            modifiedOn: apiETP.modifiedOn,
          };
        })
      );
      setEtpRegisters(mappedETPs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load ETP registers';
      setError(errorMessage);
      console.error('Error loading ETP registers:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, companies]);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      await loadCompanies();
    };
    initializeData();
  }, [loadCompanies]);

  // Load ETP registers when dependencies are ready
  useEffect(() => {
    if (companies.length > 0) {
      loadETPRegisters();
    }
  }, [companies, statusFilter, loadETPRegisters]);

  const filteredETPs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const etpRegNumQuery = advancedFilters.etpRegNum.trim().toLowerCase();
    const companyQuery = advancedFilters.companyName.trim().toLowerCase();
    const dischargeModeQuery = advancedFilters.dischargeMode.trim().toLowerCase();
    const complianceQuery = advancedFilters.complianceStatus.trim().toLowerCase();

    return etpRegisters.filter((etp) => {
      // Top search box: broad match across key fields
      const matchesSearch =
        !query ||
        etp.etpRegNum.toLowerCase().includes(query) ||
        etp.companyName.toLowerCase().includes(query) ||
        etp.dischargeMode.toLowerCase().includes(query);

      // Advanced filters
      const matchesEtpRegNum = !etpRegNumQuery || etp.etpRegNum.toLowerCase().includes(etpRegNumQuery);
      const matchesCompany = !companyQuery || etp.companyName.toLowerCase().includes(companyQuery);
      const matchesDischargeMode = !dischargeModeQuery || etp.dischargeMode.toLowerCase().includes(dischargeModeQuery);
      const matchesCompliance = !complianceQuery || etp.complianceStatus.toLowerCase().includes(complianceQuery);
      const matchesStatus = statusFilter === 'all' || etp.status === statusFilter;

      return matchesSearch && matchesEtpRegNum && matchesCompany && matchesDischargeMode && matchesCompliance && matchesStatus;
    });
  }, [etpRegisters, searchQuery, advancedFilters, statusFilter]);

  const handleAdd = () => {
    setEditingETP(null);
    setShowModal(true);
  };

  const handleEdit = (etp: ETPRegister) => {
    setEditingETP(etp);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this ETP register?')) {
      try {
        setLoading(true);
        setError(null);
        await etpRegisterService.deleteETPRegister(id);
        setSuccessMessage('ETP register deleted successfully');
        await loadETPRegisters();
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete ETP register';
        setError(errorMessage);
        console.error('Error deleting ETP register:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (data: Partial<ETPRegister>) => {
    try {
      setLoading(true);
      setError(null);

      if (editingETP) {
        // Update existing ETP
        await etpRegisterService.updateETPRegister(editingETP.id, {
          date: data.date,
          inflow: data.inflow,
          treated: data.treated,
          ph: data.ph,
          bod: data.bod,
          cod: data.cod,
          tss: data.tss,
          oilGrease: data.oilGrease,
          dischargeMode: data.dischargeMode,
          complianceStatus: data.complianceStatus,
          status: data.status,
        });
        setSuccessMessage('ETP register updated successfully');
      } else {
        // Create new ETP
        const selectedCompany = companies.find(c => c.id === data.companyId);
        if (!selectedCompany) {
          setError('Please select a valid company');
          return;
        }

        await etpRegisterService.createETPRegister({
          companyId: selectedCompany.id,
          date: data.date!,
          inflow: data.inflow!,
          treated: data.treated!,
          ph: data.ph!,
          bod: data.bod!,
          cod: data.cod!,
          tss: data.tss!,
          oilGrease: data.oilGrease!,
          dischargeMode: data.dischargeMode!,
          complianceStatus: data.complianceStatus || 'Compliant',
          status: data.status || 'Active',
        });
        setSuccessMessage('ETP register created successfully');
      }

      setShowModal(false);
      setEditingETP(null);
      await loadETPRegisters();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save ETP register';
      setError(errorMessage);
      console.error('Error saving ETP register:', err);
    } finally {
      setLoading(false);
    }
  };

  const getComplianceBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'compliant':
        return 'status-badge--compliant';
      case 'non-compliant':
        return 'status-badge--non-compliant';
      case 'pending':
        return 'status-badge--pending';
      default:
        return '';
    }
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
          title="ETP Register"
          subtitle="Manage ETP (Effluent Treatment Plant) records"
        />

        {/* Success Message */}
        {successMessage && (
          <div className="ra-alert ra-alert--success" role="status" aria-live="polite">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="ra-alert-close" aria-label="Close success message">
              ×
            </button>
          </div>
        )}

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
        {loading && !etpRegisters.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading ETP registers...
          </div>
        )}

        <div className="route-assignment-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                <path d="M12 2v4"></path>
                <path d="M12 18v4"></path>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">ETP Register</h1>
              <p className="ra-page-subtitle">Manage and track Effluent Treatment Plant operations and compliance</p>
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
                placeholder="Search by register number, company, discharge mode..."
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
                Advanced Filter
              </button>
              <button className="ra-add-btn" onClick={handleAdd}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add ETP
              </button>
            </div>
          </div>

          {/* ETP Registers Table */}
          <div className="route-assignment-table-container">
            <table className="route-assignment-table">
              <thead>
                <tr>
                  <th>REG NUM</th>
                  <th>COMPANY</th>
                  <th>DATE</th>
                  <th>INFLOW</th>
                  <th>TREATED</th>
                  <th>PH</th>
                  <th>BOD</th>
                  <th>COD</th>
                  <th>TSS</th>
                  <th>OIL/GREASE</th>
                  <th>DISCHARGE MODE</th>
                  <th>COMPLIANCE STATUS</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredETPs.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="empty-message">
                      {loading ? 'Loading...' : 'No ETP registers found'}
                    </td>
                  </tr>
                ) : (
                  filteredETPs.map((etp) => {
                    // Format date to DD/MM/YYYY
                    const formatDate = (dateString: string) => {
                      const date = new Date(dateString);
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    };

                    return (
                      <tr key={etp.id}>
                        <td>{etp.etpRegNum}</td>
                        <td>{etp.companyName}</td>
                        <td>{formatDate(etp.date)}</td>
                        <td>{etp.inflow.toFixed(2)}</td>
                        <td>{etp.treated.toFixed(2)}</td>
                        <td>{etp.ph.toFixed(2)}</td>
                        <td>{etp.bod.toFixed(2)}</td>
                        <td>{etp.cod.toFixed(2)}</td>
                        <td>{etp.tss.toFixed(2)}</td>
                        <td>{etp.oilGrease.toFixed(2)}</td>
                        <td>{etp.dischargeMode}</td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge ${getComplianceBadgeClass(etp.complianceStatus)}`}>
                              {etp.complianceStatus}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge status-badge--${etp.status.toLowerCase()}`}>
                              {etp.status}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons ra-actions">
                            <button
                              className="action-btn action-btn--view"
                              onClick={() => handleEdit(etp)}
                              title="View"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--edit"
                              onClick={() => handleEdit(etp)}
                              title="Edit"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--delete"
                              onClick={() => handleDelete(etp.id)}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="route-assignment-pagination-info">
            Showing {filteredETPs.length} of {etpRegisters.length} items
          </div>
        </div>
      </main>

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <AdvancedFiltersModal
          statusFilter={statusFilter}
          advancedFilters={advancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
          onClear={() => {
            setAdvancedFilters({ etpRegNum: '', companyName: '', dischargeMode: '', complianceStatus: '' });
            setStatusFilter('all');
            setSearchQuery('');
          }}
          onApply={(payload) => {
            setStatusFilter(payload.statusFilter);
            setAdvancedFilters(payload.advancedFilters);
            setShowAdvancedFilters(false);
          }}
        />
      )}

      {/* ETP Add/Edit Modal */}
      {showModal && (
        <ETPFormModal
          etp={editingETP}
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingETP(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// ETP Form Modal Component
interface ETPFormModalProps {
  etp: ETPRegister | null;
  companies: Company[];
  onClose: () => void;
  onSave: (data: Partial<ETPRegister>) => void;
}

const ETPFormModal = ({
  etp,
  companies,
  onClose,
  onSave,
}: ETPFormModalProps) => {
  const [formData, setFormData] = useState<Partial<ETPRegister>>(
    etp || {
      companyId: '',
      date: new Date().toISOString().split('T')[0],
      inflow: 0,
      treated: 0,
      ph: 0,
      bod: 0,
      cod: 0,
      tss: 0,
      oilGrease: 0,
      dischargeMode: '',
      complianceStatus: 'Compliant',
      status: 'Active',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay ra-assignment-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-assignment-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ra-assignment-modal-header">
          <div className="ra-assignment-modal-titlewrap">
            <div className="ra-assignment-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                <path d="M12 2v4"></path>
                <path d="M12 18v4"></path>
              </svg>
            </div>
            <div>
              <h2 className="ra-assignment-modal-title">
                {etp ? 'Edit ETP Register' : 'Add ETP Register'}
              </h2>
              <p className="ra-assignment-modal-subtitle">
                {etp ? 'Update ETP details' : 'Create a new ETP register.'}
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

        {/* Form */}
        <form className="ra-assignment-form" onSubmit={handleSubmit}>
          <div className="ra-assignment-form-grid">
            {/* Left Column */}
            <div className="ra-assignment-form-col">
              <div className="ra-assignment-form-group">
                <label htmlFor="company">
                  Company Name <span className="ra-required">*</span>
                </label>
                <select
                  id="company"
                  value={formData.companyId || ''}
                  onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  required
                  disabled={!!etp}
                  className="ra-assignment-select"
                >
                  <option value="">Select Company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="date">
                  Date <span className="ra-required">*</span>
                </label>
                <input
                  id="date"
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="ra-assignment-input"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="inflow">
                  Inflow <span className="ra-required">*</span>
                </label>
                <input
                  id="inflow"
                  type="number"
                  step="0.01"
                  value={formData.inflow || 0}
                  onChange={(e) => setFormData({ ...formData, inflow: parseFloat(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0.00"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="treated">
                  Treated <span className="ra-required">*</span>
                </label>
                <input
                  id="treated"
                  type="number"
                  step="0.01"
                  value={formData.treated || 0}
                  onChange={(e) => setFormData({ ...formData, treated: parseFloat(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0.00"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="ph">
                  pH <span className="ra-required">*</span>
                </label>
                <input
                  id="ph"
                  type="number"
                  step="0.01"
                  value={formData.ph || 0}
                  onChange={(e) => setFormData({ ...formData, ph: parseFloat(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0.00"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="bod">
                  BOD <span className="ra-required">*</span>
                </label>
                <input
                  id="bod"
                  type="number"
                  step="0.01"
                  value={formData.bod || 0}
                  onChange={(e) => setFormData({ ...formData, bod: parseFloat(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0.00"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="cod">
                  COD <span className="ra-required">*</span>
                </label>
                <input
                  id="cod"
                  type="number"
                  step="0.01"
                  value={formData.cod || 0}
                  onChange={(e) => setFormData({ ...formData, cod: parseFloat(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="ra-assignment-form-col">
              <div className="ra-assignment-form-group">
                <label htmlFor="tss">
                  TSS <span className="ra-required">*</span>
                </label>
                <input
                  id="tss"
                  type="number"
                  step="0.01"
                  value={formData.tss || 0}
                  onChange={(e) => setFormData({ ...formData, tss: parseFloat(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0.00"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="oil-grease">
                  Oil/Grease <span className="ra-required">*</span>
                </label>
                <input
                  id="oil-grease"
                  type="number"
                  step="0.01"
                  value={formData.oilGrease || 0}
                  onChange={(e) => setFormData({ ...formData, oilGrease: parseFloat(e.target.value) || 0 })}
                  required
                  className="ra-assignment-input"
                  placeholder="0.00"
                />
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="discharge-mode">
                  Discharge Mode <span className="ra-required">*</span>
                </label>
                <select
                  id="discharge-mode"
                  value={formData.dischargeMode || ''}
                  onChange={(e) => setFormData({ ...formData, dischargeMode: e.target.value })}
                  required
                  className="ra-assignment-select"
                >
                  <option value="">Select Discharge Mode</option>
                  <option value="Surface Water">Surface Water</option>
                  <option value="Ground Water">Ground Water</option>
                  <option value="Sewer">Sewer</option>
                  <option value="Reuse">Reuse</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="compliance-status">Compliance Status</label>
                <select
                  id="compliance-status"
                  value={formData.complianceStatus || 'Compliant'}
                  onChange={(e) => setFormData({ ...formData, complianceStatus: e.target.value })}
                  className="ra-assignment-select"
                >
                  <option value="Compliant">Compliant</option>
                  <option value="Non-Compliant">Non-Compliant</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div className="ra-assignment-form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={formData.status || 'Active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                  className="ra-assignment-select"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="ra-assignment-modal-footer">
            <button type="button" className="ra-assignment-btn ra-assignment-btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="ra-assignment-btn ra-assignment-btn--primary">
              {etp ? 'Update ETP' : 'Create ETP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Advanced Filters Modal Component
interface AdvancedFiltersModalProps {
  statusFilter: string;
  advancedFilters: AdvancedFilters;
  onClose: () => void;
  onClear: () => void;
  onApply: (payload: { statusFilter: string; advancedFilters: AdvancedFilters }) => void;
}

const AdvancedFiltersModal = ({
  statusFilter,
  advancedFilters,
  onClose,
  onClear,
  onApply,
}: AdvancedFiltersModalProps) => {
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draft, setDraft] = useState<AdvancedFilters>(advancedFilters);

  return (
    <div className="modal-overlay ra-filter-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ra-filter-modal-header">
          <div className="ra-filter-modal-titlewrap">
            <div className="ra-filter-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 3H2l8 9v7l4 2v-9l8-9z"></path>
              </svg>
            </div>
            <div>
              <div className="ra-filter-title">Advanced Filters</div>
              <div className="ra-filter-subtitle">Filter ETP registers by multiple criteria</div>
            </div>
          </div>
          <button className="ra-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="ra-filter-modal-body">
          <div className="ra-filter-grid">
            <div className="ra-filter-field">
              <label>Register Number</label>
              <input
                type="text"
                value={draft.etpRegNum}
                onChange={(e) => setDraft({ ...draft, etpRegNum: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter register number"
              />
            </div>

            <div className="ra-filter-field">
              <label>Company Name</label>
              <input
                type="text"
                value={draft.companyName}
                onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter company name"
              />
            </div>

            <div className="ra-filter-field">
              <label>Discharge Mode</label>
              <input
                type="text"
                value={draft.dischargeMode}
                onChange={(e) => setDraft({ ...draft, dischargeMode: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter discharge mode"
              />
            </div>

            <div className="ra-filter-field">
              <label>Compliance Status</label>
              <select
                value={draft.complianceStatus}
                onChange={(e) => setDraft({ ...draft, complianceStatus: e.target.value })}
                className="ra-filter-select"
              >
                <option value="">All Status</option>
                <option value="Compliant">Compliant</option>
                <option value="Non-Compliant">Non-Compliant</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div className="ra-filter-field">
              <label>Status</label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
                className="ra-filter-select"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="ra-filter-modal-footer">
          <button
            type="button"
            className="ra-link-btn"
            onClick={() => {
              setDraftStatus('all');
              setDraft({ etpRegNum: '', companyName: '', dischargeMode: '', complianceStatus: '' });
              onClear();
            }}
          >
            Clear Filters
          </button>
          <button
            type="button"
            className="ra-btn ra-btn--primary ra-btn--sm"
            onClick={() =>
              onApply({
                statusFilter: draftStatus,
                advancedFilters: draft,
              })
            }
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default ETPRegisterPage;
