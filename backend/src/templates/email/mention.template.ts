/**
 * Mention notification email template
 * Sent when a user is @mentioned in a comment
 */

import { baseTemplate, primaryButton, linkFallback } from './base.template.js';

export interface MentionTemplateData {
  recipientName: string;
  mentionerName: string;
  context: string;
  taskTitle: string;
  taskKey: string;
  projectName: string;
  taskUrl: string;
}

export function mentionHtml(data: MentionTemplateData): string {
  const {
    recipientName,
    mentionerName,
    context,
    taskTitle,
    taskKey,
    projectName,
    taskUrl,
  } = data;

  const content = `
    <tr>
      <td style="background-color: #ffffff; padding: 48px 40px;" class="content-cell">
        <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #172B4D; line-height: 1.3;">
          You were mentioned
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #5E6C84; line-height: 1.6;">
          Hi <strong style="color: #172B4D;">${recipientName}</strong>, <strong style="color: #172B4D;">${mentionerName}</strong> mentioned you in a comment.
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

        <!-- Mention Box -->
        <table role="presentation" style="width: 100%; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <tr>
            <td style="padding: 20px 24px;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #172B4D;">
                      ${mentionerName} wrote:
                    </p>
                    <p style="margin: 0; font-size: 15px; color: #5E6C84; line-height: 1.6;">
                      ${context}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${primaryButton('View Mention', taskUrl)}

        ${linkFallback(taskUrl)}
      </td>
    </tr>
  `;

  return baseTemplate(content, {
    preheader: `${mentionerName} mentioned you in ${taskKey}`,
  });
}

export function mentionText(data: MentionTemplateData): string {
  const {
    recipientName,
    mentionerName,
    context,
    taskTitle,
    taskKey,
    projectName,
    taskUrl,
  } = data;

  return `
You were mentioned

Hi ${recipientName}, ${mentionerName} mentioned you in a comment.

Project: ${projectName}
Task: ${taskKey} - ${taskTitle}

${mentionerName} wrote:
"${context}"

View the mention:
${taskUrl}

---
This email was sent by Infinia Product Suite.
`.trim();
}
