import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { AuthContext } from '../context/AuthContext';

const mockLogin = vi.fn();

const renderLogin = () => {
  return render(
    <AuthContext.Provider value={{ login: mockLogin, user: null, isAdmin: false }}>
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    </AuthContext.Provider>
  );
};

describe('Login Page Smoke Tests', () => {
  it('renders branding, inputs, and sign in button', () => {
    renderLogin();

    // Check branding
    expect(screen.getByText('Attend')).toBeInTheDocument();
    expect(screen.getByText('IQ')).toBeInTheDocument();
    expect(screen.getByText(/Open AI Attendance Platform/i)).toBeInTheDocument();

    // Check inputs
    expect(screen.getByPlaceholderText(/teacher@facemark.local/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();

    // Check Sign In button
    expect(screen.getByRole('button', { name: /Sign In to Workspace/i })).toBeInTheDocument();
  });

  it('renders quick fill buttons and populates credentials on click', () => {
    renderLogin();

    const fillAdminBtn = screen.getByRole('button', { name: 'Admin' });
    const fillTeacherBtn = screen.getByRole('button', { name: 'Prof. Sharma' });

    expect(fillAdminBtn).toBeInTheDocument();
    expect(fillTeacherBtn).toBeInTheDocument();

    // Click Fill Admin
    fireEvent.click(fillAdminBtn);
    const emailInput = screen.getByPlaceholderText(/teacher@facemark.local/i);
    const passwordInput = screen.getByPlaceholderText('••••••••');

    expect(emailInput.value).toBe('admin@facemark.local');
    expect(passwordInput.value).toBe('admin123');

    // Click Fill Teacher (Prof. Sharma)
    fireEvent.click(fillTeacherBtn);
    expect(emailInput.value).toBe('teacher@facemark.local');
    expect(passwordInput.value).toBe('teacher123');
  });
});
