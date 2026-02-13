import React, { useEffect, useState } from 'react';
import { Building2, Users, Cpu, Activity } from 'lucide-react';
import { adminApi } from '../lib/api';

interface Stats {
  tenants: number;
  users: number;
  activeProviders: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const result = await adminApi.getStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
      setIsLoading(false);
    }
    loadStats();
  }, []);

  const statCards = [
    {
      label: 'Total Tenants',
      value: stats?.tenants || 0,
      icon: Building2,
      color: 'bg-blue-500',
    },
    {
      label: 'Total Users',
      value: stats?.users || 0,
      icon: Users,
      color: 'bg-green-500',
    },
    {
      label: 'Active AI Providers',
      value: stats?.activeProviders || 0,
      icon: Cpu,
      color: 'bg-purple-500',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your SaaS platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon size={24} className="text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-gray-950 hover:bg-gray-800 rounded-xl text-gray-300 transition-colors">
              Create New Tenant
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-950 hover:bg-gray-800 rounded-xl text-gray-300 transition-colors">
              Configure AI Provider
            </button>
            <button className="w-full text-left px-4 py-3 bg-gray-950 hover:bg-gray-800 rounded-xl text-gray-300 transition-colors">
              View System Logs
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">System Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-gray-300">API Server</span>
              </div>
              <span className="text-green-500 text-sm">Healthy</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-gray-300">PostgreSQL</span>
              </div>
              <span className="text-green-500 text-sm">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-gray-300">MongoDB</span>
              </div>
              <span className="text-green-500 text-sm">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
