import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './loginPageMobile.css';

const LoginPageMobile = () => {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setError(null);
    try {
      // Use name as email for login (or adapt based on your auth logic)
      await login(name, password);
      const redirect = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(redirect || '/dashboard', { replace: true });
    } catch (err) {
      setError((err as Error).message || 'Unable to login');
    }
  };

  return (
    <div className="mobile-login-page">
      {/* Header Section - Dark Background with Logo */}
      <div className="mobile-login-header">
        <div className="header-pattern"></div>
        <div className="logo-container">
          <div className="logo-square">
            <svg className="logo-icon" viewBox="0 0 100 100" fill="none">
              {/* Stylized arrow/tie logo */}
              <path d="M50 20 L35 50 L50 60 L65 50 Z" fill="#1e293b" />
              <path d="M50 60 L50 80 L45 75 L50 70 L55 75 Z" fill="#1e293b" />
            </svg>
          </div>
        </div>
      </div>

      {/* Content Section - Login Form */}
      <div className="mobile-login-content">
        <div className="login-form-wrapper">
          <h1 className="login-title-mobile">Login</h1>
          <p className="login-subtitle-mobile">Sign in to continue.</p>

          <form className="mobile-login-form" onSubmit={onSubmit}>
            <div className="form-field-mobile">
              <label htmlFor="name" className="field-label-mobile">NAME</label>
              <input
                id="name"
                type="text"
                className="form-input-mobile"
                placeholder="Jiara Martins"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-field-mobile">
              <label htmlFor="password-mobile" className="field-label-mobile">PASSWORD</label>
              <input
                id="password-mobile"
                type="password"
                className="form-input-mobile"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="error-message-mobile">{error}</div>}

            <button type="submit" className="login-button-mobile" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <div className="login-links-mobile">
            <Link to="/forgot-password" className="link-mobile">Forgot Password?</Link>
            <Link to="/signup" className="link-mobile">Signup !</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPageMobile;
