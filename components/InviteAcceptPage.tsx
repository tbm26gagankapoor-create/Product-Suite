import React, { useEffect, useState } from 'react';
import {
  ChevronsRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  Building2,
  Mail,
  Shield,
  ShieldCheck,
  UserPlus,
  LogIn
} from 'lucide-react';
import { api } from '../lib/api';

interface InviteDetails {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  organization: {
    id: string;
    name: string;
    logoUrl?: string;
  } | null;
  invitedBy: {
    name: string;
    avatarUrl?: string;
  } | null;
}

interface InviteAcceptPageProps {
  inviteId: string;
  isAuthenticated: boolean;
  currentUserEmail?: string;
  onLoginRequired: () => void;
  onAcceptSuccess: (organizationId: string) => void;
}

const InviteAcceptPage: React.FC<InviteAcceptPageProps> = ({
  inviteId,
  isAuthenticated,
  currentUserEmail,
  onLoginRequired,
  onAcceptSuccess
}) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'accepting' | 'success' | 'error'>('loading');
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const data = await api.getInvite(inviteId);
        setInvite(data);
        setStatus('ready');
      } catch (err: any) {
        setError(err.message || 'Invitation not found or has expired.');
        setStatus('error');
      }
    };

    fetchInvite();
  }, [inviteId]);

  const handleAccept = async () => {
    if (!invite) return;

    setStatus('accepting');
    try {
      const result = await api.acceptInvite(inviteId);
      setStatus('success');

      // Brief delay to show success, then redirect
      setTimeout(() => {
        onAcceptSuccess(result.organizationId);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation.');
      setStatus('error');
    }
  };

  const getOrgInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-white dark:bg-[#0B0C0E]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 animate-pulse">
              <ChevronsRight className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute inset-0 -m-1">
              <div className="w-[72px] h-[72px] rounded-2xl border-2 border-transparent border-t-blue-500/50 animate-spin" style={{ animationDuration: '1.5s' }} />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#172B4D] dark:text-white tracking-tight">
              Infinia
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Loading invitation...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-white dark:bg-[#0B0C0E]">
        <div className="flex flex-col items-center gap-6 max-w-md px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/25">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">
              Invitation Error
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {error}
            </p>
          </div>
          <a
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-medium rounded-xl hover:opacity-90 transition-all shadow-lg"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-white dark:bg-[#0B0C0E]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#172B4D] dark:text-white tracking-tight">
              Welcome to {invite?.organization?.name}!
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Loading your workspace...
            </p>
          </div>
          <div className="w-48 h-1.5 bg-gray-100 dark:bg-[#1F2128] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-loading-progress" />
          </div>
        </div>
      </div>
    );
  }

  // Ready state - show invite details
  if (!invite) return null;

  const emailMismatch = isAuthenticated && currentUserEmail &&
    invite.email.toLowerCase() !== currentUserEmail.toLowerCase();

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white dark:bg-[#0B0C0E] p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-[#15171E] rounded-2xl shadow-2xl border border-gray-100 dark:border-[#1F2128] overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center border-b border-gray-100 dark:border-[#1F2128]">
            {/* Organization Logo/Initials */}
            {invite.organization?.logoUrl ? (
              <img
                src={invite.organization.logoUrl}
                alt={invite.organization.name}
                className="w-20 h-20 rounded-2xl mx-auto mb-4 object-cover shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg shadow-blue-500/25">
                {invite.organization ? getOrgInitials(invite.organization.name) : '?'}
              </div>
            )}

            <h1 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">
              You're invited to join
            </h1>
            <h2 className="text-2xl font-bold text-[#172B4D] dark:text-white">
              {invite.organization?.name || 'Unknown Organization'}
            </h2>

            {invite.invitedBy && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                Invited by <span className="font-medium text-gray-700 dark:text-gray-300">{invite.invitedBy.name}</span>
              </p>
            )}
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            {/* Email */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0B0C0E] rounded-xl">
              <Mail size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invitation for</p>
                <p className="text-sm font-medium text-[#172B4D] dark:text-white">{invite.email}</p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0B0C0E] rounded-xl">
              {invite.role === 'admin' ? (
                <ShieldCheck size={18} className="text-purple-500" />
              ) : (
                <Shield size={18} className="text-blue-500" />
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</p>
                <p className="text-sm font-medium text-[#172B4D] dark:text-white capitalize">{invite.role}</p>
              </div>
            </div>

            {/* Email Mismatch Warning */}
            {emailMismatch && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  <p className="font-medium">Email mismatch</p>
                  <p className="mt-1">
                    You're signed in as <strong>{currentUserEmail}</strong>, but this invitation is for <strong>{invite.email}</strong>.
                    Please sign out and sign in with the correct account.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 pt-0 space-y-3">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={onLoginRequired}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-bold rounded-xl hover:opacity-90 transition-all shadow-lg"
                >
                  <LogIn size={18} />
                  Sign in to Accept
                </button>
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Sign in with <strong>{invite.email}</strong> to join the organization
                </p>
              </>
            ) : emailMismatch ? (
              <button
                onClick={() => api.auth.signOut().then(() => window.location.reload())}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
              >
                Sign Out & Switch Account
              </button>
            ) : (
              <button
                onClick={handleAccept}
                disabled={status === 'accepting'}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {status === 'accepting' ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <UserPlus size={18} />
                    Accept Invitation
                  </>
                )}
              </button>
            )}

            <a
              href="/"
              className="block text-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Cancel and go to homepage
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
            <ChevronsRight size={16} />
            <span className="text-sm font-medium">Infinia</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteAcceptPage;
