import { User } from '../context/AuthContext';
import { API_BASE_URL } from './apiBaseUrl';

type Role = User['roles'][number];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

interface LoginResponse {
  userId: string;
  userName: string;
  email?: string;
  companyId: string;
  userRoleId: string | null;
  status: string;
  requiresOTP: boolean;
  forcePasswordChange: boolean;
  token?: string;
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
    // Network / CORS / DNS failures show up as "TypeError: Failed to fetch"
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

const demoUsers: Array<User> = [
  {
    id: 'u-superadmin',
    name: 'SuperAdmin',
    email: 'superadmin@medi-waste.io',
    roles: ['superadmin'],
    token: 'demo-token-superadmin',
  },
  {
    id: 'u-admin',
    name: 'Alex Admin',
    email: 'admin@medi-waste.io',
    roles: ['admin'],
    token: 'demo-token-admin',
  },
  {
    id: 'u-manager',
    name: 'Morgan Manager',
    email: 'manager@medi-waste.io',
    roles: ['manager'],
    token: 'demo-token-manager',
  },
];

// Send OTP via backend API (username or email)
export const sendOTPEmail = async (usernameOrEmail: string): Promise<void> => {
  await apiRequest('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ usernameOrEmail }),
  });
};

// Login request - calls backend API
export const loginRequest = async (
  usernameOrEmail: string,
  password: string,
): Promise<{ requiresOTP: boolean; email?: string; user?: User; forcePasswordChange?: boolean }> => {
  try {
    const result = await apiRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        usernameOrEmail: usernameOrEmail.trim(),
        password,
      }),
    });

    // Map backend response to frontend User format
    const normalizedEmail = (result.email || result.userName)?.toLowerCase();
    const isSuperAdmin = normalizedEmail === 'superadmin@medi-waste.io' || normalizedEmail === 'superadmin';
    
    const user: User = {
      id: result.userId,
      name: result.userName,
      email: result.email || result.userName,
      // If SuperAdmin, set role to 'superadmin', otherwise use backend role
      roles: isSuperAdmin ? ['superadmin'] : (result.userRoleId ? [result.userRoleId] : ['user']),
      token: result.token || `token-${result.userId}`,
    };

    // If OTP is required, send OTP and return that info
    if (result.requiresOTP) {
      await sendOTPEmail(result.email || result.userName);
      return {
        requiresOTP: true,
        email: result.email || result.userName,
        user,
        forcePasswordChange: result.forcePasswordChange,
      };
    }

    // If password change is forced, return that info
    if (result.forcePasswordChange) {
      return {
        requiresOTP: false,
        user,
        forcePasswordChange: true,
      };
    }

    // Normal login success
    return {
      requiresOTP: false,
      user,
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const loginWithOTP = async (email: string, otp: string): Promise<User> => {
  try {
    const result = await apiRequest<LoginResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        usernameOrEmail: email,
        otp,
      }),
    });

    const normalizedEmail = (result.email || result.userName)?.toLowerCase();
    const isSuperAdmin = normalizedEmail === 'superadmin@medi-waste.io' || normalizedEmail === 'superadmin';

    const user: User = {
      id: result.userId,
      name: result.userName,
      email: result.email || result.userName,
      roles: isSuperAdmin ? ['superadmin'] : (result.userRoleId ? [result.userRoleId] : ['user']),
      token: result.token || `token-${result.userId}`,
    };

    return user;
  } catch (error) {
    console.error('OTP login error:', error);
    throw new Error('Invalid or expired OTP');
  }
};

export const registerUserRequest = async (
  payload: { name: string; email: string; password: string; role: Role },
  token: string,
): Promise<User> => {
  await delay(500);
  if (!token) {
    throw new Error('Unauthorized');
  }

  if (payload.password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const user: User = {
    id: `u-${Date.now()}`,
    name: payload.name,
    email: payload.email.toLowerCase(),
    roles: [payload.role],
    token: `issued-${Date.now()}`,
  };

  demoUsers.push(user);
  return user;
};
