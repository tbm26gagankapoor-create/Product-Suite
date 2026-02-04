/**
 * Digest email template
 * Sent as daily/weekly summary of activity
 */

import { baseTemplate, primaryButton, linkFallback } from './base.template.js';

export interface DigestTask {
  taskKey: string;
  taskTitle: string;
  projectName: string;
  type: 'assigned' | 'comment' | 'mention' | 'status_change' | 'due_soon';
  actorName?: string;
  newStatus?: string;
  dueDate?: string;
}

export interface DigestTemplateData {
  recipientName: string;
  frequency: 'daily' | 'weekly';
  periodStart: string;
  periodEnd: string;
  tasks: DigestTask[];
  totalAssigned: number;
  totalComments: number;
  totalMentions: number;
  dashboardUrl: string;
}

function getTaskIcon(type: DigestTask['type']): string {
  const icons: Record<string, string> = {
    assigned: '📋',
    comment: '💬',
    mention: '@',
    status_change: '🔄',
    due_soon: '⏰',
  };
  return icons[type] || '📌';
}

function getTaskDescription(task: DigestTask): string {
  switch (task.type) {
    case 'assigned':
      return `Assigned to you${task.actorName ? ` by ${task.actorName}` : ''}`;
    case 'comment':
      return `New comment${task.actorName ? ` from ${task.actorName}` : ''}`;
    case 'mention':
      return `You were mentioned${task.actorName ? ` by ${task.actorName}` : ''}`;
    case 'status_change':
      return `Status changed to ${task.newStatus || 'updated'}`;
    case 'due_soon':
      return `Due ${task.dueDate || 'soon'}`;
    default:
      return 'Activity';
  }
}

export function digestHtml(data: DigestTemplateData): string {
  const {
    recipientName,
    frequency,
    periodStart,
    periodEnd,
    tasks,
    totalAssigned,
    totalComments,
    totalMentions,
    dashboardUrl,
  } = data;

  const title = frequency === 'daily' ? 'Your Daily Digest' : 'Your Weekly Digest';
  const periodText = frequency === 'daily' ? periodStart : `${periodStart} - ${periodEnd}`;

  const statsHtml = `
    <table role="presentation" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td style="width: 33%; text-align: center; padding: 16px; background-color: #EFF6FF; border-radius: 8px;">
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #0052CC;">${totalAssigned}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #5E6C84; text-transform: uppercase;">Tasks Assigned</p>
        </td>
        <td style="width: 8px;"></td>
        <td style="width: 33%; text-align: center; padding: 16px; background-color: #F0FDF4; border-radius: 8px;">
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #10B981;">${totalComments}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #5E6C84; text-transform: uppercase;">Comments</p>
        </td>
        <td style="width: 8px;"></td>
        <td style="width: 33%; text-align: center; padding: 16px; background-color: #FEF3C7; border-radius: 8px;">
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #F59E0B;">${totalMentions}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #5E6C84; text-transform: uppercase;">Mentions</p>
        </td>
      </tr>
    </table>
  `;

  const tasksHtml = tasks.length > 0
    ? tasks.slice(0, 10).map(task => `
        <tr>
          <td style="padding: 16px 0; border-bottom: 1px solid #E2E8F0;">
            <table role="presentation" style="width: 100%;">
              <tr>
                <td style="width: 32px; vertical-align: top;">
                  <span style="font-size: 16px;">${getTaskIcon(task.type)}</span>
                </td>
                <td style="vertical-align: top;">
                  <p style="margin: 0; font-size: 12px; color: #5E6C84;">
                    ${task.projectName} / ${task.taskKey}
                  </p>
                  <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 500; color: #172B4D;">
                    ${task.taskTitle}
                  </p>
                  <p style="margin: 4px 0 0 0; font-size: 13px; color: #5E6C84;">
                    ${getTaskDescription(task)}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `).join('')
    : `
        <tr>
          <td style="padding: 32px; text-align: center;">
            <p style="margin: 0; font-size: 15px; color: #5E6C84;">
              No activity during this period. Great time to catch up on your backlog!
            </p>
          </td>
        </tr>
      `;

  const content = `
    <tr>
      <td style="background-color: #ffffff; padding: 48px 40px;" class="content-cell">
        <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #172B4D; line-height: 1.3;">
          ${title}
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #5E6C84; line-height: 1.6;">
          Hi <strong style="color: #172B4D;">${recipientName}</strong>, here's your activity summary for <strong style="color: #172B4D;">${periodText}</strong>.
        </p>

        ${statsHtml}

        <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #172B4D; text-transform: uppercase; letter-spacing: 0.5px;">
          Recent Activity
        </h3>

        <table role="presentation" style="width: 100%; margin-bottom: 24px;">
          ${tasksHtml}
        </table>

        ${tasks.length > 10 ? `
          <p style="margin: 0 0 24px 0; font-size: 14px; color: #5E6C84; text-align: center;">
            And ${tasks.length - 10} more items...
          </p>
        ` : ''}

        ${primaryButton('Go to Dashboard', dashboardUrl)}

        ${linkFallback(dashboardUrl)}
      </td>
    </tr>
  `;

  return baseTemplate(content, {
    preheader: `Your ${frequency} summary: ${totalAssigned} tasks, ${totalComments} comments, ${totalMentions} mentions`,
  });
}

export function digestText(data: DigestTemplateData): string {
  const {
    recipientName,
    frequency,
    periodStart,
    periodEnd,
    tasks,
    totalAssigned,
    totalComments,
    totalMentions,
    dashboardUrl,
  } = data;

  const title = frequency === 'daily' ? 'Your Daily Digest' : 'Your Weekly Digest';
  const periodText = frequency === 'daily' ? periodStart : `${periodStart} - ${periodEnd}`;

  const tasksList = tasks.length > 0
    ? tasks.slice(0, 10).map(task =>
        `- ${task.projectName} / ${task.taskKey}: ${task.taskTitle}\n  ${getTaskDescription(task)}`
      ).join('\n\n')
    : 'No activity during this period.';

  return `
${title}

Hi ${recipientName}, here's your activity summary for ${periodText}.

Summary:
- Tasks Assigned: ${totalAssigned}
- Comments: ${totalComments}
- Mentions: ${totalMentions}

Recent Activity:
${tasksList}
${tasks.length > 10 ? `\n...and ${tasks.length - 10} more items` : ''}

Go to dashboard:
${dashboardUrl}

---
This email was sent by Infinia Product Suite.
`.trim();
}
