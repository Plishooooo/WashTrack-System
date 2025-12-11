import { useState, useEffect } from 'react';
import '../styles/Register.css';
import { showSuccessToast, showErrorToast } from '../utils/toastUtils';
import logo from '../assets/WASHTRACKLOGO.png';

function Register({ onSwitchToLogin }) {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Check if user is logged in as admin
  useEffect(() => {
    const userType = localStorage.getItem('userType');
    if (userType === 'admin') {
      setIsAdmin(true);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhoneNumber = (phone) => {
    if (!phone.trim()) return true; // Optional field
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length === 11; // Exactly 11 digits
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const validateFullName = (name) => {
    return name.trim().length >= 2;
  };

  const validateAddress = (address) => {
    if (!address.trim()) return true; // Optional
    return address.trim().length >= 5;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Full Name validation
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!validateFullName(formData.fullName)) {
      setError('Full name must be at least 2 characters');
      return;
    }

    // Email validation
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Phone number validation
    if (formData.phoneNumber && !validatePhoneNumber(formData.phoneNumber)) {
      setError('Phone number must be exactly 11 digits');
      return;
    }

    // Address validation
    if (formData.address && !validateAddress(formData.address)) {
      setError('Address must be at least 5 characters');
      return;
    }

    // Password validation
    if (!formData.password) {
      setError('Password is required');
      return;
    }

    if (!validatePassword(formData.password)) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!formData.confirmPassword) {
      setError('Please confirm your password');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:8081/signupuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.fullName,
          password: formData.password,
          email: formData.email,
          contact: formData.phoneNumber,
          address: formData.address,
          isAdmin: isAdminMode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showSuccessToast('User registered successfully!');
        setFormData({
          fullName: '',
          email: '',
          phoneNumber: '',
          address: '',
          password: '',
          confirmPassword: '',
        });
      } else {
        showErrorToast(result.error || 'An error occurred during registration');
      }
    } catch (error) {
      showErrorToast('Cannot connect to server. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="logo-section">
          <div className="logo-icon">
            <img src={logo}></img>
          </div>
          <h1>WashTrack</h1>
        </div>

        {/* Admin Mode Toggle */}
        {isAdmin && (
          <div className="admin-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${!isAdminMode ? 'active' : ''}`}
              onClick={() => {
                setIsAdminMode(false);
                setError('');
                setMessage('');
              }}
            >
              User
            </button>
            <button
              type="button"
              className={`mode-btn ${isAdminMode ? 'active' : ''}`}
              onClick={() => {
                setIsAdminMode(true);
                setError('');
                setMessage('');
              }}
            >
              Admin
            </button>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="fullName">
              Full Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              placeholder="Enter your name"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email <span className="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              placeholder="Enter your phone number"
              value={formData.phoneNumber}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Address</label>
            <input
              type="text"
              id="address"
              name="address"
              placeholder="Enter your address"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password <span className="required">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              Confirm Password <span className="required">*</span>
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="register-btn" disabled={loading}>
            {loading ? 'Registering...' : 'Create Account'}
          </button>
        </form>

        {!isAdminMode && (
          <div className="login-section">
            <p>
              Already have an account?{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchToLogin();
                }}
              >
                Login
              </a>
            </p>
          </div>
        )}
        {isAdminMode && (
          <div className="login-section">
            <p>
              Already have an account?{' '}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchToLogin();
                }}
              >
                Login
              </a>
            </p>
          </div>
        )}
        {message && <div className="success-message">{message}</div>}
      </div>
    </div>
  );
}

export default Register;
