import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { routeService, RouteResponse } from '../../../services/routeService';
import { companyService, CompanyResponse } from '../../../services/companyService';
import AppLayout from '../../../components/layout/AppLayout';
import './routeReportPage.css';

interface RouteFilters {
  page: number;
  pageSize: number;
  companyId: string;
  status: string;
  searchText: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

const RouteReportPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<RouteFilters>({
    page: 1,
    pageSize: 25,
    companyId: '',
    status: 'All',
    searchText: '',
    sortBy: 'routeCode',
    sortOrder: 'ASC',
  });

  const [pendingFilters, setPendingFilters] = useState<Partial<RouteFilters>>({
    companyId: '',
    status: 'All',
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const searchQuery = filters.searchText || '';

  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [routes, setRoutes] = useState<RouteResponse[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<RouteResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPage = filters.page || 1;
  const rowsPerPage = filters.pageSize || 25;

  const resultsRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [filterModalPosition, setFilterModalPosition] = useState<{ top: number; left: number } | null>(null);

  const [summary, setSummary] = useState({
    totalRoutes: 0,
  });

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

  const hasFiltersApplied = (): boolean => {
    return !!(
      filters.companyId ||
      (filters.status && filters.status !== 'All') ||
      filters.searchText?.trim()
    );
  };

  const getContextSubtitle = (): string => {
    if (!hasFiltersApplied()) {
      return 'No filters applied. View all routes.';
    }

    const parts: string[] = [];

    if (filters.companyId) {
      const company = companies.find(c => c.id === filters.companyId);
      if (company) {
        parts.push(`Company: ${company.companyName}`);
      }
    }

    if (filters.status && filters.status !== 'All') {
      parts.push(`Status: ${filters.status}`);
    }

    return parts.join(' • ');
  };

  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  const handleGenerateWithFilters = async () => {
    setLoading(true);
    setError(null);

    try {
      let allRoutes: RouteResponse[] = await routeService.getAllRoutes(true);

      // Client-side filtering
      if (filters.companyId) {
        allRoutes = allRoutes.filter(r => r.companyId === filters.companyId);
      }

      if (filters.status && filters.status !== 'All') {
        allRoutes = allRoutes.filter(r => r.status === filters.status);
      }

      if (filters.searchText?.trim()) {
        const searchLower = filters.searchText.toLowerCase().trim();
        allRoutes = allRoutes.filter(route => {
          const routeCode = (route.routeCode || '').toLowerCase();
          const routeName = (route.routeName || '').toLowerCase();
          const company = companies.find(c => c.id === route.companyId);
          const companyName = (company?.companyName || '').toLowerCase();
          return routeCode.includes(searchLower) ||
                 routeName.includes(searchLower) ||
                 companyName.includes(searchLower);
        });
      }

      // Sort
      allRoutes.sort((a, b) => {
        const aValue = a[filters.sortBy as keyof RouteResponse] || '';
        const bValue = b[filters.sortBy as keyof RouteResponse] || '';
        if (filters.sortOrder === 'ASC') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Paginate
      const startIndex = (currentPage - 1) * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      const paginatedData = allRoutes.slice(startIndex, endIndex);

      setRoutes(allRoutes);
      setFilteredRoutes(paginatedData);
      setDataLoaded(true);

      setSummary({
        totalRoutes: allRoutes.length,
      });

    } catch (error: any) {
      console.error('Error loading routes:', error);
      setError(error.message || 'Failed to load route data');
      setRoutes([]);
      setFilteredRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    setFilters((prev) => ({
      ...prev,
      companyId: pendingFilters.companyId || '',
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
      status: 'All',
      searchText: '',
      sortBy: 'routeCode',
      sortOrder: 'ASC',
    });
    setPendingFilters({
      companyId: '',
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

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'Active':
        return 'status-badge status-badge--paid';
      case 'Inactive':
        return 'status-badge status-badge--cancelled';
      default:
        return 'status-badge status-badge--generated';
    }
  };

  const totalPages = dataLoaded && summary.totalRoutes > 0
    ? Math.ceil(summary.totalRoutes / rowsPerPage)
    : 0;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + filteredRoutes.length, summary.totalRoutes);

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
          <span className="breadcrumb-item">Route</span>
        </div>
        <div className="report-content-wrapper">
          <div className="page-header">
            <h1 className="page-title">Route Report</h1>
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
                placeholder="Search by Route Code, Route Name, Company"
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
                filters.status && filters.status !== 'All' ? filters.status : ''
              ].filter(Boolean).length > 0 && (
                <span className="filter-count">
                  {[
                    filters.companyId,
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
                        onChange={(e) => setPendingFilters(prev => ({ ...prev, companyId: e.target.value }))}
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
                    <th>Route Code</th>
                    <th>Route Name</th>
                    <th>Company</th>
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
                        <td><div className="skeleton-cell skeleton-badge"></div></td>
                      </tr>
                    ))
                  ) : !dataLoaded ? (
                    <tr className="table-row-empty">
                      <td colSpan={4} className="empty-state-cell">
                        <div className="empty-state-content">
                          <div className="empty-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                          </div>
                          <h3 className="empty-state-title">No routes found</h3>
                          <p className="empty-state-text">
                            Use the search bar or apply filters above to view route reports.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRoutes.length === 0 ? (
                    <tr className="table-row-empty">
                      <td colSpan={4} className="empty-state-cell">
                        <div className="empty-state-content">
                          <div className="empty-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                          </div>
                          <h3 className="empty-state-title">No routes found</h3>
                          <p className="empty-state-text">
                            {searchQuery.trim()
                              ? `No routes match "${searchQuery.trim()}". Try adjusting your search or filters.`
                              : hasFiltersApplied()
                                ? 'No routes match the current filters. Try adjusting your filter criteria.'
                                : 'No routes available. Use the search bar or apply filters to view reports.'}
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
                    filteredRoutes.map((route, index) => (
                      <tr key={route.id} className={index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                        <td className="invoice-number-cell">{route.routeCode}</td>
                        <td>{route.routeName}</td>
                        <td>{companies.find(c => c.id === route.companyId)?.companyName || 'N/A'}</td>
                        <td className="text-center">
                          <span className={getStatusBadgeClass(route.status)}>
                            {route.status}
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
                {dataLoaded && filteredRoutes.length > 0
                  ? `Showing ${startIndex + 1}-${endIndex} of ${summary.totalRoutes} items`
                  : 'Showing 0 of 0 items'}
              </div>
              <div className="pagination-right">
                <select
                  className="rows-per-page-select"
                  value={rowsPerPage}
                  disabled={!dataLoaded || filteredRoutes.length === 0}
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
                    disabled={currentPage === 1 || !dataLoaded || filteredRoutes.length === 0}
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
                          disabled={!dataLoaded || filteredRoutes.length === 0}
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
                    disabled={currentPage === totalPages || totalPages === 0 || !dataLoaded || filteredRoutes.length === 0}
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

export default RouteReportPage;
