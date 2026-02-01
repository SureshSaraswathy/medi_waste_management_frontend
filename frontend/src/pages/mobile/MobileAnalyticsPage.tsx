import React from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import './mobileAnalyticsPage.css';

const MobileAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MobileLayout title="Analytics" showBackButton onBack={() => navigate('/mobile/home')}>
      <div className="mobile-analytics">
        <div className="mobile-analytics-card">
          <div className="mobile-analytics-title">Analytics</div>
          <div className="mobile-analytics-sub">
            Mobile analytics screen. Use the buttons below to open full reports.
          </div>

          <button className="mobile-analytics-btn" type="button" onClick={() => navigate('/report')}>
            Open Reports (Full)
          </button>

          <button className="mobile-analytics-btn secondary" type="button" onClick={() => navigate('/dashboard')}>
            Open Dashboard (Full)
          </button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default MobileAnalyticsPage;

