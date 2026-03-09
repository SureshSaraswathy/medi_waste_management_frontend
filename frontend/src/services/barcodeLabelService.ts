const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateBarcodeLabelRequest {
  hcfId: string;
  companyId: string;
  barcodeType: 'Barcode' | 'QR Code';
  colorBlock: 'Yellow' | 'Red' | 'White';
  count: number;
}

export interface BarcodeLabelResponse {
  id: string;
  hcfCode: string;
  hcfId: string;
  hcfName?: string;
  companyId: string;
  sequenceNumber: number;
  barcodeValue: string;
  barcodeType: 'Barcode' | 'QR Code';
  colorBlock: 'Yellow' | 'Red' | 'White' | 'Blue';
  status: 'Active' | 'Inactive' | 'Collected' | 'Deleted';
  createdBy?: string | null;
  createdOn: string;
}

export interface UpdateBarcodeLabelRequest {
  colorBlock?: 'Yellow' | 'Red' | 'White' | 'Blue';
  status?: 'Active' | 'Inactive' | 'Deleted';
}

export interface BarcodeListParams {
  page?: number;
  limit?: number;
  search?: string;
  colorBlock?: string;
  barcodeType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  includeDeleted?: boolean;
}

export interface BarcodeListResponse {
  data: BarcodeLabelResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BarcodeSummaryResponse {
  total: number;
  barcodes: number;
  qrCodes: number;
  collected: number;
  deactivated: number;
}

export interface LastSequenceResponse {
  lastSequence: number;
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
      
      // Handle NestJS exception format
      if (errorData.message) {
        if (Array.isArray(errorData.message)) {
          errorMessage = errorData.message.join(', ');
        } else if (typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        } else {
          errorMessage = String(errorData.message);
        }
      } else if (errorData.error) {
        // Handle error object
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error.message) {
          errorMessage = typeof errorData.error.message === 'string'
            ? errorData.error.message
            : String(errorData.error.message);
        } else {
          errorMessage = JSON.stringify(errorData.error);
        }
      }
      
      // Store original error data for better parsing
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      (error as any).errorData = errorData;
      throw error;
    } catch (parseError) {
      // If response is not JSON or parsing failed, use default message
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      throw error;
    }
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

// Barcode Label API functions
export const barcodeLabelService = {
  generateLabels: async (data: CreateBarcodeLabelRequest): Promise<BarcodeLabelResponse[]> => {
    const response = await apiRequest<ApiResponse<BarcodeLabelResponse[]>>('/barcode-labels', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getBarcodeLabelById: async (labelId: string): Promise<BarcodeLabelResponse> => {
    const response = await apiRequest<ApiResponse<BarcodeLabelResponse>>(`/barcode-labels/${labelId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllBarcodeLabels: async (
    companyId?: string,
    hcfId?: string,
    hcfCode?: string,
    barcodeType?: string,
  ): Promise<BarcodeLabelResponse[]> => {
    let url = '/barcode-labels';
    const params = new URLSearchParams();
    if (companyId) {
      params.append('companyId', companyId);
    }
    if (hcfId) {
      params.append('hcfId', hcfId);
    }
    if (hcfCode) {
      params.append('hcfCode', hcfCode);
    }
    if (barcodeType) {
      params.append('barcodeType', barcodeType);
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiRequest<ApiResponse<BarcodeLabelResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  getLastSequence: async (): Promise<number> => {
    const response = await apiRequest<ApiResponse<LastSequenceResponse>>(
      `/barcode-labels/last-sequence`,
      {
        method: 'GET',
      }
    );
    return response.data.lastSequence;
  },

  getBarcodeList: async (params: BarcodeListParams): Promise<BarcodeListResponse> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.colorBlock) queryParams.append('colorBlock', params.colorBlock);
    if (params.barcodeType) queryParams.append('barcodeType', params.barcodeType);
    if (params.status) queryParams.append('status', params.status);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.includeDeleted) queryParams.append('includeDeleted', 'true');

    const response = await apiRequest<ApiResponse<BarcodeLabelResponse[]> & { pagination: any }>(
      `/barcode-labels/list?${queryParams.toString()}`,
      {
        method: 'GET',
      }
    );
    return {
      data: response.data,
      pagination: response.pagination,
    };
  },

  updateBarcodeLabel: async (labelId: string, data: UpdateBarcodeLabelRequest): Promise<BarcodeLabelResponse> => {
    const response = await apiRequest<ApiResponse<BarcodeLabelResponse>>(
      `/barcode-labels/${labelId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  },

  getSummary: async (): Promise<BarcodeSummaryResponse> => {
    const response = await apiRequest<ApiResponse<BarcodeSummaryResponse>>(
      `/barcode-labels/summary`,
      {
        method: 'GET',
      }
    );
    return response.data;
  },

  deleteBarcodeLabel: async (labelId: string): Promise<void> => {
    await apiRequest(`/barcode-labels/${labelId}`, {
      method: 'DELETE',
    });
  },
};
