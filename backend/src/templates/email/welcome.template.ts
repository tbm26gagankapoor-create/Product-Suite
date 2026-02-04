/**
 * Welcome email template
 * Sent when a new user registers
 */

import { baseTemplate, primaryButton, linkFallback } from './base.template.js';

export interface WelcomeTemplateData {
  userName: string;
  loginUrl: string;
}

export function welcomeHtml(data: WelcomeTemplateData): string {
  const { userName, loginUrl } = data;

  const content = `
    <tr>
      <td style="background-color: #ffffff; padding: 48px 40px;" class="content-cell">
        <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #172B4D; line-height: 1.3;">
          Welcome to Infinia!
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #5E6C84; line-height: 1.6;">
          Hi <strong style="color: #172B4D;">${userName}</strong>, thanks for joining Infinia Product Suite.
        </p>

        <p style="margin: 0 0 32px 0; font-size: 16px; color: #5E6C84; line-height: 1.6;">
          With Infinia, you can:
        </p>

        <table role="presentation" style="width: 100%; margin-bottom: 32px;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0;">
              <table role="presentation">
                <tr>
                  <td style="width: 40px; vertical-align: top;">
                    <span style="display: inline-block; width: 24px; height: 24px; background-color: #0052CC; border-radius: 50%; text-align: center; line-height: 24px; color: white; font-size: 12px; font-weight: bold;">1</span>
                  </td>
                  <td style="vertical-align: top;">
                    <p style="margin: 0; font-size: 15px; color: #172B4D; font-weight: 500;">Manage your projects</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #5E6C84;">Track progress with Kanban boards, lists, and timeline views</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #E2E8F0;">
              <table role="presentation">
                <tr>
                  <td style="width: 40px; vertical-align: top;">
                    <span style="display: inline-block; width: 24px; height: 24px; background-color: #0052CC; border-radius: 50%; text-align: center; line-height: 24px; color: white; font-size: 12px; font-weight: bold;">2</span>
                  </td>
                  <td style="vertical-align: top;">
                    <p style="margin: 0; font-size: 15px; color: #172B4D; font-weight: 500;">Plan sprints</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #5E6C84;">Organize work into time-boxed iterations</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0;">
              <table role="presentation">
                <tr>
                  <td style="width: 40px; vertical-align: top;">
                    <span style="display: inline-block; width: 24px; height: 24px; background-color: #0052CC; border-radius: 50%; text-align: center; line-height: 24px; color: white; font-size: 12px; font-weight: bold;">3</span>
                  </td>
                  <td style="vertical-align: top;">
                    <p style="margin: 0; font-size: 15px; color: #172B4D; font-weight: 500;">Collaborate with your team</p>
                    <p style="margin: 4px 0 0 0; font-size: 14px; color: #5E6C84;">Comments, mentions, and real-time updates</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${primaryButton('Get Started', loginUrl)}

        ${linkFallback(loginUrl)}
      </td>
    </tr>
  `;

  return baseTemplate(content, {
    preheader: `Welcome to Infinia, ${userName}! Let's get you started.`,
  });
}

export function welcomeText(data: WelcomeTemplateData): string {
  const { userName, loginUrl } = data;

  return `
Welcome to Infinia!

Hi ${userName}, thanks for joining Infinia Product Suite.

With Infinia, you can:
1. Manage your projects - Track progress with Kanban boards, lists, and timeline views
2. Plan sprints - Organize work into time-boxed iterations
3. Collaborate with your team - Comments, mentions, and real-time updates

Get started here:
${loginUrl}

---
This email was sent by Infinia Product Suite.
`.trim();
}
