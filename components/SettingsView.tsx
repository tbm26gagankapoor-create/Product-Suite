import React, { useState } from 'react';
import { User, Bell, Shield, Palette, Building2, Users, ChevronRight } from 'lucide-react';
import ProfileTab from './settings/ProfileTab';
import OrganizationTab from './settings/OrganizationTab';
import MembersTab from './settings/MembersTab';
import AppearanceTab from './settings/AppearanceTab';
import NotificationsTab from './settings/NotificationsTab';
import SecurityTab from './settings/SecurityTab';

type SettingsTab = 'profile' | 'organization' | 'members' | 'appearance' | 'notifications' | 'security';

const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'organization' as const, label: 'Organization', icon: Building2 },
    { id: 'members' as const, label: 'Members', icon: Users },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'security' as const, label: 'Security', icon: Shield },
  ];

  return (
    <div className="flex-1 overflow-hidden bg-[#F8F9FC] dark:bg-[#0B0C0E] flex">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 border-r border-gray-200 dark:border-[#1F2128] bg-white dark:bg-[#15171E] flex flex-col">
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-3">
          <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Settings
          </div>
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1F2128]'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
                {activeTab === tab.id && (
                  <ChevronRight size={16} className="ml-auto" />
                )}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-3xl mx-auto">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'organization' && <OrganizationTab />}
          {activeTab === 'members' && <MembersTab />}
          {activeTab === 'appearance' && <AppearanceTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'security' && <SecurityTab />}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
