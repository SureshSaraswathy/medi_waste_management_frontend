import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { requestHCFPasswordReset } from '../../services/hcfAuthService';
import './loginPage.css';

const HCFForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setError(null);
    setSuccess(false);

    if (!identifier || identifier.trim().length === 0) {
      setError('Please enter your HCF Code or Email');
      return;
    }

    setLoading(true);
    try {
      const result = await requestHCFPasswordReset({ identifier: identifier.trim() });
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message || 'Failed to send password reset link. Please try again.');
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
            <p className="left-panel-subtitle">HCF Password Reset</p>
          </div>
        </div>

        <div className="login-right-panel">
          <div className="login-form-wrapper">
            <h2 className="login-form-title">Forgot Password?</h2>
            <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
              Enter your HCF Code or Email address and we'll send you a link to reset your password.
            </p>

            {success ? (
              <div style={{ padding: '20px', backgroundColor: '#d1fae5', borderRadius: '8px', marginBottom: '20px' }}>
                <p style={{ color: '#065f46', margin: 0 }}>
                  If the HCF exists and login is enabled, a password reset link has been sent to your registered email.
                </p>
              </div>
            ) : (
              <form className="login-form" onSubmit={onSubmit}>
                <div className="form-field">
                  <div className="input-wrapper-icon">
                    <svg className="input-icon-left" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <input
                      type="text"
                      className="form-input-with-icon"
                      placeholder="HCF Code or Email"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        setError(null);
                      }}
                      required
                      disabled={loading}
                      autoComplete="username"
                    />
                  </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="login-button" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}>
                    Back to Login
                  </Link>
                </div>
              </form>
            )}

            {success && (
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '14px' }}>
                  Back to Login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HCFForgotPasswordPage;
