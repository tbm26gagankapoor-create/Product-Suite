/**
 * Email templates index
 * Central export for all email templates
 */

// Base template utilities
export {
  baseTemplate,
  primaryButton,
  infoBox,
  badge,
  linkFallback,
} from './base.template.js';

// Invitation
export {
  invitationHtml,
  invitationText,
  type InvitationTemplateData,
} from './invitation.template.js';

// Welcome
export {
  welcomeHtml,
  welcomeText,
  type WelcomeTemplateData,
} from './welcome.template.js';

// Password Reset
export {
  passwordResetHtml,
  passwordResetText,
  type PasswordResetTemplateData,
} from './password-reset.template.js';

// Task Assigned
export {
  taskAssignedHtml,
  taskAssignedText,
  type TaskAssignedTemplateData,
} from './task-assigned.template.js';

// Comment Notification
export {
  commentNotificationHtml,
  commentNotificationText,
  type CommentNotificationTemplateData,
} from './comment-notification.template.js';

// Mention
export {
  mentionHtml,
  mentionText,
  type MentionTemplateData,
} from './mention.template.js';

// Sprint Reminder
export {
  sprintReminderHtml,
  sprintReminderText,
  type SprintReminderTemplateData,
} from './sprint-reminder.template.js';

// Digest
export {
  digestHtml,
  digestText,
  type DigestTemplateData,
  type DigestTask,
} from './digest.template.js';

/**
 * Email template types
 */
export type EmailTemplateType =
  | 'invitation'
  | 'welcome'
  | 'password-reset'
  | 'task-assigned'
  | 'comment-notification'
  | 'mention'
  | 'sprint-reminder'
  | 'digest';
