import React from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import './mobileHCFMasterPage.css';

const MobileHCFMasterPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MobileLayout title="HCF Master" showBackButton onBack={() => navigate('/mobile/home')}>
      <div className="mobile-hcf-master">
        <div className="mobile-hcf-master-info">
          <p>HCF Master data management will be available here.</p>
          <button
            className="mobile-hcf-master-btn"
            onClick={() => navigate('/master/hcf')}
          >
            Open Full View
          </button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default MobileHCFMasterPage;
