import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Shield, CheckCircle, Database, Server } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    studentsCount: 0,
    batchesCount: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [studentsRes, batchesRes] = await Promise.all([
          apiClient.get('/students/?limit=1'),
          apiClient.get('/batches/'),
        ]);

        // Get total counts
        const allStudentsRes = await apiClient.get('/students/?limit=500');
        setStats({
          studentsCount: allStudentsRes.data.length,
          batchesCount: batchesRes.data.length,
          loading: false,
        });
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name}!</h1>
          <p className="page-subtitle">
            FaceMark Tuition Attendance System • Phase 1 Core Infrastructure
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Users size={24} />
          </div>
          <div>
            <div className="stat-value">
              {stats.loading ? '...' : stats.studentsCount}
            </div>
            <div className="stat-label">Enrolled Students</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon indigo">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="stat-value">
              {stats.loading ? '...' : stats.batchesCount}
            </div>
            <div className="stat-label">Active Batches</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <Shield size={24} />
          </div>
          <div>
            <div className="stat-value" style={{ textTransform: 'capitalize' }}>
              {user?.role}
            </div>
            <div className="stat-label">Current Role Privileges</div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 700 }}>
          Quick Navigation
        </h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/students" className="btn btn-primary">
            <Users size={16} /> Manage Students
          </Link>
          <Link to="/batches" className="btn btn-secondary">
            <BookOpen size={16} /> Manage Batches & Enrollments
          </Link>
        </div>
      </div>

      {/* Viva / Project Overview Card */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={20} color="var(--success)" />
          Phase 1 Architecture Status & Viva Reference
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          This system implements Phase 1 of FaceMark according to the modular relational schema:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <Server size={16} color="var(--primary)" /> FastAPI & Synchronous SQLAlchemy
            </h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Uses synchronous database sessions with clean, educational <code>def</code> route handlers, bcrypt password verification, and JWT Bearer token RBAC.
            </p>
          </div>

          <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <Database size={16} color="var(--primary)" /> 7 Normalized PostgreSQL Tables
            </h4>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Tables: <code>users</code>, <code>students</code>, <code>batches</code>, <code>enrollments</code>, <code>face_embeddings</code>, <code>attendance_sessions</code>, and <code>attendance_records</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
