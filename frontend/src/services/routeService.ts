const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateRouteRequest {
  routeCode: string;
  routeName: string;
  companyId: string;
  frequencyId?: string;
}

export interface UpdateRouteRequest {
  frequencyId?: string;
  status?: 'Active' | 'Inactive';
}

export interface RouteResponse {
  id: string;
  routeCode: string;
  routeName: string;
  companyId: string;
  frequencyId?: string;
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

// Route API functions
// NOTE: Backend API needs to be created. This service is ready for integration.
export const routeService = {
  createRoute: async (data: CreateRouteRequest): Promise<RouteResponse> => {
    const response = await apiRequest<ApiResponse<RouteResponse>>('/routes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getRouteById: async (routeId: string): Promise<RouteResponse> => {
    const response = await apiRequest<ApiResponse<RouteResponse>>(`/routes/${routeId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllRoutes: async (activeOnly: boolean = false): Promise<RouteResponse[]> => {
    const url = activeOnly ? '/routes?activeOnly=true' : '/routes';
    const response = await apiRequest<ApiResponse<RouteResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  updateRoute: async (routeId: string, data: UpdateRouteRequest): Promise<RouteResponse> => {
    const response = await apiRequest<ApiResponse<RouteResponse>>(`/routes/${routeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  deleteRoute: async (routeId: string): Promise<void> => {
    await apiRequest(`/routes/${routeId}`, {
      method: 'DELETE',
    });
  },
};
