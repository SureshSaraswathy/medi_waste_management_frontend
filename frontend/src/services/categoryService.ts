const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateCategoryRequest {
  categoryCode: string;
  categoryName: string;
  companyId: string;
}

export interface UpdateCategoryRequest {
  status?: 'Active' | 'Inactive';
}

export interface CategoryResponse {
  id: string;
  categoryCode: string;
  categoryName: string;
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

// Category API functions
// NOTE: Backend API needs to be created. This service is ready for integration.
export const categoryService = {
  createCategory: async (data: CreateCategoryRequest): Promise<CategoryResponse> => {
    const response = await apiRequest<ApiResponse<CategoryResponse>>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  getCategoryById: async (categoryId: string): Promise<CategoryResponse> => {
    const response = await apiRequest<ApiResponse<CategoryResponse>>(`/categories/${categoryId}`, {
      method: 'GET',
    });
    return response.data;
  },

  getAllCategories: async (companyId?: string, activeOnly: boolean = false): Promise<CategoryResponse[]> => {
    let url = '/categories';
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
    
    const response = await apiRequest<ApiResponse<CategoryResponse[]>>(url, {
      method: 'GET',
    });
    return response.data;
  },

  updateCategory: async (categoryId: string, data: UpdateCategoryRequest): Promise<CategoryResponse> => {
    const response = await apiRequest<ApiResponse<CategoryResponse>>(`/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  deleteCategory: async (categoryId: string): Promise<void> => {
    await apiRequest(`/categories/${categoryId}`, {
      method: 'DELETE',
    });
  },
};
