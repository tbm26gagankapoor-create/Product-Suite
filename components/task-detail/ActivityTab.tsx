
import React from 'react';
import {
  Plus,
  MessageSquare,
  Loader2,
  User,
  UserPlus,
  ArrowRightLeft,
  PenLine,
  ListPlus,
  CheckCircle,
  RotateCcw,
  Activity,
  Trash2,
} from 'lucide-react';

interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  user_id: string | null;
  user_name?: string;
  user_avatar?: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

interface ActivityTabProps {
  activityLogs: ActivityLog[];
  isLoadingActivity: boolean;
  users: any[];
}

const ActivityTab: React.FC<ActivityTabProps> = ({
  activityLogs,
  isLoadingActivity,
  users,
}) => {
  // Format activity action text
  const getActionText = (activity: ActivityLog) => {
    switch (activity.action) {
      case 'created':
        return 'created this task';
      case 'updated':
        if (activity.field_changed) {
          return `updated ${activity.field_changed}${activity.old_value && activity.new_value ? ` from "${activity.old_value}" to "${activity.new_value}"` : ''}`;
        }
        return 'updated this task';
      case 'moved':
        return `moved to ${activity.new_value || 'a new column'}`;
      case 'assigned':
        const assignee = users.find((u: any) => u.id === activity.new_value);
        return `assigned to ${assignee?.name || activity.new_value || 'someone'}`;
      case 'commented':
        return `commented: "${activity.new_value?.substring(0, 50)}${(activity.new_value?.length || 0) > 50 ? '...' : ''}"`;
      case 'added_to_sprint':
        return `added to sprint`;
      case 'removed_from_sprint':
        return `removed from sprint`;
      case 'added_subtask':
        return `added subtask: ${activity.new_value}`;
      case 'completed_subtask':
        return `completed subtask: ${activity.new_value}`;
      case 'reopened_subtask':
        return `reopened subtask: ${activity.new_value}`;
      case 'deleted_subtask':
        return `deleted subtask`;
      case 'deleted':
        return 'deleted this task';
      default:
        return activity.action;
    }
  };

  // Get icon and color based on action type
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return { icon: Plus, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      case 'assigned':
        return { icon: UserPlus, color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case 'moved':
        return { icon: ArrowRightLeft, color: 'text-purple-500', bg: 'bg-purple-500/10' };
      case 'updated':
        return { icon: PenLine, color: 'text-amber-500', bg: 'bg-amber-500/10' };
      case 'added_subtask':
        return { icon: ListPlus, color: 'text-indigo-500', bg: 'bg-indigo-500/10' };
      case 'completed_subtask':
        return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      case 'reopened_subtask':
        return { icon: RotateCcw, color: 'text-orange-500', bg: 'bg-orange-500/10' };
      case 'deleted':
      case 'deleted_subtask':
        return { icon: Trash2, color: 'text-red-500', bg: 'bg-red-500/10' };
      default:
        return { icon: Activity, color: 'text-gray-500', bg: 'bg-gray-500/10' };
    }
  };

  if (isLoadingActivity) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Loader2 size={24} className="mx-auto mb-2 animate-spin" />
        <p className="text-xs">Loading activity...</p>
      </div>
    );
  }

  const sortedLogs = [...(Array.isArray(activityLogs) ? activityLogs : [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (sortedLogs.length === 0) {
    return null;
  }

  return (
    <>
      {sortedLogs.map((activity) => {
        const user = users.find((u: any) => u.id === activity.user_id);
        const { icon: ActionIcon, color: iconColor, bg: iconBg } = getActionIcon(activity.action);

        return (
          <div key={`activity-${activity.id}`} className="flex gap-3 items-start group">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#1F2128] border border-gray-200 dark:border-[#2D2F36] flex items-center justify-center overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover" />
                ) : activity.user_avatar ? (
                  <img src={activity.user_avatar} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User size={16} className="text-gray-400" />
                )}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${iconBg} border-2 border-white dark:border-[#15171E] flex items-center justify-center`}>
                <ActionIcon size={10} className={iconColor} />
              </div>
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed">
                <span className="font-semibold text-[#172B4D] dark:text-white">
                  {user?.name || activity.user_name || 'System'}
                </span>
                {' '}
                <span className="text-gray-500 dark:text-gray-400">
                  {getActionText(activity)}
                </span>
              </p>
              <span className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 block">
                {new Date(activity.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default ActivityTab;
