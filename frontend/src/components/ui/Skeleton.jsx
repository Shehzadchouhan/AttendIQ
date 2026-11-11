import React from 'react';

export const Skeleton = ({
  variant = 'text', // 'text' | 'circular' | 'rectangular' | 'card'
  width,
  height,
  className = '',
  count = 1,
  ...props
}) => {
  const baseClass = 'ui-skeleton';
  const variantClass = `ui-skeleton--${variant}`;

  const style = {
    width,
    height,
  };

  if (count > 1) {
    return (
      <div className="ui-skeleton-group" role="status" aria-label="Loading content...">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`${baseClass} ${variantClass} ${className}`}
            style={style}
            {...props}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading content..."
      className={`${baseClass} ${variantClass} ${className}`}
      style={style}
      {...props}
    />
  );
};

export default Skeleton;
