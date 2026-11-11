import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Users, Edit2, Trash2, X, AlertCircle, UserPlus, UserMinus, UserCheck, Calendar } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SessionHistoryModal from '../components/SessionHistoryModal';

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

  // Scope filter: 'all' to show all 5 coaching batches, 'my' to show teacher-assigned batches
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
      setBatches(res.data);
    } catch (err) {
      console.error('Failed to load batches', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await apiClient.get('/batches/teachers');
      setTeachersList(res.data);
    } catch (err) {
      console.error('Failed to load teachers list', err);
    }
  };

  useEffect(() => {
    fetchBatches();
    if (isAdmin) {
      fetchTeachers();
    }
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
      name: batchFormData.name,
      subject: batchFormData.subject,
      description: batchFormData.description,
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
      const [detailRes, studentsRes] = await Promise.all([
        apiClient.get(`/batches/${batch.id}`),
        apiClient.get('/students/?limit=500'),
      ]);
      setBatchDetails(detailRes.data);
      setAllStudents(studentsRes.data);

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
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Batches Management</h1>
          <p className="page-subtitle">
            {isAdmin
              ? 'Organize classes, assign teachers, and manage enrollments'
              : 'View all coaching batches and manage enrollments in your assigned classes'}
          </p>
        </div>
        <button onClick={handleOpenAddBatch} className="btn btn-primary">
          <Plus size={18} /> Create New Batch
        </button>
      </div>

      {/* Teacher View Scope Filter */}
      {!isAdmin && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${filterScope === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterScope('all')}
          >
            All Coaching Batches
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filterScope === 'my' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterScope('my')}
          >
            My Assigned Batches
          </button>
        </div>
      )}

      {/* Batches Table (Desktop Viewport) */}
      <div className="table-container desktop-only">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Batch Name</th>
              <th>Subject</th>
              <th>Assigned Teacher</th>
              <th>Enrolled Students</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading batches...
                </td>
              </tr>
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                  {isAdmin
                    ? 'No batches created yet. Click "Create New Batch" to add one!'
                    : 'You currently have no batches assigned to you.'}
                </td>
              </tr>
            ) : (
              batches.map((batch) => (
                <tr key={batch.id}>
                  <td><strong>#{batch.id}</strong></td>
                  <td style={{ fontWeight: 600 }}>{batch.name}</td>
                  <td>
                    <span className="badge" style={{ backgroundColor: '#eef2ff', color: 'var(--primary)' }}>
                      {batch.subject}
                    </span>
                  </td>
                  <td>
                    {batch.teacher_name ? (
                      <span style={{ fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <UserCheck size={14} color="var(--primary)" /> {batch.teacher_name}
                        {user?.name && batch.teacher_name.toLowerCase().includes(user.name.toLowerCase().split(' ').pop()) && (
                          <span className="badge" style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.72rem', padding: '0.1rem 0.45rem' }}>
                            Your Batch
                          </span>
                        )}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleOpenEnrollModal(batch)}
                      className="btn btn-secondary btn-sm"
                      style={{ gap: '0.4rem' }}
                    >
                      <Users size={14} />
                      {batch.enrolled_count} Students
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button
                        onClick={() => handleOpenHistoryModal(batch)}
                        className="btn btn-secondary btn-sm"
                        style={{ gap: '0.35rem', padding: '0.35rem 0.65rem' }}
                        title="Inspect past attendance dates, face vs manual verification, unrecognized faces"
                      >
                        <Calendar size={14} /> History
                      </button>
                      <button
                        onClick={() => handleOpenEditBatch(batch)}
                        className="btn btn-secondary btn-icon"
                        title="Edit Batch"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteBatch(batch.id, batch.name)}
                        className="btn btn-danger btn-icon"
                        title={isAdmin ? 'Delete Batch (Admin Only)' : 'Admin role required to delete'}
                        style={!isAdmin ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Batch Cards (< 768px Viewport) */}
      <div className="mobile-batch-cards">
        {loading ? (
          <div className="card text-center" style={{ padding: '2.5rem', color: 'var(--text-secondary)' }}>
            Loading batches...
          </div>
        ) : batches.length === 0 ? (
          <div className="card text-center" style={{ padding: '2.5rem', color: 'var(--text-secondary)' }}>
            {isAdmin
              ? 'No batches created yet. Tap "Create New Batch" to add one!'
              : 'You currently have no batches assigned to you.'}
          </div>
        ) : (
          batches.map((batch) => {
            const isMyBatch = Boolean(user?.name && batch.teacher_name && batch.teacher_name.toLowerCase().includes(user.name.toLowerCase().split(' ').pop()));
            return (
              <div key={`mob-batch-${batch.id}`} className="batch-mobile-card">
                <div className="batch-card-top">
                  <div>
                    <h4 className="batch-card-name">{batch.name}</h4>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ backgroundColor: '#eef2ff', color: 'var(--primary)' }}>
                        {batch.subject}
                      </span>
                      {isMyBatch && (
                        <span className="badge" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
                          Your Batch
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="batch-id-chip">#{batch.id}</span>
                </div>

                <div className="batch-card-details">
                  <div className="detail-item">
                    <UserCheck size={14} color="var(--primary)" />
                    <span>Faculty: <strong>{batch.teacher_name || 'Unassigned'}</strong></span>
                  </div>
                  <button
                    onClick={() => handleOpenEnrollModal(batch)}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '0.35rem', padding: '0.3rem 0.65rem', fontWeight: 600 }}
                  >
                    <Users size={14} /> {batch.enrolled_count} Students
                  </button>
                </div>

                {batch.description && (
                  <p style={{ margin: '0.5rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {batch.description}
                  </p>
                )}

                <div className="batch-card-actions">
                  <button
                    onClick={() => handleOpenHistoryModal(batch)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1.2, justifyContent: 'center', gap: '0.35rem', fontWeight: 600 }}
                    title="Inspect past attendance dates & audit trail"
                  >
                    <Calendar size={14} /> History
                  </button>
                  <button
                    onClick={() => handleOpenEnrollModal(batch)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, justifyContent: 'center', gap: '0.35rem', fontWeight: 600 }}
                  >
                    <Users size={14} /> Enroll
                  </button>
                  <button
                    onClick={() => handleOpenEditBatch(batch)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 0.8, justifyContent: 'center', gap: '0.35rem', fontWeight: 600 }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteBatch(batch.id, batch.name)}
                      className="btn btn-danger btn-sm"
                      style={{ justifyContent: 'center', padding: '0.4rem 0.65rem' }}
                      title="Delete Batch"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Batch Modal */}
      {isBatchModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingBatch ? 'Edit Batch Details' : 'Create New Batch'}
              </h3>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveBatch}>
              <div className="modal-body">
                {batchFormError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      backgroundColor: 'var(--danger-light)',
                      color: 'var(--danger)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{batchFormError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Batch Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Class 10 - Mathematics Morning"
                    value={batchFormData.name}
                    onChange={(e) => setBatchFormData({ ...batchFormData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Mathematics"
                    value={batchFormData.subject}
                    onChange={(e) => setBatchFormData({ ...batchFormData, subject: e.target.value })}
                  />
                </div>

                {/* Admin-only Teacher Assignment Dropdown */}
                {isAdmin && (
                  <div className="form-group">
                    <label className="form-label">Assigned Teacher (Admin Only)</label>
                    <select
                      className="form-select"
                      value={batchFormData.teacher_id}
                      onChange={(e) => setBatchFormData({ ...batchFormData, teacher_id: e.target.value })}
                    >
                      <option value="">-- Unassigned --</option>
                      {teachersList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name} ({t.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder="Brief description or batch timings..."
                    value={batchFormData.description}
                    onChange={(e) => setBatchFormData({ ...batchFormData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBatch ? 'Save Changes' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Enrollees Modal */}
      {isEnrollModalOpen && (() => {
        const enrolledIds = new Set(
          (batchDetails?.enrolled_students || []).map((s) => s.id)
        );
        const availableStudents = allStudents.filter(
          (s) => !enrolledIds.has(s.id)
        );

        return (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '640px' }}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Batch Enrollments</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {selectedBatch?.name} ({selectedBatch?.subject})
                  </div>
                </div>
                <button
                  onClick={() => setIsEnrollModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                {enrollError && (
                  <div
                    style={{
                      backgroundColor: 'var(--danger-light)',
                      color: 'var(--danger)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      marginBottom: '1rem',
                    }}
                  >
                    {enrollError}
                  </div>
                )}

                {enrollSuccess && (
                  <div
                    style={{
                      backgroundColor: 'var(--success-light)',
                      color: '#047857',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      marginBottom: '1rem',
                    }}
                  >
                    {enrollSuccess}
                  </div>
                )}

                {/* Enroll Form */}
                {availableStudents.length === 0 ? (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: '#f8fafc',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '1.5rem',
                    }}
                  >
                    All registered students are currently enrolled in this batch.
                  </div>
                ) : (
                  <form onSubmit={handleEnrollStudent} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <select
                      className="form-select select-input"
                      value={selectedStudentToEnroll}
                      onChange={(e) => setSelectedStudentToEnroll(e.target.value)}
                      style={{ flexGrow: 1 }}
                    >
                      {availableStudents.map((stu) => (
                        <option key={stu.id} value={stu.id}>
                          {stu.roll_number} - {stu.full_name}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                      <UserPlus size={16} /> Enroll Student
                    </button>
                  </form>
                )}

                {/* Enrolled Students List */}
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Currently Enrolled ({batchDetails?.enrolled_students?.length || 0})
                </h4>

                {batchDetails?.enrolled_students?.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                    No students currently enrolled in this batch.
                  </p>
                ) : (
                  <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                    <table className="data-table" style={{ fontSize: '0.85rem' }}>
                      <tbody>
                        {batchDetails?.enrolled_students?.map((stu) => (
                          <tr key={stu.id}>
                            <td style={{ fontWeight: 600 }}>{stu.roll_number}</td>
                            <td>{stu.full_name}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                onClick={() => handleUnenrollStudent(stu.id)}
                                className="btn btn-danger btn-sm"
                                title="Remove from batch"
                                style={{ padding: '0.25rem 0.5rem' }}
                              >
                                <UserMinus size={14} /> Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Past Attendance History & Session Inspector Modal */}
      <SessionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryBatch(null);
        }}
        batch={historyBatch}
      />
    </div>
  );
};

export default Batches;
