const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
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

// Generic API request helper
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {},
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
    const errorData = await response.json().catch(() => ({}));
    // Extract error message - handle both string and array formats
    let errorMessage = `HTTP error! status: ${response.status}`;
    if (errorData.message) {
      if (Array.isArray(errorData.message)) {
        errorMessage = errorData.message.join(', ');
      } else {
        errorMessage = errorData.message;
      }
    } else if (errorData.error) {
      errorMessage = errorData.error;
    }
    throw new Error(errorMessage);
  }

  const data: ApiResponse<T> = await response.json();
  return data.data;
};

export interface ActivateUserWithPasswordRequest {
  passwordEnabled?: boolean;
  otpEnabled?: boolean;
  webLogin?: boolean;
  mobileAppAccess?: boolean;
  forceOtpOnNextLogin?: boolean;
}

export interface ActivateUserWithPasswordResponse {
  userId: string;
  userName: string;
  temporaryPassword: string;
  temporaryPasswordExpiry: string | null;
  forcePasswordChange: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  userId: string;
  userName: string;
  temporaryPassword: string;
  temporaryPasswordExpiry: string | null;
  forcePasswordChange: boolean;
}

/**
 * Activate user with temporary password generation
 */
export const activateUserWithPassword = async (
  userId: string,
  data: ActivateUserWithPasswordRequest,
): Promise<ActivateUserWithPasswordResponse> => {
  return apiRequest<ActivateUserWithPasswordResponse>(
    `/users/${userId}/activate-with-password`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
};

/**
 * Change user password
 */
export const changePassword = async (
  userId: string,
  data: ChangePasswordRequest,
): Promise<{ userId: string; userName: string; forcePasswordChange: boolean }> => {
  return apiRequest<{ userId: string; userName: string; forcePasswordChange: boolean }>(
    `/users/${userId}/change-password`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
};

/**
 * Admin reset user password
 */
export const resetPassword = async (
  userId: string,
): Promise<ResetPasswordResponse> => {
  return apiRequest<ResetPasswordResponse>(
    `/users/${userId}/reset-password`,
    {
      method: 'POST',
    },
  );
};
