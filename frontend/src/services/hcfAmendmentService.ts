const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateHcfAmendmentRequest {
  hcfId: string;
  amendmentType: string;
  amendmentDate: string;
  description?: string;
  status?: string;
  approvedBy?: string;
  approvedDate?: string;
}

export interface UpdateHcfAmendmentRequest {
  amendmentType?: string;
  amendmentDate?: string;
  description?: string;
  amendmentStatus?: string; // Backend uses amendmentStatus, not status
  approvedBy?: string;
  approvedDate?: string;
  masterStatus?: 'Active' | 'Inactive'; // Optional master status
}

export interface HcfAmendmentResponse {
  id: string;
  hcfId: string;
  amendmentType: string;
  amendmentDate: string;
  description?: string;
  status?: string;
  approvedBy?: string;
  approvedDate?: string;
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

// HCF Amendment API functions
// NOTE: Backend API needs to be created. This service is ready for integration.
export const hcfAmendmentService = {
  createHcfAmendment: async (data: CreateHcfAmendmentRequest): Promise<HcfAmendmentResponse> => {
    const response = await apiRequest<ApiResponse<HcfAmendmentResponse>>('/hcf-amendments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getHcfAmendmentById: async (amendmentId: string): Promise<HcfAmendmentResponse> => {
    const response = await apiRequest<ApiResponse<HcfAmendmentResponse>>(`/hcf-amendments/${amendmentId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllHcfAmendments: async (hcfId?: string, activeOnly: boolean = false): Promise<HcfAmendmentResponse[]> => {
    let url = '/hcf-amendments';
    const params = new URLSearchParams();
    if (hcfId) {
      params.append('hcfId', hcfId);
    }
    if (activeOnly) {
      params.append('activeOnly', 'true');
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiRequest<ApiResponse<HcfAmendmentResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  updateHcfAmendment: async (amendmentId: string, data: UpdateHcfAmendmentRequest): Promise<HcfAmendmentResponse> => {
    const response = await apiRequest<ApiResponse<HcfAmendmentResponse>>(`/hcf-amendments/${amendmentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  deleteHcfAmendment: async (amendmentId: string): Promise<void> => {
    await apiRequest(`/hcf-amendments/${amendmentId}`, {
      method: 'DELETE',
    });
  },
};
