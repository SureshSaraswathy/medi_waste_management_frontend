import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { changePassword } from '../../services/passwordService';
import { userService, UserResponse } from '../../services/userService';
import './profilePage.css';
import './dashboardPage.css';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [reportSubmenuOpen, setReportSubmenuOpen] = useState(
    location.pathname.startsWith('/report')
  );
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'basic' | 'contact' | 'security'>('basic');
  
  // User profile data
  const [profileData, setProfileData] = useState<UserResponse | null>(null);
  
  // Contact Info editing state
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [contactFormData, setContactFormData] = useState({
    emailAddress: '',
    emergencyContact: '',
    addressLine: '',
    area: '',
    city: '',
    district: '',
    pincode: '',
  });
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // Password visibility toggles
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  // Password validation state
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    match: false,
  });

  useEffect(() => {
    if (user?.id) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    setInfoMessage(null);
    try {
      const isValidUUID = user.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      
      let userData: UserResponse | null = null;
      
      if (isValidUUID) {
        try {
          userData = await userService.getUserById(user.id);
        } catch (idError) {
          console.log('User ID lookup failed, trying search by username:', idError);
        }
      }
      
      if (!userData && user.name) {
        try {
          userData = await userService.getUserByUsername(user.name);
        } catch (usernameError) {
          console.log('User lookup by username failed:', usernameError);
        }
      }
      
      if (userData) {
        setProfileData(userData);
        setContactFormData({
          emailAddress: userData.emailAddress || '',
          emergencyContact: userData.emergencyContact || '',
          addressLine: userData.addressLine || '',
          area: userData.area || '',
          city: userData.city || '',
          district: userData.district || '',
          pincode: userData.pincode || '',
        });
      } else {
        // Fallback to basic info from auth context
        const fallbackData: Partial<UserResponse> = {
          userName: user.name,
          emailAddress: user.email || null,
          status: 'Active' as const,
          mobileNumber: '-',
          employeeCode: null,
          userRoleId: user.roles.join(', ') || null,
        };
        setProfileData(fallbackData as UserResponse);
        setInfoMessage('Showing basic information from your session. Some details may be incomplete.');
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setInfoMessage('Unable to load complete profile data. Showing basic information from your session.');
    } finally {
      setLoading(false);
    }
  };

  const handleContactSave = async () => {
    if (!profileData?.userId) return;
    
    setLoading(true);
    setSuccess(null);
    setInfoMessage(null);
    
    try {
      await userService.updateCompleteUser(profileData.userId, {
        emailAddress: contactFormData.emailAddress || undefined,
        emergencyContact: contactFormData.emergencyContact || undefined,
        addressLine: contactFormData.addressLine || undefined,
        area: contactFormData.area || undefined,
        city: contactFormData.city || undefined,
        district: contactFormData.district || undefined,
        pincode: contactFormData.pincode || undefined,
      });
      
      setSuccess('Contact information updated successfully!');
      setIsEditingContact(false);
      await loadUserProfile(); // Reload to get updated data
    } catch (err: any) {
      setInfoMessage(err.message || 'Failed to update contact information');
    } finally {
      setLoading(false);
    }
  };

  const handleContactCancel = () => {
    if (profileData) {
      setContactFormData({
        emailAddress: profileData.emailAddress || '',
        emergencyContact: profileData.emergencyContact || '',
        addressLine: profileData.addressLine || '',
        area: profileData.area || '',
        city: profileData.city || '',
        district: profileData.district || '',
        pincode: profileData.pincode || '',
      });
    }
    setIsEditingContact(false);
  };

  // Validate password requirements
  const validatePassword = (password: string) => {
    setPasswordValidation({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      match: password === passwordForm.confirmPassword && password.length > 0,
    });
  };

  // Handle password input changes
  const handlePasswordInputChange = (field: 'newPassword' | 'confirmPassword', value: string) => {
    const updatedForm = { ...passwordForm, [field]: value };
    setPasswordForm(updatedForm);
    
    if (field === 'newPassword') {
      validatePassword(value);
      // Also update match validation if confirm password is already entered
      if (passwordForm.confirmPassword) {
        setPasswordValidation(prev => ({
          ...prev,
          match: value === passwordForm.confirmPassword && value.length > 0,
        }));
      }
    } else {
      // For confirm password, check against new password
      setPasswordValidation(prev => ({
        ...prev,
        match: value === passwordForm.newPassword && value.length > 0,
      }));
    }
  };

  // Calculate password strength
  const getPasswordStrength = () => {
    const checks = [
      passwordValidation.length,
      passwordValidation.uppercase,
      passwordValidation.lowercase,
      passwordValidation.number,
      passwordValidation.special,
    ];
    const passedChecks = checks.filter(Boolean).length;
    if (passedChecks === 0) return { level: 0, label: '', color: '' };
    if (passedChecks <= 2) return { level: 1, label: 'Weak', color: '#ef4444' };
    if (passedChecks <= 4) return { level: 2, label: 'Medium', color: '#f59e0b' };
    return { level: 3, label: 'Strong', color: '#10b981' };
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoMessage(null);
    setSuccess(null);

    // Validate all requirements
    if (!passwordValidation.length) {
      setInfoMessage('Password must be at least 8 characters long');
      return;
    }
    if (!passwordValidation.uppercase) {
      setInfoMessage('Password must contain at least one uppercase letter');
      return;
    }
    if (!passwordValidation.lowercase) {
      setInfoMessage('Password must contain at least one lowercase letter');
      return;
    }
    if (!passwordValidation.number) {
      setInfoMessage('Password must contain at least one number');
      return;
    }
    if (!passwordValidation.special) {
      setInfoMessage('Password must contain at least one special character');
      return;
    }
    if (!passwordValidation.match) {
      setInfoMessage('New password and confirm password do not match');
      return;
    }

    setLoading(true);
    try {
      if (!user?.id) {
        throw new Error('User ID not found');
      }

      await changePassword(user.id, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setSuccess('Password changed successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordValidation({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
        match: false,
      });
      setShowPasswords({
        current: false,
        new: false,
        confirm: false,
      });
    } catch (err: any) {
      setInfoMessage(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    const statusLower = (status || 'active').toLowerCase();
    if (statusLower === 'active') return 'status-badge--active';
    if (statusLower === 'inactive') return 'status-badge--inactive';
    if (statusLower === 'draft') return 'status-badge--draft';
    return 'status-badge--active';
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const displayName = profileData?.userName || user?.name || 'User';
  const displayRole = profileData?.userRoleId || user?.roles.join(', ') || 'User';
  const displayStatus = profileData?.status || 'Active';

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Dashboard', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      ), 
      active: location.pathname === '/dashboard' 
    },
    { 
      path: '/transaction', 
      label: 'Transaction', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      ), 
      active: location.pathname === '/transaction' || location.pathname.startsWith('/transaction')
    },
    { 
      path: '/finance', 
      label: 'Finance', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ), 
      active: location.pathname === '/finance' || location.pathname.startsWith('/finance')
    },
    { 
      path: '/commercial-agreements', 
      label: 'Commercial / Agreements', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      ), 
      active: location.pathname === '/commercial-agreements' || location.pathname.startsWith('/commercial-agreements')
    },
    { 
      path: '/compliance-training', 
      label: 'Compliance & Training', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <path d="M9 15l2 2 4-4"></path>
        </svg>
      ), 
      active: location.pathname === '/compliance-training' || location.pathname.startsWith('/compliance-training')
    },
    { 
      path: '/master', 
      label: 'Master', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
        </svg>
      ), 
      active: location.pathname === '/master' || location.pathname.startsWith('/master')
    },
    { 
      path: '/report', 
      label: 'Report', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ), 
      active: location.pathname.startsWith('/report'),
      hasSubmenu: true,
      submenuItems: [
        { path: '/report/billing-finance', label: 'Billing & Finance Reports' },
        { path: '/report/operations-logistics', label: 'Operations & Logistics' },
        { path: '/report/hcf-compliance', label: 'HCF & Compliance' },
      ]
    },
  ];

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <span className="brand-name">MEDI-WASTE</span>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.path} className={item.hasSubmenu ? 'nav-item--has-submenu' : ''}>
                {item.hasSubmenu ? (
                  <>
                    <button
                      onClick={() => setReportSubmenuOpen(!reportSubmenuOpen)}
                      className={`nav-link ${item.active ? 'nav-link--active' : ''}`}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-label">{item.label}</span>
                      <svg 
                        className={`nav-arrow ${reportSubmenuOpen ? 'nav-arrow--open' : ''}`}
                        width="16" 
                        height="16" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                    {item.submenuItems && (
                      <ul className={`nav-submenu ${reportSubmenuOpen ? 'nav-submenu--open' : ''}`}>
                        {item.submenuItems.map((subItem) => (
                          <li key={subItem.path}>
                            <Link
                              to={subItem.path}
                              className={`nav-submenu-link ${location.pathname === subItem.path ? 'nav-submenu-link--active' : ''}`}
                            >
                              {subItem.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    className={`nav-link ${item.active ? 'nav-link--active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-notification-btn" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span className="notification-badge">3</span>
          </button>
          <Link
            to="/profile"
            className={`sidebar-profile-btn ${location.pathname === '/profile' ? 'sidebar-profile-btn--active' : ''}`}
            title="My Profile"
          >
            <span className="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </span>
            <span className="nav-label">Profile</span>
          </Link>
          <button onClick={logout} className="sidebar-logout-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-left">
            <span className="breadcrumb">/ Profile</span>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="profile-page">
            {/* Profile Header with Avatar */}
            <div className="profile-header-card">
              <div className="profile-header-avatar">
                <div className="profile-avatar-large">
                  {getInitials(displayName)}
                </div>
              </div>
              <div className="profile-header-info">
                <h1 className="profile-header-name">{displayName}</h1>
                <div className="profile-header-meta">
                  <span className="profile-header-role">{displayRole}</span>
                  <span className="profile-header-separator">•</span>
                  <span className={`profile-header-status ${getStatusBadgeClass(displayStatus)}`}>
                    {displayStatus}
                  </span>
                </div>
                {profileData?.mobileNumber && profileData.mobileNumber !== '-' && (
                  <div className="profile-header-contact">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    {profileData.mobileNumber}
                  </div>
                )}
              </div>
            </div>

            {/* Informational Banner */}
            {infoMessage && (
              <div className="profile-info-banner">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>{infoMessage}</span>
              </div>
            )}

            {success && (
              <div className="profile-success-message">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                {success}
              </div>
            )}

            {/* Section Tabs */}
            <div className="profile-section-tabs">
              <button
                className={`section-tab ${activeSection === 'basic' ? 'active' : ''}`}
                onClick={() => setActiveSection('basic')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Basic Info
              </button>
              <button
                className={`section-tab ${activeSection === 'contact' ? 'active' : ''}`}
                onClick={() => setActiveSection('contact')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Contact Info
              </button>
              <button
                className={`section-tab ${activeSection === 'security' ? 'active' : ''}`}
                onClick={() => setActiveSection('security')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                Security
              </button>
            </div>

            {/* Section Content */}
            <div className="profile-section-content">
              {loading && !profileData ? (
                <div className="profile-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading profile data...</p>
                </div>
              ) : (
                <>
                  {/* Basic Info Section */}
                  {activeSection === 'basic' && (
                    <div className="profile-section">
                      <div className="section-header">
                        <h2 className="section-title">Basic Information</h2>
                        <p className="section-description">Your account information (read-only)</p>
                      </div>
                      
                      <div className="profile-cards-grid">
                        <div className="profile-card">
                          <div className="profile-card-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <span className="profile-card-title">User Name</span>
                          </div>
                          <div className="profile-card-value">{profileData?.userName || user?.name || '-'}</div>
                        </div>

                        <div className="profile-card">
                          <div className="profile-card-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="8.5" cy="7" r="4"></circle>
                              <path d="M20 8v6M23 11h-6"></path>
                            </svg>
                            <span className="profile-card-title">Employee Code</span>
                          </div>
                          <div className="profile-card-value">{profileData?.employeeCode || '-'}</div>
                        </div>

                        <div className="profile-card">
                          <div className="profile-card-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            <span className="profile-card-title">Mobile Number</span>
                          </div>
                          <div className="profile-card-value">{profileData?.mobileNumber || '-'}</div>
                        </div>

                        <div className="profile-card">
                          <div className="profile-card-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"></circle>
                              <path d="M12 6v6l4 2"></path>
                            </svg>
                            <span className="profile-card-title">Status</span>
                          </div>
                          <div className="profile-card-value">
                            <span className={`status-badge ${getStatusBadgeClass(displayStatus)}`}>
                              {displayStatus}
                            </span>
                          </div>
                        </div>

                        <div className="profile-card">
                          <div className="profile-card-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <span className="profile-card-title">Role</span>
                          </div>
                          <div className="profile-card-value">{displayRole}</div>
                        </div>

                        <div className="profile-card">
                          <div className="profile-card-header">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="8.5" cy="7" r="4"></circle>
                              <line x1="20" y1="8" x2="20" y2="14"></line>
                              <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            <span className="profile-card-title">Employment Type</span>
                          </div>
                          <div className="profile-card-value">{profileData?.employmentType || '-'}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact Info Section */}
                  {activeSection === 'contact' && (
                    <div className="profile-section">
                      <div className="section-header">
                        <h2 className="section-title">Contact Information</h2>
                        <p className="section-description">
                          {isEditingContact ? 'Edit your contact details' : 'Update your contact details'}
                        </p>
                      </div>
                      
                      <div className="profile-contact-form">
                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="emailAddress">Email Address</label>
                            {isEditingContact ? (
                              <input
                                type="email"
                                id="emailAddress"
                                value={contactFormData.emailAddress}
                                onChange={(e) => setContactFormData({ ...contactFormData, emailAddress: e.target.value })}
                                placeholder="Enter email address"
                                disabled={loading}
                              />
                            ) : (
                              <div className="form-value">{profileData?.emailAddress || 'Not provided'}</div>
                            )}
                            <small className="form-hint">Email is optional and can be updated</small>
                          </div>

                          <div className="form-group">
                            <label htmlFor="emergencyContact">Emergency Contact</label>
                            {isEditingContact ? (
                              <input
                                type="text"
                                id="emergencyContact"
                                value={contactFormData.emergencyContact}
                                onChange={(e) => setContactFormData({ ...contactFormData, emergencyContact: e.target.value })}
                                placeholder="Enter emergency contact number"
                                disabled={loading}
                              />
                            ) : (
                              <div className="form-value">{profileData?.emergencyContact || '-'}</div>
                            )}
                          </div>
                        </div>

                        <div className="form-group form-group--full">
                          <label htmlFor="addressLine">Address Line</label>
                          {isEditingContact ? (
                            <input
                              type="text"
                              id="addressLine"
                              value={contactFormData.addressLine}
                              onChange={(e) => setContactFormData({ ...contactFormData, addressLine: e.target.value })}
                              placeholder="Enter address line"
                              disabled={loading}
                            />
                          ) : (
                            <div className="form-value">{profileData?.addressLine || '-'}</div>
                          )}
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="area">Area</label>
                            {isEditingContact ? (
                              <input
                                type="text"
                                id="area"
                                value={contactFormData.area}
                                onChange={(e) => setContactFormData({ ...contactFormData, area: e.target.value })}
                                placeholder="Enter area"
                                disabled={loading}
                              />
                            ) : (
                              <div className="form-value">{profileData?.area || '-'}</div>
                            )}
                          </div>

                          <div className="form-group">
                            <label htmlFor="city">City</label>
                            {isEditingContact ? (
                              <input
                                type="text"
                                id="city"
                                value={contactFormData.city}
                                onChange={(e) => setContactFormData({ ...contactFormData, city: e.target.value })}
                                placeholder="Enter city"
                                disabled={loading}
                              />
                            ) : (
                              <div className="form-value">{profileData?.city || '-'}</div>
                            )}
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label htmlFor="district">District</label>
                            {isEditingContact ? (
                              <input
                                type="text"
                                id="district"
                                value={contactFormData.district}
                                onChange={(e) => setContactFormData({ ...contactFormData, district: e.target.value })}
                                placeholder="Enter district"
                                disabled={loading}
                              />
                            ) : (
                              <div className="form-value">{profileData?.district || '-'}</div>
                            )}
                          </div>

                          <div className="form-group">
                            <label htmlFor="pincode">Pincode</label>
                            {isEditingContact ? (
                              <input
                                type="text"
                                id="pincode"
                                value={contactFormData.pincode}
                                onChange={(e) => setContactFormData({ ...contactFormData, pincode: e.target.value })}
                                placeholder="Enter pincode"
                                disabled={loading}
                              />
                            ) : (
                              <div className="form-value">{profileData?.pincode || '-'}</div>
                            )}
                          </div>
                        </div>

                        <div className="form-actions">
                          {isEditingContact ? (
                            <>
                              <button
                                type="button"
                                className="btn btn--secondary"
                                onClick={handleContactCancel}
                                disabled={loading}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="btn btn--primary"
                                onClick={handleContactSave}
                                disabled={loading}
                              >
                                {loading ? 'Saving...' : 'Save Changes'}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn btn--primary"
                              onClick={() => setIsEditingContact(true)}
                            >
                              Edit Contact Info
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Security Section */}
                  {activeSection === 'security' && (
                    <div className="profile-section">
                      <div className="section-header">
                        <h2 className="section-title">Security Settings</h2>
                        <p className="section-description">Manage your password and security preferences</p>
                      </div>
                      
                      {/* Change Password Card */}
                      <div className="security-card security-card--password">
                        <div className="security-card-header">
                          <div className="security-card-title-group">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            <div>
                              <h3 className="security-card-title">Change Password</h3>
                              <p className="security-card-subtitle">Update your account password to keep your account secure</p>
                            </div>
                          </div>
                        </div>
                        <form onSubmit={handlePasswordChange} className="password-form">
                          {/* Current Password */}
                          <div className="form-group form-group--password">
                            <label htmlFor="currentPassword">
                              Current Password
                              <span className="required-asterisk">*</span>
                            </label>
                            <div className="password-input-wrapper">
                              <input
                                type={showPasswords.current ? 'text' : 'password'}
                                id="currentPassword"
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                required
                                placeholder="Enter your current password"
                                disabled={loading}
                                className={passwordForm.currentPassword ? 'has-value' : ''}
                              />
                              <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                tabIndex={-1}
                                aria-label={showPasswords.current ? 'Hide password' : 'Show password'}
                              >
                                {showPasswords.current ? (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                  </svg>
                                ) : (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* New Password */}
                          <div className="form-group form-group--password">
                            <label htmlFor="newPassword">
                              New Password
                              <span className="required-asterisk">*</span>
                            </label>
                            <div className="password-input-wrapper">
                              <input
                                type={showPasswords.new ? 'text' : 'password'}
                                id="newPassword"
                                value={passwordForm.newPassword}
                                onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                                required
                                placeholder="Enter new password"
                                disabled={loading}
                                className={passwordForm.newPassword ? 'has-value' : ''}
                              />
                              <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                tabIndex={-1}
                                aria-label={showPasswords.new ? 'Hide password' : 'Show password'}
                              >
                                {showPasswords.new ? (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                  </svg>
                                ) : (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                )}
                              </button>
                            </div>
                            
                            {/* Password Strength Indicator */}
                            {passwordForm.newPassword && (
                              <div className="password-strength">
                                <div className="password-strength-bar">
                                  <div 
                                    className="password-strength-fill"
                                    style={{
                                      width: `${(getPasswordStrength().level / 3) * 100}%`,
                                      backgroundColor: getPasswordStrength().color,
                                    }}
                                  ></div>
                                </div>
                                <span className="password-strength-label" style={{ color: getPasswordStrength().color }}>
                                  {getPasswordStrength().label || 'Enter password'}
                                </span>
                              </div>
                            )}

                            {/* Password Requirements */}
                            <div className="password-requirements">
                              <div className={`requirement-item ${passwordValidation.length ? 'requirement-item--valid' : ''}`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  {passwordValidation.length ? (
                                    <path d="M20 6L9 17l-5-5"></path>
                                  ) : (
                                    <circle cx="12" cy="12" r="10"></circle>
                                  )}
                                </svg>
                                <span>At least 8 characters</span>
                              </div>
                              <div className={`requirement-item ${passwordValidation.uppercase ? 'requirement-item--valid' : ''}`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  {passwordValidation.uppercase ? (
                                    <path d="M20 6L9 17l-5-5"></path>
                                  ) : (
                                    <circle cx="12" cy="12" r="10"></circle>
                                  )}
                                </svg>
                                <span>One uppercase letter</span>
                              </div>
                              <div className={`requirement-item ${passwordValidation.lowercase ? 'requirement-item--valid' : ''}`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  {passwordValidation.lowercase ? (
                                    <path d="M20 6L9 17l-5-5"></path>
                                  ) : (
                                    <circle cx="12" cy="12" r="10"></circle>
                                  )}
                                </svg>
                                <span>One lowercase letter</span>
                              </div>
                              <div className={`requirement-item ${passwordValidation.number ? 'requirement-item--valid' : ''}`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  {passwordValidation.number ? (
                                    <path d="M20 6L9 17l-5-5"></path>
                                  ) : (
                                    <circle cx="12" cy="12" r="10"></circle>
                                  )}
                                </svg>
                                <span>One number</span>
                              </div>
                              <div className={`requirement-item ${passwordValidation.special ? 'requirement-item--valid' : ''}`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  {passwordValidation.special ? (
                                    <path d="M20 6L9 17l-5-5"></path>
                                  ) : (
                                    <circle cx="12" cy="12" r="10"></circle>
                                  )}
                                </svg>
                                <span>One special character</span>
                              </div>
                            </div>
                          </div>

                          {/* Confirm Password */}
                          <div className="form-group form-group--password">
                            <label htmlFor="confirmPassword">
                              Confirm New Password
                              <span className="required-asterisk">*</span>
                            </label>
                            <div className="password-input-wrapper">
                              <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                id="confirmPassword"
                                value={passwordForm.confirmPassword}
                                onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                                required
                                placeholder="Re-enter new password"
                                disabled={loading}
                                className={`${passwordForm.confirmPassword ? 'has-value' : ''} ${passwordForm.confirmPassword && passwordValidation.match ? 'password-match' : passwordForm.confirmPassword && !passwordValidation.match ? 'password-mismatch' : ''}`}
                              />
                              <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                tabIndex={-1}
                                aria-label={showPasswords.confirm ? 'Hide password' : 'Show password'}
                              >
                                {showPasswords.confirm ? (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                  </svg>
                                ) : (
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                  </svg>
                                )}
                              </button>
                            </div>
                            {passwordForm.confirmPassword && (
                              <div className={`password-match-indicator ${passwordValidation.match ? 'password-match-indicator--valid' : 'password-match-indicator--invalid'}`}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  {passwordValidation.match ? (
                                    <path d="M20 6L9 17l-5-5"></path>
                                  ) : (
                                    <path d="M18 6L6 18M6 6l12 12"></path>
                                  )}
                                </svg>
                                <span>{passwordValidation.match ? 'Passwords match' : 'Passwords do not match'}</span>
                              </div>
                            )}
                          </div>

                          {/* Submit Button */}
                          <div className="form-actions form-actions--password">
                            <button
                              type="submit"
                              className="btn btn--primary btn--password"
                              disabled={loading || !passwordValidation.match || !passwordValidation.length || !passwordValidation.uppercase || !passwordValidation.lowercase || !passwordValidation.number || !passwordValidation.special}
                            >
                              {loading ? (
                                <>
                                  <svg className="btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                                  </svg>
                                  Changing Password...
                                </>
                              ) : (
                                <>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                  </svg>
                                  Update Password
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;
