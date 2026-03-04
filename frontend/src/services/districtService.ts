const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateDistrictRequest {
  districtCode: string;
  districtName: string;
  stateId?: string;
}

export interface UpdateDistrictRequest {
  districtCode?: string;
  districtName?: string;
  stateId?: string;
  status?: 'Active' | 'Inactive';
}

export interface DistrictResponse {
  id: string;
  districtCode: string;
  districtName: string;
  stateId?: string;
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
    // Handle 404 specifically (endpoint not found)
    if (response.status === 404) {
      const error = new Error('District API endpoint not found. Please ensure the backend API is running and the /api/v1/districts endpoint is implemented.');
      (error as any).status = 404;
      (error as any).statusText = 'Not Found';
      (error as any).isEndpointMissing = true;
      throw error;
    }

    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      
      // Handle different error response formats
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

  // Handle 204 No Content (for DELETE)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

// District API functions
export const districtService = {
  // Create district
  createDistrict: async (data: CreateDistrictRequest): Promise<DistrictResponse> => {
    const response = await apiRequest<ApiResponse<DistrictResponse>>('/districts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Get district by ID
  getDistrictById: async (districtId: string): Promise<DistrictResponse> => {
    const response = await apiRequest<ApiResponse<DistrictResponse>>(`/districts/${districtId}`, {
      method: 'GET',
    });
    return response.data;
  },

  // Get all districts
  getAllDistricts: async (activeOnly: boolean = false, stateId?: string): Promise<DistrictResponse[]> => {
    let url = '/districts';
    const params = new URLSearchParams();
    if (activeOnly) {
      params.append('activeOnly', 'true');
    }
    if (stateId) {
      params.append('stateId', stateId);
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    const response = await apiRequest<ApiResponse<DistrictResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  // Update district
  updateDistrict: async (districtId: string, data: UpdateDistrictRequest): Promise<DistrictResponse> => {
    const response = await apiRequest<ApiResponse<DistrictResponse>>(`/districts/${districtId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Delete district
  deleteDistrict: async (districtId: string): Promise<void> => {
    await apiRequest(`/districts/${districtId}`, {
      method: 'DELETE',
    });
  },
};
