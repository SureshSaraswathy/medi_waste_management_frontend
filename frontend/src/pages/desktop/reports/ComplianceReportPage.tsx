import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { companyService, CompanyResponse } from '../../../services/companyService';
import { hcfService, HcfResponse } from '../../../services/hcfService';
import AppLayout from '../../../components/layout/AppLayout';
import './complianceReportPage.css';

interface ComplianceItem {
  id: string;
  companyId: string;
  hcfId: string;
  complianceType: string;
  status: string;
  expiryDate: string;
  lastChecked: string;
  notes?: string;
}

interface ComplianceFilters {
  page: number;
  pageSize: number;
  companyId: string;
  hcfId: string;
  complianceType: string;
  status: string;
  searchText: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

const ComplianceReportPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<ComplianceFilters>({
    page: 1,
    pageSize: 25,
    companyId: '',
    hcfId: '',
    complianceType: 'All',
    status: 'All',
    searchText: '',
    sortBy: 'lastChecked',
    sortOrder: 'DESC',
  });

  const [pendingFilters, setPendingFilters] = useState<Partial<ComplianceFilters>>({
    companyId: '',
    hcfId: '',
    complianceType: 'All',
    status: 'All',
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const searchQuery = filters.searchText || '';

  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [hcfs, setHcfs] = useState<HcfResponse[]>([]);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [filteredComplianceItems, setFilteredComplianceItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPage = filters.page || 1;
  const rowsPerPage = filters.pageSize || 25;

  const resultsRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [filterModalPosition, setFilterModalPosition] = useState<{ top: number; left: number } | null>(null);

  const [summary, setSummary] = useState({
    totalItems: 0,
    compliant: 0,
    nonCompliant: 0,
  });

  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [companiesData, hcfsData] = await Promise.all([
          companyService.getAllCompanies(),
          hcfService.getAllHcfs(),
        ]);
        setCompanies(companiesData);
        setHcfs(hcfsData);
      } catch (error) {
        console.error('Error loading master data:', error);
      }
    };
    loadMasterData();
  }, []);

  const filteredHcfs = filters.companyId
    ? hcfs.filter((hcf) => hcf.companyId === filters.companyId)
    : hcfs;

  const hasFiltersApplied = (): boolean => {
    return !!(
      filters.companyId ||
      filters.hcfId ||
      (filters.complianceType && filters.complianceType !== 'All') ||
      (filters.status && filters.status !== 'All') ||
      filters.searchText?.trim()
    );
  };

  const getContextSubtitle = (): string => {
    if (!hasFiltersApplied()) {
      return 'No filters applied. View all compliance statuses.';
    }

    const parts: string[] = [];

    if (filters.companyId) {
      const company = companies.find(c => c.id === filters.companyId);
      if (company) {
        parts.push(`Company: ${company.companyName}`);
      }
    }

    if (filters.hcfId) {
      const hcf = filteredHcfs.find(h => h.id === filters.hcfId);
      if (hcf) {
        parts.push(`HCF: ${hcf.hcfCode}`);
      }
    }

    if (filters.complianceType && filters.complianceType !== 'All') {
      parts.push(`Type: ${filters.complianceType}`);
    }

    if (filters.status && filters.status !== 'All') {
      parts.push(`Status: ${filters.status}`);
    }

    return parts.join(' • ');
  };

  const complianceTypeOptions = [
    { value: 'All', label: 'All Types' },
    { value: 'License', label: 'License' },
    { value: 'Permit', label: 'Permit' },
    { value: 'Certificate', label: 'Certificate' },
    { value: 'Registration', label: 'Registration' },
  ];

  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Compliant', label: 'Compliant' },
    { value: 'Non-Compliant', label: 'Non-Compliant' },
    { value: 'Expiring Soon', label: 'Expiring Soon' },
    { value: 'Expired', label: 'Expired' },
  ];

  const handleGenerateWithFilters = async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call when compliance service is available
      // For now, using mock data structure
      let allItems: ComplianceItem[] = [];

      // Mock data - replace with actual API call
      // Example: allItems = await complianceService.getAllComplianceItems(filters);

      // Client-side filtering
      if (filters.companyId) {
        allItems = allItems.filter(item => item.companyId === filters.companyId);
      }

      if (filters.hcfId) {
        allItems = allItems.filter(item => item.hcfId === filters.hcfId);
      }

      if (filters.complianceType && filters.complianceType !== 'All') {
        allItems = allItems.filter(item => item.complianceType === filters.complianceType);
      }

      if (filters.status && filters.status !== 'All') {
        allItems = allItems.filter(item => item.status === filters.status);
      }

      if (filters.searchText?.trim()) {
        const searchLower = filters.searchText.toLowerCase().trim();
        allItems = allItems.filter(item => {
          const company = companies.find(c => c.id === item.companyId);
          const companyName = (company?.companyName || '').toLowerCase();
          const hcf = hcfs.find(h => h.id === item.hcfId);
          const hcfCode = (hcf?.hcfCode || '').toLowerCase();
          return item.complianceType.toLowerCase().includes(searchLower) ||
                 companyName.includes(searchLower) ||
                 hcfCode.includes(searchLower) ||
                 (item.notes && item.notes.toLowerCase().includes(searchLower));
        });
      }

      // Sort
      allItems.sort((a, b) => {
        const aValue = a[filters.sortBy as keyof ComplianceItem] || '';
        const bValue = b[filters.sortBy as keyof ComplianceItem] || '';
        if (filters.sortOrder === 'ASC') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Paginate
      const startIndex = (currentPage - 1) * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      const paginatedData = allItems.slice(startIndex, endIndex);

      setComplianceItems(allItems);
      setFilteredComplianceItems(paginatedData);
      setDataLoaded(true);

      setSummary({
        totalItems: allItems.length,
        compliant: allItems.filter(item => item.status === 'Compliant').length,
        nonCompliant: allItems.filter(item => item.status === 'Non-Compliant' || item.status === 'Expired').length,
      });

    } catch (error: any) {
      console.error('Error loading compliance data:', error);
      setError(error.message || 'Failed to load compliance status data');
      setComplianceItems([]);
      setFilteredComplianceItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    setFilters((prev) => ({
      ...prev,
      companyId: pendingFilters.companyId || '',
      hcfId: pendingFilters.hcfId || '',
      complianceType: pendingFilters.complianceType || 'All',
      status: pendingFilters.status || 'All',
      page: 1,
    }));
    setShowAdvancedFilters(false);
    await handleGenerateWithFilters();
  };

  const handleReset = async () => {
    setFilters({
      page: 1,
      pageSize: 25,
      companyId: '',
      hcfId: '',
      complianceType: 'All',
      status: 'All',
      searchText: '',
      sortBy: 'lastChecked',
      sortOrder: 'DESC',
    });
    setPendingFilters({
      companyId: '',
      hcfId: '',
      complianceType: 'All',
      status: 'All',
    });
    setShowAdvancedFilters(false);
    await handleGenerateWithFilters();
  };

  useEffect(() => {
    if (companies.length > 0 || !filters.companyId) {
      const timeout = setTimeout(() => {
        handleGenerateWithFilters();
      }, 500);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, companies]);

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'Compliant':
        return 'status-badge status-badge--paid';
      case 'Non-Compliant':
        return 'status-badge status-badge--due';
      case 'Expiring Soon':
        return 'status-badge status-badge--partial';
      case 'Expired':
        return 'status-badge status-badge--cancelled';
      default:
        return 'status-badge status-badge--generated';
    }
  };

  const totalPages = dataLoaded && summary.totalItems > 0
    ? Math.ceil(summary.totalItems / rowsPerPage)
    : 0;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + filteredComplianceItems.length, summary.totalItems);

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
      path: '/finance',
      label: 'Finance',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ),
      active: location.pathname.startsWith('/finance')
    },
    {
      path: '/commercial-agreements',
      label: 'Commercial / Agreements',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ),
      active: location.pathname.startsWith('/commercial-agreements')
    },
    {
      path: '/compliance-training',
      label: 'Compliance & Training',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      ),
      active: location.pathname.startsWith('/compliance-training')
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
          <span className="breadcrumb-item">Compliance Status</span>
        </div>
        <div className="report-content-wrapper">
          <div className="page-header">
            <h1 className="page-title">Compliance Status Report</h1>
            {!hasFiltersApplied() && (
              <div className="page-context-subtitle">{getContextSubtitle()}</div>
            )}
          </div>

          <div className="search-actions-row">
            <div className={`search-container ${loading ? 'loading' : ''}`}>
              <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="global-search-input"
                placeholder="Search by Compliance Type, Company, HCF, Notes"
                value={searchQuery}
                onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value, page: 1 }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    e.preventDefault();
                    handleGenerateWithFilters();
                  }
                }}
                disabled={loading}
              />
              {searchQuery && !loading && (
                <button
                  className="clear-search-btn"
                  onClick={async () => {
                    setFilters(prev => ({ ...prev, searchText: '', page: 1 }));
                    if (dataLoaded || hasFiltersApplied()) {
                      await handleGenerateWithFilters();
                    }
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
                  setPendingFilters({
                    companyId: filters.companyId || '',
                    hcfId: filters.hcfId || '',
                    complianceType: filters.complianceType || 'All',
                    status: filters.status || 'All',
                  });
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
                filters.companyId,
                filters.hcfId,
                filters.complianceType && filters.complianceType !== 'All' ? filters.complianceType : '',
                filters.status && filters.status !== 'All' ? filters.status : ''
              ].filter(Boolean).length > 0 && (
                <span className="filter-count">
                  {[
                    filters.companyId,
                    filters.hcfId,
                    filters.complianceType && filters.complianceType !== 'All' ? filters.complianceType : '',
                    filters.status && filters.status !== 'All' ? filters.status : ''
                  ].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

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
                        setPendingFilters({
                          companyId: '',
                          hcfId: '',
                          complianceType: 'All',
                          status: 'All',
                        });
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
                      <label className="filter-modal-label">Company Name</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.companyId || ''}
                        onChange={(e) => {
                          setPendingFilters(prev => ({ ...prev, companyId: e.target.value, hcfId: '' }));
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
                      <label className="filter-modal-label">HCF Name</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.hcfId || ''}
                        onChange={(e) => setPendingFilters(prev => ({ ...prev, hcfId: e.target.value }))}
                        disabled={!pendingFilters.companyId}
                      >
                        <option value="">Select HCF Name</option>
                        {(pendingFilters.companyId ? hcfs.filter((hcf) => hcf.companyId === pendingFilters.companyId) : hcfs).map((hcf) => (
                          <option key={hcf.id} value={hcf.id}>
                            {hcf.hcfCode} - {hcf.hcfName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-modal-group">
                      <label className="filter-modal-label">Compliance Type</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.complianceType || 'All'}
                        onChange={(e) => setPendingFilters(prev => ({ ...prev, complianceType: e.target.value }))}
                      >
                        {complianceTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-modal-group">
                      <label className="filter-modal-label">Status</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.status || 'All'}
                        onChange={(e) => setPendingFilters(prev => ({ ...prev, status: e.target.value }))}
                      >
                        {statusOptions.map((option) => (
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
                    onClick={async () => {
                      await handleApplyFilters();
                      setShowAdvancedFilters(false);
                    }}
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

          {error && (
            <div className="error-message" style={{ padding: '10px', marginBottom: '12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', border: '1px solid #ef4444' }}>
              {error}
            </div>
          )}

          <div className="results-section" ref={resultsRef}>
            <div className="table-scroll-container">
              <table className="invoice-table">
                <thead className="table-header">
                  <tr>
                    <th>Compliance Type</th>
                    <th>Company</th>
                    <th>HCF</th>
                    <th>Expiry Date</th>
                    <th>Last Checked</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={`skeleton-${index}`} className="table-row-skeleton">
                        <td><div className="skeleton-cell"></div></td>
                        <td><div className="skeleton-cell"></div></td>
                        <td><div className="skeleton-cell"></div></td>
                        <td><div className="skeleton-cell"></div></td>
                        <td><div className="skeleton-cell"></div></td>
                        <td><div className="skeleton-cell skeleton-badge"></div></td>
                      </tr>
                    ))
                  ) : !dataLoaded ? (
                    <tr className="table-row-empty">
                      <td colSpan={6} className="empty-state-cell">
                        <div className="empty-state-content">
                          <div className="empty-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                          </div>
                          <h3 className="empty-state-title">No compliance data found</h3>
                          <p className="empty-state-text">
                            Use the search bar or apply filters above to view compliance status reports.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredComplianceItems.length === 0 ? (
                    <tr className="table-row-empty">
                      <td colSpan={6} className="empty-state-cell">
                        <div className="empty-state-content">
                          <div className="empty-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                          </div>
                          <h3 className="empty-state-title">No compliance data found</h3>
                          <p className="empty-state-text">
                            {searchQuery.trim()
                              ? `No compliance items match "${searchQuery.trim()}". Try adjusting your search or filters.`
                              : hasFiltersApplied()
                                ? 'No compliance items match the current filters. Try adjusting your filter criteria.'
                                : 'No compliance data available. Use the search bar or apply filters to view reports.'}
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
                    filteredComplianceItems.map((item, index) => (
                      <tr key={item.id} className={index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                        <td>{item.complianceType}</td>
                        <td>{companies.find(c => c.id === item.companyId)?.companyName || 'N/A'}</td>
                        <td>{hcfs.find(h => h.id === item.hcfId)?.hcfCode || 'N/A'}</td>
                        <td>{formatDate(item.expiryDate)}</td>
                        <td>{formatDate(item.lastChecked)}</td>
                        <td className="text-center">
                          <span className={getStatusBadgeClass(item.status)}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination-controls">
              <div className="pagination-info">
                {dataLoaded && filteredComplianceItems.length > 0
                  ? `Showing ${startIndex + 1}-${endIndex} of ${summary.totalItems} items`
                  : 'Showing 0 of 0 items'}
              </div>
              <div className="pagination-right">
                <select
                  className="rows-per-page-select"
                  value={rowsPerPage}
                  disabled={!dataLoaded || filteredComplianceItems.length === 0}
                  onChange={async (e) => {
                    setFilters(prev => ({ ...prev, page: 1, pageSize: Number(e.target.value) }));
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
                      setFilters(prev => ({ ...prev, page: newPage }));
                    }}
                    disabled={currentPage === 1 || !dataLoaded || filteredComplianceItems.length === 0}
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
                            setFilters(prev => ({ ...prev, page: pageNum }));
                          }}
                          disabled={!dataLoaded || filteredComplianceItems.length === 0}
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
                      setFilters(prev => ({ ...prev, page: newPage }));
                    }}
                    disabled={currentPage === totalPages || totalPages === 0 || !dataLoaded || filteredComplianceItems.length === 0}
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

export default ComplianceReportPage;
