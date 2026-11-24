/**
 * Dashboard Configuration Page
 * 
 * This page allows SuperAdmin to configure dashboard settings for different roles.
 * 
 * IMPORTANT NOTES:
 * - Dashboard Configuration screen is isolated from business logic
 * - This page is only accessible to SuperAdmin users
 * - The page renders inside the existing dashboard layout (sidebar + header remain visible)
 * - This is a placeholder page - configuration form will be implemented later
 */

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import DashboardConfigurationContent from './admin/dashboard-configuration/DashboardConfigurationContent';
import PageHeader from '../../components/layout/PageHeader';
import NotificationBell from '../../components/NotificationBell';
import './dashboardConfigurationPage.css';
import './dashboardPage.css';
import './masterPage.css';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { useEntitlements } from '../../context/EntitlementsContext';

const DashboardConfigurationPage: React.FC = () => {
  useEntitlements(); // re-render the sidebar when the customer's entitlements change
  const { permissions, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const isSuperAdminUser = permissions.includes('*');

  // Redirect if not SuperAdmin
  React.useEffect(() => {
    if (!isSuperAdminUser) {
      navigate('/dashboard', { replace: true, state: { from: location } });
    }
  }, [isSuperAdminUser, navigate, location]);

  if (!isSuperAdminUser) {
    return null; // Will redirect via useEffect
  }

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };


  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  return (
    <div className="dashboard-page">
      <aside className={`dashboard-sidebar sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <div className="logo-container">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            {!isSidebarCollapsed && (
              <div className="brand-text">
                <span className="brand-title">MEDI-WASTE</span>
                <span className="brand-subtitle">Enterprise Platform</span>
              </div>
            )}
          </div>

          <button
            className="toggle-button"
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              {isSidebarCollapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
            </svg>
          </button>
        </div>

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
          <NotificationBell variant="sidebar" />
          <Link
            to="/profile"
            className={`sidebar-profile-btn ${location.pathname === '/profile' ? 'sidebar-profile-btn--active' : ''}`}
            title="My Profile"
          >
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
          title="Dashboard Configuration"
          subtitle="Configure dashboard settings for different roles"
        />

        <div className="dashboard-page-content" style={{ padding: 0, overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>
          <div className="master-page dashboard-configuration-page">
            <div className="master-header">
              <div className="master-header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </div>
              <div className="master-title-section">
                <h1 className="master-title">Dashboard Configuration</h1>
                <p className="master-subtitle">Configure dashboard settings for different roles</p>
              </div>
            </div>
          </div>
          <DashboardConfigurationContent />
        </div>
      </main>
    </div>
  );
};

export default DashboardConfigurationPage;
