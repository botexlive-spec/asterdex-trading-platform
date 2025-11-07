/**
 * Login Page
 * User and Admin authentication
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { signIn } from '../../services/auth.service';
import { validateEmail, validateRequired } from '../../utils/validation';
import { UserRole } from '../../types/auth.types';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [rememberMe, setRememberMe] = useState(false);
  const [isQuickFilling, setIsQuickFilling] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validation
    const errors: Record<string, string> = {};

    // Validate email
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid && emailValidation.message) {
      errors.email = emailValidation.message;
    }

    // Validate password
    const passwordValidation = validateRequired(formData.password, 'Password');
    if (!passwordValidation.isValid && passwordValidation.message) {
      errors.password = passwordValidation.message;
    }

    // If there are validation errors, set them and stop
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const response = await signIn({
        email: formData.email,
        password: formData.password,
      });

      // Store auth token and user data
      if (rememberMe) {
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('refreshToken', response.refreshToken || response.token);
      } else {
        sessionStorage.setItem('auth_token', response.token);
        sessionStorage.setItem('user', JSON.stringify(response.user));
        sessionStorage.setItem('refreshToken', response.refreshToken || response.token);
      }

      // Update AuthContext state immediately
      checkAuth();

      // Redirect based on user role
      const userRole = response.user.role;
      if (userRole === UserRole.ADMIN || userRole === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);

      // Provide specific error messages
      let errorMessage = 'Login failed. Please try again.';

      if (err.message?.includes('fetch')) {
        errorMessage = 'Unable to connect to server. Please ensure the database is set up correctly.';
      } else if (err.message?.includes('Invalid login')) {
        errorMessage = 'Invalid email or password. Please check your credentials.';
      } else if (err.message?.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email before logging in.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Clear error when user starts typing
    if (error) setError(null);

    // Clear field error when user starts correcting input
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleQuickLogin = (email: string, password: string) => {
    setIsQuickFilling(true);
    setError(null);
    setFormData({
      email,
      password,
    });
    // Reset flag after a brief moment
    setTimeout(() => setIsQuickFilling(false), 100);
  };

  return (
    <div className="login-page">
      {/* Home Navigation */}
      <button
        onClick={() => navigate('/')}
        className="home-button"
        aria-label="Go to homepage"
      >
        ← Back to Home
      </button>

      <div className="login-container">
        <div className="login-card">
          {/* Logo - Clickable */}
          <div className="login-header">
            <h1 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              🚀 Finaster
            </h1>
            <p>Sign in to your account</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">
                Email Address <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
                autoComplete="email"
                disabled={loading}
                className={fieldErrors.email ? 'error' : ''}
              />
              {fieldErrors.email && (
                <small className="error-message">{fieldErrors.email}</small>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password <span className="required">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                disabled={loading}
                className={fieldErrors.password ? 'error' : ''}
              />
              {fieldErrors.password && (
                <small className="error-message">{fieldErrors.password}</small>
              )}
            </div>

            <div className="form-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <a href="/forgot-password" className="forgot-link">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="btn-login"
              disabled={loading}
            >
              {loading ? (
                <span className="loading-spinner">Loading...</span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Quick Login Buttons (Development Only) */}
          <div className="quick-login">
            <p className="divider">Quick Login (Dev Mode)</p>
            <div className="quick-buttons">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@finaster.com', 'admin123')}
                className="btn-quick admin"
                disabled={loading}
              >
                👨‍💼 Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('user@finaster.com', 'user123')}
                className="btn-quick user"
                disabled={loading}
              >
                👤 User
              </button>
            </div>
          </div>

          {/* Register Link */}
          <div className="login-footer">
            <p>
              Don't have an account?{' '}
              <a href="/register">Sign up here</a>
            </p>
          </div>
        </div>

        {/* Info Panel */}
        <div className="info-panel">
          <h2>Welcome to Finaster</h2>
          <p>Professional MLM Platform with DEX Trading Integration</p>

          <div className="features">
            <div className="feature">
              <span className="icon">💰</span>
              <h3>30-Level Income</h3>
              <p>Earn from 30 levels deep</p>
            </div>
            <div className="feature">
              <span className="icon">🎯</span>
              <h3>Binary Matching</h3>
              <p>Up to $21M bonuses</p>
            </div>
            <div className="feature">
              <span className="icon">📈</span>
              <h3>DEX Trading</h3>
              <p>Integrated trading terminal</p>
            </div>
            <div className="feature">
              <span className="icon">🏆</span>
              <h3>Rank Rewards</h3>
              <p>10 ranks with rewards</p>
            </div>
          </div>

          <div className="test-credentials">
            <h4>🔑 Test Credentials</h4>
            <div className="credential-box">
              <p><strong>Admin:</strong></p>
              <p>Email: admin@finaster.com</p>
              <p>Password: admin123</p>
            </div>
            <div className="credential-box">
              <p><strong>User:</strong></p>
              <p>Email: user@finaster.com</p>
              <p>Password: user123</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
        }

        .home-button {
          position: absolute;
          top: 20px;
          left: 20px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
          z-index: 10;
        }

        .home-button:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateX(-2px);
        }

        .login-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          max-width: 1200px;
          width: 100%;
        }

        @media (max-width: 968px) {
          .login-container {
            grid-template-columns: 1fr;
          }
          .info-panel {
            display: none;
          }
        }

        .login-card {
          background: white;
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .login-header h1 {
          font-size: 32px;
          margin: 0 0 10px 0;
          color: #333;
        }

        .login-header p {
          color: #666;
          margin: 0;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .alert-error {
          background: #fee;
          border: 1px solid #fcc;
          color: #c33;
        }

        .login-form {
          margin-bottom: 30px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          color: #333;
          font-weight: 600;
        }

        .form-group label .required {
          color: #ef4444;
          margin-left: 2px;
        }

        .form-group input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 16px;
          transition: all 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-group input.error {
          border-color: #ef4444;
          background-color: #fef2f2;
        }

        .form-group input.error:focus {
          border-color: #dc2626;
        }

        .form-group small.error-message {
          display: block;
          margin-top: 5px;
          color: #ef4444;
          font-size: 12px;
          font-weight: 500;
        }

        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .forgot-link {
          color: #667eea;
          text-decoration: none;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        .btn-login {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .btn-login:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .btn-login:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .quick-login {
          border-top: 1px solid #e0e0e0;
          padding-top: 20px;
          margin-top: 20px;
        }

        .divider {
          text-align: center;
          color: #666;
          font-size: 14px;
          margin-bottom: 15px;
        }

        .quick-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .btn-quick {
          padding: 10px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-quick.admin {
          border-color: #ff6b6b;
        }

        .btn-quick.admin:hover {
          background: #ff6b6b;
          color: white;
        }

        .btn-quick.user {
          border-color: #4ecdc4;
        }

        .btn-quick.user:hover {
          background: #4ecdc4;
          color: white;
        }

        .login-footer {
          text-align: center;
          margin-top: 20px;
          color: #666;
        }

        .login-footer a {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }

        .info-panel {
          color: white;
          padding: 40px;
        }

        .info-panel h2 {
          font-size: 36px;
          margin: 0 0 10px 0;
        }

        .features {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 30px 0;
        }

        .feature {
          background: rgba(255, 255, 255, 0.1);
          padding: 20px;
          border-radius: 12px;
          backdrop-filter: blur(10px);
        }

        .feature .icon {
          font-size: 32px;
          display: block;
          margin-bottom: 10px;
        }

        .feature h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
        }

        .feature p {
          margin: 0;
          opacity: 0.9;
          font-size: 14px;
        }

        .test-credentials {
          background: rgba(255, 255, 255, 0.1);
          padding: 20px;
          border-radius: 12px;
          backdrop-filter: blur(10px);
          margin-top: 30px;
        }

        .test-credentials h4 {
          margin: 0 0 15px 0;
        }

        .credential-box {
          background: rgba(0, 0, 0, 0.2);
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 10px;
        }

        .credential-box p {
          margin: 5px 0;
          font-family: monospace;
        }

        .loading-spinner {
          display: inline-block;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
