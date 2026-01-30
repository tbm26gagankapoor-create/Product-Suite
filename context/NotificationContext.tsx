import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Check, Clock, AlertTriangle, MessageSquare, CheckCircle, Trash2 } from 'lucide-react';

// Notification Types
export type NotificationType = 'task_due' | 'task_overdue' | 'mention' | 'comment' | 'assignment' | 'status_change' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  isPanelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Storage key
const NOTIFICATIONS_KEY = 'infinia_notifications';
const MAX_NOTIFICATIONS = 50;

// Notification Icons
const NOTIFICATION_ICONS: Record<NotificationType, React.FC<{ className?: string }>> = {
  task_due: Clock,
  task_overdue: AlertTriangle,
  mention: MessageSquare,
  comment: MessageSquare,
  assignment: CheckCircle,
  status_change: Check,
  system: Bell,
};

// Notification Colors
const NOTIFICATION_COLORS: Record<NotificationType, { bg: string; icon: string }> = {
  task_due: { bg: 'bg-amber-100 dark:bg-amber-500/10', icon: 'text-amber-600 dark:text-amber-400' },
  task_overdue: { bg: 'bg-red-100 dark:bg-red-500/10', icon: 'text-red-600 dark:text-red-400' },
  mention: { bg: 'bg-blue-100 dark:bg-blue-500/10', icon: 'text-blue-600 dark:text-blue-400' },
  comment: { bg: 'bg-purple-100 dark:bg-purple-500/10', icon: 'text-purple-600 dark:text-purple-400' },
  assignment: { bg: 'bg-emerald-100 dark:bg-emerald-500/10', icon: 'text-emerald-600 dark:text-emerald-400' },
  status_change: { bg: 'bg-blue-100 dark:bg-blue-500/10', icon: 'text-blue-600 dark:text-blue-400' },
  system: { bg: 'bg-gray-100 dark:bg-gray-500/10', icon: 'text-gray-600 dark:text-gray-400' },
};

// Format time ago
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

// Notification Item Component
const NotificationItem: React.FC<{
  notification: Notification;
  onMarkAsRead: () => void;
  onRemove: () => void;
  onClick?: () => void;
}> = ({ notification, onMarkAsRead, onRemove, onClick }) => {
  const Icon = NOTIFICATION_ICONS[notification.type];
  const colors = NOTIFICATION_COLORS[notification.type];

  return (
    <div
      className={`
        p-4 border-b border-gray-100 dark:border-[#1F2128] last:border-b-0
        hover:bg-gray-50 dark:hover:bg-[#1F2128]/50 transition-colors cursor-pointer
        ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''}
      `}
      onClick={() => {
        if (!notification.read) onMarkAsRead();
        onClick?.();
      }}
    >
      <div className="flex gap-3">
        <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${colors.icon}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-semibold truncate ${
              notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'
            }`}>
              {notification.title}
            </h4>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">
            {formatTimeAgo(new Date(notification.timestamp))}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2D2F36] transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Remove notification"
        >
          <X className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>
    </div>
  );
};

// Notification Panel Component
const NotificationPanel: React.FC<{
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
}> = ({ notifications, onMarkAsRead, onMarkAllAsRead, onRemove, onClearAll, onClose }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-16 right-4 z-50 w-96 max-h-[calc(100vh-100px)] bg-white dark:bg-[#15171E] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#1F2128] overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-[#1F2128] bg-gray-50 dark:bg-[#0B0C0E]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 id="notifications-title" className="text-sm font-bold text-gray-900 dark:text-white">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-[400px] custom-scrollbar">
          {notifications.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-[#1F2128]">
              {notifications.map((notification) => (
                <div key={notification.id} className="group">
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={() => onMarkAsRead(notification.id)}
                    onRemove={() => onRemove(notification.id)}
                    onClick={() => {
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No notifications</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                You're all caught up!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-[#1F2128] bg-gray-50 dark:bg-[#0B0C0E]">
            <button
              onClick={onClearAll}
              className="w-full py-2 text-xs font-medium text-gray-500 hover:text-red-500 transition-colors flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all notifications
            </button>
          </div>
        )}
      </div>
    </>,
    document.body
  );
};

// Provider Component
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(
          parsed.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }))
        );
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, []);

  // Save to localStorage when notifications change
  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        read: false,
      };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev];
        // Keep only the most recent notifications
        return updated.slice(0, MAX_NOTIFICATIONS);
      });

      // Request browser notification permission and show
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
        });
      }
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const openPanel = useCallback(() => setIsPanelOpen(true), []);
  const closePanel = useCallback(() => setIsPanelOpen(false), []);
  const togglePanel = useCallback(() => setIsPanelOpen((prev) => !prev), []);

  // Request notification permission on first interaction
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // We'll request permission when user first interacts
      const requestPermission = () => {
        Notification.requestPermission();
        document.removeEventListener('click', requestPermission);
      };
      document.addEventListener('click', requestPermission, { once: true });
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        isPanelOpen,
        openPanel,
        closePanel,
        togglePanel,
      }}
    >
      {children}
      {isPanelOpen && (
        <NotificationPanel
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onRemove={removeNotification}
          onClearAll={clearAll}
          onClose={closePanel}
        />
      )}
    </NotificationContext.Provider>
  );
};

// Hook
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Notification Bell Component (for Sidebar)
export const NotificationBell: React.FC = () => {
  const { unreadCount, togglePanel } = useNotifications();

  return (
    <button
      onClick={togglePanel}
      className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};
