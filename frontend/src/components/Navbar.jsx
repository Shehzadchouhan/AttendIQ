import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  User,
  MessageSquare,
  Bell,
  Moon,
  Sun,
  LogOut,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AttendIQIcon } from './AttendIQLogo';
import ThemeToggle from './ui/ThemeToggle';

const Navbar = ({ onToggleNav, isMobileOpen }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotificationDetails, setShowNotificationDetails] = useState(false);
  const menuRef = useRef(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
        setShowNotificationDetails(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setShowNotificationDetails(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleNavigate = (path) => {
    setIsMenuOpen(false);
    setShowNotificationDetails(false);
    navigate(path);
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="top-navbar">
      {/* 1. LEFT SIDE: NAVIGATION ICON + LOGO + APP NAME */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Navigation Icon (Sidebar Toggle) */}
        <button
          type="button"
          className="navbar-nav-toggle-btn"
          onClick={onToggleNav}
          aria-label={isMobileOpen ? 'Close Navigation Drawer' : 'Open Navigation Drawer'}
          title="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>

        {/* Logo and Name */}
        <div
          onClick={() => handleNavigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', userSelect: 'none' }}
          title="AttendIQ Home"
        >
          <AttendIQIcon size={32} />
          <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
            Attend<span style={{ color: 'var(--primary)' }}>IQ</span>
          </span>
        </div>
      </div>

      {/* 2. RIGHT SIDE: PROFILE ICON WITH QUICK ACTIONS DROPDOWN */}
      <div style={{ position: 'relative' }} ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="navbar-profile-btn"
          aria-expanded={isMenuOpen}
          aria-label="User profile and features menu"
          title={user?.name || 'Tutor Profile'}
        >
          <div
            className="navbar-avatar"
            style={{
              width: '36px',
              height: '36px',
              fontSize: '0.9rem',
              border: isMenuOpen ? '2px solid var(--primary)' : '2px solid transparent',
              boxShadow: isMenuOpen ? '0 0 0 3px var(--primary-glow)' : 'var(--shadow-xs)',
              transition: 'all var(--transition-fast)',
            }}
          >
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          {/* Active online green dot */}
          <span
            style={{
              position: 'absolute',
              bottom: '1px',
              right: '1px',
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              border: '2px solid var(--bg-card)',
            }}
          />
        </button>

        {/* DROPDOWN MENU */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="navbar-dropdown-menu"
            >
              {/* Profile Card Summary */}
              <div
                style={{
                  padding: '0.85rem 0.9rem',
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-card-subtle)',
                  borderRadius: '10px',
                  marginBottom: '0.4rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    className="navbar-avatar"
                    style={{ width: '38px', height: '38px', fontSize: '0.95rem', flexShrink: 0 }}
                  >
                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.925rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.name || 'Verified Educator'}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user?.email || 'tutor@facemark.local'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color-subtle)' }}>
                  <span className="user-role-pill role-teacher" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                    <ShieldCheck size={10} style={{ marginRight: '3px' }} />
                    Verified Educator
                  </span>

                  <button
                    type="button"
                    onClick={() => handleNavigate('/profile')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    Edit Profile <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              {/* Action List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {/* 1. Dark Mode Toggle */}
                <div
                  className="navbar-dropdown-item"
                  onClick={toggleTheme}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  title="Switch between Light and Dark mode"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {isDark ? (
                      <Moon size={16} style={{ color: 'var(--primary)' }} />
                    ) : (
                      <Sun size={16} style={{ color: 'var(--warning)' }} />
                    )}
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Dark Appearance
                    </span>
                  </div>
                  <ThemeToggle size="sm" showLabel={false} />
                </div>

                {/* 2. Tutor Community Chat */}
                <div
                  className="navbar-dropdown-item"
                  onClick={() => handleNavigate('/chat')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                  title="Open Tutor Community Chat"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <MessageSquare size={16} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Tutor Community
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Chat</span>
                  </div>
                </div>

                {/* 3. System Notifications */}
                <div
                  className="navbar-dropdown-item"
                  onClick={() => setShowNotificationDetails((prev) => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                  title="View system & attendance notifications"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <Bell size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Notifications
                    </span>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, backgroundColor: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 6px', borderRadius: '999px' }}>
                    Active
                  </span>
                </div>

                {/* Expandable Notification Details */}
                {showNotificationDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      padding: '0.65rem 0.75rem',
                      backgroundColor: 'var(--bg-card-subtle)',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                      Face Biometrics Engine Active
                    </div>
                    <div>DPDP Act 2023 compliance verification enabled. All attendance sessions logged with audit integrity.</div>
                  </motion.div>
                )}

                {/* 4. Full Profile Page Link */}
                <div
                  className="navbar-dropdown-item"
                  onClick={() => handleNavigate('/profile')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  <User size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    My Credentials & Academy
                  </span>
                </div>
              </div>

              {/* Divider & Sign Out */}
              <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.4rem', paddingTop: '0.4rem' }}>
                <div
                  className="navbar-dropdown-item-danger"
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: 'var(--danger)',
                  }}
                  title="Sign out of AttendIQ"
                >
                  <LogOut size={16} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    Sign Out
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Navbar;
