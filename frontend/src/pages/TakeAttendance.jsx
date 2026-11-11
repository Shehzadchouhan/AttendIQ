import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Camera,
  Upload,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Save,
  Users,
  Calendar,
  Layers,
  ArrowRight,
  Smartphone,
  CheckCheck,
  Shuffle,
  CheckSquare,
  Sparkles,
  Zap,
  ShieldCheck,
  Share2,
  Lock
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import WebcamModal from '../components/WebcamModal';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';

// Radial Attendance Ring Component
const AttendanceRing = ({ percentage = 0, size = 70, strokeWidth = 6 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let strokeColor = '#10b981';
  if (percentage < 60) strokeColor = '#ef4444';
  else if (percentage < 75) strokeColor = '#f59e0b';

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border-color)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center', lineHeight: 1 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {percentage}%
        </span>
      </div>
    </div>
  );
};

const TakeAttendance = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Core Form State
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState('face'); // 'face' | 'manual'

  // Photo & Recognition State
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState(null);

  // Student Attendance Roster State
  const [roster, setRoster] = useState([]);
  const [unassignedFaces, setUnassignedFaces] = useState([]);
  const [loadingBatchStudents, setLoadingBatchStudents] = useState(false);

  // Submission & Feedback State
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [createdSessionId, setCreatedSessionId] = useState(null);

  // Stepper state: 1 (Config), 2 (Capture), 3 (Review), 4 (Confirmed)
  const currentStep = successMsg ? 4 : recognitionResult || roster.length > 0 ? 3 : photoUrl ? 2 : 1;

  // Canvas & Input Refs
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const mobileInputRef = useRef(null);

  // Live Camera Stream Modal State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // 1. Fetch available batches on mount
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await apiClient.get(isAdmin ? '/batches/?scope=all' : '/batches/');
        setBatches(res.data || []);
        if (res.data?.length > 0) {
          setSelectedBatchId(res.data[0].id.toString());
        }
      } catch (err) {
        setErrorMsg('Failed to load batches.');
      }
    };
    fetchBatches();
  }, [isAdmin]);

  // 2. Fetch enrolled students when batch changes or manual mode selected
  useEffect(() => {
    if (!selectedBatchId) return;

    const loadEnrolledStudents = async () => {
      try {
        setLoadingBatchStudents(true);
        setErrorMsg('');
        const res = await apiClient.get(`/batches/${selectedBatchId}`);
        const enrolled = res.data.enrolled_students || [];

        if (mode === 'manual') {
          const initialRoster = enrolled.map((stu) => ({
            student_id: stu.id,
            roll_number: stu.roll_number,
            full_name: stu.full_name,
            status: 'present',
            method: 'manual',
            confidence_score: null,
            face_index: null,
          }));
          setRoster(initialRoster);
          setUnassignedFaces([]);
          setRecognitionResult(null);
          setPhotoUrl(null);
          setPhotoFile(null);
        }
      } catch (err) {
        setErrorMsg('Failed to load batch enrollments.');
      } finally {
        setLoadingBatchStudents(false);
      }
    };

    loadEnrolledStudents();
  }, [selectedBatchId, mode]);

  // 3. Handle Group Photo Selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setSuccessMsg('');
    setPhotoFile(file);

    const localUrl = URL.createObjectURL(file);
    setPhotoUrl(localUrl);
    setRecognitionResult(null);
  };

  // Handle Loading Demo Classroom Photo for Viva/Presentation
  const handleLoadDemoPhoto = async () => {
    try {
      setRecognizing(true);
      setErrorMsg('');
      setSuccessMsg('');
      const response = await fetch('/demo_classroom.png');
      const blob = await response.blob();
      const file = new File([blob], 'demo_classroom.png', { type: 'image/png' });
      setPhotoFile(file);
      setPhotoUrl(URL.createObjectURL(blob));
      setRecognitionResult(null);
      toast.info('Demo classroom photo loaded! Analyzing faces...');
      await handleRunRecognition(file);
    } catch (err) {
      toast.error('Could not load demo classroom photo.');
      setRecognizing(false);
    }
  };

  // Handle Camera Capture
  const handleCameraCapture = (file, previewUrl) => {
    setErrorMsg('');
    setSuccessMsg('');
    setPhotoFile(file);
    setPhotoUrl(previewUrl);
    setRecognitionResult(null);
    handleRunRecognition(file);
  };

  // 4. Trigger Face Recognition API
  const handleRunRecognition = async (fileOverride = null) => {
    const fileToUse = fileOverride || photoFile;
    if (!fileToUse || !selectedBatchId) {
      setErrorMsg('Please select a batch and provide a classroom photo.');
      return;
    }

    setRecognizing(true);
    setErrorMsg('');
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('batch_id', selectedBatchId);
    formData.append('file', fileToUse);

    try {
      const batchRes = await apiClient.get(`/batches/${selectedBatchId}`);
      const enrolled = batchRes.data.enrolled_students || [];
      const studentMap = new Map(enrolled.map((s) => [s.id, s]));

      const res = await apiClient.post('/attendance/recognize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data;
      setRecognitionResult(data);

      const recognizedStudentIds = new Set();
      const newRoster = [];

      data.faces.forEach((face, idx) => {
        if (face.student_id && studentMap.has(face.student_id)) {
          const stu = studentMap.get(face.student_id);
          recognizedStudentIds.add(face.student_id);
          newRoster.push({
            student_id: stu.id,
            roll_number: stu.roll_number,
            full_name: stu.full_name,
            status: 'present',
            method: 'face',
            confidence_score: face.score,
            face_index: idx,
            review_flag: face.status === 'review',
          });
        }
      });

      enrolled.forEach((stu) => {
        if (!recognizedStudentIds.has(stu.id)) {
          newRoster.push({
            student_id: stu.id,
            roll_number: stu.roll_number,
            full_name: stu.full_name,
            status: 'absent',
            method: 'face',
            confidence_score: null,
            face_index: null,
            review_flag: false,
          });
        }
      });

      newRoster.sort((a, b) => a.roll_number.localeCompare(b.roll_number));
      setRoster(newRoster);

      const unknowns = data.faces
        .map((f, idx) => ({ ...f, index: idx }))
        .filter((f) => f.status === 'unknown' || !f.student_id);
      setUnassignedFaces(unknowns);

      toast.success(`Face recognition complete: ${recognizedStudentIds.size} student(s) identified.`);
    } catch (err) {
      const errDetail = err.response?.data?.detail || 'Recognition failed. Please ensure photo is clear and valid.';
      setErrorMsg(errDetail);
      toast.error(errDetail);
    } finally {
      setRecognizing(false);
    }
  };

  // 5. Draw Canvas Overlay with Color-Coded Bounding Boxes
  useEffect(() => {
    if (!recognitionResult || !photoUrl || !canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    const drawBoxes = () => {
      canvas.width = img.clientWidth;
      canvas.height = img.clientHeight;

      const scaleX = img.clientWidth / recognitionResult.image_width;
      const scaleY = img.clientHeight / recognitionResult.image_height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      recognitionResult.faces.forEach((face, idx) => {
        const [x1, y1, x2, y2] = face.bbox;
        const boxX = x1 * scaleX;
        const boxY = y1 * scaleY;
        const boxW = (x2 - x1) * scaleX;
        const boxH = (y2 - y1) * scaleY;

        let strokeColor = '#10b981'; // Green for matched
        let fillColor = 'rgba(16, 185, 129, 0.15)';
        let labelText = `${face.student_name || 'Matched'} (${Math.round(face.score * 100)}%)`;

        if (face.status === 'review') {
          strokeColor = '#f59e0b'; // Amber for review
          fillColor = 'rgba(245, 158, 11, 0.18)';
          labelText = `Review: ${face.student_name || 'Candidate'} (${Math.round(face.score * 100)}%)`;
        } else if (face.status === 'unknown' || !face.student_id) {
          strokeColor = '#ef4444'; // Red for unknown
          fillColor = 'rgba(239, 68, 68, 0.2)';
          if (face.score > 0 && face.student_name) {
            labelText = `Unknown (${face.student_name} ${Math.round(face.score * 100)}%)`;
          } else {
            labelText = `Unknown #${idx + 1}`;
          }
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(boxX, boxY, boxW, boxH);
        ctx.fillStyle = fillColor;
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Label Tag
        ctx.font = 'bold 12px sans-serif';
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillStyle = strokeColor;
        ctx.fillRect(boxX, Math.max(0, boxY - 22), textWidth + 12, 22);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(labelText, boxX + 6, Math.max(16, boxY - 6));
      });
    };

    if (img.complete) {
      drawBoxes();
    } else {
      img.onload = drawBoxes;
    }

    window.addEventListener('resize', drawBoxes);
    return () => window.removeEventListener('resize', drawBoxes);
  }, [recognitionResult, photoUrl]);

  // 6. Toggle Student Status in Roster
  const handleStatusChange = (studentId, newStatus) => {
    setRoster((prev) =>
      prev.map((item) =>
        item.student_id === studentId
          ? {
              ...item,
              status: newStatus,
              method: item.method === 'face' && newStatus === 'present' ? 'face' : 'manual',
            }
          : item
      )
    );
  };

  // Bulk Controls
  const handleMarkAllPresent = () => {
    if (!roster.length) return;
    setRoster((prev) =>
      prev.map((r) => ({
        ...r,
        status: 'present',
        review_flag: false,
      }))
    );
    toast.success(`Marked all ${roster.length} students as Present.`);
  };

  const handleMarkAllAbsent = () => {
    if (!roster.length) return;
    setRoster((prev) =>
      prev.map((r) => ({
        ...r,
        status: 'absent',
        review_flag: false,
      }))
    );
    toast.info(`Reset roster: All ${roster.length} students marked Absent.`);
  };

  const handleInvertSelection = () => {
    if (!roster.length) return;
    setRoster((prev) =>
      prev.map((r) => ({
        ...r,
        status: r.status === 'absent' ? 'present' : 'absent',
        review_flag: false,
      }))
    );
    toast.warning(`Inverted attendance selection for ${roster.length} students.`);
  };

  // Assign an Unknown Face to an Absent Student
  const handleAssignUnknownFace = (faceIndex, studentId) => {
    if (!studentId) return;

    setRoster((prev) =>
      prev.map((item) =>
        item.student_id === parseInt(studentId)
          ? { ...item, status: 'present', method: 'manual', confidence_score: null }
          : item
      )
    );

    setUnassignedFaces((prev) => prev.filter((f) => f.index !== faceIndex));
    toast.success('Assigned face to student.');
  };

  // 8. Confirm and Save Attendance Session with Confetti Celebration
  const handleConfirmAndSave = async () => {
    if (!selectedBatchId || !roster.length) {
      setErrorMsg('No students in batch to record attendance.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let sessionId = createdSessionId;

      if (!sessionId) {
        try {
          const createRes = await apiClient.post('/attendance/sessions', {
            batch_id: parseInt(selectedBatchId),
            session_date: sessionDate,
          });
          sessionId = createRes.data.id;
        } catch (createErr) {
          if (createErr.response?.status === 409) {
            const listRes = await apiClient.get(
              `/attendance/sessions?batch_id=${selectedBatchId}&from_date=${sessionDate}&to_date=${sessionDate}`
            );
            if (listRes.data && listRes.data.length > 0) {
              sessionId = listRes.data[0].id;
            } else {
              throw createErr;
            }
          } else {
            throw createErr;
          }
        }
      }

      setCreatedSessionId(sessionId);

      const confirmPayload = {
        records: roster.map((r) => ({
          student_id: r.student_id,
          status: r.status,
          method: r.method,
          confidence_score: r.confidence_score,
        })),
        unrecognized_count: unassignedFaces.length,
      };

      await apiClient.post(`/attendance/sessions/${sessionId}/confirm`, confirmPayload);

      const pCount = roster.filter((r) => r.status === 'present').length;
      const aCount = roster.filter((r) => r.status === 'absent').length;
      const msg = `Attendance confirmed! ${pCount} present, ${aCount} absent. Session logged & locked.`;
      setSuccessMsg(msg);
      toast.success(msg);

      // Trigger Confetti Celebration!
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.65 },
        });
      } catch (err) {
        // ignore confetti failures gracefully
      }
    } catch (err) {
      const errorText = err.response?.data?.detail || 'Failed to confirm attendance. Please try again.';
      setErrorMsg(errorText);
      toast.error(errorText);
    } finally {
      setSaving(false);
    }
  };

  // Aggregated Counts & Percentages
  const presentCount = roster.filter((r) => r.status === 'present').length;
  const absentCount = roster.filter((r) => r.status === 'absent').length;
  const lateCount = roster.filter((r) => r.status === 'late').length;
  const reviewCount = roster.filter((r) => r.review_flag).length;
  const totalCount = roster.length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // WhatsApp Broadcast Generator
  const handleShareWhatsAppBroadcast = () => {
    const curBatch = batches.find((b) => b.id.toString() === selectedBatchId);
    const batchName = curBatch ? `${curBatch.name} (${curBatch.subject})` : 'Class Batch';
    const presentStudents = roster.filter((r) => r.status === 'present');
    const absentStudents = roster.filter((r) => r.status === 'absent');

    let msg = `📢 *AttendIQ Attendance Summary*\n`;
    msg += `🏫 *Batch:* ${batchName}\n`;
    msg += `📅 *Date:* ${sessionDate}\n`;
    msg += `👨‍🏫 *Faculty:* ${user?.name || 'Tutor'}\n`;
    msg += `📊 *Attendance:* ${attendanceRate}% (${presentStudents.length} Present / ${absentStudents.length} Absent)\n`;

    if (absentStudents.length > 0) {
      msg += `\n❌ *ABSENT STUDENTS (${absentStudents.length}):*\n`;
      absentStudents.forEach((s) => {
        msg += `• ${s.roll_number} — ${s.full_name}\n`;
      });
    } else {
      msg += `\n✨ *100% Attendance — Full attendance today!*\n`;
    }

    msg += `\nVerified via FaceMark / AttendIQ AI Biometric Suite.`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg);
      toast.success('WhatsApp absentee broadcast copied to clipboard!');
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. HEADER ROW WITH TITLE */}
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
              Take Attendance
            </h1>
            <Badge variant="primary" size="sm">
              <Zap size={12} style={{ marginRight: '3px' }} /> AI Biometrics
            </Badge>
          </div>
          <p className="page-subtitle" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Multi-face recognition engine detects all classroom faces in under 3 seconds.
          </p>
        </div>

        {/* Mode Toggle Button */}
        <div className="ui-theme-segmented">
          <button
            type="button"
            className={`ui-theme-segmented-btn ${mode === 'face' ? 'active' : ''}`}
            onClick={() => setMode('face')}
          >
            <Camera size={14} /> AI Face Scan
          </button>
          <button
            type="button"
            className={`ui-theme-segmented-btn ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            <Users size={14} /> Manual Roll Call
          </button>
        </div>
      </div>

      {/* 2. FOUR-STEP SIGNATURE STEPPER */}
      <Card style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', overflowX: 'auto' }}>
          {[
            { step: 1, label: 'Select Batch' },
            { step: 2, label: 'Capture Photo' },
            { step: 3, label: 'AI Review' },
            { step: 4, label: 'Lock Session' },
          ].map((s, idx) => {
            const isCompleted = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            return (
              <React.Fragment key={s.step}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: isCurrent ? 'var(--primary)' : isCompleted ? 'var(--success)' : 'var(--bg-card-subtle)',
                      color: isCurrent || isCompleted ? '#ffffff' : 'var(--text-muted)',
                      border: '1px solid',
                      borderColor: isCurrent ? 'var(--primary)' : isCompleted ? 'var(--success)' : 'var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {isCompleted ? <CheckCheck size={14} /> : s.step}
                  </div>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < 3 && (
                  <div
                    style={{
                      flex: 1,
                      minWidth: '24px',
                      height: '2px',
                      backgroundColor: isCompleted ? 'var(--success)' : 'var(--border-color)',
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* 3. CONTROL CARD: BATCH & DATE SELECTOR */}
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={14} style={{ color: 'var(--primary)' }} /> Academic Batch
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setCreatedSessionId(null);
                setSuccessMsg('');
              }}
              className="form-input"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.subject})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={14} style={{ color: 'var(--primary)' }} /> Session Date
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => {
                setSessionDate(e.target.value);
                setCreatedSessionId(null);
                setSuccessMsg('');
              }}
              className="form-input"
            />
          </div>

          {/* Quick Stats Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <AttendanceRing percentage={attendanceRate} size={54} strokeWidth={5} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ROSTER COUNT</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {presentCount} / {totalCount} Present
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Feedback Alert Banners */}
      {errorMsg && (
        <div style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--danger-light)', border: '1px solid var(--danger-border)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ padding: '1rem', backgroundColor: 'var(--success-light)', border: '1px solid var(--success-border)', color: 'var(--success)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={20} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{successMsg}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleShareWhatsAppBroadcast}
              className="btn btn-sm"
              style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Smartphone size={14} /> WhatsApp Broadcast
            </button>
            <button
              type="button"
              onClick={() => navigate(`/reports?batch_id=${selectedBatchId}`)}
              className="btn btn-sm btn-secondary"
            >
              View Analytics <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 4. WORKSPACE: LEFT (CAMERA/IMAGE/SCANNING) & RIGHT (ROSTER & CONFIRM) */}
      <div style={{ display: 'grid', gridTemplateColumns: mode === 'face' ? '1.15fr 1fr' : '1fr', gap: '1.25rem' }}>
        {/* LEFT COLUMN: CAMERA / SCANNING CANVAS */}
        {mode === 'face' && (
          <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Classroom Biometric Frame
                </h3>
                <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>
                  Captured in-memory; no raw student images are stored to disk.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleLoadDemoPhoto}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.785rem', fontWeight: 600 }}
                  title="Load the 5-student sample photo for live viva demonstration"
                >
                  <Sparkles size={13} style={{ color: 'var(--primary)' }} /> Demo Sample
                </button>
                {photoFile && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleRunRecognition()}
                    disabled={recognizing}
                  >
                    {recognizing ? (
                      <>
                        <RefreshCw size={13} className="spin" /> Scanning...
                      </>
                    ) : (
                      <>
                        <Camera size={13} /> Run Recognition
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {!photoUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1, justifyContent: 'center' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => setIsCameraModalOpen(true)}
                    style={{ padding: '1rem' }}
                  >
                    <Camera size={18} /> Live Webcam Stream
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => mobileInputRef.current?.click()}
                    style={{ padding: '1rem' }}
                  >
                    <Smartphone size={18} /> Mobile Camera
                  </Button>
                  <input
                    ref={mobileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                  />
                </div>

                <label
                  style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-card-subtle)',
                    transition: 'all var(--transition-fast)',
                    display: 'block',
                  }}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                  />
                  <Upload size={36} style={{ color: 'var(--primary)', margin: '0 auto 0.75rem' }} />
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    Or Upload Classroom Group Photograph
                  </div>
                  <p style={{ fontSize: '0.785rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0' }}>
                    Supports high-resolution multi-student classroom captures up to 10MB.
                  </p>
                </label>

                {/* 1-Click Demo Sample Button for Viva / Presentation */}
                <button
                  type="button"
                  onClick={handleLoadDemoPhoto}
                  className="btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%)',
                    color: 'var(--primary)',
                    border: '1.5px dashed var(--primary)',
                    fontWeight: 700,
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    width: '100%',
                    fontSize: '0.875rem',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <Sparkles size={16} /> ⚡ 1-Click Load College Demo Classroom Photo
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative', width: '100%', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <img
                  ref={imageRef}
                  src={photoUrl}
                  alt="Classroom Snapshot"
                  style={{ width: '100%', display: 'block', maxHeight: '420px', objectFit: 'contain', backgroundColor: '#000' }}
                />
                <canvas
                  ref={canvasRef}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                />

                {/* Animated Laser Scanning Line during Recognition */}
                {recognizing && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'linear-gradient(90deg, transparent, #22d3ee, #6366f1, transparent)',
                      boxShadow: '0 0 15px 3px #22d3ee',
                      animation: 'scanLaser 2.5s ease-in-out infinite alternate',
                    }}
                  />
                )}

                {/* Scanning overlay chip */}
                {recognizing && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(11, 16, 32, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(34, 211, 238, 0.4)',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      color: '#38bdf8',
                      fontSize: '0.785rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RefreshCw size={12} className="spin" />
                    <span>Extracting Multi-Face Embeddings...</span>
                  </div>
                )}

                {/* Retake actions strip */}
                <div style={{ padding: '0.65rem 0.85rem', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button variant="secondary" size="sm" onClick={() => setIsCameraModalOpen(true)}>
                    <Camera size={13} /> Retake
                  </Button>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                    <Upload size={13} /> Change Photo
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* RIGHT COLUMN: ATTENDANCE ROSTER & CONTROLS */}
        <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Session Roster Review
              </h3>
              <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>
                Toggle statuses or assign unrecognized faces before saving.
              </span>
            </div>

            <Button
              variant="success"
              size="md"
              onClick={handleConfirmAndSave}
              disabled={saving || !roster.length}
              icon={Save}
            >
              {saving ? 'Saving...' : 'Confirm & Lock'}
            </Button>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Badge variant="success" size="md">
              {presentCount} Present
            </Badge>
            <Badge variant="danger" size="md">
              {absentCount} Absent
            </Badge>
            {lateCount > 0 && (
              <Badge variant="warning" size="md">
                {lateCount} Late
              </Badge>
            )}
            {unassignedFaces.length > 0 && (
              <Badge variant="warning" size="md">
                {unassignedFaces.length} Unknown Faces
              </Badge>
            )}
          </div>

          {/* Bulk Action Controls */}
          {roster.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                backgroundColor: 'var(--bg-card-subtle)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                marginBottom: '0.85rem',
                gap: '0.5rem',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Quick Roster Actions:
              </span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="btn btn-sm"
                  style={{ fontSize: '0.725rem', padding: '3px 8px', backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success-border)' }}
                >
                  All Present
                </button>
                <button
                  type="button"
                  onClick={handleMarkAllAbsent}
                  className="btn btn-sm"
                  style={{ fontSize: '0.725rem', padding: '3px 8px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}
                >
                  All Absent
                </button>
                <button
                  type="button"
                  onClick={handleInvertSelection}
                  className="btn btn-sm"
                  style={{ fontSize: '0.725rem', padding: '3px 8px', backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                >
                  Invert
                </button>
              </div>
            </div>
          )}

          {/* Unknown Faces Assigner */}
          {unassignedFaces.length > 0 && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'var(--warning-light)',
                border: '1px solid var(--warning-border)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '0.85rem',
              }}
            >
              <div style={{ fontSize: '0.785rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '0.4rem' }}>
                Assign Detected Unknown Face #{unassignedFaces[0].index + 1}:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select
                  id="unknown-face-select"
                  className="form-input"
                  style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                >
                  {roster.filter((r) => r.status === 'absent').map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.roll_number} - {s.full_name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const sel = document.getElementById('unknown-face-select');
                    if (sel && sel.value) {
                      handleAssignUnknownFace(unassignedFaces[0].index, sel.value);
                    }
                  }}
                >
                  Assign
                </Button>
              </div>
            </div>
          )}

          {/* Scrollable Roster Items List */}
          <div style={{ flex: 1, maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {loadingBatchStudents ? (
              <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                <RefreshCw size={24} className="spin" style={{ color: 'var(--primary)', margin: '0 auto' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>Loading batch students...</span>
              </div>
            ) : roster.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <Users size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.5rem' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Select an academic batch to load student roster.
                </span>
              </div>
            ) : (
              roster.map((student) => (
                <div
                  key={student.student_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: student.status === 'present' ? 'var(--bg-card)' : 'var(--bg-card-subtle)',
                    border: '1px solid',
                    borderColor: student.status === 'present' ? 'var(--success-border)' : 'var(--border-color)',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                    <Avatar name={student.full_name} size="xs" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {student.full_name}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                        {student.roll_number}
                        {student.confidence_score !== null && (
                          <span style={{ color: 'var(--success)', marginLeft: '4px', fontWeight: 600 }}>
                            • {Math.round(student.confidence_score * 100)}% Match
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Present / Absent / Late Status Chips */}
                  <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.student_id, 'present')}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: student.status === 'present' ? 'var(--success)' : 'transparent',
                        color: student.status === 'present' ? '#ffffff' : 'var(--text-muted)',
                      }}
                    >
                      P
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.student_id, 'absent')}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: student.status === 'absent' ? 'var(--danger)' : 'transparent',
                        color: student.status === 'absent' ? '#ffffff' : 'var(--text-muted)',
                      }}
                    >
                      A
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.student_id, 'late')}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: student.status === 'late' ? 'var(--warning)' : 'transparent',
                        color: student.status === 'late' ? '#ffffff' : 'var(--text-muted)',
                      }}
                    >
                      L
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* 5. LIVE WEBCAM MODAL */}
      <WebcamModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        title="Capture Classroom Photograph"
      />
    </div>
  );
};

export default TakeAttendance;
