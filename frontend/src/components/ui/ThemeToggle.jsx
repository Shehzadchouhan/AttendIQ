import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const ThemeToggle = ({
  size = 'md', // 'sm' | 'md' | 'lg'
  showLabel = false,
  className = '',
}) => {
  const { theme, isDark, setTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`ui-theme-toggle ui-theme-toggle--${size} ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <span className="ui-theme-toggle-icon">
        {isDark ? (
          <Sun size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="ui-icon-sun" />
        ) : (
          <Moon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} className="ui-icon-moon" />
        )}
      </span>
      {showLabel && (
        <span className="ui-theme-toggle-label">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};

export const ThemeSegmentedControl = ({ className = '' }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`ui-theme-segmented ${className}`} role="radiogroup" aria-label="Theme Selection">
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        onClick={() => setTheme('light')}
        className={`ui-theme-segmented-btn ${theme === 'light' ? 'active' : ''}`}
        title="Light theme"
      >
        <Sun size={14} />
        <span>Light</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        onClick={() => setTheme('dark')}
        className={`ui-theme-segmented-btn ${theme === 'dark' ? 'active' : ''}`}
        title="Dark theme"
      >
        <Moon size={14} />
        <span>Dark</span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'system'}
        onClick={() => setTheme('system')}
        className={`ui-theme-segmented-btn ${theme === 'system' ? 'active' : ''}`}
        title="System default theme"
      >
        <Laptop size={14} />
        <span>Auto</span>
      </button>
    </div>
  );
};

export default ThemeToggle;
