import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './welcomePage.css';

/**
 * Welcome / No Access page
 *
 * Shown when a user is authenticated but has NO mapped permissions (role_permissions empty).
 * This does not change any business logic; it only prevents users from seeing broken/unauthorized screens.
 */
const WelcomePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <div className="welcome-card">
        <div className="welcome-brand">MEDI-WASTE</div>
        <h1 className="welcome-title">Welcome{user?.name ? `, ${user.name}` : ''}</h1>
        <p className="welcome-subtitle">
          Your account is active, but <strong>no permissions are assigned</strong> yet.
        </p>

        <div className="welcome-actions">
          <button className="welcome-btn" type="button" onClick={() => navigate('/profile')}>
            View Profile
          </button>
          <button className="welcome-btn welcome-btn--danger" type="button" onClick={logout}>
            Logout
          </button>
        </div>

        <div className="welcome-hint">
          Please contact your SuperAdmin to assign permissions for your role.
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;

