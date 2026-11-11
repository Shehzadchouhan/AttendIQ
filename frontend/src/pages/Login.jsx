import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight, UserPlus, LogIn, Building2, Phone, Sparkles } from 'lucide-react';
import { AttendIQIcon } from '../components/AttendIQLogo';

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [fullName, setFullName] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [phone, setPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error('Login error', err);
      setError(
        err.response?.data?.detail || 'Failed to authenticate. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({
        full_name: fullName.trim(),
        institution_name: institutionName.trim() || undefined,
        email: regEmail.trim(),
        password: regPassword,
        phone: phone.trim() || undefined,
      });
      navigate('/');
    } catch (err) {
      console.error('Registration error', err);
      setError(
        err.response?.data?.detail || 'Failed to create tutor workspace. Please verify your details.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPassword) => {
    setMode('login');
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="login-screen">
      <div className="login-card" style={{ maxWidth: mode === 'register' ? '460px' : '420px', transition: 'all 0.3s ease' }}>
        <div className="login-brand">
          <div style={{ display: 'inline-flex', marginBottom: '0.85rem' }}>
            <AttendIQIcon size={64} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '3px', lineHeight: 1 }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
              Attend
            </span>
            <span
              style={{
                fontSize: '1.75rem',
                fontWeight: 900,
                background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.025em',
              }}
            >
              IQ
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.35rem', fontWeight: 500 }}>
            Open AI Attendance Platform for Independent Tutors & Coaching Centers
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Register */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            borderRadius: '10px',
            padding: '4px',
            marginBottom: '1.25rem',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: mode === 'login' ? '#ffffff' : 'transparent',
              color: mode === 'login' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: mode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <LogIn size={15} /> Tutor Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              backgroundColor: mode === 'register' ? '#ffffff' : 'transparent',
              color: mode === 'register' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: mode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            <UserPlus size={15} /> Create Workspace
          </button>
        </div>

        {/* Quick-fill buttons for viva presentation (Login mode only) */}
        {mode === 'login' && (
          <div className="demo-credentials-box">
            <div className="demo-title">Viva Demo Workspaces</div>
            <div className="demo-btn-group" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuickFill('admin@facemark.local', 'admin123')}
              >
                Admin
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuickFill('teacher@facemark.local', 'teacher123')}
                title="Prof. Rajesh Sharma (Sharma Mathematics Academy)"
              >
                Prof. Sharma
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleQuickFill('neha.kapoor@facemark.local', 'teacher123')}
                title="Dr. Neha Kapoor (Kapoor Science Institute)"
              >
                Dr. Kapoor
              </button>
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--danger-light)',
              color: 'var(--danger)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {mode === 'login' ? (
          /* Sign In Form */
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">Tutor Email Address</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="e.g. teacher@facemark.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem' }}
            >
              {loading ? 'Signing in...' : 'Sign In to Workspace'}
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          /* Self-Service Tutor Registration Form */
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label className="form-label">Your Full Name *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Prof. Rajesh Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tuition / Coaching Center Name *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Sharma Mathematics Academy"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
              />
            </div>

            <div className="register-grid-2">
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="tutor@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp / Phone</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+91 9811100001"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                type="password"
                required
                minLength={6}
                className="form-input"
                placeholder="At least 6 characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem', gap: '0.4rem' }}
            >
              <Sparkles size={16} />
              {loading ? 'Creating Workspace...' : 'Launch Tutor Workspace'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
