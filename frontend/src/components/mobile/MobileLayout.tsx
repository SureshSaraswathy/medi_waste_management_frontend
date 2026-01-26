import React from 'react';
import MobileBottomNav from './MobileBottomNav';
import './mobileLayout.css';

interface MobileLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title,
  showBackButton = false,
  onBack,
}) => {
  return (
    <div className="mobile-layout">
      {/* Header */}
      {(title || showBackButton) && (
        <header className="mobile-header">
          {showBackButton && (
            <button className="mobile-back-btn" onClick={onBack} aria-label="Go back">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          )}
          {title && <h1 className="mobile-header-title">{title}</h1>}
          <div style={{ width: showBackButton ? '40px' : 'auto' }}></div>
        </header>
      )}

      {/* Main Content */}
      <main className="mobile-page-content">
        {children}
      </main>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default MobileLayout;
