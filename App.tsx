
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ProjectView from './components/ProjectView';
import ProjectList from './components/ProjectList';
import Home from './components/Home';
import SettingsView from './components/SettingsView';
import TeamsView from './components/TeamsView';
import MyTasksView from './components/MyTasksView';
import SprintsView from './components/SprintsView';
import LoginView from './components/LoginView';
import ForgotPasswordView from './components/ForgotPasswordView';
import ResetPasswordView from './components/ResetPasswordView';
import UserProfileView from './components/UserProfileView';
import UserManagementView from './components/UserManagementView';
import { ThemeProvider } from './context/ThemeContext';
import { ProjectDataProvider, useProjectData } from './context/ProjectDataContext';
import { ToastProvider } from './context/ToastContext';
import { api } from './lib/api';

export type View = 'home' | 'project' | 'project-list' | 'settings' | 'teams' | 'my-tasks' | 'sprints' | 'profile' | 'users';
export type AuthView = 'login' | 'forgot-password' | 'reset-password';

const AppContent: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authView, setAuthView] = useState<AuthView>('login');

  // App View State
  const [currentView, setCurrentView] = useState<View>('home');
  const [activeProjectId, setActiveProjectId] = useState<string>('p1'); // Default to Infinia Platform

  // Consume Context
  const { projects, refreshData } = useProjectData();
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  // Check for password reset URL on mount
  useEffect(() => {
    const pathname = window.location.pathname;

    // Check for password reset URL
    if (pathname.includes('update-password') || pathname.includes('reset-password')) {
      setAuthView('reset-password');
    }
  }, []);

  // Auth Check - Uses local backend
  useEffect(() => {
    const checkAuth = async () => {
      // Check local session from localStorage
      const { data: { session } } = await api.auth.getSession();

      if (session) {
        setIsAuthenticated(true);
        refreshData();
      }

      setIsAuthChecking(false);
    };

    checkAuth();
  }, [refreshData]);

  const handleProjectSelect = (projectId: string) => {
      setActiveProjectId(projectId);
      setCurrentView('project');
  };

  const handleLogout = async () => {
    await api.auth.signOut();
    setIsAuthenticated(false);
  };

  const renderContent = () => {
      switch(currentView) {
          case 'home': return <Home onViewChange={(view) => setCurrentView(view)} />;
          case 'project': return <ProjectView activeProject={activeProject} />;
          case 'project-list': return <ProjectList onProjectSelect={handleProjectSelect} />;
          case 'sprints': return <SprintsView onProjectSelect={handleProjectSelect} />;
          case 'settings': return <SettingsView />;
          case 'teams': return <TeamsView />;
          case 'my-tasks': return <MyTasksView />;
          case 'profile': return <UserProfileView />;
          case 'users': return <UserManagementView />;
          default: return <Home onViewChange={(view) => setCurrentView(view)} />;
      }
  }

  // Loading Screen while checking auth
  if (isAuthChecking) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-[#0B0C0E]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
      );
  }

  // Auth Layout
  if (!isAuthenticated) {
    switch (authView) {
      case 'forgot-password':
        return <ForgotPasswordView onBack={() => setAuthView('login')} />;
      case 'reset-password':
        return (
          <ResetPasswordView
            onSuccess={() => {
              setAuthView('login');
              // Clear the URL hash/path after password reset
              window.history.replaceState(null, '', window.location.pathname.replace('/update-password', '/'));
            }}
          />
        );
      default:
        return (
          <LoginView
            onLogin={() => { setIsAuthenticated(true); refreshData(); }}
            onForgotPassword={() => setAuthView('forgot-password')}
          />
        );
    }
  }

  // Dashboard Layout
  return (
    <div className="flex h-screen bg-white dark:bg-[#0B0C0E] text-[#172B4D] dark:text-gray-100 font-sans selection:bg-indigo-500/30 transition-colors duration-200 overflow-hidden">
      {/* Sidebar - Collapsible & Fixed Left */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
        activeProjectId={activeProjectId}
        onProjectSelect={handleProjectSelect}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0B0C0E]">
        {/* Dynamic Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ProjectDataProvider>
          <AppContent />
        </ProjectDataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
