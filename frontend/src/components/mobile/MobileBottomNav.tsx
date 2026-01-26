import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { fetchMenuConfig, canAccessMenu, MenuConfig } from '../../services/permissionService';
import './mobileBottomNav.css';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  permission?: string;
  scanButton?: boolean;
}

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [menuConfig, setMenuConfig] = useState<MenuConfig | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  // Navigation items - Only Home, Scan, and More in bottom nav
  const navItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ),
      path: '/mobile/home',
      permission: 'HOME_VIEW',
    },
    {
      id: 'scan',
      label: 'Scan',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12v3a2 2 0 0 1-2 2h-3"></path>
          <path d="M3 12V9a2 2 0 0 1 2-2h3"></path>
          <path d="M21 12H3"></path>
          <path d="M12 21v-9"></path>
          <path d="M12 3v9"></path>
        </svg>
      ),
      path: '/mobile/scan',
      scanButton: true,
    },
    {
      id: 'more',
      label: 'More',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      ),
      path: '#',
    },
  ];

  // Check if item should be visible
  const isItemVisible = (item: NavItem): boolean => {
    // Scan button is always visible
    if (item.scanButton) return true;
    
    // More button is always visible
    if (item.id === 'more') return true;
    
    // Home is always visible
    if (item.id === 'home') return true;
    
    // Check permission if specified
    if (item.permission && menuConfig) {
      // Map permission to menu config
      if (item.permission.includes('ROUTE_ASSIGNMENT')) {
        return canAccessMenu(menuConfig, 'transaction');
      }
      if (item.permission.includes('WASTE_COLLECTION')) {
        return canAccessMenu(menuConfig, 'transaction');
      }
      if (item.permission.includes('HCF')) {
        return canAccessMenu(menuConfig, 'master', 'hcf');
      }
    }
    
    // If no menu config, show all (fallback)
    if (!menuConfig) return true;
    
    // Default: show if no specific permission check
    return true;
  };

  const handleNavClick = (item: NavItem) => {
    if (item.id === 'more') {
      setShowMoreMenu(!showMoreMenu);
      return;
    }
    if (item.path && item.path !== '#') {
      navigate(item.path);
      setShowMoreMenu(false);
    }
  };

  const handleScan = () => {
    navigate('/mobile/scan');
    setShowMoreMenu(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/mobile/login');
    setShowMoreMenu(false);
  };

  const visibleItems = navItems.filter(isItemVisible);
  const homeItem = visibleItems.find(item => item.id === 'home');
  const scanItem = visibleItems.find(item => item.scanButton);
  const moreItem = visibleItems.find(item => item.id === 'more');

  return (
    <>
      {/* More Menu Overlay */}
      {showMoreMenu && (
        <div className="mobile-more-overlay" onClick={() => setShowMoreMenu(false)}>
          <div className="mobile-more-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-more-header">
              <h3>More Options</h3>
              <button className="mobile-more-close" onClick={() => setShowMoreMenu(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="mobile-more-content">
              <button className="mobile-more-item" onClick={() => { navigate('/mobile/assign-hospital'); setShowMoreMenu(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>Assign Hospital</span>
              </button>
              <button className="mobile-more-item" onClick={() => { navigate('/mobile/waste-entry'); setShowMoreMenu(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <span>Waste Entry</span>
              </button>
              <button className="mobile-more-item" onClick={() => { navigate('/mobile/hcf-master'); setShowMoreMenu(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>HCF Master</span>
              </button>
              <button className="mobile-more-item" onClick={() => { navigate('/mobile/profile'); setShowMoreMenu(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Profile</span>
              </button>
              <button className="mobile-more-item" onClick={() => { navigate('/mobile/settings'); setShowMoreMenu(false); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
                </svg>
                <span>Settings</span>
              </button>
              <button className="mobile-more-item mobile-more-item--logout" onClick={handleLogout}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar - Only Home, Scan, More */}
      <nav className="mobile-bottom-nav">
        {/* Home Button */}
        {homeItem && (
          <button
            className={`mobile-nav-item ${location.pathname === homeItem.path ? 'mobile-nav-item--active' : ''}`}
            onClick={() => handleNavClick(homeItem)}
            aria-label="Home"
          >
            <span className="mobile-nav-icon">{homeItem.icon}</span>
            <span className="mobile-nav-label">{homeItem.label}</span>
          </button>
        )}
        
        {/* Scan Button - Prominent, one-tap access */}
        {scanItem && (
          <button
            className="mobile-nav-item mobile-nav-item--scan"
            onClick={handleScan}
            aria-label="Scan Barcode"
          >
            <span className="mobile-nav-icon mobile-nav-icon--scan">{scanItem.icon}</span>
            <span className="mobile-nav-label">{scanItem.label}</span>
          </button>
        )}
        
        {/* More Button */}
        {moreItem && (
          <button
            className={`mobile-nav-item ${showMoreMenu ? 'mobile-nav-item--active' : ''}`}
            onClick={() => handleNavClick(moreItem)}
            aria-label="More"
          >
            <span className="mobile-nav-icon">{moreItem.icon}</span>
            <span className="mobile-nav-label">{moreItem.label}</span>
          </button>
        )}
      </nav>
    </>
  );
};

export default MobileBottomNav;
