import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { wasteCollectionService, WasteCollectionResponse } from '../../../services/wasteCollectionService';
import { companyService, CompanyResponse } from '../../../services/companyService';
import { hcfService, HcfResponse } from '../../../services/hcfService';
import AppLayout from '../../../components/layout/AppLayout';
import './collectionReportPage.css';

interface CollectionFilters {
  page: number;
  pageSize: number;
  collectionFromDate: string;
  collectionToDate: string;
  companyId: string;
  hcfId: string;
  wasteColor: string;
  status: string;
  searchText: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

const CollectionReportPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<CollectionFilters>({
    page: 1,
    pageSize: 25,
    collectionFromDate: '',
    collectionToDate: '',
    companyId: '',
    hcfId: '',
    wasteColor: 'All',
    status: 'All',
    searchText: '',
    sortBy: 'collectionDate',
    sortOrder: 'DESC',
  });

  const [pendingFilters, setPendingFilters] = useState<Partial<CollectionFilters>>({
    collectionFromDate: '',
    collectionToDate: '',
    companyId: '',
    hcfId: '',
    wasteColor: 'All',
    status: 'All',
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const searchQuery = filters.searchText || '';

  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [hcfs, setHcfs] = useState<HcfResponse[]>([]);
  const [collections, setCollections] = useState<WasteCollectionResponse[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<WasteCollectionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPage = filters.page || 1;
  const rowsPerPage = filters.pageSize || 25;

  const resultsRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [filterModalPosition, setFilterModalPosition] = useState<{ top: number; left: number } | null>(null);

  const [summary, setSummary] = useState({
    totalCollections: 0,
    totalWeight: 0,
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
      filters.collectionFromDate ||
      filters.collectionToDate ||
      filters.companyId ||
      filters.hcfId ||
      (filters.wasteColor && filters.wasteColor !== 'All') ||
      (filters.status && filters.status !== 'All') ||
      filters.searchText?.trim()
    );
  };

  const getContextSubtitle = (): string => {
    if (!hasFiltersApplied()) {
      return 'No filters applied. Select a date range or search to view waste collection data.';
    }

    const parts: string[] = [];

    if (filters.collectionFromDate && filters.collectionToDate) {
      const fromDate = new Date(filters.collectionFromDate);
      const toDate = new Date(filters.collectionToDate);
      const fromStr = fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const toStr = toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      parts.push(`Date: ${fromStr}–${toStr}`);
    }

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

    if (filters.wasteColor && filters.wasteColor !== 'All') {
      parts.push(`Color: ${filters.wasteColor}`);
    }

    return parts.join(' • ');
  };

  const wasteColorOptions = [
    { value: 'All', label: 'All Colors' },
    { value: 'Yellow', label: 'Yellow' },
    { value: 'Red', label: 'Red' },
    { value: 'White', label: 'White' },
  ];

  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Collected', label: 'Collected' },
    { value: 'In Transit', label: 'In Transit' },
    { value: 'Processed', label: 'Processed' },
    { value: 'Disposed', label: 'Disposed' },
  ];

  const handleGenerateWithFilters = async () => {
    setLoading(true);
    setError(null);

    try {
      let allCollections: WasteCollectionResponse[] = [];

      // Fetch collections based on company filter
      if (filters.companyId) {
        // If company filter is set, we need to filter by company
        // Since wasteCollectionService might not have getAllCollections with filters,
        // we'll fetch all and filter client-side
        try {
          allCollections = await wasteCollectionService.getAllCollections();
          allCollections = allCollections.filter(c => c.companyId === filters.companyId);
        } catch (err) {
          console.warn('Error loading collections:', err);
          allCollections = [];
        }
      } else {
        try {
          allCollections = await wasteCollectionService.getAllCollections();
        } catch (err) {
          console.warn('Error loading collections:', err);
          allCollections = [];
        }
      }

      // Client-side filtering
      if (filters.collectionFromDate) {
        const fromDate = new Date(filters.collectionFromDate);
        allCollections = allCollections.filter(c => new Date(c.collectionDate) >= fromDate);
      }

      if (filters.collectionToDate) {
        const toDate = new Date(filters.collectionToDate);
        toDate.setHours(23, 59, 59, 999);
        allCollections = allCollections.filter(c => new Date(c.collectionDate) <= toDate);
      }

      if (filters.hcfId) {
        allCollections = allCollections.filter(c => c.hcfId === filters.hcfId);
      }

      if (filters.wasteColor && filters.wasteColor !== 'All') {
        allCollections = allCollections.filter(c => c.wasteColor === filters.wasteColor);
      }

      if (filters.status && filters.status !== 'All') {
        allCollections = allCollections.filter(c => c.status === filters.status);
      }

      if (filters.searchText?.trim()) {
        const searchLower = filters.searchText.toLowerCase().trim();
        allCollections = allCollections.filter(collection => {
          const barcode = (collection.barcode || '').toLowerCase();
          const company = companies.find(c => c.id === collection.companyId);
          const companyName = (company?.companyName || '').toLowerCase();
          const hcf = hcfs.find(h => h.id === collection.hcfId);
          const hcfCode = (hcf?.hcfCode || '').toLowerCase();
          return barcode.includes(searchLower) ||
                 companyName.includes(searchLower) ||
                 hcfCode.includes(searchLower) ||
                 (collection.weightKg && collection.weightKg.toString().includes(searchLower));
        });
      }

      // Sort
      allCollections.sort((a, b) => {
        const aValue = a[filters.sortBy as keyof WasteCollectionResponse] || '';
        const bValue = b[filters.sortBy as keyof WasteCollectionResponse] || '';
        if (filters.sortOrder === 'ASC') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Paginate
      const startIndex = (currentPage - 1) * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      const paginatedData = allCollections.slice(startIndex, endIndex);

      setCollections(allCollections);
      setFilteredCollections(paginatedData);
      setDataLoaded(true);

      setSummary({
        totalCollections: allCollections.length,
        totalWeight: allCollections.reduce((sum, c) => sum + (c.weightKg || 0), 0),
      });

    } catch (error: any) {
      console.error('Error loading waste collections:', error);
      setError(error.message || 'Failed to load waste collection data');
      setCollections([]);
      setFilteredCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = async () => {
    setFilters((prev) => ({
      ...prev,
      collectionFromDate: pendingFilters.collectionFromDate || '',
      collectionToDate: pendingFilters.collectionToDate || '',
      companyId: pendingFilters.companyId || '',
      hcfId: pendingFilters.hcfId || '',
      wasteColor: pendingFilters.wasteColor || 'All',
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
      collectionFromDate: '',
      collectionToDate: '',
      companyId: '',
      hcfId: '',
      wasteColor: 'All',
      status: 'All',
      searchText: '',
      sortBy: 'collectionDate',
      sortOrder: 'DESC',
    });
    setPendingFilters({
      collectionFromDate: '',
      collectionToDate: '',
      companyId: '',
      hcfId: '',
      wasteColor: 'All',
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

  const formatWeight = (weight: number | null | undefined): string => {
    if (weight === null || weight === undefined) return 'N/A';
    return `${weight.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'Collected':
        return 'status-badge status-badge--paid';
      case 'Processed':
        return 'status-badge status-badge--generated';
      case 'Disposed':
        return 'status-badge status-badge--paid';
      case 'In Transit':
        return 'status-badge status-badge--partial';
      case 'Pending':
        return 'status-badge status-badge--draft';
      default:
        return 'status-badge status-badge--generated';
    }
  };

  const getColorBadgeClass = (color: string): string => {
    switch (color) {
      case 'Yellow':
        return 'status-badge status-badge--partial';
      case 'Red':
        return 'status-badge status-badge--due';
      case 'White':
        return 'status-badge status-badge--generated';
      default:
        return 'status-badge status-badge--generated';
    }
  };

  const totalPages = dataLoaded && summary.totalCollections > 0
    ? Math.ceil(summary.totalCollections / rowsPerPage)
    : 0;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + filteredCollections.length, summary.totalCollections);

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
          <span className="breadcrumb-item">Waste Collection</span>
        </div>
        <div className="report-content-wrapper">
          <div className="page-header">
            <h1 className="page-title">Waste Collection Report</h1>
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
                placeholder="Search by Barcode, Company, HCF, Weight"
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
                    collectionFromDate: filters.collectionFromDate || '',
                    collectionToDate: filters.collectionToDate || '',
                    companyId: filters.companyId || '',
                    hcfId: filters.hcfId || '',
                    wasteColor: filters.wasteColor || 'All',
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
                filters.collectionFromDate,
                filters.collectionToDate,
                filters.wasteColor && filters.wasteColor !== 'All' ? filters.wasteColor : '',
                filters.status && filters.status !== 'All' ? filters.status : ''
              ].filter(Boolean).length > 0 && (
                <span className="filter-count">
                  {[
                    filters.companyId,
                    filters.hcfId,
                    filters.collectionFromDate,
                    filters.collectionToDate,
                    filters.wasteColor && filters.wasteColor !== 'All' ? filters.wasteColor : '',
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
                          collectionFromDate: '',
                          collectionToDate: '',
                          companyId: '',
                          hcfId: '',
                          wasteColor: 'All',
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
                      <label className="filter-modal-label">Collection Date</label>
                      <div className="filter-date-range">
                        <input
                          type="date"
                          className="filter-modal-input"
                          value={pendingFilters.collectionFromDate || ''}
                          onChange={(e) => setPendingFilters(prev => ({ ...prev, collectionFromDate: e.target.value }))}
                          placeholder="From Date"
                        />
                        <span className="filter-date-separator">to</span>
                        <input
                          type="date"
                          className="filter-modal-input"
                          value={pendingFilters.collectionToDate || ''}
                          onChange={(e) => setPendingFilters(prev => ({ ...prev, collectionToDate: e.target.value }))}
                          placeholder="To Date"
                        />
                      </div>
                    </div>

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
                      <label className="filter-modal-label">Waste Color</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.wasteColor || 'All'}
                        onChange={(e) => setPendingFilters(prev => ({ ...prev, wasteColor: e.target.value }))}
                      >
                        {wasteColorOptions.map((option) => (
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
                    <th>Barcode</th>
                    <th>Company</th>
                    <th>HCF</th>
                    <th>Collection Date</th>
                    <th>Waste Color</th>
                    <th className="text-right">Weight (kg)</th>
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
                        <td className="text-right"><div className="skeleton-cell"></div></td>
                        <td><div className="skeleton-cell skeleton-badge"></div></td>
                      </tr>
                    ))
                  ) : !dataLoaded ? (
                    <tr className="table-row-empty">
                      <td colSpan={7} className="empty-state-cell">
                        <div className="empty-state-content">
                          <div className="empty-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                          </div>
                          <h3 className="empty-state-title">No waste collection data found</h3>
                          <p className="empty-state-text">
                            Use the search bar or apply filters above to view waste collection reports.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCollections.length === 0 ? (
                    <tr className="table-row-empty">
                      <td colSpan={7} className="empty-state-cell">
                        <div className="empty-state-content">
                          <div className="empty-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                          </div>
                          <h3 className="empty-state-title">No waste collection data found</h3>
                          <p className="empty-state-text">
                            {searchQuery.trim()
                              ? `No collections match "${searchQuery.trim()}". Try adjusting your search or filters.`
                              : hasFiltersApplied()
                                ? 'No collections match the current filters. Try adjusting your filter criteria.'
                                : 'No waste collection data available. Use the search bar or apply filters to view reports.'}
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
                    filteredCollections.map((collection, index) => (
                      <tr key={collection.id} className={index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                        <td className="invoice-number-cell">{collection.barcode}</td>
                        <td>{companies.find(c => c.id === collection.companyId)?.companyName || 'N/A'}</td>
                        <td>{hcfs.find(h => h.id === collection.hcfId)?.hcfCode || 'N/A'}</td>
                        <td>{formatDate(collection.collectionDate)}</td>
                        <td>
                          <span className={getColorBadgeClass(collection.wasteColor)}>
                            {collection.wasteColor}
                          </span>
                        </td>
                        <td className="text-right">{formatWeight(collection.weightKg)}</td>
                        <td className="text-center">
                          <span className={getStatusBadgeClass(collection.status)}>
                            {collection.status}
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
                {dataLoaded && filteredCollections.length > 0
                  ? `Showing ${startIndex + 1}-${endIndex} of ${summary.totalCollections} items`
                  : 'Showing 0 of 0 items'}
              </div>
              <div className="pagination-right">
                <select
                  className="rows-per-page-select"
                  value={rowsPerPage}
                  disabled={!dataLoaded || filteredCollections.length === 0}
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
                    disabled={currentPage === 1 || !dataLoaded || filteredCollections.length === 0}
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
                          disabled={!dataLoaded || filteredCollections.length === 0}
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
                    disabled={currentPage === totalPages || totalPages === 0 || !dataLoaded || filteredCollections.length === 0}
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

export default CollectionReportPage;
