import { useState } from 'react';
import '../styles/Login.css';
import logo from '../assets/WASHTRACKLOGO.png';
import { API_ENDPOINTS } from '../config';

function Login({ onSwitchToRegister, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isAdmin
        ? API_ENDPOINTS.LOGIN_ADMIN
        : API_ENDPOINTS.LOGIN_USER;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setLoading(false);
        console.log('Login successful, result:', result);

        // Store admin ID if logging in as admin
        if (isAdmin && result.user.fld_adminID) {
          console.log('Storing adminID:', result.user.fld_adminID);
          localStorage.setItem('adminID', result.user.fld_adminID);
          localStorage.setItem('adminEmail', email);
        } else if (!isAdmin && result.user.fld_userID) {
          // Store user ID if logging in as regular user
          console.log('Storing userID:', result.user.fld_userID);
          console.log('Storing userEmail:', email);
          localStorage.setItem('userID', String(result.user.fld_userID));
          localStorage.setItem('username', String(result.user.fld_username));
          localStorage.setItem('userEmail', String(email));
          console.log('LocalStorage after setting:', {
            userID: localStorage.getItem('userID'),
            username: localStorage.getItem('username'),
            userEmail: localStorage.getItem('userEmail'),
          });
        }

        // Store user type (admin or regular user)
        localStorage.setItem('userType', isAdmin ? 'admin' : 'user');

        if (onLoginSuccess) {
          onLoginSuccess(isAdmin, result.user);
        }
      } else {
        setLoading(false);
        setError('Invalid email or password');
      }
    } catch (error) {
      setLoading(false);
      setError('Cannot connect to server. Make sure backend is running.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo-section-s">
          <div className="logo-icon">
            <img src={logo}></img>
          </div>
          <h1>WashTrack</h1>
        </div>

        {error && <div className="error-message">{error}</div>}
        {message && (
          <div
            className={`message ${
              message.includes('Invalid') || message.includes('Cannot connect')
                ? 'error'
                : 'success'
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">{isAdmin ? 'Admin Email' : 'Email'}</label>
            <input
              type="email"
              id="email"
              placeholder={isAdmin ? 'Enter admin email' : 'Enter your email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="admin"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="admin">Login as Admin</label>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="register-section">
          <p>
            Don't have an account?{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSwitchToRegister();
              }}
            >
              Register
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
