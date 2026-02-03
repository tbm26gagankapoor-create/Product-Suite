
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
import OAuthCallback from './components/OAuthCallback';
import UserProfileView from './components/UserProfileView';
import UserManagementView from './components/UserManagementView';
import OrganizationOnboarding from './components/OrganizationOnboarding';
import { AppLoadingScreen, DataLoadingScreen, ConnectionErrorScreen } from './components/LoadingScreens';
import { ThemeProvider } from './context/ThemeContext';
import { ProjectDataProvider, useProjectData } from './context/ProjectDataContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { api } from './lib/api';
import { organizationsService } from './services/organizations.service';

export type View = 'home' | 'project' | 'project-list' | 'settings' | 'teams' | 'my-tasks' | 'sprints' | 'profile' | 'users';
export type AuthView = 'login' | 'forgot-password' | 'reset-password' | 'oauth-callback';

const AppContent: React.FC = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authView, setAuthView] = useState<AuthView>('login');

  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false); // Prevent re-showing after completion
  const [matchingOrganizations, setMatchingOrganizations] = useState<any[]>([]);

  // App View State
  const [currentView, setCurrentView] = useState<View>('home');
  const [activeProjectId, setActiveProjectId] = useState<string>('p1'); // Default to Infinia Platform

  // Consume Context
  const { projects, refreshData, currentUser, currentOrganization, isLoading, connectionStatus, connectionError } = useProjectData();
  const { success } = useToast();
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  // Check for special URLs on mount (password reset, OAuth callback)
  useEffect(() => {
    const pathname = window.location.pathname;

    // Check for OAuth callback URL
    if (pathname.includes('/oauth/callback')) {
      setAuthView('oauth-callback');
      return;
    }

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

  // Check if user needs onboarding (no organization)
  useEffect(() => {
    const checkOnboarding = async () => {
      // Skip if onboarding was already completed this session
      if (onboardingCompleted) return;

      // Wait until context finishes loading before checking organization status
      if (isLoading) return;

      if (isAuthenticated && currentUser && !currentOrganization) {
        // Check if there are organizations matching user's email domain
        if (currentUser.email) {
          const orgs = await organizationsService.getOrganizationsByDomain(currentUser.email);
          setMatchingOrganizations(orgs);
        }
        setShowOnboarding(true);
      }
    };

    if (!isAuthChecking) {
      checkOnboarding();
    }
  }, [isAuthenticated, isAuthChecking, currentUser, currentOrganization, onboardingCompleted, isLoading]);

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
      return <AppLoadingScreen />;
  }

  // Connection Error Screen
  if (isAuthenticated && connectionStatus === 'error') {
      return (
          <div className="flex h-screen bg-white dark:bg-[#0B0C0E]">
              <ConnectionErrorScreen
                  error={connectionError}
                  onRetry={refreshData}
              />
          </div>
      );
  }

  // Auth Layout
  if (!isAuthenticated) {
    switch (authView) {
      case 'oauth-callback':
        return (
          <OAuthCallback
            onSuccess={() => {
              setIsAuthenticated(true);
              refreshData();
            }}
          />
        );
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

  // Initial data loading screen (after auth, before data is ready)
  if (isLoading && !currentUser) {
      return (
          <div className="flex h-screen bg-white dark:bg-[#0B0C0E]">
              <DataLoadingScreen message="Setting up your workspace..." showProgress />
          </div>
      );
  }

  // Onboarding Modal for new users without organization
  if (showOnboarding && currentUser) {
    return (
      <>
        <div className="flex h-screen bg-white dark:bg-[#0B0C0E] text-[#172B4D] dark:text-gray-100 font-sans selection:bg-indigo-500/30 transition-colors duration-200 overflow-hidden">
          <Sidebar
            currentView={currentView}
            onViewChange={setCurrentView}
            onLogout={handleLogout}
            activeProjectId={activeProjectId}
            onProjectSelect={handleProjectSelect}
          />
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0B0C0E]">
            <main className="flex-1 flex flex-col overflow-hidden relative">
              {renderContent()}
            </main>
          </div>
        </div>
        <OrganizationOnboarding
          userEmail={currentUser.email || ''}
          userName={currentUser.name}
          userAvatarUrl={currentUser.avatarUrl}
          existingOrganizations={matchingOrganizations}
          onComplete={async (result) => {
            // Update profile if profile data was provided
            if (result.profileData) {
              try {
                const updateData: any = {
                  name: result.profileData.displayName,
                  jobTitle: result.profileData.jobTitle,
                  location: result.profileData.location,
                };
                // Include avatar if a custom one was uploaded
                if (result.profileData.avatarUrl) {
                  updateData.avatarUrl = result.profileData.avatarUrl;
                }
                await api.updateUser(currentUser.id, updateData);
              } catch (e) {
                console.error('Failed to update profile:', e);
              }
            }

            if (result.action === 'create' && result.organizationName) {
              try {
                const newOrg = await organizationsService.createWithAdmin(result.organizationName, currentUser.id);
                // Update user's organization_id in the backend and localStorage
                await api.updateUser(currentUser.id, { organizationId: newOrg.id });
                const storedUser = localStorage.getItem('infinia_user');
                if (storedUser) {
                  const userData = JSON.parse(storedUser);
                  userData.organization_id = newOrg.id;
                  localStorage.setItem('infinia_user', JSON.stringify(userData));
                }
                success('Organization Created', `${result.organizationName} has been created successfully!`);
              } catch (e) {
                console.error('Failed to create organization:', e);
              }
            } else if (result.action === 'join' && result.organizationId) {
              try {
                await organizationsService.requestToJoin(result.organizationId, currentUser.id);
                success('Request Sent', 'Your request to join has been sent to the organization admins.');
              } catch (e) {
                console.error('Failed to request join:', e);
              }
            }
            setShowOnboarding(false);
            setOnboardingCompleted(true); // Prevent re-showing during data refresh
            refreshData();
          }}
          onSkip={() => {
            setShowOnboarding(false);
            setOnboardingCompleted(true); // Also mark as completed when skipped
          }}
        />
      </>
    );
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
