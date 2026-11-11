import React from 'react';

export const Badge = ({
  children,
  variant = 'default', // 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'accent' | 'neutral'
  size = 'md',        // 'sm' | 'md'
  dot = false,
  icon,
  className = '',
  ...props
}) => {
  const baseClass = 'ui-badge';
  const variantClass = `ui-badge--${variant}`;
  const sizeClass = `ui-badge--${size}`;

  const combinedClass = [baseClass, variantClass, sizeClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={combinedClass} {...props}>
      {dot && <span className="ui-badge-dot" aria-hidden="true" />}
      {icon && <span className="ui-badge-icon" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
