import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SsoStatus {
  enabled: boolean;
  provider: string;
  displayName: string;
}

export default function LoginPage() {
  const { loginWithSso } = useAuth();
  const [error, setError] = useState('');
  const [isSsoLoading, setIsSsoLoading] = useState(false);
  const [ssoStatus, setSsoStatus] = useState<SsoStatus | null>(null);

  // Check for SSO callback on mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setError(errorDescription || errorParam);
      window.history.replaceState(null, '', '/');
      return;
    }

    if (code && state) {
      handleSsoCallback(code, state);
    }
  }, []);

  // Fetch SSO status
  useEffect(() => {
    const fetchSsoStatus = async () => {
      try {
        const response = await fetch('/api/v1/admin/auth/sso/status');
        const data = await response.json();
        if (data.success && data.data.enabled) {
          setSsoStatus(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch SSO status:', err);
      }
    };
    fetchSsoStatus();
  }, []);

  const handleSsoCallback = async (code: string, state: string) => {
    setIsSsoLoading(true);
    setError('');

    try {
      const result = await loginWithSso(code, state);
      if (!result.success) {
        setError(result.error || 'SSO login failed');
      }
      window.history.replaceState(null, '', '/');
    } catch (err: any) {
      setError(err.message || 'SSO login failed');
      window.history.replaceState(null, '', '/');
    } finally {
      setIsSsoLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setIsSsoLoading(true);
    setError('');

    try {
      const response = await fetch('/api/v1/admin/auth/sso/login');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initiate SSO login');
      }

      window.location.href = data.data.authUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Microsoft login');
      setIsSsoLoading(false);
    }
  };

  // Show loading state for SSO callback
  if (isSsoLoading && window.location.search.includes('code=')) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Completing sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Infinia Admin</h1>
          <p className="text-gray-500 mt-2">SaaS Management Portal</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800">
          {/* Microsoft SSO Button */}
          {ssoStatus?.enabled ? (
            <>
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={isSsoLoading}
                className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {isSsoLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                    </svg>
                    {ssoStatus.displayName}
                  </>
                )}
              </button>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm mt-4">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 py-4">
              <p>SSO is not configured.</p>
              <p className="text-sm mt-2">Contact your administrator.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
