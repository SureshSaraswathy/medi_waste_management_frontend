import { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { downtimeRegisterService, DowntimeRegisterResponse } from '../../services/downtimeRegisterService';
import { companyService, CompanyResponse } from '../../services/companyService';
import NotificationBell from '../../components/NotificationBell';
import './downtimeRegisterPage.css';
import '../desktop/dashboardPage.css';

interface DowntimeRegister {
  id: string;
  dtRegNum: string;
  companyId: string;
  companyName: string;
  breakdownDate: string;
  equipmentId: string;
  breakdownType: string;
  startTime: string;
  endTime: string;
  downtimeHours: number;
  cause: string;
  actionTaken: string;
  sparesUsed: string;
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
  dtRegNum: string;
  companyName: string;
  equipmentId: string;
  breakdownType: string;
  complianceStatus: string;
}

const DowntimeRegisterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingDowntime, setEditingDowntime] = useState<DowntimeRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    dtRegNum: '',
    companyName: '',
    equipmentId: '',
    breakdownType: '',
    complianceStatus: '',
  });

  // Master data
  const [companies, setCompanies] = useState<Company[]>([]);
  const [downtimes, setDowntimes] = useState<DowntimeRegister[]>([]);

  // Load companies
  const loadCompanies = useCallback(async () => {
    try {
      const apiCompanies = await companyService.getAllCompanies(true);
      const mappedCompanies: Company[] = (apiCompanies || []).map((c: CompanyResponse) => ({
        id: c.id,
        companyCode: c.companyCode,
        companyName: c.companyName,
        status: c.status,
      }));
      setCompanies(mappedCompanies);
    } catch (err) {
      console.error('Error loading companies:', err);
      setCompanies([]);
    }
  }, []);

  // Load downtimes
  const loadDowntimes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiDowntimes = await downtimeRegisterService.getAllDowntimeRegisters(
        undefined,
        statusFilter !== 'all' ? statusFilter : undefined
      );

      // Map backend response to frontend format with names
      const mappedDowntimes: DowntimeRegister[] = await Promise.all(
        (apiDowntimes || []).map(async (apiDowntime: DowntimeRegisterResponse) => {
          const company = companies.find(c => c.id === apiDowntime.companyId);

          return {
            id: apiDowntime.id,
            dtRegNum: apiDowntime.dtRegNum,
            companyId: apiDowntime.companyId,
            companyName: company?.companyName || 'Unknown',
            breakdownDate: apiDowntime.breakdownDate,
            equipmentId: apiDowntime.equipmentId,
            breakdownType: apiDowntime.breakdownType,
            startTime: apiDowntime.startTime,
            endTime: apiDowntime.endTime,
            downtimeHours: apiDowntime.downtimeHours,
            cause: apiDowntime.cause,
            actionTaken: apiDowntime.actionTaken,
            sparesUsed: apiDowntime.sparesUsed,
            complianceStatus: apiDowntime.complianceStatus,
            status: apiDowntime.status,
            createdBy: apiDowntime.createdBy,
            createdOn: apiDowntime.createdOn,
            modifiedBy: apiDowntime.modifiedBy,
            modifiedOn: apiDowntime.modifiedOn,
          };
        })
      );
      setDowntimes(mappedDowntimes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load downtime registers';
      setError(errorMessage);
      console.error('Error loading downtime registers:', err);
      setDowntimes([]);
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

  // Load downtimes when dependencies are ready
  useEffect(() => {
    if (companies.length > 0) {
      loadDowntimes();
    }
  }, [companies, statusFilter, loadDowntimes]);

  const filteredDowntimes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const dtRegNumQuery = advancedFilters.dtRegNum.trim().toLowerCase();
    const companyQuery = advancedFilters.companyName.trim().toLowerCase();
    const equipmentQuery = advancedFilters.equipmentId.trim().toLowerCase();
    const breakdownTypeQuery = advancedFilters.breakdownType.trim().toLowerCase();
    const complianceQuery = advancedFilters.complianceStatus.trim().toLowerCase();

    return downtimes.filter((downtime) => {
      // Top search box: broad match across key fields
      const matchesSearch =
        !query ||
        downtime.dtRegNum.toLowerCase().includes(query) ||
        downtime.companyName.toLowerCase().includes(query) ||
        downtime.equipmentId.toLowerCase().includes(query) ||
        downtime.breakdownType.toLowerCase().includes(query);

      // Advanced filters
      const matchesDtRegNum = !dtRegNumQuery || downtime.dtRegNum.toLowerCase().includes(dtRegNumQuery);
      const matchesCompany = !companyQuery || downtime.companyName.toLowerCase().includes(companyQuery);
      const matchesEquipment = !equipmentQuery || downtime.equipmentId.toLowerCase().includes(equipmentQuery);
      const matchesBreakdownType = !breakdownTypeQuery || downtime.breakdownType.toLowerCase().includes(breakdownTypeQuery);
      const matchesCompliance = !complianceQuery || downtime.complianceStatus.toLowerCase().includes(complianceQuery);
      const matchesStatus = statusFilter === 'all' || downtime.status === statusFilter;

      return matchesSearch && matchesDtRegNum && matchesCompany && matchesEquipment && matchesBreakdownType && matchesCompliance && matchesStatus;
    });
  }, [downtimes, searchQuery, advancedFilters, statusFilter]);

  const handleAdd = () => {
    setEditingDowntime(null);
    setShowModal(true);
  };

  const handleEdit = (downtime: DowntimeRegister) => {
    setEditingDowntime(downtime);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this downtime register?')) {
      try {
        setLoading(true);
        setError(null);
        await downtimeRegisterService.deleteDowntimeRegister(id);
        setSuccessMessage('Downtime register deleted successfully');
        await loadDowntimes();
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete downtime register';
        setError(errorMessage);
        console.error('Error deleting downtime register:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (data: Partial<DowntimeRegister>) => {
    try {
      setLoading(true);
      setError(null);

      if (editingDowntime) {
        // Update existing downtime
        await downtimeRegisterService.updateDowntimeRegister(editingDowntime.id, {
          breakdownDate: data.breakdownDate,
          equipmentId: data.equipmentId,
          breakdownType: data.breakdownType,
          startTime: data.startTime,
          endTime: data.endTime,
          downtimeHours: data.downtimeHours,
          cause: data.cause,
          actionTaken: data.actionTaken,
          sparesUsed: data.sparesUsed,
          complianceStatus: data.complianceStatus,
          status: data.status,
        });
        setSuccessMessage('Downtime register updated successfully');
      } else {
        // Create new downtime
        const selectedCompany = companies.find(c => c.id === data.companyId);
        if (!selectedCompany) {
          setError('Please select a valid company');
          return;
        }

        await downtimeRegisterService.createDowntimeRegister({
          companyId: selectedCompany.id,
          breakdownDate: data.breakdownDate!,
          equipmentId: data.equipmentId!,
          breakdownType: data.breakdownType!,
          startTime: data.startTime!,
          endTime: data.endTime!,
          downtimeHours: data.downtimeHours!,
          cause: data.cause!,
          actionTaken: data.actionTaken!,
          sparesUsed: data.sparesUsed!,
          complianceStatus: data.complianceStatus || 'Compliant',
          status: data.status || 'Active',
        });
        setSuccessMessage('Downtime register created successfully');
      }

      setShowModal(false);
      setEditingDowntime(null);
      await loadDowntimes();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save downtime register';
      setError(errorMessage);
      console.error('Error saving downtime register:', err);
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
            {(navItems || []).map((item) => (
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
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">Home &nbsp;&gt;&nbsp; Downtime Register</span>
          </div>
          <div className="header-right">
            <NotificationBell />
          </div>
        </header>

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
        {loading && !downtimes.length && (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            Loading downtime registers...
          </div>
        )}

        <div className="route-assignment-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
                <path d="M8 12h8"></path>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Downtime Register</h1>
              <p className="ra-page-subtitle">Manage and track equipment downtime and breakdowns</p>
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
                placeholder="Search by register number, company, equipment, breakdown type..."
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
                Add Downtime
              </button>
            </div>
          </div>

          {/* Downtimes Table */}
          <div className="route-assignment-table-container">
            <table className="route-assignment-table">
              <thead>
                <tr>
                  <th>REG NUM</th>
                  <th>COMPANY</th>
                  <th>BREAKDOWN DATE</th>
                  <th>EQUIPMENT ID</th>
                  <th>BREAKDOWN TYPE</th>
                  <th>START TIME</th>
                  <th>END TIME</th>
                  <th>DOWNTIME (HRS)</th>
                  <th>CAUSE</th>
                  <th>COMPLIANCE STATUS</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredDowntimes.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="empty-message">
                      {loading ? 'Loading...' : 'No downtime registers found'}
                    </td>
                  </tr>
                ) : (
                  filteredDowntimes.map((downtime) => {
                    // Format date to DD/MM/YYYY
                    const formatDate = (dateString: string) => {
                      const date = new Date(dateString);
                      const day = String(date.getDate()).padStart(2, '0');
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    };

                    return (
                      <tr key={downtime.id}>
                        <td>{downtime.dtRegNum}</td>
                        <td>{downtime.companyName}</td>
                        <td>{formatDate(downtime.breakdownDate)}</td>
                        <td>{downtime.equipmentId}</td>
                        <td>{downtime.breakdownType}</td>
                        <td>{downtime.startTime}</td>
                        <td>{downtime.endTime}</td>
                        <td>{downtime.downtimeHours.toFixed(2)}</td>
                        <td>{downtime.cause}</td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge ${getComplianceBadgeClass(downtime.complianceStatus)}`}>
                              {downtime.complianceStatus}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="ra-cell-center">
                            <span className={`status-badge status-badge--${downtime.status.toLowerCase()}`}>
                              {downtime.status}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="action-buttons ra-actions">
                            <button
                              className="action-btn action-btn--view"
                              onClick={() => handleEdit(downtime)}
                              title="View"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--edit"
                              onClick={() => handleEdit(downtime)}
                              title="Edit"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              className="action-btn action-btn--delete"
                              onClick={() => handleDelete(downtime.id)}
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
            Showing {filteredDowntimes.length} of {downtimes.length} items
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
            setAdvancedFilters({ dtRegNum: '', companyName: '', equipmentId: '', breakdownType: '', complianceStatus: '' });
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

      {/* Downtime Add/Edit Modal */}
      {showModal && (
        <DowntimeFormModal
          downtime={editingDowntime}
          companies={companies.filter(c => c.status === 'Active')}
          onClose={() => {
            setShowModal(false);
            setEditingDowntime(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// Downtime Form Modal Component
interface DowntimeFormModalProps {
  downtime: DowntimeRegister | null;
  companies: Company[];
  onClose: () => void;
  onSave: (data: Partial<DowntimeRegister>) => void;
}

const DowntimeFormModal = ({
  downtime,
  companies,
  onClose,
  onSave,
}: DowntimeFormModalProps) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [causeType, setCauseType] = useState<string>('');

  // Get current time in HH:MM format
  const getCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState<Partial<DowntimeRegister>>(
    downtime || {
      companyId: '',
      breakdownDate: new Date().toISOString().split('T')[0],
      equipmentId: '',
      breakdownType: '',
      startTime: getCurrentTime(),
      endTime: '',
      downtimeHours: 0,
      cause: '',
      actionTaken: '',
      sparesUsed: '',
      complianceStatus: 'Compliant',
      status: 'Active',
    }
  );

  // Initialize cause type
  useEffect(() => {
    if (downtime?.cause) {
      const predefinedCauses = [
        'Mechanical Failure',
        'Electrical Fault',
        'Component Wear',
        'Lubrication Issue',
        'Calibration Error',
        'Operator Error',
        'Power Failure',
        'Sensor Malfunction',
      ];
      if (predefinedCauses.includes(downtime.cause)) {
        setCauseType(downtime.cause);
      } else {
        setCauseType('Other');
      }
    } else if (!downtime) {
      setCauseType('');
    }
  }, [downtime]);

  // Running timer when End Time is empty
  useEffect(() => {
    if (!formData.endTime && formData.startTime) {
      const interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
    }
  }, [formData.endTime, formData.startTime]);

  // Calculate downtime hours when start/end times change
  useEffect(() => {
    if (formData.startTime && formData.endTime) {
      const start = new Date(`2000-01-01T${formData.startTime}`);
      const end = new Date(`2000-01-01T${formData.endTime}`);
      if (end < start) {
        end.setDate(end.getDate() + 1);
      }
      const diffMs = end.getTime() - start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      setFormData(prev => ({ ...prev, downtimeHours: parseFloat(diffHours.toFixed(2)) }));
    } else if (!formData.endTime && formData.startTime && elapsedSeconds > 0) {
      const start = new Date(`2000-01-01T${formData.startTime}`);
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const end = new Date(`2000-01-01T${currentTime}`);
      if (end < start) {
        end.setDate(end.getDate() + 1);
      }
      const diffMs = end.getTime() - start.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      setFormData(prev => ({ ...prev, downtimeHours: parseFloat(diffHours.toFixed(2)) }));
    }
  }, [formData.startTime, formData.endTime, elapsedSeconds]);

  // Auto-select status based on End Time
  useEffect(() => {
    if (!formData.endTime) {
      setFormData(prev => ({ ...prev, status: 'Active' }));
    } else {
      setFormData(prev => ({ ...prev, status: 'Inactive' }));
    }
  }, [formData.endTime]);

  const handleCauseChange = (value: string) => {
    setCauseType(value);
    if (value !== 'Other') {
      setFormData(prev => ({ ...prev, cause: value }));
    } else {
      setFormData(prev => ({ ...prev, cause: '' }));
    }
  };

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure cause is set correctly based on causeType
    let finalCause = formData.cause;
    if (causeType && causeType !== 'Other') {
      finalCause = causeType;
    }
    // Validate cause field
    if (!causeType || (causeType === 'Other' && !finalCause)) {
      return;
    }
    // Submit with correct cause value
    onSave({ ...formData, cause: finalCause });
  };

  return (
    <div className="modal-overlay ra-assignment-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-assignment-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ra-assignment-modal-header">
          <div className="ra-assignment-modal-titlewrap">
            <div className="ra-assignment-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
                <path d="M8 12h8"></path>
              </svg>
            </div>
            <div>
              <h2 className="ra-assignment-modal-title">
                {downtime ? 'Edit Downtime Register' : 'Add Downtime Register'}
              </h2>
              <p className="ra-assignment-modal-subtitle">
                {downtime ? 'Update downtime details' : 'Create a new downtime register.'}
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
        <form className="ra-assignment-form dt-compact-form" onSubmit={handleSubmit}>
          <div className="dt-form-sections">
            {/* GROUP 1: EQUIPMENT */}
            <div className="dt-form-section-group">
              <div className="dt-section-separator"></div>
              <div className="dt-form-grid">
                <div className="dt-form-row">
                  <label htmlFor="company">
                    Company <span className="ra-required">*</span>
                  </label>
                  <select
                    id="company"
                    value={formData.companyId || ''}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                    required
                    disabled={!!downtime}
                    className="dt-form-input"
                  >
                    <option value="">Select Company</option>
                    {(companies || []).map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.companyName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="dt-form-row">
                  <label htmlFor="equipment-id">
                    Equipment ID <span className="ra-required">*</span>
                  </label>
                  <input
                    id="equipment-id"
                    type="text"
                    value={formData.equipmentId || ''}
                    onChange={(e) => setFormData({ ...formData, equipmentId: e.target.value })}
                    required
                    className="dt-form-input"
                    placeholder="Enter equipment ID"
                  />
                </div>
                <div className="dt-form-row">
                  <label htmlFor="breakdown-type">
                    Breakdown Type <span className="ra-required">*</span>
                  </label>
                  <select
                    id="breakdown-type"
                    value={formData.breakdownType || ''}
                    onChange={(e) => setFormData({ ...formData, breakdownType: e.target.value })}
                    required
                    className="dt-form-input"
                  >
                    <option value="">Select Type</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Software">Software</option>
                    <option value="Preventive Maintenance">Preventive Maintenance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* GROUP 2: TIME */}
            <div className="dt-form-section-group">
              <div className="dt-section-separator"></div>
              <div className="dt-form-grid">
                <div className="dt-form-row">
                  <label htmlFor="breakdown-date">
                    Breakdown Date <span className="ra-required">*</span>
                  </label>
                  <input
                    id="breakdown-date"
                    type="date"
                    value={formData.breakdownDate || ''}
                    onChange={(e) => setFormData({ ...formData, breakdownDate: e.target.value })}
                    required
                    className="dt-form-input"
                  />
                </div>
                <div className="dt-form-row dt-form-row-time">
                  <label>
                    Time <span className="ra-required">*</span>
                  </label>
                  <div className="dt-time-grid">
                    <label htmlFor="start-time">
                      Start Time <span className="ra-required">*</span>
                    </label>
                    <input
                      id="start-time"
                      type="time"
                      value={formData.startTime || ''}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                      className="dt-form-input"
                    />
                    <label htmlFor="end-time">End Time</label>
                    <div>
                      <input
                        id="end-time"
                        type="time"
                        value={formData.endTime || ''}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="dt-form-input"
                      />
                      {!formData.endTime && formData.startTime ? (
                        <div className="dt-duration-status">
                          <span className="dt-running-badge">
                            <span className="dt-running-dot"></span>
                            Running {formatElapsedTime(elapsedSeconds)}
                          </span>
                        </div>
                      ) : formData.endTime ? (
                        <div className="dt-duration-status">
                          <span className="dt-duration-text">
                            {(formData.downtimeHours || 0).toFixed(2)} hrs
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* GROUP 3: REASON */}
            <div className="dt-form-section-group">
              <div className="dt-section-separator"></div>
              <div className="dt-form-grid">
                <div className="dt-form-row">
                  <label htmlFor="cause-type">
                    Cause <span className="ra-required">*</span>
                  </label>
                  <div>
                    <select
                      id="cause-type"
                      value={causeType}
                      onChange={(e) => handleCauseChange(e.target.value)}
                      required
                      className="dt-form-input"
                    >
                      <option value="">Select Cause</option>
                      <option value="Mechanical Failure">Mechanical Failure</option>
                      <option value="Electrical Fault">Electrical Fault</option>
                      <option value="Component Wear">Component Wear</option>
                      <option value="Lubrication Issue">Lubrication Issue</option>
                      <option value="Calibration Error">Calibration Error</option>
                      <option value="Operator Error">Operator Error</option>
                      <option value="Power Failure">Power Failure</option>
                      <option value="Sensor Malfunction">Sensor Malfunction</option>
                      <option value="Other">Other</option>
                    </select>
                    {causeType === 'Other' && (
                      <textarea
                        id="cause"
                        value={formData.cause || ''}
                        onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
                        required
                        className="dt-form-input dt-form-textarea"
                        placeholder="Enter cause"
                        rows={2}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* GROUP 4: RESOLUTION */}
            <div className="dt-form-section-group">
              <div className="dt-section-separator"></div>
              <div className="dt-form-grid">
                <div className="dt-form-row">
                  <label htmlFor="action-taken">
                    Action Taken <span className="ra-required">*</span>
                  </label>
                  <textarea
                    id="action-taken"
                    value={formData.actionTaken || ''}
                    onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                    required
                    className="dt-form-input dt-form-textarea"
                    placeholder="Enter action taken"
                    rows={2}
                  />
                </div>
                <div className="dt-form-row">
                  <label htmlFor="spares-used">
                    Spares Used <span className="ra-required">*</span>
                  </label>
                  <input
                    id="spares-used"
                    type="text"
                    value={formData.sparesUsed || ''}
                    onChange={(e) => setFormData({ ...formData, sparesUsed: e.target.value })}
                    required
                    className="dt-form-input"
                    placeholder="Enter spares used"
                  />
                </div>
                <div className="dt-form-row">
                  <label htmlFor="compliance-status">Compliance Status</label>
                  <select
                    id="compliance-status"
                    value={formData.complianceStatus || 'Compliant'}
                    onChange={(e) => setFormData({ ...formData, complianceStatus: e.target.value })}
                    className="dt-form-input"
                  >
                    <option value="Compliant">Compliant</option>
                    <option value="Non-Compliant">Non-Compliant</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="ra-assignment-modal-footer dt-modal-footer">
            <button type="button" className="ra-assignment-btn ra-assignment-btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="ra-assignment-btn ra-assignment-btn--primary">
              {downtime ? 'Update Downtime' : 'Create Downtime'}
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
              <div className="ra-filter-subtitle">Filter downtime registers by multiple criteria</div>
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
                value={draft.dtRegNum}
                onChange={(e) => setDraft({ ...draft, dtRegNum: e.target.value })}
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
              <label>Equipment ID</label>
              <input
                type="text"
                value={draft.equipmentId}
                onChange={(e) => setDraft({ ...draft, equipmentId: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter equipment ID"
              />
            </div>

            <div className="ra-filter-field">
              <label>Breakdown Type</label>
              <input
                type="text"
                value={draft.breakdownType}
                onChange={(e) => setDraft({ ...draft, breakdownType: e.target.value })}
                className="ra-filter-input"
                placeholder="Enter breakdown type"
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
              setDraft({ dtRegNum: '', companyName: '', equipmentId: '', breakdownType: '', complianceStatus: '' });
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

export default DowntimeRegisterPage;
