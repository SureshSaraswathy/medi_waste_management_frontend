import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission } from '../../services/permissionService';

type Props = {
  anyOf: string[];
  children: React.ReactNode;
};

/**
 * Frontend permission gate (UI-only):
 * - Does NOT change backend authorization (backend remains source of truth).
 * - Prevents rendering pages when user lacks permissions and redirects to Not Authorized.
 */
export default function RequireAnyPermission({ anyOf, children }: Props) {
  const { permissions } = useAuth();
  const location = useLocation();

  const perms = Array.isArray(permissions) ? permissions : [];
  if (perms.includes('*')) return <>{children}</>;

  const ok = anyOf.some((p) => hasPermission(perms, p));
  if (!ok) {
    return <Navigate to="/not-authorized" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

