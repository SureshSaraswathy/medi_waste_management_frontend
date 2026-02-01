import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/mobile/MobileLayout';
import { useAuth } from '../../hooks/useAuth';
import { changePassword } from '../../services/passwordService';
import { userService, UserResponse } from '../../services/userService';
import './mobileProfilePage.css';

const isUuid = (value?: string | null) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const MobileProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserResponse | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [contact, setContact] = useState({
    emailAddress: '',
    emergencyContact: '',
    addressLine: '',
    city: '',
    district: '',
    pincode: '',
  });

  const [pwd, setPwd] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const displayRole = useMemo(() => {
    if (!user) return '';
    return (user.roles || []).join(', ');
  }, [user]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      setLoading(true);
      setInfo(null);
      try {
        if (isUuid(user.id)) {
          const u = await userService.getUserById(user.id);
          setProfile(u);
          setContact({
            emailAddress: u.emailAddress || '',
            emergencyContact: u.emergencyContact || '',
            addressLine: u.addressLine || '',
            city: u.city || '',
            district: u.district || '',
            pincode: u.pincode || '',
          });
        } else {
          setInfo('Showing basic profile from session.');
        }
      } catch (e: any) {
        setInfo(e?.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  const onSaveContact = async () => {
    if (!user?.id || !isUuid(user.id)) {
      setInfo('Cannot update profile: user id missing.');
      return;
    }
    setLoading(true);
    setInfo(null);
    setSuccess(null);
    try {
      await userService.updateCompleteUser(user.id, {
        companyId: profile?.companyId || '',
        userName: profile?.userName || user.name || '',
        mobileNumber: profile?.mobileNumber || '-',
        userRoleId: profile?.userRoleId || undefined,
        emailAddress: contact.emailAddress || undefined,
        emergencyContact: contact.emergencyContact || undefined,
        addressLine: contact.addressLine || undefined,
        city: contact.city || undefined,
        district: contact.district || undefined,
        pincode: contact.pincode || undefined,
      });
      setSuccess('Profile updated successfully.');
      setIsEditing(false);
      if (isUuid(user.id)) {
        const u = await userService.getUserById(user.id);
        setProfile(u);
      }
    } catch (e: any) {
      setInfo(e?.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const onChangePassword = async () => {
    setInfo(null);
    setSuccess(null);

    if (!user?.id) {
      setInfo('Unable to identify user for password change.');
      return;
    }
    if (!pwd.currentPassword || !pwd.newPassword) {
      setInfo('Please fill current password and new password.');
      return;
    }
    if (pwd.newPassword !== pwd.confirmPassword) {
      setInfo('New password and confirm password do not match.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(user.id, {
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      setSuccess('Password changed successfully.');
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e: any) {
      setInfo(e?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/mobile/login', { replace: true });
  };

  return (
    <MobileLayout title="Profile" showBackButton onBack={() => navigate(-1)}>
      <div className="mobile-profile">
        {(info || success) && (
          <div className={`mobile-profile-banner ${success ? 'success' : 'info'}`}>
            {success || info}
          </div>
        )}

        <div className="mobile-profile-card">
          <div className="mobile-profile-section-title">Account</div>
          <div className="mobile-profile-row">
            <div className="label">Name</div>
            <div className="value">{user?.name || '-'}</div>
          </div>
          <div className="mobile-profile-row">
            <div className="label">Email</div>
            <div className="value">{user?.email || profile?.emailAddress || '-'}</div>
          </div>
          <div className="mobile-profile-row">
            <div className="label">Role</div>
            <div className="value">{displayRole || profile?.userRoleId || '-'}</div>
          </div>
        </div>

        <div className="mobile-profile-card">
          <div className="mobile-profile-section-title">
            Contact Info
            <button
              className="mobile-profile-link"
              onClick={() => {
                setSuccess(null);
                setInfo(null);
                setIsEditing((v) => !v);
              }}
              disabled={loading}
              type="button"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="mobile-profile-form">
            <label>
              Email
              <input
                value={isEditing ? contact.emailAddress : (profile?.emailAddress || user?.email || '')}
                onChange={(e) => setContact((p) => ({ ...p, emailAddress: e.target.value }))}
                disabled={!isEditing || loading}
                placeholder="Email address"
              />
            </label>
            <label>
              Emergency Contact
              <input
                value={contact.emergencyContact}
                onChange={(e) => setContact((p) => ({ ...p, emergencyContact: e.target.value }))}
                disabled={!isEditing || loading}
                placeholder="Emergency contact"
              />
            </label>
            <label>
              Address
              <input
                value={contact.addressLine}
                onChange={(e) => setContact((p) => ({ ...p, addressLine: e.target.value }))}
                disabled={!isEditing || loading}
                placeholder="Address line"
              />
            </label>
            <div className="two-col">
              <label>
                City
                <input
                  value={contact.city}
                  onChange={(e) => setContact((p) => ({ ...p, city: e.target.value }))}
                  disabled={!isEditing || loading}
                  placeholder="City"
                />
              </label>
              <label>
                Pincode
                <input
                  value={contact.pincode}
                  onChange={(e) => setContact((p) => ({ ...p, pincode: e.target.value }))}
                  disabled={!isEditing || loading}
                  placeholder="Pincode"
                />
              </label>
            </div>
            <label>
              District
              <input
                value={contact.district}
                onChange={(e) => setContact((p) => ({ ...p, district: e.target.value }))}
                disabled={!isEditing || loading}
                placeholder="District"
              />
            </label>

            {isEditing && (
              <button className="mobile-profile-btn" onClick={onSaveContact} disabled={loading} type="button">
                {loading ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        <div className="mobile-profile-card">
          <div className="mobile-profile-section-title">Security</div>
          <div className="mobile-profile-form">
            <label>
              Current Password
              <input
                type="password"
                value={pwd.currentPassword}
                onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))}
                disabled={loading}
              />
            </label>
            <label>
              New Password
              <input
                type="password"
                value={pwd.newPassword}
                onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))}
                disabled={loading}
              />
            </label>
            <label>
              Confirm Password
              <input
                type="password"
                value={pwd.confirmPassword}
                onChange={(e) => setPwd((p) => ({ ...p, confirmPassword: e.target.value }))}
                disabled={loading}
              />
            </label>
            <button className="mobile-profile-btn" onClick={onChangePassword} disabled={loading} type="button">
              {loading ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        </div>

        <button className="mobile-profile-btn danger" onClick={handleLogout} type="button">
          Logout
        </button>
      </div>
    </MobileLayout>
  );
};

export default MobileProfilePage;

