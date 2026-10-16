import React, { useState } from 'react';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { playMechanicalClick, playSuccessChime } from '../audio/soundEffects';

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    playMechanicalClick();

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.user) {
          playSuccessChime();
          onLogin(data.user);
        } else {
          setErrorMessage('Invalid authentication response.');
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(errData.detail || 'Invalid credentials. Please verify your username and password.');
      }
    } catch (err) {
      setErrorMessage('Authentication service offline. Please check backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-portal-wrapper">
      <div className="login-portal-bg-decorations">
        <div className="login-ambient-orb orb-1" />
        <div className="login-ambient-orb orb-2" />
        <div className="login-grid-overlay" />
      </div>

      <div className="login-portal-card">
        {/* Header Branding */}
        <div className="login-portal-header">
          <div className="login-logo-badge">
            <ShieldCheck size={28} color="#ff914d" />
          </div>
          <div className="login-sys-tag">A.E.G.I.S. EXECUTIVE PORTAL</div>
          <h1 className="login-title">Executive Assistant</h1>
          <p className="login-subtitle">
            Managing Director Operations & Governance Dashboard
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="login-error-alert">
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label className="login-input-label">Username</label>
            <div className="login-input-field-wrap">
              <User size={16} className="login-field-icon" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="login-input"
                autoFocus
                autoComplete="username"
              />
            </div>
          </div>

          <div className="login-input-group">
            <label className="login-input-label">Password</label>
            <div className="login-input-field-wrap">
              <Lock size={16} className="login-field-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="login-input"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="login-eye-btn"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="login-submit-btn"
          >
            <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Executive Desk'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Security & Audit Footer */}
        <div className="login-portal-footer">
          <Sparkles size={13} color="#10B981" />
          <span>Session audit logging active • All actions tracked with actor timestamp</span>
        </div>
      </div>
    </div>
  );
}
