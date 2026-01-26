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
  companyId: string;
  sequenceNumber: number;
  barcodeValue: string;
  barcodeType: 'Barcode' | 'QR Code';
  colorBlock: 'Yellow' | 'Red' | 'White';
  createdBy?: string | null;
  createdOn: string;
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

  getLastSequence: async (
    hcfCode: string,
    barcodeType: 'Barcode' | 'QR Code'
  ): Promise<number> => {
    const response = await apiRequest<ApiResponse<LastSequenceResponse>>(
      `/barcode-labels/last-sequence?hcfCode=${encodeURIComponent(hcfCode)}&barcodeType=${encodeURIComponent(barcodeType)}`,
      {
        method: 'GET',
      }
    );
    return response.data.lastSequence;
  },

  deleteBarcodeLabel: async (labelId: string): Promise<void> => {
    await apiRequest(`/barcode-labels/${labelId}`, {
      method: 'DELETE',
    });
  },
};
