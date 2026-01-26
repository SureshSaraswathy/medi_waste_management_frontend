const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateColorRequest {
  colorName: string;
  companyId: string;
}

export interface UpdateColorRequest {
  colorName?: string;
  companyId?: string;
  status?: 'Active' | 'Inactive';
}

export interface ColorResponse {
  id: string;
  colorName: string;
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

// Color API functions
export const colorService = {
  // Create color
  createColor: async (data: CreateColorRequest): Promise<ColorResponse> => {
    const response = await apiRequest<ApiResponse<ColorResponse>>('/colors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Get color by ID
  getColorById: async (colorId: string): Promise<ColorResponse> => {
    const response = await apiRequest<ApiResponse<ColorResponse>>(`/colors/${colorId}`, {
      method: 'GET',
    });
    return response.data;
  },

  // Get all colors
  getAllColors: async (companyId?: string, activeOnly: boolean = false): Promise<ColorResponse[]> => {
    let url = '/colors';
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
    
    const response = await apiRequest<ApiResponse<ColorResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  // Update color
  updateColor: async (colorId: string, data: UpdateColorRequest): Promise<ColorResponse> => {
    const response = await apiRequest<ApiResponse<ColorResponse>>(`/colors/${colorId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Delete color
  deleteColor: async (colorId: string): Promise<void> => {
    await apiRequest(`/colors/${colorId}`, {
      method: 'DELETE',
    });
  },
};
