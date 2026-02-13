import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar, { Page } from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TenantsPage from './pages/TenantsPage';
import ProvidersPage from './pages/ProvidersPage';
import GitProvidersPage from './pages/GitProvidersPage';
import SearchProvidersPage from './pages/SearchProvidersPage';
import PromptTemplatesPage from './pages/PromptTemplatesPage';
import EpicCategoriesPage from './pages/EpicCategoriesPage';
import SettingsPage from './pages/SettingsPage';
import WhitelistPage from './pages/WhitelistPage';
import SsoFederationPage from './pages/SsoFederationPage';

function AppContent() {
  const { admin, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!admin) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'tenants':
        return <TenantsPage />;
      case 'providers':
        return <ProvidersPage />;
      case 'git-providers':
        return <GitProvidersPage />;
      case 'search-providers':
        return <SearchProvidersPage />;
      case 'prompt-templates':
        return <PromptTemplatesPage />;
      case 'epic-categories':
        return <EpicCategoriesPage />;
      case 'settings':
        return <SettingsPage />;
      case 'sso':
        return <SsoFederationPage />;
      case 'whitelist':
        return <WhitelistPage />;
      case 'audit':
        return (
          <div className="text-gray-500 text-center py-12">
            Audit Log - Coming Soon
          </div>
        );
      case 'admins':
        return (
          <div className="text-gray-500 text-center py-12">
            Admin Management - Coming Soon
          </div>
        );
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="flex-1 overflow-y-auto p-8">
        {renderPage()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
