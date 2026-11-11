import React, { useState } from 'react';

export const Tooltip = ({
  content,
  children,
  position = 'top', // 'top' | 'bottom' | 'left' | 'right'
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  if (!content) return children;

  return (
    <div
      className="ui-tooltip-wrapper"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`ui-tooltip ui-tooltip--${position} ${className}`}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default Tooltip;
