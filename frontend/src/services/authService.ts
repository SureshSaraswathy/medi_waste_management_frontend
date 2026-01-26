import { User } from '../context/AuthContext';

type Role = User['roles'][number];

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

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
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

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

// Store for OTPs (in production, use Redis or database)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// Generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static OTP for SuperAdmin (should match backend SUPER_ADMIN_STATIC_OTP env variable)
const SUPERADMIN_STATIC_OTP = '123456';

// Send OTP via email (mock)
export const sendOTPEmail = async (email: string): Promise<string> => {
  const normalizedEmail = email.toLowerCase();
  const isSuperAdmin = normalizedEmail === 'superadmin@medi-waste.io' || normalizedEmail === 'superadmin';
  
  // For super admin, use static OTP (should match backend config)
  
  if (isSuperAdmin) {
    // Super admin uses static OTP - no need to store, just return it
    console.log(`[SUPER ADMIN] Static OTP: ${SUPERADMIN_STATIC_OTP}`);
    return SUPERADMIN_STATIC_OTP;
  }
  
  // For other users, generate OTP
  await delay(500);
  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
  
  otpStore.set(normalizedEmail, { otp, expiresAt });
  
  console.log(`[MOCK] OTP sent to ${email}: ${otp}`);
  
  return otp; // Return OTP for testing purposes
};

// Verify OTP - calls backend API for super admin, uses mock for others
export const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
  const normalizedEmail = email.toLowerCase();
  const isSuperAdmin = normalizedEmail === 'superadmin' || normalizedEmail === 'superadmin@medi-waste.io';
  
  // For super admin, call backend API
  if (isSuperAdmin) {
    try {
      const result = await apiRequest<LoginResponse>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          usernameOrEmail: email,
          otp,
        }),
      });
      return !!result.userId; // If we get a user ID, OTP is valid
    } catch (error) {
      console.error('OTP verification error:', error);
      return false;
    }
  }
  
  // For other users, use mock implementation (until backend OTP is implemented)
  await delay(300);
  
  // Handle SuperAdmin case - normalize to full email
  const lookupEmail = normalizedEmail === 'superadmin' 
    ? 'superadmin@medi-waste.io' 
    : normalizedEmail;
  
  const stored = otpStore.get(lookupEmail);
  
  if (!stored) {
    console.log(`[DEBUG] No OTP found for email: ${lookupEmail}`);
    console.log(`[DEBUG] OTP Store keys:`, Array.from(otpStore.keys()));
    return false;
  }
  
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(lookupEmail);
    console.log(`[DEBUG] OTP expired for email: ${lookupEmail}`);
    return false;
  }
  
  if (stored.otp !== otp) {
    console.log(`[DEBUG] OTP mismatch. Expected: ${stored.otp}, Got: ${otp}`);
    return false;
  }
  
  // OTP verified, remove it
  otpStore.delete(lookupEmail);
  return true;
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
  const normalizedEmail = email.toLowerCase();
  const isSuperAdmin = normalizedEmail === 'superadmin' || normalizedEmail === 'superadmin@medi-waste.io';
  
  // For super admin, call backend API
  if (isSuperAdmin) {
    try {
      const result = await apiRequest<LoginResponse>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          usernameOrEmail: email,
          otp,
        }),
      });

      // Map backend response to frontend User format
      const user: User = {
        id: result.userId,
        name: result.userName,
        email: result.email || result.userName,
        roles: ['superadmin'], // Super admin role
        token: result.token || `token-${result.userId}`,
      };

      return user;
    } catch (error) {
      console.error('OTP login error:', error);
      throw new Error('Invalid or expired OTP');
    }
  }
  
  // For other users, use mock implementation (until backend OTP is implemented)
  await delay(300);
  
  const isValidOTP = await verifyOTP(email, otp);
  if (!isValidOTP) {
    throw new Error('Invalid or expired OTP');
  }
  
  // Find user - handle SuperAdmin case
  let user: User | undefined;
  if (email.toLowerCase() === 'superadmin' || email.toLowerCase() === 'superadmin@medi-waste.io') {
    user = demoUsers.find((u) => u.id === 'u-superadmin');
  } else {
    user = demoUsers.find((u) => u.email === email.toLowerCase());
  }
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return user;
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
