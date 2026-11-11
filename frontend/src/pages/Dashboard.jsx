import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  Camera,
  BarChart2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import apiClient from '../api/client';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    studentsCount: 0,
    batchesCount: 0,
    loading: true,
  });

  const [dashboardSummary, setDashboardSummary] = useState({
    today_sessions_count: 0,
    today_present_count: 0,
    today_absent_count: 0,
    today_attendance_rate: 0,
    low_attendance_students: [],
    loading: true,
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [studentsRes, batchesRes, reportsRes] = await Promise.all([
          apiClient.get('/students/?limit=500'),
          apiClient.get('/batches/'),
          apiClient.get('/reports/dashboard').catch(() => ({ data: null })),
        ]);

        setStats({
          studentsCount: studentsRes.data.length,
          batchesCount: batchesRes.data.length,
          loading: false,
        });

        if (reportsRes?.data) {
          setDashboardSummary({
            ...reportsRes.data,
            loading: false,
          });
        } else {
          setDashboardSummary((prev) => ({ ...prev, loading: false }));
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        setStats((prev) => ({ ...prev, loading: false }));
        setDashboardSummary((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchDashboardData();
  }, []);

  // 1-Click WhatsApp Parent Alert
  const handleNotifyParent = (student) => {
    const parentPhone = student.parent_phone ? student.parent_phone.replace(/[^0-9]/g, '') : '';
    const parentName = student.parent_name || 'Parent / Guardian';
    const reasonText = student.is_at_risk ? ` [Status: ${student.at_risk_reason}]` : '';

    const senderName = user?.institution_name || 'AttendIQ';
    const message = `Hello ${parentName}, this is an attendance notice from ${senderName} regarding your ward ${student.full_name} (${student.roll_number}). Their overall attendance has dropped to ${student.attendance_percentage}% with ${student.absent_count} recorded absences${reasonText}. Please contact the institute faculty for assistance.`;

    if (parentPhone) {
      const waUrl = `https://wa.me/${parentPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(message);
      }
      toast.success(`WhatsApp chat opened for ${parentName} (${student.parent_phone}). Notice copied to clipboard!`);
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(message);
      }
      toast.warning(`No phone number on record for ${student.full_name}. Notice copied to clipboard!`);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {user?.institution_name ? user.institution_name : `Welcome back, ${user?.name}!`}
          </h1>
          <p className="page-subtitle">
            {user?.institution_name
              ? `Tutor Workspace (${user?.name}) • Biometric AI Attendance & Parent Alerts`
              : 'AttendIQ Smart Biometric Attendance Suite • AI Recognition & Real-Time Analytics'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/attendance" className="btn btn-primary">
            <Camera size={16} /> Take Attendance
          </Link>
          <Link to="/reports" className="btn btn-secondary">
            <BarChart2 size={16} /> View Reports
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Users size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.loading ? '...' : stats.studentsCount}</div>
            <div className="stat-label">Enrolled Students</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon indigo">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.loading ? '...' : stats.batchesCount}</div>
            <div className="stat-label">Active Batches</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <Calendar size={24} />
          </div>
          <div>
            <div className="stat-value">
              {dashboardSummary.loading ? '...' : dashboardSummary.today_sessions_count}
            </div>
            <div className="stat-label">Today's Sessions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon amber">
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="stat-value">
              {dashboardSummary.loading ? '...' : `${dashboardSummary.today_attendance_rate}%`}
            </div>
            <div className="stat-label">Today's Attendance Rate</div>
          </div>
        </div>
      </div>

      {/* Today's Attendance Overview Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="section-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Today's Attendance Overview
            </h3>
            <p className="text-muted text-sm" style={{ margin: '0.25rem 0 0 0' }}>
              Summary of all student attendance records marked today ({new Date().toLocaleDateString()}).
            </p>
          </div>
          <Link to="/attendance" className="btn btn-primary btn-sm">
            <Camera size={14} /> Record Today's Session
          </Link>
        </div>

        <div className="kpi-mini-bar" style={{ marginBottom: 0 }}>
          <div className="kpi-mini blue">
            <span className="kpi-count">{dashboardSummary.today_sessions_count}</span>
            <span className="kpi-label">Sessions Held</span>
          </div>
          <div className="kpi-mini green">
            <span className="kpi-count">{dashboardSummary.today_present_count}</span>
            <span className="kpi-label">Present Marks</span>
          </div>
          <div className="kpi-mini red">
            <span className="kpi-count">{dashboardSummary.today_absent_count}</span>
            <span className="kpi-label">Absent Marks</span>
          </div>
          <div className="kpi-mini amber">
            <span className="kpi-count">{dashboardSummary.today_attendance_rate}%</span>
            <span className="kpi-label">Attendance Rate</span>
          </div>
        </div>
      </div>

      {/* Low Attendance Student Alerts (< 75%) */}
      {dashboardSummary.low_attendance_students.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
          <div className="section-header" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} className="text-amber" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Low Attendance Alerts (&lt; 75% Threshold)
              </h3>
            </div>
            <Link to="/reports" className="btn btn-secondary btn-sm">
              View Full Analytics <ArrowRight size={14} />
            </Link>
          </div>

          <div className="table-responsive desktop-only">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Student Name</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Total Sessions</th>
                  <th>Attendance Rate</th>
                  <th>Status</th>
                  <th>Parent Alert</th>
                </tr>
              </thead>
              <tbody>
                {dashboardSummary.low_attendance_students.map((stu) => (
                  <tr key={stu.student_id}>
                    <td>
                      <strong>{stu.roll_number}</strong>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{stu.full_name}</span>
                          {stu.is_at_risk && (
                            <span
                              className="badge badge-warning"
                              style={{
                                fontSize: '0.68rem',
                                padding: '1px 5px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                backgroundColor: '#fef3c7',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                              }}
                              title={stu.at_risk_reason}
                            >
                              <AlertTriangle size={10} /> At Risk: {stu.at_risk_reason}
                            </span>
                          )}
                        </div>
                        {stu.parent_name && (
                          <div style={{ fontSize: '0.735rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Parent: {stu.parent_name} {stu.parent_phone ? `(${stu.parent_phone})` : ''}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-success">{stu.present_count}</span>
                    </td>
                    <td>
                      <span className="badge badge-danger">{stu.absent_count}</span>
                    </td>
                    <td>{stu.total_sessions}</td>
                    <td>
                      <div className="progress-container">
                        <div className="progress-bar-bg">
                          <div
                            className="progress-bar-fill danger"
                            style={{ width: `${Math.min(100, stu.attendance_percentage)}%` }}
                          ></div>
                        </div>
                        <span className="progress-text">{stu.attendance_percentage}%</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-danger">
                        <AlertTriangle size={12} /> Low (&lt; 75%)
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleNotifyParent(stu)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          backgroundColor: '#25D366',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                        title={`Click to open pre-filled WhatsApp alert to ${stu.parent_name || 'parent'}`}
                      >
                        <MessageSquare size={13} />
                        <span>Notify Parent</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Alert Cards (< 768px Viewport) */}
          <div className="mobile-alert-cards">
            {dashboardSummary.low_attendance_students.map((stu) => (
              <div key={`mob-alert-${stu.student_id}`} className="alert-mobile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span className="student-roll-chip">{stu.roll_number}</span>
                      <strong style={{ fontSize: '0.95rem' }}>{stu.full_name}</strong>
                    </div>
                    {stu.parent_name && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Parent: <strong>{stu.parent_name}</strong> {stu.parent_phone ? `(${stu.parent_phone})` : ''}
                      </div>
                    )}
                  </div>
                  <span className="badge badge-danger" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    {stu.attendance_percentage}%
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '0.5rem 0', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Attended {stu.present_count} / {stu.total_sessions} sessions ({stu.absent_count} absent)
                  </span>
                  {stu.is_at_risk && (
                    <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                      <AlertTriangle size={11} /> {stu.at_risk_reason}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleNotifyParent(stu)}
                  className="btn btn-sm"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    backgroundColor: '#25D366',
                    color: '#ffffff',
                    fontWeight: 700,
                    gap: '0.4rem',
                    padding: '0.55rem',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <MessageSquare size={15} />
                  <span>Notify Parent on WhatsApp</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <Link to="/attendance" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div className="stat-icon blue" style={{ width: 40, height: 40 }}>
              <Camera size={20} />
            </div>
            <h4 style={{ margin: 0, fontWeight: 700 }}>Take Attendance</h4>
          </div>
          <p className="text-muted text-sm" style={{ margin: 0 }}>
            Upload class photo for AI recognition or record roster manually.
          </p>
        </Link>

        <Link to="/reports" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div className="stat-icon green" style={{ width: 40, height: 40 }}>
              <BarChart2 size={20} />
            </div>
            <h4 style={{ margin: 0, fontWeight: 700 }}>Attendance Reports</h4>
          </div>
          <p className="text-muted text-sm" style={{ margin: 0 }}>
            View trend line charts, session distributions, and export CSVs.
          </p>
        </Link>

        <Link to="/students" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div className="stat-icon indigo" style={{ width: 40, height: 40 }}>
              <Users size={20} />
            </div>
            <h4 style={{ margin: 0, fontWeight: 700 }}>Student Management</h4>
          </div>
          <p className="text-muted text-sm" style={{ margin: 0 }}>
            Add students, manage face consent, and upload portrait biometrics.
          </p>
        </Link>

        <Link to="/batches" className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div className="stat-icon amber" style={{ width: 40, height: 40 }}>
              <BookOpen size={20} />
            </div>
            <h4 style={{ margin: 0, fontWeight: 700 }}>Batch Enrollments</h4>
          </div>
          <p className="text-muted text-sm" style={{ margin: 0 }}>
            Create academic batches and assign students and teachers.
          </p>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
