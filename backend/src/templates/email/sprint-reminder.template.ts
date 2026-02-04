/**
 * Sprint reminder email template
 * Sent for sprint start/end reminders
 */

import { baseTemplate, primaryButton, badge, linkFallback } from './base.template.js';

export interface SprintReminderTemplateData {
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

export function sprintReminderHtml(data: SprintReminderTemplateData): string {
  const {
    recipientName,
    sprintName,
    projectName,
    reminderType,
    daysUntil,
    sprintGoal,
    startDate,
    endDate,
    taskCount = 0,
    completedCount = 0,
    sprintUrl,
  } = data;

  const isStarting = reminderType === 'starting';
  const title = isStarting ? 'Sprint starting soon' : 'Sprint ending soon';
  const timeText = daysUntil === 0
    ? 'today'
    : daysUntil === 1
      ? 'tomorrow'
      : `in ${daysUntil} days`;

  const progressPercent = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  const content = `
    <tr>
      <td style="background-color: #ffffff; padding: 48px 40px;" class="content-cell">
        <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #172B4D; line-height: 1.3;">
          ${title}
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #5E6C84; line-height: 1.6;">
          Hi <strong style="color: #172B4D;">${recipientName}</strong>, <strong style="color: #172B4D;">${sprintName}</strong> ${isStarting ? 'starts' : 'ends'} ${timeText}.
        </p>

        <!-- Sprint Card -->
        <table role="presentation" style="width: 100%; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 24px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #5E6C84; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${projectName}
                    </p>
                    <h3 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #172B4D;">
                      ${sprintName}
                    </h3>

                    <!-- Dates -->
                    <table role="presentation" style="width: 100%; margin-bottom: 16px;">
                      <tr>
                        <td style="width: 50%;">
                          <p style="margin: 0; font-size: 12px; color: #5E6C84;">Start Date</p>
                          <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 500; color: #172B4D;">${startDate}</p>
                        </td>
                        <td style="width: 50%;">
                          <p style="margin: 0; font-size: 12px; color: #5E6C84;">End Date</p>
                          <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 500; color: #172B4D;">${endDate}</p>
                        </td>
                      </tr>
                    </table>

                    ${sprintGoal ? `
                    <table role="presentation" style="width: 100%; margin-bottom: 16px;">
                      <tr>
                        <td>
                          <p style="margin: 0; font-size: 12px; color: #5E6C84;">Sprint Goal</p>
                          <p style="margin: 4px 0 0 0; font-size: 14px; color: #172B4D; line-height: 1.5;">${sprintGoal}</p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    ${!isStarting && taskCount > 0 ? `
                    <!-- Progress Bar -->
                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 8px 0; font-size: 12px; color: #5E6C84;">Progress</p>
                          <table role="presentation" style="width: 100%; height: 8px; background-color: #E2E8F0; border-radius: 4px;">
                            <tr>
                              <td style="width: ${progressPercent}%; background-color: #10B981; border-radius: 4px;"></td>
                              <td></td>
                            </tr>
                          </table>
                          <p style="margin: 8px 0 0 0; font-size: 13px; color: #5E6C84;">
                            ${completedCount} of ${taskCount} tasks completed (${progressPercent}%)
                          </p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${primaryButton('View Sprint', sprintUrl)}

        ${linkFallback(sprintUrl)}
      </td>
    </tr>
  `;

  return baseTemplate(content, {
    preheader: `${sprintName} ${isStarting ? 'starts' : 'ends'} ${timeText}`,
  });
}

export function sprintReminderText(data: SprintReminderTemplateData): string {
  const {
    recipientName,
    sprintName,
    projectName,
    reminderType,
    daysUntil,
    sprintGoal,
    startDate,
    endDate,
    taskCount = 0,
    completedCount = 0,
    sprintUrl,
  } = data;

  const isStarting = reminderType === 'starting';
  const title = isStarting ? 'Sprint starting soon' : 'Sprint ending soon';
  const timeText = daysUntil === 0
    ? 'today'
    : daysUntil === 1
      ? 'tomorrow'
      : `in ${daysUntil} days`;

  const progressPercent = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  return `
${title}

Hi ${recipientName}, ${sprintName} ${isStarting ? 'starts' : 'ends'} ${timeText}.

Project: ${projectName}
Sprint: ${sprintName}
Start Date: ${startDate}
End Date: ${endDate}
${sprintGoal ? `Sprint Goal: ${sprintGoal}` : ''}
${!isStarting && taskCount > 0 ? `Progress: ${completedCount}/${taskCount} tasks (${progressPercent}%)` : ''}

View the sprint:
${sprintUrl}

---
This email was sent by Infinia Product Suite.
`.trim();
}
