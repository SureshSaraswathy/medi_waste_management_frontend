import { API_BASE_URL } from './apiBaseUrl';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface BarcodeLookupResponse {
  barcode: string;
  companyId: string;
  companyName: string;
  hcfId: string;
  hcfCode: string;
  hcfName: string;
  wasteColor: 'Yellow' | 'Red' | 'White';
  sequenceNumber?: string;
}

export interface CreateWasteCollectionRequest {
  barcode: string;
  collectionDate: string;
  companyId: string;
  hcfId: string;
  wasteColor: 'Yellow' | 'Red' | 'White';
  weightKg?: number | null;
  status?: 'Pending' | 'Collected' | 'In Transit' | 'Processed' | 'Disposed';
  routeAssignmentId?: string | null;
  collectedBy?: string | null;
  notes?: string | null;
}

export interface UpdateWasteCollectionRequest {
  weightKg?: number | null;
  status?: 'Pending' | 'Collected' | 'In Transit' | 'Processed' | 'Disposed';
  collectedBy?: string | null;
  notes?: string | null;
}

export interface WasteCollectionResponse {
  id: string;
  barcode: string;
  collectionDate: string;
  companyId: string;
  hcfId: string;
  wasteColor: 'Yellow' | 'Red' | 'White';
  weightKg?: number | null;
  status: 'Pending' | 'Collected' | 'In Transit' | 'Processed' | 'Disposed';
  routeAssignmentId?: string | null;
  collectedBy?: string | null;
  collectedAt?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdOn: string;
  modifiedBy?: string | null;
  modifiedOn: string;
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

// Waste Collection API functions
export const wasteCollectionService = {
  lookupBarcode: async (barcode: string): Promise<BarcodeLookupResponse> => {
    const response = await apiRequest<ApiResponse<BarcodeLookupResponse>>(`/waste-collections/barcode/${encodeURIComponent(barcode)}`, {
      method: 'GET',
    });
    return response.data;
  },

  createWasteCollection: async (data: CreateWasteCollectionRequest): Promise<WasteCollectionResponse> => {
    const response = await apiRequest<ApiResponse<WasteCollectionResponse>>('/waste-collections', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getWasteCollectionById: async (collectionId: string): Promise<WasteCollectionResponse> => {
    const response = await apiRequest<ApiResponse<WasteCollectionResponse>>(`/waste-collections/${collectionId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllWasteCollections: async (
    companyId?: string,
    hcfId?: string,
    date?: string,
    endDate?: string,
    status?: string,
    routeAssignmentId?: string,
  ): Promise<WasteCollectionResponse[]> => {
    let url = '/waste-collections';
    const params = new URLSearchParams();
    if (companyId) {
      params.append('companyId', companyId);
    }
    if (hcfId) {
      params.append('hcfId', hcfId);
    }
    if (date) {
      params.append('date', date);
    }
    if (endDate) {
      params.append('endDate', endDate);
    }
    if (status) {
      params.append('status', status);
    }
    if (routeAssignmentId) {
      params.append('routeAssignmentId', routeAssignmentId);
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiRequest<ApiResponse<WasteCollectionResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  updateWasteCollection: async (
    collectionId: string,
    data: UpdateWasteCollectionRequest
  ): Promise<WasteCollectionResponse> => {
    const response = await apiRequest<ApiResponse<WasteCollectionResponse>>(`/waste-collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  collectWaste: async (
    collectionId: string,
    weightKg: number
  ): Promise<WasteCollectionResponse> => {
    const response = await apiRequest<ApiResponse<WasteCollectionResponse>>(`/waste-collections/${collectionId}/collect`, {
      method: 'POST',
      body: JSON.stringify({ weightKg }),
    });
    return response.data;
  },

  deleteWasteCollection: async (collectionId: string): Promise<void> => {
    await apiRequest(`/waste-collections/${collectionId}`, {
      method: 'DELETE',
    });
  },
};
