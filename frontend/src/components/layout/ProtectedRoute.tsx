import { Navigate, useLocation } from 'react-router-dom';
import { PropsWithChildren } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../context/AuthContext';

type Props = PropsWithChildren<{
  roles?: Array<User['roles'][number]>;
}>;

const ProtectedRoute = ({ roles, children }: Props) => {
  const { user, loading, permissions, permissionsLoaded } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #2d3748',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ color: '#666', fontSize: '14px' }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Wait for permissions to load to avoid incorrectly redirecting users who DO have access.
  if (!permissionsLoaded) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p style={{ color: '#666', fontSize: '14px' }}>Loading permissions...</p>
      </div>
    );
  }

  // No-access routing:
  // If the user has no mapped permissions (and is not SUPER_ADMIN), force them to the Dashboard page.
  // Dashboard will show a "no permissions assigned" message inside the normal layout.
  // Allowed pages in no-access mode: /dashboard, /profile (logout is a button).
  const isSuperAdmin = Array.isArray(permissions) && permissions.includes('*');
  const hasAnyPermission = Array.isArray(permissions) && permissions.length > 0;
  const noAccessMode = !isSuperAdmin && !hasAnyPermission;

  if (noAccessMode) {
    const allowed = location.pathname === '/dashboard' || location.pathname === '/profile';
    if (!allowed) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Safety check: ensure user.roles is an array
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  
  if (roles && roles.length > 0 && !userRoles.some((r) => roles.includes(r))) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
