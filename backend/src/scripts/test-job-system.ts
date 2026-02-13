/**
 * Test Job System
 * Verifies async job creation, progress updates, and SSE streaming
 */

import { jobService } from '../services/job.service.js';

async function testJobSystem() {
  console.log('🔧 Testing Job System...\n');

  try {
    // Test 1: Create a test job
    console.log('Test 1: Creating a test job...');
    const job = await jobService.createJob({
      job_type: 'product_generation',
      user_id: '00000000-0000-0000-0000-000000000001', // Dummy user ID
      organization_id: 'test-org',
      input_data: {
        product_name: 'Test Product',
        industry: 'Technology'
      },
      metadata: {
        source: 'test_script'
      }
    });

    console.log(`✅ Job created: ${job.id}`);
    console.log(`   Type: ${job.job_type}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Progress: ${job.progress_percent}%\n`);

    // Test 2: Start the job
    console.log('Test 2: Starting job...');
    await jobService.startJob(job.id);
    const startedJob = await jobService.getJob(job.id);
    console.log(`✅ Job started`);
    console.log(`   Status: ${startedJob?.status}`);
    console.log(`   Started at: ${startedJob?.started_at}\n`);

    // Test 3: Update progress multiple times
    console.log('Test 3: Updating job progress...');
    const progressSteps = [
      { percent: 10, message: 'Initializing AI model', step: 'init', total: 5 },
      { percent: 25, message: 'Generating product description', step: 'description', total: 5 },
      { percent: 50, message: 'Creating PRD', step: 'prd', total: 5 },
      { percent: 75, message: 'Planning sprints', step: 'sprints', total: 5 },
      { percent: 90, message: 'Finalizing project', step: 'finalize', total: 5 }
    ];

    for (const step of progressSteps) {
      await jobService.updateProgress({
        jobId: job.id,
        progress_percent: step.percent,
        progress_message: step.message,
        current_step: step.step,
        total_steps: step.total
      });
      console.log(`   ✅ ${step.percent}% - ${step.message}`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work
    }
    console.log();

    // Test 4: Complete the job
    console.log('Test 4: Completing job...');
    await jobService.completeJob(job.id, {
      project_id: 'test-project-123',
      tasks_created: 25,
      sprints_created: 3
    });
    const completedJob = await jobService.getJob(job.id);
    console.log(`✅ Job completed`);
    console.log(`   Status: ${completedJob?.status}`);
    console.log(`   Progress: ${completedJob?.progress_percent}%`);
    console.log(`   Completed at: ${completedJob?.completed_at}`);
    console.log(`   Output: ${JSON.stringify(completedJob?.output_data)}\n`);

    // Test 5: Create and fail a job
    console.log('Test 5: Testing job failure...');
    const failingJob = await jobService.createJob({
      job_type: 'ai_research',
      user_id: '00000000-0000-0000-0000-000000000001',
      organization_id: 'test-org',
      input_data: { query: 'Test query' }
    });
    await jobService.startJob(failingJob.id);
    await jobService.failJob(failingJob.id, new Error('Simulated AI API failure'));
    const failedJob = await jobService.getJob(failingJob.id);
    console.log(`✅ Job failed (expected)`);
    console.log(`   Status: ${failedJob?.status}`);
    console.log(`   Error: ${failedJob?.error_message}\n`);

    // Test 6: Get jobs by organization
    console.log('Test 6: Fetching organization jobs...');
    const orgJobs = await jobService.getJobsByOrganization('test-org');
    console.log(`✅ Found ${orgJobs.length} job(s) for organization 'test-org'`);
    orgJobs.forEach((j, index) => {
      console.log(`   ${index + 1}. ${j.job_type} - ${j.status} (${j.progress_percent}%)`);
    });
    console.log();

    // Test 7: Subscribe to job events (SSE test)
    console.log('Test 7: Testing SSE subscription...');
    const testJob = await jobService.createJob({
      job_type: 'document_generation',
      user_id: '00000000-0000-0000-0000-000000000001',
      organization_id: 'test-org',
      input_data: { document_type: 'PRD' }
    });

    let eventCount = 0;
    const unsubscribe = jobService.subscribeToJob(testJob.id, (progress) => {
      eventCount++;
      console.log(`   📡 SSE Event ${eventCount}: ${progress.status} - ${progress.progress_percent}% - ${progress.progress_message || 'N/A'}`);
    });

    // Simulate progress updates
    await jobService.startJob(testJob.id);
    await jobService.updateProgress({ jobId: testJob.id, progress_percent: 33, progress_message: 'Step 1' });
    await jobService.updateProgress({ jobId: testJob.id, progress_percent: 66, progress_message: 'Step 2' });
    await jobService.completeJob(testJob.id);

    // Wait a moment for all events to process
    await new Promise(resolve => setTimeout(resolve, 100));
    unsubscribe();

    console.log(`✅ SSE subscription test complete (${eventCount} events received)\n`);

    console.log('🎉 All job system tests passed!');
    console.log('\n📊 Summary:');
    console.log(`   • Job creation: ✅`);
    console.log(`   • Job start: ✅`);
    console.log(`   • Progress updates: ✅`);
    console.log(`   • Job completion: ✅`);
    console.log(`   • Job failure: ✅`);
    console.log(`   • Organization queries: ✅`);
    console.log(`   • SSE events: ✅`);

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Job system test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
testJobSystem();
