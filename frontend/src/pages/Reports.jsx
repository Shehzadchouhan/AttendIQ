import React, { useState, useEffect, useMemo } from 'react';
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
  Filter,
  MessageSquare,
  Phone,
  Printer,
  Sparkles,
  Award,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Avatar from '../components/ui/Avatar';

// Monthly Activity Heat-Map Calendar Widget
const AttendanceHeatmap = ({ dailyTrend = [] }) => {
  // Map daily trend by date YYYY-MM-DD
  const trendMap = useMemo(() => {
    const map = new Map();
    dailyTrend.forEach((d) => {
      map.set(d.date, d);
    });
    return map;
  }, [dailyTrend]);

  // Generate last 28 days
  const days = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const data = trendMap.get(iso);
      list.push({
        date: iso,
        dayNum: d.getDate(),
        weekday: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
        rate: data ? data.attendance_rate : null,
        present: data ? data.present_count : 0,
      });
    }
    return list;
  }, [trendMap]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Monthly Activity Heat-Map (Last 28 Days)
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.725rem', color: 'var(--text-muted)' }}>
          <span>Less</span>
          <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--bg-card-subtle)' }} />
          <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'rgba(16, 185, 129, 0.35)' }} />
          <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#10b981' }} />
          <span>More</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 1fr)', gap: '6px' }}>
        {days.map((d) => {
          let bg = 'var(--bg-card-subtle)';
          let border = 'var(--border-color)';
          let title = `${d.date}: No recorded sessions`;

          if (d.rate !== null) {
            title = `${d.date}: ${d.rate}% attendance (${d.present} present)`;
            if (d.rate >= 85) {
              bg = '#10b981';
              border = '#059669';
            } else if (d.rate >= 70) {
              bg = '#6366f1';
              border = '#4f46e5';
            } else {
              bg = '#f59e0b';
              border = '#d97706';
            }
          }

          return (
            <div
              key={d.date}
              title={title}
              style={{
                aspectRatio: '1',
                borderRadius: '6px',
                backgroundColor: bg,
                border: `1px solid ${border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.65rem',
                fontWeight: 700,
                color: d.rate !== null ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'transform var(--transition-fast)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {d.dayNum}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Reports = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Filters
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(searchParams.get('batch_id') || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchStudent, setSearchStudent] = useState('');
  const [activePreset, setActivePreset] = useState('all');

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
        setBatches(res.data || []);
        if (res.data?.length > 0 && !selectedBatchId) {
          setSelectedBatchId(res.data[0].id.toString());
        }
      } catch (err) {
        setErrorMsg('Failed to load batches.');
      }
    };
    fetchBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatchId, fromDate, toDate]);

  // Quick Date Preset Handlers
  const handlePreset = (type) => {
    setActivePreset(type);
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

      const blob = new Blob([res.data], { type: 'text/csv' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `batch_${selectedBatchId}_attendance_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success('Attendance CSV report downloaded.');
    } catch (err) {
      toast.error('Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  };

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp Parent Alert
  const handleNotifyParent = (student) => {
    const parentPhone = student.parent_phone ? student.parent_phone.replace(/[^0-9]/g, '') : '';
    const parentName = student.parent_name || 'Parent / Guardian';
    const batchName = reportData?.batch_name || 'Class';
    const reasonText = student.is_at_risk ? ` [Status: ${student.at_risk_reason}]` : '';

    const senderName = user?.institution_name || 'AttendIQ';
    const message = `Hello ${parentName}, this is an attendance notice from ${senderName} regarding your ward ${student.full_name} (${student.roll_number}) in batch "${batchName}". Their current attendance has dropped to ${student.attendance_percentage}% with ${student.absent_count} recorded absences${reasonText}. Please contact faculty for details.`;

    if (parentPhone) {
      const waUrl = `https://wa.me/${parentPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(message);
      }
      toast.success(`WhatsApp chat opened for ${parentName}!`);
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(message);
      }
      toast.warning(`No phone number on record for ${student.full_name}. Message copied to clipboard!`);
    }
  };

  // Filtered Students for Table
  const filteredStudents = useMemo(() => {
    return (reportData?.students || []).filter((s) => {
      const q = searchStudent.toLowerCase();
      return s.full_name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q);
    });
  }, [reportData, searchStudent]);

  // Top Performers & At-Risk Leaders
  const topStudents = useMemo(() => {
    return [...(reportData?.students || [])]
      .filter((s) => s.attendance_percentage >= 85)
      .sort((a, b) => b.attendance_percentage - a.attendance_percentage)
      .slice(0, 3);
  }, [reportData]);

  const atRiskStudents = useMemo(() => {
    return (reportData?.students || [])
      .filter((s) => s.is_low_attendance || s.is_at_risk)
      .slice(0, 3);
  }, [reportData]);

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. HEADER ROW WITH TITLE & EXPORT BUTTONS */}
      <div
        className="page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
              Attendance Analytics & Reports
            </h1>
            <Badge variant="primary" size="sm">
              <BarChart2 size={12} style={{ marginRight: '3px' }} /> Verified Data
            </Badge>
          </div>
          <p className="page-subtitle" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Inspect daily biometric trends, monthly heat-maps, and export certified CSV records.
          </p>
        </div>

        <div className="no-print" style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="secondary"
            size="md"
            onClick={handlePrint}
            icon={Printer}
          >
            Print PDF
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleExportCSV}
            disabled={exporting || !reportData || reportData.total_sessions === 0}
            icon={Download}
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* 2. PILL FILTERS & DATE PRESET CONTROLS */}
      <Card className="no-print filter-controls" style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Row 1: Batch Dropdown & Date Presets */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                Batch:
              </label>
              <select
                className="form-input"
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                style={{ flex: 1 }}
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.subject})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Date Range Preset Pills */}
            <div className="ui-theme-segmented">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'Last 7 Days' },
                { id: 'month', label: 'Last 30 Days' },
                { id: 'all', label: 'All Time' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`ui-theme-segmented-btn ${activePreset === p.id ? 'active' : ''}`}
                  onClick={() => handlePreset(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Custom Date Range Pickers & Student Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.785rem', color: 'var(--text-secondary)' }}>From:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setActivePreset('');
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.785rem', color: 'var(--text-secondary)' }}>To:</span>
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setActivePreset('');
                  }}
                />
              </div>
            </div>

            <div style={{ minWidth: '220px' }}>
              <Input
                type="text"
                placeholder="Search student in report..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                icon={Search}
                size="sm"
              />
            </div>
          </div>
        </div>
      </Card>

      {errorMsg && (
        <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger-border)', fontSize: '0.85rem' }}>
          {errorMsg}
        </div>
      )}

      {/* 3. KPI SUMMARY CARDS */}
      {reportData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <Card hoverLift style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Total Sessions Held
            </span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {reportData.total_sessions}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified classroom records</span>
          </Card>

          <Card hoverLift style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Average Attendance
            </span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: reportData.average_attendance_rate >= 75 ? 'var(--success)' : 'var(--danger)', marginTop: '0.2rem' }}>
              {reportData.average_attendance_rate}%
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: 75% minimum</span>
          </Card>

          <Card hoverLift style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Enrolled Students
            </span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {reportData.total_students}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Classroom roster</span>
          </Card>

          <Card hoverLift style={{ padding: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              At-Risk Students (&lt; 75%)
            </span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: reportData.low_attendance_students_count > 0 ? 'var(--danger)' : 'var(--success)', marginTop: '0.2rem' }}>
              {reportData.low_attendance_students_count}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Immediate attention needed</span>
          </Card>
        </div>
      )}

      {/* 4. VISUAL ROW: DAILY TREND AREA CHART & MONTHLY HEATMAP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* Trend Area Chart */}
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Attendance Trajectory
            </h3>
            <Badge variant="primary" size="sm">Session Trajectory</Badge>
          </div>

          <div style={{ height: '220px', width: '100%' }}>
            {reportData?.daily_trend?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportData.daily_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reportTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} tickLine={false} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '12px'
                    }}
                    formatter={(val) => [`${val}%`, 'Attendance Rate']}
                  />
                  <Area
                    type="monotone"
                    dataKey="attendance_rate"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#reportTrendGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No session history in selected date range</span>
              </div>
            )}
          </div>
        </Card>

        {/* Heat-map Calendar */}
        <Card style={{ padding: '1.5rem' }}>
          <AttendanceHeatmap dailyTrend={reportData?.daily_trend || []} />
        </Card>
      </div>

      {/* 5. TOP PERFORMERS & AT-RISK LEADERBOARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {/* Top Performers Card */}
        <Card style={{ padding: '1.25rem', borderTop: '3px solid var(--success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Award size={18} style={{ color: 'var(--success)' }} />
            <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Top Performers (Star Attendees)
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {topStudents.length > 0 ? (
              topStudents.map((s, idx) => (
                <div
                  key={s.student_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        backgroundColor: idx === 0 ? '#f59e0b' : 'var(--success)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {s.full_name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {s.roll_number}
                      </div>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">
                    {s.attendance_percentage}%
                  </Badge>
                </div>
              ))
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '1rem 0' }}>
                No students currently in 85%+ bracket.
              </span>
            )}
          </div>
        </Card>

        {/* At-Risk Students Card */}
        <Card style={{ padding: '1.25rem', borderTop: '3px solid var(--danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
            <h4 style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              At-Risk Students (&lt; 75%)
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {atRiskStudents.length > 0 ? (
              atRiskStudents.map((s) => (
                <div
                  key={s.student_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-card-subtle)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {s.full_name}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        ({s.roll_number})
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600 }}>
                      {s.absent_count} absences • {s.attendance_percentage}% rate
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleNotifyParent(s)}
                    style={{
                      backgroundColor: '#25D366',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 8px',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <MessageSquare size={11} /> WhatsApp
                  </button>
                </div>
              ))
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--success)', padding: '1rem 0', fontWeight: 600 }}>
                No students are currently at risk. Healthy attendance across batch!
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* 6. FULL DETAILED STUDENT ROSTER TABLE */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Complete Student Attendance Roster
            </h3>
            <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>
              Individual session marks, attendance percentage, and guardian contact.
            </span>
          </div>
          <Badge variant="secondary" size="sm">
            {filteredStudents.length} Students
          </Badge>
        </div>

        {loading ? (
          <div style={{ padding: '2rem' }}>
            <Skeleton variant="card" height={50} style={{ marginBottom: '0.75rem' }} />
            <Skeleton variant="card" height={50} />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem' }}>
            <EmptyState
              icon={Users}
              title="No students match the criteria"
              description="Try adjusting your search query or date range filters."
            />
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Full Name</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Total Sessions</th>
                  <th>Attendance %</th>
                  <th>Status</th>
                  <th className="no-print" style={{ textAlign: 'right' }}>Parent Notice</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.student_id}>
                    <td>
                      <span className="student-roll-chip" style={{ fontWeight: 700 }}>
                        {s.roll_number}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {s.full_name}
                      </div>
                      {s.parent_name && (
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          Parent: {s.parent_name} {s.parent_phone ? `(${s.parent_phone})` : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge variant="success" size="sm">{s.present_count}</Badge>
                    </td>
                    <td>
                      <Badge variant="danger" size="sm">{s.absent_count}</Badge>
                    </td>
                    <td>{s.total_sessions}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '80px', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, s.attendance_percentage)}%`,
                              height: '100%',
                              backgroundColor: s.attendance_percentage >= 75 ? 'var(--success)' : 'var(--danger)',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                          {s.attendance_percentage}%
                        </span>
                      </div>
                    </td>
                    <td>
                      {s.attendance_percentage >= 75 ? (
                        <Badge variant="success" size="sm">Regular</Badge>
                      ) : (
                        <Badge variant="danger" size="sm">
                          <AlertTriangle size={11} style={{ marginRight: '3px' }} /> Low (&lt; 75%)
                        </Badge>
                      )}
                    </td>
                    <td className="no-print" style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleNotifyParent(s)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#25D366',
                          color: '#ffffff',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                        title={`Open WhatsApp chat with ${s.parent_name || 'parent'}`}
                      >
                        <MessageSquare size={12} /> WhatsApp
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Reports;
