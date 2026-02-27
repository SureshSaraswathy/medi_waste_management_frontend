import { FormEvent, useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetHCFPasswordWithToken } from '../../services/hcfAuthService';
import './loginPage.css';

const HCFResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const onSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setError(null);
    setSuccess(false);

    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    if (!newPassword || newPassword.trim().length === 0) {
      setError('Please enter a new password');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetHCFPasswordWithToken({ token, newPassword });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err) {
      setError((err as Error).message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-template">
      <div className="login-template-wrapper">
        <div className="login-left-panel">
          <div className="left-panel-header">
            <h1 className="left-panel-title">Medi Waste Management System</h1>
            <p className="left-panel-subtitle">Reset Your Password</p>
          </div>
        </div>

        <div className="login-right-panel">
          <div className="login-form-wrapper">
            <h2 className="login-form-title">Reset Password</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
              Enter your new password below.
            </p>

            {success ? (
              <div style={{ padding: '20px', backgroundColor: '#d1fae5', borderRadius: '8px', marginBottom: '20px' }}>
                <p style={{ color: '#065f46', margin: 0 }}>
                  Password reset successfully! Redirecting to login page...
                </p>
              </div>
            ) : (
              <form className="login-form" onSubmit={onSubmit}>
                <div className="form-field">
                  <div className="input-wrapper-icon">
                    <svg className="input-icon-left" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input-with-icon"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError(null);
                      }}
                      required
                      disabled={loading || !token}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-eye-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {showPassword ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="form-field">
                  <div className="input-wrapper-icon">
                    <svg className="input-icon-left" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-input-with-icon"
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError(null);
                      }}
                      required
                      disabled={loading || !token}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-eye-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {showConfirmPassword ? (
                          <>
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </>
                        ) : (
                          <>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </>
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="login-button" disabled={loading || !token}>
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}>
                    Back to Login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HCFResetPasswordPage;
