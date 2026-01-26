const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateWasteProcessRequest {
  companyId: string;
  processDate: string;
  incinerationWeightKg: number;
  autoclaveWeightKg: number;
  notes?: string | null;
}

export interface UpdateWasteProcessRequest {
  incinerationWeightKg?: number;
  autoclaveWeightKg?: number;
  notes?: string | null;
}

export interface WasteProcessResponse {
  id: string;
  companyId: string;
  processDate: string;
  incinerationWeightKg: number;
  autoclaveWeightKg: number;
  status: 'Draft' | 'Submitted' | 'Verified' | 'Closed';
  notes?: string | null;
  createdBy?: string | null;
  createdOn: string;
  modifiedBy?: string | null;
  modifiedOn?: string | null;
  verifiedBy?: string | null;
  verifiedOn?: string | null;
  closedBy?: string | null;
  closedOn?: string | null;
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

// Waste Process API functions
export const wasteProcessService = {
  createProcess: async (data: CreateWasteProcessRequest): Promise<WasteProcessResponse> => {
    const response = await apiRequest<ApiResponse<WasteProcessResponse>>('/waste-processes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getProcessById: async (processId: string): Promise<WasteProcessResponse> => {
    const response = await apiRequest<ApiResponse<WasteProcessResponse>>(`/waste-processes/${processId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllProcesses: async (
    companyId?: string,
    startDate?: string,
    endDate?: string,
    status?: string,
  ): Promise<WasteProcessResponse[]> => {
    let url = '/waste-processes';
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (status) params.append('status', status);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiRequest<ApiResponse<WasteProcessResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  updateProcess: async (
    processId: string,
    data: UpdateWasteProcessRequest
  ): Promise<WasteProcessResponse> => {
    const response = await apiRequest<ApiResponse<WasteProcessResponse>>(`/waste-processes/${processId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  submitProcess: async (processId: string): Promise<WasteProcessResponse> => {
    const response = await apiRequest<ApiResponse<WasteProcessResponse>>(`/waste-processes/${processId}/submit`, {
      method: 'PUT',
    });
    return response.data;
  },

  verifyProcess: async (processId: string): Promise<WasteProcessResponse> => {
    const response = await apiRequest<ApiResponse<WasteProcessResponse>>(`/waste-processes/${processId}/verify`, {
      method: 'PUT',
    });
    return response.data;
  },

  closeProcess: async (processId: string): Promise<WasteProcessResponse> => {
    const response = await apiRequest<ApiResponse<WasteProcessResponse>>(`/waste-processes/${processId}/close`, {
      method: 'PUT',
    });
    return response.data;
  },

  deleteProcess: async (processId: string): Promise<void> => {
    await apiRequest(`/waste-processes/${processId}`, {
      method: 'DELETE',
    });
  },
};
