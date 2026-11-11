import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
  MessageCircle
} from 'lucide-react';
import { AttendIQIcon } from '../components/AttendIQLogo';
import ThemeToggle from '../components/ui/ThemeToggle';

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [fullName, setFullName] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [phone, setPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

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
    <div className="login-split-layout">
      {/* Theme Toggle in top-right absolute position */}
      <div style={{ position: 'absolute', top: '1.25rem', right: '1.5rem', zIndex: 30 }}>
        <ThemeToggle size="sm" showLabel={false} />
      </div>

      {/* LEFT COLUMN: Animated Biometric Face Scan Hero Pane */}
      <div className="login-hero-pane">
        <div className="login-hero-header">
          <div className="login-hero-badge">
            <Sparkles size={14} />
            <span>FaceMark Neural Core v2.4</span>
          </div>
          <h1 className="login-hero-title">
            Sub-Second Biometric <span>Attendance Suite</span>
          </h1>
          <p className="login-hero-desc">
            Empower your coaching center with automated multi-face recognition, verifiable audit locks, and instant parent communication.
          </p>
        </div>

        {/* Biometric Face Scanner Stage */}
        <div className="biometric-scanner-stage">
          <div className="biometric-scanner-box">
            {/* Corner Targeting Brackets */}
            <div className="scanner-corner tl" />
            <div className="scanner-corner tr" />
            <div className="scanner-corner bl" />
            <div className="scanner-corner br" />

            {/* Moving Laser Scanner Line */}
            <div className="scanner-laser-line" />

            {/* Stylized Vector Face Wireframe */}
            <svg
              viewBox="0 0 200 200"
              width="170"
              height="170"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.85 }}
            >
              {/* Head Silhouette */}
              <path d="M100 25 C65 25 45 55 45 95 C45 135 68 175 100 175 C132 175 155 135 155 95 C155 55 135 25 100 25 Z" strokeDasharray="3 3" opacity="0.6" />
              <path d="M100 35 C72 35 55 60 55 95 C55 130 75 165 100 165 C125 165 145 130 145 95 C145 60 128 35 100 35 Z" />
              
              {/* Eye Contours */}
              <ellipse cx="78" cy="85" rx="12" ry="6" stroke="#22d3ee" />
              <circle cx="78" cy="85" r="2.5" fill="#22d3ee" />
              <ellipse cx="122" cy="85" rx="12" ry="6" stroke="#22d3ee" />
              <circle cx="122" cy="85" r="2.5" fill="#22d3ee" />

              {/* Eyebrows */}
              <path d="M68 74 Q78 70 88 74" stroke="#818cf8" strokeWidth="2" />
              <path d="M112 74 Q122 70 132 74" stroke="#818cf8" strokeWidth="2" />

              {/* Nose Bridge */}
              <path d="M100 82 L100 110 L94 116 L106 116" stroke="#818cf8" />

              {/* Mouth & Jawline landmarks */}
              <path d="M84 135 Q100 144 116 135" stroke="#22d3ee" />
              <circle cx="68" cy="98" r="2" fill="#818cf8" />
              <circle cx="132" cy="98" r="2" fill="#818cf8" />
              <circle cx="100" cy="155" r="2" fill="#818cf8" />
              <path d="M78 85 L100 110 L122 85" opacity="0.3" strokeDasharray="2 2" />
            </svg>

            {/* Telemetry Chips */}
            <div className="scanner-chip chip-top">
              <CheckCircle2 size={13} style={{ color: '#10b981' }} />
              <span>99.8% Match Confirmed</span>
            </div>
            <div className="scanner-chip chip-bottom">
              <ShieldCheck size={13} style={{ color: '#06b6d4' }} />
              <span>dlib-512D ResNet Vector</span>
            </div>
          </div>
        </div>

        {/* Feature Bullets */}
        <div className="login-hero-features">
          <div className="login-feature-item">
            <div className="login-feature-bullet">
              <Zap size={13} />
            </div>
            <span><strong>Sub-3s Attendance:</strong> Instant classroom capture via mobile camera or webcam</span>
          </div>
          <div className="login-feature-item">
            <div className="login-feature-bullet">
              <ShieldCheck size={13} />
            </div>
            <span><strong>Tamper-Proof Audit:</strong> 24h locked sessions with immutable change logs</span>
          </div>
          <div className="login-feature-item">
            <div className="login-feature-bullet">
              <MessageCircle size={13} />
            </div>
            <span><strong>Parent Alerts:</strong> 1-click WhatsApp absence alerts without third-party APIs</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Glassmorphism Authentication Form */}
      <div className="login-form-pane">
        <motion.div
          className="login-glass-card"
          style={{ maxWidth: mode === 'register' ? '460px' : '430px' }}
          animate={error ? { x: [-10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Brand & Platform Header */}
          <div className="login-brand" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-flex', marginBottom: '0.65rem' }}>
              <AttendIQIcon size={56} />
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '3px', lineHeight: 1 }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
                Attend
              </span>
              <span
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  background: 'var(--primary-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.025em',
                }}
              >
                IQ
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
              <span className="facemark-badge" style={{ fontSize: '0.65rem' }}>FaceMark</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Open AI Platform</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.4rem', fontWeight: 500 }}>
              Open AI Attendance Platform for Independent Tutors & Coaching Centers
            </p>
          </div>

          {/* Mode Switcher: Sign In vs Register */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
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
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: mode === 'login' ? 'var(--bg-card)' : 'transparent',
                color: mode === 'login' ? 'var(--primary)' : 'var(--text-secondary)',
                boxShadow: mode === 'login' ? 'var(--shadow-xs)' : 'none',
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
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                backgroundColor: mode === 'register' ? 'var(--bg-card)' : 'transparent',
                color: mode === 'register' ? 'var(--primary)' : 'var(--text-secondary)',
                boxShadow: mode === 'register' ? 'var(--shadow-xs)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <UserPlus size={15} /> Create Workspace
            </button>
          </div>

          {/* Quick-fill buttons for viva presentation (Login mode only) */}
          {mode === 'login' && (
            <div className="demo-credentials-box">
              <div className="demo-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} style={{ color: 'var(--primary)' }} />
                <span>Viva Demo Workspaces</span>
              </div>
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

          {/* Error Message Alert */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--danger-light)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* Sign In Form */
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Tutor Email Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="e.g. teacher@facemark.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                  />
                  <Mail
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  />
                  <Lock
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.8rem 1rem' }}
              >
                {loading ? 'Signing in...' : 'Sign In to Workspace'}
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            /* Self-Service Tutor Registration Form */
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
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

              <div className="form-group" style={{ marginBottom: '0.85rem' }}>
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

              <div className="register-grid-2" style={{ marginBottom: '0.85rem' }}>
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

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    className="form-input"
                    placeholder="At least 6 characters"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((prev) => !prev)}
                    title={showRegPassword ? 'Hide password' : 'Show password'}
                    aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px'
                    }}
                  >
                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', gap: '0.4rem', padding: '0.8rem 1rem' }}
              >
                <Sparkles size={16} />
                {loading ? 'Creating Workspace...' : 'Launch Tutor Workspace'}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
