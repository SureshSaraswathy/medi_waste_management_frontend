const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateFinanceYearRequest {
  startYear: number; // e.g., 2025
}

export interface UpdateFinanceYearRequest {
  status?: 'Active' | 'Inactive';
}

export interface FinanceYearResponse {
  id: string;
  finYear: string; // Format: YYYY-YY (e.g., 2025-26)
  fyStartDate: string; // ISO date string
  fyEndDate: string; // ISO date string
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

  // Handle 204 No Content (delete operations) - no body to parse
  if (response.status === 204) {
    return {} as T;
  }

  if (!response.ok) {
    // Handle 404 specifically (endpoint not found)
    if (response.status === 404) {
      const error = new Error('Finance Year API endpoint not found. Please ensure the backend API is running and the /api/v1/finance-years endpoint is implemented.');
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
        if (typeof errorData.error === 'string') {
          errorMessage = errorData.error;
        } else if (errorData.error.message) {
          errorMessage = errorData.error.message;
        } else {
          errorMessage = JSON.stringify(errorData.error);
        }
      } else if (errorData.message) {
        errorMessage = String(errorData.message);
      }
      
      // Check for nested message in response object
      if (errorData.response && errorData.response.message) {
        errorMessage = errorData.response.message;
      }
    } catch {
      // If response is not JSON, use default message
    }
    
    const error = new Error(errorMessage);
    (error as any).status = response.status;
    (error as any).statusText = response.statusText;
    throw error;
  }

  return response.json();
};

export const financeYearService = {
  /**
   * Create a new finance year
   */
  createFinanceYear: async (data: CreateFinanceYearRequest): Promise<FinanceYearResponse> => {
    const response = await apiRequest<ApiResponse<FinanceYearResponse>>('/finance-years', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Get finance year by ID
   */
  getFinanceYearById: async (financeYearId: string): Promise<FinanceYearResponse> => {
    const response = await apiRequest<ApiResponse<FinanceYearResponse>>(`/finance-years/${financeYearId}`, {
      method: 'GET',
    });
    return response.data;
  },

  /**
   * Get all finance years
   */
  getAllFinanceYears: async (activeOnly: boolean = false): Promise<FinanceYearResponse[]> => {
    let url = '/finance-years';
    const params = new URLSearchParams();
    if (activeOnly) {
      params.append('activeOnly', 'true');
    }
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    const response = await apiRequest<ApiResponse<FinanceYearResponse[]>>(url, {
      method: 'GET',
    });
    // Safety check: ensure data is an array
    if (!response || !response.data) {
      return [];
    }
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Update finance year
   */
  updateFinanceYear: async (financeYearId: string, data: UpdateFinanceYearRequest): Promise<FinanceYearResponse> => {
    const response = await apiRequest<ApiResponse<FinanceYearResponse>>(`/finance-years/${financeYearId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  /**
   * Delete finance year
   */
  deleteFinanceYear: async (financeYearId: string): Promise<void> => {
    await apiRequest(`/finance-years/${financeYearId}`, {
      method: 'DELETE',
    });
  },
};
