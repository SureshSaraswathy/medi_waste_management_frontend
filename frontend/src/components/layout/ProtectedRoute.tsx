import { Navigate, useLocation } from 'react-router-dom';
import { PropsWithChildren } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../context/AuthContext';

type Props = PropsWithChildren<{
  roles?: Array<User['roles'][number]>;
}>;

const ProtectedRoute = ({ roles, children }: Props) => {
  const { user, loading, permissions, permissionsLoading, permissionsReady } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  // Important: wait until permissions are loaded at least once for this token
  // to avoid redirecting to /not-authorized due to a transient permissions=[] state.
  if (loading || permissionsLoading || !permissionsReady) {
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

  // Global rule:
  // - If user has ZERO permissions, they should only see the Not Authorized page.
  // - This prevents "empty-role" users from landing on dashboard or other pages.
  const perms = Array.isArray(permissions) ? permissions : [];
  if (location.pathname !== '/not-authorized' && perms.length === 0) {
    return <Navigate to="/not-authorized" replace state={{ from: location.pathname }} />;
  }

  // Safety check: ensure user.roles is an array
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  
  if (roles && roles.length > 0 && !userRoles.some((r) => roles.includes(r))) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
