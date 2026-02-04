/**
 * Task assigned email template
 * Sent when a user is assigned to a task
 */

import { baseTemplate, primaryButton, badge, linkFallback } from './base.template.js';

export interface TaskAssignedTemplateData {
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

export function taskAssignedHtml(data: TaskAssignedTemplateData): string {
  const {
    assigneeName,
    assignerName,
    taskTitle,
    taskKey,
    taskType,
    projectName,
    priority,
    dueDate,
    taskUrl,
  } = data;

  const typeColors: Record<string, string> = {
    epic: '#8B5CF6',
    feature: '#EC4899',
    bug: '#EF4444',
    story: '#10B981',
    task: '#3B82F6',
  };
  const typeColor = typeColors[taskType.toLowerCase()] || '#3B82F6';

  const priorityColors: Record<string, string> = {
    highest: '#EF4444',
    high: '#F97316',
    medium: '#F59E0B',
    low: '#3B82F6',
    lowest: '#6B7280',
  };
  const priorityColor = priority ? priorityColors[priority.toLowerCase()] || '#6B7280' : null;

  const content = `
    <tr>
      <td style="background-color: #ffffff; padding: 48px 40px;" class="content-cell">
        <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #172B4D; line-height: 1.3;">
          Task assigned to you
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #5E6C84; line-height: 1.6;">
          Hi <strong style="color: #172B4D;">${assigneeName}</strong>, <strong style="color: #172B4D;">${assignerName}</strong> has assigned you a task.
        </p>

        <!-- Task Card -->
        <table role="presentation" style="width: 100%; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 24px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #5E6C84; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${projectName}
                    </p>
                    <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #172B4D;">
                      <span style="color: #5E6C84;">${taskKey}</span> ${taskTitle}
                    </h3>
                    <table role="presentation">
                      <tr>
                        <td style="padding-right: 8px;">
                          ${badge(taskType, typeColor)}
                        </td>
                        ${priority ? `<td style="padding-right: 8px;">${badge(priority, priorityColor!)}</td>` : ''}
                        ${dueDate ? `<td><span style="font-size: 13px; color: #5E6C84;">Due: ${dueDate}</span></td>` : ''}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${primaryButton('View Task', taskUrl)}

        ${linkFallback(taskUrl)}
      </td>
    </tr>
  `;

  return baseTemplate(content, {
    preheader: `${assignerName} assigned you: ${taskKey} ${taskTitle}`,
  });
}

export function taskAssignedText(data: TaskAssignedTemplateData): string {
  const {
    assigneeName,
    assignerName,
    taskTitle,
    taskKey,
    taskType,
    projectName,
    priority,
    dueDate,
    taskUrl,
  } = data;

  return `
Task assigned to you

Hi ${assigneeName}, ${assignerName} has assigned you a task.

Project: ${projectName}
Task: ${taskKey} - ${taskTitle}
Type: ${taskType}
${priority ? `Priority: ${priority}` : ''}
${dueDate ? `Due: ${dueDate}` : ''}

View the task:
${taskUrl}

---
This email was sent by Infinia Product Suite.
`.trim();
}
