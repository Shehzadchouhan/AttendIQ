import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Camera,
  MessageSquare,
} from 'lucide-react';

const BottomNav = () => {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `bottom-nav-item ${isActive ? 'active' : ''}`
        }
      >
        <div className="bottom-nav-icon">
          <LayoutDashboard size={20} />
        </div>
        <span className="bottom-nav-label">Home</span>
      </NavLink>

      <NavLink
        to="/students"
        className={({ isActive }) =>
          `bottom-nav-item ${isActive ? 'active' : ''}`
        }
      >
        <div className="bottom-nav-icon">
          <Users size={20} />
        </div>
        <span className="bottom-nav-label">Students</span>
      </NavLink>

      {/* Primary Highlighted Action: Take Attendance */}
      <NavLink
        to="/attendance"
        className={({ isActive }) =>
          `bottom-nav-item bottom-nav-center ${isActive ? 'active' : ''}`
        }
      >
        <div className="bottom-nav-center-bubble">
          <Camera size={22} />
        </div>
        <span className="bottom-nav-label">Attend</span>
      </NavLink>

      <NavLink
        to="/batches"
        className={({ isActive }) =>
          `bottom-nav-item ${isActive ? 'active' : ''}`
        }
      >
        <div className="bottom-nav-icon">
          <BookOpen size={20} />
        </div>
        <span className="bottom-nav-label">Batches</span>
      </NavLink>

      <NavLink
        to="/chat"
        className={({ isActive }) =>
          `bottom-nav-item ${isActive ? 'active' : ''}`
        }
      >
        <div className="bottom-nav-icon" style={{ position: 'relative' }}>
          <MessageSquare size={20} />
          <span
            style={{
              position: 'absolute',
              top: '-1px',
              right: '-3px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#10b981'
            }}
          />
        </div>
        <span className="bottom-nav-label">Chat</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
