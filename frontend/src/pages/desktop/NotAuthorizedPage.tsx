import React from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { useAuth } from '../../hooks/useAuth';
import PageHeader from '../../components/layout/PageHeader';
import './notAuthorizedPage.css';
import '../desktop/dashboardPage.css';

export default function NotAuthorizedPage() {
  const { logout, permissions, permissionsLoading, permissionsReady } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as any)?.from as string | undefined;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  // If user has permissions and landed on /not-authorized directly (or from a stale redirect),
  // send them back to dashboard. If they were redirected here from a blocked route, keep the page.
  React.useEffect(() => {
    if (permissionsLoading || !permissionsReady) return;
    const perms = Array.isArray(permissions) ? permissions : [];
    if (perms.length === 0) return;

    if (!from || from === '/dashboard') {
      navigate('/dashboard', { replace: true });
    }
  }, [from, navigate, permissions, permissionsLoading, permissionsReady]);

  // Avoid a brief flash before redirect when we know we should go back.
  if (!permissionsLoading && permissionsReady) {
    const perms = Array.isArray(permissions) ? permissions : [];
    if (perms.length > 0 && (!from || from === '/dashboard')) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return (
    <div className="dashboard-page">
      <aside className={`dashboard-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          {!isSidebarCollapsed && <span className="brand-name">MEDI-WASTE</span>}
        </div>

        <button
          className="sidebar-toggle"
          onClick={() => setIsSidebarCollapsed((v) => !v)}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isSidebarCollapsed ? <polyline points="9 18 15 12 9 6"></polyline> : <polyline points="15 18 9 12 15 6"></polyline>}
          </svg>
        </button>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link to={item.path} className={`nav-link ${item.active ? 'nav-link--active' : ''}`}>
                  <span className="nav-icon">{item.icon}</span>
                  {!isSidebarCollapsed && <span className="nav-label">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <Link to="/profile" className={`sidebar-profile-btn ${location.pathname === '/profile' ? 'sidebar-profile-btn--active' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            {!isSidebarCollapsed && <span>Profile</span>}
          </Link>
          <button onClick={logout} className="sidebar-logout-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <PageHeader 
          title="Not Authorized"
          subtitle="You don't have permission to access this page"
        />

        <div className="dashboard-page-content" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div className="not-auth-page">
            <div className="not-auth-card">
              <div className="not-auth-title">Not authorized</div>
              <div className="not-auth-subtitle">You don’t have permission to access this page.</div>

              <div className="not-auth-meta">
                <div className="not-auth-meta-label">Requested</div>
                <div className="not-auth-meta-value">{from || location.pathname}</div>
              </div>

              <div className="not-auth-actions">
                <Link className="not-auth-btn not-auth-btn--primary" to="/dashboard">
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

