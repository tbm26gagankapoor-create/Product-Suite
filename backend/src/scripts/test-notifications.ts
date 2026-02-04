/**
 * Test script for invite and notification emails
 * Run with: npx tsx src/scripts/test-notifications.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { emailService } from '../services/email.service.js';

const TEST_EMAIL = process.env.GMAIL_USER || 'gagan.gogi996@gmail.com';

async function testInviteEmail() {
  console.log('\n📧 Testing: Organization Invite Email');
  console.log('─'.repeat(50));

  const result = await emailService.sendInviteEmail({
    toEmail: TEST_EMAIL,
    inviterName: 'John Doe',
    organizationName: 'Acme Corp',
    inviteLink: 'http://localhost:5173/invite/accept/test-invite-token-123',
    role: 'member',
  });

  if (result.success) {
    console.log('✅ Invite email sent!');
    console.log(`   Resend ID: ${result.resendId}`);
  } else {
    console.log('❌ Failed:', result.error);
  }

  return result.success;
}

async function testWelcomeEmail() {
  console.log('\n📧 Testing: Welcome Email');
  console.log('─'.repeat(50));

  const result = await emailService.sendWelcomeEmail({
    toEmail: TEST_EMAIL,
    userName: 'Test User',
    loginUrl: 'http://localhost:5173/login',
  });

  if (result.success) {
    console.log('✅ Welcome email sent!');
    console.log(`   Resend ID: ${result.resendId}`);
  } else {
    console.log('❌ Failed:', result.error);
  }

  return result.success;
}

async function testTaskAssignedEmail() {
  console.log('\n📧 Testing: Task Assigned Email');
  console.log('─'.repeat(50));

  const result = await emailService.sendTaskAssignedEmail({
    toEmail: TEST_EMAIL,
    assigneeName: 'Test User',
    assignerName: 'John Doe',
    taskTitle: 'Implement user authentication',
    taskKey: 'PROJ-123',
    taskType: 'Story',
    projectName: 'Main Project',
    priority: 'High',
    dueDate: 'Feb 10, 2026',
    taskUrl: 'http://localhost:5173/tasks/PROJ-123',
  });

  if (result.success) {
    console.log('✅ Task assigned email sent!');
    console.log(`   Resend ID: ${result.resendId}`);
  } else {
    console.log('❌ Failed:', result.error);
  }

  return result.success;
}

async function testCommentNotificationEmail() {
  console.log('\n📧 Testing: Comment Notification Email');
  console.log('─'.repeat(50));

  const result = await emailService.sendCommentNotificationEmail({
    toEmail: TEST_EMAIL,
    recipientName: 'Test User',
    commenterName: 'Jane Smith',
    commentPreview: 'Great progress on this task! I think we should also consider adding error handling for edge cases...',
    taskTitle: 'Implement user authentication',
    taskKey: 'PROJ-123',
    projectName: 'Main Project',
    taskUrl: 'http://localhost:5173/tasks/PROJ-123',
    isReply: false,
  });

  if (result.success) {
    console.log('✅ Comment notification email sent!');
    console.log(`   Resend ID: ${result.resendId}`);
  } else {
    console.log('❌ Failed:', result.error);
  }

  return result.success;
}

async function testMentionEmail() {
  console.log('\n📧 Testing: @Mention Email');
  console.log('─'.repeat(50));

  const result = await emailService.sendMentionEmail({
    toEmail: TEST_EMAIL,
    recipientName: 'Test User',
    mentionerName: 'Jane Smith',
    context: '@TestUser can you review this PR when you get a chance? The implementation looks good but I want a second pair of eyes.',
    taskTitle: 'Implement user authentication',
    taskKey: 'PROJ-123',
    projectName: 'Main Project',
    taskUrl: 'http://localhost:5173/tasks/PROJ-123',
  });

  if (result.success) {
    console.log('✅ Mention email sent!');
    console.log(`   Resend ID: ${result.resendId}`);
  } else {
    console.log('❌ Failed:', result.error);
  }

  return result.success;
}

async function testSprintReminderEmail() {
  console.log('\n📧 Testing: Sprint Reminder Email');
  console.log('─'.repeat(50));

  const result = await emailService.sendSprintReminderEmail({
    toEmail: TEST_EMAIL,
    recipientName: 'Test User',
    sprintName: 'Sprint 5',
    projectName: 'Main Project',
    reminderType: 'ending',
    daysUntil: 2,
    sprintGoal: 'Complete user authentication and dashboard features',
    startDate: 'Jan 20, 2026',
    endDate: 'Feb 5, 2026',
    taskCount: 15,
    completedCount: 10,
    sprintUrl: 'http://localhost:5173/sprints/sprint-5',
  });

  if (result.success) {
    console.log('✅ Sprint reminder email sent!');
    console.log(`   Resend ID: ${result.resendId}`);
  } else {
    console.log('❌ Failed:', result.error);
  }

  return result.success;
}

async function runAllTests() {
  console.log('═'.repeat(50));
  console.log('  INFINIA EMAIL NOTIFICATION TESTS');
  console.log('═'.repeat(50));
  console.log(`\nSending all test emails to: ${TEST_EMAIL}`);
  console.log(`From: ${emailService.getFromEmail()}`);

  const results: Record<string, boolean> = {};

  results['Invite'] = await testInviteEmail();
  results['Welcome'] = await testWelcomeEmail();
  results['Task Assigned'] = await testTaskAssignedEmail();
  results['Comment'] = await testCommentNotificationEmail();
  results['Mention'] = await testMentionEmail();
  results['Sprint Reminder'] = await testSprintReminderEmail();

  console.log('\n' + '═'.repeat(50));
  console.log('  TEST RESULTS SUMMARY');
  console.log('═'.repeat(50));

  let passCount = 0;
  let failCount = 0;

  for (const [name, passed] of Object.entries(results)) {
    console.log(`  ${passed ? '✅' : '❌'} ${name}`);
    if (passed) passCount++;
    else failCount++;
  }

  console.log('─'.repeat(50));
  console.log(`  Total: ${passCount} passed, ${failCount} failed`);
  console.log('═'.repeat(50));

  if (failCount === 0) {
    console.log('\n🎉 All email tests passed! Check your inbox.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above.\n');
    process.exit(1);
  }
}

runAllTests();
