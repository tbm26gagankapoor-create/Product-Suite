/**
 * OAuth Callback Component
 * Handles the OAuth redirect callback, extracts token from URL hash,
 * stores it in localStorage, and triggers authentication state update.
 */

import React, { useEffect, useState, useRef } from 'react';
import { ChevronsRight, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

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
  const [retryCount, setRetryCount] = useState(0);
  const processedRef = useRef(false);

  useEffect(() => {
    // Prevent double processing
    if (processedRef.current) return;

    const processCallback = () => {
      // Check for error in query params first (from backend redirect on error)
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');

      if (errorParam) {
        processedRef.current = true;
        const errorMessage = ERROR_MESSAGES[errorParam] || 'An unknown error occurred during sign in.';
        setError(errorMessage);
        setStatus('error');
        onError?.(errorMessage);
        return;
      }

      // Parse token from URL hash fragment
      const hash = window.location.hash.substring(1);

      // If no hash yet and we haven't retried too many times, wait and retry
      if (!hash) {
        if (retryCount < 10) {
          // Retry after a short delay - the hash might not be available immediately
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 200);
          return;
        }
        // After retries, show error
        processedRef.current = true;
        setError('No authentication data received. Please try signing in again.');
        setStatus('error');
        return;
      }

      const params = new URLSearchParams(hash);
      const token = params.get('token');
      const userJson = params.get('user');

      if (token && userJson) {
        try {
          processedRef.current = true;
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
          }, 800);
        } catch (e) {
          console.error('Error processing OAuth callback:', e);
          processedRef.current = true;
          setError('Failed to process authentication response.');
          setStatus('error');
        }
      } else if (retryCount < 10) {
        // Token not ready yet, retry
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 200);
      } else {
        processedRef.current = true;
        setError('Invalid authentication response received.');
        setStatus('error');
      }
    };

    // Small initial delay to ensure URL is fully loaded
    const timer = setTimeout(processCallback, 100);
    return () => clearTimeout(timer);
  }, [onSuccess, onError, retryCount]);

  // Loading state - branded with animated elements
  if (status === 'processing') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-white dark:bg-[#0B0C0E]">
        <div className="flex flex-col items-center gap-6">
          {/* Logo with gradient animation */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 animate-pulse">
              <ChevronsRight className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            {/* Spinning ring around logo */}
            <div className="absolute inset-0 -m-1">
              <div className="w-[72px] h-[72px] rounded-2xl border-2 border-transparent border-t-blue-500/50 animate-spin" style={{ animationDuration: '1.5s' }} />
            </div>
          </div>

          {/* App name */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#172B4D] dark:text-white tracking-tight">
              Infinia
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Completing sign in...
            </p>
          </div>

          {/* Loading dots */}
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // Success state (brief flash before redirect)
  if (status === 'success') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-white dark:bg-[#0B0C0E]">
        <div className="flex flex-col items-center gap-6">
          {/* Success icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/25">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>

          {/* App name */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#172B4D] dark:text-white tracking-tight">
              Welcome!
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Sign in successful, loading your workspace...
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-48 h-1.5 bg-gray-100 dark:bg-[#1F2128] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-loading-progress" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white dark:bg-[#0B0C0E]">
      <div className="flex flex-col items-center gap-6 max-w-md px-6 text-center">
        {/* Error icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/25">
          <AlertCircle className="w-8 h-8 text-white" />
        </div>

        {/* Error message */}
        <div>
          <h2 className="text-xl font-bold text-[#172B4D] dark:text-white mb-2">
            Authentication Failed
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {error}
          </p>
        </div>

        {/* Return button */}
        <a
          href="/"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-[#172B4D] dark:bg-white text-white dark:text-[#172B4D] font-medium rounded-xl hover:opacity-90 transition-all shadow-lg"
        >
          Return to Login
        </a>

        {/* Help text */}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          If the problem persists, please contact support
        </p>
      </div>
    </div>
  );
};

export default OAuthCallback;
