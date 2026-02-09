import React from 'react';
import { Shield, Key, Smartphone, Lock, Monitor, AlertTriangle } from 'lucide-react';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';

const SecurityTab: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D] dark:text-white">Security</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your account security and authentication
        </p>
      </div>

      {/* Password */}
      <SectionCard>
        <SectionHeader
          icon={Key}
          title="Password"
          description="Manage your account password"
          gradient="from-blue-500 to-indigo-600"
        />
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#172B4D] dark:text-white">
                Password last changed
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                3 months ago
              </p>
            </div>
            <button className="px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              Change Password
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Two-Factor Authentication */}
      <SectionCard>
        <SectionHeader
          icon={Smartphone}
          title="Two-Factor Authentication"
          description="Add an extra layer of security to your account"
          gradient="from-amber-500 to-orange-600"
        />
        <div className="p-6">
          <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Shield size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  2FA is not enabled
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Protect your account with two-factor authentication
                </p>
              </div>
            </div>
            <button className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors">
              Enable 2FA
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Active Sessions */}
      <SectionCard>
        <SectionHeader
          icon={Lock}
          title="Active Sessions"
          description="Devices currently logged into your account"
          gradient="from-green-500 to-emerald-600"
        />
        <div className="p-4 space-y-3">
          {[
            { device: 'MacBook Pro', location: 'San Francisco, CA', current: true },
            { device: 'iPhone 15 Pro', location: 'San Francisco, CA', current: false },
          ].map((session, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1F2128] rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Monitor size={18} className="text-gray-500" />
                </div>
                <div>
                  <div className="text-sm font-medium text-[#172B4D] dark:text-white flex items-center gap-2">
                    {session.device}
                    {session.current && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {session.location}
                  </div>
                </div>
              </div>
              {!session.current && (
                <button className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline">
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Danger Zone */}
      <SectionCard className="border-red-200 dark:border-red-900/50">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-600 dark:text-red-400">Delete Account</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button className="mt-4 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};

export default SecurityTab;
