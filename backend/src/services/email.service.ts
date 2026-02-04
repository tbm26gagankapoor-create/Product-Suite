/**
 * Email Service using Resend
 * Handles all email sending for the application
 */

import { Resend } from 'resend';
import { config } from '../config/index.js';
import {
  invitationHtml,
  invitationText,
  welcomeHtml,
  welcomeText,
  passwordResetHtml,
  passwordResetText,
  taskAssignedHtml,
  taskAssignedText,
  commentNotificationHtml,
  commentNotificationText,
  mentionHtml,
  mentionText,
  sprintReminderHtml,
  sprintReminderText,
  digestHtml,
  digestText,
  type InvitationTemplateData,
  type WelcomeTemplateData,
  type PasswordResetTemplateData,
  type TaskAssignedTemplateData,
  type CommentNotificationTemplateData,
  type MentionTemplateData,
  type SprintReminderTemplateData,
  type DigestTemplateData,
} from '../templates/email/index.js';

// Initialize Resend client
const resend = config.resend.apiKey ? new Resend(config.resend.apiKey) : null;

/**
 * Email result interface
 */
export interface EmailResult {
  success: boolean;
  resendId?: string;
  error?: string;
}

/**
 * Base send email parameters
 */
interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Sanitize tag value for Resend (only ASCII letters, numbers, underscores, or dashes)
 */
function sanitizeTagValue(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
}

/**
 * Send an email using Resend
 */
async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  if (!resend) {
    console.warn('Resend not configured. Email not sent.');
    return {
      success: false,
      error: 'Email service not configured. Please add RESEND_API_KEY to your environment.',
    };
  }

  const { to, subject, html, text, replyTo, tags } = params;

  try {
    // Sanitize tag values for Resend API
    const sanitizedTags = tags?.map(tag => ({
      name: sanitizeTagValue(tag.name),
      value: sanitizeTagValue(tag.value),
    }));

    const { data, error } = await resend.emails.send({
      from: `${config.resend.fromName} <${config.resend.fromEmail}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      replyTo: replyTo || config.resend.replyTo || undefined,
      tags: sanitizedTags,
    });

    if (error) {
      console.error('Resend API error:', error);
      return { success: false, error: error.message };
    }

    console.log(`Email sent successfully to ${Array.isArray(to) ? to.join(', ') : to}, resendId: ${data?.id}`);
    return { success: true, resendId: data?.id };
  } catch (err) {
    console.error('Email send error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

// ===================
// Invitation Email
// ===================

export interface SendInviteEmailParams {
  toEmail: string;
  inviterName: string;
  organizationName: string;
  inviteLink: string;
  role: 'member' | 'admin';
}

/**
 * Send an invitation email
 */
export async function sendInviteEmail(params: SendInviteEmailParams): Promise<EmailResult> {
  const { toEmail, inviterName, organizationName, inviteLink, role } = params;

  const templateData: InvitationTemplateData = {
    inviterName,
    organizationName,
    inviteLink,
    role,
    expiresIn: '7 days',
  };

  return sendEmail({
    to: toEmail,
    subject: `You've been invited to join ${organizationName} on Infinia`,
    html: invitationHtml(templateData),
    text: invitationText(templateData),
    tags: [
      { name: 'type', value: 'invitation' },
      { name: 'organization', value: organizationName },
    ],
  });
}

// ===================
// Welcome Email
// ===================

export interface SendWelcomeEmailParams {
  toEmail: string;
  userName: string;
  loginUrl: string;
}

/**
 * Send a welcome email to new users
 */
export async function sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<EmailResult> {
  const { toEmail, userName, loginUrl } = params;

  const templateData: WelcomeTemplateData = {
    userName,
    loginUrl,
  };

  return sendEmail({
    to: toEmail,
    subject: 'Welcome to Infinia!',
    html: welcomeHtml(templateData),
    text: welcomeText(templateData),
    tags: [{ name: 'type', value: 'welcome' }],
  });
}

// ===================
// Password Reset Email
// ===================

export interface SendPasswordResetEmailParams {
  toEmail: string;
  userName: string;
  resetLink: string;
  expiresIn?: string;
}

/**
 * Send a password reset email
 */
export async function sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<EmailResult> {
  const { toEmail, userName, resetLink, expiresIn = '1 hour' } = params;

  const templateData: PasswordResetTemplateData = {
    userName,
    resetLink,
    expiresIn,
  };

  return sendEmail({
    to: toEmail,
    subject: 'Reset your Infinia password',
    html: passwordResetHtml(templateData),
    text: passwordResetText(templateData),
    tags: [{ name: 'type', value: 'password-reset' }],
  });
}

// ===================
// Task Assigned Email
// ===================

export interface SendTaskAssignedEmailParams {
  toEmail: string;
  assigneeName: string;
  assignerName: string;
  taskTitle: string;
  taskKey: string;
  taskType: string;
  projectName: string;
  priority?: string;
  dueDate?: string;
  taskUrl: string;
}

/**
 * Send a task assignment notification email
 */
export async function sendTaskAssignedEmail(params: SendTaskAssignedEmailParams): Promise<EmailResult> {
  const { toEmail, ...templateData } = params;

  return sendEmail({
    to: toEmail,
    subject: `[${templateData.taskKey}] Task assigned to you: ${templateData.taskTitle}`,
    html: taskAssignedHtml(templateData),
    text: taskAssignedText(templateData),
    tags: [
      { name: 'type', value: 'task-assigned' },
      { name: 'task', value: templateData.taskKey },
    ],
  });
}

// ===================
// Comment Notification Email
// ===================

export interface SendCommentNotificationEmailParams {
  toEmail: string;
  recipientName: string;
  commenterName: string;
  commentPreview: string;
  taskTitle: string;
  taskKey: string;
  projectName: string;
  taskUrl: string;
  isReply?: boolean;
}

/**
 * Send a comment notification email
 */
export async function sendCommentNotificationEmail(params: SendCommentNotificationEmailParams): Promise<EmailResult> {
  const { toEmail, ...templateData } = params;
  const isReply = templateData.isReply ?? false;

  return sendEmail({
    to: toEmail,
    subject: isReply
      ? `[${templateData.taskKey}] ${templateData.commenterName} replied to your comment`
      : `[${templateData.taskKey}] ${templateData.commenterName} commented on ${templateData.taskTitle}`,
    html: commentNotificationHtml(templateData),
    text: commentNotificationText(templateData),
    tags: [
      { name: 'type', value: isReply ? 'comment-reply' : 'comment' },
      { name: 'task', value: templateData.taskKey },
    ],
  });
}

// ===================
// Mention Email
// ===================

export interface SendMentionEmailParams {
  toEmail: string;
  recipientName: string;
  mentionerName: string;
  context: string;
  taskTitle: string;
  taskKey: string;
  projectName: string;
  taskUrl: string;
}

/**
 * Send a mention notification email
 */
export async function sendMentionEmail(params: SendMentionEmailParams): Promise<EmailResult> {
  const { toEmail, ...templateData } = params;

  return sendEmail({
    to: toEmail,
    subject: `[${templateData.taskKey}] ${templateData.mentionerName} mentioned you`,
    html: mentionHtml(templateData),
    text: mentionText(templateData),
    tags: [
      { name: 'type', value: 'mention' },
      { name: 'task', value: templateData.taskKey },
    ],
  });
}

// ===================
// Sprint Reminder Email
// ===================

export interface SendSprintReminderEmailParams {
  toEmail: string;
  recipientName: string;
  sprintName: string;
  projectName: string;
  reminderType: 'starting' | 'ending';
  daysUntil: number;
  sprintGoal?: string;
  startDate: string;
  endDate: string;
  taskCount?: number;
  completedCount?: number;
  sprintUrl: string;
}

/**
 * Send a sprint reminder email
 */
export async function sendSprintReminderEmail(params: SendSprintReminderEmailParams): Promise<EmailResult> {
  const { toEmail, ...templateData } = params;

  const timeText = templateData.daysUntil === 0
    ? 'today'
    : templateData.daysUntil === 1
      ? 'tomorrow'
      : `in ${templateData.daysUntil} days`;

  return sendEmail({
    to: toEmail,
    subject: `Sprint "${templateData.sprintName}" ${templateData.reminderType === 'starting' ? 'starts' : 'ends'} ${timeText}`,
    html: sprintReminderHtml(templateData),
    text: sprintReminderText(templateData),
    tags: [
      { name: 'type', value: 'sprint-reminder' },
      { name: 'sprint', value: templateData.sprintName },
    ],
  });
}

// ===================
// Digest Email
// ===================

export interface SendDigestEmailParams {
  toEmail: string;
  recipientName: string;
  frequency: 'daily' | 'weekly';
  periodStart: string;
  periodEnd: string;
  tasks: Array<{
    taskKey: string;
    taskTitle: string;
    projectName: string;
    type: 'assigned' | 'comment' | 'mention' | 'status_change' | 'due_soon';
    actorName?: string;
    newStatus?: string;
    dueDate?: string;
  }>;
  totalAssigned: number;
  totalComments: number;
  totalMentions: number;
  dashboardUrl: string;
}

/**
 * Send a digest email
 */
export async function sendDigestEmail(params: SendDigestEmailParams): Promise<EmailResult> {
  const { toEmail, ...templateData } = params;

  return sendEmail({
    to: toEmail,
    subject: `Your ${templateData.frequency} Infinia digest`,
    html: digestHtml(templateData),
    text: digestText(templateData),
    tags: [
      { name: 'type', value: `${templateData.frequency}-digest` },
    ],
  });
}

// ===================
// Utility Functions
// ===================

/**
 * Check if email service is configured
 */
export function isEmailServiceConfigured(): boolean {
  return !!resend;
}

/**
 * Get the configured from email address
 */
export function getFromEmail(): string {
  return `${config.resend.fromName} <${config.resend.fromEmail}>`;
}

// Export as a unified service object
export const emailService = {
  sendInviteEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendTaskAssignedEmail,
  sendCommentNotificationEmail,
  sendMentionEmail,
  sendSprintReminderEmail,
  sendDigestEmail,
  isEmailServiceConfigured,
  getFromEmail,
};
