import { API_BASE_URL } from './apiBaseUrl';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateRouteHcfMappingRequest {
  routeId: string;
  hcfId: string;
  companyId: string;
  sequenceOrder?: number;
}

export interface UpdateRouteHcfMappingRequest {
  sequenceOrder?: number;
  status?: 'Active' | 'Inactive';
}

export interface RouteHcfMappingResponse {
  id: string;
  routeId: string;
  hcfId: string;
  companyId: string;
  sequenceOrder?: number;
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

// Route HCF Mapping API functions
// NOTE: Backend API needs to be created. This service is ready for integration.
export const routeHcfService = {
  createRouteHcfMapping: async (data: CreateRouteHcfMappingRequest): Promise<RouteHcfMappingResponse> => {
    const response = await apiRequest<ApiResponse<RouteHcfMappingResponse>>('/route-hcf-mappings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getRouteHcfMappingById: async (mappingId: string): Promise<RouteHcfMappingResponse> => {
    const response = await apiRequest<ApiResponse<RouteHcfMappingResponse>>(`/route-hcf-mappings/${mappingId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllRouteHcfMappings: async (routeId?: string, hcfId?: string, companyId?: string, activeOnly: boolean = false): Promise<RouteHcfMappingResponse[]> => {
    let url = '/route-hcf-mappings';
    const params = new URLSearchParams();
    if (routeId) {
      params.append('routeId', routeId);
    }
    if (hcfId) {
      params.append('hcfId', hcfId);
    }
    if (companyId) {
      params.append('companyId', companyId);
    }
    if (activeOnly) {
      params.append('activeOnly', 'true');
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await apiRequest<ApiResponse<RouteHcfMappingResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  updateRouteHcfMapping: async (mappingId: string, data: UpdateRouteHcfMappingRequest): Promise<RouteHcfMappingResponse> => {
    const response = await apiRequest<ApiResponse<RouteHcfMappingResponse>>(`/route-hcf-mappings/${mappingId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  deleteRouteHcfMapping: async (mappingId: string): Promise<void> => {
    await apiRequest(`/route-hcf-mappings/${mappingId}`, {
      method: 'DELETE',
    });
  },
};
