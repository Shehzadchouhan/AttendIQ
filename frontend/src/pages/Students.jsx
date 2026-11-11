import React, { useState, useEffect, useMemo } from 'react';
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
  MessageSquare,
  ArrowUpDown,
  Filter,
  Trash,
  Check
} from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import WebcamModal from '../components/WebcamModal';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Drawer from '../components/ui/Drawer';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import Avatar from '../components/ui/Avatar';

const Students = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive' | 'consent_given' | 'consent_pending'
  const [sortField, setSortField] = useState('roll_number');
  const [sortDirection, setSortDirection] = useState('asc');
  const [loading, setLoading] = useState(true);

  // Student Create/Edit Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
    consent_given: false,
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
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [uploadingFaces, setUploadingFaces] = useState(false);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);

  const fetchStudents = async (query = '') => {
    try {
      setLoading(true);
      const url = query ? `/students/?search=${encodeURIComponent(query)}` : '/students/';
      const response = await apiClient.get(url);
      setStudents(response.data || []);
    } catch (err) {
      console.error('Failed to load students', err);
      toast.error('Failed to load student directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Open Drawer for New Student
  const handleOpenAddDrawer = () => {
    setEditingStudent(null);
    setFormData({
      roll_number: '',
      full_name: '',
      email: '',
      phone: '',
      parent_name: '',
      parent_phone: '',
      is_active: true,
      consent_given: false,
    });
    setFormError('');
    setIsDrawerOpen(true);
  };

  // Open Drawer for Editing Student
  const handleOpenEditDrawer = (stu) => {
    setEditingStudent(stu);
    setFormData({
      roll_number: stu.roll_number,
      full_name: stu.full_name,
      email: stu.email || '',
      phone: stu.phone || '',
      parent_name: stu.parent_name || '',
      parent_phone: stu.parent_phone || '',
      is_active: stu.is_active,
      consent_given: !!stu.consent_given,
    });
    setFormError('');
    setIsDrawerOpen(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const payload = {
        roll_number: formData.roll_number.trim(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        parent_name: formData.parent_name.trim() || undefined,
        parent_phone: formData.parent_phone.trim() || undefined,
        is_active: formData.is_active,
      };

      if (editingStudent) {
        await apiClient.put(`/students/${editingStudent.id}`, payload);
        toast.success(`Student ${payload.full_name} updated successfully.`);
      } else {
        await apiClient.post('/students/', payload);
        toast.success(`Student ${payload.full_name} enrolled successfully.`);
      }

      setIsDrawerOpen(false);
      fetchStudents(search);
    } catch (err) {
      console.error('Failed to save student', err);
      setFormError(err.response?.data?.detail || 'Failed to save student record.');
    }
  };

  const handleDeleteStudent = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete student "${name}"? All associated attendance records and biometric embeddings will be permanently removed.`)) {
      return;
    }

    try {
      await apiClient.delete(`/students/${id}`);
      toast.success(`Student ${name} deleted.`);
      fetchStudents(search);
    } catch (err) {
      console.error('Failed to delete student', err);
      toast.error(err.response?.data?.detail || 'Failed to delete student.');
    }
  };

  // Open Biometric Photos Modal
  const handleOpenFaceModal = async (stu) => {
    setSelectedStudent(stu);
    setSelectedPhotos([]);
    setPhotoPreviews([]);
    setFaceError('');
    setIsFaceModalOpen(true);
    setFaceLoading(true);

    try {
      const res = await apiClient.get(`/students/${stu.id}/faces`);
      setFaceData(res.data);
    } catch (err) {
      console.error('Failed to load face data', err);
      setFaceError('Could not load existing biometric profile.');
    } finally {
      setFaceLoading(false);
    }
  };

  // Toggle Biometric Consent (DPDP compliance)
  const handleToggleConsent = async () => {
    if (!selectedStudent) return;
    try {
      setFaceLoading(true);
      const nextConsent = !faceData.consent_given;
      const res = await apiClient.patch(`/students/${selectedStudent.id}/consent`, {
        consent_given: nextConsent,
      });
      setFaceData((prev) => ({
        ...prev,
        consent_given: res.data.consent_given,
        consent_at: res.data.consent_at,
      }));
      toast.success(nextConsent ? 'Biometric consent recorded.' : 'Biometric consent revoked.');
      fetchStudents(search);
    } catch (err) {
      console.error('Failed to toggle consent', err);
      toast.error('Failed to update consent status.');
    } finally {
      setFaceLoading(false);
    }
  };

  // Handle Photo File selection
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (selectedPhotos.length + files.length > 5) {
      setFaceError('Maximum 5 reference photos allowed per upload batch.');
      return;
    }

    setFaceError('');
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setSelectedPhotos((prev) => [...prev, ...files]);
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemovePhoto = (index) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleWebcamCapture = (file, previewUrl) => {
    if (selectedPhotos.length >= 5) {
      setFaceError('Maximum 5 reference photos allowed per batch.');
      return;
    }
    setFaceError('');
    setSelectedPhotos((prev) => [...prev, file]);
    setPhotoPreviews((prev) => [...prev, previewUrl]);
  };

  const handleUploadFacePhotos = async () => {
    if (!selectedPhotos.length || !selectedStudent) return;

    setUploadingFaces(true);
    setFaceError('');

    try {
      const formDataUpload = new FormData();
      selectedPhotos.forEach((file) => {
        formDataUpload.append('photos', file);
      });

      const res = await apiClient.post(`/students/${selectedStudent.id}/faces`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(res.data.message || 'Face biometrics enrolled successfully!');
      setSelectedPhotos([]);
      setPhotoPreviews([]);

      // Refresh face details
      const faceRes = await apiClient.get(`/students/${selectedStudent.id}/faces`);
      setFaceData(faceRes.data);
      fetchStudents(search);
    } catch (err) {
      console.error('Failed to enroll faces', err);
      setFaceError(err.response?.data?.detail || 'Failed to extract biometric face embeddings.');
    } finally {
      setUploadingFaces(false);
    }
  };

  // WhatsApp Parent Alert Quick Trigger
  const handleNotifyParent = (stu) => {
    const parentPhone = stu.parent_phone ? stu.parent_phone.replace(/[^0-9]/g, '') : '';
    const parentName = stu.parent_name || 'Parent / Guardian';
    const senderName = user?.institution_name || 'AttendIQ';
    const message = `Hello ${parentName}, this is an attendance notice from ${senderName} regarding your ward ${stu.full_name} (${stu.roll_number}). Please feel free to reach out to the coaching center administration if you have questions.`;

    if (parentPhone) {
      const waUrl = `https://wa.me/${parentPhone}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(message);
      }
      toast.success(`WhatsApp chat opened for ${parentName} (${stu.parent_phone})!`);
    } else {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(message);
      }
      toast.warning(`No phone number on record for ${stu.full_name}. Message copied to clipboard!`);
    }
  };

  // Purge Biometrics for Inactive Students (DPDP Act Compliance)
  const handlePurgeInactiveBiometrics = async () => {
    try {
      setPurgingBiometrics(true);
      const res = await apiClient.delete('/students/biometrics/inactive');
      toast.success(res.data.message || 'Purged biometric data for inactive students.');
      setIsRetentionModalOpen(false);
      fetchStudents(search);
    } catch (err) {
      console.error('Failed to purge biometrics', err);
      toast.error(err.response?.data?.detail || 'Failed to purge biometric embeddings.');
    } finally {
      setPurgingBiometrics(false);
    }
  };

  // Filter & Sort Logic
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        if (statusFilter === 'active') return s.is_active;
        if (statusFilter === 'inactive') return !s.is_active;
        if (statusFilter === 'consent_given') return s.consent_given;
        if (statusFilter === 'consent_pending') return !s.consent_given;
        return true;
      })
      .sort((a, b) => {
        let fieldA = a[sortField] || '';
        let fieldB = b[sortField] || '';
        if (typeof fieldA === 'string') fieldA = fieldA.toLowerCase();
        if (typeof fieldB === 'string') fieldB = fieldB.toLowerCase();
        if (fieldA < fieldB) return sortDirection === 'asc' ? -1 : 1;
        if (fieldA > fieldB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [students, statusFilter, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
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
              Student Management
            </h1>
            <Badge variant="primary" size="sm">
              {students.length} Total
            </Badge>
          </div>
          <p className="page-subtitle" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Manage student directory, DPDP facial consent agreements, and reference biometrics.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Add New Student button for All Tutors */}
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAddDrawer}
            icon={Plus}
          >
            Add New Student
          </Button>

          {/* DPDP Retention purge button */}
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsRetentionModalOpen(true)}
            icon={ShieldCheck}
            title="DPDP Act Biometric Data Retention & Auto-Purge Control"
          >
            Biometric Retention
          </Button>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROLS */}
      <Card style={{ padding: '1rem 1.25rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Search Input with Icon */}
          <div style={{ flex: 1, minWidth: '260px', maxWidth: '420px', position: 'relative' }}>
            <Input
              type="text"
              placeholder="Search by student name or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
              style={{ width: '100%' }}
            />
          </div>

          {/* Filter Chips */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Students' },
              { id: 'active', label: 'Active Only' },
              { id: 'inactive', label: 'Inactive' },
              { id: 'consent_given', label: 'Consent Verified' },
              { id: 'consent_pending', label: 'Pending Consent' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid',
                  borderColor: statusFilter === f.id ? 'var(--primary)' : 'var(--border-color)',
                  backgroundColor: statusFilter === f.id ? 'var(--primary-light)' : 'var(--bg-card-subtle)',
                  color: statusFilter === f.id ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: '0.785rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 3. STUDENTS ROSTER TABLE */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('roll_number')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Roll Number</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => handleSort('full_name')} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Full Name</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Contact / Parent</th>
                <th>Status</th>
                <th>Face Data Consent</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '2rem' }}>
                    <Skeleton variant="card" height={45} style={{ marginBottom: '0.75rem' }} />
                    <Skeleton variant="card" height={45} style={{ marginBottom: '0.75rem' }} />
                    <Skeleton variant="card" height={45} />
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                    <EmptyState
                      icon={UserCheck}
                      title="No students found"
                      description={search ? `No student matched "${search}". Try adjusting your filters.` : 'No students enrolled yet.'}
                      actionLabel="Enroll First Student"
                      onAction={handleOpenAddDrawer}
                    />
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu) => (
                  <tr key={stu.id}>
                    <td>
                      <span className="student-roll-chip" style={{ fontWeight: 700 }}>
                        {stu.roll_number}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <Avatar name={stu.full_name} size="sm" />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {stu.full_name}
                          </div>
                          {stu.email && (
                            <div style={{ fontSize: '0.735rem', color: 'var(--text-muted)' }}>
                              {stu.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {stu.phone && (
                          <div style={{ fontSize: '0.775rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                            <Phone size={11} style={{ color: 'var(--primary)' }} />
                            <span>{stu.phone}</span>
                          </div>
                        )}
                        {stu.parent_name && (
                          <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>Parent: {stu.parent_name}</span>
                            {stu.parent_phone && (
                              <button
                                type="button"
                                onClick={() => handleNotifyParent(stu)}
                                title="Send WhatsApp alert to parent"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#25D366',
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'inline-flex',
                                }}
                              >
                                <MessageSquare size={12} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      {stu.is_active ? (
                        <Badge variant="success" size="sm">Active</Badge>
                      ) : (
                        <Badge variant="danger" size="sm">Inactive</Badge>
                      )}
                    </td>
                    <td>
                      {stu.consent_given ? (
                        <Badge variant="accent" size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <CheckCircle2 size={11} /> Face Data Consent
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <AlertCircle size={11} /> Face Data Consent
                        </Badge>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {/* Manage Face Biometrics Photo */}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenFaceModal(stu)}
                          title="Manage facial biometrics & photos"
                          style={{ padding: '5px 8px' }}
                        >
                          <Camera size={14} />
                          <span style={{ fontSize: '0.75rem', marginLeft: '3px' }}>Photos</span>
                        </button>

                        {/* Tutor edit & delete */}
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEditDrawer(stu)}
                          title="Edit student details"
                          style={{ padding: '5px 8px' }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => handleDeleteStudent(stu.id, stu.full_name)}
                          title="Delete student"
                          style={{
                            padding: '5px 8px',
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            color: 'var(--danger)',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. SLIDE-OVER DRAWER: ADD / EDIT STUDENT */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingStudent ? 'Edit Student Profile' : 'Enroll New Student'}
        description="Provide academic registration details, guardian contact, and consent state."
        size="md"
      >
        <form onSubmit={handleSaveStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {formError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--danger-light)',
                color: 'var(--danger)',
                border: '1px solid var(--danger-border)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Academic Identity */}
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
              1. Student Identity
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div className="form-group">
                <label className="form-label">Roll Number *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. STU-108"
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
                  placeholder="e.g. Aarav Sharma"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="student@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone / Mobile</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+91 9811100001"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Guardian Details for WhatsApp Alerts */}
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
              2. Parent / Guardian Contact (For WhatsApp Alerts)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div className="form-group">
                <label className="form-label">Parent / Guardian Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Mr. Rakesh Sharma"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Parent WhatsApp Number</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+91 9811100009"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Status & DPDP Consent */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
              3. Status & Consent
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  style={{ width: '17px', height: '17px', accentColor: 'var(--primary)' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active Student in Roster</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.consent_given}
                  onChange={(e) => setFormData({ ...formData, consent_given: e.target.checked })}
                  style={{ width: '17px', height: '17px', accentColor: 'var(--primary)', marginTop: '2px' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                  <strong>Digital Personal Data Protection (DPDP) Act Consent:</strong> Student/guardian has given explicit consent to capture and process facial biometrics solely for classroom attendance.
                </span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsDrawerOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingStudent ? 'Save Changes' : 'Enroll Student'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* 5. BIOMETRIC FACE ENROLLMENT MODAL */}
      <Modal
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        title={`Face Biometrics: ${selectedStudent?.full_name || ''}`}
        description="Enroll facial reference photos and manage DPDP consent status."
        size="md"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Consent Banner */}
          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: faceData.consent_given ? 'var(--success-light)' : 'var(--warning-light)',
              border: '1px solid',
              borderColor: faceData.consent_given ? 'var(--success-border)' : 'var(--warning-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.885rem', color: faceData.consent_given ? 'var(--success)' : 'var(--warning)' }}>
                {faceData.consent_given ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
                <span>{faceData.consent_given ? 'DPDP Consent Active' : 'Consent Pending'}</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                {faceData.enrolled_count} face embeddings currently registered in vector database.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleToggleConsent}
              disabled={faceLoading}
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {faceData.consent_given ? 'Revoke' : 'Grant Consent'}
            </button>
          </div>

          {faceError && (
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
              <span>{faceError}</span>
            </div>
          )}

          {/* Upload & Webcam Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <label
              className="btn btn-secondary"
              style={{ flex: 1, justifyContent: 'center', cursor: 'pointer', padding: '0.75rem' }}
            >
              <Upload size={16} />
              <span>Upload Photos (Max 5)</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoSelect}
                style={{ display: 'none' }}
              />
            </label>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setIsWebcamOpen(true)}
              style={{ flex: 1, justifyContent: 'center', padding: '0.75rem' }}
            >
              <Camera size={16} />
              <span>Live Camera Snap</span>
            </button>
          </div>

          {/* Photo Previews Strip */}
          {photoPreviews.length > 0 && (
            <div>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Selected Photos to Enroll ({photoPreviews.length}/5):
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {photoPreviews.map((preview, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '70px',
                      height: '70px',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      border: '2px solid var(--primary)',
                    }}
                  >
                    <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        background: 'rgba(0,0,0,0.6)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save / Process Embeddings Button */}
          {selectedPhotos.length > 0 && (
            <Button
              variant="primary"
              onClick={handleUploadFacePhotos}
              disabled={uploadingFaces}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {uploadingFaces ? 'Extracting 512-D Face Embeddings...' : `Process & Save ${selectedPhotos.length} Face Photos`}
            </Button>
          )}
        </div>
      </Modal>

      {/* 6. WEBCAM CAPTURE MODAL */}
      <WebcamModal
        isOpen={isWebcamOpen}
        onClose={() => setIsWebcamOpen(false)}
        onCapture={handleWebcamCapture}
        title="Capture Student Portrait"
      />

      {/* 7. DPDP BIOMETRIC DATA RETENTION & PURGE MODAL */}
      <Modal
        isOpen={isRetentionModalOpen}
        onClose={() => setIsRetentionModalOpen(false)}
        title="Biometric Data Retention & Auto-Purge"
        description="Digital Personal Data Protection (DPDP) Act Compliance control"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
            Under privacy and DPDP regulations, biometric facial embeddings of students who are marked <strong>Inactive</strong> or have withdrawn from tuition batches must not be retained indefinitely.
          </p>
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: 'var(--danger-light)',
              border: '1px solid var(--danger-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem',
              color: 'var(--danger)',
            }}
          >
            Clicking below will delete facial vector embeddings for all inactive students. Attendance history and text records are kept intact.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setIsRetentionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handlePurgeInactiveBiometrics}
              disabled={purgingBiometrics}
            >
              {purgingBiometrics ? 'Purging Embeddings...' : 'Purge Inactive Biometrics'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Students;
