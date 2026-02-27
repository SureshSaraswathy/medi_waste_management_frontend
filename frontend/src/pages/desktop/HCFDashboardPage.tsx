import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import './dashboardPage.css';

const HCFDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect if not HCF user
    if (user && user.userType !== 'HCF') {
      navigate('/dashboard', { replace: true });
    } else if (user && user.userType === 'HCF') {
      setLoading(false);
    }
  }, [user, navigate]);

  if (loading || !user || user.userType !== 'HCF') {
    return (
      <DashboardLayout>
        <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <div className="dashboard-header">
          <h1>HCF Dashboard</h1>
          <p>Welcome, {user.name}</p>
        </div>

        <div className="dashboard-content">
          <div className="dashboard-grid">
            {/* Quick Stats Cards */}
            <div className="dashboard-card">
              <h3>My Invoices</h3>
              <p>View and download your invoices</p>
              <button 
                className="dashboard-card-button"
                onClick={() => navigate('/hcf/invoices')}
              >
                View Invoices
              </button>
            </div>

            <div className="dashboard-card">
              <h3>Payments</h3>
              <p>Track your payment history</p>
              <button 
                className="dashboard-card-button"
                onClick={() => navigate('/hcf/payments')}
              >
                View Payments
              </button>
            </div>

            <div className="dashboard-card">
              <h3>Waste Entries</h3>
              <p>View your waste collection records</p>
              <button 
                className="dashboard-card-button"
                onClick={() => navigate('/hcf/waste-entries')}
              >
                View Entries
              </button>
            </div>

            <div className="dashboard-card">
              <h3>Profile</h3>
              <p>Manage your HCF profile</p>
              <button 
                className="dashboard-card-button"
                onClick={() => navigate('/hcf/profile')}
              >
                View Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HCFDashboardPage;
