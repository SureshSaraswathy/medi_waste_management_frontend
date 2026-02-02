import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { wasteProcessService, WasteProcessResponse, CreateWasteProcessRequest, UpdateWasteProcessRequest } from '../../services/wasteProcessService';
import { companyService, CompanyResponse } from '../../services/companyService';
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

  const handleDelete = async (processId: string) => {
    if (!window.confirm('Are you sure you want to delete this process?')) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await wasteProcessService.deleteProcess(processId);
      setSuccessMessage('Process deleted successfully');
      await loadProcesses();
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
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Transaction / Waste Processing</span>
          </div>
        </header>

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
          <div className="waste-process-header">
            <h1 className="waste-process-title">Waste Processing</h1>
          </div>

          {/* Filters */}
          <div className="waste-process-filters">
            <div className="filter-group">
              <label htmlFor="process-date">Process Date</label>
              <input
                id="process-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-input"
              />
            </div>
            <div className="filter-group">
              <label htmlFor="status-filter">Status</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-select"
              >
                <option value="all">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Verified">Verified</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div className="filter-group filter-group--search">
              <label htmlFor="search">Search</label>
              <div className="search-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  id="search"
                  type="text"
                  placeholder="Search by company name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>
            <div className="filter-group filter-group--action">
              <label>&nbsp;</label>
              <button className="add-process-btn" onClick={() => { resetForm(); setShowFormModal(true); }}>
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
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Company</th>
                    <th>Incineration (kg)</th>
                    <th>Autoclave (kg)</th>
                    <th>Total (kg)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProcesses.map((process) => (
                    <tr key={process.id}>
                      <td>{new Date(process.processDate).toLocaleDateString()}</td>
                      <td>{process.companyName}</td>
                      <td>{process.incinerationWeightKg.toFixed(2)}</td>
                      <td>{process.autoclaveWeightKg.toFixed(2)}</td>
                      <td>{(Number(process.incinerationWeightKg) + Number(process.autoclaveWeightKg)).toFixed(2)}</td>
                      <td>
                        <span className={getStatusBadgeClass(process.status)}>
                          {process.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-icon"
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
                                className="btn btn-icon"
                                onClick={() => handleEdit(process)}
                                title="Edit"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                              </button>
                              <button
                                className="btn btn-icon"
                                onClick={() => handleStatusChange(process.id, 'submit')}
                                title="Submit"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              </button>
                              <button
                                className="btn btn-icon btn-icon--danger"
                                onClick={() => handleDelete(process.id)}
                                title="Delete"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                              </button>
                            </>
                          )}
                          {process.status === 'Submitted' && (
                            <button
                              className="btn btn-icon"
                              onClick={() => handleStatusChange(process.id, 'verify')}
                              title="Verify"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                              </svg>
                            </button>
                          )}
                          {process.status === 'Verified' && (
                            <button
                              className="btn btn-icon"
                              onClick={() => handleStatusChange(process.id, 'close')}
                              title="Close"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 6L6 18"></path>
                                <path d="M6 6l12 12"></path>
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{formData.editingId ? 'Edit Process' : 'Add Process'}</h2>
              <button className="modal-close" onClick={() => setShowFormModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="companyId">Company *</label>
                  <select
                    id="companyId"
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    required
                    disabled={!!formData.editingId}
                  >
                    <option value="">Select Company</option>
                    {companies.filter(c => c.status === 'Active').map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="processDate">Process Date *</label>
                  <input
                    id="processDate"
                    type="date"
                    value={formData.processDate}
                    onChange={(e) => setFormData({ ...formData, processDate: e.target.value })}
                    required
                    disabled={!!formData.editingId}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="incinerationWeightKg">Incineration Weight (kg) *</label>
                    <input
                      id="incinerationWeightKg"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.incinerationWeightKg}
                      onChange={(e) => setFormData({ ...formData, incinerationWeightKg: parseFloat(e.target.value) || 0 })}
                      required
                      disabled={!!formData.editingId && formData.editingStatus !== 'Draft'}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="autoclaveWeightKg">Autoclave Weight (kg) *</label>
                    <input
                      id="autoclaveWeightKg"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.autoclaveWeightKg}
                      onChange={(e) => setFormData({ ...formData, autoclaveWeightKg: parseFloat(e.target.value) || 0 })}
                      required
                      disabled={!!formData.editingId && formData.editingStatus !== 'Draft'}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="notes">Notes</label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value || null })}
                    disabled={!!formData.editingId && formData.editingStatus !== 'Draft'}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFormModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedProcess && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-content--large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Process Details</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Company:</label>
                  <span>{selectedProcess.companyName}</span>
                </div>
                <div className="detail-item">
                  <label>Process Date:</label>
                  <span>{new Date(selectedProcess.processDate).toLocaleDateString()}</span>
                </div>
                <div className="detail-item">
                  <label>Incineration Weight:</label>
                  <span>{selectedProcess.incinerationWeightKg.toFixed(2)} kg</span>
                </div>
                <div className="detail-item">
                  <label>Autoclave Weight:</label>
                  <span>{selectedProcess.autoclaveWeightKg.toFixed(2)} kg</span>
                </div>
                <div className="detail-item">
                  <label>Total Weight:</label>
                  <span>{(Number(selectedProcess.incinerationWeightKg) + Number(selectedProcess.autoclaveWeightKg)).toFixed(2)} kg</span>
                </div>
                <div className="detail-item">
                  <label>Status:</label>
                  <span className={getStatusBadgeClass(selectedProcess.status)}>
                    {selectedProcess.status}
                  </span>
                </div>
                {selectedProcess.notes && (
                  <div className="detail-item detail-item--full">
                    <label>Notes:</label>
                    <span>{selectedProcess.notes}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WasteProcessPage;
