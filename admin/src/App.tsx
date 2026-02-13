import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, Outlet } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

// Admin Layout Component
function AdminLayout() {
  const { admin, logout } = useAdminAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0C0E]">
      {/* Header */}
      <header className="bg-white dark:bg-[#15171E] border-b border-gray-200 dark:border-[#1F2128]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Admin Portal
              </h1>
              <nav className="flex items-center gap-6">
                <Link
                  to="/admin/dashboard"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Dashboard
                </Link>
                <Link
                  to="/admin/ai-providers"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  AI Providers
                </Link>
                <Link
                  to="/admin/tenants"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Tenants
                </Link>
                <Link
                  to="/admin/git-providers"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Git Providers
                </Link>
                <Link
                  to="/admin/audit-log"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Audit Log
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {admin?.email}
                <span className="ml-2 px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-500">
                  {admin?.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}

// Placeholder Pages (to be implemented)
function AIProvidersPage() {
  return <div className="text-gray-900 dark:text-white"><h1 className="text-2xl font-bold mb-4">AI Providers</h1><p className="text-gray-600 dark:text-gray-400">Manage AI provider configurations here.</p></div>;
}

function TenantsPage() {
  return <div className="text-gray-900 dark:text-white"><h1 className="text-2xl font-bold mb-4">Tenants</h1><p className="text-gray-600 dark:text-gray-400">Manage tenants/organizations here.</p></div>;
}

function GitProvidersPage() {
  return <div className="text-gray-900 dark:text-white"><h1 className="text-2xl font-bold mb-4">Git Providers</h1><p className="text-gray-600 dark:text-gray-400">Configure Git OAuth providers here.</p></div>;
}

function AuditLogPage() {
  return <div className="text-gray-900 dark:text-white"><h1 className="text-2xl font-bold mb-4">Audit Log</h1><p className="text-gray-600 dark:text-gray-400">View admin action history here.</p></div>;
}

function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Routes>
          <Route path="/admin/login" element={<LoginPage />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="ai-providers" element={<AIProvidersPage />} />
            <Route path="tenants" element={<TenantsPage />} />
            <Route path="git-providers" element={<GitProvidersPage />} />
            <Route path="audit-log" element={<AuditLogPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}

export default App;
