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
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
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

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name}!</h1>
          <p className="page-subtitle">
            AttendIQ Smart Biometric Attendance Suite • AI Recognition & Real-Time Analytics
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

          <div className="table-responsive">
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
                </tr>
              </thead>
              <tbody>
                {dashboardSummary.low_attendance_students.map((stu) => (
                  <tr key={stu.student_id}>
                    <td>
                      <strong>{stu.roll_number}</strong>
                    </td>
                    <td>{stu.full_name}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
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
