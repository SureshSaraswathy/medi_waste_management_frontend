const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreatePlaceholderMasterRequest {
  placeholderCode: string;
  placeholderDescription: string;
  sourceTable: string;
  sourceColumn: string;
}

export interface UpdatePlaceholderMasterRequest {
  placeholderDescription?: string;
  sourceTable?: string;
  sourceColumn?: string;
  status?: 'Active' | 'Inactive';
}

export interface PlaceholderMasterResponse {
  id: string;
  placeholderCode: string;
  placeholderDescription: string;
  sourceTable: string;
  sourceColumn: string;
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
    if (response.status === 404) {
      const error = new Error('Placeholder Master API endpoint not found.');
      (error as any).status = 404;
      (error as any).isEndpointMissing = true;
      throw error;
    }

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
      }
    } catch {
      // If response is not JSON, use default message
    }
    
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
};

// Placeholder Master API functions
export const placeholderMasterService = {
  // Create placeholder master
  createPlaceholderMaster: async (data: CreatePlaceholderMasterRequest): Promise<PlaceholderMasterResponse> => {
    const response = await apiRequest<ApiResponse<PlaceholderMasterResponse>>('/placeholder-master', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Get placeholder master by ID
  getPlaceholderMasterById: async (placeholderId: string): Promise<PlaceholderMasterResponse> => {
    const response = await apiRequest<ApiResponse<PlaceholderMasterResponse>>(`/placeholder-master/${placeholderId}`, {
      method: 'GET',
    });
    return response.data;
  },

  // Get all placeholder masters
  getAllPlaceholderMasters: async (activeOnly: boolean = false): Promise<PlaceholderMasterResponse[]> => {
    let url = '/placeholder-master';
    if (activeOnly) {
      url += '?activeOnly=true';
    }
    const response = await apiRequest<ApiResponse<PlaceholderMasterResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  // Update placeholder master
  updatePlaceholderMaster: async (placeholderId: string, data: UpdatePlaceholderMasterRequest): Promise<PlaceholderMasterResponse> => {
    const response = await apiRequest<ApiResponse<PlaceholderMasterResponse>>(`/placeholder-master/${placeholderId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Delete placeholder master
  deletePlaceholderMaster: async (placeholderId: string): Promise<void> => {
    await apiRequest(`/placeholder-master/${placeholderId}`, {
      method: 'DELETE',
    });
  },
};
