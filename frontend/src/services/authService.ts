import { User } from '../context/AuthContext';

type Role = User['roles'][number];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const demoUsers: Array<User> = [
  {
    id: 'u-superadmin',
    name: 'SuperAdmin',
    email: 'superadmin@medi-waste.io',
    roles: ['admin'],
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

// Static OTP for SuperAdmin
const SUPERADMIN_STATIC_OTP = '123456';

// Send OTP via email (mock)
export const sendOTPEmail = async (email: string): Promise<string> => {
  await delay(500);
  
  // Use static OTP for SuperAdmin
  const isSuperAdmin = email.toLowerCase() === 'superadmin@medi-waste.io' || email.toLowerCase() === 'superadmin';
  const otp = isSuperAdmin ? SUPERADMIN_STATIC_OTP : generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry
  
  otpStore.set(email.toLowerCase(), { otp, expiresAt });
  
  // In production, send actual email here
  if (isSuperAdmin) {
    console.log(`[MOCK] Static OTP for SuperAdmin: ${otp}`);
  } else {
    console.log(`[MOCK] OTP sent to ${email}: ${otp}`);
  }
  
  return otp; // Return OTP for testing purposes
};

// Verify OTP
export const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
  await delay(300);
  const normalizedEmail = email.toLowerCase();
  
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

export const loginRequest = async (email: string, password: string): Promise<{ requiresOTP: boolean; email?: string }> => {
  await delay(450);
  
  // Check for SuperAdmin credentials
  if (email.toLowerCase() === 'superadmin' || email.toLowerCase() === 'superadmin@medi-waste.io') {
    if (password === 'admin') {
      // Send OTP and return that OTP is required
      await sendOTPEmail('superadmin@medi-waste.io');
      return { requiresOTP: true, email: 'superadmin@medi-waste.io' };
    }
    throw new Error('Invalid credentials');
  }
  
  // Check other users
  const found = demoUsers.find((u) => u.email === email.toLowerCase());
  if (!found || password.length < 6) {
    throw new Error('Invalid credentials');
  }
  
  // For other users, also require OTP
  await sendOTPEmail(found.email);
  return { requiresOTP: true, email: found.email };
};

export const loginWithOTP = async (email: string, otp: string): Promise<User> => {
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
