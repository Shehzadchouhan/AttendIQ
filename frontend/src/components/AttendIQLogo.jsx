import React from 'react';

export const AttendIQIcon = ({ size = 36, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0 }}
    >
      <defs>
        {/* Main Brand Gradient */}
        <linearGradient id="attendiq-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Glow & Shadow Filter */}
        <filter id="attendiq-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#2563EB" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Rounded Squircle Background */}
      <rect
        width="44"
        height="44"
        rx="12"
        fill="url(#attendiq-gradient)"
        filter="url(#attendiq-glow)"
      />

      {/* Corner Biometric Brackets (Face Scan Frame) */}
      {/* Top Left */}
      <path
        d="M 9 15 L 9 10 A 1 1 0 0 1 10 9 L 15 9"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Top Right */}
      <path
        d="M 29 9 L 34 9 A 1 1 0 0 1 35 10 L 35 15"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Bottom Left */}
      <path
        d="M 9 29 L 9 34 A 1 1 0 0 0 10 35 L 15 35"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Bottom Right */}
      <path
        d="M 29 35 L 34 35 A 1 1 0 0 0 35 34 L 35 29"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Central Geometric "A" with Biometric Vector Points */}
      {/* Left leg of A */}
      <path
        d="M 22 13 L 14 31"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Right leg of A */}
      <path
        d="M 22 13 L 30 31"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Crossbar forming verification checkmark */}
      <path
        d="M 17 25 L 21 28 L 29 19"
        stroke="#10B981"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Facial Landmark AI Nodes */}
      {/* Apex Node */}
      <circle cx="22" cy="13" r="2.2" fill="#FFFFFF" />
      {/* Left Node */}
      <circle cx="14" cy="31" r="2.2" fill="#FFFFFF" />
      {/* Right Node */}
      <circle cx="30" cy="31" r="2.2" fill="#FFFFFF" />
      {/* AI Pulse Dot */}
      <circle cx="34" cy="10" r="1.5" fill="#34D399" />
    </svg>
  );
};

export const AttendIQLogo = ({ size = 36, subtitle = 'AI Attendance Suite' }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
      <AttendIQIcon size={size} />
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', lineHeight: 1 }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'inherit', letterSpacing: '-0.025em' }}>
            Attend
          </span>
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 900,
              background: 'linear-gradient(135deg, #38BDF8 0%, #818CF8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.025em',
            }}
          >
            IQ
          </span>
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.04em', marginTop: '3px', textTransform: 'uppercase' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendIQLogo;
