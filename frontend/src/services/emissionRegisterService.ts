const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateEmissionRegisterRequest {
  companyId: string;
  emissionDate: string;
  equipmentId: string;
  stackId: string;
  pm: number;
  co: number;
  hci: number;
  temp: number;
  oxygen: number;
  complianceStatus: string;
  status: 'Active' | 'Inactive';
}

export interface UpdateEmissionRegisterRequest {
  emissionDate?: string;
  equipmentId?: string;
  stackId?: string;
  pm?: number;
  co?: number;
  hci?: number;
  temp?: number;
  oxygen?: number;
  complianceStatus?: string;
  status?: 'Active' | 'Inactive';
}

export interface EmissionRegisterResponse {
  id: string;
  emisRegNum: string;
  companyId: string;
  emissionDate: string;
  equipmentId: string;
  stackId: string;
  pm: number;
  co: number;
  hci: number;
  temp: number;
  oxygen: number;
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

// Emission Register API functions
export const emissionRegisterService = {
  createEmissionRegister: async (data: CreateEmissionRegisterRequest): Promise<EmissionRegisterResponse> => {
    const response = await apiRequest<ApiResponse<EmissionRegisterResponse>>('/emission-registers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getEmissionRegisterById: async (emissionId: string): Promise<EmissionRegisterResponse> => {
    const response = await apiRequest<ApiResponse<EmissionRegisterResponse>>(`/emission-registers/${emissionId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllEmissionRegisters: async (
    companyId?: string,
    status?: string
  ): Promise<EmissionRegisterResponse[]> => {
    let url = '/emission-registers';
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
    
    const response = await apiRequest<ApiResponse<EmissionRegisterResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  updateEmissionRegister: async (
    emissionId: string,
    data: UpdateEmissionRegisterRequest
  ): Promise<EmissionRegisterResponse> => {
    const response = await apiRequest<ApiResponse<EmissionRegisterResponse>>(`/emission-registers/${emissionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  deleteEmissionRegister: async (emissionId: string): Promise<void> => {
    await apiRequest(`/emission-registers/${emissionId}`, {
      method: 'DELETE',
    });
  },
};
