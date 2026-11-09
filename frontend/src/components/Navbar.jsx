import React from 'react';
import { useAuth } from '../context/AuthContext';
import { School } from 'lucide-react';

const Navbar = () => {
  const { user } = useAuth();

  return (
    <header className="top-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <School size={20} color="var(--primary)" />
        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Tuition Center Portal (Phase 1)</span>
      </div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Logged in as: <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong>
      </div>
    </header>
  );
};

export default Navbar;
