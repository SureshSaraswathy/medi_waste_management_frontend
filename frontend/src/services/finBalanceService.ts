const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
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
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
      if (errorData.message && typeof errorData.message === 'object') {
        errorMessage = JSON.stringify(errorData.message);
      }
    } catch {
      if (response.status === 500) {
        errorMessage = 'Internal server error';
      } else if (response.status === 401) {
        errorMessage = 'Unauthorized. Please login again.';
      } else if (response.status === 403) {
        errorMessage = 'Forbidden. You do not have permission.';
      } else if (response.status === 404) {
        errorMessage = 'Resource not found';
      }
    }
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).response = { status: response.status };
    throw error;
  }

  const data: ApiResponse<T> = await response.json();
  return data.data as T;
};

export interface FinBalanceResponse {
  finBalanceId: string;
  companyId: string;
  companyName?: string;
  companyCode?: string;
  hcfId: string;
  hcfCode?: string;
  hcfName?: string;
  openingBalance: number;
  currentBalance: number;
  isManual: boolean;
  notes: string | null;
  createdBy: string | null;
  createdOn: string;
  modifiedBy: string | null;
  modifiedOn: string;
}

export interface CreateFinBalanceRequest {
  companyId: string;
  hcfId: string;
  openingBalance: number;
  currentBalance?: number;
  notes?: string | null;
}

export interface UpdateFinBalanceRequest {
  openingBalance: number;
  notes?: string | null;
}

export interface BulkUploadPreviewResponse {
  inserts: CreateFinBalanceRequest[];
  updates: Array<{ finBalanceId: string; data: CreateFinBalanceRequest }>;
  errors: Array<{ row: number; message: string; data: any }>;
  parseErrors: Array<{ row: number; message: string; data: any }>;
}

export interface BulkUploadExecuteResponse {
  created: FinBalanceResponse[];
  updated: FinBalanceResponse[];
}

// Get all financial balances
export const getFinBalances = async (companyId?: string): Promise<FinBalanceResponse[]> => {
  const queryParams = companyId ? `?companyId=${companyId}` : '';
  return apiRequest<FinBalanceResponse[]>(`/fin-balance${queryParams}`, {
    method: 'GET',
  });
};

// Get financial balance by ID
export const getFinBalanceById = async (id: string): Promise<FinBalanceResponse> => {
  return apiRequest<FinBalanceResponse>(`/fin-balance/${id}`, {
    method: 'GET',
  });
};

// Create financial balance
export const createFinBalance = async (request: CreateFinBalanceRequest): Promise<FinBalanceResponse> => {
  return apiRequest<FinBalanceResponse>('/fin-balance', {
    method: 'POST',
    body: JSON.stringify(request),
  });
};

// Update financial balance
export const updateFinBalance = async (
  id: string,
  request: UpdateFinBalanceRequest
): Promise<FinBalanceResponse> => {
  return apiRequest<FinBalanceResponse>(`/fin-balance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  });
};

// Delete financial balance
export const deleteFinBalance = async (id: string): Promise<void> => {
  return apiRequest<void>(`/fin-balance/${id}`, {
    method: 'DELETE',
  });
};

// Preview bulk upload (Excel file)
export const previewBulkUpload = async (file: File): Promise<BulkUploadPreviewResponse> => {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/fin-balance/bulk-upload/preview`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = 'Failed to preview bulk upload';
    }
    throw new Error(errorMessage);
  }

  const data: ApiResponse<BulkUploadPreviewResponse> = await response.json();
  return data.data;
};

// Execute bulk upload
export const executeBulkUpload = async (
  preview: BulkUploadPreviewResponse
): Promise<BulkUploadExecuteResponse> => {
  return apiRequest<BulkUploadExecuteResponse>('/fin-balance/bulk-upload/execute', {
    method: 'POST',
    body: JSON.stringify({ preview }),
  });
};
