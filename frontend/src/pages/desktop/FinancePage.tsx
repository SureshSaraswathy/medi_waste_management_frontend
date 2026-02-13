import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDesktopSidebarNavItems } from '../../utils/desktopSidebarNav';
import { hasPermission } from '../../services/permissionService';
import './masterPage.css';
import '../desktop/dashboardPage.css';

const FinancePage = () => {
  const { logout, permissions } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const financeItems = [
    {
      id: 'invoice-management',
      title: 'Invoice Management',
      description: 'Create, manage and track invoices',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
      path: '/finance/invoice-management',
    },
    {
      id: 'receipt-management',
      title: 'Receipt Management',
      description: 'Generate and manage payment receipts',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ),
      path: '/finance/receipt-management',
    },
    {
      id: 'financial-balance-summary',
      title: 'Financial Balance Summary',
      description: 'View financial balance and summary reports',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ),
      path: '/finance/financial-balance-summary',
    },
  ];

  // UI-only: hide cards the user cannot access (prevents clutter from disabled cards).
  // Permission logic remains unchanged; backend still enforces authorization.
  const financeItemPermissionById: Record<string, string[]> = {
    'invoice-management': ['INVOICE_VIEW', 'INVOICE_CREATE', 'INVOICE_UPDATE', 'INVOICE_DELETE'],
    // Backend guards for receipt/balance pages use INVOICE_* in this codebase.
    'receipt-management': ['INVOICE_VIEW', 'INVOICE_CREATE'],
    'financial-balance-summary': ['INVOICE_VIEW', 'INVOICE_CREATE'],
  };

  const canSeeFinanceCard = (itemId: string) => {
    const perms = Array.isArray(permissions) ? permissions : [];
    if (perms.includes('*')) return true;
    const reqs = financeItemPermissionById[itemId] || [];
    return reqs.some((p) => hasPermission(perms, p));
  };

  const filteredItems = financeItems
    .filter((item) => canSeeFinanceCard(item.id))
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
            <span className="breadcrumb">/ Dashboard / Finance</span>
          </div>
        </header>

        {/* Finance Page Content */}
        <div className="master-page">
          <div className="master-header">
            <div className="master-title-section">
              <h1 className="master-title">Finance</h1>
              <p className="master-subtitle">Manage your financial operations at one place</p>
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
                No finance modules available for your permissions.
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

export default FinancePage;
