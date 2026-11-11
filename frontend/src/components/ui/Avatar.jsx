import React, { useState } from 'react';

// Deterministic pastel color palette for initials
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  'linear-gradient(135deg, #0EA5E9 0%, #2563EB 100%)',
  'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
  'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
  'linear-gradient(135deg, #06B6D4 0%, #0284C7 100%)',
];

const getInitials = (name = '') => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getGradientForName = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
};

export const Avatar = ({
  src,
  name = 'User',
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status,      // 'online' | 'offline' | 'busy'
  shape = 'circle', // 'circle' | 'rounded'
  className = '',
  ...props
}) => {
  const [imageError, setImageError] = useState(false);

  const initials = getInitials(name);
  const background = getGradientForName(name);

  const baseClass = 'ui-avatar';
  const sizeClass = `ui-avatar--${size}`;
  const shapeClass = `ui-avatar--${shape}`;

  const combinedClass = [baseClass, sizeClass, shapeClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={combinedClass} style={!src || imageError ? { background } : undefined} title={name} {...props}>
      {src && !imageError ? (
        <img
          src={src}
          alt={name}
          className="ui-avatar-img"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="ui-avatar-initials" aria-hidden="true">
          {initials}
        </span>
      )}

      {status && (
        <span
          className={`ui-avatar-status ui-avatar-status--${status}`}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};

export default Avatar;
