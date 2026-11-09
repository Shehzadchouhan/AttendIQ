import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, LogOut, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-icon">F</div>
        <div>
          <div className="brand-title">FaceMark</div>
          <div className="brand-subtitle">Attendance System</div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/students"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Users size={20} />
          <span>Students</span>
        </NavLink>

        <NavLink
          to="/batches"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <BookOpen size={20} />
          <span>Batches</span>
        </NavLink>
      </nav>

      {/* Authenticated User Profile Badge & Logout */}
      <div className="sidebar-footer">
        <div className="user-badge">
          <div className="user-info">
            <span className="user-name">{user?.name || 'User'}</span>
            <span className={`user-role-pill ${isAdmin ? 'role-admin' : 'role-teacher'}`}>
              {isAdmin ? 'Admin' : 'Teacher'}
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
  );
};

export default Sidebar;
