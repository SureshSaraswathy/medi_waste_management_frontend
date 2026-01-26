import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { changePassword } from '../../services/passwordService';
import { userService } from '../../services/userService';
import './profileModal.css';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'basic' | 'contact' | 'security'>('basic');
  
  // User profile data
  const [profileData, setProfileData] = useState<any>(null);
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // OTP settings
  const [otpEnabled, setOtpEnabled] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadUserProfile();
    }
  }, [isOpen, user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      // Check if user.id is a valid UUID
      const isValidUUID = user.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      
      if (isValidUUID) {
        // Try to get user by ID (valid UUID)
        try {
          const userData = await userService.getUserById(user.id);
          setProfileData(userData);
          setOtpEnabled(userData.otpEnabled || false);
          return;
        } catch (idError) {
          console.log('User ID lookup failed, trying search by username:', idError);
        }
      }
      
      // If ID is not a UUID or lookup failed, try to get by userName
      if (user.name) {
        try {
          const userData = await userService.getUserByUsername(user.name);
          setProfileData(userData);
          setOtpEnabled(userData.otpEnabled || false);
          return;
        } catch (usernameError) {
          console.log('User lookup by username failed:', usernameError);
        }
      }
      
      // If both lookups failed, show basic info from auth context
      setProfileData({
        userName: user.name,
        emailAddress: user.email,
        status: 'Active',
        mobileNumber: '-',
        employeeCode: '-',
        userRoleId: user.roles.join(', '),
      });
      setError('Unable to load complete profile data. Showing basic information from your session.');
      
    } catch (err) {
      console.error('Error loading user profile:', err);
      // Show basic info from auth context as fallback
      setProfileData({
        userName: user.name,
        emailAddress: user.email,
        status: 'Active',
        mobileNumber: '-',
        employeeCode: '-',
        userRoleId: user.roles.join(', '),
      });
      setError('Unable to load complete profile data. Showing basic information from your session.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      if (!user?.id) {
        throw new Error('User ID not found');
      }

      // Check if user.id is a valid UUID
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
      
      if (!isValidUUID && user.name) {
        // Get user by username first to get the actual UUID
        const userData = await userService.getUserByUsername(user.name);
        await changePassword(userData.userId, {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        });
      } else if (isValidUUID) {
        await changePassword(user.id, {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        });
      } else {
        throw new Error('Unable to identify user for password change');
      }

      setSuccess('Password changed successfully!');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
      // Close modal after 1.5 seconds to show success message
      setTimeout(() => {
        onClose();
        setSuccess(null);
        setError(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">My Profile</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body profile-modal-body">
          {/* Error/Success Messages */}
          {error && (
            <div className="profile-error-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
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
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Loading profile data...
              </div>
            ) : (
              <>
                {/* Basic Info Section */}
                {activeSection === 'basic' && (
                  <div className="profile-section">
                    <h2 className="section-title">Basic Information</h2>
                    <p className="section-description">Your account information (read-only)</p>
                    
                    <div className="profile-info-grid">
                      <div className="info-item">
                        <label className="info-label">User Name</label>
                        <div className="info-value">{profileData?.userName || user?.name || '-'}</div>
                      </div>
                      <div className="info-item">
                        <label className="info-label">Employee Code</label>
                        <div className="info-value">{profileData?.employeeCode || '-'}</div>
                      </div>
                      <div className="info-item">
                        <label className="info-label">Mobile Number</label>
                        <div className="info-value">{profileData?.mobileNumber || '-'}</div>
                      </div>
                      <div className="info-item">
                        <label className="info-label">Status</label>
                        <div className="info-value">
                          <span className={`status-badge status-badge--${(profileData?.status || 'active').toLowerCase()}`}>
                            {profileData?.status || 'Active'}
                          </span>
                        </div>
                      </div>
                      <div className="info-item">
                        <label className="info-label">Role</label>
                        <div className="info-value">{profileData?.userRoleId || user?.roles.join(', ') || '-'}</div>
                      </div>
                      <div className="info-item">
                        <label className="info-label">Employment Type</label>
                        <div className="info-value">{profileData?.employmentType || '-'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Info Section */}
                {activeSection === 'contact' && (
                  <div className="profile-section">
                    <h2 className="section-title">Contact Information</h2>
                    <p className="section-description">Update your contact details (email is optional)</p>
                    
                    <div className="profile-info-grid">
                      <div className="info-item">
                        <label className="info-label">Email Address</label>
                        <div className="info-value">{profileData?.emailAddress || user?.email || 'Not provided'}</div>
                        <small className="info-hint">Email is optional and can be updated by admin</small>
                      </div>
                      <div className="info-item">
                        <label className="info-label">Emergency Contact</label>
                        <div className="info-value">{profileData?.emergencyContact || '-'}</div>
                      </div>
                      <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                        <label className="info-label">Address</label>
                        <div className="info-value">
                          {profileData?.addressLine ? (
                            <div>
                              <div>{profileData.addressLine}</div>
                              {profileData.area && <div>{profileData.area}</div>}
                              {profileData.city && <div>{profileData.city}, {profileData.district}</div>}
                              {profileData.pincode && <div>PIN: {profileData.pincode}</div>}
                            </div>
                          ) : (
                            '-'
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Section */}
                {activeSection === 'security' && (
                  <div className="profile-section">
                    <h2 className="section-title">Security Settings</h2>
                    <p className="section-description">Manage your password and security preferences</p>
                    
                    {/* Change Password Form */}
                    <div className="security-section">
                      <h3 className="subsection-title">Change Password</h3>
                      <form onSubmit={handlePasswordChange} className="password-form">
                        <div className="form-group">
                          <label htmlFor="currentPassword">Current Password *</label>
                          <input
                            type="password"
                            id="currentPassword"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            required
                            placeholder="Enter your current password"
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="newPassword">New Password *</label>
                          <input
                            type="password"
                            id="newPassword"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            required
                            minLength={8}
                            placeholder="Enter new password (min 8 characters)"
                          />
                          <small className="form-hint">
                            Password must be at least 8 characters and include uppercase, lowercase, number, and special character
                          </small>
                        </div>
                        <div className="form-group">
                          <label htmlFor="confirmPassword">Confirm New Password *</label>
                          <input
                            type="password"
                            id="confirmPassword"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            required
                            minLength={8}
                            placeholder="Confirm new password"
                          />
                        </div>
                        <button
                          type="submit"
                          className="btn btn--primary"
                          disabled={loading}
                        >
                          {loading ? 'Changing Password...' : 'Change Password'}
                        </button>
                      </form>
                    </div>

                    {/* OTP Settings */}
                    <div className="security-section">
                      <h3 className="subsection-title">OTP Settings</h3>
                      <div className="otp-settings">
                        <div className="setting-item">
                          <div className="setting-info">
                            <label className="setting-label">OTP Enabled</label>
                            <p className="setting-description">
                              {profileData?.emailAddress
                                ? 'OTP can be enabled if you have an email address'
                                : 'OTP requires an email address. Please contact admin to add your email.'}
                            </p>
                          </div>
                          <div className="setting-control">
                            <label className="toggle-switch">
                              <input
                                type="checkbox"
                                checked={otpEnabled}
                                onChange={(e) => setOtpEnabled(e.target.checked)}
                                disabled={!profileData?.emailAddress}
                              />
                              <span className="toggle-slider"></span>
                            </label>
                          </div>
                        </div>
                        {!profileData?.emailAddress && (
                          <div className="setting-note">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="12" y1="8" x2="12" y2="12"></line>
                              <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            Email address is required to enable OTP. Please contact your administrator.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
