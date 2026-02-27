const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface CreateInvoiceRequest {
  companyId: string;
  hcfId: string;
  invoiceDate: string;
  dueDate: string;
  billingType: 'Monthly' | 'Quarterly' | 'Yearly';
  billingDays?: number;
  billingOption: 'Bed-wise' | 'Weight-wise' | 'Lumpsum';
  generationType?: 'Auto' | 'Manual';
  bedCount?: number;
  bedRate?: number;
  weightInKg?: number;
  kgRate?: number;
  lumpsumAmount?: number;
  taxableValue?: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  roundOff?: number;
  invoiceValue?: number;
  notes?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  status?: 'DRAFT' | 'POSTED' | 'DUE' | 'PARTIAL_PAID' | 'PAID' | 'CANCELLED';
}

export interface UpdateInvoiceRequest {
  invoiceDate?: string;
  dueDate?: string;
  billingType?: 'Monthly' | 'Quarterly' | 'Yearly';
  billingDays?: number;
  billingOption?: 'Bed-wise' | 'Weight-wise' | 'Lumpsum';
  bedCount?: number;
  bedRate?: number;
  weightInKg?: number;
  kgRate?: number;
  lumpsumAmount?: number;
  taxableValue?: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  roundOff?: number;
  invoiceValue?: number;
  notes?: string;
}

export interface GenerateInvoiceRequest {
  companyId: string;
  hcfIds?: string[];
  billingPeriodStart: string;
  billingPeriodEnd: string;
  billingType: 'Monthly' | 'Quarterly' | 'Yearly';
  invoiceDate?: string;
  dueDays?: number;
  billingOption?: 'Bed-wise' | 'Weight-wise' | 'Lumpsum'; // Filter for auto-generate
}

export interface GenerateInvoiceWeightRequest {
  companyId: string;
  hcfIds?: string[];
  pickupDateFrom: string;
  pickupDateTo: string;
  billingType: 'Monthly' | 'Quarterly' | 'Yearly';
  invoiceDate?: string;
  dueDays?: number;
}

export interface GenerateInvoiceMonthRequest {
  companyId: string;
  month: number; // 1-12
  year: number;
  invoiceDate: string;
  generationMode: 'Bed/Lumpsum' | 'Weight Based';
  dueDays?: number;
}

export interface InvoiceResponse {
  invoiceId: string;
  companyId: string;
  companyName?: string;
  hcfId: string;
  hcfCode?: string;
  hcfName?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  billingType: 'Monthly' | 'Quarterly' | 'Yearly';
  billingDays: number | null;
  billingOption: 'Bed-wise' | 'Weight-wise' | 'Lumpsum';
  generationType: 'Auto' | 'Manual';
  bedCount: number | null;
  bedRate: number | null;
  weightInKg: number | null;
  kgRate: number | null;
  lumpsumAmount: number | null;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  roundOff: number;
  invoiceValue: number;
  totalPaidAmount: number;
  balanceAmount: number;
  status: 'Draft' | 'Generated' | 'Partially Paid' | 'Paid' | 'Cancelled';
  isLocked: boolean;
  lockedAfterDate: string | null;
  financialYear: string;
  sequenceNumber: number;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  notes: string | null;
  createdBy: string | null;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string;
}

export interface GenerateInvoiceResponse {
  generated: InvoiceResponse[];
  failed: Array<{ hcfId: string; hcfCode: string; reason: string }>;
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  const authData = localStorage.getItem('mw-auth-user');
  if (authData) {
    try {
      const user = JSON.parse(authData);
      return user.token || null;
    } catch {
      return null;
    }
  }
  return null;
};

// API request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      
      if (Array.isArray(errorData.message)) {
        errorMessage = errorData.message.join(', ');
      } else if (typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : JSON.stringify(errorData.error);
      }
      
      // Handle specific status codes
      if (response.status === 401) {
        errorMessage = 'Unauthorized: Please login again';
        // Clear auth and redirect to login
        localStorage.removeItem('mw-auth-user');
        window.location.href = '/login';
      } else if (response.status === 403) {
        errorMessage = errorData.message || errorData.error || 'Forbidden: You do not have permission to access this resource';
      } else if (response.status === 500) {
        errorMessage = errorData.message || errorData.error || 'Internal server error';
      }
    } catch {
      // If JSON parsing fails, use default error message
      if (response.status === 401) {
        errorMessage = 'Unauthorized: Please login again';
        localStorage.removeItem('mw-auth-user');
        window.location.href = '/login';
      } else if (response.status === 403) {
        errorMessage = 'Forbidden: You do not have permission to access this resource';
      } else if (response.status === 500) {
        errorMessage = 'Internal server error';
      }
    }
    
    throw new Error(errorMessage);
  }

  const data: ApiResponse<T> = await response.json();
  return data.data;
};

type DownloadResult = { blob: Blob; filename: string };

const getFilenameFromDisposition = (
  contentDisposition: string | null,
  fallback: string,
): string => {
  if (!contentDisposition) return fallback;
  const match =
    /filename="([^"]+)"/i.exec(contentDisposition) ||
    /filename=([^;]+)/i.exec(contentDisposition);
  return match?.[1]?.trim() || fallback;
};

const apiDownload = async (
  endpoint: string,
  options: RequestInit = {},
  fallbackFilename: string = 'download.bin',
): Promise<DownloadResult> => {
  const token = getAuthToken();

  const headers: HeadersInit = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (Array.isArray(errorData.message)) {
        errorMessage = errorData.message.join(', ');
      } else if (typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage =
          typeof errorData.error === 'string'
            ? errorData.error
            : JSON.stringify(errorData.error);
      }
    } catch {
      // ignore
    }

    if (response.status === 401) {
      localStorage.removeItem('mw-auth-user');
      window.location.href = '/login';
    }

    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  const filename = getFilenameFromDisposition(
    response.headers.get('content-disposition'),
    fallbackFilename,
  );

  return { blob, filename };
};

// Get all invoices (legacy endpoint - use getInvoiceReport for reports)
export const getInvoices = async (filters?: {
  companyId?: string;
  hcfId?: string;
  status?: string;
  financialYear?: string;
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
}): Promise<InvoiceResponse[]> => {
  const queryParams = new URLSearchParams();
  if (filters?.companyId) queryParams.append('companyId', filters.companyId);
  if (filters?.hcfId) queryParams.append('hcfId', filters.hcfId);
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.financialYear) queryParams.append('financialYear', filters.financialYear);
  if (filters?.invoiceDateFrom) queryParams.append('invoiceDateFrom', filters.invoiceDateFrom);
  if (filters?.invoiceDateTo) queryParams.append('invoiceDateTo', filters.invoiceDateTo);

  const queryString = queryParams.toString();
  return apiRequest<InvoiceResponse[]>(`/invoices${queryString ? `?${queryString}` : ''}`);
};

// Invoice Report Response Interface
export interface InvoiceReportItem {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  billingType: string;
  invoiceValue: number;
  totalPaidAmount: number;
  balanceAmount: number;
  status: string;
  companyId: string;
  companyName: string;
  companyCode: string;
  hcfId: string;
  hcfName: string;
  hcfCode: string;
}

export interface InvoiceReportMeta {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  state: 'NO_FILTER' | 'NO_RESULTS' | 'HAS_RESULTS';
}

export interface InvoiceReportResponse {
  data: InvoiceReportItem[];
  meta: InvoiceReportMeta;
}

/**
 * Unified Invoice Report Filter Interface
 * Used for: Table load, Apply Filters, Pagination, Export
 */
export interface InvoiceReportFilters {
  // Pagination
  page?: number;
  pageSize?: number;
  
  // Date Range Filters
  invoiceFromDate?: string;
  invoiceToDate?: string;
  
  // Entity Filters
  companyId?: string;
  hcfId?: string;
  
  // Status Filters
  status?: string;
  billingType?: string;
  
  // Search
  searchText?: string;
  
  // Sorting
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  
  // Export
  export?: 'pdf' | 'excel' | 'csv';
  
  // Legacy field mappings (for backward compatibility)
  fromDate?: string;
  toDate?: string;
  search?: string;
  sortDir?: 'ASC' | 'DESC';
}

/**
 * Get invoice report using POST endpoint with unified filter object
 * Reusable for: Table load, Apply Filters, Pagination, Export
 */
export const getInvoiceReport = async (
  filters?: InvoiceReportFilters
): Promise<InvoiceReportResponse> => {
  // Normalize filters - map legacy fields to new fields
  const normalizedFilters: InvoiceReportFilters = filters ? { ...filters } : {};
  
  // Map legacy fields to new fields if present
  if (normalizedFilters.fromDate && !normalizedFilters.invoiceFromDate) {
    normalizedFilters.invoiceFromDate = normalizedFilters.fromDate;
  }
  if (normalizedFilters.toDate && !normalizedFilters.invoiceToDate) {
    normalizedFilters.invoiceToDate = normalizedFilters.toDate;
  }
  if (normalizedFilters.search && !normalizedFilters.searchText) {
    normalizedFilters.searchText = normalizedFilters.search;
  }
  if (normalizedFilters.sortDir && !normalizedFilters.sortOrder) {
    normalizedFilters.sortOrder = normalizedFilters.sortDir;
  }
  
  // Remove undefined values to keep request clean
  const cleanFilters: Record<string, any> = {};
  Object.keys(normalizedFilters).forEach((key) => {
    const value = normalizedFilters[key as keyof InvoiceReportFilters];
    if (value !== undefined && value !== null && value !== '') {
      cleanFilters[key] = value;
    }
  });
  
  // Use POST endpoint with body
  return apiRequest<InvoiceReportResponse>('/reports/invoices', {
    method: 'POST',
    body: JSON.stringify(cleanFilters),
  });
};

// Get invoice by ID
export const getInvoice = async (invoiceId: string): Promise<InvoiceResponse> => {
  return apiRequest<InvoiceResponse>(`/invoices/${invoiceId}`);
};

// Create invoice
export const createInvoice = async (invoice: CreateInvoiceRequest): Promise<InvoiceResponse> => {
  return apiRequest<InvoiceResponse>('/invoices', {
    method: 'POST',
    body: JSON.stringify(invoice),
  });
};

// Update invoice
export const updateInvoice = async (
  invoiceId: string,
  invoice: UpdateInvoiceRequest
): Promise<InvoiceResponse> => {
  return apiRequest<InvoiceResponse>(`/invoices/${invoiceId}`, {
    method: 'PUT',
    body: JSON.stringify(invoice),
  });
};

// Delete invoice
export const deleteInvoice = async (invoiceId: string): Promise<void> => {
  return apiRequest<void>(`/invoices/${invoiceId}`, {
    method: 'DELETE',
  });
};

// Generate invoices automatically
export const generateInvoices = async (
  request: GenerateInvoiceRequest
): Promise<GenerateInvoiceResponse> => {
  return apiRequest<GenerateInvoiceResponse>('/invoices/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
};

// Generate invoices (weight-based from waste transactions)
export const generateInvoicesWeight = async (
  request: GenerateInvoiceWeightRequest
): Promise<GenerateInvoiceResponse> => {
  return apiRequest<GenerateInvoiceResponse>('/invoices/generate-weight', {
    method: 'POST',
    body: JSON.stringify(request),
  });
};

// Generate invoices (month-based: Bed/Lumpsum or Weight Based)
export const generateInvoicesMonth = async (
  request: GenerateInvoiceMonthRequest
): Promise<GenerateInvoiceResponse & { skipped?: Array<{ hcfId: string; hcfCode: string; reason: string }> }> => {
  return apiRequest<GenerateInvoiceResponse & { skipped?: Array<{ hcfId: string; hcfCode: string; reason: string }> }>('/invoices/generate-month', {
    method: 'POST',
    body: JSON.stringify(request),
  });
};

export const downloadInvoicePdf = async (invoiceId: string) => {
  return apiDownload(`/invoices/${invoiceId}/pdf`, { method: 'GET' }, `invoice-${invoiceId}.pdf`);
};

export const downloadBulkInvoicePdfZip = async (
  invoiceIds: string[],
  includeManifest: boolean = true,
) => {
  return apiDownload(
    `/invoices/pdf/bulk`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceIds, includeManifest }),
    },
    `invoices.zip`,
  );
};

export const startBulkInvoicePdfJob = async (invoiceIds: string[], email: string) => {
  return apiRequest<{ jobId: string }>(`/invoices/pdf/bulk`, {
    method: 'POST',
    body: JSON.stringify({ invoiceIds, email }),
  });
};

// Batch Operations
export interface CreateBatchRequest {
  type: 'manual' | 'weight' | 'bed';
  companyId: string;
  siteId?: string;
  periodFrom?: string;
  periodTo?: string;
  billingMonth?: string;
}

export interface BatchResponse {
  id: string;
  type: 'manual' | 'weight' | 'bed';
  companyId: string;
  siteId: string | null;
  periodFrom: Date | null;
  periodTo: Date | null;
  billingMonth: string | null;
  status: 'STAGED' | 'PROCESSING' | 'POSTED' | 'FAILED';
  totalRecords: number;
  createdBy: string | null;
  createdAt: Date;
  postedAt: Date | null;
}

export interface BatchItemResponse {
  id: string;
  batchId: string;
  customerId: string;
  description: string | null;
  quantity: number;
  rate: number;
  taxPercent: number;
  amount: number;
  dueDate: Date;
  errorFlag: boolean;
  errorMessage: string | null;
  isSelected: boolean;
  createdAt: Date;
}

export interface BatchPreviewResponse extends BatchResponse {
  items: BatchItemResponse[];
}

export interface UpdateBatchItemRequest {
  quantity?: number;
  rate?: number;
  taxPercent?: number;
  isSelected?: boolean;
  description?: string;
}

export const createBatch = async (data: CreateBatchRequest): Promise<BatchResponse> => {
  return apiRequest<BatchResponse>(`/billing/batches`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getBatchPreview = async (batchId: string): Promise<BatchPreviewResponse> => {
  return apiRequest<BatchPreviewResponse>(`/billing/batches/${batchId}`);
};

export const postBatch = async (batchId: string, invoiceDate: string): Promise<{ success: number; failed: number }> => {
  return apiRequest<{ success: number; failed: number }>(`/billing/batches/${batchId}/post`, {
    method: 'POST',
    body: JSON.stringify({ invoiceDate }),
  });
};

export const getAllBatches = async (companyId?: string, status?: string): Promise<BatchResponse[]> => {
  const params = new URLSearchParams();
  if (companyId) params.append('companyId', companyId);
  if (status) params.append('status', status);
  const query = params.toString();
  return apiRequest<BatchResponse[]>(`/billing/batches${query ? `?${query}` : ''}`);
};

export const postInvoice = async (invoiceId: string, invoiceDate?: string): Promise<InvoiceResponse> => {
  return apiRequest<InvoiceResponse>(`/invoices/${invoiceId}/post`, {
    method: 'POST',
    body: JSON.stringify({ invoiceDate: invoiceDate || new Date().toISOString().split('T')[0] }),
  });
};

// Draft Invoice Batch Operations
export const generateDraftInvoices = async (data: CreateBatchRequest): Promise<{ batchId: string; invoiceCount: number }> => {
  return apiRequest<{ batchId: string; invoiceCount: number }>(`/billing/batches/draft`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const getDraftInvoicesByBatch = async (batchId: string): Promise<InvoiceResponse[]> => {
  return apiRequest<InvoiceResponse[]>(`/billing/batches/${batchId}/draft-invoices`);
};

export const updateDraftInvoice = async (invoiceId: string, updates: { quantity?: number; rate?: number; dueDate?: string }): Promise<InvoiceResponse> => {
  return apiRequest<InvoiceResponse>(`/billing/batches/draft-invoices/${invoiceId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const postDraftInvoices = async (invoiceIds: string[], invoiceDate: string): Promise<{ success: number; failed: number }> => {
  return apiRequest<{ success: number; failed: number }>(`/billing/batches/draft-invoices/post`, {
    method: 'POST',
    body: JSON.stringify({ invoiceIds, invoiceDate }),
  });
};
