const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateRoleRequest {
  companyId: string;
  roleName: string;
  roleDescription?: string | null;
  landingPage?: string | null;
  accessLevel?: 'Admin' | 'Maker' | 'Checker' | 'Viewer' | null;
  status?: 'Active' | 'Inactive';
}

export interface UpdateRoleRequest {
  roleName?: string;
  roleDescription?: string | null;
  landingPage?: string | null;
  accessLevel?: 'Admin' | 'Maker' | 'Checker' | 'Viewer' | null;
  status?: 'Active' | 'Inactive';
}

export interface RoleResponse {
  roleId: string;
  companyId: string;
  roleName: string;
  roleDescription: string | null;
  landingPage: string | null;
  accessLevel: 'Admin' | 'Maker' | 'Checker' | 'Viewer' | null;
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
  const url = `${API_BASE_URL}${endpoint}`;
  
  console.log('[roleService] Making request:', {
    method: options.method || 'GET',
    url,
    endpoint,
    hasToken: !!token,
    hasBody: !!options.body,
  });
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log('[roleService] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorData: any = null;
      
      try {
        const responseText = await response.text();
        console.log('[roleService] Error response text:', responseText);
        
        if (responseText) {
          errorData = JSON.parse(responseText);
          console.log('[roleService] Error response parsed:', errorData);
          
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
        }
      } catch (parseError) {
        console.error('[roleService] Failed to parse error response:', parseError);
      }
      
      console.error('[roleService] Request failed:', {
        status: response.status,
        statusText: response.statusText,
        errorMessage,
        errorData,
      });
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      (error as any).errorData = errorData;
      throw error;
    }

    // Handle 204 No Content (for DELETE)
    if (response.status === 204) {
      console.log('[roleService] 204 No Content response, returning empty object');
      return {} as T;
    }

    const responseData = await response.json();
    console.log('[roleService] Success response data:', responseData);
    return responseData;
  } catch (fetchError) {
    console.error('[roleService] Fetch error:', fetchError);
    
    if (fetchError instanceof Error && (fetchError as any).status) {
      throw fetchError;
    }
    
    const error = new Error(
      fetchError instanceof Error 
        ? `Network error: ${fetchError.message}` 
        : 'Network error: Failed to connect to server'
    );
    (error as any).originalError = fetchError;
    throw error;
  }
};

// Role API functions
export const roleService = {
  // Create role
  createRole: async (data: CreateRoleRequest): Promise<RoleResponse> => {
    console.log('[roleService] createRole called with data:', data);
    const response = await apiRequest<ApiResponse<RoleResponse>>('/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Get role by ID
  getRoleById: async (roleId: string): Promise<RoleResponse> => {
    const response = await apiRequest<ApiResponse<RoleResponse>>(`/roles/${roleId}`, {
      method: 'GET',
    });
    return response.data;
  },

  // Get all roles (optionally filtered by company and active status)
  getAllRoles: async (companyId?: string, activeOnly?: boolean): Promise<RoleResponse[]> => {
    let endpoint = '/roles';
    const params = new URLSearchParams();
    if (companyId) {
      params.append('companyId', companyId);
    }
    if (activeOnly) {
      params.append('activeOnly', 'true');
    }
    if (params.toString()) {
      endpoint += `?${params.toString()}`;
    }
    
    const response = await apiRequest<ApiResponse<RoleResponse[]>>(endpoint, {
      method: 'GET',
    });
    return response.data;
  },

  // Update role
  updateRole: async (roleId: string, data: UpdateRoleRequest): Promise<RoleResponse> => {
    console.log('[roleService] updateRole called');
    console.log('[roleService] Role ID:', roleId);
    console.log('[roleService] Data:', data);
    
    const response = await apiRequest<ApiResponse<RoleResponse>>(`/roles/${roleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Delete role
  deleteRole: async (roleId: string): Promise<void> => {
    await apiRequest(`/roles/${roleId}`, {
      method: 'DELETE',
    });
  },
};
