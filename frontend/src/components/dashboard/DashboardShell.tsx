/**
 * Dashboard Shell Component
 * 
 * Shared layout component that provides:
 * - Left sidebar (collapsible, responsive)
 * - Top header (app name, breadcrumb, role badge, notifications, profile)
 * - Main content area using responsive grid system
 * 
 * This component wraps all dashboard pages and ensures consistent layout.
 * Sidebar menu items are loaded dynamically based on role configuration.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { MenuItem, PreviewMode } from '../../types/dashboard';
import { dashboardService } from '../../services/dashboardService';
import { isSuperAdmin } from '../../services/permissionService';
import './dashboardShell.css';

interface DashboardShellProps {
  children?: React.ReactNode;
  previewMode?: PreviewMode;
  onExitPreview?: () => void;
}

// Icon mapping for menu items
const getMenuIcon = (iconName: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    dashboard: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    ),
    transaction: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
        <line x1="1" y1="10" x2="23" y2="10"></line>
      </svg>
    ),
    finance: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    ),
    commercial: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
    ),
    compliance: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    ),
    master: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
      </svg>
    ),
    report: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
    ),
  };

  return icons[iconName] || icons.dashboard;
};

export const DashboardShell: React.FC<DashboardShellProps> = ({
  children,
  previewMode,
  onExitPreview,
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubmenus, setExpandedSubmenus] = useState<Record<string, boolean>>({});

  // Determine current role (preview mode or actual user role)
  const currentRole = useMemo(() => {
    if (previewMode?.enabled && previewMode.previewRole) {
      return previewMode.previewRole;
    }
    return user?.roles?.[0] || 'viewer';
  }, [previewMode, user]);

  // Load menu items based on role with permission filtering
  useEffect(() => {
    const loadMenuItems = async () => {
      setLoading(true);
      try {
        const config = await dashboardService.getDashboardConfig(currentRole as any);
        
        // Get user overrides if available
        const userOverrides = user?.id
          ? await dashboardService.getUserOverrides(user.id)
          : null;

        // Compute final permissions and filtered menu items
        const computed = dashboardService.computePermissions(config, userOverrides);
        setMenuItems(computed.menuItems);
      } catch (error) {
        console.error('Failed to load menu items:', error);
        // Fallback to default menu from getDefaultDashboardConfig
        try {
          const defaultConfig = await dashboardService.getDashboardConfig(currentRole as any);
          setMenuItems(defaultConfig.menuItems);
        } catch {
          setMenuItems([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadMenuItems();
  }, [currentRole, user]);

  // Responsive sidebar behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Generate breadcrumb from current path
  const breadcrumb = useMemo(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts.length === 0) return '/ Dashboard';
    
    const breadcrumbParts = pathParts.map((part, index) => {
      const label = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
      return label;
    });
    
    return `/ ${breadcrumbParts.join(' / ')}`;
  }, [location.pathname]);

  // Toggle submenu expansion
  const toggleSubmenu = (menuId: string) => {
    setExpandedSubmenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  // Check if menu item or any child is active
  const isMenuItemActive = (item: MenuItem): boolean => {
    if (item.path === location.pathname) return true;
    if (location.pathname.startsWith(item.path) && item.path !== '/dashboard') return true;
    if (item.children) {
      return item.children.some(child => isMenuItemActive(child));
    }
    return false;
  };

  // Render menu item with submenu support
  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSubmenus[item.id];
    const isActive = isMenuItemActive(item);
    const isCurrentPath = location.pathname === item.path;

    return (
      <li key={item.id} className={`dashboard-shell__nav-item ${hasChildren ? 'has-children' : ''}`}>
        {hasChildren ? (
          <>
            <button
              className={`dashboard-shell__nav-link ${isActive ? 'active' : ''}`}
              onClick={() => toggleSubmenu(item.id)}
              style={{ paddingLeft: `${12 + level * 16}px` }}
            >
              <span className="dashboard-shell__nav-icon">{getMenuIcon(item.icon)}</span>
              {!isSidebarCollapsed && (
                <>
                  <span className="dashboard-shell__nav-label">{item.label}</span>
                  <svg 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2"
                    className={`dashboard-shell__submenu-arrow ${isExpanded ? 'expanded' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </>
              )}
            </button>
            {!isSidebarCollapsed && isExpanded && (
              <ul className="dashboard-shell__submenu">
                {item.children?.map(child => renderMenuItem(child, level + 1))}
              </ul>
            )}
          </>
        ) : isCurrentPath ? (
          // If already on this route, render as button (not clickable) to prevent navigation
          <button
            type="button"
            disabled
            className={`dashboard-shell__nav-link ${isActive ? 'active' : ''}`}
            style={{ 
              paddingLeft: `${12 + level * 16}px`, 
              cursor: 'default',
              background: 'none',
              border: 'none',
              width: '100%',
              textAlign: 'left'
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <span className="dashboard-shell__nav-icon">{getMenuIcon(item.icon)}</span>
            {!isSidebarCollapsed && <span className="dashboard-shell__nav-label">{item.label}</span>}
          </button>
        ) : (
          <Link
            to={item.path}
            replace={isCurrentPath}
            className={`dashboard-shell__nav-link ${isActive ? 'active' : ''}`}
            onClick={(e) => {
              if (isCurrentPath) {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }
              if (isMobile) {
                setIsMobileMenuOpen(false);
              }
            }}
            style={{ paddingLeft: `${12 + level * 16}px` }}
          >
            <span className="dashboard-shell__nav-icon">{getMenuIcon(item.icon)}</span>
            {!isSidebarCollapsed && <span className="dashboard-shell__nav-label">{item.label}</span>}
          </Link>
        )}
      </li>
    );
  };

  const isSuperAdminUser = isSuperAdmin(user);

  return (
    <div className="dashboard-shell">
      {/* Mobile Hamburger Button */}
      {isMobile && (
        <button
          className="dashboard-shell__mobile-toggle"
          onClick={handleMobileMenuToggle}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      )}

      {/* Mobile Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="dashboard-shell__mobile-overlay"
          onClick={handleMobileMenuToggle}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`dashboard-shell__sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobile && isMobileMenuOpen ? 'open' : ''}`}
      >
        <div className="dashboard-shell__sidebar-brand">
          <div className="dashboard-shell__brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          {!isSidebarCollapsed && <span className="dashboard-shell__brand-name">MEDI-WASTE</span>}
        </div>

        {!isMobile && (
          <button
            className="dashboard-shell__sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isSidebarCollapsed ? (
                <polyline points="9 18 15 12 9 6"></polyline>
              ) : (
                <polyline points="15 18 9 12 15 6"></polyline>
              )}
            </svg>
          </button>
        )}

        <nav className="dashboard-shell__sidebar-nav">
          {loading ? (
            <div className="dashboard-shell__loading-menu">
              <div className="skeleton-menu-item"></div>
              <div className="skeleton-menu-item"></div>
              <div className="skeleton-menu-item"></div>
            </div>
          ) : (
            <ul className="dashboard-shell__nav-list">
              {menuItems.map((item) => renderMenuItem(item))}
            </ul>
          )}
        </nav>

        <div className="dashboard-shell__sidebar-footer">
          <Link
            to="/profile"
            className={`dashboard-shell__sidebar-profile ${location.pathname === '/profile' ? 'active' : ''}`}
            title="My Profile"
            onClick={() => isMobile && setIsMobileMenuOpen(false)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            {!isSidebarCollapsed && <span>Profile</span>}
          </Link>
          <button onClick={logout} className="dashboard-shell__sidebar-logout">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-shell__main">
        {/* Top Header */}
        <header className="dashboard-shell__header">
          <div className="dashboard-shell__header-left">
            {/* Person icon + MEDI-WASTE */}
            <div className="dashboard-shell__header-brand">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>MEDI-WASTE</span>
            </div>
            {/* Breadcrumb */}
            <span className="dashboard-shell__breadcrumb">{breadcrumb}</span>
          </div>
          <div className="dashboard-shell__header-right">
            {/* Preview Mode Banner (for SuperAdmin) */}
            {previewMode?.enabled && (
              <div className="dashboard-shell__preview-banner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>Preview Mode: {previewMode.previewRole}</span>
                {onExitPreview && (
                  <button
                    className="dashboard-shell__exit-preview-btn"
                    onClick={onExitPreview}
                  >
                    Exit Preview
                  </button>
                )}
              </div>
            )}

            {/* Role Badge */}
            <div className="dashboard-shell__role-badge">
              <span>{currentRole}</span>
            </div>

            {/* Notifications */}
            <button className="dashboard-shell__notification-btn" aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span className="dashboard-shell__notification-badge">3</span>
            </button>

            {/* Profile */}
            <div className="dashboard-shell__profile">
              <div className="dashboard-shell__profile-avatar">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              {!isMobile && <span className="dashboard-shell__profile-name">{user?.name || 'User'}</span>}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="dashboard-shell__content">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
};

export default DashboardShell;
