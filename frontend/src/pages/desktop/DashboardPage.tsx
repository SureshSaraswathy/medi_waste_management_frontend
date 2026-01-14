import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './dashboardPage.css';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [reportSubmenuOpen, setReportSubmenuOpen] = useState(
    location.pathname.startsWith('/report')
  );

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ), 
      active: location.pathname === '/dashboard' 
    },
    { 
      path: '/transaction', 
      label: 'Transaction', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      ), 
      active: location.pathname === '/transaction' || location.pathname.startsWith('/transaction')
    },
    { 
      path: '/finance', 
      label: 'Finance', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ), 
      active: location.pathname === '/finance' || location.pathname.startsWith('/finance')
    },
    { 
      path: '/commercial-agreements', 
      label: 'Commercial / Agreements', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ), 
      active: location.pathname === '/commercial-agreements' || location.pathname.startsWith('/commercial-agreements')
    },
    { 
      path: '/compliance-training', 
      label: 'Compliance & Training', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M9 15l2 2 4-4"></path>
        </svg>
      ), 
      active: location.pathname === '/compliance-training' || location.pathname.startsWith('/compliance-training')
    },
    { 
      path: '/master', 
      label: 'Master', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
        </svg>
      ), 
      active: location.pathname === '/master' || location.pathname.startsWith('/master')
    },
    { 
      path: '/report', 
      label: 'Report', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ), 
      active: location.pathname.startsWith('/report'),
      hasSubmenu: true,
      submenuItems: [
        { path: '/report/billing-finance', label: 'Billing & Finance Reports' },
        { path: '/report/operations-logistics', label: 'Operations & Logistics' },
        { path: '/report/hcf-compliance', label: 'HCF & Compliance' },
      ]
    },
  ];

  return (
    <div className="dashboard-page">
      {/* Left Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <span className="brand-name">MEDI-WASTE</span>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path} className={item.hasSubmenu ? 'nav-item--has-submenu' : ''}>
                {item.hasSubmenu ? (
                  <>
                    <button
                      onClick={() => setReportSubmenuOpen(!reportSubmenuOpen)}
                      className={`nav-link ${item.active ? 'nav-link--active' : ''}`}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-label">{item.label}</span>
                      <svg 
                        className={`nav-arrow ${reportSubmenuOpen ? 'nav-arrow--open' : ''}`}
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                    {item.submenuItems && (
                      <ul className={`nav-submenu ${reportSubmenuOpen ? 'nav-submenu--open' : ''}`}>
                        {item.submenuItems.map((subItem) => (
                          <li key={subItem.path}>
                            <Link
                              to={subItem.path}
                              className={`nav-submenu-link ${location.pathname === subItem.path ? 'nav-submenu-link--active' : ''}`}
                            >
                              {subItem.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    className={`nav-link ${item.active ? 'nav-link--active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </Link>
                )}
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
          <button onClick={logout} className="sidebar-logout-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Dashboard / Dashboard</span>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Key Metrics Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon metric-icon--blue">💰</div>
              <div className="metric-content">
                <p className="metric-label">Today's Money</p>
                <p className="metric-value">$53,000</p>
                <p className="metric-change metric-change--positive">+55%</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon metric-icon--blue">🚀</div>
              <div className="metric-content">
                <p className="metric-label">Today's Users</p>
                <p className="metric-value">2,300</p>
                <p className="metric-change metric-change--positive">+3%</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon metric-icon--blue">👥</div>
              <div className="metric-content">
                <p className="metric-label">New Clients</p>
                <p className="metric-value">+3,462</p>
                <p className="metric-change metric-change--negative">-2%</p>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon metric-icon--blue">🛒</div>
              <div className="metric-content">
                <p className="metric-label">Sales</p>
                <p className="metric-value">$103,430</p>
                <p className="metric-change metric-change--positive">+5%</p>
              </div>
            </div>
          </div>

          {/* Informational Cards */}
          <div className="info-cards-grid">
            <div className="info-card-large">
              <div className="info-card-content">
                <h3 className="info-card-title">Build by developers</h3>
                <h4 className="info-card-subtitle">MEDI-WASTE Dashboard</h4>
                <p className="info-card-text">
                  From colors, cards, typography to complex elements, you will find the full documentation.
                </p>
                <Link to="/docs" className="info-card-link">
                  Read More →
                </Link>
              </div>
              <div className="info-card-image">
                <div className="rocket-icon">🚀</div>
              </div>
            </div>

            <div className="info-card-large">
              <div className="info-card-content">
                <h3 className="info-card-title">Work with the rockets</h3>
                <p className="info-card-text">
                  Waste management is an evolutionarily recent positive-sum game. It is all about who take the opportunity first.
                </p>
                <Link to="/about" className="info-card-link">
                  Read More →
                </Link>
              </div>
              <div className="info-card-image">
                <div className="work-icon">💼</div>
              </div>
            </div>
          </div>

          {/* Charts and Data Visualization */}
          <div className="charts-grid">
            <div className="chart-card chart-card--dark">
              <h3 className="chart-title">Waste Categories</h3>
              <div className="bar-chart">
                {[65, 45, 80, 60, 75, 50, 90, 70, 55, 85].map((height, idx) => (
                  <div key={idx} className="bar" style={{ height: `${height}%` }}></div>
                ))}
              </div>
            </div>

            <div className="chart-card">
              <div className="chart-header">
                <h3 className="chart-title">Sales Overview</h3>
                <p className="chart-badge chart-badge--positive">↑4% more in 2024</p>
              </div>
              <div className="line-chart">
                <svg viewBox="0 0 300 150" className="chart-svg">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 120 Q 50 100, 100 80 T 200 60 T 300 40"
                    fill="url(#gradient)"
                    stroke="none"
                  />
                  <path
                    d="M 0 120 Q 50 100, 100 80 T 200 60 T 300 40"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                  <path
                    d="M 0 110 Q 50 90, 100 70 T 200 50 T 300 30"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Active Users Card */}
          <div className="active-users-card">
            <div className="active-users-header">
              <h3 className="active-users-title">Active Users</h3>
              <p className="active-users-badge">(+23%) than last week</p>
            </div>
            <div className="active-users-grid">
              <div className="active-user-item">
                <div className="user-item-icon user-item-icon--pink">👤</div>
                <div className="user-item-content">
                  <p className="user-item-label">Users</p>
                  <p className="user-item-value">36K</p>
                  <div className="user-item-progress">
                    <div className="progress-bar" style={{ width: '60%', backgroundColor: '#ec4899' }}></div>
                  </div>
                  <p className="user-item-percent">60%</p>
                </div>
              </div>

              <div className="active-user-item">
                <div className="user-item-icon user-item-icon--blue">🖱️</div>
                <div className="user-item-content">
                  <p className="user-item-label">Clicks</p>
                  <p className="user-item-value">2M</p>
                  <div className="user-item-progress">
                    <div className="progress-bar" style={{ width: '90%', backgroundColor: '#3b82f6' }}></div>
                  </div>
                  <p className="user-item-percent">90%</p>
                </div>
              </div>

              <div className="active-user-item">
                <div className="user-item-icon user-item-icon--orange">💰</div>
                <div className="user-item-content">
                  <p className="user-item-label">Sales</p>
                  <p className="user-item-value">$435</p>
                  <div className="user-item-progress">
                    <div className="progress-bar" style={{ width: '30%', backgroundColor: '#f97316' }}></div>
                  </div>
                  <p className="user-item-percent">30%</p>
                </div>
              </div>

              <div className="active-user-item">
                <div className="user-item-icon user-item-icon--purple">📦</div>
                <div className="user-item-content">
                  <p className="user-item-label">Items</p>
                  <p className="user-item-value">43</p>
                  <div className="user-item-progress">
                    <div className="progress-bar" style={{ width: '50%', backgroundColor: '#8b5cf6' }}></div>
                  </div>
                  <p className="user-item-percent">50%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
