import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { fleetService, FleetResponse } from '../../../services/fleetService';
import { companyService, CompanyResponse } from '../../../services/companyService';
import AppLayout from '../../../components/layout/AppLayout';
import './fleetReportPage.css';

interface FleetReportFilters {
  page: number;
  pageSize: number;
  createdFromDate: string;
  createdToDate: string;
  companyId: string;
  vehMake: string;
  status: string;
  complianceStatus: string;
  searchText: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

const FleetReportPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Filter state
  const [filters, setFilters] = useState<FleetReportFilters>({
    page: 1,
    pageSize: 25,
    createdFromDate: '',
    createdToDate: '',
    companyId: '',
    vehMake: '',
    status: 'All',
    complianceStatus: 'All',
    searchText: '',
    sortBy: 'createdOn',
    sortOrder: 'DESC',
  });

  // Pending filters (for Apply button)
  const [pendingFilters, setPendingFilters] = useState<Partial<FleetReportFilters>>({
    createdFromDate: '',
    createdToDate: '',
    companyId: '',
    vehMake: '',
    status: 'All',
    complianceStatus: 'All',
  });

  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const searchQuery = filters.searchText || '';

  // Data state
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [fleets, setFleets] = useState<FleetResponse[]>([]);
  const [filteredFleets, setFilteredFleets] = useState<FleetResponse[]>([]);
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
    totalFleets: 0,
    activeFleets: 0,
    inactiveFleets: 0,
  });

  // Load master data
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const companiesData = await companyService.getAllCompanies();
        setCompanies(companiesData);
      } catch (error) {
        console.error('Error loading master data:', error);
      }
    };
    loadMasterData();
  }, []);

  // Check if any filters are applied
  const hasFiltersApplied = (): boolean => {
    return !!(
      filters.createdFromDate ||
      filters.createdToDate ||
      filters.companyId ||
      filters.vehMake ||
      (filters.status && filters.status !== 'All') ||
      (filters.complianceStatus && filters.complianceStatus !== 'All') ||
      filters.searchText?.trim()
    );
  };

  // Generate context subtitle
  const getContextSubtitle = (): string => {
    if (!hasFiltersApplied()) {
      return 'No filters applied. Select a date range or search to view fleet vehicles.';
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

    // Vehicle Make
    if (filters.vehMake && filters.vehMake !== 'All') {
      parts.push(`Make: ${filters.vehMake}`);
    }

    // Status
    if (filters.status && filters.status !== 'All') {
      parts.push(filters.status);
    } else {
      parts.push('All Status');
    }

    // Compliance Status
    if (filters.complianceStatus && filters.complianceStatus !== 'All') {
      parts.push(`Compliance: ${filters.complianceStatus}`);
    }

    return `Showing fleet vehicles for: ${parts.join(' • ')}`;
  };

  // Update filter
  const updateFilter = (field: keyof FleetReportFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Update pending filter
  const updatePendingFilter = (field: keyof FleetReportFilters, value: any) => {
    setPendingFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    setFilters((prev) => ({
      ...prev,
      createdFromDate: pendingFilters.createdFromDate || '',
      createdToDate: pendingFilters.createdToDate || '',
      companyId: pendingFilters.companyId || '',
      vehMake: pendingFilters.vehMake || '',
      status: pendingFilters.status || 'All',
      complianceStatus: pendingFilters.complianceStatus || 'All',
      page: 1,
    }));
  };

  // Clear filters
  const clearFilters = () => {
    const defaultFilters: FleetReportFilters = {
      page: 1,
      pageSize: filters.pageSize || 25,
      createdFromDate: '',
      createdToDate: '',
      companyId: '',
      vehMake: '',
      status: 'All',
      complianceStatus: 'All',
      searchText: '',
      sortBy: 'createdOn',
      sortOrder: 'DESC',
    };
    setFilters(defaultFilters);
    setPendingFilters({
      createdFromDate: '',
      createdToDate: '',
      companyId: '',
      vehMake: '',
      status: 'All',
      complianceStatus: 'All',
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
  ];

  // Compliance status options
  const complianceStatusOptions = [
    { value: 'All', label: 'All' },
    { value: 'Compliant', label: 'Compliant' },
    { value: 'Expiring Soon', label: 'Expiring Soon' },
    { value: 'Expired', label: 'Expired' },
  ];

  // Get unique vehicle makes from fleet data
  const getVehicleMakes = (): string[] => {
    const makes = new Set<string>();
    fleets.forEach(fleet => {
      if (fleet.vehMake) {
        makes.add(fleet.vehMake);
      }
    });
    return Array.from(makes).sort();
  };

  // Check compliance status
  const getComplianceStatus = (fleet: FleetResponse): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dates = [
      fleet.nextFCDate ? new Date(fleet.nextFCDate) : null,
      fleet.pucDateValidUpto ? new Date(fleet.pucDateValidUpto) : null,
      fleet.insuranceValidUpto ? new Date(fleet.insuranceValidUpto) : null,
    ].filter(Boolean) as Date[];

    if (dates.length === 0) return 'Compliant';

    const expiredDates = dates.filter(date => date < today);
    if (expiredDates.length > 0) return 'Expired';

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringSoon = dates.filter(date => date <= thirtyDaysFromNow && date >= today);
    if (expiringSoon.length > 0) return 'Expiring Soon';

    return 'Compliant';
  };

  // Load fleets
  const loadFleets = async () => {
    setLoading(true);
    setError(null);

    try {
      let allFleets: FleetResponse[] = [];

      // If company filter is applied, only fetch fleets for that company
      if (filters.companyId) {
        const companyFleets = await fleetService.getAllFleets(filters.companyId);
        allFleets = companyFleets;
      } else {
        // Fetch fleets for all companies
        const companiesList = companies.length > 0 ? companies : await companyService.getAllCompanies();
        for (const company of companiesList) {
          try {
            const companyFleets = await fleetService.getAllFleets(company.id);
            allFleets.push(...companyFleets);
          } catch (err) {
            console.warn(`Failed to load fleets for company ${company.companyName}:`, err);
          }
        }
      }

      // Apply filters
      let filtered = allFleets;

      // Date range filter
      if (filters.createdFromDate) {
        const fromDate = new Date(filters.createdFromDate);
        filtered = filtered.filter(fleet => new Date(fleet.createdOn) >= fromDate);
      }
      if (filters.createdToDate) {
        const toDate = new Date(filters.createdToDate);
        toDate.setHours(23, 59, 59, 999); // End of day
        filtered = filtered.filter(fleet => new Date(fleet.createdOn) <= toDate);
      }

      // Company filter (already applied in fetch, but keep for consistency)
      if (filters.companyId) {
        filtered = filtered.filter(fleet => fleet.companyId === filters.companyId);
      }

      // Vehicle Make filter
      if (filters.vehMake && filters.vehMake !== 'All') {
        filtered = filtered.filter(fleet => fleet.vehMake === filters.vehMake);
      }

      // Status filter
      if (filters.status && filters.status !== 'All') {
        filtered = filtered.filter(fleet => fleet.status === filters.status);
      }

      // Compliance Status filter
      if (filters.complianceStatus && filters.complianceStatus !== 'All') {
        filtered = filtered.filter(fleet => getComplianceStatus(fleet) === filters.complianceStatus);
      }

      // Search filter
      if (filters.searchText?.trim()) {
        const searchLower = filters.searchText.toLowerCase().trim();
        filtered = filtered.filter(fleet => {
          const vehicleNum = (fleet.vehicleNum || '').toLowerCase();
          const vehMake = (fleet.vehMake || '').toLowerCase();
          const vehModel = (fleet.vehModel || '').toLowerCase();
          const ownerName = (fleet.ownerName || '').toLowerCase();
          const ownerContact = (fleet.ownerContact || '').toLowerCase();
          const capacity = (fleet.capacity || '').toLowerCase();
          return vehicleNum.includes(searchLower) ||
                 vehMake.includes(searchLower) ||
                 vehModel.includes(searchLower) ||
                 ownerName.includes(searchLower) ||
                 ownerContact.includes(searchLower) ||
                 capacity.includes(searchLower);
        });
      }

      // Sort
      filtered.sort((a, b) => {
        const aValue = a[filters.sortBy as keyof FleetResponse] || '';
        const bValue = b[filters.sortBy as keyof FleetResponse] || '';
        if (filters.sortOrder === 'ASC') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Pagination
      const startIndex = (currentPage - 1) * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      const paginatedFleets = filtered.slice(startIndex, endIndex);

      setFleets(filtered);
      setFilteredFleets(paginatedFleets);
      setDataLoaded(true);

      // Update summary
      setSummary({
        totalFleets: filtered.length,
        activeFleets: filtered.filter(f => f.status === 'Active').length,
        inactiveFleets: filtered.filter(f => f.status === 'Inactive').length,
      });

    } catch (error: any) {
      console.error('Error loading fleets:', error);
      setError(error.message || 'Failed to load fleet vehicles');
      setFleets([]);
      setFilteredFleets([]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger load when filters change
  useEffect(() => {
    if (companies.length > 0) {
      const timeout = setTimeout(() => {
        loadFleets();
      }, 500);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, companies]);

  // Apply filters handler
  const handleApplyFilters = async () => {
    applyFilters();
    setShowAdvancedFilters(false);
    await loadFleets();
  };

  // Reset handler
  const handleReset = async () => {
    clearFilters();
    setShowAdvancedFilters(false);
    await loadFleets();
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
      default:
        return 'status-badge status-badge--active';
    }
  };

  // Get compliance badge class
  const getComplianceBadgeClass = (status: string): string => {
    switch (status) {
      case 'Compliant':
        return 'status-badge status-badge--compliant';
      case 'Expiring Soon':
        return 'status-badge status-badge--expiring';
      case 'Expired':
        return 'status-badge status-badge--expired';
      default:
        return 'status-badge status-badge--compliant';
    }
  };

  // Pagination calculations
  const totalPages = dataLoaded && summary.totalFleets > 0
    ? Math.ceil(summary.totalFleets / rowsPerPage)
    : 0;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + filteredFleets.length, summary.totalFleets);

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

  const vehicleMakes = getVehicleMakes();

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
          <span className="breadcrumb-item">Fleet Master Report</span>
        </div>
        <div className="report-content-wrapper">
          {/* Page Header */}
          <div className="page-header">
            <h1 className="page-title">Fleet Master Report</h1>
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
                placeholder="Search by Vehicle Number, Make, Model, Owner Name, Contact, Capacity"
                value={searchQuery}
                onChange={(e) => updateSearchText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    e.preventDefault();
                    loadFleets();
                  }
                }}
                disabled={loading}
              />
              {searchQuery && !loading && (
                <button
                  className="clear-search-btn"
                  onClick={() => {
                    updateSearchText('');
                    loadFleets();
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
                  updatePendingFilter('vehMake', filters.vehMake || '');
                  updatePendingFilter('status', filters.status || 'All');
                  updatePendingFilter('complianceStatus', filters.complianceStatus || 'All');
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
                pendingFilters.vehMake && pendingFilters.vehMake !== 'All' ? pendingFilters.vehMake : '',
                pendingFilters.status && pendingFilters.status !== 'All' ? pendingFilters.status : '',
                pendingFilters.complianceStatus && pendingFilters.complianceStatus !== 'All' ? pendingFilters.complianceStatus : '',
                pendingFilters.createdFromDate,
                pendingFilters.createdToDate
              ].filter(Boolean).length > 0 && (
                <span className="filter-count">
                  {[
                    pendingFilters.companyId,
                    pendingFilters.vehMake && pendingFilters.vehMake !== 'All' ? pendingFilters.vehMake : '',
                    pendingFilters.status && pendingFilters.status !== 'All' ? pendingFilters.status : '',
                    pendingFilters.complianceStatus && pendingFilters.complianceStatus !== 'All' ? pendingFilters.complianceStatus : '',
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
                        updatePendingFilter('vehMake', '');
                        updatePendingFilter('createdFromDate', '');
                        updatePendingFilter('createdToDate', '');
                        updatePendingFilter('status', 'All');
                        updatePendingFilter('complianceStatus', 'All');
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
                        onChange={(e) => updatePendingFilter('companyId', e.target.value)}
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
                      <label className="filter-modal-label">Vehicle Make</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.vehMake || 'All'}
                        onChange={(e) => updatePendingFilter('vehMake', e.target.value)}
                      >
                        <option value="All">All Makes</option>
                        {vehicleMakes.map((make) => (
                          <option key={make} value={make}>
                            {make}
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
                      <label className="filter-modal-label">Compliance Status</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.complianceStatus || 'All'}
                        onChange={(e) => updatePendingFilter('complianceStatus', e.target.value)}
                      >
                        {complianceStatusOptions.map((option) => (
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
                    <th>Vehicle Number</th>
                    <th>Company</th>
                    <th>Make</th>
                    <th>Model</th>
                    <th>Capacity</th>
                    <th>Owner Name</th>
                    <th>Owner Contact</th>
                    <th>Status</th>
                    <th>Compliance</th>
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
                        <td><div className="skeleton-cell"></div></td>
                        <td><div className="skeleton-cell skeleton-badge"></div></td>
                        <td><div className="skeleton-cell skeleton-badge"></div></td>
                        <td><div className="skeleton-cell"></div></td>
                      </tr>
                    ))
                  ) : !dataLoaded ? (
                    // Empty State Row - Data not loaded yet
                    <tr className="table-row-empty">
                      <td colSpan={10} className="empty-state-cell">
                        <div className="empty-state-content">
                          <div className="empty-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"></path>
                              <polygon points="12 15 17 21 7 21 12 15"></polygon>
                            </svg>
                          </div>
                          <h3 className="empty-state-title">No fleet vehicles found</h3>
                          <p className="empty-state-text">
                            Use the search bar or apply filters above to view fleet reports
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredFleets.length === 0 ? (
                    // Empty State Row - No results found
                    <tr className="table-row-empty">
                      <td colSpan={10} className="empty-state-cell">
                        <div className="empty-state-content">
                          <div className="empty-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1"></path>
                              <polygon points="12 15 17 21 7 21 12 15"></polygon>
                            </svg>
                          </div>
                          <h3 className="empty-state-title">No fleet vehicles found</h3>
                          <p className="empty-state-text">
                            {searchQuery.trim() 
                              ? `No vehicles match "${searchQuery.trim()}". Try adjusting your search or filters.`
                              : hasFiltersApplied()
                                ? 'No vehicles match the current filters. Try adjusting your filter criteria.'
                                : 'No vehicles available. Use the search bar or apply filters to view reports.'}
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
                    filteredFleets.map((fleet, index) => {
                      const company = companies.find(c => c.id === fleet.companyId);
                      const complianceStatus = getComplianceStatus(fleet);
                      return (
                        <tr key={fleet.id} className={index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                          <td className="invoice-number-cell">{fleet.vehicleNum}</td>
                          <td>{company?.companyName || 'N/A'}</td>
                          <td>{fleet.vehMake || 'N/A'}</td>
                          <td>{fleet.vehModel || 'N/A'}</td>
                          <td>{fleet.capacity || 'N/A'}</td>
                          <td>{fleet.ownerName || 'N/A'}</td>
                          <td>{fleet.ownerContact || 'N/A'}</td>
                          <td className="text-center">
                            <span className={getStatusBadgeClass(fleet.status)}>
                              {fleet.status}
                            </span>
                          </td>
                          <td className="text-center">
                            <span className={getComplianceBadgeClass(complianceStatus)}>
                              {complianceStatus}
                            </span>
                          </td>
                          <td>{formatDate(fleet.createdOn)}</td>
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
                {dataLoaded && filteredFleets.length > 0 
                  ? `Showing ${endIndex} of ${summary.totalFleets} items`
                  : 'Showing 0 of 0 items'}
              </div>
              <div className="pagination-right">
                <select
                  className="rows-per-page-select"
                  value={rowsPerPage}
                  disabled={!dataLoaded || filteredFleets.length === 0}
                  onChange={async (e) => {
                    updatePagination(1, Number(e.target.value));
                    await loadFleets();
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
                      await loadFleets();
                    }}
                    disabled={currentPage === 1 || !dataLoaded || filteredFleets.length === 0}
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
                            await loadFleets();
                          }}
                          disabled={!dataLoaded || filteredFleets.length === 0}
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
                      await loadFleets();
                    }}
                    disabled={currentPage === totalPages || totalPages === 0 || !dataLoaded || filteredFleets.length === 0}
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

export default FleetReportPage;
