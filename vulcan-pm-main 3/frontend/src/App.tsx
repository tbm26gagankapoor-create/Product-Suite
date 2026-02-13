
import React, { useState, useEffect, useMemo } from 'react';
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
import TenantAdminView from './components/TenantAdminView';
import DocumentsView from './components/DocumentsView';
import KanbanBoard from './components/KanbanBoard';
import ListView from './components/ListView';
import TimelineView from './components/TimelineView';
import PlanningView from './components/PlanningView';
import ProductGeneratorModal from './components/ProductGeneratorModal';
import CopilotFloatingButton from './components/CopilotFloatingButton';
import { ThemeProvider } from './context/ThemeContext';
import { ProjectDataProvider, useProjectData } from './context/ProjectDataContext';
import { ToastProvider } from './context/ToastContext';
import { api } from './lib/api';
import { DOC_NAV_ITEMS } from './constants';

export type View = 'home' | 'project' | 'project-list' | 'settings' | 'teams' | 'my-tasks' | 'sprints' | 'profile' | 'users' | 'org-admin' | 'documents' | 'overview' | 'tasks' | 'boards' | 'timeline' | 'create-product';
export type AuthView = 'login' | 'forgot-password' | 'reset-password' | 'sso-callback';

const AppContent: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [ssoError, setSsoError] = useState<string | null>(null);

  // App View State
  const [currentView, setCurrentView] = useState<View>('home');
  const [activeProjectId, setActiveProjectId] = useState<string>('p1'); // Default to Infinia Platform
  const [activeDocSection, setActiveDocSection] = useState<string>(DOC_NAV_ITEMS[0].id);

  // Copilot Floating State
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotInitialQuery, setCopilotInitialQuery] = useState('');

  // Consume Context
  const { projects, tasks, sprints, updateTask, refreshData } = useProjectData();
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  // Compute tasks for active project
  const projectTasks = useMemo(() => {
    if (!activeProject) return [];
    return tasks.filter(t => t.projectId === activeProject.id);
  }, [tasks, activeProject]);

  // Compute global sprint ID (active sprint for current project)
  const globalSprintId = useMemo(() => {
    if (!activeProject) return '';
    const activeSprint = sprints.find(s => s.projectId === activeProject.id && s.status === 'active');
    if (activeSprint) return activeSprint.id;
    const projectSprints = sprints.filter(s => s.projectId === activeProject.id);
    return projectSprints.length > 0 ? projectSprints[0].id : '';
  }, [sprints, activeProject]);

  // Handle SSO callback and password reset URL on mount
  useEffect(() => {
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    // Check for password reset URL
    if (pathname.includes('update-password') || pathname.includes('reset-password')) {
      setAuthView('reset-password');
      return;
    }

    // Check for SSO callback (Entra ID redirect)
    if (pathname === '/auth/callback') {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        setSsoError(errorDescription || error);
        setAuthView('login');
        window.history.replaceState(null, '', '/');
        return;
      }

      if (code && state) {
        setAuthView('sso-callback');
        handleSsoCallback(code, state);
      }
    }
  }, []);

  // Handle SSO callback
  const handleSsoCallback = async (code: string, state: string) => {
    try {
      // Determine which provider initiated the login
      const ssoProvider = sessionStorage.getItem('sso_provider') || 'entra_id';
      sessionStorage.removeItem('sso_provider');

      const callbackEndpointMap: Record<string, string> = {
        entra_id: '/api/v1/sso/entra/callback',
        google_workspace: '/api/v1/sso/google/callback',
      };

      const callbackUrl = callbackEndpointMap[ssoProvider] || '/api/v1/sso/entra/callback';

      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.code === 'CONSENT_REQUIRED') {
          setSsoError('Your organization has not authorized this application. Please contact your IT administrator.');
        } else {
          setSsoError(data.error || 'SSO authentication failed');
        }
        setAuthView('login');
        window.history.replaceState(null, '', '/');
        return;
      }

      // Store session info
      localStorage.setItem('infinia_token', data.data.token);
      localStorage.setItem('infinia_user', JSON.stringify(data.data.user));
      localStorage.setItem('infinia_session_user', data.data.user.email);

      // Clear URL and redirect
      window.history.replaceState(null, '', data.data.redirectUrl || '/');
      setIsAuthenticated(true);
      refreshData();
    } catch (error: any) {
      console.error('SSO callback error:', error);
      setSsoError(error.message || 'SSO authentication failed');
      setAuthView('login');
      window.history.replaceState(null, '', '/');
    }
  };

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
  };

  const handleLogout = async () => {
    await api.auth.signOut();
    setAuthView('login'); // Reset to login view
    setIsAuthenticated(false);
  };

  const handleTaskUpdate = (task: any) => {
      updateTask(task);
  };

  const renderContent = () => {
      switch(currentView) {
          case 'home': return <Home onViewChange={(view) => setCurrentView(view)} />;
          case 'overview':
          case 'project': return <ProjectView activeProject={activeProject} />;
          case 'project-list': return <ProjectList onProjectSelect={handleProjectSelect} />;
          case 'documents': return <DocumentsView activeProject={activeProject} activeSection={activeDocSection} onSectionChange={setActiveDocSection} />;
          case 'sprints': return activeProject ? <PlanningView projectId={activeProject.id} /> : <SprintsView onProjectSelect={handleProjectSelect} />;
          case 'tasks':
          case 'my-tasks': return <ListView sprintId={globalSprintId} tasks={projectTasks} onTaskUpdate={handleTaskUpdate} projectId={activeProject?.id} />;
          case 'boards': return <KanbanBoard sprintId={globalSprintId} tasks={projectTasks} onTaskUpdate={handleTaskUpdate} projectId={activeProject?.id} />;
          case 'timeline': return <TimelineView tasks={projectTasks} onTaskUpdate={handleTaskUpdate} />;
          case 'teams': return <TeamsView />;
          case 'settings': return <SettingsView />;
          case 'profile': return <UserProfileView />;
          case 'users': return <UserManagementView />;
          case 'org-admin': return <TenantAdminView />;
          case 'create-product': return <ProductGeneratorModal isOpen={true} onClose={() => setCurrentView('overview')} />;
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
      case 'sso-callback':
        return (
          <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-[#0B0C0E]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-500 dark:text-slate-400">Completing sign in...</p>
            </div>
          </div>
        );
      default:
        return (
          <LoginView
            onLogin={() => { setIsAuthenticated(true); refreshData(); }}
            onForgotPassword={() => setAuthView('forgot-password')}
            ssoError={ssoError}
            onClearSsoError={() => setSsoError(null)}
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
        activeDocSection={activeDocSection}
        onDocSectionChange={setActiveDocSection}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0B0C0E]">
        {/* Dynamic Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative min-h-0">
          {renderContent()}
        </main>
      </div>

      {/* Floating Copilot */}
      <CopilotFloatingButton
        isOpen={isCopilotOpen}
        onToggle={() => setIsCopilotOpen(prev => !prev)}
        initialQuery={copilotInitialQuery}
        onClearQuery={() => setCopilotInitialQuery('')}
      />
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
