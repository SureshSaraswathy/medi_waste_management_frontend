import { FormEvent, useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './loginPageMobileFirst.css';

const LoginPageMobileFirst = () => {
  const { login, verifyOTP, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOTP, setShowOTP] = useState(false);
  const [otpEmail, setOtpEmail] = useState<string>('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);

  // Don't auto-redirect - allow login page to be shown even when logged in
  // This allows users to log in as different user or re-authenticate
  // The redirect will happen after successful login instead

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Validate username/email format
  const validateUsername = (value: string): boolean => {
    if (!value || value.trim().length === 0) {
      return false;
    }
    // Allow username (alphanumeric, underscore, hyphen) or email format
    const usernamePattern = /^[a-zA-Z0-9_-]+$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return usernamePattern.test(value.trim()) || emailPattern.test(value.trim());
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    
    // Validate username/email format
    if (!validateUsername(email)) {
      setError('Please enter a valid username or email address');
      return;
    }
    
    // Validate password
    if (!password || password.trim().length === 0) {
      setError('Please enter your password');
      return;
    }
    
    try {
      const result = await login(email.trim(), password);
      if (result.requiresOTP && result.email) {
        // Show OTP form
        setOtpEmail(result.email);
        setShowOTP(true);
        setResendTimer(60);
      } else {
        const redirect = (location.state as { from?: { pathname: string } })?.from?.pathname;
        navigate(redirect || '/mobile/home', { replace: true });
      }
    } catch (err) {
      setError((err as Error).message || 'Invalid credentials. Please check your username and password.');
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-mobile-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-mobile-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOTPSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      await verifyOTP(otpEmail, otpString);
      const redirect = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(redirect || '/mobile/home', { replace: true });
    } catch (err) {
      setError((err as Error).message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-input-mobile-0')?.focus();
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setError(null);
    try {
      await login(email, password);
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      setError((err as Error).message || 'Failed to resend OTP');
    }
  };

  // Show loading state only during initial auth check (not during login attempts)
  // Don't show loading screen if we're already showing OTP or have form data
  if (loading && !showOTP && !email && !password) {
    return (
      <div className="mobile-login-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="loading-spinner"></div>
        <p style={{ color: '#666', fontSize: '14px', marginTop: '16px' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="mobile-login-container">
      {/* Dark Header Section */}
      <header className="login-header">
        <h1 className="header-title">Medi Waste Management System</h1>
        <p className="header-subtitle">Streamlined healthcare waste tracking and compliance</p>
      </header>

      {/* Login Card */}
      <main className="login-main">
        <div className="login-card">
          <h2 className="login-card-title">{showOTP ? 'Verify OTP' : 'Log in'}</h2>

          {showOTP ? (
            /* OTP Verification Form */
            <form className="login-form" onSubmit={handleOTPSubmit}>
              <div className="otp-instruction-mobile">
                {otpEmail.toLowerCase() === 'superadmin@medi-waste.io' || otpEmail.toLowerCase() === 'superadmin' ? (
                  <p>Use static OTP: <strong>123456</strong></p>
                ) : (
                  <p>We've sent a 6-digit code to your email. Please enter it below.</p>
                )}
              </div>

              <div className="otp-inputs-row-mobile">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-input-mobile-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="otp-input-mobile"
                    value={digit}
                    onChange={(e) => handleOTPChange(index, e.target.value)}
                    onKeyDown={(e) => handleOTPKeyDown(index, e)}
                    autoFocus={index === 0}
                    disabled={loading}
                  />
                ))}
              </div>

              {error && <div className="error-message-mobile">{error}</div>}

              <button type="submit" className="login-button" disabled={loading || otp.some(d => !d)}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>

              <div className="otp-resend-mobile">
                <p className="otp-resend-text-mobile">
                  Didn't receive the code?{' '}
                  {resendTimer > 0 ? (
                    <span className="otp-timer-mobile">Resend in {resendTimer}s</span>
                  ) : (
                    <button type="button" className="otp-resend-link-mobile" onClick={handleResendOTP}>
                      Resend OTP
                    </button>
                  )}
                </p>
              </div>
            </form>
          ) : (
            /* Login Form */
            <form className="login-form" onSubmit={handleSubmit}>
              {/* Username/Email Field */}
              <div className="form-field">
                <div className="input-wrapper">
                  <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Username or Email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="form-field">
                <div className="input-wrapper">
                  <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={loading}
                  >
                    {showPassword ? (
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

              {/* Remember Me and Forgot Password */}
              <div className="form-options">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                  />
                  <span className="checkbox-text">Remember Me</span>
                </label>
                <Link to="/forgot-password" className="forgot-password-link">
                  Forgot Password?
                </Link>
              </div>

              {error && <div className="error-message-mobile">{error}</div>}

              {/* Login Button */}
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default LoginPageMobileFirst;
