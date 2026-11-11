import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Batches from './pages/Batches';
import TakeAttendance from './pages/TakeAttendance';
import Reports from './pages/Reports';
import DesignSystemPreview from './pages/DesignSystemPreview';

// Layout with persistent Sidebar and Top Navbar with mobile responsive drawer
const AppLayout = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isMobileOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
      <div className="main-wrapper">
        <Navbar onToggleNav={() => setIsMobileNavOpen((prev) => !prev)} isMobileOpen={isMobileNavOpen} />
        <main className="app-main-content">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Authentication Route */}
              <Route path="/login" element={<Login />} />

              {/* Design System Foundation Showcase (Phase 5A) */}
              <Route path="/design" element={<DesignSystemPreview />} />

              {/* Authenticated Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/batches" element={<Batches />} />
                  <Route path="/attendance" element={<TakeAttendance />} />
                  <Route path="/reports" element={<Reports />} />
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
