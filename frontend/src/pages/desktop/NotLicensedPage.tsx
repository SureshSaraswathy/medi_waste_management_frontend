import { Link } from 'react-router-dom';

const NotLicensedPage = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12, padding: 24, textAlign: 'center' }}>
    <h2 style={{ margin: 0 }}>Feature not available</h2>
    <p style={{ color: '#555', maxWidth: 420, margin: 0 }}>
      This feature is not included in your current plan. Please contact your administrator to enable it.
    </p>
    <Link to="/dashboard">Back to Dashboard</Link>
  </div>
);

export default NotLicensedPage;
