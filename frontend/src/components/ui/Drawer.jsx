import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const Drawer = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  placement = 'right', // 'right' | 'bottom'
  size = 'md',        // 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton = true,
  className = '',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const slideVariants = {
    right: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
    },
    bottom: {
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' },
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="ui-drawer-portal" role="dialog" aria-modal="true" aria-labelledby={title ? 'drawer-title' : undefined}>
          <motion.div
            className="ui-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            className={`ui-drawer ui-drawer--${placement} ui-drawer--${size} ${className}`}
            variants={slideVariants[placement]}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          >
            {(title || showCloseButton) && (
              <div className="ui-drawer-header">
                <div>
                  {title && <h3 id="drawer-title" className="ui-drawer-title">{title}</h3>}
                  {description && <p className="ui-drawer-description">{description}</p>}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="ui-modal-close-btn"
                    aria-label="Close panel"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            <div className="ui-drawer-body">
              {children}
            </div>

            {footer && (
              <div className="ui-drawer-footer">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Drawer;
