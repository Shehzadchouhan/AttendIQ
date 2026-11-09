import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, UserPlus, X, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

const Students = () => {
  const { isAdmin } = useAuth();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State
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
        // Update existing student
        await apiClient.put(`/students/${editingStudent.id}`, formData);
      } else {
        // Create new student
        await apiClient.post('/students/', formData);
      }
      setIsModalOpen(false);
      fetchStudents(search);
    } catch (err) {
      setFormError(
        err.response?.data?.detail || 'Failed to save student details. Please verify the input.'
      );
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!isAdmin) {
      alert('Only Administrators can delete student records.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete student "${studentName}"? This will cascade remove their enrollments and attendance records.`)) {
      try {
        await apiClient.delete(`/students/${studentId}`);
        fetchStudents(search);
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to delete student.');
      }
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Students Management</h1>
          <p className="page-subtitle">Register and manage tuition student profiles</p>
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
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading students...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                  No students found. Click "Add New Student" to get started!
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id}>
                  <td><strong>#{student.id}</strong></td>
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
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
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
    </div>
  );
};

export default Students;
