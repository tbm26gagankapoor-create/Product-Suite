/**
 * Comment notification email template
 * Sent when someone comments on a task
 */

import { baseTemplate, primaryButton, linkFallback } from './base.template.js';

export interface CommentNotificationTemplateData {
  recipientName: string;
  commenterName: string;
  commenterAvatar?: string;
  commentPreview: string;
  taskTitle: string;
  taskKey: string;
  projectName: string;
  taskUrl: string;
  isReply?: boolean;
}

export function commentNotificationHtml(data: CommentNotificationTemplateData): string {
  const {
    recipientName,
    commenterName,
    commentPreview,
    taskTitle,
    taskKey,
    projectName,
    taskUrl,
    isReply = false,
  } = data;

  const title = isReply ? 'New reply on your comment' : 'New comment on a task';
  const preheaderText = isReply
    ? `${commenterName} replied to your comment on ${taskKey}`
    : `${commenterName} commented on ${taskKey}`;

  const content = `
    <tr>
      <td style="background-color: #ffffff; padding: 48px 40px;" class="content-cell">
        <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #172B4D; line-height: 1.3;">
          ${title}
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #5E6C84; line-height: 1.6;">
          Hi <strong style="color: #172B4D;">${recipientName}</strong>, <strong style="color: #172B4D;">${commenterName}</strong> ${isReply ? 'replied to your comment' : 'left a comment'} on a task you're involved with.
        </p>

        <!-- Task Reference -->
        <table role="presentation" style="width: 100%; margin-bottom: 16px;">
          <tr>
            <td>
              <p style="margin: 0; font-size: 12px; color: #5E6C84; text-transform: uppercase; letter-spacing: 0.5px;">
                ${projectName}
              </p>
              <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 600; color: #172B4D;">
                <span style="color: #5E6C84;">${taskKey}</span> ${taskTitle}
              </p>
            </td>
          </tr>
        </table>

        <!-- Comment Box -->
        <table role="presentation" style="width: 100%; background-color: #F8FAFC; border-left: 4px solid #0052CC; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px 24px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #172B4D;">
                      ${commenterName}
                    </p>
                    <p style="margin: 0; font-size: 15px; color: #5E6C84; line-height: 1.6;">
                      ${commentPreview}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${primaryButton('View Comment', taskUrl)}

        ${linkFallback(taskUrl)}
      </td>
    </tr>
  `;

  return baseTemplate(content, { preheader: preheaderText });
}

export function commentNotificationText(data: CommentNotificationTemplateData): string {
  const {
    recipientName,
    commenterName,
    commentPreview,
    taskTitle,
    taskKey,
    projectName,
    taskUrl,
    isReply = false,
  } = data;

  const title = isReply ? 'New reply on your comment' : 'New comment on a task';

  return `
${title}

Hi ${recipientName}, ${commenterName} ${isReply ? 'replied to your comment' : 'left a comment'} on a task you're involved with.

Project: ${projectName}
Task: ${taskKey} - ${taskTitle}

${commenterName} wrote:
"${commentPreview}"

View the comment:
${taskUrl}

---
This email was sent by Infinia Product Suite.
`.trim();
}
