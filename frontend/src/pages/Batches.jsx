import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  BookOpen,
  Users,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  UserPlus,
  UserMinus,
  UserCheck,
  Calendar,
  Camera,
  CheckCircle2,
  Sparkles,
  Award,
  ChevronRight
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SessionHistoryModal from '../components/SessionHistoryModal';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Avatar from '../components/ui/Avatar';

// Gradient palette for batch cards
const BATCH_GRADIENTS = [
  'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(124, 58, 237, 0.04) 100%)',
  'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(59, 130, 246, 0.04) 100%)',
  'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.04) 100%)',
  'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.04) 100%)',
  'linear-gradient(135deg, rgba(236, 72, 153, 0.12) 0%, rgba(168, 85, 247, 0.04) 100%)',
];

const BATCH_ACCENTS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];

const Batches = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [batches, setBatches] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Batch Modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [batchFormError, setBatchFormError] = useState('');
  const [batchFormData, setBatchFormData] = useState({
    name: '',
    subject: '',
    description: '',
    teacher_id: '',
  });

  // Manage Enrollees Modal
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchDetails, setBatchDetails] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState('');
  const [enrollError, setEnrollError] = useState('');
  const [enrollSuccess, setEnrollSuccess] = useState('');
  const [enrollingLoading, setEnrollingLoading] = useState(false);

  // Scope filter: 'all' to show all batches, 'my' to show teacher-assigned batches
  const [filterScope, setFilterScope] = useState('all');

  // Session History Modal
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyBatch, setHistoryBatch] = useState(null);

  const handleOpenHistoryModal = (batch) => {
    setHistoryBatch(batch);
    setIsHistoryModalOpen(true);
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const url = filterScope === 'my' && !isAdmin ? '/batches/' : '/batches/?scope=all';
      const res = await apiClient.get(url);
      setBatches(res.data || []);
    } catch (err) {
      console.error('Failed to load batches', err);
      toast.error('Failed to load batch list.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await apiClient.get('/batches/teachers');
      setTeachersList(res.data || []);
    } catch (err) {
      console.error('Failed to load teachers list', err);
    }
  };

  useEffect(() => {
    fetchBatches();
    if (isAdmin) {
      fetchTeachers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, filterScope]);

  const handleOpenAddBatch = () => {
    setEditingBatch(null);
    setBatchFormData({
      name: '',
      subject: '',
      description: '',
      teacher_id: teachersList.length > 0 ? teachersList[0].id.toString() : '',
    });
    setBatchFormError('');
    setIsBatchModalOpen(true);
  };

  const handleOpenEditBatch = (batch) => {
    setEditingBatch(batch);
    setBatchFormData({
      name: batch.name,
      subject: batch.subject,
      description: batch.description || '',
      teacher_id: batch.teacher_id ? batch.teacher_id.toString() : '',
    });
    setBatchFormError('');
    setIsBatchModalOpen(true);
  };

  const handleSaveBatch = async (e) => {
    e.preventDefault();
    setBatchFormError('');

    const payload = {
      name: batchFormData.name.trim(),
      subject: batchFormData.subject.trim(),
      description: batchFormData.description.trim(),
    };

    if (isAdmin && batchFormData.teacher_id) {
      payload.teacher_id = parseInt(batchFormData.teacher_id);
    }

    try {
      if (editingBatch) {
        await apiClient.put(`/batches/${editingBatch.id}`, payload);
        toast.success(`Batch "${payload.name}" updated successfully.`);
      } else {
        await apiClient.post('/batches/', payload);
        toast.success(`Batch "${payload.name}" created successfully.`);
      }
      setIsBatchModalOpen(false);
      fetchBatches();
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to save batch';
      setBatchFormError(errMsg);
      toast.error(errMsg);
    }
  };

  const handleDeleteBatch = async (batchId, batchName) => {
    if (!isAdmin) {
      toast.warning('Only Administrators can delete batches.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete batch "${batchName}"? This will cascade remove enrollments and attendance sessions.`)) {
      try {
        await apiClient.delete(`/batches/${batchId}`);
        toast.success(`Batch "${batchName}" deleted.`);
        fetchBatches();
      } catch (err) {
        const errMsg = err.response?.data?.detail || 'Failed to delete batch';
        toast.error(errMsg);
      }
    }
  };

  // Enrollee Management
  const handleOpenEnrollModal = async (batch) => {
    setSelectedBatch(batch);
    setEnrollError('');
    setEnrollSuccess('');
    setIsEnrollModalOpen(true);

    try {
      setEnrollingLoading(true);
      const [detailRes, studentsRes] = await Promise.all([
        apiClient.get(`/batches/${batch.id}`),
        apiClient.get('/students/?limit=500'),
      ]);
      setBatchDetails(detailRes.data);
      setAllStudents(studentsRes.data || []);

      const enrolledIds = new Set(
        (detailRes.data.enrolled_students || []).map((s) => s.id)
      );
      const available = (studentsRes.data || []).filter(
        (s) => !enrolledIds.has(s.id)
      );

      if (available.length > 0) {
        setSelectedStudentToEnroll(available[0].id.toString());
      } else {
        setSelectedStudentToEnroll('');
      }
    } catch (err) {
      console.error('Error fetching batch details for enrollment', err);
      setEnrollError(err.response?.data?.detail || 'Failed to load batch enrollments.');
    } finally {
      setEnrollingLoading(false);
    }
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudentToEnroll) {
      setEnrollError('Please select a student to enroll.');
      return;
    }
    setEnrollError('');
    setEnrollSuccess('');

    try {
      await apiClient.post(`/batches/${selectedBatch.id}/enroll`, {
        student_id: parseInt(selectedStudentToEnroll),
      });
      setEnrollSuccess('Student enrolled successfully!');

      const detailRes = await apiClient.get(`/batches/${selectedBatch.id}`);
      setBatchDetails(detailRes.data);

      const enrolledIds = new Set(
        (detailRes.data.enrolled_students || []).map((s) => s.id)
      );
      const remainingAvailable = allStudents.filter(
        (s) => !enrolledIds.has(s.id)
      );

      if (remainingAvailable.length > 0) {
        setSelectedStudentToEnroll(remainingAvailable[0].id.toString());
      } else {
        setSelectedStudentToEnroll('');
      }

      fetchBatches();
    } catch (err) {
      setEnrollError(err.response?.data?.detail || 'Failed to enroll student');
    }
  };

  const handleUnenrollStudent = async (studentId) => {
    setEnrollError('');
    setEnrollSuccess('');

    try {
      await apiClient.delete(`/batches/${selectedBatch.id}/enroll/${studentId}`);
      setEnrollSuccess('Student removed from batch.');

      const detailRes = await apiClient.get(`/batches/${selectedBatch.id}`);
      setBatchDetails(detailRes.data);

      setSelectedStudentToEnroll((prev) => prev || studentId.toString());
      fetchBatches();
    } catch (err) {
      setEnrollError(err.response?.data?.detail || 'Failed to remove student from batch');
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. HEADER ROW */}
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
              Academic Batches
            </h1>
            <Badge variant="primary" size="sm">
              {batches.length} Configured
            </Badge>
          </div>
          <p className="page-subtitle" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Organize coaching batches, set subject curricula, and manage student enrollment rosters.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Scope Filter Tabs */}
          <div className="ui-theme-segmented">
            <button
              type="button"
              className={`ui-theme-segmented-btn ${filterScope === 'all' ? 'active' : ''}`}
              onClick={() => setFilterScope('all')}
            >
              All Batches
            </button>
            <button
              type="button"
              className={`ui-theme-segmented-btn ${filterScope === 'my' ? 'active' : ''}`}
              onClick={() => setFilterScope('my')}
            >
              My Classes
            </button>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAddBatch}
            icon={Plus}
          >
            Create New Batch
          </Button>
        </div>
      </div>

      {/* 2. BATCHES RESPONSIVE CARD GRID */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          <Skeleton variant="card" height={220} />
          <Skeleton variant="card" height={220} />
          <Skeleton variant="card" height={220} />
        </div>
      ) : batches.length === 0 ? (
        <Card style={{ padding: '3.5rem 1.5rem' }}>
          <EmptyState
            icon={BookOpen}
            title="No batches available"
            description="Create your first academic batch to begin enrolling students and marking attendance."
            actionLabel="Create Batch"
            onAction={handleOpenAddBatch}
          />
        </Card>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {batches.map((batch, index) => {
            const accent = BATCH_ACCENTS[index % BATCH_ACCENTS.length];
            const bgGrad = BATCH_GRADIENTS[index % BATCH_GRADIENTS.length];
            const enrolledCount = batch.student_count || (batch.enrolled_students?.length) || 0;

            return (
              <Card
                key={batch.id}
                hoverLift
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.5rem',
                  borderTop: `4px solid ${accent}`,
                  background: bgGrad,
                  position: 'relative',
                }}
              >
                <div>
                  {/* Subject Tag & Quick Edit/Delete */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <Badge variant="accent" size="sm">
                      {batch.subject}
                    </Badge>
                    {(isAdmin || batch.teacher_id === user?.id || !batch.teacher_id) && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditBatch(batch)}
                          title="Edit Batch"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBatch(batch.id, batch.name)}
                          title="Delete Batch"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Batch Title & Description */}
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                    {batch.name}
                  </h3>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.4, minHeight: '38px' }}>
                    {batch.description || 'Core curriculum session with multi-face attendance tracking.'}
                  </p>

                  {/* Faculty Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem' }}>
                    <Avatar name={batch.teacher_name || 'Faculty'} size="xs" />
                    <div style={{ fontSize: '0.785rem', color: 'var(--text-secondary)' }}>
                      Instructor: <strong style={{ color: 'var(--text-primary)' }}>{batch.teacher_name || 'Assigned Tutor'}</strong>
                    </div>
                  </div>

                  {/* Enrolled Students Avatar Stack */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', marginLeft: '6px' }}>
                        {[...Array(Math.min(3, enrolledCount))].map((_, i) => (
                          <div
                            key={i}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: accent,
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              border: '2px solid var(--bg-card)',
                              marginLeft: '-6px',
                            }}
                          >
                            {String.fromCharCode(65 + i)}
                          </div>
                        ))}
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {enrolledCount} {enrolledCount === 1 ? 'Student' : 'Students'}
                      </span>
                    </div>

                    <Badge variant="success" size="sm">
                      <CheckCircle2 size={11} style={{ marginRight: '3px' }} /> Active
                    </Badge>
                  </div>
                </div>

                {/* Batch Action Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <Link
                    to={`/attendance?batch_id=${batch.id}`}
                    className="btn btn-primary btn-sm"
                    style={{ justifyContent: 'center', gap: '4px', textDecoration: 'none' }}
                  >
                    <Camera size={13} />
                    <span>Attend</span>
                  </Link>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenEnrollModal(batch)}
                    style={{ justifyContent: 'center', gap: '4px' }}
                    title="Enroll students in this batch"
                  >
                    <Users size={13} />
                    <span>Roster</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenHistoryModal(batch)}
                    style={{ justifyContent: 'center', gap: '4px' }}
                    title="View session records and tamper-proof audit trail"
                  >
                    <Calendar size={13} />
                    <span>Audit</span>
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 3. MODAL: ADD / EDIT BATCH */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title={editingBatch ? 'Edit Batch' : 'Create New Academic Batch'}
        description="Configure class name, academic subject, and assign faculty."
        size="sm"
      >
        <form onSubmit={handleSaveBatch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {batchFormError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--danger-light)',
                color: 'var(--danger)',
                border: '1px solid var(--danger-border)',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.825rem',
              }}
            >
              <AlertCircle size={15} />
              <span>{batchFormError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Batch Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Physics Grade 12 - Advanced"
              value={batchFormData.name}
              onChange={(e) => setBatchFormData({ ...batchFormData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Subject / Discipline *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Physics, Mathematics, Science"
              value={batchFormData.subject}
              onChange={(e) => setBatchFormData({ ...batchFormData, subject: e.target.value })}
            />
          </div>

          {isAdmin && (
            <div className="form-group">
              <label className="form-label">Faculty Instructor *</label>
              <select
                className="form-input"
                value={batchFormData.teacher_id}
                onChange={(e) => setBatchFormData({ ...batchFormData, teacher_id: e.target.value })}
              >
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Description / Class Schedule</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="e.g. Meets Mon/Wed/Fri 4:00 PM - 5:30 PM"
              value={batchFormData.description}
              onChange={(e) => setBatchFormData({ ...batchFormData, description: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsBatchModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingBatch ? 'Save Changes' : 'Create Batch'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. MODAL: ROSTER & ENROLLEES MANAGEMENT */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title={`Roster: ${selectedBatch?.name || ''}`}
        description="Enroll or remove students from this coaching batch."
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {enrollError && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem' }}>
              {enrollError}
            </div>
          )}
          {enrollSuccess && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem' }}>
              {enrollSuccess}
            </div>
          )}

          {/* Enroll Student Form */}
          <form onSubmit={handleEnrollStudent} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Add Enrolled Student</label>
              <select
                className="form-input"
                value={selectedStudentToEnroll}
                onChange={(e) => setSelectedStudentToEnroll(e.target.value)}
                disabled={enrollingLoading}
              >
                {allStudents
                  .filter((s) => !(batchDetails?.enrolled_students || []).some((es) => es.id === s.id))
                  .map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.roll_number} - {stu.full_name}
                    </option>
                  ))}
              </select>
            </div>
            <Button variant="primary" type="submit" disabled={!selectedStudentToEnroll}>
              <UserPlus size={15} /> Enroll
            </Button>
          </form>

          {/* Currently Enrolled Students List */}
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Currently Enrolled ({(batchDetails?.enrolled_students || []).length})
            </span>
            <div style={{ maxHeight: '280px', overflowY: 'auto', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {(batchDetails?.enrolled_students || []).length === 0 ? (
                <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', padding: '1rem 0' }}>
                  No students currently enrolled in this batch.
                </span>
              ) : (
                batchDetails.enrolled_students.map((stu) => (
                  <div
                    key={stu.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-card-subtle)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <Avatar name={stu.full_name} size="xs" />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {stu.full_name}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                          {stu.roll_number}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnenrollStudent(stu.id)}
                      title="Remove from batch"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <UserMinus size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* 5. SESSION HISTORY & AUDIT TRAIL MODAL */}
      {historyBatch && (
        <SessionHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setHistoryBatch(null);
          }}
          batch={historyBatch}
        />
      )}
    </div>
  );
};

export default Batches;
