import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Navbar from './components/Navbar';
import AdminLayout from './components/AdminLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ClientDashboard from './pages/ClientDashboard';
import UsersPage from './pages/UsersPage';
import EditUserPage from './pages/EditUserPage';
import PetsPage from './pages/PetsPage';
import ProfilePage from './pages/ProfilePage';
import AppointmentsPage from './pages/AppointmentsPage';
import AdminAppointmentsPage from './pages/AdminAppointmentsPage';
import WaiverTemplatesPage from './pages/WaiverTemplatesPage';
import { LoadingState } from './components/ui';

function HomeRedirect() {
  const { isLoggedIn, isAdmin, loading } = useAuth();

  if (loading) return <LoadingState className="min-h-screen" />;

  if (isLoggedIn) {
    return <Navigate to={isAdmin ? '/admin/users' : '/dashboard'} replace />;
  }

  return <LandingPage />;
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { isLoggedIn, isAdmin, loading } = useAuth();

  if (loading) return <LoadingState className="min-h-screen" />;

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

/* Public/client routes — wrapped in Navbar */
function ClientRoutes() {
  return (
    <div className="min-h-screen bg-(--color-background) text-(--color-foreground)">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ClientDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedRoute>
              <AppointmentsPage />
            </ProtectedRoute>
          }
        />
        {/* Catch-all: send unknown routes home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

/* Admin routes — wrapped in AdminLayout (sidebar) */
function AdminRoutes() {
  return (
    <ProtectedRoute adminOnly>
      <AdminLayout>
        <Routes>
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:userId/pets" element={<PetsPage />} />
          <Route path="/users/:userId/edit" element={<EditUserPage />} />
          <Route path="/appointments" element={<AdminAppointmentsPage />} />
          <Route path="/waivers" element={<WaiverTemplatesPage />} />
          <Route path="*" element={<Navigate to="/admin/users" replace />} />
        </Routes>
      </AdminLayout>
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Admin section */}
      <Route path="/admin/*" element={<AdminRoutes />} />
      {/* Everything else */}
      <Route path="/*" element={<ClientRoutes />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
