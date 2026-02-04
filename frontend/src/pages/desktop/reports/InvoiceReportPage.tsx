import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useInvoiceReportFilters } from '../../../hooks/useInvoiceReportFilters';
import { 
  getInvoiceReport,
  InvoiceReportItem,
  InvoiceReportResponse,
  InvoiceResponse 
} from '../../../services/invoiceService';
import { companyService, CompanyResponse } from '../../../services/companyService';
import { hcfService, HcfResponse } from '../../../services/hcfService';
import AppLayout from '../../../components/layout/AppLayout';
import './invoiceReportPage.css';

const InvoiceReportPage = () => {
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
  } = useInvoiceReportFilters();

  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false); // Default: COLLAPSED
  const searchQuery = filters.searchText || '';

  // Data state
  const [companies, setCompanies] = useState<CompanyResponse[]>([]);
  const [hcfs, setHcfs] = useState<HcfResponse[]>([]);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceResponse[]>([]);
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
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  // Summary state
  const [summary, setSummary] = useState({
    totalInvoices: 0,
    totalAmount: 0,
    paidAmount: 0,
    balanceAmount: 0,
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportDropdown && exportButtonRef.current && !exportButtonRef.current.contains(event.target as Node)) {
        const dropdown = document.querySelector('.export-dropdown-menu');
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setShowExportDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

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
      } catch (error) {
        console.error('Error loading master data:', error);
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
      return 'No filters applied. Select a date range or search to view invoices.';
    }

    const parts: string[] = [];

    // Date range
    if (filters.invoiceFromDate && filters.invoiceToDate) {
      const fromDate = new Date(filters.invoiceFromDate);
      const toDate = new Date(filters.invoiceToDate);
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Check if it's current month
      if (fromDate.getMonth() === currentMonth && 
          fromDate.getFullYear() === currentYear &&
          toDate.getMonth() === currentMonth && 
          toDate.getFullYear() === currentYear) {
        parts.push('Current Month');
      } else {
        const fromStr = fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const toStr = toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        parts.push(`${fromStr} - ${toStr}`);
      }
    } else if (filters.invoiceFromDate || filters.invoiceToDate) {
      if (filters.invoiceFromDate) {
        const fromDate = new Date(filters.invoiceFromDate);
        parts.push(`From ${fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
      }
      if (filters.invoiceToDate) {
        const toDate = new Date(filters.invoiceToDate);
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
      parts.push(hcf ? hcf.hcfName : 'Selected HCF');
    } else {
      parts.push('All HCFs');
    }

    // Status
    if (filters.status && filters.status !== 'All') {
      parts.push(filters.status);
    } else {
      parts.push('All Status');
    }

    return `Showing invoices for: ${parts.join(' • ')}`;
  };

  // Generate short filter summary for results header
  const getFilterSummary = (): string => {
    if (!dataLoaded) {
      return 'No data loaded';
    }

    const activeFilters: string[] = [];
    
    if (searchQuery) {
      activeFilters.push(`Search: "${searchQuery.substring(0, 20)}${searchQuery.length > 20 ? '...' : ''}"`);
    }
    
    if (filters.companyId) {
      const company = companies.find(c => c.id === filters.companyId);
      if (company) activeFilters.push(company.companyName);
    }
    
    if (filters.hcfId) {
      const hcf = filteredHcfs.find(h => h.id === filters.hcfId);
      if (hcf) activeFilters.push(hcf.hcfCode);
    }
    
    if (filters.status && filters.status !== 'All') {
      activeFilters.push(filters.status);
    }
    
    if (filters.billingType && filters.billingType !== 'All') {
      activeFilters.push(filters.billingType);
    }

    if (activeFilters.length === 0) {
      return 'All invoices shown';
    }

    return activeFilters.join(' • ');
  };

  // Generate lightweight filter summary for below Results title
  const getLightweightFilterSummary = (): string => {
    if (!dataLoaded) {
      return '';
    }

    const hasAnyFilter = filters.companyId || filters.hcfId || (filters.status && filters.status !== 'All') || (filters.billingType && filters.billingType !== 'All') || filters.invoiceFromDate || filters.invoiceToDate || searchQuery;
    
    if (!hasAnyFilter) {
      return 'Showing all invoices (no filters applied)';
    }

    const filterParts: string[] = [];

    // Company
    if (filters.companyId) {
      const company = companies.find(c => c.id === filters.companyId);
      if (company) {
        filterParts.push(`Company: ${company.companyName}`);
      }
    }

    // HCF
    if (filters.hcfId) {
      const hcf = filteredHcfs.find(h => h.id === filters.hcfId);
      if (hcf) {
        filterParts.push(`HCF: ${hcf.hcfCode}`);
      }
    }

    // Date range
    if (filters.invoiceFromDate && filters.invoiceToDate) {
      const fromDate = new Date(filters.invoiceFromDate);
      const toDate = new Date(filters.invoiceToDate);
      const fromStr = fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const toStr = toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      filterParts.push(`Date: ${fromStr}–${toStr}`);
    } else if (filters.invoiceFromDate) {
      const fromDate = new Date(filters.invoiceFromDate);
      const fromStr = fromDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      filterParts.push(`Date: From ${fromStr}`);
    } else if (filters.invoiceToDate) {
      const toDate = new Date(filters.invoiceToDate);
      const toStr = toDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      filterParts.push(`Date: Until ${toStr}`);
    }

    // Status
    if (filters.status && filters.status !== 'All') {
      filterParts.push(`Status: ${filters.status}`);
    }

    // Billing Type
    if (filters.billingType && filters.billingType !== 'All') {
      filterParts.push(`Billing: ${filters.billingType}`);
    }

    // Search (only show if other filters exist, otherwise it's redundant)
    if (searchQuery && filterParts.length > 0) {
      filterParts.push(`Search: "${searchQuery.substring(0, 15)}${searchQuery.length > 15 ? '...' : ''}"`);
    }

    return filterParts.join(' • ');
  };

  const statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Draft', label: 'Draft' },
    { value: 'Generated', label: 'Generated' },
    { value: 'Partially Paid', label: 'Partially Paid' },
    { value: 'Paid', label: 'Paid' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  const billingTypeOptions = [
    { value: 'All', label: 'All Types' },
    { value: 'Monthly', label: 'Monthly' },
    { value: 'Quarterly', label: 'Quarterly' },
    { value: 'Yearly', label: 'Yearly' },
  ];

  const handleGenerate = async () => {
    // Backend will use default date range if not provided
    await handleGenerateWithFilters();
  };

  // Client-side filtering is minimal now - backend handles most filtering
  const applySearchAndFilters = (invoiceList: InvoiceResponse[]) => {
    // Backend already filtered, so just set the list
    setFilteredInvoices(invoiceList);
    calculateSummary(invoiceList);
  };

  // Initial load - trigger once on mount (only if no search/filters)
  useEffect(() => {
    if (!dataLoaded && !loading && !filters.searchText?.trim() && !hasFiltersApplied()) {
      // Initial load - backend will apply default 90-day date range if no filters
      handleGenerateWithFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Trigger backend search when search query or filters change (debounced)
  useEffect(() => {
    // Prevent triggering if already loading
    if (loading) {
      return;
    }

    // Skip if no search and no filters and data not loaded yet (initial load handled separately)
    if (!dataLoaded && !filters.searchText?.trim() && !hasFiltersApplied()) {
      return;
    }

    // Debounce search to avoid too many API calls
    const searchTimeout = setTimeout(() => {
      // Trigger when filters or search change
      if (!loading) {
        handleGenerateWithFilters();
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(searchTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.searchText, filters.invoiceFromDate, filters.invoiceToDate, filters.companyId, filters.hcfId, filters.status, filters.billingType, filters.page, filters.pageSize]);

  const calculateSummary = (invoiceList: InvoiceResponse[]) => {
    const total = invoiceList.length;
    const totalAmount = invoiceList.reduce((sum, inv) => sum + (inv.invoiceValue || 0), 0);
    const paidAmount = invoiceList.reduce((sum, inv) => sum + (inv.totalPaidAmount || 0), 0);
    const balanceAmount = invoiceList.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);

    setSummary({
      totalInvoices: total,
      totalAmount,
      paidAmount,
      balanceAmount,
    });
  };

  // Apply filters from pending to applied and fetch from backend
  const handleApplyFilters = async () => {
    // Apply pending filters to active filters using unified hook
    // This updates the filters state (async)
    applyFilters();
    setShowAdvancedFilters(false);
    
    // Build API filters from pendingFilters directly to avoid race condition
    // (applyFilters() updates state async, so we use pendingFilters here to ensure correct values)
    const apiFilters: InvoiceReportFilters = {
      page: 1, // Reset to first page when applying filters
      pageSize: filters.pageSize || 25,
      sortBy: filters.sortBy || 'invoiceDate',
      sortOrder: filters.sortOrder || 'DESC',
    };

    // Only include non-empty, non-default values from pendingFilters
    if (pendingFilters.invoiceFromDate) apiFilters.invoiceFromDate = pendingFilters.invoiceFromDate;
    if (pendingFilters.invoiceToDate) apiFilters.invoiceToDate = pendingFilters.invoiceToDate;
    if (pendingFilters.companyId) apiFilters.companyId = pendingFilters.companyId;
    if (pendingFilters.hcfId) apiFilters.hcfId = pendingFilters.hcfId;
    if (pendingFilters.status && pendingFilters.status !== 'All') apiFilters.status = pendingFilters.status;
    if (pendingFilters.billingType && pendingFilters.billingType !== 'All') apiFilters.billingType = pendingFilters.billingType;
    // Keep search text from active filters (search is separate from filter modal)
    if (filters.searchText?.trim()) apiFilters.searchText = filters.searchText.trim();

    // Call API with filters built from pendingFilters
    // Use the same logic as handleGenerateWithFilters but with explicit filters
    setLoading(true);
    setError(null);
    
    try {
      const response: InvoiceReportResponse = await getInvoiceReport(apiFilters);
      
      // Validate response structure
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response format from server');
      }
      
      if (!response.meta) {
        console.error('Missing meta in response:', response);
        throw new Error('Missing pagination metadata in response');
      }
      
      // Map response data to InvoiceResponse format
      let mappedInvoices: InvoiceResponse[] = (response.data || []).map((item) => ({
        id: item.invoiceId,
        invoiceNumber: item.invoiceNumber,
        invoiceDate: item.invoiceDate,
        dueDate: item.dueDate,
        companyId: item.companyId,
        companyName: item.companyName,
        hcfId: item.hcfId,
        hcfName: item.hcfName,
        hcfCode: item.hcfCode,
        billingType: item.billingType,
        invoiceValue: item.invoiceValue,
        totalPaidAmount: item.totalPaidAmount,
        balanceAmount: item.balanceAmount,
        status: item.status,
      }));
      
      setInvoices(mappedInvoices);
      applySearchAndFilters(mappedInvoices);
      setDataLoaded(true);
      
      // Update summary
      const totalAmount = mappedInvoices.reduce((sum, inv) => sum + (inv.invoiceValue || 0), 0);
      const paidAmount = mappedInvoices.reduce((sum, inv) => sum + (inv.totalPaidAmount || 0), 0);
      const balanceAmount = mappedInvoices.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);
      setSummary({
        totalInvoices: response.meta?.totalRecords || 0,
        totalAmount,
        paidAmount,
        balanceAmount,
      });
      
    } catch (error: any) {
      console.error('Error applying filters:', error);
      setError(error.message || 'Failed to apply filters');
    } finally {
      setLoading(false);
    }
  };

  // Generate report with current filters using unified filter hook
  const handleGenerateWithFilters = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build API-ready filters using the unified filter hook
      const apiFilters = buildApiFilters();

      // Call the POST endpoint with unified filter object
      // Backend will apply default 90-day date range if no filters provided
      const response: InvoiceReportResponse = await getInvoiceReport(apiFilters);
      
      // If searching for a specific invoice number and no results, try client-side fallback
      if (apiFilters.searchText && response.data.length === 0) {
        // If backend says HAS_RESULTS but totalRecords is 0, use client-side fallback
        if (response?.meta?.state === 'HAS_RESULTS' && response?.meta?.totalRecords === 0) {
          try {
            // Load all invoices without search filter (respecting backend pageSize limit of 100)
            const fallbackFilters = { ...apiFilters };
            delete fallbackFilters.searchText;
            fallbackFilters.page = 1;
            fallbackFilters.pageSize = 100; // Backend limit: max 100 per page
            
            // Fetch multiple pages if needed (up to 5 pages = 500 records max)
            let allFallbackInvoices: InvoiceReportItem[] = [];
            let currentPage = 1;
            const maxPages = 5; // Limit to prevent too many API calls
            
            while (currentPage <= maxPages) {
              fallbackFilters.page = currentPage;
              const fallbackResponse = await getInvoiceReport(fallbackFilters);
              
              if (fallbackResponse?.data && fallbackResponse.data.length > 0) {
                allFallbackInvoices = allFallbackInvoices.concat(fallbackResponse.data);
                
                // If we got less than pageSize, we've reached the end
                if (fallbackResponse.data.length < fallbackFilters.pageSize) {
                  break;
                }
                
                currentPage++;
              } else {
                break; // No more data
              }
            }
            
            if (allFallbackInvoices.length > 0) {
              const searchLower = apiFilters.searchText.toLowerCase().trim();
              const clientFiltered = allFallbackInvoices.filter((item: InvoiceReportItem) => {
                const invoiceNum = (item.invoiceNumber || '').toLowerCase();
                const companyName = (item.companyName || '').toLowerCase();
                const hcfCode = (item.hcfCode || '').toLowerCase();
                const status = (item.status || '').toLowerCase();
                
                return invoiceNum.includes(searchLower) ||
                       companyName.includes(searchLower) ||
                       hcfCode.includes(searchLower) ||
                       status.includes(searchLower) ||
                       (item.invoiceValue && item.invoiceValue.toString().includes(searchLower));
              });
              
              if (clientFiltered.length > 0) {
                // Replace response data with client-filtered results
                response.data = clientFiltered;
                // Update meta to reflect client-side filtering
                if (response.meta) {
                  response.meta.totalRecords = clientFiltered.length;
                  response.meta.dataCount = clientFiltered.length;
                  response.meta.state = clientFiltered.length > 0 ? 'HAS_RESULTS' : 'NO_RESULTS';
                  response.meta.totalPages = Math.ceil(clientFiltered.length / (apiFilters.pageSize || 25));
                }
              }
            }
          } catch (fallbackError) {
            console.error('Client-side fallback failed:', fallbackError);
          }
        }
      }
      
      // Validate response structure
      if (!response || !response.data || !Array.isArray(response.data)) {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response format from server');
      }
      
      if (!response.meta) {
        console.error('Missing meta in response:', response);
        throw new Error('Missing pagination metadata in response');
      }
      
      // Map response data to InvoiceResponse format
      
      let mappedInvoices: InvoiceResponse[] = (response.data || []).map((item) => ({
        invoiceId: item.invoiceId,
        companyId: item.companyId,
        hcfId: item.hcfId,
        invoiceNumber: item.invoiceNumber,
        invoiceDate: item.invoiceDate,
        dueDate: item.dueDate,
        billingType: item.billingType as 'Monthly' | 'Quarterly' | 'Yearly',
        billingDays: null,
        billingOption: 'Bed-wise' as const,
        generationType: 'Manual' as const,
        bedCount: null,
        bedRate: null,
        weightInKg: null,
        kgRate: null,
        lumpsumAmount: null,
        taxableValue: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        roundOff: 0,
        invoiceValue: item.invoiceValue,
        totalPaidAmount: item.totalPaidAmount,
        balanceAmount: item.balanceAmount,
        status: item.status as 'Draft' | 'Generated' | 'Partially Paid' | 'Paid' | 'Cancelled',
        isLocked: false,
        lockedAfterDate: null,
        financialYear: '',
        sequenceNumber: 0,
        billingPeriodStart: null,
        billingPeriodEnd: null,
        notes: null,
        createdBy: null,
        createdOn: new Date().toISOString(),
        modifiedBy: null,
        modifiedOn: new Date().toISOString(),
        companyName: item.companyName,
        companyCode: item.companyCode,
        hcfName: item.hcfName,
        hcfCode: item.hcfCode,
      }));

      // Note: Client-side filtering removed - backend handles all search/filtering
      // If backend search doesn't return results, it means the invoice doesn't match the search criteria
      // This could be due to:
      // 1. Case sensitivity in backend search
      // 2. Exact match requirement vs partial match
      // 3. Invoice number format differences (spaces, dashes, etc.)
      // Check console logs for detailed search query and response information

      // Update state - ensure arrays are never undefined
      // Force state update to ensure React re-renders
      const invoicesToSet = mappedInvoices || [];
      
      // Use functional updates to ensure React detects the change
      setInvoices(() => invoicesToSet);
      setFilteredInvoices(() => invoicesToSet);
      setDataLoaded(() => true);
      
      // Update pagination from backend (only if not searching, to avoid page conflicts)
      if (response.meta && !searchQuery.trim()) {
        updatePagination(response.meta.page);
      } else if (response.meta && searchQuery.trim()) {
        // When searching, keep page at 1 if we're on page 1, otherwise use backend page
        if (currentPage === 1) {
          updatePagination(1);
        } else {
          updatePagination(response.meta.page);
        }
      }

      // Calculate summary from response data
      const dataArray = response.data || [];
      const totalAmount = dataArray.reduce((sum, inv) => sum + (inv.invoiceValue || 0), 0);
      const paidAmount = dataArray.reduce((sum, inv) => sum + (inv.totalPaidAmount || 0), 0);
      const balanceAmount = dataArray.reduce((sum, inv) => sum + (inv.balanceAmount || 0), 0);
      
      setSummary({
        totalInvoices: response.meta?.totalRecords || 0,
        totalAmount,
        paidAmount,
        balanceAmount,
      });
      
      // Note: Filters are already applied via applyFilters() call in handleApplyFilters
      // Auto-collapse filters after applying
      setShowAdvancedFilters(false);
      
      // Auto-scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      
      // Report fetched successfully - state updated above
      
    } catch (error: any) {
      console.error('Error generating report:', error);
      setError(error.message || 'Failed to generate report');
      // Don't clear data on error to prevent layout collapse
      // Only clear if it's a critical error
      if (error.message?.includes('Invalid response') || error.message?.includes('Missing')) {
        setInvoices([]);
        setFilteredInvoices([]);
        setDataLoaded(false);
      }
      // Show error but keep layout stable
      console.error('Report error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Clear all filters using unified filter hook
  const handleReset = async () => {
    clearFilters(); // Clears both active and pending filters
    setShowAdvancedFilters(false);
    // Reload all invoices after clearing filters
    await handleGenerateWithFilters();
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'Paid':
        return 'status-badge status-badge--paid';
      case 'Partially Paid':
        return 'status-badge status-badge--partial';
      case 'Generated':
      case 'Unpaid':
        return 'status-badge status-badge--unpaid';
      case 'Draft':
        return 'status-badge status-badge--draft';
      case 'Cancelled':
      case 'Overdue':
        return 'status-badge status-badge--overdue';
      default:
        return 'status-badge status-badge--unpaid';
    }
  };

  // Pagination calculations - use backend pagination
  const totalPages = dataLoaded && summary.totalInvoices > 0
    ? Math.ceil(summary.totalInvoices / rowsPerPage)
    : 0;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + (filteredInvoices?.length || 0);
  // Backend already returns paginated data, so use it directly
  const paginatedInvoices = filteredInvoices || [];
  
  // Render check removed - no debug logging needed

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (filteredInvoices.length === 0) {
      alert('No data to export');
      return;
    }

    // TODO: Implement actual export functionality
    alert(`Exporting ${filteredInvoices.length} invoices as ${format.toUpperCase()}`);
  };

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
          <Link to="/dashboard" className="breadcrumb-home">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </Link>
          <span className="breadcrumb-separator">&gt;</span>
          <Link to="/report" className="breadcrumb-item">Reports</Link>
          <span className="breadcrumb-separator">&gt;</span>
          <span className="breadcrumb-item breadcrumb-item--active">Invoice Generation & Printing</span>
        </div>
          <div className="report-content-wrapper">
            {/* Page Header - Compact */}
            <div className="page-header">
              <h1 className="page-title">Invoice Generation & Printing Report</h1>
              <div className="page-context-subtitle">{getContextSubtitle()}</div>
            </div>

            {/* Global Search & Actions Row - Directly below title */}
            <div className="search-actions-row">
              <div className={`search-container ${loading ? 'loading' : ''}`}>
                <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input
                  type="text"
                  className="global-search-input"
                  placeholder="Search by Invoice Number, Company, HCF, Status..."
                  value={searchQuery}
                  onChange={(e) => updateSearchText(e.target.value)}
                  onKeyDown={(e) => {
                    // Trigger search immediately on Enter key
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
                      updateSearchText(''); // Uses unified filter hook (resets page to 1)
                      // Trigger API reload to show all invoices when search is cleared
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
              <div className="action-buttons-group">
                <button
                  type="button"
                  ref={filterButtonRef}
                  className={`btn btn-filters-toggle ${showAdvancedFilters ? 'active' : ''} ${loading ? 'loading' : ''}`}
                  onClick={() => {
                    if (loading) return;
                    setShowExportDropdown(false);
                    // Sync pendingFilters with current filters when opening modal
                    if (!showAdvancedFilters) {
                      updatePendingFilter('companyId', filters.companyId || '');
                      updatePendingFilter('hcfId', filters.hcfId || '');
                      updatePendingFilter('status', filters.status || 'All');
                      updatePendingFilter('billingType', filters.billingType || 'All');
                      updatePendingFilter('invoiceFromDate', filters.invoiceFromDate || '');
                      updatePendingFilter('invoiceToDate', filters.invoiceToDate || '');
                    }
                    if (filterButtonRef.current) {
                      const rect = filterButtonRef.current.getBoundingClientRect();
                      setFilterModalPosition({
                        top: rect.bottom + 8, // 8px gap below button
                        left: rect.left // Align to left edge of button
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
                    filters.status && filters.status !== 'All' ? filters.status : '',
                    filters.billingType && filters.billingType !== 'All' ? filters.billingType : '',
                    filters.invoiceFromDate,
                    filters.invoiceToDate
                  ].filter(Boolean).length > 0 && (
                    <span className="filter-count">
                      {[
                        filters.companyId,
                        filters.hcfId,
                        filters.status && filters.status !== 'All' ? filters.status : '',
                        filters.billingType && filters.billingType !== 'All' ? filters.billingType : '',
                        filters.invoiceFromDate,
                        filters.invoiceToDate
                      ].filter(Boolean).length}
                    </span>
                  )}
                </button>
                <div className="export-dropdown-wrapper">
                  <button
                    type="button"
                    ref={exportButtonRef}
                    className={`btn btn-export ${showExportDropdown ? 'active' : ''}`}
                    onClick={() => {
                      setShowAdvancedFilters(false);
                      setShowExportDropdown(!showExportDropdown);
                    }}
                    disabled={loading || filteredInvoices.length === 0}
                    title="Export"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Export
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-arrow">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  {showExportDropdown && (
                    <div className="export-dropdown-menu">
                      <button
                        type="button"
                        className="export-option"
                        onClick={() => {
                          handleExport('pdf');
                          setShowExportDropdown(false);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        PDF
                      </button>
                      <button
                        type="button"
                        className="export-option"
                        onClick={() => {
                          handleExport('excel');
                          setShowExportDropdown(false);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        Excel
                      </button>
                      <button
                        type="button"
                        className="export-option"
                        onClick={() => {
                          handleExport('csv');
                          setShowExportDropdown(false);
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        CSV
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

          {/* Filter Modal Overlay - Rendered via Portal */}
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
                        updatePendingFilter('invoiceFromDate', '');
                        updatePendingFilter('invoiceToDate', '');
                        updatePendingFilter('status', 'All');
                        updatePendingFilter('billingType', 'All');
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
                      <label className="filter-modal-label">Invoice Date</label>
                      <div className="filter-date-range">
                        <input
                          type="date"
                          className="filter-modal-input"
                          value={pendingFilters.invoiceFromDate || ''}
                          onChange={(e) => updatePendingFilter('invoiceFromDate', e.target.value)}
                          placeholder="Select Date"
                        />
                        <span className="filter-date-separator">to</span>
                        <input
                          type="date"
                          className="filter-modal-input"
                          value={pendingFilters.invoiceToDate || ''}
                          onChange={(e) => updatePendingFilter('invoiceToDate', e.target.value)}
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
                      <label className="filter-modal-label">Billing Type</label>
                      <select
                        className="filter-modal-select"
                        value={pendingFilters.billingType || 'All'}
                        onChange={(e) => updatePendingFilter('billingType', e.target.value)}
                      >
                        {billingTypeOptions.map((option) => (
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
                      setShowAdvancedFilters(false); // Close modal after applying
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


          {/* Results Section */}
          <div className="results-section" ref={resultsRef}>
            {/* Table Scroll Container */}
            <div className="table-scroll-container">
              <table className="invoice-table">
                <thead className="table-header">
                  <tr>
                    <th>INVOICE NO</th>
                    <th>COMPANY</th>
                    <th>HCF</th>
                    <th>INVOICE DATE</th>
                    <th>BILLING TYPE</th>
                    <th className="text-right">INVOICE AMOUNT</th>
                    <th className="text-right">PAID AMOUNT</th>
                    <th className="text-right">BALANCE</th>
                    <th className="text-center">STATUS</th>
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
                        <td className="text-right"><div className="skeleton-cell"></div></td>
                        <td className="text-right"><div className="skeleton-cell"></div></td>
                        <td className="text-right"><div className="skeleton-cell"></div></td>
                        <td><div className="skeleton-cell skeleton-badge"></div></td>
                      </tr>
                    ))
                  ) : !dataLoaded ? (
                    // Empty State Row - Data not loaded yet
                      <tr className="table-row-empty">
                      <td colSpan={9} className="empty-state-cell">
                        <div className="empty-state-content">
                          <div className="empty-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                          </div>
                          <h3 className="empty-state-title">No invoices found</h3>
                          <p className="empty-state-text">
                            Use the search bar or apply filters above to view invoice reports
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedInvoices.length === 0 ? (
                    // Empty State Row - No results found (data loaded but empty)
                      <tr className="table-row-empty">
                      <td colSpan={9} className="empty-state-cell">
                        <div className="empty-state-content">
                          <div className="empty-state-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                          </div>
                          <h3 className="empty-state-title">No invoices found</h3>
                          <p className="empty-state-text">
                            {searchQuery.trim() 
                              ? `No invoices match "${searchQuery.trim()}". Try adjusting your search or filters.`
                              : hasFiltersApplied()
                                ? 'No invoices match the current filters. Try adjusting your filter criteria.'
                                : 'No invoices available. Use the search bar or apply filters to view reports.'}
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
                    // Data Rows - Show the actual data
                    paginatedInvoices.map((invoice, index) => (
                      <tr key={invoice.invoiceId} className={index % 2 === 0 ? 'table-row-even' : 'table-row-odd'}>
                        <td className="invoice-number-cell">{invoice.invoiceNumber}</td>
                        <td>{invoice.companyName || 'N/A'}</td>
                        <td>{invoice.hcfCode || 'N/A'}</td>
                        <td>{formatDate(invoice.invoiceDate)}</td>
                        <td>{invoice.billingType}</td>
                        <td className="text-right">{formatCurrency(invoice.invoiceValue)}</td>
                        <td className="text-right">{formatCurrency(invoice.totalPaidAmount)}</td>
                        <td className="text-right">{formatCurrency(invoice.balanceAmount)}</td>
                        <td className="text-center">
                          <span className={getStatusBadgeClass(invoice.status)}>
                            {invoice.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls - Always Visible, Outside Scroll Container */}
            <div className="pagination-controls">
                  <div className="pagination-info">
                    {dataLoaded && filteredInvoices.length > 0 
                      ? `Showing ${startIndex + 1} to ${endIndex} of ${summary.totalInvoices} items`
                      : 'Showing 0 to 0 of 0 items'}
                  </div>
                  <div className="pagination-right">
                    <select
                      className="rows-per-page-select"
                      value={rowsPerPage}
                      disabled={!dataLoaded || filteredInvoices.length === 0}
                      onChange={async (e) => {
                        updatePagination(1, Number(e.target.value)); // Uses unified filter hook
                        // Re-fetch from backend with new page size
                        if (dataLoaded) {
                          await handleGenerateWithFilters();
                        }
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
                          updatePagination(newPage); // Uses unified filter hook
                          // Re-fetch from backend with new page
                          if (dataLoaded) {
                            await handleGenerateWithFilters();
                          }
                        }}
                        disabled={currentPage === 1 || !dataLoaded || filteredInvoices.length === 0}
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
                                updatePagination(pageNum); // Uses unified filter hook
                                // Re-fetch from backend with new page
                                if (dataLoaded) {
                                  await handleGenerateWithFilters();
                                }
                              }}
                              disabled={!dataLoaded || filteredInvoices.length === 0}
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
                          updatePagination(newPage); // Uses unified filter hook
                          // Re-fetch from backend with new page
                          if (dataLoaded) {
                            await handleGenerateWithFilters();
                          }
                        }}
                        disabled={currentPage === totalPages || totalPages === 0 || !dataLoaded || filteredInvoices.length === 0}
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

export default InvoiceReportPage;
