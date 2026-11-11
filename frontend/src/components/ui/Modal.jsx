import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton = true,
  className = '',
}) => {
  const modalRef = useRef(null);

  // Close on Escape & Lock body scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="ui-modal-portal" role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined}>
          {/* Glassmorphic Backdrop */}
          <motion.div
            className="ui-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal Card */}
          <div className="ui-modal-wrapper" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
            <motion.div
              ref={modalRef}
              className={`ui-modal-content ui-modal-content--${size} ${className}`}
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            >
              {(title || showCloseButton) && (
                <div className="ui-modal-header">
                  <div>
                    {title && <h3 id="modal-title" className="ui-modal-title">{title}</h3>}
                    {description && <p className="ui-modal-description">{description}</p>}
                  </div>
                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="ui-modal-close-btn"
                      aria-label="Close dialog"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              )}

              <div className="ui-modal-body">
                {children}
              </div>

              {footer && (
                <div className="ui-modal-footer">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
