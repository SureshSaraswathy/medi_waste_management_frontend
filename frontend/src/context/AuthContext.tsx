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
import { fetchUserPermissions } from '../services/permissionService';

type Role = 'admin' | 'manager' | 'staff' | 'viewer' | 'superadmin';

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
  permissions: string[];
  permissionsLoaded: boolean;
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
const PERMISSIONS_STORAGE_KEY = 'mw-auth-permissions';

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start with true to check localStorage
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUserFromStorage = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const storedUser = JSON.parse(raw);
          // Validate that stored user has required fields and token is valid
          if (storedUser && storedUser.id && storedUser.token && storedUser.token.trim() !== '') {
            // Additional validation: check if token looks valid (JWT tokens have 3 parts)
            const tokenParts = storedUser.token.split('.');
            if (tokenParts.length === 3) {
              setUser(storedUser);
              // Load cached permissions if any (additive; safe fallback to empty)
              try {
                const rawPerms = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
                if (rawPerms) setPermissions(JSON.parse(rawPerms) || []);
              } catch {
                setPermissions([]);
              }
            } else {
              // Invalid token format, remove user data
              console.warn('Invalid token format in storage');
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
              setUser(null);
              setPermissions([]);
              setPermissionsLoaded(true);
            }
          } else {
            // Invalid user data, remove it
            console.warn('Invalid user data in storage');
            localStorage.removeItem(STORAGE_KEY);
            setUser(null);
            localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
            setPermissions([]);
            setPermissionsLoaded(true);
          }
        } else {
          setUser(null);
          setPermissions([]);
          setPermissionsLoaded(true);
        }
      } catch (error) {
        console.error('Error loading user from storage:', error);
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
        localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
        setPermissions([]);
        setPermissionsLoaded(true);
      } finally {
        setLoading(false);
      }
    };

    loadUserFromStorage();
  }, []);

  const persist = useCallback((next: User | null) => {
    setUser(next);
    if (next) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.error('Error saving user to storage:', error);
      }
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('Error removing user from storage:', error);
      }
      try {
        localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
      } catch {
        // ignore
      }
      setPermissions([]);
    }
  }, []);

  // Fetch permissions for the logged-in user (additive, non-breaking).
  useEffect(() => {
    const loadPermissions = async () => {
      if (!user?.token) {
        setPermissions([]);
        setPermissionsLoaded(true);
        return;
      }
      try {
        const perms = await fetchUserPermissions(user.token);
        setPermissions(perms || []);
        try {
          localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(perms || []));
        } catch {
          // ignore
        }
      } catch {
        // Keep previous permissions if fetch fails, but don't block the app.
      } finally {
        setPermissionsLoaded(true);
      }
    };
    loadPermissions();
  }, [user?.token]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await loginRequest(email, password);
      if (result.requiresOTP) {
        // If a previous session user exists in storage, LoginPage's "already logged in" effect
        // can immediately redirect to /dashboard and skip the OTP UI.
        // Clear any persisted user before starting the OTP flow.
        persist(null);
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
  }, [persist]);

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
    () => ({ user, loading, permissions, permissionsLoaded, login, sendOTP, verifyOTP, logout, createUser, hasRole }),
    [user, loading, permissions, permissionsLoaded, login, sendOTP, verifyOTP, logout, createUser, hasRole],
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
