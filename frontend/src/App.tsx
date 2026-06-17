import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layouts
import { AdminLayout } from './components/Layout/AdminLayout';
import { UserLayout } from './components/Layout/UserLayout';

// Pages (eager loaded for small bundles)
import { Login } from './pages/Login';
import { Unauthorized } from './pages/Unauthorized';
import { AuthCallback } from './pages/AuthCallback';
import { CompleteProfile } from './pages/CompleteProfile';

// Admin pages
import { Dashboard } from './pages/admin/Dashboard';
import { ExamList } from './pages/admin/ExamList';
import { ExamForm } from './pages/admin/ExamForm';
import { QuestionBank } from './pages/admin/QuestionBank';
import { UserManagement } from './pages/admin/UserManagement';
import { LiveMonitor } from './pages/admin/LiveMonitor';
import { Reports } from './pages/admin/Reports';
import { AuditLogs } from './pages/admin/AuditLogs';

// User pages
import { UserHome } from './pages/user/UserHome';
import { ExamRoom } from './pages/user/ExamRoom';
import { ExamResults } from './pages/user/ExamResults';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      retry: 1,
    },
  },
});

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
    <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'user' && !user.profile_completed) return <CompleteProfile />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/home" replace />;
  return <>{children}</>;
};

const RootRedirect = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'user' ? '/home' : '/admin'} replace />;
};

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                borderRadius: '10px',
                background: 'var(--toast-bg, #1f2937)',
                color: '#fff',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/" element={<RootRedirect />} />

            {/* Admin */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="exams" element={<ExamList />} />
              <Route path="exams/new" element={<ExamForm />} />
              <Route path="exams/:id/edit" element={<ExamForm />} />
              <Route path="exams/:examId/questions" element={<QuestionBank />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="monitor" element={<LiveMonitor />} />
              <Route path="reports" element={<Reports />} />
              <Route path="audit" element={<AuditLogs />} />
            </Route>

            {/* User layout — home y resultados */}
            <Route path="/" element={
              <ProtectedRoute>
                <UserLayout />
              </ProtectedRoute>
            }>
              <Route path="home" element={<UserHome />} />
              <Route path="results/:attemptId" element={<ExamResults />} />
            </Route>

            {/* Exam room (full screen, sin layout) */}
            <Route path="/exam/:examId" element={
              <ProtectedRoute>
                <ExamRoom />
              </ProtectedRoute>
            } />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
