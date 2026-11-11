import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  UserPlus,
  X,
  AlertCircle,
  Camera,
  CheckCircle2,
  Upload,
  ShieldCheck,
  UserCheck,
  Phone,
  Mail,
  MessageSquare
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import WebcamModal from '../components/WebcamModal';

const Students = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Student Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    roll_number: '',
    full_name: '',
    email: '',
    phone: '',
    parent_name: '',
    parent_phone: '',
    is_active: true,
  });

  // Biometric Data Retention State (DPDP Compliance)
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);
  const [purgingBiometrics, setPurgingBiometrics] = useState(false);

  // Face Enrollment Modal State
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [faceData, setFaceData] = useState({
    enrolled_count: 0,
    consent_given: false,
    consent_at: null,
  });
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceError, setFaceError] = useState('');
  const [faceSuccess, setFaceSuccess] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [uploadingFaces, setUploadingFaces] = useState(false);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);

  const handleWebcamCapture = (file, previewUrl) => {
    if (selectedPhotos.length >= 5) {
      setFaceError('You can upload at most 5 photos at a time.');
      return;
    }
    setFaceError('');
    setSelectedPhotos((prev) => [...prev, file]);
    setPhotoPreviews((prev) => [...prev, previewUrl]);
  };

  const fetchStudents = async (query = '') => {
    try {
      setLoading(true);
      const url = query ? `/students/?search=${encodeURIComponent(query)}` : '/students/';
      const response = await apiClient.get(url);
      setStudents(response.data);
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(search);
  }, [search]);

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormData({
      roll_number: '',
      full_name: '',
      email: '',
      phone: '',
      parent_name: '',
      parent_phone: '',
      is_active: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      roll_number: student.roll_number,
      full_name: student.full_name,
      email: student.email || '',
      phone: student.phone || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      is_active: student.is_active,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handlePurgeInactiveFaces = async () => {
    try {
      setPurgingBiometrics(true);
      const res = await apiClient.post('/students/privacy/purge-inactive-faces');
      toast.success(res.data?.message || 'Biometric retention purge completed successfully.');
      setIsRetentionModalOpen(false);
      fetchStudents(search);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to purge inactive biometric embeddings.');
    } finally {
      setPurgingBiometrics(false);
    }
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      if (editingStudent) {
        await apiClient.put(`/students/${editingStudent.id}`, formData);
        toast.success(`Student ${formData.full_name} updated successfully.`);
      } else {
        await apiClient.post('/students/', formData);
        toast.success(`Student ${formData.full_name} registered successfully.`);
      }
      setIsModalOpen(false);
      fetchStudents(search);
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to save student details. Please verify the input.';
      setFormError(errMsg);
      toast.error(errMsg);
    }
  };

  const handleDeleteStudent = async (student) => {
    const isOwner = Boolean(student.creator_id && user?.id && student.creator_id === user.id);
    if (!isAdmin && !isOwner) {
      toast.warning('Only Administrators or the tutor who registered this student can delete this record.');
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete student "${student.full_name}" (${student.roll_number})? This will cascade remove their enrollments, face data, and attendance records.`
      )
    ) {
      try {
        await apiClient.delete(`/students/${student.id}`);
        toast.success(`Student "${student.full_name}" deleted.`);
        fetchStudents(search);
      } catch (err) {
        const errMsg = err.response?.data?.detail || 'Failed to delete student.';
        toast.error(errMsg);
      }
    }
  };

  // ==========================================
  // FACE ENROLLMENT HANDLERS
  // ==========================================
  const handleOpenFaceModal = async (student) => {
    setSelectedStudent(student);
    setFaceError('');
    setFaceSuccess('');
    setSelectedPhotos([]);
    setPhotoPreviews([]);
    setIsFaceModalOpen(true);
    setFaceLoading(true);

    try {
      const res = await apiClient.get(`/students/${student.id}/faces`);
      setFaceData(res.data);
    } catch (err) {
      setFaceError(err.response?.data?.detail || 'Failed to fetch face enrollment status.');
    } finally {
      setFaceLoading(false);
    }
  };

  const handleConsentToggle = async (e) => {
    const isChecked = e.target.checked;
    setFaceError('');
    setFaceSuccess('');

    if (!isChecked && faceData.enrolled_count > 0) {
      const confirmRevoke = window.confirm(
        'Revoking consent will immediately delete all enrolled face embeddings for this student. Do you wish to continue?'
      );
      if (!confirmRevoke) return;
    }

    try {
      const res = await apiClient.patch(`/students/${selectedStudent.id}/consent`, {
        consent_given: isChecked,
      });
      setFaceData((prev) => ({
        ...prev,
        consent_given: res.data.consent_given,
        consent_at: res.data.consent_at,
        enrolled_count: isChecked ? prev.enrolled_count : 0,
      }));
      setFaceSuccess(
        isChecked
          ? 'Consent recorded. You may now upload face portrait photos.'
          : 'Consent revoked and face data removed.'
      );
      fetchStudents(search);
    } catch (err) {
      setFaceError(err.response?.data?.detail || 'Failed to update consent.');
    }
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (files.length > 5) {
      setFaceError('You can upload at most 5 photos at a time.');
      return;
    }

    setFaceError('');
    setSelectedPhotos(files);

    // Create thumbnail previews
    const previews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews(previews);
  };

  const handleRemovePhoto = (index) => {
    const updatedPhotos = selectedPhotos.filter((_, i) => i !== index);
    const updatedPreviews = photoPreviews.filter((_, i) => i !== index);
    setSelectedPhotos(updatedPhotos);
    setPhotoPreviews(updatedPreviews);
  };

  const handleUploadFaces = async (e) => {
    e.preventDefault();
    if (!selectedPhotos.length) {
      setFaceError('Please select 1 to 5 face portrait photos to upload.');
      return;
    }

    setFaceError('');
    setFaceSuccess('');
    setUploadingFaces(true);

    const formDataUpload = new FormData();
    selectedPhotos.forEach((file) => {
      formDataUpload.append('photos', file);
    });

    try {
      const res = await apiClient.post(`/students/${selectedStudent.id}/faces`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFaceSuccess(res.data.message);
      toast.success(res.data.message);
      setFaceData((prev) => ({ ...prev, enrolled_count: res.data.enrolled_count }));
      setSelectedPhotos([]);
      setPhotoPreviews([]);
      fetchStudents(search);
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to enroll face photos. Please ensure each photo has exactly one face.';
      setFaceError(errMsg);
      toast.error(errMsg);
    } finally {
      setUploadingFaces(false);
    }
  };

  const handleDeleteFaceData = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete all enrolled face embeddings for ${selectedStudent.full_name}?`
      )
    ) {
      return;
    }

    setFaceError('');
    setFaceSuccess('');

    try {
      await apiClient.delete(`/students/${selectedStudent.id}/faces`);
      setFaceSuccess('All face embeddings deleted successfully.');
      toast.info('All face embeddings deleted successfully.');
      setFaceData((prev) => ({ ...prev, enrolled_count: 0 }));
      fetchStudents(search);
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to delete face data.';
      setFaceError(errMsg);
      toast.error(errMsg);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Students Management</h1>
          <p className="page-subtitle">Register students, manage profiles, parent contacts and biometric enrollment</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {isAdmin && (
            <button
              onClick={() => setIsRetentionModalOpen(true)}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                border: '1px solid #cbd5e1',
                fontWeight: 600,
              }}
              title="Biometric Data Retention Control (DPDP Act compliance): Purge face biometrics for inactive students"
            >
              <ShieldCheck size={16} color="var(--primary)" /> Biometric Retention Purge
            </button>
          )}
          <button onClick={handleOpenAddModal} className="btn btn-primary">
            <UserPlus size={18} /> Add New Student
          </button>
        </div>
      </div>

      {/* Toolbar / Search */}
      <div className="toolbar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by student name or roll number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Students Data Table (Desktop Viewport) */}
      <div className="table-container desktop-only">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Roll Number</th>
              <th>Full Name</th>
              <th>Parent Contact</th>
              <th>Email / Phone</th>
              <th>Status</th>
              <th>Face Data Consent</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading students...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td
                  colSpan="8"
                  style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}
                >
                  No students found. Click "Add New Student" to get started!
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id}>
                  <td>
                    <strong>#{student.id}</strong>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      {student.roll_number}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{student.full_name}</td>
                  <td>
                    {student.parent_name ? (
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>{student.parent_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {student.parent_phone || 'No phone'}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.825rem' }}>{student.email || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {student.phone || '—'}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${student.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      {student.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    {student.consent_given ? (
                      <span
                        className="badge"
                        style={{ backgroundColor: '#ecfdf5', color: '#047857', gap: '0.25rem' }}
                      >
                        <ShieldCheck size={13} /> Consent Active
                      </span>
                    ) : (
                      <span
                        className="badge"
                        style={{ backgroundColor: '#f1f5f9', color: '#64748b' }}
                      >
                        No Consent
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        onClick={() => handleOpenFaceModal(student)}
                        className="btn btn-secondary btn-icon"
                        title="Face Enrollment & Consent"
                        style={{ color: 'var(--primary)', borderColor: 'var(--primary-light)' }}
                      >
                        <Camera size={16} />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(student)}
                        className="btn btn-secondary btn-icon"
                        title="Edit Student"
                      >
                        <Edit2 size={15} />
                      </button>
                      {(() => {
                        const canDelete = isAdmin || Boolean(student.creator_id && user?.id && student.creator_id === user.id);
                        return (
                          <button
                            onClick={() => handleDeleteStudent(student)}
                            className="btn btn-danger btn-icon"
                            title={canDelete ? 'Delete Student' : 'Only workspace creator or Admin can delete'}
                            style={!canDelete ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
                          >
                            <Trash2 size={15} />
                          </button>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Student Cards (< 768px Viewports) */}
      <div className="mobile-student-cards">
        {loading ? (
          <div className="card text-center" style={{ padding: '2.5rem', color: 'var(--text-secondary)' }}>
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="card text-center" style={{ padding: '2.5rem', color: 'var(--text-secondary)' }}>
            No students found. Tap "Add New Student" to get started!
          </div>
        ) : (
          students.map((student) => {
            const canDelete = isAdmin || Boolean(student.creator_id && user?.id && student.creator_id === user.id);
            const parentPhoneClean = student.parent_phone ? student.parent_phone.replace(/[^0-9]/g, '') : '';
            return (
              <div key={`mob-${student.id}`} className="student-mobile-card">
                <div className="student-card-top">
                  <span className="student-roll-chip">{student.roll_number}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="student-card-name">{student.full_name}</div>
                    <div className="student-card-meta">
                      <span className={`badge ${student.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {student.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {student.consent_given ? (
                        <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>
                          <ShieldCheck size={12} /> Consent Active
                        </span>
                      ) : (
                        <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>
                          No Consent
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Parent Contact Details & WhatsApp / Call CTA */}
                {student.parent_name && (
                  <div className="student-card-parent-box">
                    <div className="parent-info-text">
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                        Parent: {student.parent_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {student.parent_phone || 'No phone recorded'}
                      </div>
                    </div>
                    {parentPhoneClean && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <a
                          href={`https://wa.me/${parentPhoneClean}?text=${encodeURIComponent(
                            `Hello ${student.parent_name}, this is an update regarding ${student.full_name} (${student.roll_number}).`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-quick-wa"
                          title="Chat with parent on WhatsApp"
                        >
                          <MessageSquare size={13} /> WhatsApp
                        </a>
                        <a
                          href={`tel:${parentPhoneClean}`}
                          className="btn-quick-call"
                          title="Call parent"
                        >
                          <Phone size={13} /> Call
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Email / Phone info */}
                {(student.email || student.phone) && (
                  <div className="student-card-contact-row">
                    {student.email && (
                      <span className="contact-item">
                        <Mail size={12} /> {student.email}
                      </span>
                    )}
                    {student.phone && (
                      <span className="contact-item">
                        <Phone size={12} /> {student.phone}
                      </span>
                    )}
                  </div>
                )}

                {/* Touch-Friendly Action Buttons */}
                <div className="student-card-actions">
                  <button
                    onClick={() => handleOpenFaceModal(student)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, justifyContent: 'center', gap: '0.35rem', color: 'var(--primary)', fontWeight: 600 }}
                  >
                    <Camera size={15} /> Face Data
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(student)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, justifyContent: 'center', gap: '0.35rem', fontWeight: 600 }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteStudent(student)}
                    className="btn btn-danger btn-sm"
                    style={{
                      flex: canDelete ? 1 : 0.8,
                      justifyContent: 'center',
                      gap: '0.35rem',
                      opacity: canDelete ? 1 : 0.45,
                      cursor: canDelete ? 'pointer' : 'not-allowed',
                      fontWeight: 600,
                    }}
                    title={canDelete ? 'Delete student' : 'Only workspace creator or Admin can delete'}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Student Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingStudent ? 'Edit Student Profile' : 'Register New Student'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStudent}>
              <div className="modal-body">
                {formError && (
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
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Roll Number *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. STU-106"
                    value={formData.roll_number}
                    onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Rahul Sharma"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="e.g. rahul@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. +91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Parent / Guardian Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Mr. Vikram Sharma"
                    value={formData.parent_name}
                    onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Parent WhatsApp / Phone</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. +91 9811100201"
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <label htmlFor="is_active" style={{ fontSize: '0.9rem', cursor: 'pointer' }}>
                    Active Student Status
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingStudent ? 'Update Student' : 'Create Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHASE 2: FACE ENROLLMENT MODAL */}
      {isFaceModalOpen && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Face Enrollment</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {selectedStudent.full_name} ({selectedStudent.roll_number})
                </div>
              </div>
              <button
                onClick={() => setIsFaceModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {faceError && (
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
                  <span>{faceError}</span>
                </div>
              )}

              {faceSuccess && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: 'var(--success-light)',
                    color: '#047857',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    marginBottom: '1rem',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{faceSuccess}</span>
                </div>
              )}

              {/* 1. Consent Box */}
              <div
                style={{
                  padding: '1rem',
                  background: '#f8fafc',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.25rem',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontWeight: 700,
                    fontSize: '0.925rem',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={faceData.consent_given}
                    onChange={handleConsentToggle}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span>Consent to store face data</span>
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', marginLeft: '1.7rem' }}>
                  Authorizes feature vector generation for attendance recognition. No raw photos are stored.
                </p>
                {faceData.consent_at && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#047857',
                      marginTop: '0.35rem',
                      marginLeft: '1.7rem',
                      fontWeight: 600,
                    }}
                  >
                    Consent recorded on: {new Date(faceData.consent_at).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* 2. Enrolled Status Metric */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: '#f1f5f9',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.25rem',
                }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Enrolled Face Vectors:</span>
                <span
                  className="badge"
                  style={{
                    backgroundColor: faceData.enrolled_count > 0 ? '#dcfce7' : '#fee2e2',
                    color: faceData.enrolled_count > 0 ? '#15803d' : '#b91c1c',
                    fontSize: '0.85rem',
                  }}
                >
                  {faceData.enrolled_count} / 5 Enrolled
                </span>
              </div>

              {/* 3. Multi-Photo Upload Section */}
              {faceData.consent_given ? (
                <form onSubmit={handleUploadFaces}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Add Portrait Photos (1 to 5 images)</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>
                        {selectedPhotos.length} / 5 Selected
                      </span>
                    </label>

                    {/* Camera and Upload Buttons Group */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setIsWebcamOpen(true)}
                        className="btn btn-primary"
                        style={{ justifyContent: 'center', gap: '0.5rem', padding: '0.65rem' }}
                      >
                        <Camera size={16} /> Use Live Webcam
                      </button>

                      <label
                        className="btn btn-secondary"
                        style={{ justifyContent: 'center', gap: '0.5rem', padding: '0.65rem', cursor: 'pointer', margin: 0 }}
                      >
                        <Upload size={16} /> Browse Files
                        <input
                          type="file"
                          multiple
                          accept=".jpg,.jpeg,.png"
                          onChange={handlePhotoSelect}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Front-facing single-person photos. Snap with webcam/mobile or select image files.
                    </div>
                  </div>

                  {/* Thumbnail Previews */}
                  {photoPreviews.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                      {photoPreviews.map((url, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            width: '80px',
                            height: '80px',
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <img
                            src={url}
                            alt={`Preview ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              backgroundColor: 'rgba(0,0,0,0.6)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '18px',
                              height: '18px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={uploadingFaces || selectedPhotos.length === 0}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Upload size={16} />
                    {uploadingFaces ? 'Detecting & Extracting Vectors...' : `Enroll ${selectedPhotos.length || ''} Selected Face(s)`}
                  </button>
                </form>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '1.5rem',
                    background: '#f8fafc',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    fontSize: '0.85rem',
                  }}
                >
                  Please enable <strong>"Consent to store face data"</strong> above to upload portrait photos for recognition.
                </div>
              )}

              {/* 4. Delete Action */}
              {faceData.enrolled_count > 0 && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={handleDeleteFaceData}
                    className="btn btn-danger btn-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <Trash2 size={15} /> Delete All Face Data for this Student
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setIsFaceModalOpen(false)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Live Webcam Modal for Portrait Enrollment */}
      <WebcamModal
        isOpen={isWebcamOpen}
        onClose={() => setIsWebcamOpen(false)}
        onCapture={handleWebcamCapture}
        title="Student Portrait Capture"
        subtitle={`Align ${selectedStudent?.full_name || 'student'} within the oval guide for optimal recognition`}
        overlayType="portrait"
        defaultFacingMode="user"
      />

      {/* Biometric Data Retention Purge Modal (DPDP Compliance) */}
      {isRetentionModalOpen && (
        <div
          className="modal-overlay"
          style={{
            zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: '500px',
              width: '90%',
              borderRadius: '14px',
              padding: '1.5rem',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  Biometric Data Retention Control
                </h3>
                <span className="badge badge-warning" style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                  DPDP Act & GDPR Privacy Compliance
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1rem' }}>
              In accordance with strict biometric privacy principles and the Digital Personal Data Protection (DPDP) Act,
              institutes must not retain biometric vectors for students who are no longer enrolled.
            </p>

            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '0.85rem',
                marginBottom: '1.25rem',
                fontSize: '0.825rem',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                This automated action will:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)' }}>
                <li>Permanently erase high-dimensional facial embeddings for all <strong>inactive</strong> students.</li>
                <li>Preserve academic attendance session records for dispute inspection.</li>
                <li>Leave active enrolled students completely untouched.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsRetentionModalOpen(false)}
                disabled={purgingBiometrics}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurgeInactiveFaces}
                disabled={purgingBiometrics}
                className="btn btn-danger"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Trash2 size={15} /> {purgingBiometrics ? 'Purging...' : 'Execute Biometric Purge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
