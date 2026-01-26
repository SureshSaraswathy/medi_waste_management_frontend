import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchMenuConfig, canAccessMenu, MenuConfig } from '../../services/permissionService';
import './mobileSideDrawer.css';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  permission?: string;
  children?: MenuItem[];
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

interface MobileSideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileSideDrawer: React.FC<MobileSideDrawerProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [menuConfig, setMenuConfig] = useState<MenuConfig | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Load menu config for role-based visibility
  useEffect(() => {
    const loadMenuConfig = async () => {
      if (user?.token) {
        const config = await fetchMenuConfig(user.token);
        setMenuConfig(config);
      }
    };
    loadMenuConfig();
  }, [user]);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.name) {
      const names = user.name.split(' ');
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.name.substring(0, 2).toUpperCase();
    }
    return 'MW';
  };

  // Menu items grouped by category
  const menuGroups: MenuGroup[] = [
    {
      title: 'Operations',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          ),
          path: '/dashboard',
          permission: 'HOME_VIEW',
        },
        {
          id: 'waste-collection',
          label: 'Waste Collection',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          ),
          path: '/mobile/waste-entry',
          permission: 'WASTE_COLLECTION_CREATE',
        },
        {
          id: 'route-assignment',
          label: 'Route Assignment',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          ),
          path: '/mobile/assign-hospital',
          permission: 'ROUTE_ASSIGNMENT_VIEW',
        },
        {
          id: 'scan',
          label: 'Scan Barcode',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12v3a2 2 0 0 1-2 2h-3"></path>
              <path d="M3 12V9a2 2 0 0 1 2-2h3"></path>
              <path d="M21 12H3"></path>
              <path d="M12 21v-9"></path>
              <path d="M12 3v9"></path>
            </svg>
          ),
          path: '/mobile/scan',
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
              <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
            </svg>
          ),
          path: '/report',
          permission: 'REPORT_VIEW',
        },
      ],
    },
    {
      title: 'Admin',
      items: [
        {
          id: 'hcf-master',
          label: 'HCF Master',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          ),
          path: '/mobile/hcf-master',
          permission: 'HCF_VIEW',
        },
        {
          id: 'users',
          label: 'User Management',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          ),
          path: '/users',
          permission: 'USER_VIEW',
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
            </svg>
          ),
          path: '/mobile/settings',
        },
      ],
    },
  ];

  // Check if item should be visible
  const isItemVisible = (item: MenuItem): boolean => {
    // Check permission if specified
    if (item.permission && menuConfig) {
      if (item.permission.includes('ROUTE_ASSIGNMENT')) {
        return canAccessMenu(menuConfig, 'transaction');
      }
      if (item.permission.includes('WASTE_COLLECTION')) {
        return canAccessMenu(menuConfig, 'transaction');
      }
      if (item.permission.includes('HCF')) {
        return canAccessMenu(menuConfig, 'master', 'hcf');
      }
      if (item.permission.includes('USER')) {
        return canAccessMenu(menuConfig, 'master');
      }
      if (item.permission.includes('REPORT')) {
        return canAccessMenu(menuConfig, 'report');
      }
    }
    
    // If no menu config, show all (fallback)
    if (!menuConfig) return true;
    
    // Default: show if no specific permission check
    return true;
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.children && item.children.length > 0) {
      // Toggle expand/collapse for nested items
      const newExpanded = new Set(expandedItems);
      if (newExpanded.has(item.id)) {
        newExpanded.delete(item.id);
      } else {
        newExpanded.add(item.id);
      }
      setExpandedItems(newExpanded);
    } else if (item.path) {
      navigate(item.path);
      onClose();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/mobile/login');
    onClose();
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Prevent body scroll when drawer is open and add class to hide bottom nav
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('drawer-open');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('drawer-open');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('drawer-open');
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="mobile-drawer-overlay" onClick={onClose}></div>
      )}

      {/* Drawer */}
      <div className={`mobile-drawer ${isOpen ? 'mobile-drawer--open' : ''}`}>
        {/* Header */}
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-profile">
            <div className="mobile-drawer-avatar">
              {getUserInitials()}
            </div>
            <div className="mobile-drawer-profile-info">
              <div className="mobile-drawer-profile-name">Medi Waste</div>
              <div className="mobile-drawer-profile-role">Waste Management</div>
            </div>
          </div>
          <button className="mobile-drawer-close" onClick={onClose} aria-label="Close menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Menu Groups */}
        <div className="mobile-drawer-content">
          {menuGroups.map((group) => {
            const visibleItems = group.items.filter(isItemVisible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="mobile-drawer-group">
                <div className="mobile-drawer-group-title">{group.title}</div>
                {visibleItems.map((item) => {
                  const hasChildren = item.children && item.children.length > 0;
                  const isExpanded = expandedItems.has(item.id);
                  const itemActive = isActive(item.path);

                  return (
                    <div key={item.id}>
                      <button
                        className={`mobile-drawer-item ${itemActive ? 'mobile-drawer-item--active' : ''}`}
                        onClick={() => handleItemClick(item)}
                      >
                        <span className="mobile-drawer-item-icon">{item.icon}</span>
                        <span className="mobile-drawer-item-label">{item.label}</span>
                        {hasChildren && (
                          <svg
                            className={`mobile-drawer-item-chevron ${isExpanded ? 'mobile-drawer-item-chevron--expanded' : ''}`}
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        )}
                      </button>
                      {hasChildren && isExpanded && (
                        <div className="mobile-drawer-submenu">
                          {item.children!.map((child) => (
                            <button
                              key={child.id}
                              className={`mobile-drawer-item mobile-drawer-item--sub ${isActive(child.path) ? 'mobile-drawer-item--active' : ''}`}
                              onClick={() => handleItemClick(child)}
                            >
                              <span className="mobile-drawer-item-icon">{child.icon}</span>
                              <span className="mobile-drawer-item-label">{child.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Logout Section */}
        <div className="mobile-drawer-footer">
          <button className="mobile-drawer-item mobile-drawer-item--logout" onClick={handleLogout}>
            <svg className="mobile-drawer-item-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span className="mobile-drawer-item-label">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default MobileSideDrawer;
