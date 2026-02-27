import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { wasteProcessService, WasteProcessResponse, CreateWasteProcessRequest, UpdateWasteProcessRequest } from '../../services/wasteProcessService';
import { companyService, CompanyResponse } from '../../services/companyService';
import PageHeader from '../../components/layout/PageHeader';
import './wasteProcessPage.css';
import '../desktop/dashboardPage.css';

interface WasteProcess {
  id: string;
  companyId: string;
  companyName: string;
  processDate: string;
  incinerationWeightKg: number;
  autoclaveWeightKg: number;
  status: 'Draft' | 'Submitted' | 'Verified' | 'Closed';
  notes?: string | null;
  createdOn: string;
}

const WasteProcessPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [processToDelete, setProcessToDelete] = useState<WasteProcess | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<WasteProcess | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Master data
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [processes, setProcesses] = useState<WasteProcess[]>([]);

  // Form state
  const [formData, setFormData] = useState<CreateWasteProcessRequest & { editingId?: string; editingStatus?: 'Draft' | 'Submitted' | 'Verified' | 'Closed' }>({
    companyId: '',
    processDate: new Date().toISOString().split('T')[0],
    incinerationWeightKg: 0,
    autoclaveWeightKg: 0,
    notes: null,
  });

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

  // Load processes
  const loadProcesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = selectedDate;
      const endDate = selectedDate;
      
      const apiProcesses = await wasteProcessService.getAllProcesses(
        undefined,
        startDate,
        endDate,
        statusFilter !== 'all' ? statusFilter : undefined
      );
      
      const mappedProcesses: WasteProcess[] = apiProcesses.map((apiProcess: WasteProcessResponse) => {
        const company = companies.find(c => c.id === apiProcess.companyId);
        return {
          id: apiProcess.id,
          companyId: apiProcess.companyId,
          companyName: company?.companyName || 'Unknown',
          processDate: apiProcess.processDate,
          incinerationWeightKg: Number(apiProcess.incinerationWeightKg) || 0,
          autoclaveWeightKg: Number(apiProcess.autoclaveWeightKg) || 0,
          status: apiProcess.status,
          notes: apiProcess.notes,
          createdOn: apiProcess.createdOn,
        };
      });
      setProcesses(mappedProcesses);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load processes';
      setError(errorMessage);
      console.error('Error loading processes:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, statusFilter, companies]);

  // Load data on mount
  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Load processes when dependencies are ready
  useEffect(() => {
    if (companies.length > 0) {
      loadProcesses();
    }
  }, [selectedDate, statusFilter, companies, loadProcesses]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.companyId) {
      setError('Please select a company');
      return;
    }
    if (formData.incinerationWeightKg <= 0) {
      setError('Incineration weight must be greater than zero');
      return;
    }
    if (formData.autoclaveWeightKg <= 0) {
      setError('Autoclave weight must be greater than zero');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (formData.editingId) {
        const updateData: UpdateWasteProcessRequest = {
          incinerationWeightKg: Number(formData.incinerationWeightKg),
          autoclaveWeightKg: Number(formData.autoclaveWeightKg),
          notes: formData.notes,
        };
        await wasteProcessService.updateProcess(formData.editingId, updateData);
        setSuccessMessage('Process updated successfully');
      } else {
        const createData: CreateWasteProcessRequest = {
          companyId: formData.companyId,
          processDate: formData.processDate,
          incinerationWeightKg: Number(formData.incinerationWeightKg),
          autoclaveWeightKg: Number(formData.autoclaveWeightKg),
          notes: formData.notes,
        };
        await wasteProcessService.createProcess(createData);
        setSuccessMessage('Process created successfully');
      }

      await loadProcesses();
      setShowFormModal(false);
      resetForm();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save process';
      setError(errorMessage);
      console.error('Error saving process:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (processId: string, action: 'submit' | 'verify' | 'close') => {
    try {
      setLoading(true);
      setError(null);
      if (action === 'submit') {
        await wasteProcessService.submitProcess(processId);
        setSuccessMessage('Process submitted successfully');
      } else if (action === 'verify') {
        await wasteProcessService.verifyProcess(processId);
        setSuccessMessage('Process verified successfully');
      } else {
        await wasteProcessService.closeProcess(processId);
        setSuccessMessage('Process closed successfully');
      }
      await loadProcesses();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      setError(errorMessage);
      console.error('Error updating status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (process: WasteProcess) => {
    setProcessToDelete(process);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!processToDelete) return;
    try {
      setLoading(true);
      setError(null);
      await wasteProcessService.deleteProcess(processToDelete.id);
      setSuccessMessage('Process deleted successfully');
      await loadProcesses();
      setShowDeleteModal(false);
      setProcessToDelete(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete process';
      setError(errorMessage);
      console.error('Error deleting process:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (process: WasteProcess) => {
    setFormData({
      companyId: process.companyId,
      processDate: process.processDate,
      incinerationWeightKg: process.incinerationWeightKg,
      autoclaveWeightKg: process.autoclaveWeightKg,
      notes: process.notes,
      editingId: process.id,
      editingStatus: process.status,
    });
    setShowFormModal(true);
  };

  const handleViewDetails = (process: WasteProcess) => {
    setSelectedProcess(process);
    setShowDetailModal(true);
  };

  const resetForm = () => {
    setFormData({
      companyId: '',
      processDate: new Date().toISOString().split('T')[0],
      incinerationWeightKg: 0,
      autoclaveWeightKg: 0,
      notes: null,
      editingId: undefined,
      editingStatus: undefined,
    });
  };

  // Filter processes by search query
  const filteredProcesses = processes.filter((process) => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        process.companyName.toLowerCase().includes(query);
      
      if (!matchesSearch) {
        return false;
      }
    }
    
    return true;
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'status-badge status-badge--draft';
      case 'Submitted':
        return 'status-badge status-badge--submitted';
      case 'Verified':
        return 'status-badge status-badge--verified';
      case 'Closed':
        return 'status-badge status-badge--closed';
      default:
        return 'status-badge';
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

      <main className="dashboard-main">
        <PageHeader 
          title="Waste Processing"
          subtitle="Manage waste processing records"
        />

        {/* Success Message */}
        {successMessage && (
          <div className="success-banner">
            <span>{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} aria-label="Close success message">×</button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Close error message">×</button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !processes.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading processes...
          </div>
        )}

        <div className="waste-process-page">
          {/* Page Header */}
          <div className="wp-page-header">
            <div className="wp-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
            </div>
            <h1 className="wp-page-title">Waste Processing</h1>
          </div>

          {/* Filters */}
          <div className="wp-filters-toolbar">
            <div className="wp-filter-group">
              <label htmlFor="process-date">Process Date</label>
              <div className="wp-date-input-wrapper">
                <svg className="wp-date-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <input
                  id="process-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="wp-date-input"
                />
              </div>
            </div>
            <div className="wp-filter-group">
              <label htmlFor="status-filter">Status</label>
              <div className="wp-select-wrapper">
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="wp-status-select"
                >
                  <option value="all">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Verified">Verified</option>
                  <option value="Closed">Closed</option>
                </select>
                <svg className="wp-select-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
            <div className="wp-filter-group wp-filter-group--search">
              <label htmlFor="search">Search</label>
              <div className="wp-search-box">
                <svg className="wp-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  id="search"
                  type="text"
                  placeholder="Search by company name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="wp-search-input"
                />
              </div>
            </div>
            <div className="wp-filter-group wp-filter-group--action">
              <button className="wp-add-process-btn" onClick={() => { resetForm(); setShowFormModal(true); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Process
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="table-container">
            {filteredProcesses.length === 0 ? (
              <div className="empty-state">
                <p>No processes found</p>
              </div>
            ) : (
              <table className="wp-data-table">
                <thead>
                  <tr>
                    <th>PROCESS DATE</th>
                    <th>COMPANY</th>
                    <th>INCINERATION WEIGHT (KG)</th>
                    <th>AUTOCLAVE WEIGHT (KG)</th>
                    <th>TOTAL WEIGHT (KG)</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProcesses.map((process) => {
                    const processDate = new Date(process.processDate);
                    const formattedDate = `${String(processDate.getDate()).padStart(2, '0')}/${String(processDate.getMonth() + 1).padStart(2, '0')}/${processDate.getFullYear()}`;
                    return (
                      <tr key={process.id}>
                        <td>{formattedDate}</td>
                        <td>{process.companyName}</td>
                        <td>{process.incinerationWeightKg.toFixed(1)}</td>
                        <td>{process.autoclaveWeightKg.toFixed(1)}</td>
                        <td>{(Number(process.incinerationWeightKg) + Number(process.autoclaveWeightKg)).toFixed(1)}</td>
                        <td>
                          <span className={getStatusBadgeClass(process.status)}>
                            {process.status === 'Submitted' ? 'SUBMITTED' : 
                             process.status === 'Verified' ? 'COMPLETED' : 
                             process.status === 'Draft' ? 'IN PROGRESS' : 
                             process.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="wp-action-buttons">
                            <button
                              className="wp-action-btn wp-action-btn--view"
                              onClick={() => handleViewDetails(process)}
                              title="View Details"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            {process.status === 'Draft' && (
                              <>
                                <button
                                  className="wp-action-btn wp-action-btn--edit"
                                  onClick={() => handleEdit(process)}
                                  title="Edit"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                                <button
                                  className="wp-action-btn wp-action-btn--delete"
                                  onClick={() => handleDeleteClick(process)}
                                  title="Delete"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {filteredProcesses.length > 0 && (
            <div className="table-footer">
              Showing {filteredProcesses.length} of {processes.length} Items
            </div>
          )}
        </div>
      </main>

      {/* Form Modal */}
      {showFormModal && (
        <div className="wp-modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="wp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="wp-modal-header">
              <div className="wp-modal-header-left">
                <div className={`wp-modal-icon ${formData.editingId ? 'wp-modal-icon--edit' : 'wp-modal-icon--add'}`}>
                  {formData.editingId ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  )}
                </div>
                <h2 className="wp-modal-title">{formData.editingId ? 'Edit Process' : 'Add Process'}</h2>
              </div>
              <button className="wp-modal-close" onClick={() => setShowFormModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="wp-modal-body">
                <div className="wp-form-group">
                  <label htmlFor="companyId">Company <span className="wp-required">*</span></label>
                  <div className="wp-input-wrapper">
                    <svg className="wp-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                    <select
                      id="companyId"
                      value={formData.companyId}
                      onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                      required
                      disabled={!!formData.editingId}
                      className="wp-form-select"
                    >
                      <option value="">Select Company</option>
                      {companies.filter(c => c.status === 'Active').map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.companyName}
                        </option>
                      ))}
                    </select>
                    <svg className="wp-select-arrow-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>

                <div className="wp-form-group">
                  <label htmlFor="processDate">Process Date <span className="wp-required">*</span></label>
                  <div className="wp-input-wrapper">
                    <svg className="wp-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <input
                      id="processDate"
                      type="date"
                      value={formData.processDate}
                      onChange={(e) => setFormData({ ...formData, processDate: e.target.value })}
                      required
                      disabled={!!formData.editingId}
                      className="wp-form-input"
                    />
                  </div>
                </div>

                <div className="wp-form-row">
                  <div className="wp-form-group">
                    <label htmlFor="incinerationWeightKg">Incineration Weight (kg) <span className="wp-required">*</span></label>
                    <div className="wp-input-wrapper">
                      <svg className="wp-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.6 1.5-3.5 3.5-5.5z"></path>
                      </svg>
                      <input
                        id="incinerationWeightKg"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.incinerationWeightKg}
                        onChange={(e) => setFormData({ ...formData, incinerationWeightKg: parseFloat(e.target.value) || 0 })}
                        required
                        disabled={!!formData.editingId && formData.editingStatus !== 'Draft'}
                        className="wp-form-input"
                      />
                    </div>
                  </div>
                  <div className="wp-form-group">
                    <label htmlFor="autoclaveWeightKg">Autoclave Weight (kg) <span className="wp-required">*</span></label>
                    <div className="wp-input-wrapper">
                      <svg className="wp-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2.69c-3.5 0-6.5 3-6.5 6.5 0 4.5 6.5 10.5 6.5 10.5s6.5-6 6.5-10.5c0-3.5-3-6.5-6.5-6.5z"></path>
                      </svg>
                      <input
                        id="autoclaveWeightKg"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={formData.autoclaveWeightKg}
                        onChange={(e) => setFormData({ ...formData, autoclaveWeightKg: parseFloat(e.target.value) || 0 })}
                        required
                        disabled={!!formData.editingId && formData.editingStatus !== 'Draft'}
                        className="wp-form-input"
                      />
                    </div>
                  </div>
                </div>

                <div className="wp-form-group">
                  <label htmlFor="notes">Notes</label>
                  <div className="wp-textarea-wrapper">
                    <svg className="wp-textarea-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <textarea
                      id="notes"
                      rows={3}
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                      disabled={!!formData.editingId && formData.editingStatus !== 'Draft'}
                      className="wp-form-textarea"
                    />
                  </div>
                </div>
              </div>
              <div className="wp-modal-footer">
                <button type="button" className="wp-btn wp-btn--cancel" onClick={() => setShowFormModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="wp-btn wp-btn--save" disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedProcess && (
        <div className="wp-modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="wp-modal-content wp-modal-content--view" onClick={(e) => e.stopPropagation()}>
            <div className="wp-modal-header">
              <div className="wp-modal-header-left">
                <div className="wp-modal-icon wp-modal-icon--view">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </div>
                <h2 className="wp-modal-title">View Process</h2>
              </div>
              <button className="wp-modal-close" onClick={() => setShowDetailModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="wp-modal-body">
              <div className="wp-detail-grid">
                <div className="wp-detail-item">
                  <label>Company</label>
                  <span>{selectedProcess.companyName}</span>
                </div>
                <div className="wp-detail-item">
                  <label>Process Date</label>
                  <span>{(() => {
                    const date = new Date(selectedProcess.processDate);
                    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                  })()}</span>
                </div>
                <div className="wp-detail-item">
                  <label>Incineration Weight (kg)</label>
                  <span>{selectedProcess.incinerationWeightKg.toFixed(1)}</span>
                </div>
                <div className="wp-detail-item">
                  <label>Autoclave Weight (kg)</label>
                  <span>{selectedProcess.autoclaveWeightKg.toFixed(1)}</span>
                </div>
                <div className="wp-detail-item">
                  <label>Total Weight (kg)</label>
                  <span>{(Number(selectedProcess.incinerationWeightKg) + Number(selectedProcess.autoclaveWeightKg)).toFixed(1)}</span>
                </div>
                <div className="wp-detail-item">
                  <label>Status</label>
                  <span className={getStatusBadgeClass(selectedProcess.status)}>
                    {selectedProcess.status === 'Submitted' ? 'SUBMITTED' : 
                     selectedProcess.status === 'Verified' ? 'COMPLETED' : 
                     selectedProcess.status === 'Draft' ? 'IN PROGRESS' : 
                     selectedProcess.status.toUpperCase()}
                  </span>
                </div>
                <div className="wp-detail-item wp-detail-item--full">
                  <label>Notes</label>
                  <span>{selectedProcess.notes || '-'}</span>
                </div>
              </div>
            </div>
            <div className="wp-modal-footer">
              <button type="button" className="wp-btn wp-btn--close" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && processToDelete && (
        <div className="wp-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="wp-modal-content wp-modal-content--delete" onClick={(e) => e.stopPropagation()}>
            <div className="wp-modal-header">
              <div className="wp-modal-header-left">
                <div className="wp-modal-icon wp-modal-icon--delete">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </div>
                <h2 className="wp-modal-title">Delete Process</h2>
              </div>
              <button className="wp-modal-close" onClick={() => setShowDeleteModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="wp-modal-body">
              <p className="wp-delete-message">
                Are you sure you want to delete the process for <strong>{processToDelete.companyName}</strong>?
              </p>
            </div>
            <div className="wp-modal-footer">
              <button type="button" className="wp-btn wp-btn--cancel" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button type="button" className="wp-btn wp-btn--delete" onClick={handleDeleteConfirm} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WasteProcessPage;
