import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import Skeleton from './components/ui/Skeleton';

// Route-level code splitting with React.lazy
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Students = lazy(() => import('./pages/Students'));
const Batches = lazy(() => import('./pages/Batches'));
const TakeAttendance = lazy(() => import('./pages/TakeAttendance'));
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const TutorChat = lazy(() => import('./pages/TutorChat'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Shimmering Page Skeleton Fallback
const PageFallback = () => (
  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '1400px', margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <Skeleton variant="text" width={240} height={28} />
        <Skeleton variant="text" width={380} height={16} style={{ marginTop: '0.4rem' }} />
      </div>
      <Skeleton variant="card" width={120} height={36} />
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
      <Skeleton variant="card" height={100} />
      <Skeleton variant="card" height={100} />
      <Skeleton variant="card" height={100} />
      <Skeleton variant="card" height={100} />
    </div>
    <Skeleton variant="card" height={320} />
  </div>
);

// Offline / Slow Network Listener
const NetworkStatusListener = () => {
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      toast.success('Network connection restored. Back online!');
    };
    const handleOffline = () => {
      toast.warning('Network connection lost. FaceMark is running in offline mode.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  return null;
};

// Layout with persistent Sidebar, Top Navbar, and Mobile Bottom Nav
const AppLayout = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();
  const isChatRoute = location.pathname === '/chat';

  return (
    <div className={`app-layout ${isChatRoute ? 'app-layout-chat' : ''}`}>
      <Sidebar isMobileOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />
      <div className={`main-wrapper ${isChatRoute ? 'chat-wrapper-fullscreen' : ''}`}>
        <Navbar onToggleNav={() => setIsMobileNavOpen((prev) => !prev)} isMobileOpen={isMobileNavOpen} />
        <main className={`app-main-content ${isChatRoute ? 'chat-main-fullscreen' : ''}`}>
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
        {!isChatRoute && <BottomNav />}
      </div>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <NetworkStatusListener />
            <BrowserRouter>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  {/* Public Authentication Route */}
                  <Route path="/login" element={<Login />} />

                  {/* Authenticated Protected Routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/students" element={<Students />} />
                      <Route path="/batches" element={<Batches />} />
                      <Route path="/attendance" element={<TakeAttendance />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/chat" element={<TutorChat />} />
                      <Route path="/profile" element={<Profile />} />
                    </Route>
                  </Route>

                  {/* 404 Route */}
                  <Route path="/404" element={<NotFound />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
