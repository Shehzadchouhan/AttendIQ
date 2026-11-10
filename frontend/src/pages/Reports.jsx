import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart2,
  Download,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// High-legibility custom dark glassmorphic tooltip for Recharts
const CustomDarkTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const formattedDate = label
      ? new Date(label).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : label;

    return (
      <div className="recharts-custom-tooltip">
        <div className="tooltip-header">{formattedDate}</div>
        <div className="tooltip-items">
          {payload.map((entry, index) => {
            const isRate = entry.name.toLowerCase().includes('rate') || entry.dataKey === 'attendance_rate';
            const valueDisplay = isRate ? `${entry.value}%` : `${entry.value} students`;
            const labelName = entry.name === 'attendance_rate' ? 'Attendance Rate' : entry.name;

            return (
              <div key={`tooltip-${index}`} className="tooltip-item">
                <span
                  className="tooltip-color-dot"
                  style={{ backgroundColor: entry.color || entry.stroke || entry.fill }}
                />
                <span className="tooltip-name">{labelName}:</span>
                <span className="tooltip-value">{valueDisplay}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

const Reports = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(searchParams.get('batch_id') || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchStudent, setSearchStudent] = useState('');

  // Report Data State
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch accessible batches
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await apiClient.get(isAdmin ? '/batches/?scope=all' : '/batches/');
        setBatches(res.data);
        if (res.data.length > 0 && !selectedBatchId) {
          setSelectedBatchId(res.data[0].id.toString());
        }
      } catch (err) {
        setErrorMsg('Failed to load batches.');
      }
    };
    fetchBatches();
  }, [isAdmin]);

  // 2. Fetch Report data whenever batch or dates change
  const fetchReport = async () => {
    if (!selectedBatchId) return;

    setLoading(true);
    setErrorMsg('');

    try {
      let url = `/reports/batch/${selectedBatchId}?`;
      const params = new URLSearchParams();
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const res = await apiClient.get(`${url}${params.toString()}`);
      setReportData(res.data);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.detail || 'Failed to generate attendance report.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBatchId) {
      fetchReport();
    }
  }, [selectedBatchId, fromDate, toDate]);

  // Quick Date Preset Handlers
  const handlePreset = (type) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (type === 'today') {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (type === 'week') {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      setFromDate(past7.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (type === 'month') {
      const past30 = new Date();
      past30.setDate(now.getDate() - 30);
      setFromDate(past30.toISOString().split('T')[0]);
      setToDate(todayStr);
    } else if (type === 'all') {
      setFromDate('');
      setToDate('');
    }
  };

  // CSV Export Handler
  const handleExportCSV = async () => {
    if (!selectedBatchId) return;
    setExporting(true);

    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);

      const res = await apiClient.get(`/reports/batch/${selectedBatchId}/export?${params.toString()}`, {
        responseType: 'blob',
      });

      // Create download anchor
      const blob = new Blob([res.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `batch_${selectedBatchId}_attendance_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Attendance report exported to CSV successfully.');
    } catch (err) {
      toast.error('Failed to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Filtered Students for Table
  const filteredStudents = (reportData?.students || []).filter((s) => {
    const q = searchStudent.toLowerCase();
    return s.full_name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q);
  });

  return (
    <div className="reports-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Reports & Analytics</h1>
          <p className="page-subtitle">
            Comprehensive attendance statistics, low-attendance alerts (&lt; 75%), daily trends, and CSV export.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={exporting || !reportData || reportData.total_sessions === 0}
          className="btn btn-primary"
        >
          {exporting ? (
            <>
              <RefreshCw size={16} className="spin" /> Exporting CSV...
            </>
          ) : (
            <>
              <Download size={16} /> Export to CSV
            </>
          )}
        </button>
      </div>

      {/* Filter Card */}
      <div className="card filter-card">
        <div className="filter-row">
          <div className="filter-group">
            <label>
              <Users size={16} /> Batch
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="select-input"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.subject})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>
              <Calendar size={16} /> From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="date-input"
            />
          </div>

          <div className="filter-group">
            <label>
              <Calendar size={16} /> To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="date-input"
            />
          </div>

          <div className="filter-presets">
            <span className="preset-label">Quick Presets:</span>
            <div className="preset-buttons">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handlePreset('today')}
              >
                Today
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handlePreset('week')}
              >
                Last 7 Days
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handlePreset('month')}
              >
                This Month
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => handlePreset('all')}
              >
                All Time
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Feedback */}
      {errorMsg && (
        <div className="alert alert-error">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="loading-state card">
          <RefreshCw size={32} className="spin text-primary" />
          <p>Calculating attendance statistics and visual analytics...</p>
        </div>
      ) : reportData ? (
        <>
          {/* KPI Summary Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Average Attendance</span>
                <TrendingUp size={20} className="kpi-icon blue" />
              </div>
              <div className="kpi-value text-blue">{reportData.batch_average_percentage}%</div>
              <p className="kpi-caption">Across {reportData.students.length} enrolled students</p>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Sessions Conducted</span>
                <Calendar size={20} className="kpi-icon green" />
              </div>
              <div className="kpi-value text-green">{reportData.total_sessions}</div>
              <p className="kpi-caption">Completed attendance sessions</p>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-title">Low Attendance Alerts</span>
                <AlertTriangle size={20} className="kpi-icon amber" />
              </div>
              <div
                className={`kpi-value ${
                  reportData.low_attendance_count > 0 ? 'text-amber' : 'text-muted'
                }`}
              >
                {reportData.low_attendance_count}
              </div>
              <p className="kpi-caption">Students below 75% threshold</p>
            </div>
          </div>

          {/* Low Attendance Warning Banner (if any) */}
          {reportData.low_attendance_count > 0 && (
            <div className="alert alert-warning">
              <AlertTriangle size={20} />
              <div>
                <strong>Low Attendance Warning ({reportData.low_attendance_count} students):</strong>
                <p className="text-sm">
                  The following students have fallen below the mandatory 75% attendance threshold:
                </p>
                <div className="alert-tags">
                  {reportData.students
                    .filter((s) => s.is_low_attendance)
                    .map((s) => (
                      <span key={s.student_id} className="badge badge-warning">
                        {s.roll_number} - {s.full_name} ({s.attendance_percentage}%)
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Visual Analytics Section with Recharts */}
          {reportData.total_sessions > 0 ? (
            <div className="charts-grid">
              {/* Daily Trend Line Chart */}
              <div className="card chart-card">
                <h3>Daily Attendance Rate Trend (%)</h3>
                <p className="text-muted text-sm">Attendance rate timeline across sessions</p>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={reportData.daily_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" stroke="#888" fontSize={12} />
                      <YAxis domain={[0, 100]} stroke="#888" fontSize={12} unit="%" />
                      <Tooltip content={<CustomDarkTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="attendance_rate"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Session Distribution Bar Chart */}
              <div className="card chart-card">
                <h3>Session Breakdown (Present vs Absent vs Late)</h3>
                <p className="text-muted text-sm">Student count distribution per session date</p>
                <div className="chart-wrapper">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={reportData.daily_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip content={<CustomDarkTooltip />} />
                      <Legend />
                      <Bar dataKey="total_present" name="Present" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="total_absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="total_late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="card empty-state">
              <Calendar size={40} className="text-muted" />
              <h3>No Attendance Sessions Recorded</h3>
              <p className="text-muted">
                No completed attendance sessions found for this batch in the selected date range.
              </p>
            </div>
          )}

          {/* Per-Student Attendance Table */}
          <div className="card table-card">
            <div className="table-header-row">
              <h3>Per-Student Attendance Summary</h3>
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Search student or roll number..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll Number</th>
                    <th>Student Name</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Late</th>
                    <th>Total Sessions</th>
                    <th>Attendance Rate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center text-muted py-4">
                        No students found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.student_id}>
                        <td>
                          <strong>{s.roll_number}</strong>
                        </td>
                        <td>{s.full_name}</td>
                        <td>
                          <span className="badge badge-success">{s.present_count}</span>
                        </td>
                        <td>
                          <span className="badge badge-danger">{s.absent_count}</span>
                        </td>
                        <td>
                          <span className="badge badge-warning">{s.late_count}</span>
                        </td>
                        <td>{s.total_sessions}</td>
                        <td>
                          <div className="progress-container">
                            <div className="progress-bar-bg">
                              <div
                                className={`progress-bar-fill ${
                                  s.is_low_attendance ? 'danger' : 'success'
                                }`}
                                style={{ width: `${Math.min(100, s.attendance_percentage)}%` }}
                              ></div>
                            </div>
                            <span className="progress-text">{s.attendance_percentage}%</span>
                          </div>
                        </td>
                        <td>
                          {s.is_low_attendance ? (
                            <span className="badge badge-danger">
                              <AlertTriangle size={12} /> Low (&lt; 75%)
                            </span>
                          ) : (
                            <span className="badge badge-success">
                              <CheckCircle2 size={12} /> Good
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Reports;
