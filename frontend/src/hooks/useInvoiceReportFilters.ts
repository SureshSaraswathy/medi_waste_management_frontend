import { useState, useCallback } from 'react';
import { InvoiceReportFilters } from '../../services/invoiceService';

/**
 * Unified Invoice Report Filter Hook
 * Manages filter state in a single object for reusability
 */
export const useInvoiceReportFilters = () => {
  // Unified filter state object
  const [filters, setFilters] = useState<InvoiceReportFilters>({
    page: 1,
    pageSize: 25,
    invoiceFromDate: '',
    invoiceToDate: '',
    companyId: '',
    hcfId: '',
    status: 'All',
    billingType: 'All',
    searchText: '',
    sortBy: 'invoiceDate',
    sortOrder: 'DESC',
  });

  // Pending filters (for Apply button - not yet applied)
  const [pendingFilters, setPendingFilters] = useState<Partial<InvoiceReportFilters>>({
    invoiceFromDate: '',
    invoiceToDate: '',
    companyId: '',
    hcfId: '',
    status: 'All',
    billingType: 'All',
  });

  /**
   * Update a single filter field
   */
  const updateFilter = useCallback((field: keyof InvoiceReportFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Update a pending filter field (before Apply)
   */
  const updatePendingFilter = useCallback((field: keyof InvoiceReportFilters, value: any) => {
    setPendingFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Apply pending filters to active filters
   */
  const applyFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      invoiceFromDate: pendingFilters.invoiceFromDate || '',
      invoiceToDate: pendingFilters.invoiceToDate || '',
      companyId: pendingFilters.companyId || '',
      hcfId: pendingFilters.hcfId || '',
      status: pendingFilters.status || 'All',
      billingType: pendingFilters.billingType || 'All',
      page: 1, // Reset to first page when applying filters
    }));
  }, [pendingFilters]);

  /**
   * Clear all filters and reset to defaults
   */
  const clearFilters = useCallback(() => {
    const defaultFilters: InvoiceReportFilters = {
      page: 1,
      pageSize: filters.pageSize || 25,
      invoiceFromDate: '',
      invoiceToDate: '',
      companyId: '',
      hcfId: '',
      status: 'All',
      billingType: 'All',
      searchText: '',
      sortBy: 'invoiceDate',
      sortOrder: 'DESC',
    };
    setFilters(defaultFilters);
    setPendingFilters({
      invoiceFromDate: '',
      invoiceToDate: '',
      companyId: '',
      hcfId: '',
      status: 'All',
      billingType: 'All',
    });
  }, [filters.pageSize]);

  /**
   * Update pagination
   */
  const updatePagination = useCallback((page: number, pageSize?: number) => {
    setFilters((prev) => ({
      ...prev,
      page,
      ...(pageSize !== undefined && { pageSize }),
    }));
  }, []);

  /**
   * Update search text
   */
  const updateSearchText = useCallback((searchText: string) => {
    setFilters((prev) => ({
      ...prev,
      searchText,
      page: 1, // Reset to first page when searching
    }));
  }, []);

  /**
   * Check if any filters are applied
   */
  const hasFiltersApplied = useCallback((): boolean => {
    return !!(
      filters.invoiceFromDate ||
      filters.invoiceToDate ||
      filters.companyId ||
      filters.hcfId ||
      (filters.status && filters.status !== 'All') ||
      (filters.billingType && filters.billingType !== 'All') ||
      filters.searchText?.trim()
    );
  }, [filters]);

  /**
   * Build API-ready filter object (removes empty values and 'All' defaults)
   */
  const buildApiFilters = useCallback((): InvoiceReportFilters => {
    const apiFilters: InvoiceReportFilters = {
      page: filters.page || 1,
      pageSize: filters.pageSize || 25,
      sortBy: filters.sortBy || 'invoiceDate',
      sortOrder: filters.sortOrder || 'DESC',
    };

    // Only include non-empty, non-default values
    if (filters.invoiceFromDate) apiFilters.invoiceFromDate = filters.invoiceFromDate;
    if (filters.invoiceToDate) apiFilters.invoiceToDate = filters.invoiceToDate;
    if (filters.companyId) apiFilters.companyId = filters.companyId;
    if (filters.hcfId) apiFilters.hcfId = filters.hcfId;
    if (filters.status && filters.status !== 'All') apiFilters.status = filters.status;
    if (filters.billingType && filters.billingType !== 'All') apiFilters.billingType = filters.billingType;
    if (filters.searchText?.trim()) apiFilters.searchText = filters.searchText.trim();

    return apiFilters;
  }, [filters]);

  return {
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
  };
};
