import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useBarcodeReportFilters } from '../../../hooks/useBarcodeReportFilters';
import { barcodeLabelService, BarcodeLabelResponse } from '../../../services/barcodeLabelService';
import { companyService, CompanyResponse } from '../../../services/companyService';
import { hcfService, HcfResponse } from '../../../services/hcfService';
import AppLayout from '../../../components/layout/AppLayout';
import './barcodeUsageReportPage.css';

const BarcodeUsageReportPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Unified filter hook - manages all filter state in one object
  const {
    filters,
    pendingFilters,
    updateFilter,
    updatePendingFilter,
    applyFilters,
    clearFilters,
    updatePagination,
    updateSearchText,
    hasFiltersApplied,
    buildApiFilters,
  } = useBarcodeReportFilters();

  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const searchQuery = filters.searchText || '';

  // Data state
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [hcfs, setHcfs] = useState<HcfResponse[]>([]);
  const [barcodes, setBarcodes] = useState<BarcodeLabelResponse[]>([]);
  const [filteredBarcodes, setFilteredBarcodes] = useState<BarcodeLabelResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state (derived from filters)
  const currentPage = filters.page || 1;
  const rowsPerPage = filters.pageSize || 25;

  // Ref for auto-scroll to results
  const resultsRef = useRef<HTMLDivElement>(null);
  // Ref for filter button to position modal
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [filterModalPosition, setFilterModalPosition] = useState<{ top: number; left: number } | null>(null);

  // Summary state
  const [summary, setSummary] = useState({
    totalBarcodes: 0,
    barcodeCount: 0,
    qrCodeCount: 0,
  });

  // Load master data
  useEffect(() => {
    const loadMasterData = async () => {
      try {
        const [companiesData, hcfsData] = await Promise.all([
          companyService.getAllCompanies(),
          hcfService.getAllHcfs(),
        ]);
        setCompanies(companiesData);
        setHcfs(hcfsData);
      } catch (error: any) {
        console.error('Error loading master data:', error);
        // Set error state but don't block page rendering
        setError(error.message || 'Failed to load master data. Please refresh the page.');
        // Initialize with empty arrays so page can still render
        setCompanies([]);
        setHcfs([]);
      }
    };
    loadMasterData();
  }, []);

  // Filter HCFs based on selected company
  const filteredHcfs = filters.companyId
    ? hcfs.filter((hcf) => hcf.companyId === filters.companyId)
    : hcfs;

  // Generate context subtitle based on current filters
  const getContextSubtitle = (): string => {
    if (!hasFiltersApplied()) {
      return 'No filters applied. Select a date range or search to view barcode usage.';
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

    // HCF
    if (filters.hcfId) {
      const hcf = filteredHcfs.find(h => h.id === filters.hcfId);
      parts.push(hcf ? `HCF: ${hcf.hcfCode}` : 'Selected HCF');
    }

    // Barcode Type
    if (filters.barcodeType && filters.barcodeType !== 'All') {
      parts.push(`Type: ${filters.barcodeType}`);
    }

    // Color Block
    if (filters.colorBlock && filters.colorBlock !== 'All') {
      parts.push(`Color: ${filters.colorBlock}`);
    }

    return `Showing barcode usage for: ${parts.join(' • ')}`;
  };

  const barcodeTypeOptions = [
    { value: 'All', label: 'All Types' },
    { value: 'Barcode', label: 'Barcode' },
    { value: 'QR Code', label: 'QR Code' },
  ];

  const colorBlockOptions = [
    { value: 'All', label: 'All Colors' },
    { value: 'Yellow', label: 'Yellow' },
    { value: 'Red', label: 'Red' },
    { value: 'White', label: 'White' },
  ];

  // Load barcodes with filters
  const handleGenerateWithFilters = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build API filters
      const apiFilters = buildApiFilters();
      
      // Fetch barcodes with filters
      let allBarcodes: BarcodeLabelResponse[] = [];
      
      // If company filter is applied, fetch for that company
      if (apiFilters.companyId) {
        allBarcodes = await barcodeLabelService.getAllBarcodeLabels(apiFilters.companyId);
      } else {
        // Fetch for all companies - only if companies are loaded
        if (companies.length > 0) {
          for (const company of companies) {
            try {
              const companyBarcodes = await barcodeLabelService.getAllBarcodeLabels(company.id);
              allBarcodes.push(...companyBarcodes);
            } catch (err) {
              console.warn(`Failed to load barcodes for company ${company.companyName}:`, err);
            }
          }
        } else {
          // If no companies loaded, try to fetch without company filter
          // This allows the page to work even if master data failed to load
          try {
            allBarcodes = await barcodeLabelService.getAllBarcodeLabels();
          } catch (err) {
            console.warn('Failed to load barcodes without company filter:', err);
          }
        }
      }

      // Apply client-side filters
      let filtered = allBarcodes;

      // Date range filter
      if (filters.createdFromDate) {
        const fromDate = new Date(filters.createdFromDate);
        filtered = filtered.filter(barcode => new Date(barcode.createdOn) >= fromDate);
      }
      if (filters.createdToDate) {
        const toDate = new Date(filters.createdToDate);
        toDate.setHours(23, 59, 59, 999);
        filtered = filtered.filter(barcode => new Date(barcode.createdOn) <= toDate);
      }

      // Company filter (already applied in fetch)
      if (filters.companyId) {
        filtered = filtered.filter(barcode => barcode.companyId === filters.companyId);
      }

      // HCF filter
      if (filters.hcfId) {
        filtered = filtered.filter(barcode => barcode.hcfId === filters.hcfId);
      }

      // Barcode Type filter
      if (filters.barcodeType && filters.barcodeType !== 'All') {
        filtered = filtered.filter(barcode => barcode.barcodeType === filters.barcodeType);
      }

      // Color Block filter
      if (filters.colorBlock && filters.colorBlock !== 'All') {
        filtered = filtered.filter(barcode => barcode.colorBlock === filters.colorBlock);
      }

      // Search filter
      if (filters.searchText?.trim()) {
        const searchLower = filters.searchText.toLowerCase().trim();
        filtered = filtered.filter(barcode => {
          const barcodeValue = (barcode.barcodeValue || '').toLowerCase();
          const hcfCode = (barcode.hcfCode || '').toLowerCase();
          const company = companies.find(c => c.id === barcode.companyId);
          const companyName = (company?.companyName || '').toLowerCase();
          return barcodeValue.includes(searchLower) ||
                 hcfCode.includes(searchLower) ||
                 companyName.includes(searchLower) ||
                 barcode.sequenceNumber.toString().includes(searchLower);
        });
      }

      // Sort
      filtered.sort((a, b) => {
        const aValue = a[filters.sortBy as keyof BarcodeLabelResponse] || '';
        const bValue = b[filters.sortBy as keyof BarcodeLabelResponse] || '';
        if (filters.sortOrder === 'ASC') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Pagination
      const startIndex = (currentPage - 1) * rowsPerPage;
      const endIndex = startIndex + rowsPerPage;
      const paginatedBarcodes = filtered.slice(startIndex, endIndex);

      setBarcodes(filtered);
      setFilteredBarcodes(paginatedBarcodes);
      setDataLoaded(true);

      // Update summary
      setSummary({
        totalBarcodes: filtered.length,
        barcodeCount: filtered.filter(b => b.barcodeType === 'Barcode').length,
        qrCodeCount: filtered.filter(b => b.barcodeType === 'QR Code').length,
      });

    } catch (error: any) {
      console.error('Error loading barcodes:', error);
      setError(error.message || 'Failed to load barcode usage data');
      setBarcodes([]);
      setFilteredBarcodes([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters from pending to applied and fetch data
  const handleApplyFilters = async () => {
    applyFilters();
    setShowAdvancedFilters(false);
    await handleGenerateWithFilters();
  };

  // Clear all filters
  const handleReset = async () => {
    clearFilters();
    setShowAdvancedFilters(false);
    await handleGenerateWithFilters();
  };

  // Trigger load when filters change - but only if we have companies or if user explicitly searches/filters
  useEffect(() => {
    // Only auto-load if companies are loaded OR if user has applied filters/search
    if (companies.length > 0 || hasFiltersApplied() || filters.searchText?.trim()) {
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

  // Pagination calculations
  const totalPages = dataLoaded && summary.totalBarcodes > 0
    ? Math.ceil(summary.totalBarcodes / rowsPerPage)
    : 0;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + filteredBarcodes.length, summary.totalBarcodes);

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
          <span className="breadcrumb-item">Barcode Usage</span>
        </div>
        <div className="report-content-wrapper">
          {/* Page Header */}
          <div className="page-header">
            <h1 className="page-title">Barcode Usage Report</h1>
            {!hasFiltersApplied() && (
              <div className="page-context-subtitle">{getContextSubtitle()}</div>
            )}
            {error && companies.length === 0 && (
              <div style={{ 
                marginTop: '12px', 
                padding: '12px', 
                backgroundColor: '#fef2f2', 
                color: '#991b1b', 
                borderRadius: '6px',
                fontSize: '13px',
                border: '1px solid #fecaca'
              }}>
                <strong>Warning:</strong> Failed to load master data. Filter options may be limited. Please refresh the page or check your authentication.
              </div>
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
                placeholder="Search by Barcode Value, HCF Code, Company, Sequence Number"
                value={searchQuery}
                onChange={(e) => updateSearchText(e.target.value)}
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
                  onClick={() => {
                    updateSearchText('');
                    handleGenerateWithFilters();
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
                  updatePendingFilter('hcfId', filters.hcfId || '');
                  updatePendingFilter('barcodeType', filters.barcodeType || 'All');
                  updatePendingFilter('colorBlock', filters.colorBlock || 'All');
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
                pendingFilters.hcfId,
                pendingFilters.barcodeType && pendingFilters.barcodeType !== 'All' ? pendingFilters.barcodeType : '',
                pendingFilters.colorBlock && pendingFilters.colorBlock !== 'All' ? pendingFilters.colorBlock : '',
                pendingFilters.createdFromDate,
                pendingFilters.createdToDate
              ].filter(Boolean).length > 0 && (
                <span className="filter-count">
                  {[
                    pendingFilters.companyId,
                    pendingFilters.hcfId,
                    pendingFilters.barcodeType && pendingFilters.barcodeType !== 'All' ? pendingFilters.barcodeType : '',
                    pendingFilters.colorBlock && pendingFilters.colorBlock !== 'All' ? pendingFilters.colorBlock : '',
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
                        updatePendingFilter('hcfId', '');
                        updatePendingFilter('createdFromDate', '');
                        updatePendingFilter('createdToDate', '');
                        updatePendingFilter('barcodeType', 'All');
                        updatePendingFilter('colorBlock', 'All');
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
                          updatePendingFilter('hcfId', ''); // Reset HCF when company changes
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
                        onChange={(e) => updatePendingFilter('hcfId', e.target.value)}
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
                      <label className="filter-modal-label">Barcode Type</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.barcodeType || 'All'}
                        onChange={(e) => updatePendingFilter('barcodeType', e.target.value)}
                      >
                        {barcodeTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="filter-modal-group">
                      <label className="filter-modal-label">Color Block</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.colorBlock || 'All'}
                        onChange={(e) => updatePendingFilter('colorBlock', e.target.value)}
                      >
                        {colorBlockOptions.map((option) => (
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
                    <th>Barcode Value</th>
                    <th>HCF Code</th>
                    <th>Company</th>
                    <th>Barcode Type</th>
                    <th>Color Block</th>
                    <th>Sequence Number</th>
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
                      </tr>
                    ))
                  ) : !dataLoaded ? (
                    // Empty State Row - Data not loaded yet
                    <tr className="table-row-empty">
                      <td colSpan={7} className="empty-state-cell">
                        <div className="empty-state-content">
                          <div className="empty-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
                              <line x1="7" y1="8" x2="7" y2="16"></line>
                              <line x1="11" y1="8" x2="11" y2="16"></line>
                              <line x1="15" y1="8" x2="15" y2="16"></line>
                              <line x1="19" y1="8" x2="19" y2="16"></line>
                            </svg>
                          </div>
                          <h3 className="empty-state-title">No barcodes found</h3>
                          <p className="empty-state-text">
                            Use the search bar or apply filters above to view barcode usage reports
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredBarcodes.length === 0 ? (
                    // Empty State Row - No results found
                    <tr className="table-row-empty">
                      <td colSpan={7} className="empty-state-cell">
                        <div className="empty-state-content">
                          <div className="empty-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
                              <line x1="7" y1="8" x2="7" y2="16"></line>
                              <line x1="11" y1="8" x2="11" y2="16"></line>
                              <line x1="15" y1="8" x2="15" y2="16"></line>
                              <line x1="19" y1="8" x2="19" y2="16"></line>
                            </svg>
                          </div>
                          <h3 className="empty-state-title">No barcodes found</h3>
                          <p className="empty-state-text">
                            {searchQuery.trim() 
                              ? `No barcodes match "${searchQuery.trim()}". Try adjusting your search or filters.`
                              : hasFiltersApplied()
                                ? 'No barcodes match the current filters. Try adjusting your filter criteria.'
                                : 'No barcodes available. Use the search bar or apply filters to view reports.'}
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
                    filteredBarcodes.map((barcode, index) => {
                      const company = companies.find(c => c.id === barcode.companyId);
                      return (
                        <tr key={barcode.id} className={index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                          <td className="invoice-number-cell">{barcode.barcodeValue}</td>
                          <td>{barcode.hcfCode || 'N/A'}</td>
                          <td>{company?.companyName || 'N/A'}</td>
                          <td>{barcode.barcodeType}</td>
                          <td>
                            <span className={`status-badge status-badge--${barcode.colorBlock.toLowerCase()}`}>
                              {barcode.colorBlock}
                            </span>
                          </td>
                          <td>{barcode.sequenceNumber}</td>
                          <td>{formatDate(barcode.createdOn)}</td>
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
                {dataLoaded && filteredBarcodes.length > 0 
                  ? `Showing ${endIndex} of ${summary.totalBarcodes} items`
                  : 'Showing 0 of 0 items'}
              </div>
              <div className="pagination-right">
                <select
                  className="rows-per-page-select"
                  value={rowsPerPage}
                  disabled={!dataLoaded || filteredBarcodes.length === 0}
                  onChange={async (e) => {
                    updatePagination(1, Number(e.target.value));
                    await handleGenerateWithFilters();
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
                      await handleGenerateWithFilters();
                    }}
                    disabled={currentPage === 1 || !dataLoaded || filteredBarcodes.length === 0}
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
                            await handleGenerateWithFilters();
                          }}
                          disabled={!dataLoaded || filteredBarcodes.length === 0}
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
                      await handleGenerateWithFilters();
                    }}
                    disabled={currentPage === totalPages || totalPages === 0 || !dataLoaded || filteredBarcodes.length === 0}
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

export default BarcodeUsageReportPage;
