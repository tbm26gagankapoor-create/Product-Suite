import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

// Initialize Gmail SMTP transporter
const transporter = config.gmail.user && config.gmail.appPassword
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.gmail.user,
        pass: config.gmail.appPassword,
      },
    })
  : null;

interface SendInviteEmailParams {
  toEmail: string;
  inviterName: string;
  organizationName: string;
  inviteLink: string;
  role: 'member' | 'admin';
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Generate the HTML template for invitation emails
 */
function getInviteEmailTemplate(params: SendInviteEmailParams): string {
  const { inviterName, organizationName, inviteLink, role } = params;

  const roleColor = role === 'admin' ? '#8B5CF6' : '#3B82F6';
  const roleLabel = role === 'admin' ? 'Admin' : 'Member';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to ${organizationName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f5f7;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #172B4D 0%, #0052CC 100%); padding: 32px 40px; border-radius: 16px 16px 0 0;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                      INFINIA
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1px;">
                      Product Suite
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 48px 40px;">
              <!-- Invitation Message -->
              <h2 style="margin: 0 0 8px 0; font-size: 28px; font-weight: 700; color: #172B4D; line-height: 1.3;">
                You're invited!
              </h2>
              <p style="margin: 0 0 32px 0; font-size: 16px; color: #5E6C84; line-height: 1.6;">
                <strong style="color: #172B4D;">${inviterName}</strong> has invited you to join
                <strong style="color: #172B4D;">${organizationName}</strong> on Infinia.
              </p>

              <!-- Role Badge -->
              <table role="presentation" style="margin-bottom: 32px;">
                <tr>
                  <td style="background-color: ${roleColor}15; border: 1px solid ${roleColor}30; border-radius: 8px; padding: 12px 20px;">
                    <span style="font-size: 13px; font-weight: 600; color: ${roleColor};">
                      You'll join as: ${roleLabel}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin-bottom: 32px;">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}"
                       style="display: inline-block; background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 48px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 82, 204, 0.3);">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiration Notice -->
              <table role="presentation" style="width: 100%; background-color: #FEF3C7; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; font-size: 14px; color: #92400E;">
                      <strong>Note:</strong> This invitation will expire in 7 days.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Link fallback -->
              <p style="margin: 0; font-size: 13px; color: #5E6C84; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #0052CC; word-break: break-all;">
                <a href="${inviteLink}" style="color: #0052CC;">${inviteLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F4F5F7; padding: 24px 40px; border-radius: 0 0 16px 16px; border-top: 1px solid #E2E8F0;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #5E6C84; text-align: center;">
                This email was sent by Infinia Product Suite
              </p>
              <p style="margin: 0; font-size: 12px; color: #94A3B8; text-align: center;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Generate plain text version of the email
 */
function getInviteEmailText(params: SendInviteEmailParams): string {
  const { inviterName, organizationName, inviteLink, role } = params;
  const roleLabel = role === 'admin' ? 'Admin' : 'Member';

  return `
You're invited to join ${organizationName} on Infinia!

${inviterName} has invited you to join ${organizationName}.

You'll join as: ${roleLabel}

Accept your invitation by clicking the link below:
${inviteLink}

Note: This invitation will expire in 7 days.

---
This email was sent by Infinia Product Suite.
If you didn't expect this invitation, you can safely ignore this email.
`.trim();
}

/**
 * Send an invitation email using Gmail SMTP
 */
export async function sendInviteEmail(params: SendInviteEmailParams): Promise<EmailResult> {
  if (!transporter) {
    console.warn('Gmail SMTP not configured. Email not sent.');
    return {
      success: false,
      error: 'Email service not configured. Please add GMAIL_USER and GMAIL_APP_PASSWORD to your environment.',
    };
  }

  const { toEmail, organizationName } = params;

  try {
    const info = await transporter.sendMail({
      from: `"Infinia" <${config.gmail.user}>`,
      to: toEmail,
      subject: `You've been invited to join ${organizationName} on Infinia`,
      html: getInviteEmailTemplate(params),
      text: getInviteEmailText(params),
    });

    console.log(`Invite email sent successfully to ${toEmail}, messageId: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err) {
    console.error('Error sending invite email:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check if email service is configured
 */
export function isEmailServiceConfigured(): boolean {
  return !!transporter;
}

export const emailService = {
  sendInviteEmail,
  isEmailServiceConfigured,
};
