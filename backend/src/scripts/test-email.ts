/**
 * Test script to verify email service is working
 * Run with: npx tsx src/scripts/test-email.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { Resend } from 'resend';

async function testEmail() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@iamsaif.ai';
  const fromName = process.env.RESEND_FROM_NAME || 'Infinia';

  console.log('=== Resend Email Test ===');
  console.log(`API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`From: ${fromName} <${fromEmail}>`);

  if (!apiKey) {
    console.error('❌ RESEND_API_KEY is not set');
    process.exit(1);
  }

  const resend = new Resend(apiKey);

  // Test by sending to a test email (Resend allows sending to any email in test mode)
  // In production with a verified domain, this will actually send
  const testEmail = 'gagan.gogi996@gmail.com'; // Using the Gmail from .env

  console.log(`\nSending test email to: ${testEmail}`);

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [testEmail],
      subject: '✅ Infinia Email Service Test',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #3B82F6;">Email Service Working!</h1>
          <p>If you're reading this, your Resend email integration is working correctly.</p>
          <p style="color: #6B7280; font-size: 14px;">
            Sent at: ${new Date().toISOString()}<br>
            From: ${fromName} &lt;${fromEmail}&gt;
          </p>
          <hr style="border: 1px solid #E5E7EB; margin: 20px 0;">
          <p style="color: #9CA3AF; font-size: 12px;">This is a test email from Infinia.</p>
        </div>
      `,
      text: `Email Service Working!\n\nIf you're reading this, your Resend email integration is working correctly.\n\nSent at: ${new Date().toISOString()}\nFrom: ${fromName} <${fromEmail}>`,
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      process.exit(1);
    }

    console.log('✅ Email sent successfully!');
    console.log(`   Resend ID: ${data?.id}`);
    console.log(`\nCheck ${testEmail} for the test email.`);

  } catch (err) {
    console.error('❌ Failed to send email:', err);
    process.exit(1);
  }
}

testEmail();
