import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import RolePill from '../../components/common/RolePill';
import { isMobileDevice } from '../../utils/deviceDetection';
import './landingPage.css';

const LandingPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = isMobileDevice();
  const wasteCategories = [
    {
      color: 'yellow',
      title: 'Yellow Category',
      icon: '🟡',
      items: [
        'Human Anatomical Waste',
        'Animal Anatomical Waste',
        'Soiled Waste',
        'Expired / Discarded Medicines',
        'Chemical Waste',
        'Chemical Liquid Waste',
        'Discarded Linen, Mattresses, Beddings',
        'Microbiology, Bio Technology Waste',
      ],
      note: 'Onsite Treatment with Autoclave/Chemical Decontamination is mandatory for Yellow Category (H)',
    },
    {
      color: 'red',
      title: 'Red Category',
      icon: '🔴',
      items: [
        'Contaminated Waste (Plastic Recyclable)',
        'Tubing Bottles (Plastic)',
        'IV Tubes Without Sharp Edge',
        'Catheters, Urine Bags',
        'Syringe (Without Needles)',
        'Vacutainers, Gloves',
      ],
    },
    {
      color: 'white',
      title: 'White Category',
      icon: '⚪',
      items: [
        'Waste Sharps Including Metal Items',
        'Needles, Fixed Needle Syringes',
        'Knives, Scalpels, Blades',
        'Broken Ampoules, Slides',
        'Any Other Sharp Object',
        'Metallic screws and Implants',
      ],
    },
    {
      color: 'blue',
      title: 'Blue Category',
      icon: '🔵',
      items: [
        'All Unbroken Glass Ware Items',
        'Glass Bottles',
        'Vails',
        'Unbroken Ampoules',
      ],
    },
  ];

  return (
    <div className="landing-page">
      <div className="landing-container">
        {/* Left Side - Waste Segregation Guide */}
        <div className="landing-left">
          {/* Brand Logo in Top Left */}
          <div className="brand-logo-top">
            <div className="brand-icon-small">M</div>
            <span className="brand-text-small">MEDI-WASTE</span>
          </div>

          <div className="guide-header">
            <h1 className="guide-title">Waste Segregation Guide</h1>
            <p className="guide-subtitle">
              Use this guide to properly categorize and dispose of medical waste
            </p>
          </div>

          <div className="guide-content">
            {wasteCategories.map((category) => (
              <div key={category.color} className={`guide-category guide-category--${category.color}`}>
                <div className="guide-category__header">
                  <span className="guide-icon">{category.icon}</span>
                  <h2 className="guide-category__title">{category.title}</h2>
                </div>
                <ul className="guide-list">
                  {category.items.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                {category.note && (
                  <div className="guide-note">
                    <strong>Note:</strong> {category.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Conditional Content */}
        <div className="landing-right">
          {user ? (
            // Dashboard/User Info when logged in
            <div className="landing-right__content">
              <div className="user-welcome">
                <div className="user-avatar-large">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="landing-right__title">Welcome back, {user.name}!</h2>
                <div className="user-role-badge">
                  <RolePill role={user.roles[0]} />
                </div>
              </div>
              
              <p className="landing-right__subtitle">
                You're logged in to the Medical Waste Management System
              </p>

              <div className="dashboard-actions">
                {user.roles.includes('admin') && (
                  <Link to="/users/new" className="btn btn-primary">
                    Create New User
                  </Link>
                )}
                {(user.roles.includes('admin') || user.roles.includes('manager')) && (
                  <Link to="/mobile/users/new" className="btn btn-secondary">
                    Mobile User Management
                  </Link>
                )}
                <button onClick={logout} className="btn btn-logout">
                  Log Out
                </button>
              </div>

              <div className="user-info">
                <p className="user-email">{user.email}</p>
                <p className="user-roles">Roles: {user.roles.join(', ')}</p>
              </div>
            </div>
          ) : (
            // Login Panel when not logged in
            <div className="landing-right__content">
              <h2 className="landing-right__title">Medical Waste Management System</h2>
              <p className="landing-right__subtitle">
                Proper segregation and disposal of medical waste for healthcare facilities
              </p>
              <div className="landing-actions">
                <Link to="/login" className="btn btn-primary">
                  Desktop Login
                </Link>
                <Link to="/mobile/login" className="btn btn-secondary">
                  Mobile Login
                </Link>
                {isMobile && (
                  <p className="device-suggestion">
                    📱 Mobile device detected - <Link to="/mobile/login">Use Mobile Login</Link>
                  </p>
                )}
              </div>
              <p className="landing-right__footer">
                Don't have an account? <Link to="/signup">Sign up</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
