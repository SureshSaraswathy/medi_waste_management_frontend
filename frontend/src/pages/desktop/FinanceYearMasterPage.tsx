import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { financeYearService, FinanceYearResponse } from '../../services/financeYearService';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import PageHeader from '../../components/layout/PageHeader';
import '../desktop/dashboardPage.css';
import './financeYearMasterPage.css';
import toast from 'react-hot-toast';
import NotificationBell from '../../components/NotificationBell';

interface FinanceYear {
  id: string;
  finYear: string; // Format: YYYY-YY (e.g., 2025-26)
  fyStartDate: string; // ISO date string
  fyEndDate: string; // ISO date string
  status: 'Active' | 'Inactive';
  createdBy: string | null;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string;
}

const FinanceYearMasterPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [editingFinanceYear, setEditingFinanceYear] = useState<FinanceYear | null>(null);
  const [financeYears, setFinanceYears] = useState<FinanceYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  interface AdvancedFilters {
    finYear: string;
  }
  
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    finYear: '',
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load finance years from API
  const loadFinanceYears = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiFinanceYears = await financeYearService.getAllFinanceYears(true);
      const mappedFinanceYears: FinanceYear[] = apiFinanceYears.map((apiFY: FinanceYearResponse) => ({
        id: apiFY.id,
        finYear: apiFY.finYear,
        fyStartDate: apiFY.fyStartDate,
        fyEndDate: apiFY.fyEndDate,
        status: apiFY.status,
        createdBy: apiFY.createdBy,
        createdOn: apiFY.createdOn,
        modifiedBy: apiFY.modifiedBy,
        modifiedOn: apiFY.modifiedOn,
      }));
      setFinanceYears(mappedFinanceYears);
    } catch (err: any) {
      // Handle endpoint not found gracefully
      if (err?.isEndpointMissing || err?.status === 404) {
        console.warn('⚠️ Finance Year API endpoint not found. Backend needs to implement: GET /api/v1/finance-years');
        setFinanceYears([]);
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load finance years';
        setError(errorMessage);
        console.error('Error loading finance years:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load finance years on component mount
  useEffect(() => {
    loadFinanceYears();
  }, []);

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  const filteredFinanceYears = financeYears.filter(fy => {
    const query = searchQuery.trim().toLowerCase();
    const finYearQuery = advancedFilters.finYear.trim().toLowerCase();
    
    const matchesSearch = !query ||
      fy.finYear.toLowerCase().includes(query);
    
    const matchesFinYear = !finYearQuery || fy.finYear.toLowerCase().includes(finYearQuery);
    const matchesStatus = statusFilter === 'all' || fy.status === statusFilter;
    
    return matchesSearch && matchesFinYear && matchesStatus;
  });

  const handleAdd = () => {
    setEditingFinanceYear(null);
    setShowModal(true);
  };

  const handleEdit = (financeYear: FinanceYear) => {
    setEditingFinanceYear(financeYear);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this finance year?')) {
      try {
        setLoading(true);
        await financeYearService.deleteFinanceYear(id);
        await loadFinanceYears();
        toast.success('Finance Year deleted successfully', {
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ),
          style: {
            background: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
          },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete finance year';
        toast.error(`Error: ${errorMessage}`);
        console.error('Error deleting finance year:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async (formData: Partial<FinanceYear>) => {
    try {
      setLoading(true);
      setError(null);
      
      if (editingFinanceYear) {
        // Update existing - only status can be updated
        await financeYearService.updateFinanceYear(editingFinanceYear.id, {
          status: formData.status,
        });
        toast.success('Finance Year updated successfully.', {
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ),
          style: {
            background: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
          },
        });
      } else {
        // Add new
        if (!formData.startYear) {
          toast.error('Please enter the Start Year.');
          return;
        }
        await financeYearService.createFinanceYear({
          startYear: formData.startYear as number,
        });
        toast.success('Finance Year created successfully.', {
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ),
          style: {
            background: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
          },
        });
      }
      
      setShowModal(false);
      setEditingFinanceYear(null);
      await loadFinanceYears();
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save finance year';
      setError(errorMessage);
      
      // Handle specific error messages
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        toast.error('Finance Year already exists.');
      } else if (errorMessage.includes('Past financial years') || errorMessage.includes('past')) {
        toast.error('Past financial years cannot be created.');
      } else {
        toast.error(`Error: ${errorMessage}`);
      }
      console.error('Error saving finance year:', err);
    } finally {
      setLoading(false);
    }
  };

  // Format date for display (DD-MMM-YYYY)
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="dashboard-page">
      {/* Left Sidebar */}
      <aside className={`dashboard-sidebar sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="logo-container">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <div className="brand-text">
                <span className="brand-title">MEDI-WASTE</span>
                <span className="brand-subtitle">Enterprise Platform</span>
              </div>
            )}
          </div>

          <button
            className="toggle-button"
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              {isSidebarCollapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
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
                  {!isSidebarCollapsed && <span className="nav-label">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <NotificationBell variant="sidebar" />
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

      {/* Main Content */}
      <main className="dashboard-main">
        <PageHeader 
          title="Finance Year Master"
          subtitle="Manage finance year master data"
        />

        {/* Error Message */}
        {error && (
          <div style={{ 
            padding: '16px 20px', 
            background: '#fff3cd', 
            color: '#856404', 
            border: '1px solid #ffc107',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#856404', cursor: 'pointer' }}>×</button>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !financeYears.length && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading finance years...
          </div>
        )}

        <div className="finance-year-master-page">
          {/* Page Header */}
          <div className="ra-page-header">
            <div className="ra-header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div className="ra-header-text">
              <h1 className="ra-page-title">Finance Year Master</h1>
              <p className="ra-page-subtitle">Manage finance year information and details</p>
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
                placeholder="Search by finance year..."
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
                Add Finance Year
              </button>
            </div>
          </div>

          {/* Finance Years Table */}
          <div className="finance-year-master-table-container">
            <table className="finance-year-master-table">
              <thead>
                <tr>
                  <th>FINANCE YEAR</th>
                  <th>START DATE</th>
                  <th>END DATE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredFinanceYears.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-message">
                      {loading ? 'Loading...' : 'No finance years found'}
                    </td>
                  </tr>
                ) : (
                  filteredFinanceYears.map((fy) => (
                    <tr key={fy.id}>
                      <td>{fy.finYear || '-'}</td>
                      <td>{formatDate(fy.fyStartDate)}</td>
                      <td>{formatDate(fy.fyEndDate)}</td>
                      <td>
                        <div className="ra-cell-center">
                          <span className={`status-badge status-badge--${fy.status.toLowerCase()}`}>
                            {fy.status}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons ra-actions">
                          <button
                            className="action-btn action-btn--view"
                            onClick={() => handleEdit(fy)}
                            title="View"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--edit"
                            onClick={() => handleEdit(fy)}
                            title="Edit"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="action-btn action-btn--delete"
                            onClick={() => handleDelete(fy.id)}
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

          {/* Pagination Info */}
          <div className="cm-pagination-info">
            Showing {filteredFinanceYears.length} of {financeYears.length} items
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
            setAdvancedFilters({ finYear: '' });
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

      {/* Add/Edit Modal */}
      {showModal && (
        <FinanceYearFormModal
          financeYear={editingFinanceYear}
          onClose={() => {
            setShowModal(false);
            setEditingFinanceYear(null);
          }}
          onSave={handleSave}
        />
      )}
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
    <div className="modal-overlay cm-filter-modal-overlay" onClick={onClose}>
      <div className="modal-content cm-filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cm-filter-modal-header">
          <div className="cm-filter-modal-titlewrap">
            <div className="cm-filter-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
            </div>
            <div>
              <div className="cm-filter-title">Advanced Filters</div>
              <div className="cm-filter-subtitle">Filter finance years by multiple criteria</div>
            </div>
          </div>
          <button className="cm-filter-close" onClick={onClose} aria-label="Close filters">
            ×
          </button>
        </div>

        <div className="cm-filter-modal-body">
          <div className="cm-filter-grid">
            <div className="cm-filter-field">
              <label>Finance Year</label>
              <input
                type="text"
                value={draft.finYear}
                onChange={(e) => setDraft({ ...draft, finYear: e.target.value })}
                className="cm-filter-input"
                placeholder="Enter finance year (e.g., 2025-26)"
              />
            </div>

            <div className="cm-filter-field">
              <label>Status</label>
              <select
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
                className="cm-filter-input"
              >
                <option value="all">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        <div className="cm-filter-modal-footer">
          <button type="button" className="btn btn--secondary cm-filter-btn" onClick={onClear}>
            Clear All
          </button>
          <div>
            <button type="button" className="btn btn--secondary cm-filter-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn--primary cm-filter-btn"
              onClick={() => onApply({ statusFilter: draftStatus, advancedFilters: draft })}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Finance Year Form Modal Component
interface FinanceYearFormModalProps {
  financeYear: FinanceYear | null;
  onClose: () => void;
  onSave: (data: Partial<FinanceYear & { startYear?: number }>) => void;
}

const FinanceYearFormModal = ({ financeYear, onClose, onSave }: FinanceYearFormModalProps) => {
  const [startYear, setStartYear] = useState<string>('');
  const [finYear, setFinYear] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Generate Finance Year, Start Date, and End Date from Start Year
  useEffect(() => {
    if (startYear && startYear.length === 4) {
      const year = parseInt(startYear);
      if (!isNaN(year) && year >= 2000 && year <= 2100) {
        // Generate Finance Year (YYYY-YY format)
        const endYearShort = (year + 1) % 100;
        const generatedFinYear = `${year}-${endYearShort.toString().padStart(2, '0')}`;
        setFinYear(generatedFinYear);

        // Generate Start Date (01-Apr-YYYY)
        const startDateObj = new Date(year, 3, 1); // Month 3 = April (0-indexed)
        setStartDate(startDateObj.toISOString().split('T')[0]);

        // Generate End Date (31-Mar-YYYY+1)
        const endDateObj = new Date(year + 1, 2, 31); // Month 2 = March (0-indexed)
        setEndDate(endDateObj.toISOString().split('T')[0]);
      }
    } else {
      setFinYear('');
      setStartDate('');
      setEndDate('');
    }
  }, [startYear]);

  // Load existing finance year data when editing
  useEffect(() => {
    if (financeYear) {
      // Extract start year from finance year string (e.g., "2025-26" -> 2025)
      const startYearFromFinYear = financeYear.finYear.split('-')[0];
      setStartYear(startYearFromFinYear);
      setFinYear(financeYear.finYear);
      setStartDate(financeYear.fyStartDate);
      setEndDate(financeYear.fyEndDate);
      setStatus(financeYear.status);
    } else {
      // Reset form for new finance year
      setStartYear('');
      setFinYear('');
      setStartDate('');
      setEndDate('');
      setStatus('Active');
    }
  }, [financeYear]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!financeYear && !startYear) {
      toast.error('Please enter the Start Year.');
      return;
    }

    if (financeYear) {
      // Update: only status can be updated
      onSave({ status });
    } else {
      // Create: send start year
      onSave({ startYear: parseInt(startYear) });
    }
  };

  // Format date for display (DD-MMM-YYYY)
  const formatDateDisplay = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="modal-overlay ra-assignment-modal-overlay" onClick={onClose}>
      <div className="modal-content ra-assignment-modal template-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header ra-assignment-modal-header">
          <div className="ra-assignment-modal-titlewrap">
            <div className="ra-assignment-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div>
              <h2 className="modal-title ra-assignment-modal-title">{financeYear ? 'Edit Finance Year' : 'Add Finance Year'}</h2>
              <p className="ra-assignment-modal-subtitle">{financeYear ? 'Update finance year details.' : 'Create a new finance year record.'}</p>
            </div>
          </div>
          <button className="modal-close-btn ra-assignment-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form className="finance-year-form ra-assignment-form" onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-grid ra-assignment-form-grid">
              <div className="form-group">
                <label>Start Year *</label>
                <input
                  type="number"
                  value={startYear}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || (value.length <= 4 && /^\d+$/.test(value))) {
                      setStartYear(value);
                    }
                  }}
                  required
                  min="2000"
                  max="2100"
                  disabled={!!financeYear} // Disable when editing (immutable field)
                  style={financeYear ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                  placeholder="e.g., 2025"
                />
                {!financeYear && (
                  <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                    Enter the start year (e.g., 2025). Finance Year, Start Date, and End Date will be auto-generated.
                  </small>
                )}
              </div>
              <div className="form-group">
                <label>Finance Year</label>
                <input
                  type="text"
                  value={finYear}
                  readOnly
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  placeholder="Auto-generated (e.g., 2025-26)"
                />
                <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                  Auto-generated from Start Year
                </small>
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="text"
                  value={startDate ? formatDateDisplay(startDate) : ''}
                  readOnly
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  placeholder="Auto-generated (e.g., 01-Apr-2025)"
                />
                <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                  Auto-generated: 01-Apr-{startYear || 'YYYY'}
                </small>
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="text"
                  value={endDate ? formatDateDisplay(endDate) : ''}
                  readOnly
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  placeholder="Auto-generated (e.g., 31-Mar-2026)"
                />
                <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                  Auto-generated: 31-Mar-{startYear ? parseInt(startYear) + 1 : 'YYYY'}
                </small>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer ra-assignment-modal-footer">
            <button type="button" className="btn btn--secondary ra-assignment-btn ra-assignment-btn--cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary ra-assignment-btn ra-assignment-btn--primary">
              {financeYear ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FinanceYearMasterPage;
