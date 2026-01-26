import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchMenuConfig, canAccessMenu, MenuConfig } from '../../services/permissionService';
import './sidebar.css';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  hasSubmenu?: boolean;
  submenuItems?: { path: string; label: string }[];
}

interface SidebarProps {
  onLogout: () => void;
}

const Sidebar = ({ onLogout }: SidebarProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const [menuConfig, setMenuConfig] = useState<MenuConfig | null>(null);
  const [reportSubmenuOpen, setReportSubmenuOpen] = useState(
    location.pathname.startsWith('/report')
  );
  const [masterSubmenuOpen, setMasterSubmenuOpen] = useState(
    location.pathname.startsWith('/master')
  );

  useEffect(() => {
    const loadMenuConfig = async () => {
      if (user?.token) {
        const config = await fetchMenuConfig(user.token);
        setMenuConfig(config);
      }
    };

    loadMenuConfig();
  }, [user]);

  useEffect(() => {
    setReportSubmenuOpen(location.pathname.startsWith('/report'));
    setMasterSubmenuOpen(location.pathname.startsWith('/master'));
  }, [location.pathname]);

  // Build navigation items based on menu config
  const buildNavItems = (): NavItem[] => {
    const items: NavItem[] = [];

    // Dashboard
    if (!menuConfig || canAccessMenu(menuConfig, 'dashboard')) {
      items.push({
        path: '/dashboard',
        label: 'Dashboard',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        ),
        active: location.pathname === '/dashboard',
      });
    }

    // Transaction
    if (!menuConfig || canAccessMenu(menuConfig, 'transaction')) {
      items.push({
        path: '/transaction',
        label: 'Transaction',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
        ),
        active: location.pathname === '/transaction' || location.pathname.startsWith('/transaction'),
      });
    }

    // Finance
    if (!menuConfig || canAccessMenu(menuConfig, 'finance')) {
      items.push({
        path: '/finance',
        label: 'Finance',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        ),
        active: location.pathname === '/finance' || location.pathname.startsWith('/finance'),
      });
    }

    // Commercial / Agreements
    if (!menuConfig || canAccessMenu(menuConfig, 'commercialAgreements')) {
      items.push({
        path: '/commercial-agreements',
        label: 'Commercial / Agreements',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        ),
        active: location.pathname === '/commercial-agreements' || location.pathname.startsWith('/commercial-agreements'),
      });
    }

    // Compliance & Training
    if (!menuConfig || canAccessMenu(menuConfig, 'complianceTraining')) {
      items.push({
        path: '/compliance-training',
        label: 'Compliance & Training',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
        ),
        active: location.pathname === '/compliance-training' || location.pathname.startsWith('/compliance-training'),
      });
    }

    // Master (with submenu)
    if (!menuConfig || canAccessMenu(menuConfig, 'master')) {
      const masterSubmenus: { path: string; label: string }[] = [];
      
      if (!menuConfig || canAccessMenu(menuConfig, 'master', 'company')) {
        masterSubmenus.push({ path: '/master/company', label: 'Company Master' });
      }
      if (!menuConfig || canAccessMenu(menuConfig, 'master', 'state')) {
        masterSubmenus.push({ path: '/master/state', label: 'State Master' });
      }
      if (!menuConfig || canAccessMenu(menuConfig, 'master', 'area')) {
        masterSubmenus.push({ path: '/master/area', label: 'Area Master' });
      }
      if (!menuConfig || canAccessMenu(menuConfig, 'master', 'category')) {
        masterSubmenus.push({ path: '/master/category', label: 'Category Master' });
      }
      if (!menuConfig || canAccessMenu(menuConfig, 'master', 'color')) {
        masterSubmenus.push({ path: '/master/color', label: 'Color Master' });
      }
      if (!menuConfig || canAccessMenu(menuConfig, 'master', 'pcbZone')) {
        masterSubmenus.push({ path: '/master/pcb-zone', label: 'PCB Zone Master' });
      }
      if (!menuConfig || canAccessMenu(menuConfig, 'master', 'frequency')) {
        masterSubmenus.push({ path: '/master/frequency', label: 'Frequency Master' });
      }
      if (!menuConfig || canAccessMenu(menuConfig, 'master', 'hcfType')) {
        masterSubmenus.push({ path: '/master/hcf-type', label: 'HCF Type Master' });
      }
      if (!menuConfig || canAccessMenu(menuConfig, 'master', 'hcf')) {
        masterSubmenus.push({ path: '/master/hcf', label: 'HCF Master' });
      }
      if (!menuConfig || canAccessMenu(menuConfig, 'master', 'route')) {
        masterSubmenus.push({ path: '/master/route', label: 'Route Master' });
      }
      if (!menuConfig || canAccessMenu(menuConfig, 'master', 'fleet')) {
        masterSubmenus.push({ path: '/master/fleet', label: 'Fleet Management' });
      }
      if (!menuConfig || canAccessMenu(menuConfig, 'master', 'routeHcfMapping')) {
        masterSubmenus.push({ path: '/master/route-hcf-mapping', label: 'Route-HCF Mapping' });
      }

      if (masterSubmenus.length > 0) {
        items.push({
          path: '/master',
          label: 'Master',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
            </svg>
          ),
          active: location.pathname === '/master' || location.pathname.startsWith('/master'),
          hasSubmenu: true,
          submenuItems: masterSubmenus,
        });
      }
    }

    // Report (with submenu)
    if (!menuConfig || canAccessMenu(menuConfig, 'report')) {
      items.push({
        path: '/report',
        label: 'Report',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        ],
      });
    }

    return items;
  };

  const navItems = buildNavItems();

  return (
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
                    className={`nav-link ${item.active ? 'nav-link--active' : ''}`}
                    onClick={() => {
                      if (item.path === '/report') {
                        setReportSubmenuOpen(!reportSubmenuOpen);
                      } else if (item.path === '/master') {
                        setMasterSubmenuOpen(!masterSubmenuOpen);
                      }
                    }}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`submenu-arrow ${
                        (item.path === '/report' && reportSubmenuOpen) ||
                        (item.path === '/master' && masterSubmenuOpen)
                          ? 'submenu-arrow--open'
                          : ''
                      }`}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  {item.submenuItems && (
                    <ul
                      className={`submenu ${
                        (item.path === '/report' && reportSubmenuOpen) ||
                        (item.path === '/master' && masterSubmenuOpen)
                          ? 'submenu--open'
                          : ''
                      }`}
                    >
                      {item.submenuItems.map((subItem) => (
                        <li key={subItem.path}>
                          <Link
                            to={subItem.path}
                            className={`submenu-link ${
                              location.pathname === subItem.path ? 'submenu-link--active' : ''
                            }`}
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
        <div className="sidebar-user">
          <div className="user-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-role">{user?.roles?.[0] || 'User'}</div>
          </div>
        </div>
        <Link to="/profile" className="sidebar-profile-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          Profile
        </Link>
        <button className="sidebar-logout-btn" onClick={onLogout}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
