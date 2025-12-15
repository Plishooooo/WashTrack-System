import { useState, useEffect } from 'react';
import '../styles/VerificationCodeModal.css';
import { showErrorToast, showSuccessToast } from '../utils/toastUtils';
import { API_ENDPOINTS } from '../config';

function VerificationCodeModal({ email, onVerified, onCancel, isOpen }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only digits
    if (value.length <= 5) {
      setCode(value);
      setError('');
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!code) {
      setError('Please enter the verification code');
      return;
    }

    if (code.length !== 5) {
      setError('Verification code must be 5 digits');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.VERIFY_CODE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: code,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onVerified();
      } else {
        setError(result.error || 'Invalid verification code');
      }
    } catch (error) {
      setError('Failed to verify code. Please try again.');
      console.error('Verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError('');

    try {
      const response = await fetch(API_ENDPOINTS.SEND_VERIFICATION_CODE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast('Verification code resent!');
        setCode('');
        setTimeLeft(600);
      } else {
        setError(result.error || 'Failed to resend code');
      }
    } catch (error) {
      setError('Failed to resend code');
      console.error('Resend error:', error);
    } finally {
      setResendLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="verification-modal">
        <h2>Verify Your Email</h2>
        <p>A 5-digit code has been sent to:</p>
        <p className="email-display">{email}</p>

        <form onSubmit={handleVerify}>
          <div className="code-input-group">
            <label htmlFor="code">Enter Verification Code</label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={handleCodeChange}
              placeholder="00000"
              maxLength="5"
              className={`code-input ${code.length === 5 ? 'complete' : ''}`}
            />
            <p className="code-hint">Exactly 5 digits</p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="timer">
            <p>Code expires in: <span className={timeLeft < 60 ? 'urgent' : ''}>{formatTime(timeLeft)}</span></p>
          </div>

          <button
            type="submit"
            className="verify-btn"
            disabled={loading || code.length !== 5 || timeLeft === 0}
          >
            {loading ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        <div className="modal-footer">
          <button
            type="button"
            className="resend-btn"
            onClick={handleResend}
            disabled={resendLoading}
          >
            {resendLoading ? 'Resending...' : 'Resend Code'}
          </button>
          <button
            type="button"
            className="cancel-btn"
            onClick={onCancel}
            disabled={loading || resendLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default VerificationCodeModal;
