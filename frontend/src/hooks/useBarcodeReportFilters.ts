import { useState, useCallback } from 'react';

export interface BarcodeReportFilters {
  page: number;
  pageSize: number;
  createdFromDate: string;
  createdToDate: string;
  companyId: string;
  hcfId: string;
  barcodeType: string;
  colorBlock: string;
  searchText: string;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

export const useBarcodeReportFilters = () => {
  const [filters, setFilters] = useState<BarcodeReportFilters>({
    page: 1,
    pageSize: 25,
    createdFromDate: '',
    createdToDate: '',
    companyId: '',
    hcfId: '',
    barcodeType: 'All',
    colorBlock: 'All',
    searchText: '',
    sortBy: 'createdOn',
    sortOrder: 'DESC',
  });

  const [pendingFilters, setPendingFilters] = useState<Partial<BarcodeReportFilters>>({
    createdFromDate: '',
    createdToDate: '',
    companyId: '',
    hcfId: '',
    barcodeType: 'All',
    colorBlock: 'All',
  });

  const updateFilter = useCallback((field: keyof BarcodeReportFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updatePendingFilter = useCallback((field: keyof BarcodeReportFilters, value: any) => {
    setPendingFilters((prev) => ({ ...prev, [field]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      createdFromDate: pendingFilters.createdFromDate || '',
      createdToDate: pendingFilters.createdToDate || '',
      companyId: pendingFilters.companyId || '',
      hcfId: pendingFilters.hcfId || '',
      barcodeType: pendingFilters.barcodeType || 'All',
      colorBlock: pendingFilters.colorBlock || 'All',
      page: 1, // Reset to first page when applying filters
    }));
  }, [pendingFilters]);

  const clearFilters = useCallback(() => {
    const defaultFilters: BarcodeReportFilters = {
      page: 1,
      pageSize: filters.pageSize || 25,
      createdFromDate: '',
      createdToDate: '',
      companyId: '',
      hcfId: '',
      barcodeType: 'All',
      colorBlock: 'All',
      searchText: '',
      sortBy: 'createdOn',
      sortOrder: 'DESC',
    };
    setFilters(defaultFilters);
    setPendingFilters({
      createdFromDate: '',
      createdToDate: '',
      companyId: '',
      hcfId: '',
      barcodeType: 'All',
      colorBlock: 'All',
    });
  }, [filters.pageSize]);

  const updatePagination = useCallback((page: number, pageSize?: number) => {
    setFilters((prev) => ({
      ...prev,
      page,
      ...(pageSize !== undefined && { pageSize }),
    }));
  }, []);

  const updateSearchText = useCallback((text: string) => {
    setFilters((prev) => ({ ...prev, searchText: text, page: 1 }));
  }, []);

  const hasFiltersApplied = useCallback((): boolean => {
    return !!(
      filters.createdFromDate ||
      filters.createdToDate ||
      filters.companyId ||
      filters.hcfId ||
      (filters.barcodeType && filters.barcodeType !== 'All') ||
      (filters.colorBlock && filters.colorBlock !== 'All') ||
      filters.searchText?.trim()
    );
  }, [filters]);

  const buildApiFilters = useCallback((): Partial<BarcodeReportFilters> => {
    const apiFilters: Partial<BarcodeReportFilters> = {
      page: filters.page,
      pageSize: filters.pageSize,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    };

    if (filters.createdFromDate) apiFilters.createdFromDate = filters.createdFromDate;
    if (filters.createdToDate) apiFilters.createdToDate = filters.createdToDate;
    if (filters.companyId) apiFilters.companyId = filters.companyId;
    if (filters.hcfId) apiFilters.hcfId = filters.hcfId;
    if (filters.barcodeType && filters.barcodeType !== 'All') apiFilters.barcodeType = filters.barcodeType;
    if (filters.colorBlock && filters.colorBlock !== 'All') apiFilters.colorBlock = filters.colorBlock;
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
