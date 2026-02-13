import React, { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { Link } from 'react-router-dom';

interface DashboardStats {
  tenants: {
    total_tenants: number;
    active_tenants: number;
    paid_tenants: number;
  };
  users: {
    total_users: number;
    active_users: number;
  };
  ai_providers: {
    total_providers: number;
    enabled_providers: number;
  };
  system_health: {
    database: {
      postgresql: string;
      mongodb: string;
    };
    api_server: string;
    timestamp: string;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    const response = await adminApi.getDashboardStats();

    if (response.success && response.data) {
      setStats(response.data);
    }

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-500 dark:text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Dashboard
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          System overview and quick stats
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Tenants */}
        <div className="bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Tenants
            </h3>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {stats?.tenants.total_tenants || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {stats?.tenants.active_tenants || 0} active · {stats?.tenants.paid_tenants || 0} paid
          </div>
        </div>

        {/* Users */}
        <div className="bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Users
            </h3>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {stats?.users.total_users || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {stats?.users.active_users || 0} active users
          </div>
        </div>

        {/* AI Providers */}
        <div className="bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              AI Providers
            </h3>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {stats?.ai_providers.total_providers || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {stats?.ai_providers.enabled_providers || 0} enabled
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              System Health
            </h3>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-green-500 mb-2">
            Healthy
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            All systems operational
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#1F2128] p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/admin/ai-providers"
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-[#1F2128] hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">AI Providers</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage AI provider configurations
              </p>
            </div>
          </Link>

          <Link
            to="/admin/tenants"
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-[#1F2128] hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Tenants</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View and manage organizations
              </p>
            </div>
          </Link>

          <Link
            to="/admin/git-providers"
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-[#1F2128] hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Git Providers</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure Git OAuth providers
              </p>
            </div>
          </Link>

          <Link
            to="/admin/audit-log"
            className="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-[#1F2128] hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-gray-50 dark:hover:bg-[#1F2128] transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Audit Log</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View admin action history
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
