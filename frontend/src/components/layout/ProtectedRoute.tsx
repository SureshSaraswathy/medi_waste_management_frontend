import { Navigate, useLocation } from 'react-router-dom';
import { PropsWithChildren } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../context/AuthContext';

type Props = PropsWithChildren<{
  roles?: Array<User['roles'][number]>;
}>;

const ProtectedRoute = ({ roles, children }: Props) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !user.roles.some((r) => roles.includes(r))) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
