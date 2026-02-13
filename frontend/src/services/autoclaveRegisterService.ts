const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateAutoclaveRegisterRequest {
  companyId: string;
  autoclaveDate: string;
  equipmentId: string;
  batchNo: string;
  wasteCategory: string;
  wasteQtyKg: number;
  startTime: string;
  endTime: string;
  temperatureC: number;
  pressureBar: number;
  cycleTimeMin: number;
  indicatorResult: string;
  complianceStatus: string;
  status: 'Active' | 'Inactive';
}

export interface UpdateAutoclaveRegisterRequest {
  autoclaveDate?: string;
  equipmentId?: string;
  batchNo?: string;
  wasteCategory?: string;
  wasteQtyKg?: number;
  startTime?: string;
  endTime?: string;
  temperatureC?: number;
  pressureBar?: number;
  cycleTimeMin?: number;
  indicatorResult?: string;
  complianceStatus?: string;
  status?: 'Active' | 'Inactive';
}

export interface AutoclaveRegisterResponse {
  id: string;
  autoclRegNum: string;
  companyId: string;
  autoclaveDate: string;
  equipmentId: string;
  batchNo: string;
  wasteCategory: string;
  wasteQtyKg: number;
  startTime: string;
  endTime: string;
  temperatureC: number;
  pressureBar: number;
  cycleTimeMin: number;
  indicatorResult: string;
  complianceStatus: string;
  status: 'Active' | 'Inactive';
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

// Autoclave Register API functions
export const autoclaveRegisterService = {
  createAutoclaveRegister: async (data: CreateAutoclaveRegisterRequest): Promise<AutoclaveRegisterResponse> => {
    const response = await apiRequest<ApiResponse<AutoclaveRegisterResponse>>('/autoclave-registers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getAutoclaveRegisterById: async (autoclaveId: string): Promise<AutoclaveRegisterResponse> => {
    const response = await apiRequest<ApiResponse<AutoclaveRegisterResponse>>(`/autoclave-registers/${autoclaveId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllAutoclaveRegisters: async (
    companyId?: string,
    status?: string
  ): Promise<AutoclaveRegisterResponse[]> => {
    let url = '/autoclave-registers';
    const params = new URLSearchParams();
    if (companyId) {
      params.append('companyId', companyId);
    }
    if (status) {
      params.append('status', status);
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiRequest<ApiResponse<AutoclaveRegisterResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  updateAutoclaveRegister: async (
    autoclaveId: string,
    data: UpdateAutoclaveRegisterRequest
  ): Promise<AutoclaveRegisterResponse> => {
    const response = await apiRequest<ApiResponse<AutoclaveRegisterResponse>>(`/autoclave-registers/${autoclaveId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  deleteAutoclaveRegister: async (autoclaveId: string): Promise<void> => {
    await apiRequest(`/autoclave-registers/${autoclaveId}`, {
      method: 'DELETE',
    });
  },
};
