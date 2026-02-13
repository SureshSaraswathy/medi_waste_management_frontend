import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { hasPermission } from '../../services/permissionService';
import './masterPage.css';
import '../desktop/dashboardPage.css';

const ComplianceTrainingPage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const complianceTrainingItems = [
    {
      id: 'training-certificate-management',
      title: 'Training Certificate Management',
      description: 'Manage training certificates and certifications',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M9 15l2 2 4-4"></path>
        </svg>
      ),
      path: '/compliance-training/training-certificate-management',
    },
  ];

  // UI-only: hide cards the user cannot access (prevents clutter from disabled cards).
  const complianceItemPermissionById: Record<string, string[]> = {
    'training-certificate-management': [
      'TRAINING_CERTIFICATE_VIEW',
      'TRAINING_CERTIFICATE_CREATE',
      'TRAINING_CERTIFICATE_EDIT',
      'TRAINING_CERTIFICATE_DELETE',
    ],
  };

  const canSeeComplianceCard = (itemId: string) => {
    const perms = Array.isArray(permissions) ? permissions : [];
    if (perms.includes('*')) return true;
    const reqs = complianceItemPermissionById[itemId] || [];
    return reqs.some((p) => hasPermission(perms, p));
  };

  const filteredItems = complianceTrainingItems
    .filter((item) => canSeeComplianceCard(item.id))
    .filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );

  // Fix: use shared permission-filtered sidebar nav (prevents unauthorized menus from showing/clicking)
  const navItems = getDesktopSidebarNavItems(permissions, location.pathname);

  return (
    <div className="dashboard-page">
      {/* Left Sidebar */}
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
                <Link
                  to={item.path}
                  className={`nav-link ${item.active ? 'nav-link--active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!isSidebarCollapsed && <span className="nav-label">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-notification-btn" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="notification-badge">3</span>
          </button>
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

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Dashboard / Compliance & Training</span>
          </div>
        </header>

        {/* Compliance & Training Page Content */}
        <div className="master-page">
          <div className="master-header">
            <div className="master-title-section">
              <h1 className="master-title">Compliance & Training</h1>
              <p className="master-subtitle">Manage your compliance and training at one place</p>
            </div>
          </div>

          <div className="master-search-section">
            <div className="master-search-box">
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="master-search-input"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="master-grid">
            {filteredItems.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 13, padding: '8px 4px' }}>
                No compliance modules available for your permissions.
              </div>
            ) : (
              filteredItems.map((item) => (
                <Link key={item.id} to={item.path} className="master-card">
                  <div className="master-card-icon">{item.icon}</div>
                  <h3 className="master-card-title">{item.title}</h3>
                  <p className="master-card-description">{item.description}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComplianceTrainingPage;
