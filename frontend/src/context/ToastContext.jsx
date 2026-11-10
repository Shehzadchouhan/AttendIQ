import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Remove toast by id
  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isFadingOut: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300); // 300ms match fade-out animation
  }, []);

  // Base toast trigger
  const showToast = useCallback(
    (message, type = 'info', duration = 3500) => {
      const id = Date.now() + Math.random().toString(36).substring(2, 9);
      const newToast = { id, message, type, duration, isFadingOut: false };

      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss after duration
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  // Convenience helper functions
  const success = useCallback((msg, duration = 3500) => showToast(msg, 'success', duration), [showToast]);
  const error = useCallback((msg, duration = 4000) => showToast(msg, 'error', duration), [showToast]);
  const warning = useCallback((msg, duration = 3500) => showToast(msg, 'warning', duration), [showToast]);
  const info = useCallback((msg, duration = 3500) => showToast(msg, 'info', duration), [showToast]);

  const toastMethods = {
    show: showToast,
    success,
    error,
    warning,
    info,
    remove: removeToast,
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className="toast-icon-svg text-emerald" />;
      case 'error':
        return <AlertCircle size={18} className="toast-icon-svg text-rose" />;
      case 'warning':
        return <AlertTriangle size={18} className="toast-icon-svg text-amber" />;
      case 'info':
      default:
        return <Info size={18} className="toast-icon-svg text-sky" />;
    }
  };

  return (
    <ToastContext.Provider value={{ toast: toastMethods, showToast, success, error, warning, info }}>
      {children}

      {/* Floating Glassmorphic Toast Container (Top-Right) */}
      <div className="toast-viewport-container" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-glass-card toast-${t.type} ${t.isFadingOut ? 'toast-fade-out' : 'toast-slide-in'}`}
            style={{ '--duration': `${t.duration}ms` }}
            role="status"
          >
            <div className="toast-body">
              <div className="toast-icon-wrapper">{getIcon(t.type)}</div>
              <div className="toast-message-content">
                <span className="toast-message-text">{t.message}</span>
              </div>
              <button
                type="button"
                className="toast-close-btn"
                onClick={() => removeToast(t.id)}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
            {/* Countdown Progress Bar */}
            <div className="toast-progress-track">
              <div className="toast-progress-bar" />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
