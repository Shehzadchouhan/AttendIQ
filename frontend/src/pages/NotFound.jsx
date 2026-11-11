import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft, Home, Compass } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const NotFound = () => {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <Card
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '3rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Compass size={36} />
        </div>

        <div>
          <span
            style={{
              fontSize: '3.5rem',
              fontWeight: 900,
              lineHeight: 1,
              background: 'var(--primary-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.04em',
              display: 'block',
            }}
          >
            404
          </span>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
            Page Not Found
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.4rem', lineHeight: 1.5 }}>
            The requested attendance URL or workspace view does not exist or has been relocated.
          </p>
        </div>

        <Link to="/" style={{ textDecoration: 'none', width: '100%', marginTop: '0.5rem' }}>
          <Button variant="primary" style={{ width: '100%', justifyContent: 'center' }}>
            <Home size={16} /> Return to Dashboard
          </Button>
        </Link>
      </Card>
    </div>
  );
};

export default NotFound;
