import { FormEvent, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './otpVerificationPage.css';

const OTPVerificationPage = () => {
  const { sendOTP, verifyOTP, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    const stateEmail = (location.state as { email?: string })?.email;
    if (stateEmail) {
      setEmail(stateEmail);
      // OTP is already sent during loginRequest, so we don't need to send it again here
      // This prevents the OTP from being overwritten and expiring
      setResendTimer(60);
    } else {
      navigate('/login', { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setError(null);
    try {
      await sendOTP(email);
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      setError((err as Error).message || 'Failed to resend OTP');
    }
  };

  const onSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setError(null);
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      await verifyOTP(email, otpString);
      const redirect = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(redirect || '/dashboard', { replace: true });
    } catch (err) {
      setError((err as Error).message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    }
  };

  return (
    <div className="otp-verification-page">
      <div className="otp-verification-container">
        <div className="otp-header">
          <h2 className="otp-title">Verify Your Email</h2>
          <p className="otp-subtitle">
            {email.toLowerCase() === 'superadmin@medi-waste.io' || email.toLowerCase() === 'superadmin' ? (
              <>Use static OTP: <strong>123456</strong></>
            ) : (
              <>We've sent a 6-digit code to your email. Please enter it below.</>
            )}
          </p>
        </div>

        <form className="otp-form" onSubmit={onSubmit}>
          <div className="otp-inputs-container">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                className="otp-input"
                value={digit}
                onChange={(e) => handleOTPChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                autoFocus={index === 0}
                disabled={loading}
              />
            ))}
          </div>

          {error && <div className="otp-error">{error}</div>}

          <button type="submit" className="otp-submit-button" disabled={loading || otp.some(d => !d)}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>

          <div className="otp-resend">
            <p className="otp-resend-text">
              Didn't receive the code?{' '}
              {resendTimer > 0 ? (
                <span className="otp-timer">Resend in {resendTimer}s</span>
              ) : (
                <button type="button" className="otp-resend-button" onClick={handleResendOTP}>
                  Resend OTP
                </button>
              )}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OTPVerificationPage;
