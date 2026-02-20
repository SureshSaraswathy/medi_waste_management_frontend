import { API_BASE_URL } from './apiBaseUrl';

/**
 * HCF Authentication Service
 * Handles HCF-specific authentication operations
 */

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface HCFLoginRequest {
  hcfCode: string;
  password: string;
}

export interface HCFLoginResponse {
  userId: string;
  userName: string;
  email?: string;
  companyId: string;
  userRoleId: string | null;
  userType: 'HCF';
  status: string;
  requiresPasswordChange: boolean;
  passwordExpired: boolean;
  token?: string;
}

export interface RequestPasswordResetRequest {
  identifier: string; // HCF Code or Email
}

export interface ResetPasswordWithTokenRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Helper function for API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch (err: any) {
    const hint =
      `Failed to reach backend at ${url}. ` +
      `If you are using a mobile device/emulator, set VITE_API_BASE_URL to ` +
      `http://<YOUR_PC_IP>:3000/api/v1 and ensure backend CORS allows your frontend origin.`;
    throw new Error(hint);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
    throw new Error(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
  }

  const data: ApiResponse<T> = await response.json();
  return data.data;
}

/**
 * HCF Login
 */
export const hcfLogin = async (credentials: HCFLoginRequest): Promise<HCFLoginResponse> => {
  return apiRequest<HCFLoginResponse>('/hcf-auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
};

/**
 * Request password reset (forgot password)
 */
export const requestHCFPasswordReset = async (
  data: RequestPasswordResetRequest,
): Promise<{ success: boolean; message: string }> => {
  return apiRequest<{ success: boolean; message: string }>('/hcf-auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Reset password with token
 */
export const resetHCFPasswordWithToken = async (
  data: ResetPasswordWithTokenRequest,
): Promise<{ success: boolean; message: string }> => {
  return apiRequest<{ success: boolean; message: string }>('/hcf-auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Change password (logged in HCF)
 */
export const changeHCFPassword = async (
  data: ChangePasswordRequest,
): Promise<{ success: boolean; message: string }> => {
  // Get token from localStorage
  const storedUser = localStorage.getItem('mw-auth-user');
  if (!storedUser) {
    throw new Error('User not authenticated');
  }
  const user = JSON.parse(storedUser);
  const token = user.token;

  return apiRequest<{ success: boolean; message: string }>('/hcf-auth/change-password', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
};

/**
 * Admin reset HCF password
 */
export const adminResetHCFPassword = async (hcfId: string): Promise<{ hcfId: string; temporaryPassword: string }> => {
  // Get token from localStorage
  const storedUser = localStorage.getItem('mw-auth-user');
  if (!storedUser) {
    throw new Error('User not authenticated');
  }
  const user = JSON.parse(storedUser);
  const token = user.token;

  return apiRequest<{ hcfId: string; temporaryPassword: string }>(`/hcf-auth/admin/reset-password/${hcfId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
};
