import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  AtSign,
  UserPlus,
  Zap,
  AlertCircle,
  FileText,
  Clock,
  Loader2,
  Filter,
  RefreshCw,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { notificationsApi, Notification, NotificationType } from '../services/api';
import { useProjectData } from '../context/ProjectDataContext';

// Helper for relative time
const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  return 'Just now';
};

// Get icon for notification type
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'task_assigned':
      return <UserPlus size={16} className="text-blue-500" />;
    case 'task_mentioned':
    case 'document_mentioned':
      return <AtSign size={16} className="text-purple-500" />;
    case 'comment_added':
    case 'comment_reply':
      return <MessageSquare size={16} className="text-green-500" />;
    case 'sprint_reminder':
      return <Zap size={16} className="text-amber-500" />;
    case 'project_update':
      return <FileText size={16} className="text-indigo-500" />;
    case 'status_change':
      return <RefreshCw size={16} className="text-cyan-500" />;
    case 'due_date_reminder':
      return <Clock size={16} className="text-red-500" />;
    case 'system':
    default:
      return <Bell size={16} className="text-gray-500" />;
  }
};

// Get background color for notification type
const getNotificationBg = (type: NotificationType, isRead: boolean) => {
  if (isRead) return 'bg-white dark:bg-[#15171E]';

  switch (type) {
    case 'task_assigned':
      return 'bg-blue-50 dark:bg-blue-900/10';
    case 'task_mentioned':
    case 'document_mentioned':
      return 'bg-purple-50 dark:bg-purple-900/10';
    case 'comment_added':
    case 'comment_reply':
      return 'bg-green-50 dark:bg-green-900/10';
    case 'sprint_reminder':
      return 'bg-amber-50 dark:bg-amber-900/10';
    case 'due_date_reminder':
      return 'bg-red-50 dark:bg-red-900/10';
    default:
      return 'bg-gray-50 dark:bg-gray-800/50';
  }
};

// Get label for notification type
const getNotificationTypeLabel = (type: NotificationType) => {
  switch (type) {
    case 'task_assigned': return 'Assignment';
    case 'task_mentioned': return 'Mention';
    case 'document_mentioned': return 'Document Mention';
    case 'comment_added': return 'Comment';
    case 'comment_reply': return 'Reply';
    case 'sprint_reminder': return 'Sprint';
    case 'project_update': return 'Project';
    case 'status_change': return 'Status';
    case 'due_date_reminder': return 'Due Date';
    case 'system': return 'System';
    default: return 'Notification';
  }
};

type FilterType = 'all' | 'unread' | 'mentions' | 'assignments' | 'comments';

const NotificationsView: React.FC = () => {
  const { currentUser } = useProjectData();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    setIsLoading(true);
    try {
      const unreadOnly = filter === 'unread';
      const response = await notificationsApi.getAll({ page: pageNum, limit: 20, unread_only: unreadOnly });

      let filteredNotifications = response.data;

      // Apply additional filters
      if (filter === 'mentions') {
        filteredNotifications = filteredNotifications.filter(n =>
          n.type === 'task_mentioned' || n.type === 'document_mentioned'
        );
      } else if (filter === 'assignments') {
        filteredNotifications = filteredNotifications.filter(n => n.type === 'task_assigned');
      } else if (filter === 'comments') {
        filteredNotifications = filteredNotifications.filter(n =>
          n.type === 'comment_added' || n.type === 'comment_reply'
        );
      }

      if (append) {
        setNotifications(prev => [...prev, ...filteredNotifications]);
      } else {
        setNotifications(filteredNotifications);
      }

      setTotal(response.pagination.total);
      setHasMore(response.pagination.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      setUnreadCount(response.count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadNotifications(1);
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  // Reload when filter changes
  useEffect(() => {
    loadNotifications(1);
  }, [filter, loadNotifications]);

  // Mark single notification as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    setIsMarkingAllRead(true);
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  // Load more
  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      loadNotifications(page + 1, true);
    }
  };

  const filterOptions: { value: FilterType; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All', icon: <Bell size={14} /> },
    { value: 'unread', label: 'Unread', icon: <AlertCircle size={14} /> },
    { value: 'mentions', label: 'Mentions', icon: <AtSign size={14} /> },
    { value: 'assignments', label: 'Assignments', icon: <UserPlus size={14} /> },
    { value: 'comments', label: 'Comments', icon: <MessageSquare size={14} /> },
  ];

  return (
    <div className="flex-1 h-full bg-[#F8F9FC] dark:bg-[#050505] overflow-hidden">
      <div className="h-full flex flex-col max-w-4xl mx-auto">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 dark:border-[#1F2128] bg-white dark:bg-[#0B0C0E]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                <Bell size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isMarkingAllRead ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCheck size={14} />
                  )}
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => loadNotifications(1)}
                disabled={isLoading}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F2128] rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#1F2128] rounded-lg p-1">
            {filterOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === option.value
                    ? 'bg-white dark:bg-[#2D2F36] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {option.icon}
                <span>{option.label}</span>
                {option.value === 'unread' && unreadCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-blue-500 text-white text-[10px] rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-blue-500 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#1F2128] flex items-center justify-center mb-4">
                <Bell size={28} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No notifications</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                {filter === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : filter === 'mentions'
                  ? "No mentions yet. When someone @mentions you, it'll show up here."
                  : filter === 'assignments'
                  ? 'No task assignments yet.'
                  : filter === 'comments'
                  ? 'No comment notifications yet.'
                  : "You don't have any notifications yet."}
              </p>
            </div>
          ) : (
            <>
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`group relative p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                    notification.read
                      ? 'border-gray-200 dark:border-[#2D2F36] bg-white dark:bg-[#15171E]'
                      : 'border-blue-200 dark:border-blue-800/50 ' + getNotificationBg(notification.type, notification.read)
                  }`}
                  onClick={() => {
                    if (!notification.read) {
                      handleMarkAsRead(notification.id);
                    }
                    // TODO: Navigate to action_url if available
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                      notification.read ? 'bg-gray-100 dark:bg-[#1F2128]' : 'bg-white dark:bg-[#1F2128]'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            notification.read
                              ? 'bg-gray-100 dark:bg-[#1F2128] text-gray-500'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          }`}>
                            {getNotificationTypeLabel(notification.type)}
                          </span>
                          {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 flex-shrink-0">
                          {timeAgo(notification.created_at)}
                        </span>
                      </div>

                      <h4 className={`text-sm font-semibold mb-0.5 ${
                        notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'
                      }`}>
                        {notification.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        {notification.message}
                      </p>

                      {/* Actor info */}
                      {notification.metadata?.actor_name && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                            <span className="text-[8px] text-white font-bold">
                              {notification.metadata.actor_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            {notification.metadata.actor_name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action arrow */}
                    {notification.action_url && (
                      <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 dark:group-hover:text-gray-500 transition-colors flex-shrink-0 mt-1" />
                    )}
                  </div>

                  {/* Mark as read button (shown on hover for unread) */}
                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                      className="absolute top-3 right-3 p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 opacity-0 group-hover:opacity-100 transition-all"
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        <span>Load more</span>
                        <span className="text-gray-400">({total - notifications.length} remaining)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsView;
