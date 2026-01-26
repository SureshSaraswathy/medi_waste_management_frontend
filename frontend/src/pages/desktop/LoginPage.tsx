import { FormEvent, useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './loginPage.css';

const LoginPage = () => {
  const { login, verifyOTP, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // All hooks must be called before any conditional returns
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOTP, setShowOTP] = useState(false);
  const [otpEmail, setOtpEmail] = useState<string>('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user && !loading) {
      const redirect = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(redirect || '/dashboard', { replace: true });
    }
  }, [user, loading, navigate, location]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Show loading state while checking authentication (after all hooks are called)
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #2d3748',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ color: '#666', fontSize: '14px' }}>Loading...</p>
      </div>
    );
  }

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

  const onSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
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
        // Show OTP form on same page
        setOtpEmail(result.email);
        setShowOTP(true);
        setResendTimer(60);
      } else {
        const redirect = (location.state as { from?: { pathname: string } })?.from?.pathname;
        navigate(redirect || '/dashboard', { replace: true });
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
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const onSubmitOTP = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setError(null);
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      await verifyOTP(otpEmail, otpString);
      const redirect = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(redirect || '/dashboard', { replace: true });
    } catch (err) {
      setError((err as Error).message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-input-0')?.focus();
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

  return (
    <div className="login-page-template">
      <div className="login-template-wrapper">
        {/* Left Panel - Light Black Background with Infographic Image */}
        <div className="login-left-panel">
          <div className="left-panel-header">
            <h1 className="left-panel-title">Medi Waste Management System</h1>
            <p className="left-panel-subtitle">Streamlined healthcare waste tracking and compliance</p>
          </div>
          <div className="left-panel-image-container">
            <img 
              src="/waste-segregation-infographic.png" 
              alt="Waste Segregation Infographic - Segregation of Solid Bio-Medical Waste"
              className="left-panel-image"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const container = target.parentElement;
                if (container && !container.querySelector('.image-placeholder')) {
                  const placeholder = document.createElement('div');
                  placeholder.className = 'image-placeholder';
                  placeholder.innerHTML = `
                    <div style="color: #cbd5e0; text-align: center; padding: 40px;">
                      <p style="font-size: 18px; margin-bottom: 16px;">📋 Waste Segregation Infographic</p>
                      <p style="font-size: 14px; color: #94a3b8;">Please add the image file:</p>
                      <p style="font-size: 12px; color: #718096; margin-top: 8px;">frontend/public/waste-segregation-infographic.png</p>
                    </div>
                  `;
                  container.appendChild(placeholder);
                }
              }}
            />
          </div>
        </div>

        {/* Right Panel - White Background with Login Form */}
        <div className="login-right-panel">
          <div className="login-form-wrapper">
            <h2 className="login-form-title">{showOTP ? 'Verify OTP' : 'Log in'}</h2>

            {showOTP ? (
              /* OTP Verification Form */
              <form className="login-form otp-form-inline" onSubmit={onSubmitOTP}>
                <div className="otp-instruction">
                  {otpEmail.toLowerCase() === 'superadmin@medi-waste.io' || otpEmail.toLowerCase() === 'superadmin' ? (
                    <p>Use static OTP: <strong>123456</strong></p>
                  ) : (
                    <p>We've sent a 6-digit code to your email. Please enter it below.</p>
                  )}
                </div>

                <div className="otp-inputs-row">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-input-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="otp-input-inline"
                      value={digit}
                      onChange={(e) => handleOTPChange(index, e.target.value)}
                      onKeyDown={(e) => handleOTPKeyDown(index, e)}
                      autoFocus={index === 0}
                      disabled={loading}
                    />
                  ))}
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="login-button" disabled={loading || otp.some(d => !d)}>
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>

                <div className="otp-resend-inline">
                  <p className="otp-resend-text">
                    Didn't receive the code?{' '}
                    {resendTimer > 0 ? (
                      <span className="otp-timer">Resend in {resendTimer}s</span>
                    ) : (
                      <button type="button" className="otp-resend-link" onClick={handleResendOTP}>
                        Resend OTP
                      </button>
                    )}
                  </p>
                </div>
              </form>
            ) : (
              /* Login Form */
              <form className="login-form" onSubmit={onSubmit}>
                <div className="form-field">
                  <div className="input-wrapper-icon">
                    <svg className="input-icon-left" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <input
                      id="username"
                      type="text"
                      className="form-input-with-icon"
                      placeholder="Username or Email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null); // Clear error when user types
                      }}
                      required
                      disabled={showOTP}
                      autoComplete="username"
                      aria-label="Username or Email"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <div className="input-wrapper-icon">
                    <svg className="input-icon-left" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input-with-icon"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null); // Clear error when user types
                      }}
                      required
                      disabled={showOTP}
                      autoComplete="current-password"
                      aria-label="Password"
                    />
                    <button
                      type="button"
                      className="password-eye-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={showOTP}
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

                <div className="form-options-row">
                  <label className="remember-me-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={showOTP}
                    />
                    <span>Remember Me</span>
                  </label>
                  <Link to="/forgot-password" className="forgot-password-link">Forgot Password?</Link>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" className="login-button" disabled={loading || showOTP}>
                  {loading ? 'Logging in...' : 'Log in'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
