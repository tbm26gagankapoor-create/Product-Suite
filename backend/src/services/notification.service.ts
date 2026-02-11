/**
 * Notification Service
 * Orchestrates email and in-app notifications based on user preferences
 */

import { v4 as uuidv4 } from 'uuid';
import {
  UserNotificationPreferences,
  Notification,
  EmailLog,
  User,
  Task,
  Project,
  Sprint,
  Comment,
  type IUserNotificationPreferences,
  type INotification,
  type NotificationType,
} from '../models/index.js';
import { config } from '../config/index.js';
import {
  emailService,
  type SendTaskAssignedEmailParams,
  type SendCommentNotificationEmailParams,
  type SendMentionEmailParams,
  type SendSprintReminderEmailParams,
} from './email.service.js';

// ===================
// Types
// ===================

interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: {
    task_id?: string;
    project_id?: string;
    sprint_id?: string;
    comment_id?: string;
    actor_id?: string;
    actor_name?: string;
  };
}

interface NotificationPreferencesUpdate {
  email_enabled?: boolean;
  email_digest_frequency?: 'instant' | 'daily' | 'weekly' | 'none';
  email_task_assigned?: boolean;
  email_task_mentioned?: boolean;
  email_comment_added?: boolean;
  email_comment_reply?: boolean;
  email_sprint_reminder?: boolean;
  email_project_updates?: boolean;
  email_due_date_reminder?: boolean;
  inapp_enabled?: boolean;
  inapp_task_assigned?: boolean;
  inapp_task_mentioned?: boolean;
  inapp_comment_added?: boolean;
  inapp_comment_reply?: boolean;
  inapp_sprint_reminder?: boolean;
  inapp_project_updates?: boolean;
  inapp_status_change?: boolean;
  quiet_hours_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  quiet_hours_timezone?: string;
}

// ===================
// Helper Functions
// ===================

/**
 * Get the frontend URL for a task
 */
function getTaskUrl(projectId: string, taskKey: string): string {
  return `${config.frontend.url}/projects/${projectId}?task=${taskKey}`;
}

/**
 * Get the frontend URL for a sprint
 */
function getSprintUrl(projectId: string, sprintId: string): string {
  return `${config.frontend.url}/projects/${projectId}/sprints?sprint=${sprintId}`;
}

/**
 * Check if current time is within quiet hours
 */
function isQuietHours(prefs: IUserNotificationPreferences): boolean {
  if (!prefs.quiet_hours_enabled) return false;

  try {
    const now = new Date();
    const timezone = prefs.quiet_hours_timezone || 'UTC';

    // Get current time in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const currentTime = formatter.format(now);

    const [startHour, startMin] = prefs.quiet_hours_start.split(':').map(Number);
    const [endHour, endMin] = prefs.quiet_hours_end.split(':').map(Number);
    const [currentHour, currentMin] = currentTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const currentMinutes = currentHour * 60 + currentMin;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch {
    return false;
  }
}

/**
 * Check if email should be sent for a notification type
 */
function shouldSendEmail(prefs: IUserNotificationPreferences, type: NotificationType): boolean {
  if (!prefs.email_enabled) return false;
  if (prefs.email_digest_frequency !== 'instant') return false;

  const emailPrefs: Record<NotificationType, boolean> = {
    task_assigned: prefs.email_task_assigned,
    task_mentioned: prefs.email_task_mentioned,
    comment_added: prefs.email_comment_added,
    comment_reply: prefs.email_comment_reply,
    sprint_reminder: prefs.email_sprint_reminder,
    project_update: prefs.email_project_updates,
    status_change: false, // No email for status changes by default
    due_date_reminder: prefs.email_due_date_reminder,
    document_mentioned: prefs.email_task_mentioned, // Reuse task mention preference for document mentions
    system: true, // Always send system emails
  };

  return emailPrefs[type] ?? false;
}

/**
 * Check if in-app notification should be created for a type
 */
function shouldCreateInApp(prefs: IUserNotificationPreferences, type: NotificationType): boolean {
  if (!prefs.inapp_enabled) return false;

  const inappPrefs: Record<NotificationType, boolean> = {
    task_assigned: prefs.inapp_task_assigned,
    task_mentioned: prefs.inapp_task_mentioned,
    comment_added: prefs.inapp_comment_added,
    comment_reply: prefs.inapp_comment_reply,
    sprint_reminder: prefs.inapp_sprint_reminder,
    project_update: prefs.inapp_project_updates,
    status_change: prefs.inapp_status_change,
    due_date_reminder: true, // Always show in-app for due dates
    document_mentioned: prefs.inapp_task_mentioned, // Reuse task mention preference for document mentions
    system: true, // Always show system notifications
  };

  return inappPrefs[type] ?? false;
}

/**
 * Parse @mentions from text
 * Returns array of usernames mentioned (without @ symbol)
 */
function parseMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  return [...new Set(mentions)]; // Remove duplicates
}

/**
 * Truncate text for preview
 */
function truncateText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Log email to database
 */
async function logEmail(params: {
  toEmail: string;
  toUserId?: string;
  templateType: string;
  subject: string;
  resendId?: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await EmailLog.create({
      id: uuidv4(),
      to_email: params.toEmail,
      to_user_id: params.toUserId,
      template_type: params.templateType,
      subject: params.subject,
      resend_id: params.resendId,
      status: params.status,
      error_message: params.errorMessage,
      metadata: params.metadata,
      created_at: new Date(),
    });
  } catch (err) {
    console.error('Failed to log email:', err);
  }
}

// ===================
// Notification Service
// ===================

export const notificationService = {
  /**
   * Get or create default notification preferences for a user
   */
  async getUserPreferences(userId: string) {
    let prefs = await UserNotificationPreferences.findOne({ user_id: userId });

    if (!prefs) {
      prefs = await this.createDefaultPreferences(userId);
    }

    return prefs!;
  },

  /**
   * Create default notification preferences for a new user
   */
  async createDefaultPreferences(userId: string) {
    const prefs = await UserNotificationPreferences.create({
      id: uuidv4(),
      user_id: userId,
      email_enabled: true,
      email_digest_frequency: 'instant',
      email_task_assigned: true,
      email_task_mentioned: true,
      email_comment_added: true,
      email_comment_reply: true,
      email_sprint_reminder: true,
      email_project_updates: false,
      email_due_date_reminder: true,
      inapp_enabled: true,
      inapp_task_assigned: true,
      inapp_task_mentioned: true,
      inapp_comment_added: true,
      inapp_comment_reply: true,
      inapp_sprint_reminder: true,
      inapp_project_updates: true,
      inapp_status_change: true,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      quiet_hours_timezone: 'UTC',
      created_at: new Date(),
      updated_at: new Date(),
    });

    return prefs;
  },

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    updates: NotificationPreferencesUpdate
  ) {
    const prefs = await UserNotificationPreferences.findOneAndUpdate(
      { user_id: userId },
      { ...updates, updated_at: new Date() },
      { new: true, upsert: true }
    );

    return prefs!;
  },

  /**
   * Create an in-app notification
   */
  async createInAppNotification(params: NotifyParams) {
    const notification = await Notification.create({
      id: uuidv4(),
      user_id: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      action_url: params.actionUrl,
      metadata: params.metadata,
      read: false,
      email_sent: false,
      created_at: new Date(),
    });

    return notification;
  },

  /**
   * Get notifications for a user (paginated)
   */
  async getNotifications(
    userId: string,
    options: { page?: number; limit?: number; unreadOnly?: boolean } = {}
  ): Promise<{ notifications: INotification[]; total: number; hasMore: boolean }> {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { user_id: userId };
    if (unreadOnly) {
      query.read = false;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    return {
      notifications: notifications as INotification[],
      total,
      hasMore: skip + notifications.length < total,
    };
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await Notification.updateOne(
      { id: notificationId, user_id: userId },
      { read: true }
    );
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { user_id: userId, read: false },
      { read: true }
    );
  },

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({ user_id: userId, read: false });
  },

  /**
   * Core notification method - handles both email and in-app
   */
  async notify(params: NotifyParams): Promise<void> {
    const prefs = await this.getUserPreferences(params.userId);

    // Create in-app notification if enabled
    if (shouldCreateInApp(prefs, params.type)) {
      await this.createInAppNotification(params);
    }

    // We don't send email here - that's handled by specific notification methods
    // This method just creates the in-app notification record
  },

  /**
   * Notify when a task is assigned to someone
   */
  async notifyTaskAssigned(
    taskId: string,
    assigneeId: string,
    assignerId: string
  ): Promise<void> {
    // Don't notify if assigning to self
    if (assigneeId === assignerId) return;

    const [task, assignee, assigner] = await Promise.all([
      Task.findOne({ id: taskId }),
      User.findOne({ id: assigneeId }),
      User.findOne({ id: assignerId }),
    ]);

    if (!task || !assignee || !assigner) return;

    const project = await Project.findOne({ id: task.project_id });
    if (!project) return;

    const taskUrl = getTaskUrl(project.id, task.task_key);
    const prefs = await this.getUserPreferences(assigneeId);

    // Create in-app notification
    if (shouldCreateInApp(prefs, 'task_assigned')) {
      await this.createInAppNotification({
        userId: assigneeId,
        type: 'task_assigned',
        title: 'Task assigned to you',
        message: `${assigner.name} assigned you ${task.task_key}: ${task.title}`,
        actionUrl: taskUrl,
        metadata: {
          task_id: taskId,
          project_id: task.project_id,
          actor_id: assignerId,
          actor_name: assigner.name,
        },
      });
    }

    // Send email if enabled and not in quiet hours
    if (shouldSendEmail(prefs, 'task_assigned') && !isQuietHours(prefs)) {
      const emailParams: SendTaskAssignedEmailParams = {
        toEmail: assignee.email,
        assigneeName: assignee.name,
        assignerName: assigner.name,
        taskTitle: task.title,
        taskKey: task.task_key,
        taskType: task.type,
        projectName: project.name,
        priority: task.priority,
        dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString() : undefined,
        taskUrl,
      };

      const result = await emailService.sendTaskAssignedEmail(emailParams);

      await logEmail({
        toEmail: assignee.email,
        toUserId: assigneeId,
        templateType: 'task-assigned',
        subject: `[${task.task_key}] Task assigned to you: ${task.title}`,
        resendId: result.resendId,
        status: result.success ? 'sent' : 'failed',
        errorMessage: result.error,
        metadata: { task_id: taskId, assigner_id: assignerId },
      });

      // Update notification record if email was sent
      if (result.success) {
        await Notification.updateOne(
          { user_id: assigneeId, type: 'task_assigned', 'metadata.task_id': taskId },
          { email_sent: true, email_sent_at: new Date() }
        );
      }
    }
  },

  /**
   * Notify when a comment is added to a task
   */
  async notifyCommentAdded(
    taskId: string,
    commentId: string,
    commenterId: string
  ): Promise<void> {
    const [task, comment, commenter] = await Promise.all([
      Task.findOne({ id: taskId }),
      Comment.findOne({ id: commentId }),
      User.findOne({ id: commenterId }),
    ]);

    if (!task || !comment || !commenter) return;

    const project = await Project.findOne({ id: task.project_id });
    if (!project) return;

    const taskUrl = getTaskUrl(project.id, task.task_key);
    const commentPreview = truncateText((comment as any).content || comment.text);

    // Notify assignee if different from commenter
    if (task.assignee_id && task.assignee_id !== commenterId) {
      const assignee = await User.findOne({ id: task.assignee_id });
      if (assignee) {
        const prefs = await this.getUserPreferences(task.assignee_id);

        if (shouldCreateInApp(prefs, 'comment_added')) {
          await this.createInAppNotification({
            userId: task.assignee_id,
            type: 'comment_added',
            title: 'New comment on your task',
            message: `${commenter.name} commented on ${task.task_key}: "${commentPreview}"`,
            actionUrl: taskUrl,
            metadata: {
              task_id: taskId,
              project_id: task.project_id,
              comment_id: commentId,
              actor_id: commenterId,
              actor_name: commenter.name,
            },
          });
        }

        if (shouldSendEmail(prefs, 'comment_added') && !isQuietHours(prefs)) {
          const emailParams: SendCommentNotificationEmailParams = {
            toEmail: assignee.email,
            recipientName: assignee.name,
            commenterName: commenter.name,
            commentPreview,
            taskTitle: task.title,
            taskKey: task.task_key,
            projectName: project.name,
            taskUrl,
          };

          const result = await emailService.sendCommentNotificationEmail(emailParams);

          await logEmail({
            toEmail: assignee.email,
            toUserId: task.assignee_id,
            templateType: 'comment-notification',
            subject: `[${task.task_key}] ${commenter.name} commented on ${task.title}`,
            resendId: result.resendId,
            status: result.success ? 'sent' : 'failed',
            errorMessage: result.error,
            metadata: { task_id: taskId, comment_id: commentId },
          });
        }
      }
    }

    // Notify reporter if different from commenter and assignee
    if (task.reporter_id && task.reporter_id !== commenterId && task.reporter_id !== task.assignee_id) {
      const reporter = await User.findOne({ id: task.reporter_id });
      if (reporter) {
        const prefs = await this.getUserPreferences(task.reporter_id);

        if (shouldCreateInApp(prefs, 'comment_added')) {
          await this.createInAppNotification({
            userId: task.reporter_id,
            type: 'comment_added',
            title: 'New comment on a task you reported',
            message: `${commenter.name} commented on ${task.task_key}: "${commentPreview}"`,
            actionUrl: taskUrl,
            metadata: {
              task_id: taskId,
              project_id: task.project_id,
              comment_id: commentId,
              actor_id: commenterId,
              actor_name: commenter.name,
            },
          });
        }
      }
    }
  },

  /**
   * Notify users who are @mentioned in a comment
   */
  async notifyMention(
    taskId: string,
    mentionedUserIds: string[],
    mentionerId: string,
    context: string
  ): Promise<void> {
    const [task, mentioner] = await Promise.all([
      Task.findOne({ id: taskId }),
      User.findOne({ id: mentionerId }),
    ]);

    if (!task || !mentioner) return;

    const project = await Project.findOne({ id: task.project_id });
    if (!project) return;

    const taskUrl = getTaskUrl(project.id, task.task_key);
    const contextPreview = truncateText(context);

    for (const userId of mentionedUserIds) {
      // Don't notify if mentioning self
      if (userId === mentionerId) continue;

      const user = await User.findOne({ id: userId });
      if (!user) continue;

      const prefs = await this.getUserPreferences(userId);

      if (shouldCreateInApp(prefs, 'task_mentioned')) {
        await this.createInAppNotification({
          userId,
          type: 'task_mentioned',
          title: 'You were mentioned',
          message: `${mentioner.name} mentioned you in ${task.task_key}: "${contextPreview}"`,
          actionUrl: taskUrl,
          metadata: {
            task_id: taskId,
            project_id: task.project_id,
            actor_id: mentionerId,
            actor_name: mentioner.name,
          },
        });
      }

      if (shouldSendEmail(prefs, 'task_mentioned') && !isQuietHours(prefs)) {
        const emailParams: SendMentionEmailParams = {
          toEmail: user.email,
          recipientName: user.name,
          mentionerName: mentioner.name,
          context: contextPreview,
          taskTitle: task.title,
          taskKey: task.task_key,
          projectName: project.name,
          taskUrl,
        };

        const result = await emailService.sendMentionEmail(emailParams);

        await logEmail({
          toEmail: user.email,
          toUserId: userId,
          templateType: 'mention',
          subject: `[${task.task_key}] ${mentioner.name} mentioned you`,
          resendId: result.resendId,
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          metadata: { task_id: taskId, mentioner_id: mentionerId },
        });
      }
    }
  },

  /**
   * Notify users who are @mentioned in a document comment
   */
  async notifyDocumentMention(
    projectId: string,
    sectionId: string,
    mentionedUserIds: string[],
    mentionerId: string,
    context: string
  ): Promise<void> {
    console.log('[notifyDocumentMention] Called with:', {
      projectId,
      sectionId,
      mentionedUserIds,
      mentionerId,
      contextPreview: context.substring(0, 50),
    });

    const [project, mentioner] = await Promise.all([
      Project.findOne({ id: projectId }),
      User.findOne({ id: mentionerId }),
    ]);

    if (!project || !mentioner) {
      console.log('[notifyDocumentMention] Project or mentioner not found:', { project: !!project, mentioner: !!mentioner });
      return;
    }

    const documentUrl = `${config.frontend.url}/projects/${project.id}?tab=Documents&section=${sectionId}`;
    const contextPreview = truncateText(context);

    for (const userId of mentionedUserIds) {
      // Don't notify if mentioning self
      if (userId === mentionerId) {
        console.log('[notifyDocumentMention] Skipping self-mention for user:', userId);
        continue;
      }

      const user = await User.findOne({ id: userId });
      if (!user) continue;

      const prefs = await this.getUserPreferences(userId);

      if (shouldCreateInApp(prefs, 'document_mentioned')) {
        console.log('[notifyDocumentMention] Creating in-app notification for user:', userId);
        await this.createInAppNotification({
          userId,
          type: 'document_mentioned',
          title: 'You were mentioned in a document',
          message: `${mentioner.name} mentioned you in ${project.name} documentation: "${contextPreview}"`,
          actionUrl: documentUrl,
          metadata: {
            project_id: projectId,
            actor_id: mentionerId,
            actor_name: mentioner.name,
          },
        });
        console.log('[notifyDocumentMention] Notification created successfully for user:', userId);
      } else {
        console.log('[notifyDocumentMention] In-app notifications disabled for user:', userId);
      }

      // For email, reuse the mention email template
      if (shouldSendEmail(prefs, 'document_mentioned') && !isQuietHours(prefs)) {
        const emailParams: SendMentionEmailParams = {
          toEmail: user.email,
          recipientName: user.name,
          mentionerName: mentioner.name,
          context: contextPreview,
          taskTitle: `${project.name} - Documentation`,
          taskKey: sectionId,
          projectName: project.name,
          taskUrl: documentUrl,
        };

        const result = await emailService.sendMentionEmail(emailParams);

        await logEmail({
          toEmail: user.email,
          toUserId: userId,
          templateType: 'document-mention',
          subject: `${mentioner.name} mentioned you in ${project.name} documentation`,
          resendId: result.resendId,
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          metadata: { project_id: projectId, section_id: sectionId, mentioner_id: mentionerId },
        });
      }
    }
  },

  /**
   * Notify about sprint starting/ending
   */
  async notifySprintReminder(
    sprintId: string,
    reminderType: 'starting' | 'ending',
    daysUntil: number
  ): Promise<void> {
    const sprint = await Sprint.findOne({ id: sprintId });
    if (!sprint) return;

    const project = await Project.findOne({ id: sprint.project_id });
    if (!project) return;

    // Get all project members
    const { ProjectMember } = await import('../models/index.js');
    const members = await ProjectMember.find({ project_id: project.id });

    const sprintUrl = getSprintUrl(project.id, sprintId);

    // Get task stats for ending sprints
    let taskCount = 0;
    let completedCount = 0;
    if (reminderType === 'ending') {
      const tasks = await Task.find({ sprint_id: sprintId });
      taskCount = tasks.length;
      completedCount = tasks.filter(t => t.status === 'done' || t.status === 'Done').length;
    }

    for (const member of members) {
      const user = await User.findOne({ id: member.user_id });
      if (!user) continue;

      const prefs = await this.getUserPreferences(member.user_id);

      const title = reminderType === 'starting'
        ? 'Sprint starting soon'
        : 'Sprint ending soon';
      const timeText = daysUntil === 0 ? 'today' : daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
      const message = `${sprint.name} ${reminderType === 'starting' ? 'starts' : 'ends'} ${timeText}`;

      if (shouldCreateInApp(prefs, 'sprint_reminder')) {
        await this.createInAppNotification({
          userId: member.user_id,
          type: 'sprint_reminder',
          title,
          message,
          actionUrl: sprintUrl,
          metadata: {
            sprint_id: sprintId,
            project_id: project.id,
          },
        });
      }

      if (shouldSendEmail(prefs, 'sprint_reminder') && !isQuietHours(prefs)) {
        const emailParams: SendSprintReminderEmailParams = {
          toEmail: user.email,
          recipientName: user.name,
          sprintName: sprint.name,
          projectName: project.name,
          reminderType,
          daysUntil,
          sprintGoal: sprint.goal,
          startDate: new Date(sprint.start_date).toLocaleDateString(),
          endDate: new Date(sprint.end_date).toLocaleDateString(),
          taskCount,
          completedCount,
          sprintUrl,
        };

        const result = await emailService.sendSprintReminderEmail(emailParams);

        await logEmail({
          toEmail: user.email,
          toUserId: member.user_id,
          templateType: 'sprint-reminder',
          subject: `Sprint "${sprint.name}" ${reminderType === 'starting' ? 'starts' : 'ends'} ${timeText}`,
          resendId: result.resendId,
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          metadata: { sprint_id: sprintId, reminder_type: reminderType },
        });
      }
    }
  },

  /**
   * Parse @mentions from text (exposed for use in routes)
   */
  parseMentions,
};
