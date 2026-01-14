import { PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './appShell.css';

const AppShell = ({ children }: PropsWithChildren) => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <Link to="/" className="brand">
          MediWaste
          <span className="brand__tag">Control</span>
        </Link>
        <nav className="app-shell__nav">
          {user ? (
            <>
              <span className="nav__user">
                {user.name}
                <small>{user.roles.join(', ')}</small>
              </span>
              <Link to="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>
                Dashboard
              </Link>
              <button className="ghost logout-btn" onClick={logout} type="button">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={pathname.startsWith('/login') ? 'active' : ''}>
                Login
              </Link>
              <Link
                to="/users/new"
                className={pathname.startsWith('/users') ? 'active' : ''}
              >
                Create User
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="app-shell__body">{children}</main>
    </div>
  );
};

export default AppShell;
