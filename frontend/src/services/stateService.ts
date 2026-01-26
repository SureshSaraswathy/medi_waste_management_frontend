const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateStateRequest {
  stateCode: string;
  stateName: string;
}

export interface UpdateStateRequest {
  stateCode?: string;
  stateName?: string;
  status?: 'Active' | 'Inactive';
}

export interface StateResponse {
  id: string;
  stateCode: string;
  stateName: string;
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

// State API functions
export const stateService = {
  // Create state
  createState: async (data: CreateStateRequest): Promise<StateResponse> => {
    const response = await apiRequest<ApiResponse<StateResponse>>('/states', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Get state by ID
  getStateById: async (stateId: string): Promise<StateResponse> => {
    const response = await apiRequest<ApiResponse<StateResponse>>(`/states/${stateId}`, {
      method: 'GET',
    });
    return response.data;
  },

  // Get all states
  getAllStates: async (activeOnly: boolean = false): Promise<StateResponse[]> => {
    const url = activeOnly ? '/states?activeOnly=true' : '/states';
    const response = await apiRequest<ApiResponse<StateResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  // Update state
  updateState: async (stateId: string, data: UpdateStateRequest): Promise<StateResponse> => {
    const response = await apiRequest<ApiResponse<StateResponse>>(`/states/${stateId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Delete state
  deleteState: async (stateId: string): Promise<void> => {
    await apiRequest(`/states/${stateId}`, {
      method: 'DELETE',
    });
  },
};
