import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { loginRequest, registerUserRequest, sendOTPEmail, loginWithOTP } from '../services/authService';

type Role = 'admin' | 'manager' | 'staff' | 'viewer';

export type User = {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  token: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ requiresOTP: boolean; email?: string }>;
  sendOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  logout: () => void;
  createUser: (payload: {
    name: string;
    email: string;
    password: string;
    role: Role;
  }) => Promise<User>;
  hasRole: (roles: Role | Role[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'mw-auth-user';

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const persist = useCallback((next: User | null) => {
    setUser(next);
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await loginRequest(email, password);
      if (result.requiresOTP) {
        // Use the normalized email from result, not the input email
        return { requiresOTP: true, email: result.email };
      }
      if (result.user) {
        persist(result.user);
        return { requiresOTP: false };
      }
      throw new Error('Login failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendOTP = useCallback(async (email: string) => {
    setLoading(true);
    try {
      await sendOTPEmail(email);
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOTP = useCallback(async (email: string, otp: string) => {
    setLoading(true);
    try {
      const authenticated = await loginWithOTP(email, otp);
      persist(authenticated);
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const logout = useCallback(() => {
    persist(null);
  }, [persist]);

  const createUser = useCallback(
    async (payload: { name: string; email: string; password: string; role: Role }) => {
      if (!user) {
        throw new Error('Unauthorized');
      }
      setLoading(true);
      try {
        return await registerUserRequest(payload, user.token);
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const hasRole = useCallback(
    (roles: Role | Role[]) => {
      const desired = Array.isArray(roles) ? roles : [roles];
      return Boolean(user?.roles.some((role) => desired.includes(role)));
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, sendOTP, verifyOTP, logout, createUser, hasRole }),
    [user, loading, login, sendOTP, verifyOTP, logout, createUser, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return ctx;
};
