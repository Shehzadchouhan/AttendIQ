import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Students from '../pages/Students';
import { AuthContext } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import apiClient from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockStudentsData = [
  {
    id: 1,
    roll_number: 'STU-101',
    full_name: 'Aarav Sharma',
    email: 'aarav@example.com',
    phone: '+91 9811100001',
    is_active: true,
    consent_given: true,
  },
  {
    id: 2,
    roll_number: 'STU-102',
    full_name: 'Diya Patel',
    email: 'diya@example.com',
    phone: '+91 9811100002',
    is_active: false,
    consent_given: false,
  },
];

const renderStudents = (isAdmin = true) => {
  return render(
    <ToastProvider>
      <AuthContext.Provider value={{ user: { id: 1, email: 'admin@facemark.local' }, isAdmin }}>
        <BrowserRouter>
          <Students />
        </BrowserRouter>
      </AuthContext.Provider>
    </ToastProvider>
  );
};

describe('Students Page Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders table headers and search input', async () => {
    apiClient.get.mockResolvedValueOnce({ data: [] });
    renderStudents(true);

    expect(screen.getByPlaceholderText(/Search by student name or roll number/i)).toBeInTheDocument();
    expect(screen.getByText('Roll Number')).toBeInTheDocument();
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(screen.getByText('Face Data Consent')).toBeInTheDocument();
  });

  it('renders student list when data is fetched', async () => {
    apiClient.get.mockResolvedValueOnce({ data: mockStudentsData });
    renderStudents(true);

    await waitFor(() => {
      expect(screen.getAllByText('STU-101').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Aarav Sharma').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('STU-102').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Diya Patel').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('displays Add New Student button for Admin', async () => {
    apiClient.get.mockResolvedValueOnce({ data: [] });
    renderStudents(true);

    expect(screen.getByRole('button', { name: /Add New Student/i })).toBeInTheDocument();
  });
});
