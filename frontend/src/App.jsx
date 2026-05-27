import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminLeadsPage from './pages/admin/AdminLeadsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUploadPage from './pages/admin/AdminUploadPage';
import AdminFollowUpsPage from './pages/admin/AdminFollowUpsPage';
import AdminBDAPerformancePage from './pages/admin/AdminBDAPerformancePage';
import SalesDashboardPage from './pages/sales/SalesDashboardPage';
import SalesLeadsPage from './pages/sales/SalesLeadsPage';
import AdmissionsPage from './pages/AdmissionsPage';
import PaymentsPage from './pages/PaymentsPage';

function PrivateRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/setup" element={<Navigate to="/login" replace />} />
      <Route
        path="/admin"
        element={
          <PrivateRoute adminOnly>
            <Layout basePath="/admin" />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="leads" element={<AdminLeadsPage />} />
        <Route path="performance" element={<AdminBDAPerformancePage />} />
        <Route path="followups" element={<AdminFollowUpsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="upload" element={<AdminUploadPage />} />
        <Route path="admissions" element={<AdmissionsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
      </Route>
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout basePath="/" />
          </PrivateRoute>
        }
      >
        <Route index element={<RoleRedirect />} />
        <Route path="dashboard" element={<SalesDashboardPage />} />
        <Route path="leads" element={<SalesLeadsPage />} />
        <Route path="admissions" element={<AdmissionsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
