/**
 * Password reset email template
 * Sent when a user requests a password reset
 */

import { baseTemplate, primaryButton, infoBox, linkFallback } from './base.template.js';

export interface PasswordResetTemplateData {
  userName: string;
  resetLink: string;
  expiresIn?: string;
}

export function passwordResetHtml(data: PasswordResetTemplateData): string {
  const { userName, resetLink, expiresIn = '1 hour' } = data;

  const content = `
    <tr>
      <td style="background-color: #ffffff; padding: 48px 40px;" class="content-cell">
        <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #172B4D; line-height: 1.3;">
          Reset your password
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; color: #5E6C84; line-height: 1.6;">
          Hi <strong style="color: #172B4D;">${userName}</strong>, we received a request to reset your password for your Infinia account.
        </p>

        <p style="margin: 0 0 32px 0; font-size: 16px; color: #5E6C84; line-height: 1.6;">
          Click the button below to create a new password:
        </p>

        ${primaryButton('Reset Password', resetLink)}

        ${infoBox(`<strong>Note:</strong> This link will expire in ${expiresIn}. If you didn't request a password reset, you can safely ignore this email.`, 'warning')}

        ${linkFallback(resetLink)}

        <table role="presentation" style="width: 100%; margin-top: 32px; padding-top: 24px; border-top: 1px solid #E2E8F0;">
          <tr>
            <td>
              <p style="margin: 0; font-size: 14px; color: #5E6C84; line-height: 1.6;">
                <strong style="color: #172B4D;">Didn't request this?</strong><br>
                If you didn't request a password reset, someone may have entered your email address by mistake. No action is needed on your part.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  return baseTemplate(content, {
    preheader: `Reset your Infinia password`,
  });
}

export function passwordResetText(data: PasswordResetTemplateData): string {
  const { userName, resetLink, expiresIn = '1 hour' } = data;

  return `
Reset your password

Hi ${userName}, we received a request to reset your password for your Infinia account.

Click the link below to create a new password:
${resetLink}

Note: This link will expire in ${expiresIn}. If you didn't request a password reset, you can safely ignore this email.

Didn't request this?
If you didn't request a password reset, someone may have entered your email address by mistake. No action is needed on your part.

---
This email was sent by Infinia Product Suite.
`.trim();
}
