const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateWasteTransactionRequest {
  companyId: string;
  hcfId: string;
  pickupDate: string;
  isNilPickup?: boolean;
  yellowBagCount?: number;
  redBagCount?: number;
  whiteBagCount?: number;
  yellowWeightKg?: number | null;
  redWeightKg?: number | null;
  whiteWeightKg?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  segregationQuality?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | null;
  notes?: string | null;
}

export interface UpdateWasteTransactionRequest {
  pickupDate?: string;
  isNilPickup?: boolean;
  yellowBagCount?: number;
  redBagCount?: number;
  whiteBagCount?: number;
  yellowWeightKg?: number | null;
  redWeightKg?: number | null;
  whiteWeightKg?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  segregationQuality?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | null;
  notes?: string | null;
}

export interface WasteTransactionResponse {
  id: string;
  companyId: string;
  hcfId: string;
  pickupDate: string;
  isNilPickup: boolean;
  yellowBagCount: number;
  redBagCount: number;
  whiteBagCount: number;
  yellowWeightKg?: number | null;
  redWeightKg?: number | null;
  whiteWeightKg?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  segregationQuality?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | null;
  status: 'Draft' | 'Submitted' | 'Verified';
  notes?: string | null;
  createdBy?: string | null;
  createdOn: string;
  modifiedBy?: string | null;
  modifiedOn?: string | null;
  verifiedBy?: string | null;
  verifiedOn?: string | null;
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
      if (errorData.message) {
        if (Array.isArray(errorData.message)) {
          errorMessage = errorData.message.join(', ');
        } else if (typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        }
      } else if (errorData.error) {
        errorMessage = typeof errorData.error === 'string'
          ? errorData.error
          : errorData.error.message || JSON.stringify(errorData.error);
      }
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      (error as any).errorData = errorData;
      throw error;
    } catch (parseError) {
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

// Waste Transaction API functions
export const wasteTransactionService = {
  createTransaction: async (data: CreateWasteTransactionRequest): Promise<WasteTransactionResponse> => {
    const response = await apiRequest<ApiResponse<WasteTransactionResponse>>('/waste-transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getTransactionById: async (transactionId: string): Promise<WasteTransactionResponse> => {
    const response = await apiRequest<ApiResponse<WasteTransactionResponse>>(`/waste-transactions/${transactionId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllTransactions: async (
    companyId?: string,
    hcfId?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
  ): Promise<WasteTransactionResponse[]> => {
    let url = '/waste-transactions';
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (hcfId) params.append('hcfId', hcfId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status) params.append('status', status);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiRequest<ApiResponse<WasteTransactionResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  updateTransaction: async (
    transactionId: string,
    data: UpdateWasteTransactionRequest
  ): Promise<WasteTransactionResponse> => {
    const response = await apiRequest<ApiResponse<WasteTransactionResponse>>(`/waste-transactions/${transactionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  submitTransaction: async (transactionId: string): Promise<WasteTransactionResponse> => {
    const response = await apiRequest<ApiResponse<WasteTransactionResponse>>(`/waste-transactions/${transactionId}/submit`, {
      method: 'PATCH',
    });
    return response.data;
  },

  verifyTransaction: async (transactionId: string): Promise<WasteTransactionResponse> => {
    const response = await apiRequest<ApiResponse<WasteTransactionResponse>>(`/waste-transactions/${transactionId}/verify`, {
      method: 'PATCH',
    });
    return response.data;
  },

  deleteTransaction: async (transactionId: string): Promise<void> => {
    await apiRequest(`/waste-transactions/${transactionId}`, {
      method: 'DELETE',
    });
  },
};
