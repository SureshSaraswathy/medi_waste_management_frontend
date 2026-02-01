import React from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import './mobileAssignHospitalPage.css';

const MobileAssignHospitalPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MobileLayout title="Route Assignment" showBackButton onBack={() => navigate('/mobile/home')}>
      <div className="mobile-assign-hospital">
        <div className="mobile-assign-hospital-info">
          <p>Route assignment functionality will be available here.</p>
          <button
            className="mobile-assign-hospital-btn"
            onClick={() => navigate('/transaction/route-assignment')}
          >
            Open Full View
          </button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default MobileAssignHospitalPage;
