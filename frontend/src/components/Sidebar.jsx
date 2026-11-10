import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Camera,
  BarChart2,
  LogOut,
  ShieldCheck,
  UserCheck,
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AttendIQLogo } from './AttendIQLogo';

const Sidebar = ({ isMobileOpen = false, onClose = () => {} }) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
    if (onClose) onClose();
  };

  const handleNavClick = () => {
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
        <div className="sidebar-header" style={{ justifyContent: 'space-between' }}>
          <AttendIQLogo size={36} subtitle="Smart Attendance" />
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
          <NavLink
            to="/"
            end
            onClick={handleNavClick}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/students"
            onClick={handleNavClick}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Users size={19} />
            <span>Students</span>
          </NavLink>

          <NavLink
            to="/batches"
            onClick={handleNavClick}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <BookOpen size={19} />
            <span>Batches</span>
          </NavLink>

          <NavLink
            to="/attendance"
            onClick={handleNavClick}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Camera size={19} />
            <span>Take Attendance</span>
          </NavLink>

          <NavLink
            to="/reports"
            onClick={handleNavClick}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <BarChart2 size={19} />
            <span>Reports</span>
          </NavLink>
        </nav>

        {/* System Online Pill indicator */}
        <div className="sidebar-system-status">
          <div className="pulse-dot-green" />
          <span>AI Face Engine Online</span>
        </div>

        {/* Authenticated User Profile Badge & Logout */}
        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-info">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className={`user-role-pill ${isAdmin ? 'role-admin' : 'role-teacher'}`}>
                {isAdmin ? 'Admin' : 'Faculty'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="btn-logout"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
