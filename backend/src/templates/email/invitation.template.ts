/**
 * Invitation email template
 * Sent when a user is invited to join an organization
 */

import { baseTemplate, primaryButton, infoBox, linkFallback, badge } from './base.template.js';

export interface InvitationTemplateData {
  inviterName: string;
  organizationName: string;
  inviteLink: string;
  role: 'member' | 'admin';
  expiresIn?: string;
}

export function invitationHtml(data: InvitationTemplateData): string {
  const { inviterName, organizationName, inviteLink, role, expiresIn = '7 days' } = data;
  const roleColor = role === 'admin' ? '#8B5CF6' : '#3B82F6';
  const roleLabel = role === 'admin' ? 'Admin' : 'Member';

  const content = `
    <tr>
      <td style="background-color: #ffffff; padding: 48px 40px;" class="content-cell">
        <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #172B4D; line-height: 1.3;">
          You're invited!
        </h2>
        <p style="margin: 0 0 32px 0; font-size: 16px; color: #5E6C84; line-height: 1.6;">
          <strong style="color: #172B4D;">${inviterName}</strong> has invited you to join
          <strong style="color: #172B4D;">${organizationName}</strong> on Infinia.
        </p>

        <table role="presentation" style="margin-bottom: 24px;">
          <tr>
            <td>
              ${badge(`You'll join as: ${roleLabel}`, roleColor)}
            </td>
          </tr>
        </table>

        ${primaryButton('Accept Invitation', inviteLink)}

        ${infoBox(`<strong>Note:</strong> This invitation will expire in ${expiresIn}.`, 'warning')}

        ${linkFallback(inviteLink)}
      </td>
    </tr>
  `;

  return baseTemplate(content, {
    preheader: `${inviterName} invited you to join ${organizationName} on Infinia`,
  });
}

export function invitationText(data: InvitationTemplateData): string {
  const { inviterName, organizationName, inviteLink, role, expiresIn = '7 days' } = data;
  const roleLabel = role === 'admin' ? 'Admin' : 'Member';

  return `
You're invited to join ${organizationName} on Infinia!

${inviterName} has invited you to join ${organizationName}.

You'll join as: ${roleLabel}

Accept your invitation by clicking the link below:
${inviteLink}

Note: This invitation will expire in ${expiresIn}.

---
This email was sent by Infinia Product Suite.
If you didn't expect this invitation, you can safely ignore this email.
`.trim();
}
