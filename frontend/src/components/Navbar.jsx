import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, ShieldCheck, UserCheck } from 'lucide-react';
import { AttendIQIcon } from './AttendIQLogo';

const Navbar = ({ onToggleNav, isMobileOpen }) => {
  const { user, isAdmin } = useAuth();

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleNav}
          aria-label={isMobileOpen ? 'Close Navigation Drawer' : 'Open Navigation Drawer'}
        >
          <Menu size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <AttendIQIcon size={30} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <span>Attend</span>
              <span style={{ color: 'var(--primary)' }}>IQ</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '4px' }}>Portal</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.1 }}>
              Next-Gen AI Biometric Suite
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div className="navbar-user-chip">
          <div className="navbar-avatar">
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="navbar-user-details">
            <span className="navbar-user-name">{user?.name || user?.email}</span>
            <span className="navbar-user-sub">
              {isAdmin ? 'Administrator' : 'Faculty Member'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
