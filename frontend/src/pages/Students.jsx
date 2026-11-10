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
  UserCheck
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import WebcamModal from '../components/WebcamModal';

const Students = () => {
  const { isAdmin } = useAuth();
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
    is_active: true,
  });

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
      is_active: student.is_active,
    });
    setFormError('');
    setIsModalOpen(true);
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

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!isAdmin) {
      toast.warning('Only Administrators can delete student records.');
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to delete student "${studentName}"? This will cascade remove their enrollments, face data, and attendance records.`
      )
    ) {
      try {
        await apiClient.delete(`/students/${studentId}`);
        toast.success(`Student "${studentName}" deleted.`);
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
          <p className="page-subtitle">Register students, manage profiles and face enrollment</p>
        </div>
        <button onClick={handleOpenAddModal} className="btn btn-primary">
          <UserPlus size={18} /> Add New Student
        </button>
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

      {/* Students Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Roll Number</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Phone</th>
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
                  <td>{student.email || '—'}</td>
                  <td>{student.phone || '—'}</td>
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
                      <button
                        onClick={() => handleDeleteStudent(student.id, student.full_name)}
                        className="btn btn-danger btn-icon"
                        title={isAdmin ? 'Delete Student (Admin Only)' : 'Admin role required to delete'}
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
    </div>
  );
};

export default Students;
