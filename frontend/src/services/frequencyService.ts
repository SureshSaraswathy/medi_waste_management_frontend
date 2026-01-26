const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateFrequencyRequest {
  frequencyCode: string;
  frequencyName: string;
  companyId: string;
}

export interface UpdateFrequencyRequest {
  status?: 'Active' | 'Inactive';
}

export interface FrequencyResponse {
  id: string;
  frequencyCode: string;
  frequencyName: string;
  companyId: string;
  status: 'Active' | 'Inactive';
  createdBy: string | null;
  createdOn: string;
  modifiedBy: string | null;
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
      
      if (Array.isArray(errorData.message)) {
        errorMessage = errorData.message.join(', ');
      } else if (typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      } else if (errorData.error) {
        errorMessage = typeof errorData.error === 'string' 
          ? errorData.error 
          : JSON.stringify(errorData.error);
      } else if (errorData.message) {
        errorMessage = String(errorData.message);
      }
    } catch {
      // If response is not JSON, use default message
    }
    
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    throw error;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

// Frequency API functions
// NOTE: Backend API needs to be created. This service is ready for integration.
export const frequencyService = {
  createFrequency: async (data: CreateFrequencyRequest): Promise<FrequencyResponse> => {
    const response = await apiRequest<ApiResponse<FrequencyResponse>>('/frequencies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getFrequencyById: async (frequencyId: string): Promise<FrequencyResponse> => {
    const response = await apiRequest<ApiResponse<FrequencyResponse>>(`/frequencies/${frequencyId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllFrequencies: async (companyId?: string, activeOnly: boolean = false): Promise<FrequencyResponse[]> => {
    let url = '/frequencies';
    const params = new URLSearchParams();
    if (companyId) {
      params.append('companyId', companyId);
    }
    if (activeOnly) {
      params.append('activeOnly', 'true');
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiRequest<ApiResponse<FrequencyResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  updateFrequency: async (frequencyId: string, data: UpdateFrequencyRequest): Promise<FrequencyResponse> => {
    const response = await apiRequest<ApiResponse<FrequencyResponse>>(`/frequencies/${frequencyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  deleteFrequency: async (frequencyId: string): Promise<void> => {
    await apiRequest(`/frequencies/${frequencyId}`, {
      method: 'DELETE',
    });
  },
};
