const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface CreateUserRequest {
  companyId: string;
  userName: string;
  mobileNumber: string;
  employeeCode?: string;
  userRoleId?: string;
}

export interface CreateCompleteUserRequest {
  // Step 1: Create User
  companyId: string;
  userName: string;
  mobileNumber: string;
  employeeCode?: string;
  userRoleId?: string;
  emailAddress?: string;
  // Step 2: Employee Profile
  employmentType?: string;
  designation?: string;
  contractorName?: string;
  companyNameThirdParty?: string;
  grossSalary?: number;
  // Step 3: Identity & Compliance
  aadhaarNumber?: string;
  panNumber?: string;
  drivingLicenseNumber?: string;
  pfNumber?: string;
  uanNumber?: string;
  esiNumber?: string;
  // Step 4: Address & Emergency
  addressLine?: string;
  area?: string;
  city?: string;
  district?: string;
  pincode?: string;
  emergencyContact?: string;
  // Step 5: User Activation
  webLogin?: boolean;
  mobileAppAccess?: boolean;
  status?: 'Draft' | 'Active' | 'Inactive';
  passwordEnabled?: boolean;
  otpEnabled?: boolean;
  forceOtpOnNextLogin?: boolean;
}

export interface UpdateUserRequest {
  companyId?: string;
  userName?: string;
  mobileNumber?: string;
  employeeCode?: string;
  userRoleId?: string;
}

export interface ActivateUserRequest {
  passwordEnabled?: boolean;
  otpEnabled?: boolean;
  forceOtpOnNextLogin?: boolean;
  webLogin?: boolean;
  mobileAppAccess?: boolean;
}

export interface UserResponse {
  userId: string;
  companyId: string;
  userName: string;
  mobileNumber: string;
  employeeCode: string | null;
  userRoleId: string | null;
  status: 'Draft' | 'Active' | 'Inactive';
  passwordEnabled: boolean;
  otpEnabled: boolean;
  webLogin: boolean;
  mobileAppAccess: boolean;
  // Employee Profile data
  emailAddress?: string | null;
  employmentType?: string | null;
  designation?: string | null;
  contractorName?: string | null;
  companyNameThirdParty?: string | null;
  grossSalary?: number | null;
  // Identity & Compliance data
  aadhaarNumber?: string | null;
  panNumber?: string | null;
  drivingLicenseNumber?: string | null;
  pfNumber?: string | null;
  uanNumber?: string | null;
  esiNumber?: string | null;
  // Address data
  addressLine?: string | null;
  area?: string | null;
  city?: string | null;
  district?: string | null;
  pincode?: string | null;
  emergencyContact?: string | null;
  createdOn: string;
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
  
  console.log('[apiRequest] Making request:', {
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

    console.log('[apiRequest] Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorData: any = null;
      
      try {
        const responseText = await response.text();
        console.log('[apiRequest] Error response text:', responseText);
        
        if (responseText) {
          errorData = JSON.parse(responseText);
          console.log('[apiRequest] Error response parsed:', errorData);
          
          // Handle different error response formats
          if (Array.isArray(errorData.message)) {
            // Validation errors come as an array
            errorMessage = errorData.message.join(', ');
          } else if (typeof errorData.message === 'string') {
            // Single error message
            errorMessage = errorData.message;
          } else if (errorData.error) {
            // Error object with error field
            errorMessage = typeof errorData.error === 'string' 
              ? errorData.error 
              : JSON.stringify(errorData.error);
          } else if (errorData.message) {
            // Any other message format
            errorMessage = String(errorData.message);
          }
        }
      } catch (parseError) {
        console.error('[apiRequest] Failed to parse error response:', parseError);
        // If response is not JSON, use default message
      }
      
      console.error('[apiRequest] Request failed:', {
        status: response.status,
        statusText: response.statusText,
        errorMessage,
        errorData,
      });
      
      // Create error object with more details
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      (error as any).errorData = errorData;
      throw error;
    }

    // Handle 204 No Content (for DELETE)
    if (response.status === 204) {
      console.log('[apiRequest] 204 No Content response, returning empty object');
      return {} as T;
    }

    const responseData = await response.json();
    console.log('[apiRequest] Success response data:', responseData);
    return responseData;
  } catch (fetchError) {
    console.error('[apiRequest] Fetch error:', fetchError);
    console.error('[apiRequest] Fetch error details:', {
      message: fetchError instanceof Error ? fetchError.message : String(fetchError),
      name: fetchError instanceof Error ? fetchError.name : undefined,
      stack: fetchError instanceof Error ? fetchError.stack : undefined,
    });
    
    // Re-throw with more context if it's not already an error we created
    if (fetchError instanceof Error && (fetchError as any).status) {
      throw fetchError;
    }
    
    // Network error or other fetch error
    const error = new Error(
      fetchError instanceof Error 
        ? `Network error: ${fetchError.message}` 
        : 'Network error: Failed to connect to server'
    );
    (error as any).originalError = fetchError;
    throw error;
  }
};

// User API functions
export const userService = {
  // Create user (Step 1 only - for backward compatibility)
  createUser: async (data: CreateUserRequest): Promise<UserResponse> => {
    const response = await apiRequest<ApiResponse<UserResponse>>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Create complete user (all steps data)
  createCompleteUser: async (data: CreateCompleteUserRequest): Promise<UserResponse> => {
    console.log('[userService] createCompleteUser called with data:', data);
    console.log('[userService] API endpoint: POST /users/complete');
    
    try {
      const response = await apiRequest<ApiResponse<UserResponse>>('/users/complete', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      console.log('[userService] createCompleteUser success - Response:', response);
      return response.data;
    } catch (error) {
      console.error('[userService] createCompleteUser error:', error);
      console.error('[userService] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  // Get user by ID
  getUserById: async (userId: string): Promise<UserResponse> => {
    const response = await apiRequest<ApiResponse<UserResponse>>(`/users/${userId}`, {
      method: 'GET',
    });
    return response.data;
  },

  // Update user
  updateUser: async (userId: string, data: UpdateUserRequest): Promise<UserResponse> => {
    const response = await apiRequest<ApiResponse<UserResponse>>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Update complete user (all steps data)
  updateCompleteUser: async (userId: string, data: CreateCompleteUserRequest): Promise<UserResponse> => {
    console.log('[userService] updateCompleteUser called');
    console.log('[userService] User ID:', userId);
    console.log('[userService] Data:', data);
    console.log('[userService] API endpoint: PUT /users/' + userId + '/complete');
    
    try {
      const response = await apiRequest<ApiResponse<UserResponse>>(`/users/${userId}/complete`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      console.log('[userService] updateCompleteUser success - Response:', response);
      return response.data;
    } catch (error) {
      console.error('[userService] updateCompleteUser error:', error);
      console.error('[userService] Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  // Delete user
  deleteUser: async (userId: string): Promise<void> => {
    await apiRequest(`/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // Activate user
  activateUser: async (userId: string, data: ActivateUserRequest): Promise<UserResponse> => {
    const response = await apiRequest<ApiResponse<UserResponse>>(`/users/${userId}/activate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Deactivate user
  deactivateUser: async (userId: string): Promise<UserResponse> => {
    const response = await apiRequest<ApiResponse<UserResponse>>(`/users/${userId}/deactivate`, {
      method: 'POST',
    });
    return response.data;
  },

  // Get users by company
  getUsersByCompany: async (companyId: string): Promise<UserResponse[]> => {
    const response = await apiRequest<ApiResponse<UserResponse[]>>(`/users/company/${companyId}`, {
      method: 'GET',
    });
    return response.data;
  },

  // Get user by username
  getUserByUsername: async (userName: string): Promise<UserResponse> => {
    const response = await apiRequest<ApiResponse<UserResponse>>(`/users/username/${encodeURIComponent(userName)}`, {
      method: 'GET',
    });
    return response.data;
  },
};
