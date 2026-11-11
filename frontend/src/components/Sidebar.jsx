import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Camera,
  BarChart2,
  LogOut,
  MessageSquare,
  UserCheck,
  X,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { AttendIQLogo } from './AttendIQLogo';
import ThemeToggle from './ui/ThemeToggle';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/batches', label: 'Batches', icon: BookOpen },
  { to: '/attendance', label: 'Take Attendance', icon: Camera },
  { to: '/reports', label: 'Reports', icon: BarChart2 },
  { to: '/chat', label: 'Tutor Community', icon: MessageSquare },
  { to: '/profile', label: 'My Profile', icon: UserCheck },
];

const Sidebar = ({ isMobileOpen = false, onClose = () => {} }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (onClose) onClose();
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const handleProfileClick = () => {
    navigate('/profile');
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        className={`sidebar-backdrop ${isMobileOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-header">
          <AttendIQLogo size={34} subtitle="AI Biometrics" />
          {/* Mobile Close Button */}
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close Navigation Menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={handleNavClick}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={19} />
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeSidebarPill"
                        className="nav-active-pill"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* System Online Pill indicator */}
        <div className="sidebar-system-status">
          <div className="pulse-dot-green" />
          <span>AttendIQ Tutor Network</span>
        </div>

        {/* Authenticated User Profile Badge & Logout */}
        <div className="sidebar-footer">
          <div className="user-badge">
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, cursor: 'pointer' }}
              onClick={handleProfileClick}
              title="Open My Profile"
            >
              <div className="navbar-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="user-info" style={{ minWidth: 0 }}>
                <span className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name || user?.email || 'User'}
                </span>
                <span className="user-role-pill role-teacher" style={{ alignSelf: 'flex-start', marginTop: '2px' }}>
                  <ShieldCheck size={10} style={{ marginRight: '2px' }} />
                  Verified Tutor
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
              <ThemeToggle size="sm" showLabel={false} />
              <button
                onClick={handleLogout}
                className="btn-logout"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
