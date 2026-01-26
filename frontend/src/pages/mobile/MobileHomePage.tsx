import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import MobileLayout from '../../components/mobile/MobileLayout';
import MobileSideDrawer from '../../components/mobile/MobileSideDrawer';
import './mobileHomePage.css';

const MobileHomePage: React.FC = () => {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

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


  return (
    <MobileLayout>
      <MobileSideDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="mobile-home-template">
        {/* Profile/Brand Section */}
        <div className="mobile-home-profile">
          <div className="mobile-home-profile-left" onClick={() => setDrawerOpen(true)} style={{ cursor: 'pointer' }}>
            <div className="mobile-home-avatar">
              {getUserInitials()}
            </div>
            <div className="mobile-home-profile-info">
              <div className="mobile-home-profile-name">Medi Waste</div>
              <div className="mobile-home-profile-role">Waste Management</div>
            </div>
          </div>
          <button className="mobile-home-menu-button" onClick={() => setDrawerOpen(true)} aria-label="Open menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>

      </div>
    </MobileLayout>
  );
};

export default MobileHomePage;
