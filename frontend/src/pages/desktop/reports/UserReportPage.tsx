import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { userService, UserResponse } from '../../../services/userService';
import { companyService, CompanyResponse } from '../../../services/companyService';
import { roleService, RoleResponse } from '../../../services/roleService';
import AppLayout from '../../../components/layout/AppLayout';
import './userReportPage.css';

interface UserReportFilters {
  page: number;
  pageSize: number;
  createdFromDate: string;
  createdToDate: string;
  companyId: string;
  roleId: string;
  status: string;
  employmentType: string;
  searchText: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

const UserReportPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Filter state
  const [filters, setFilters] = useState<UserReportFilters>({
    page: 1,
    pageSize: 25,
    createdFromDate: '',
    createdToDate: '',
    companyId: '',
    roleId: '',
    status: 'All',
    employmentType: 'All',
    searchText: '',
    sortBy: 'createdOn',
    sortOrder: 'DESC',
  });

  // Pending filters (for Apply button)
  const [pendingFilters, setPendingFilters] = useState<Partial<UserReportFilters>>({
    createdFromDate: '',
    createdToDate: '',
    companyId: '',
    roleId: '',
    status: 'All',
    employmentType: 'All',
  });

  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const searchQuery = filters.searchText || '';

  // Data state
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const currentPage = filters.page || 1;
  const rowsPerPage = filters.pageSize || 25;

  // Refs
  const resultsRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [filterModalPosition, setFilterModalPosition] = useState<{ top: number; left: number } | null>(null);

  // Summary state
  const [summary, setSummary] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
  });

  // Load master data
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [companiesData, rolesData] = await Promise.all([
          companyService.getAllCompanies(),
          roleService.getAllRoles(),
        ]);
        setCompanies(companiesData);
        setRoles(rolesData);
      } catch (error) {
        console.error('Error loading master data:', error);
      }
    };
    loadMasterData();
  }, []);

  // Filter roles based on selected company
  const filteredRoles = filters.companyId
    ? roles.filter((role) => role.companyId === filters.companyId)
    : roles;

  // Check if any filters are applied
  const hasFiltersApplied = (): boolean => {
    return !!(
      filters.createdFromDate ||
      filters.createdToDate ||
      filters.companyId ||
      filters.roleId ||
      (filters.status && filters.status !== 'All') ||
      (filters.employmentType && filters.employmentType !== 'All') ||
      filters.searchText?.trim()
    );
  };

  // Generate context subtitle
  const getContextSubtitle = (): string => {
    if (!hasFiltersApplied()) {
      return 'No filters applied. Select a date range or search to view users.';
    }

    const parts: string[] = [];

    // Date range
    if (filters.createdFromDate && filters.createdToDate) {
      const fromDate = new Date(filters.createdFromDate);
      const toDate = new Date(filters.createdToDate);
      const fromStr = fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const toStr = toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      parts.push(`${fromStr} - ${toStr}`);
    } else if (filters.createdFromDate || filters.createdToDate) {
      if (filters.createdFromDate) {
        const fromDate = new Date(filters.createdFromDate);
        parts.push(`From ${fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
      }
      if (filters.createdToDate) {
        const toDate = new Date(filters.createdToDate);
        parts.push(`To ${toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
      }
    }

    // Company
    if (filters.companyId) {
      const company = companies.find(c => c.id === filters.companyId);
      parts.push(company ? company.companyName : 'Selected Company');
    } else {
      parts.push('All Companies');
    }

    // Role
    if (filters.roleId) {
      const role = filteredRoles.find(r => r.roleId === filters.roleId);
      parts.push(role ? role.roleName : 'Selected Role');
    } else {
      parts.push('All Roles');
    }

    // Status
    if (filters.status && filters.status !== 'All') {
      parts.push(filters.status);
    } else {
      parts.push('All Status');
    }

    return `Showing users for: ${parts.join(' • ')}`;
  };

  // Update filter
  const updateFilter = (field: keyof UserReportFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Update pending filter
  const updatePendingFilter = (field: keyof UserReportFilters, value: any) => {
    setPendingFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    setFilters((prev) => ({
      ...prev,
      createdFromDate: pendingFilters.createdFromDate || '',
      createdToDate: pendingFilters.createdToDate || '',
      companyId: pendingFilters.companyId || '',
      roleId: pendingFilters.roleId || '',
      status: pendingFilters.status || 'All',
      employmentType: pendingFilters.employmentType || 'All',
      page: 1,
    }));
  };

  // Clear filters
  const clearFilters = () => {
    const defaultFilters: UserReportFilters = {
      page: 1,
      pageSize: filters.pageSize || 25,
      createdFromDate: '',
      createdToDate: '',
      companyId: '',
      roleId: '',
      status: 'All',
      employmentType: 'All',
      searchText: '',
      sortBy: 'createdOn',
      sortOrder: 'DESC',
    };
    setFilters(defaultFilters);
    setPendingFilters({
      createdFromDate: '',
      createdToDate: '',
      companyId: '',
      roleId: '',
      status: 'All',
      employmentType: 'All',
    });
  };

  // Update pagination
  const updatePagination = (page: number, pageSize?: number) => {
    setFilters((prev) => ({
      ...prev,
      page,
      ...(pageSize !== undefined && { pageSize }),
    }));
  };

  // Update search text
  const updateSearchText = (text: string) => {
    setFilters((prev) => ({ ...prev, searchText: text, page: 1 }));
  };

  // Status options
  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Draft', label: 'Draft' },
  ];

  // Employment type options
  const employmentTypeOptions = [
    { value: 'All', label: 'All Types' },
    { value: 'Permanent', label: 'Permanent' },
    { value: 'Contract', label: 'Contract' },
    { value: 'Part-time', label: 'Part-time' },
  ];

  // Load users
  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      let allUsers: UserResponse[] = [];

      // If company filter is applied, only fetch users for that company
      if (filters.companyId) {
        const companyUsers = await userService.getUsersByCompany(filters.companyId);
        allUsers = companyUsers;
      } else {
        // Fetch users for all companies
        const companiesList = companies.length > 0 ? companies : await companyService.getAllCompanies();
        for (const company of companiesList) {
          try {
            const companyUsers = await userService.getUsersByCompany(company.id);
            allUsers.push(...companyUsers);
          } catch (err) {
            console.warn(`Failed to load users for company ${company.companyName}:`, err);
          }
        }
      }

      // Apply filters
      let filtered = allUsers;

      // Date range filter
      if (filters.createdFromDate) {
        const fromDate = new Date(filters.createdFromDate);
        filtered = filtered.filter(user => new Date(user.createdOn) >= fromDate);
      }
      if (filters.createdToDate) {
        const toDate = new Date(filters.createdToDate);
        toDate.setHours(23, 59, 59, 999); // End of day
        filtered = filtered.filter(user => new Date(user.createdOn) <= toDate);
      }

      // Role filter
      if (filters.roleId) {
        filtered = filtered.filter(user => user.userRoleId === filters.roleId);
      }

      // Status filter
      if (filters.status && filters.status !== 'All') {
        filtered = filtered.filter(user => user.status === filters.status);
      }

      // Employment type filter
      if (filters.employmentType && filters.employmentType !== 'All') {
        filtered = filtered.filter(user => user.employmentType === filters.employmentType);
      }

      // Search filter
      if (filters.searchText?.trim()) {
        const searchLower = filters.searchText.toLowerCase().trim();
        filtered = filtered.filter(user => {
          const userName = (user.userName || '').toLowerCase();
          const empCode = (user.employeeCode || '').toLowerCase();
          const email = (user.emailAddress || '').toLowerCase();
          const mobile = (user.mobileNumber || '').toLowerCase();
          return userName.includes(searchLower) ||
                 empCode.includes(searchLower) ||
                 email.includes(searchLower) ||
                 mobile.includes(searchLower);
        });
      }

      // Sort
      filtered.sort((a, b) => {
        const aValue = a[filters.sortBy as keyof UserResponse] || '';
        const bValue = b[filters.sortBy as keyof UserResponse] || '';
        if (filters.sortOrder === 'ASC') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Pagination
      const startIndex = (currentPage - 1) * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      const paginatedUsers = filtered.slice(startIndex, endIndex);

      setUsers(filtered);
      setFilteredUsers(paginatedUsers);
      setDataLoaded(true);

      // Update summary
      setSummary({
        totalUsers: filtered.length,
        activeUsers: filtered.filter(u => u.status === 'Active').length,
        inactiveUsers: filtered.filter(u => u.status === 'Inactive').length,
      });

    } catch (error: any) {
      console.error('Error loading users:', error);
      setError(error.message || 'Failed to load users');
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger load when filters change
  useEffect(() => {
    if (companies.length > 0) {
      const timeout = setTimeout(() => {
        loadUsers();
      }, 500);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, companies]);

  // Apply filters handler
  const handleApplyFilters = async () => {
    applyFilters();
    setShowAdvancedFilters(false);
    await loadUsers();
  };

  // Reset handler
  const handleReset = async () => {
    clearFilters();
    setShowAdvancedFilters(false);
    await loadUsers();
  };

  // Format date
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Get status badge class
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'Active':
        return 'status-badge status-badge--active';
      case 'Inactive':
        return 'status-badge status-badge--inactive';
      case 'Draft':
        return 'status-badge status-badge--draft';
      default:
        return 'status-badge status-badge--active';
    }
  };

  // Pagination calculations
  const totalPages = dataLoaded && summary.totalUsers > 0
    ? Math.ceil(summary.totalUsers / rowsPerPage)
    : 0;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + filteredUsers.length, summary.totalUsers);

  // Navigation items
  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ), 
      active: location.pathname === '/dashboard' 
    },
    { 
      path: '/transaction', 
      label: 'Transaction', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      ), 
      active: location.pathname.startsWith('/transaction') 
    },
    { 
      path: '/master', 
      label: 'Master', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ), 
      active: location.pathname.startsWith('/master') 
    },
    { 
      path: '/report', 
      label: 'Reports', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ), 
      active: location.pathname.startsWith('/report') 
    },
  ];

  return (
    <AppLayout navItems={navItems}>
      <div className="invoice-report-page">
        {/* Breadcrumb Navigation */}
        <div className="report-breadcrumb">
          <button
            className="back-button"
            onClick={() => navigate('/report')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5"></path>
              <path d="M12 19l-7-7 7-7"></path>
            </svg>
            Back to Reports
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item">Reports</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item">User Report</span>
        </div>
        <div className="report-content-wrapper">
          {/* Page Header */}
          <div className="page-header">
            <h1 className="page-title">User Report</h1>
            {!hasFiltersApplied() && (
              <div className="page-context-subtitle">{getContextSubtitle()}</div>
            )}
          </div>

          {/* Search & Actions Row */}
          <div className="search-actions-row">
            <div className={`search-container ${loading ? 'loading' : ''}`}>
              <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="global-search-input"
                placeholder="Search by User Name, Employee Code, Email, Mobile Number"
                value={searchQuery}
                onChange={(e) => updateSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    e.preventDefault();
                    loadUsers();
                  }
                }}
                disabled={loading}
              />
              {searchQuery && !loading && (
                <button
                  className="clear-search-btn"
                  onClick={() => {
                    updateSearchText('');
                    loadUsers();
                  }}
                  title="Clear search"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              )}
            </div>
            <button
              type="button"
              ref={filterButtonRef}
              className={`btn btn-filters-toggle ${showAdvancedFilters ? 'active' : ''} ${loading ? 'loading' : ''}`}
              onClick={() => {
                if (loading) return;
                if (!showAdvancedFilters) {
                  updatePendingFilter('companyId', filters.companyId || '');
                  updatePendingFilter('roleId', filters.roleId || '');
                  updatePendingFilter('status', filters.status || 'All');
                  updatePendingFilter('employmentType', filters.employmentType || 'All');
                  updatePendingFilter('createdFromDate', filters.createdFromDate || '');
                  updatePendingFilter('createdToDate', filters.createdToDate || '');
                }
                if (filterButtonRef.current) {
                  const rect = filterButtonRef.current.getBoundingClientRect();
                  setFilterModalPosition({
                    top: rect.bottom + 8,
                    left: rect.left
                  });
                }
                setShowAdvancedFilters(!showAdvancedFilters);
              }}
              disabled={loading}
              title="Open filters"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              Filter
              {[
                pendingFilters.companyId,
                pendingFilters.roleId,
                pendingFilters.status && pendingFilters.status !== 'All' ? pendingFilters.status : '',
                pendingFilters.employmentType && pendingFilters.employmentType !== 'All' ? pendingFilters.employmentType : '',
                pendingFilters.createdFromDate,
                pendingFilters.createdToDate
              ].filter(Boolean).length > 0 && (
                <span className="filter-count">
                  {[
                    pendingFilters.companyId,
                    pendingFilters.roleId,
                    pendingFilters.status && pendingFilters.status !== 'All' ? pendingFilters.status : '',
                    pendingFilters.employmentType && pendingFilters.employmentType !== 'All' ? pendingFilters.employmentType : '',
                    pendingFilters.createdFromDate,
                    pendingFilters.createdToDate
                  ].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Filter Modal Overlay */}
          {showAdvancedFilters && createPortal(
            <div 
              className="filter-modal-overlay" 
              onClick={() => {
                setShowAdvancedFilters(false);
                setFilterModalPosition(null);
              }}
            >
              <div 
                className="filter-modal-content" 
                onClick={(e) => e.stopPropagation()}
                style={filterModalPosition ? {
                  position: 'fixed',
                  top: `${filterModalPosition.top}px`,
                  left: `${filterModalPosition.left}px`,
                  margin: 0
                } : {}}
              >
                <div className="filter-modal-header">
                  <h3 className="filter-modal-title">Filters</h3>
                  <div className="filter-modal-actions">
                    <button
                      type="button"
                      className="filter-clear-link"
                      onClick={() => {
                        updatePendingFilter('companyId', '');
                        updatePendingFilter('roleId', '');
                        updatePendingFilter('createdFromDate', '');
                        updatePendingFilter('createdToDate', '');
                        updatePendingFilter('status', 'All');
                        updatePendingFilter('employmentType', 'All');
                      }}
                    >
                      Clear Filters
                    </button>
                    <button
                      className="filter-modal-close-btn"
                      onClick={() => setShowAdvancedFilters(false)}
                      title="Close filters"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="filter-modal-body">
                  <div className="filter-modal-grid">
                    <div className="filter-modal-group">
                      <label className="filter-modal-label">Created Date</label>
                      <div className="filter-date-range">
                        <input
                          type="date"
                          className="filter-modal-input"
                          value={pendingFilters.createdFromDate || ''}
                          onChange={(e) => updatePendingFilter('createdFromDate', e.target.value)}
                          placeholder="Select Date"
                        />
                        <span className="filter-date-separator">to</span>
                        <input
                          type="date"
                          className="filter-modal-input"
                          value={pendingFilters.createdToDate || ''}
                          onChange={(e) => updatePendingFilter('createdToDate', e.target.value)}
                          placeholder="Select Date"
                        />
                      </div>
                    </div>

                    <div className="filter-modal-group">
                      <label className="filter-modal-label">Company Name</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.companyId || ''}
                        onChange={(e) => {
                          updatePendingFilter('companyId', e.target.value);
                          updatePendingFilter('roleId', ''); // Reset role when company changes
                        }}
                      >
                        <option value="">Select Company Name</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.companyCode} - {company.companyName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-modal-group">
                      <label className="filter-modal-label">Role</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.roleId || ''}
                        onChange={(e) => updatePendingFilter('roleId', e.target.value)}
                        disabled={!pendingFilters.companyId}
                      >
                        <option value="">Select Role</option>
                        {(pendingFilters.companyId ? roles.filter((role) => role.companyId === pendingFilters.companyId) : roles).map((role) => (
                          <option key={role.roleId} value={role.roleId}>
                            {role.roleName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-modal-group">
                      <label className="filter-modal-label">Status</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.status || 'All'}
                        onChange={(e) => updatePendingFilter('status', e.target.value)}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-modal-group">
                      <label className="filter-modal-label">Employment Type</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.employmentType || 'All'}
                        onChange={(e) => updatePendingFilter('employmentType', e.target.value)}
                      >
                        {employmentTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="filter-modal-footer">
                  <button
                    type="button"
                    className="btn btn-primary-cta"
                    onClick={handleApplyFilters}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                        </svg>
                        Applying...
                      </>
                    ) : (
                      'Apply Filters'
                    )}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Results Section */}
          <div className="results-section" ref={resultsRef}>
            {/* Table Scroll Container */}
            <div className="table-scroll-container">
              <table className="invoice-table">
                <thead className="table-header">
                  <tr>
                    <th>User Name</th>
                    <th>Employee Code</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Employment Type</th>
                    <th>Created Date</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {loading ? (
                    // Loading Skeleton Rows
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={`skeleton-${index}`} className="table-row-skeleton">
                        <td><div className="skeleton-cell"></div></td>
                        <td><div className="skeleton-cell"></div></td>
                        <td><div className="skeleton-cell"></div></td>
                        <td><div className="skeleton-cell"></div></td>
                        <td><div className="skeleton-cell"></div></td>
                        <td><div className="skeleton-cell"></div></td>
                        <td><div className="skeleton-cell skeleton-badge"></div></td>
                        <td><div className="skeleton-cell"></div></td>
                        <td><div className="skeleton-cell"></div></td>
                      </tr>
                    ))
                  ) : !dataLoaded ? (
                    // Empty State Row - Data not loaded yet
                    <tr className="table-row-empty">
                      <td colSpan={9} className="empty-state-cell">
                        <div className="empty-state-content">
                          <div className="empty-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="8.5" cy="7" r="4"></circle>
                              <path d="M20 8v6M23 11h-6"></path>
                            </svg>
                          </div>
                          <h3 className="empty-state-title">No users found</h3>
                          <p className="empty-state-text">
                            Use the search bar or apply filters above to view user reports
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    // Empty State Row - No results found
                    <tr className="table-row-empty">
                      <td colSpan={9} className="empty-state-cell">
                        <div className="empty-state-content">
                          <div className="empty-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="8.5" cy="7" r="4"></circle>
                              <path d="M20 8v6M23 11h-6"></path>
                            </svg>
                          </div>
                          <h3 className="empty-state-title">No users found</h3>
                          <p className="empty-state-text">
                            {searchQuery.trim() 
                              ? `No users match "${searchQuery.trim()}". Try adjusting your search or filters.`
                              : hasFiltersApplied()
                                ? 'No users match the current filters. Try adjusting your filter criteria.'
                                : 'No users available. Use the search bar or apply filters to view reports.'}
                          </p>
                          {(hasFiltersApplied() || searchQuery.trim()) && (
                            <div className="empty-state-action">
                              <button onClick={handleReset}>
                                Clear Filters
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    // Data Rows
                    filteredUsers.map((user, index) => {
                      const role = roles.find(r => r.roleId === user.userRoleId);
                      const company = companies.find(c => c.id === user.companyId);
                      return (
                        <tr key={user.userId} className={index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                          <td className="invoice-number-cell">{user.userName}</td>
                          <td>{user.employeeCode || 'N/A'}</td>
                          <td>{user.emailAddress || 'N/A'}</td>
                          <td>{user.mobileNumber}</td>
                          <td>{company?.companyName || 'N/A'}</td>
                          <td>{role?.roleName || 'N/A'}</td>
                          <td className="text-center">
                            <span className={getStatusBadgeClass(user.status)}>
                              {user.status}
                            </span>
                          </td>
                          <td>{user.employmentType || 'N/A'}</td>
                          <td>{formatDate(user.createdOn)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="pagination-controls">
              <div className="pagination-info">
                {dataLoaded && filteredUsers.length > 0 
                  ? `Showing ${endIndex} of ${summary.totalUsers} items`
                  : 'Showing 0 of 0 items'}
              </div>
              <div className="pagination-right">
                <select
                  className="rows-per-page-select"
                  value={rowsPerPage}
                  disabled={!dataLoaded || filteredUsers.length === 0}
                  onChange={async (e) => {
                    updatePagination(1, Number(e.target.value));
                    await loadUsers();
                  }}
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <div className="pagination-numbers">
                  <button
                    className="pagination-arrow-btn"
                    onClick={async () => {
                      const newPage = Math.max(1, currentPage - 1);
                      updatePagination(newPage);
                      await loadUsers();
                    }}
                    disabled={currentPage === 1 || !dataLoaded || filteredUsers.length === 0}
                    aria-label="Previous page"
                  >
                    &lt;
                  </button>
                  {(() => {
                    const pages: (number | string)[] = [];
                    const maxVisible = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                    
                    if (endPage - startPage < maxVisible - 1) {
                      startPage = Math.max(1, endPage - maxVisible + 1);
                    }
                    
                    if (startPage > 1) {
                      pages.push(1);
                      if (startPage > 2) {
                        pages.push('...');
                      }
                    }
                    
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(i);
                    }
                    
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push('...');
                      }
                      pages.push(totalPages);
                    }
                    
                    return pages.map((page, index) => {
                      if (page === '...') {
                        return (
                          <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                            ...
                          </span>
                        );
                      }
                      const pageNum = page as number;
                      return (
                        <button
                          key={pageNum}
                          className={`pagination-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={async () => {
                            updatePagination(pageNum);
                            await loadUsers();
                          }}
                          disabled={!dataLoaded || filteredUsers.length === 0}
                        >
                          {pageNum}
                        </button>
                      );
                    });
                  })()}
                  <button
                    className="pagination-arrow-btn"
                    onClick={async () => {
                      const newPage = Math.min(totalPages, currentPage + 1);
                      updatePagination(newPage);
                      await loadUsers();
                    }}
                    disabled={currentPage === totalPages || totalPages === 0 || !dataLoaded || filteredUsers.length === 0}
                    aria-label="Next page"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default UserReportPage;
