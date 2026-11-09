import React, { useState, useEffect } from 'react';
import { Plus, BookOpen, Users, Edit2, Trash2, X, AlertCircle, UserPlus, UserMinus, UserCheck } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

const Batches = () => {
  const { user, isAdmin } = useAuth();
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

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/batches/');
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
  }, [isAdmin]);

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
      } else {
        await apiClient.post('/batches/', payload);
      }
      setIsBatchModalOpen(false);
      fetchBatches();
    } catch (err) {
      setBatchFormError(err.response?.data?.detail || 'Failed to save batch');
    }
  };

  const handleDeleteBatch = async (batchId, batchName) => {
    if (!isAdmin) {
      alert('Only Administrators can delete batches.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete batch "${batchName}"? This will cascade remove enrollments and attendance sessions.`)) {
      try {
        await apiClient.delete(`/batches/${batchId}`);
        fetchBatches();
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to delete batch');
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
        apiClient.get('/students/?limit=300'),
      ]);
      setBatchDetails(detailRes.data);
      setAllStudents(studentsRes.data);
      if (studentsRes.data.length > 0) {
        setSelectedStudentToEnroll(studentsRes.data[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching batch details for enrollment', err);
    }
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudentToEnroll) return;
    setEnrollError('');
    setEnrollSuccess('');

    try {
      await apiClient.post(`/batches/${selectedBatch.id}/enroll`, {
        student_id: parseInt(selectedStudentToEnroll),
      });
      setEnrollSuccess('Student enrolled successfully!');
      const detailRes = await apiClient.get(`/batches/${selectedBatch.id}`);
      setBatchDetails(detailRes.data);
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
              : `Batches assigned to ${user?.name || 'you'}`}
          </p>
        </div>
        <button onClick={handleOpenAddBatch} className="btn btn-primary">
          <Plus size={18} /> Create New Batch
        </button>
      </div>

      {/* Batches Table */}
      <div className="table-container">
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
                      <span style={{ fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <UserCheck size={14} color="var(--primary)" /> {batch.teacher_name}
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
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
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
      {isEnrollModalOpen && (
        <div className="modal-content-wrapper">
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
                <form onSubmit={handleEnrollStudent} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <select
                    className="form-select"
                    value={selectedStudentToEnroll}
                    onChange={(e) => setSelectedStudentToEnroll(e.target.value)}
                    style={{ flexGrow: 1 }}
                  >
                    {allStudents.map((stu) => (
                      <option key={stu.id} value={stu.id}>
                        {stu.roll_number} - {stu.full_name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                    <UserPlus size={16} /> Enroll
                  </button>
                </form>

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
        </div>
      )}
    </div>
  );
};

export default Batches;
