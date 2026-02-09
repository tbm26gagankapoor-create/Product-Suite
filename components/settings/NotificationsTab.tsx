import React, { useState } from 'react';
import { Bell, Mail } from 'lucide-react';
import SectionCard from './SectionCard';
import SectionHeader from './SectionHeader';
import SettingRow from './SettingRow';
import Toggle from './Toggle';

const NotificationsTab: React.FC = () => {
  // Notification settings
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    taskAssigned: true,
    mentions: true,
    sprintUpdates: true,
    projectUpdates: false,
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D] dark:text-white">Notifications</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Choose what you want to be notified about
        </p>
      </div>

      {/* Email Notifications */}
      <SectionCard>
        <SectionHeader
          icon={Mail}
          title="Email Notifications"
          description="Control which emails you receive"
          gradient="from-blue-500 to-cyan-600"
        />
        <div>
          <SettingRow
            title="Daily Summary"
            description="Receive a daily digest of your tasks and updates"
          >
            <Toggle
              checked={notifications.email}
              onChange={(v) => setNotifications({ ...notifications, email: v })}
            />
          </SettingRow>
          <SettingRow
            title="Task Assignments"
            description="When you're assigned to a new task"
          >
            <Toggle
              checked={notifications.taskAssigned}
              onChange={(v) => setNotifications({ ...notifications, taskAssigned: v })}
            />
          </SettingRow>
          <SettingRow
            title="Comments & Mentions"
            description="When someone mentions you in a comment"
          >
            <Toggle
              checked={notifications.mentions}
              onChange={(v) => setNotifications({ ...notifications, mentions: v })}
            />
          </SettingRow>
          <SettingRow
            title="Sprint Updates"
            description="When sprints start, end, or are modified"
          >
            <Toggle
              checked={notifications.sprintUpdates}
              onChange={(v) => setNotifications({ ...notifications, sprintUpdates: v })}
            />
          </SettingRow>
          <SettingRow
            title="Product Updates"
            description="News about new features and improvements"
            noBorder
          >
            <Toggle
              checked={notifications.projectUpdates}
              onChange={(v) => setNotifications({ ...notifications, projectUpdates: v })}
            />
          </SettingRow>
        </div>
      </SectionCard>

      {/* Push Notifications */}
      <SectionCard>
        <SectionHeader
          icon={Bell}
          title="Push Notifications"
          description="Real-time notifications in your browser"
          gradient="from-violet-500 to-purple-600"
        />
        <div>
          <SettingRow
            title="Enable Push Notifications"
            description="Get real-time updates even when the tab is closed"
            noBorder
          >
            <Toggle
              checked={notifications.push}
              onChange={(v) => setNotifications({ ...notifications, push: v })}
            />
          </SettingRow>
        </div>
      </SectionCard>
    </div>
  );
};

export default NotificationsTab;
