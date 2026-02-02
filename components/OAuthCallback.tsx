/**
 * OAuth Callback Component
 * Handles the OAuth redirect callback, extracts token from URL hash,
 * stores it in localStorage, and triggers authentication state update.
 */

import React, { useEffect, useState } from 'react';
import { ChevronsRight, AlertCircle, CheckCircle } from 'lucide-react';

interface OAuthCallbackProps {
  onSuccess: () => void;
  onError?: (error: string) => void;
}

// Error message mapping for user-friendly display
const ERROR_MESSAGES: Record<string, string> = {
  'oauth_not_configured': 'Microsoft login is not configured. Please contact the administrator.',
  'oauth_init_failed': 'Could not start the sign-in process. Please try again.',
  'invalid_state': 'Security validation failed. Please try signing in again.',
  'missing_params': 'Invalid callback. Please try signing in again.',
  'no_email': 'No email address found in your Microsoft account.',
  'oauth_callback_failed': 'Sign in failed. Please try again.',
  'access_denied': 'You cancelled the sign-in process.',
};

const OAuthCallback: React.FC<OAuthCallbackProps> = ({ onSuccess, onError }) => {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const processCallback = () => {
      // Check for error in query params first (from backend redirect on error)
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');

      if (errorParam) {
        const errorMessage = ERROR_MESSAGES[errorParam] || 'An unknown error occurred during sign in.';
        setError(errorMessage);
        setStatus('error');
        onError?.(errorMessage);
        return;
      }

      // Parse token from URL hash fragment
      const hash = window.location.hash.substring(1);
      if (!hash) {
        setError('No authentication data received.');
        setStatus('error');
        return;
      }

      const params = new URLSearchParams(hash);
      const token = params.get('token');
      const userJson = params.get('user');
      const isNew = params.get('isNew') === 'true';

      if (token && userJson) {
        try {
          const user = JSON.parse(decodeURIComponent(userJson));

          // Store in localStorage (matching existing pattern from LoginView)
          localStorage.setItem('infinia_token', token);
          localStorage.setItem('infinia_user', JSON.stringify(user));
          localStorage.setItem('infinia_session_user', user.email);

          // Clean URL (remove hash)
          window.history.replaceState({}, document.title, '/');

          setStatus('success');

          // Brief delay to show success state, then trigger auth callback
          setTimeout(() => {
            onSuccess();
          }, 500);
        } catch (e) {
          console.error('Error processing OAuth callback:', e);
          setError('Failed to process authentication response.');
          setStatus('error');
        }
      } else {
        setError('Invalid authentication response received.');
        setStatus('error');
      }
    };

    processCallback();
  }, [onSuccess, onError]);

  // Loading state
  if (status === 'processing') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-white dark:bg-[#0B0C0E]">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <ChevronsRight className="text-blue-600" size={32} strokeWidth={2.5} />
            <span className="font-bold text-xl text-[#172B4D] dark:text-white tracking-widest">INFINIA</span>
          </div>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Completing sign in...</p>
        </div>
      </div>
    );
  }

  // Success state (brief flash before redirect)
  if (status === 'success') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-white dark:bg-[#0B0C0E]">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <ChevronsRight className="text-blue-600" size={32} strokeWidth={2.5} />
            <span className="font-bold text-xl text-[#172B4D] dark:text-white tracking-widest">INFINIA</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Sign in successful!</p>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white dark:bg-[#0B0C0E]">
      <div className="text-center max-w-md px-6">
        <div className="flex items-center justify-center gap-2 mb-6">
          <ChevronsRight className="text-blue-600" size={32} strokeWidth={2.5} />
          <span className="font-bold text-xl text-[#172B4D] dark:text-white tracking-widest">INFINIA</span>
        </div>

        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="text-red-600 dark:text-red-400" size={28} />
        </div>

        <h2 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">
          Authentication Failed
        </h2>

        <p className="text-slate-600 dark:text-slate-400 mb-6">
          {error}
        </p>

        <a
          href="/"
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200"
        >
          Return to Login
        </a>
      </div>
    </div>
  );
};

export default OAuthCallback;
