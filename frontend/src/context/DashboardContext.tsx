/**
 * Dashboard Context
 * 
 * Provides dashboard state management including:
 * - Preview mode (for SuperAdmin)
 * - Permission overrides
 * - Current role context
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PreviewMode, Role } from '../types/dashboard';
import { User } from './AuthContext';

interface DashboardContextValue {
  previewMode: PreviewMode;
  setPreviewMode: (mode: PreviewMode) => void;
  startPreview: (role: Role, originalRole: Role) => void;
  exitPreview: () => void;
  isPreviewMode: boolean;
  currentRole: Role;
  user: User | null;
}

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

interface DashboardProviderProps {
  children: ReactNode;
  user: User | null;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({ children, user }) => {
  const [previewMode, setPreviewModeState] = useState<PreviewMode>({
    enabled: false,
    previewRole: null,
    originalRole: (user?.roles?.[0] as Role) || 'viewer',
  });

  const setPreviewMode = useCallback((mode: PreviewMode) => {
    setPreviewModeState(mode);
  }, []);

  const startPreview = useCallback((role: Role, originalRole: Role) => {
    setPreviewModeState({
      enabled: true,
      previewRole: role,
      originalRole,
    });
  }, []);

  const exitPreview = useCallback(() => {
    setPreviewModeState((prev) => ({
      enabled: false,
      previewRole: null,
      originalRole: prev.originalRole,
    }));
  }, []);

  const isPreviewMode = previewMode.enabled;
  const currentRole = previewMode.enabled && previewMode.previewRole
    ? previewMode.previewRole
    : ((user?.roles?.[0] as Role) || 'viewer');

  const value: DashboardContextValue = {
    previewMode,
    setPreviewMode,
    startPreview,
    exitPreview,
    isPreviewMode,
    currentRole,
    user,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};
