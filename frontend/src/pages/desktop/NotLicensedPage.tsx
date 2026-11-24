import { Link } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';

/**
 * Shown when a route belongs to a module the customer has not enabled (licensing mode ENFORCE).
 * It renders INSIDE the shared application layout so the sidebar stays available: the user can always navigate to something they
 * are allowed to use instead of being left on a page with no navigation.
 */
const NotLicensedPage = () => (
  <AppLayout>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12, padding: 24, textAlign: 'center' }}>
      <h2 style={{ margin: 0 }}>Feature not available</h2>
      <p style={{ color: '#555', maxWidth: 420, margin: 0 }}>
        This feature is not included in your current plan. Please contact your administrator to enable it.
      </p>
      <Link to="/dashboard">Back to Dashboard</Link>
    </div>
  </AppLayout>
);

export default NotLicensedPage;
