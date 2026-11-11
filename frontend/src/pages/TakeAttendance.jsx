import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CheckSquare
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import WebcamModal from '../components/WebcamModal';

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
  // Array of { student_id, roll_number, full_name, status: 'present'|'absent'|'late', method: 'face'|'manual', confidence_score, face_index }
  const [roster, setRoster] = useState([]);
  const [unassignedFaces, setUnassignedFaces] = useState([]); // Array of { index, bbox, det_score }
  const [loadingBatchStudents, setLoadingBatchStudents] = useState(false);

  // Submission & Feedback State
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [createdSessionId, setCreatedSessionId] = useState(null);

  // Canvas & Input Refs
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const mobileInputRef = useRef(null);

  // Live Camera Stream Modal State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // 1. Fetch available batches on mount (Admins see all, Teachers see assigned)
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const res = await apiClient.get(isAdmin ? '/batches/?scope=all' : '/batches/');
        setBatches(res.data);
        if (res.data.length > 0) {
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

        // In manual mode, pre-fill all enrolled students
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

    // Create browser-only Object URL (Zero server-side disk write)
    const localUrl = URL.createObjectURL(file);
    setPhotoUrl(localUrl);
    setRecognitionResult(null);
  };

  // Handle Camera Capture from Live Webcam / Mobile Stream
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
      // 1. Fetch batch detail for student names
      const batchRes = await apiClient.get(`/batches/${selectedBatchId}`);
      const enrolled = batchRes.data.enrolled_students || [];
      const studentMap = new Map(enrolled.map((s) => [s.id, s]));

      // 2. Call face recognition endpoint
      const res = await apiClient.post('/attendance/recognize', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data;
      setRecognitionResult(data);

      // Build initial roster
      const recognizedStudentIds = new Set();
      const newRoster = [];

      // Add detected faces that matched a student
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

      // Add absent enrolled students
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

      // Sort roster by roll number
      newRoster.sort((a, b) => a.roll_number.localeCompare(b.roll_number));
      setRoster(newRoster);

      // Extract unassigned / unknown faces for manual teacher assignment
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
      // Set canvas coordinate space to displayed image size
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

        let strokeColor = '#22c55e'; // Green for matched
        let fillColor = 'rgba(34, 197, 94, 0.15)';
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
            labelText = `Unknown Face #${idx + 1}`;
          }
        }

        // Draw Bounding Box Rectangle
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(boxX, boxY, boxW, boxH);
        ctx.fillStyle = fillColor;
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // Draw Label Tag
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

  // Bulk Roster Controls (Step 3)
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
      prev.map((r) => {
        let newStatus = 'absent';
        if (r.status === 'absent') {
          newStatus = 'present';
        } else {
          newStatus = 'absent';
        }
        return {
          ...r,
          status: newStatus,
          review_flag: false,
        };
      })
    );
    toast.warning(`Inverted attendance selection for ${roster.length} students.`);
  };

  // 7. Assign an Unknown Face to an Absent Student
  const handleAssignUnknownFace = (faceIndex, studentId) => {
    if (!studentId) return;

    // Mark that student as present (method: manual / teacher assigned)
    setRoster((prev) =>
      prev.map((item) =>
        item.student_id === parseInt(studentId)
          ? { ...item, status: 'present', method: 'manual', confidence_score: null }
          : item
      )
    );

    // Remove from unassigned faces list
    setUnassignedFaces((prev) => prev.filter((f) => f.index !== faceIndex));
  };

  // 8. Confirm and Save Attendance Session
  const handleConfirmAndSave = async () => {
    if (!selectedBatchId || !roster.length) {
      setErrorMsg('No students in batch to record attendance.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Create session (or retrieve if one already exists for batch and date)
      let sessionId = createdSessionId;

      if (!sessionId) {
        try {
          const createRes = await apiClient.post('/attendance/sessions', {
            batch_id: parseInt(selectedBatchId),
            session_date: sessionDate,
          });
          sessionId = createRes.data.id;
        } catch (createErr) {
          // If session already exists on this date, fetch existing session ID
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

      // 2. Prepare confirmation payload
      const confirmPayload = {
        records: roster.map((r) => ({
          student_id: r.student_id,
          status: r.status,
          method: r.method,
          confidence_score: r.confidence_score,
        })),
        unrecognized_count: unassignedFaces.length,
      };

      // 3. Post confirmation
      await apiClient.post(`/attendance/sessions/${sessionId}/confirm`, confirmPayload);

      const pCount = roster.filter((r) => r.status === 'present').length;
      const aCount = roster.filter((r) => r.status === 'absent').length;
      const msg = `Attendance confirmed successfully! ${pCount} present, ${aCount} absent.`;
      setSuccessMsg(msg);
      toast.success(msg);
    } catch (err) {
      const errorText = err.response?.data?.detail || 'Failed to confirm attendance. Please try again.';
      setErrorMsg(errorText);
      toast.error(errorText);
    } finally {
      setSaving(false);
    }
  };

  // Aggregated Counts
  const presentCount = roster.filter((r) => r.status === 'present').length;
  const absentCount = roster.filter((r) => r.status === 'absent').length;
  const lateCount = roster.filter((r) => r.status === 'late').length;
  const reviewCount = roster.filter((r) => r.review_flag).length;

  // Real-world value add: 1-Click WhatsApp & SMS absentee update generator for faculty
  const handleShareWhatsAppBroadcast = () => {
    const curBatch = batches.find((b) => b.id.toString() === selectedBatchId);
    const batchName = curBatch ? `${curBatch.name} (${curBatch.subject})` : 'Class Batch';
    const presentStudents = roster.filter((r) => r.status === 'present');
    const absentStudents = roster.filter((r) => r.status === 'absent');
    const lateStudents = roster.filter((r) => r.status === 'late');
    const total = roster.length;
    const rate = total > 0 ? Math.round((presentStudents.length / total) * 100) : 0;

    let msg = `📢 *AttendIQ Attendance Broadcast*\n`;
    msg += `🏫 *Batch:* ${batchName}\n`;
    msg += `📅 *Date:* ${sessionDate}\n`;
    msg += `👨‍🏫 *Faculty:* ${user?.name || 'Faculty Member'}\n`;
    msg += `📊 *Attendance:* ${rate}% (${presentStudents.length} Present / ${absentStudents.length} Absent)\n`;

    if (absentStudents.length > 0) {
      msg += `\n❌ *ABSENT STUDENTS (${absentStudents.length}) - Parent Notification Required:*\n`;
      absentStudents.forEach((s) => {
        msg += `• ${s.roll_number} — ${s.full_name}\n`;
      });
    } else {
      msg += `\n✨ *100% Attendance — Full class present today!*\n`;
    }

    if (lateStudents.length > 0) {
      msg += `\n⏰ *Late Arrivals (${lateStudents.length}):*\n`;
      lateStudents.forEach((s) => {
        msg += `• ${s.roll_number} — ${s.full_name}\n`;
      });
    }

    msg += `\nVerified via AttendIQ Smart Attendance Engine.`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg);
      toast.success('WhatsApp absentee update copied to clipboard! Ready to paste into class group.');
    } else {
      toast.info('Attendance summary prepared.');
    }
  };

  return (
    <div className="attendance-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Take Attendance</h1>
          <p className="page-subtitle">
            Capture or upload a class photo for instant AI face recognition, or record attendance manually.
          </p>
        </div>
      </div>

      {/* Control Bar: Batch, Date, and Mode Selectors */}
      <div className="card control-card">
        <div className="control-row">
          <div className="control-group">
            <label>
              <Users size={16} /> Batch
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => {
                setSelectedBatchId(e.target.value);
                setCreatedSessionId(null);
                setSuccessMsg('');
              }}
              className="select-input"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.subject})
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label>
              <Calendar size={16} /> Session Date
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => {
                setSessionDate(e.target.value);
                setCreatedSessionId(null);
                setSuccessMsg('');
              }}
              className="date-input"
            />
          </div>

          <div className="control-group">
            <label>
              <Layers size={16} /> Mode
            </label>
            <div className="mode-toggle">
              <button
                type="button"
                className={`mode-btn ${mode === 'face' ? 'active' : ''}`}
                onClick={() => setMode('face')}
              >
                <Camera size={16} /> Face Recognition
              </button>
              <button
                type="button"
                className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
                onClick={() => setMode('manual')}
              >
                <Users size={16} /> Manual Roster
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Messages */}
      {errorMsg && (
        <div className="alert alert-error">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <div style={{ flex: 1 }}>
            <span>{successMsg}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleShareWhatsAppBroadcast}
              className="btn btn-sm btn-secondary"
              style={{
                gap: '0.4rem',
                backgroundColor: '#ecfdf5',
                borderColor: '#a7f3d0',
                color: '#065f46',
                fontWeight: 600,
              }}
              title="Copy formatted WhatsApp absentee alert to clipboard for parents and batch group"
            >
              <Smartphone size={14} color="#059669" /> Copy WhatsApp Update
            </button>
            <button
              onClick={() => navigate(`/reports?batch_id=${selectedBatchId}`)}
              className="btn btn-sm btn-secondary"
            >
              View Reports <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* No Enrolled Biometrics Guidance Banner */}
      {recognitionResult &&
        recognitionResult.faces.length > 0 &&
        recognitionResult.faces.every((f) => f.score === 0) && (
          <div className="alert alert-warning" style={{ marginBottom: '1.25rem' }}>
            <AlertTriangle size={20} />
            <div style={{ flex: 1 }}>
              <strong>No Reference Face Photos Enrolled in This Batch</strong>
              <p className="text-sm" style={{ marginTop: '0.25rem' }}>
                {recognitionResult.faces.length} face(s) were detected in your photo, but none of the students in this batch have enrolled face portraits yet (similarity score: 0%).
              </p>
              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/students')}
                  className="btn btn-sm btn-primary"
                >
                  Go to Students to Enroll Faces <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Main Content Workspace: Left (Media/Canvas) | Right (Roster & Review) */}
      <div className="attendance-workspace">
        {/* Left Column: Camera / Canvas Section */}
        {mode === 'face' && (
          <div className="workspace-left card">
            <div className="section-header">
              <h3>Classroom Photograph</h3>
              {photoFile && (
                <button
                  onClick={handleRunRecognition}
                  disabled={recognizing}
                  className="btn btn-primary btn-sm"
                >
                  {recognizing ? (
                    <>
                      <RefreshCw size={14} className="spin" /> Analyzing Faces...
                    </>
                  ) : (
                    <>
                      <Camera size={14} /> Run Recognition
                    </>
                  )}
                </button>
              )}
            </div>

            {!photoUrl ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {/* Instant Camera Capture Options */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    className="btn btn-primary"
                    style={{ justifyContent: 'center', padding: '0.85rem', gap: '0.5rem', fontWeight: 700 }}
                  >
                    <Camera size={18} /> Camera Stream
                  </button>

                  <button
                    type="button"
                    onClick={() => mobileInputRef.current?.click()}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'center', padding: '0.85rem', gap: '0.5rem', fontWeight: 600 }}
                    title="Capture directly with smartphone camera"
                  >
                    <Smartphone size={18} /> Mobile Camera
                  </button>
                  <input
                    ref={mobileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                  />
                </div>

                <label className="upload-dropzone" style={{ margin: 0, padding: '2rem 1rem' }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                  />
                  <Upload size={36} className="upload-icon" />
                  <p className="upload-title">Or Browse / Drop Classroom Photo</p>
                  <p className="upload-subtitle">
                    Supports JPG and PNG up to 10MB. Photo is processed strictly in memory.
                  </p>
                </label>
              </div>
            ) : (
              <div className="canvas-wrapper">
                <img
                  ref={imageRef}
                  src={photoUrl}
                  alt="Classroom"
                  className="classroom-image"
                />
                <canvas ref={canvasRef} className="bounding-box-canvas" />

                <div className="canvas-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Camera size={14} /> Retake with Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => mobileInputRef.current?.click()}
                    className="btn btn-secondary btn-sm"
                  >
                    <Smartphone size={14} /> Mobile Cam
                  </button>
                  <label className="btn btn-secondary btn-sm">
                    <RefreshCw size={14} /> Upload File
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handlePhotoSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Bounding Box Legend */}
            {recognitionResult && (
              <div className="legend-bar">
                <div className="legend-item">
                  <span className="legend-dot green"></span>
                  <span>Matched (Score &ge; 45%)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot amber"></span>
                  <span>Review Needed (35% &ndash; 45%)</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot red"></span>
                  <span>Unknown / Unassigned</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right Column: Interactive Attendance Roster */}
        <div className={`workspace-right card ${mode === 'manual' ? 'full-width' : ''}`}>
          <div className="section-header">
            <div>
              <h3>Student Attendance Roster</h3>
              <p className="text-muted text-sm">
                Review and toggle status for each student before confirming.
              </p>
            </div>
            <button
              onClick={handleConfirmAndSave}
              disabled={saving || !roster.length}
              className="btn btn-success"
            >
              {saving ? (
                <>
                  <RefreshCw size={16} className="spin" /> Saving...
                </>
              ) : (
                <>
                  <Save size={16} /> Confirm and Save
                </>
              )}
            </button>
          </div>

          {/* KPI Mini Bar */}
          <div className="kpi-mini-bar">
            <div className="kpi-mini green">
              <span className="kpi-count">{presentCount}</span>
              <span className="kpi-label">Present</span>
            </div>
            <div className="kpi-mini red">
              <span className="kpi-count">{absentCount}</span>
              <span className="kpi-label">Absent</span>
            </div>
            <div className="kpi-mini amber">
              <span className="kpi-count">{lateCount}</span>
              <span className="kpi-label">Late</span>
            </div>
            {reviewCount > 0 && (
              <div className="kpi-mini amber-border">
                <span className="kpi-count">{reviewCount}</span>
                <span className="kpi-label">Needs Review</span>
              </div>
            )}
            {unassignedFaces.length > 0 && (
              <div className="kpi-mini red-border">
                <span className="kpi-count">{unassignedFaces.length}</span>
                <span className="kpi-label">Unrecognized Faces</span>
              </div>
            )}
          </div>

          {/* Bulk Actions Toolbar (Step 3) */}
          {roster.length > 0 && (
            <div
              className="bulk-toolbar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.85rem',
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
              >
                <CheckSquare size={15} color="var(--primary)" />
                <span>Bulk Controls ({roster.length} students):</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="btn btn-sm btn-secondary"
                  style={{
                    gap: '0.35rem',
                    fontSize: '0.78rem',
                    color: '#15803d',
                    borderColor: '#bbf7d0',
                    backgroundColor: '#f0fdf4',
                    fontWeight: 600,
                  }}
                  title="Mark all students in roster as Present"
                >
                  <CheckCheck size={14} /> Mark All Present
                </button>
                <button
                  type="button"
                  onClick={handleMarkAllAbsent}
                  className="btn btn-sm btn-secondary"
                  style={{
                    gap: '0.35rem',
                    fontSize: '0.78rem',
                    color: '#b91c1c',
                    borderColor: '#fecaca',
                    backgroundColor: '#fef2f2',
                    fontWeight: 600,
                  }}
                  title="Mark all students in roster as Absent (reset)"
                >
                  <UserX size={14} /> Mark All Absent
                </button>
                <button
                  type="button"
                  onClick={handleInvertSelection}
                  className="btn btn-sm btn-secondary"
                  style={{
                    gap: '0.35rem',
                    fontSize: '0.78rem',
                    color: '#4338ca',
                    borderColor: '#c7d2fe',
                    backgroundColor: '#eef2ff',
                    fontWeight: 600,
                  }}
                  title="Invert Selection: Present becomes Absent, Absent becomes Present"
                >
                  <Shuffle size={14} /> Invert Selection
                </button>
              </div>
            </div>
          )}

          {/* Unknown Face Assignment Box */}
          {unassignedFaces.length > 0 && (
            <div className="unknown-assignment-card">
              <div className="unknown-header">
                <AlertTriangle size={16} className="text-amber" />
                <strong>Unassigned Faces ({unassignedFaces.length}):</strong>
                <span className="text-sm text-muted">
                  Assign unrecognized faces to absent students:
                </span>
              </div>
              <div className="unknown-list">
                {unassignedFaces.map((face) => (
                  <div key={face.index} className="unknown-row">
                    <span className="badge badge-danger">Unknown Face #{face.index + 1}</span>
                    <select
                      className="select-input select-sm"
                      defaultValue=""
                      onChange={(e) => handleAssignUnknownFace(face.index, e.target.value)}
                    >
                      <option value="" disabled>
                        Assign to absent student...
                      </option>
                      {roster
                        .filter((r) => r.status === 'absent')
                        .map((s) => (
                          <option key={s.student_id} value={s.student_id}>
                            {s.roll_number} - {s.full_name}
                          </option>
                        ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Student Roster List */}
          {loadingBatchStudents ? (
            <div className="loading-state">
              <RefreshCw size={24} className="spin" />
              <p>Loading student roster...</p>
            </div>
          ) : roster.length === 0 ? (
            <div className="empty-state">
              <Users size={32} />
              <p>No students enrolled in this batch.</p>
            </div>
          ) : (
            <div className="roster-list">
              {roster.map((student) => (
                <div
                  key={student.student_id}
                  className={`roster-item ${student.review_flag ? 'needs-review' : ''}`}
                >
                  <div className="roster-student-info">
                    <span className="roll-badge">{student.roll_number}</span>
                    <div>
                      <span className="student-name">{student.full_name}</span>
                      <div className="student-meta">
                        {student.method === 'face' && student.confidence_score !== null && (
                          <span className="badge badge-info text-xs">
                            Face: {Math.round(student.confidence_score * 100)}%
                          </span>
                        )}
                        {student.review_flag && (
                          <span className="badge badge-warning text-xs">Review Recommended</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="status-toggle-group">
                    <button
                      type="button"
                      className={`status-btn btn-present ${
                        student.status === 'present' ? 'active' : ''
                      }`}
                      onClick={() => handleStatusChange(student.student_id, 'present')}
                    >
                      <UserCheck size={14} /> Present
                    </button>
                    <button
                      type="button"
                      className={`status-btn btn-absent ${
                        student.status === 'absent' ? 'active' : ''
                      }`}
                      onClick={() => handleStatusChange(student.student_id, 'absent')}
                    >
                      <UserX size={14} /> Absent
                    </button>
                    <button
                      type="button"
                      className={`status-btn btn-late ${
                        student.status === 'late' ? 'active' : ''
                      }`}
                      onClick={() => handleStatusChange(student.student_id, 'late')}
                    >
                      <Clock size={14} /> Late
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Confirm Button for Mobile Ergonomics */}
          {roster.length > 4 && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={handleConfirmAndSave}
                disabled={saving || !roster.length}
                className="btn btn-success"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '0.75rem',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                }}
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="spin" /> Saving Attendance...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Confirm and Save Attendance ({presentCount} Present, {absentCount} Absent)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Live Classroom Camera Modal */}
      <WebcamModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        title="Live Classroom Camera Stream"
        subtitle="Aim camera at the classroom to capture all students in the frame"
        overlayType="classroom"
        defaultFacingMode="environment"
      />
    </div>
  );
};

export default TakeAttendance;
