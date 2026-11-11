import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export const Button = forwardRef(({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'danger'
  size = 'md',        // 'sm' | 'md' | 'lg' | 'icon'
  isLoading = false,
  loadingText,
  disabled = false,
  leftIcon,
  rightIcon,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  const isDisabled = disabled || isLoading;

  const baseClass = 'ui-btn';
  const variantClass = `ui-btn--${variant}`;
  const sizeClass = `ui-btn--${size}`;
  const loadingClass = isLoading ? 'ui-btn--loading' : '';

  const combinedClass = [baseClass, variantClass, sizeClass, loadingClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={combinedClass}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} className="ui-btn-spin" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="ui-btn-icon ui-btn-icon--left">{leftIcon}</span>}
          {children && <span>{children}</span>}
          {rightIcon && <span className="ui-btn-icon ui-btn-icon--right">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
