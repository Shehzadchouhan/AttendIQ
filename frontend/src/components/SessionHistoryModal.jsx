import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  UserCheck,
  UserX,
  Camera,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Smartphone,
  Printer,
  Copy,
  Share2,
} from 'lucide-react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';

const SessionHistoryModal = ({ isOpen, onClose, batch }) => {
  const { toast } = useToast();

  const [sessionsList, setSessionsList] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // 1. Fetch sessions list when modal opens or batch changes
  useEffect(() => {
    if (!isOpen || !batch) {
      setSessionsList([]);
      setSelectedSessionId(null);
      setSessionDetail(null);
      return;
    }

    const fetchSessions = async () => {
      try {
        setLoadingSessions(true);
        const res = await apiClient.get(`/attendance/sessions?batch_id=${batch.id}&scope=all`);
        const sessions = res.data || [];
        setSessionsList(sessions);

        if (sessions.length > 0) {
          // Default to the most recent session
          setSelectedSessionId(sessions[0].id);
        } else {
          setSelectedSessionId(null);
          setSessionDetail(null);
        }
      } catch (err) {
        console.error('Failed to load sessions list', err);
        toast.error('Failed to load past attendance sessions.');
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [isOpen, batch]);

  // 2. Fetch full session details whenever selectedSessionId changes
  useEffect(() => {
    if (!selectedSessionId) {
      setSessionDetail(null);
      return;
    }

    const fetchSessionDetail = async () => {
      try {
        setLoadingDetail(true);
        const res = await apiClient.get(`/attendance/sessions/${selectedSessionId}?scope=all`);
        setSessionDetail(res.data);
      } catch (err) {
        console.error('Failed to load session details', err);
        toast.error('Failed to fetch detailed roster for this session.');
      } finally {
        setLoadingDetail(false);
      }
    };

    fetchSessionDetail();
  }, [selectedSessionId]);

  if (!isOpen || !batch) return null;

  // Step backwards / forwards through sessions
  const currentIdx = sessionsList.findIndex((s) => s.id === selectedSessionId);
  const hasNext = currentIdx > 0; // newer session
  const hasPrev = currentIdx >= 0 && currentIdx < sessionsList.length - 1; // older session

  const handleStepNext = () => {
    if (hasNext) setSelectedSessionId(sessionsList[currentIdx - 1].id);
  };

  const handleStepPrev = () => {
    if (hasPrev) setSelectedSessionId(sessionsList[currentIdx + 1].id);
  };

  // Filter roster records by search query
  const records = sessionDetail?.records || [];
  const filteredRecords = records.filter((r) => {
    const q = searchFilter.toLowerCase();
    const name = (r.student_name || '').toLowerCase();
    const roll = (r.roll_number || '').toLowerCase();
    return name.includes(q) || roll.includes(q);
  });

  const totalMarked = (sessionDetail?.present_count || 0) + (sessionDetail?.late_count || 0) + (sessionDetail?.absent_count || 0);
  const attendanceRate = totalMarked > 0
    ? Math.round((((sessionDetail.present_count || 0) + (sessionDetail.late_count || 0)) / totalMarked) * 100)
    : 0;

  // Real-world value add: 1-Click WhatsApp & SMS absentee announcement broadcast
  const handleShareWhatsAppBroadcast = () => {
    if (!sessionDetail || !batch) return;

    const formattedDate = new Date(sessionDetail.session_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const presentStudents = records.filter((r) => r.status === 'present');
    const absentStudents = records.filter((r) => r.status === 'absent');
    const lateStudents = records.filter((r) => r.status === 'late');

    let msg = `📢 *AttendIQ Attendance Broadcast*\n`;
    msg += `🏫 *Batch:* ${batch.name} (${batch.subject})\n`;
    msg += `📅 *Date:* ${formattedDate}\n`;
    msg += `👨‍🏫 *Faculty:* ${sessionDetail.taken_by_user_name || 'Assigned Faculty'}\n`;
    msg += `📊 *Attendance:* ${attendanceRate}% (${sessionDetail.present_count} Present / ${sessionDetail.absent_count} Absent)\n`;

    if (absentStudents.length > 0) {
      msg += `\n❌ *ABSENT STUDENTS (${absentStudents.length}) - Parent Alert Required:*\n`;
      absentStudents.forEach((s) => {
        msg += `• ${s.roll_number} — ${s.student_name}\n`;
      });
    } else {
      msg += `\n✨ *100% Attendance — Full class present today!*\n`;
    }

    if (lateStudents.length > 0) {
      msg += `\n⏰ *Late Arrivals (${lateStudents.length}):*\n`;
      lateStudents.forEach((s) => {
        msg += `• ${s.roll_number} — ${s.student_name}\n`;
      });
    }

    if (sessionDetail.unrecognized_count > 0) {
      msg += `\n⚠️ *Alert:* ${sessionDetail.unrecognized_count} unrecognized face(s) were captured in classroom photo.\n`;
    }

    msg += `\nVerified via AttendIQ Smart Attendance Engine.`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg);
      toast.success('WhatsApp absentee broadcast copied to clipboard! Ready to paste into class group.');
    } else {
      toast.info('Attendance summary ready.');
    }
  };

  const handlePrintRoster = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 90 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '850px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                Attendance Session Inspection
              </h3>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                <strong>{batch.name}</strong> • Subject: {batch.subject}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="toast-close-btn"
            style={{ width: '32px', height: '32px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="modal-body" style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {loadingSessions ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
              <RefreshCw size={28} className="spin" style={{ margin: '0 auto 0.75rem auto' }} />
              <div>Loading session history...</div>
            </div>
          ) : sessionsList.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed var(--border-color)',
              }}
            >
              <Clock size={36} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                No Attendance Sessions Recorded Yet
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                No past sessions have been submitted for this batch. Take attendance to start building session history.
              </p>
            </div>
          ) : (
            <>
              {/* Session Selector & Stepper Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  marginBottom: '1.25rem',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '180px', width: '100%', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                    <Calendar size={16} color="var(--primary)" />
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Select Date:
                    </label>
                  </div>
                  <select
                    className="select-input select-sm"
                    value={selectedSessionId || ''}
                    onChange={(e) => setSelectedSessionId(parseInt(e.target.value))}
                    style={{ flex: 1, fontWeight: 600, minWidth: '180px' }}
                  >
                    {sessionsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {new Date(s.session_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        • {s.present_count} Present, {s.absent_count} Absent ({s.total_enrolled} Enrolled)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={handleStepPrev}
                    disabled={!hasPrev}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '0.2rem', padding: '0.35rem 0.65rem' }}
                    title="View Previous (Older) Session"
                  >
                    <ChevronLeft size={16} /> Older
                  </button>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0 0.25rem' }}>
                    {currentIdx + 1} of {sessionsList.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleStepNext}
                    disabled={!hasNext}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '0.2rem', padding: '0.35rem 0.65rem' }}
                    title="View Next (Newer) Session"
                  >
                    Newer <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Session Summary Card */}
              {sessionDetail && (
                <div
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '1.25rem',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1rem',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {new Date(sessionDetail.session_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </h4>
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} /> Confirmed Session
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Conducted by: <strong>{sessionDetail.taken_by_user_name || 'Assigned Faculty'}</strong>
                      </div>
                    </div>

                    {/* Unrecognized Faces Alert Badge */}
                    <div>
                      {sessionDetail.unrecognized_count > 0 ? (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            backgroundColor: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                          }}
                        >
                          <AlertTriangle size={15} color="#d97706" />
                          <span>{sessionDetail.unrecognized_count} Unrecognized Face(s) Detected</span>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            backgroundColor: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          <ShieldCheck size={15} color="#16a34a" />
                          <span>0 Unrecognized Faces</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* KPI Mini Metric Tiles */}
                  <div className="kpi-mini-bar" style={{ marginBottom: 0 }}>
                    <div className="kpi-mini green">
                      <span className="kpi-count">{sessionDetail.present_count}</span>
                      <span className="kpi-label">Present</span>
                    </div>
                    <div className="kpi-mini red">
                      <span className="kpi-count">{sessionDetail.absent_count}</span>
                      <span className="kpi-label">Absent</span>
                    </div>
                    <div className="kpi-mini amber">
                      <span className="kpi-count">{sessionDetail.late_count}</span>
                      <span className="kpi-label">Late</span>
                    </div>
                    <div className="kpi-mini blue">
                      <span className="kpi-count">{attendanceRate}%</span>
                      <span className="kpi-label">Session Rate</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Roster Search & Filter */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                  gap: '0.75rem',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  Confirmed Student Roster ({filteredRecords.length})
                </div>
                <div className="search-input-wrapper" style={{ maxWidth: '260px' }}>
                  <Search size={15} className="search-icon" />
                  <input
                    type="text"
                    className="search-input select-sm"
                    placeholder="Search student or roll..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                </div>
              </div>

              {/* Confirmed Roster Records Table */}
              {loadingDetail ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
                  <RefreshCw size={22} className="spin" style={{ margin: '0 auto 0.5rem auto' }} />
                  <div>Loading confirmed student records...</div>
                </div>
              ) : (
                <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  <table className="data-table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Roll Number</th>
                        <th>Student Name</th>
                        <th>Status</th>
                        <th>Verification Method</th>
                        <th>Marked Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                            No students match your search filter.
                          </td>
                        </tr>
                      ) : (
                        filteredRecords.map((r) => (
                          <tr key={r.id}>
                            <td>
                              <strong>{r.roll_number}</strong>
                            </td>
                            <td style={{ fontWeight: 600 }}>{r.student_name}</td>
                            <td>
                              {r.status === 'present' ? (
                                <span className="badge badge-success" style={{ gap: '0.3rem' }}>
                                  <UserCheck size={13} /> Present
                                </span>
                              ) : r.status === 'absent' ? (
                                <span className="badge badge-danger" style={{ gap: '0.3rem' }}>
                                  <UserX size={13} /> Absent
                                </span>
                              ) : (
                                <span className="badge badge-warning" style={{ gap: '0.3rem' }}>
                                  <Clock size={13} /> Late
                                </span>
                              )}
                            </td>
                            <td>
                              {/* Method Badge: Face Recognition vs Manual Override */}
                              {r.method === 'face' ? (
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: '#ecfdf5',
                                    color: '#065f46',
                                    border: '1px solid #a7f3d0',
                                    gap: '0.35rem',
                                    fontWeight: 600,
                                  }}
                                  title="Marked automatically by Face Recognition engine"
                                >
                                  <Camera size={13} color="#059669" />
                                  Face Recognition
                                  {r.confidence_score ? (
                                    <span style={{ fontSize: '0.72rem', opacity: 0.85 }}>
                                      ({Math.round(r.confidence_score * 100)}%)
                                    </span>
                                  ) : null}
                                </span>
                              ) : (
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor: '#f5f3ff',
                                    color: '#5b21b6',
                                    border: '1px solid #ddd6fe',
                                    gap: '0.35rem',
                                    fontWeight: 600,
                                  }}
                                  title="Manually verified or overridden by teacher"
                                >
                                  <Edit2 size={13} color="#7c3aed" />
                                  Manual Override
                                </span>
                              )}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {r.marked_at ? new Date(r.marked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '0.85rem 1.5rem',
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleShareWhatsAppBroadcast}
              className="btn btn-secondary btn-sm"
              style={{
                gap: '0.4rem',
                backgroundColor: '#ecfdf5',
                borderColor: '#a7f3d0',
                color: '#065f46',
                fontWeight: 600,
              }}
              title="Copy formatted WhatsApp absentee alert to clipboard for parents and batch group"
            >
              <Smartphone size={15} color="#059669" /> Copy WhatsApp Broadcast
            </button>
            <button
              type="button"
              onClick={handlePrintRoster}
              className="btn btn-secondary btn-sm"
              style={{ gap: '0.4rem' }}
              title="Print official sign-off attendance register sheet"
            >
              <Printer size={15} /> Print Sheet
            </button>
          </div>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionHistoryModal;
