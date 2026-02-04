/**
 * Base email template with Infinia branding
 * Provides consistent styling across all email types
 */

export interface BaseTemplateOptions {
  preheader?: string;
}

/**
 * Get the email header with Infinia branding
 */
function getHeader(): string {
  return `
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
  `;
}

/**
 * Get the email footer
 */
function getFooter(): string {
  return `
    <tr>
      <td style="background-color: #F4F5F7; padding: 24px 40px; border-radius: 0 0 16px 16px; border-top: 1px solid #E2E8F0;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #5E6C84; text-align: center;">
          This email was sent by Infinia Product Suite
        </p>
        <p style="margin: 0; font-size: 12px; color: #94A3B8; text-align: center;">
          If you didn't expect this email, you can safely ignore it.
        </p>
      </td>
    </tr>
  `;
}

/**
 * Wrap content in the base email template
 */
export function baseTemplate(content: string, options: BaseTemplateOptions = {}): string {
  const { preheader = '' } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Infinia</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding: 20px 10px !important;
      }
      .content-cell {
        padding: 32px 24px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f5f7; -webkit-font-smoothing: antialiased;">
  ${preheader ? `<span style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${preheader}</span>` : ''}

  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;" class="email-container">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          ${getHeader()}
          ${content}
          ${getFooter()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Common button component
 */
export function primaryButton(text: string, href: string): string {
  return `
    <table role="presentation" style="width: 100%; margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="${href}"
             style="display: inline-block; background: linear-gradient(135deg, #0052CC 0%, #0065FF 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 48px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 82, 204, 0.3);">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Info/warning box component
 */
export function infoBox(content: string, type: 'info' | 'warning' | 'success' = 'info'): string {
  const colors = {
    info: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
    warning: { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' },
    success: { bg: '#D1FAE5', border: '#6EE7B7', text: '#065F46' },
  };
  const { bg, border, text } = colors[type];

  return `
    <table role="presentation" style="width: 100%; background-color: ${bg}; border: 1px solid ${border}; border-radius: 8px; margin: 16px 0;">
      <tr>
        <td style="padding: 16px 20px;">
          <p style="margin: 0; font-size: 14px; color: ${text};">
            ${content}
          </p>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Badge/tag component
 */
export function badge(text: string, color: string = '#3B82F6'): string {
  return `
    <span style="display: inline-block; background-color: ${color}15; border: 1px solid ${color}30; border-radius: 6px; padding: 8px 16px; font-size: 13px; font-weight: 600; color: ${color};">
      ${text}
    </span>
  `;
}

/**
 * Link fallback text
 */
export function linkFallback(url: string): string {
  return `
    <p style="margin: 16px 0 0 0; font-size: 13px; color: #5E6C84; line-height: 1.6;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="margin: 8px 0 0 0; font-size: 13px; color: #0052CC; word-break: break-all;">
      <a href="${url}" style="color: #0052CC;">${url}</a>
    </p>
  `;
}
