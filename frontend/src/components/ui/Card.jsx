import React, { forwardRef } from 'react';

export const Card = forwardRef(({
  children,
  variant = 'default', // 'default' | 'glass' | 'subtle' | 'interactive' | 'gradient'
  padding = 'md',      // 'none' | 'sm' | 'md' | 'lg'
  glow = false,
  hoverLift = false,
  className = '',
  ...props
}, ref) => {
  const baseClass = 'ui-card';
  const variantClass = `ui-card--${variant}`;
  const paddingClass = `ui-card--pad-${padding}`;
  const glowClass = glow ? 'ui-card--glow' : '';
  const liftClass = hoverLift ? 'ui-card--hover-lift' : '';

  const combinedClass = [baseClass, variantClass, paddingClass, glowClass, liftClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={ref} className={combinedClass} {...props}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export const CardHeader = ({ title, subtitle, action, className = '', children, ...props }) => (
  <div className={`ui-card-header ${className}`} {...props}>
    {title || subtitle ? (
      <div>
        {title && <h3 className="ui-card-title">{title}</h3>}
        {subtitle && <p className="ui-card-subtitle">{subtitle}</p>}
      </div>
    ) : children}
    {action && <div className="ui-card-action">{action}</div>}
  </div>
);

export const CardBody = ({ children, className = '', ...props }) => (
  <div className={`ui-card-body ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div className={`ui-card-footer ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
