import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/lib/mongodb.js';
import { User, Project, Task } from '../src/models/index.js';
import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:3001/api/v1';

async function getAuthToken(): Promise<string> {
  await connectDB();
  const user = await User.findOne({ email: { $regex: /gagan/i } }).lean();
  if (!user) throw new Error('User not found');

  const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars';
  const token = jwt.sign(
    { id: (user as any)._id.toString(), email: (user as any).email },
    secret,
    { expiresIn: '1h' }
  );
  console.log('Got auth token for user:', (user as any).email);
  return token;
}

async function apiCall(method: string, path: string, token: string, body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runTest() {
  const token = await getAuthToken();

  // Get user's org
  const meRes = await apiCall('GET', '/auth/me', token);
  const orgId = meRes.data?.data?.organizationId || meRes.data?.data?.organization_id;
  const userId = meRes.data?.data?.id;
  console.log('User ID:', userId, 'Org ID:', orgId);

  // ============================================
  // STEP 1: Create Project
  // ============================================
  console.log('\n=== STEP 1: Create Project ===');
  const projectRes = await apiCall('POST', '/projects', token, {
    name: 'Test Charity Project',
    code: 'CHA',
    description: 'A test charity platform',
    owner_ids: [userId],
    organization_id: orgId,
    vision: 'Test vision content for charity project',
    prd: '# Test PRD\n\nThis is the PRD content.',
    docs: {
      prd: '# Test PRD\n\nThis is the PRD content.',
      roadmap: '# Roadmap\n\nQ1 goals here.',
      architecture: '# Architecture\n\nSystem design here.',
    },
    status: 'Planning',
  });

  if (!projectRes.data.success) {
    console.error('FAILED to create project:', projectRes.status, projectRes.data);
    await cleanup(null);
    return;
  }

  const project = projectRes.data.data;
  console.log('Project created:', project.id, project.name, 'Code:', project.code);
  console.log('Docs saved:', project.docs ? Object.keys(project.docs) : 'NONE');
  console.log('Vision saved:', project.vision ? 'YES (' + project.vision.length + ' chars)' : 'NO');
  console.log('PRD saved:', project.prd ? 'YES (' + project.prd.length + ' chars)' : 'NO');

  // ============================================
  // STEP 2: Create Epics
  // ============================================
  console.log('\n=== STEP 2: Create Epics ===');

  const epic1Res = await apiCall('POST', '/tasks', token, {
    project_id: project.id,
    title: 'Donation Management System',
    description: 'Build the core donation processing pipeline',
    type: 'epic',
    priority: 'MEDIUM',
    points: 0,
    assignee_id: userId,
    reporter_id: userId,
    start_date: new Date().toISOString(),
  });

  if (!epic1Res.data.success) {
    console.error('FAILED to create epic 1:', epic1Res.status, JSON.stringify(epic1Res.data));
    await cleanup(project.id);
    return;
  }

  const epic1 = epic1Res.data.data;
  console.log('Epic 1 created:', epic1.id, epic1.title);
  console.log('  column_id:', epic1.column_id);

  const epic2Res = await apiCall('POST', '/tasks', token, {
    project_id: project.id,
    title: 'User Dashboard & Analytics',
    description: 'Create donor-facing dashboard with analytics',
    type: 'epic',
    priority: 'MEDIUM',
    points: 0,
    assignee_id: userId,
    reporter_id: userId,
    column_id: 'todo',
    start_date: new Date().toISOString(),
  });

  if (!epic2Res.data.success) {
    console.error('FAILED to create epic 2:', epic2Res.status, JSON.stringify(epic2Res.data));
    await cleanup(project.id);
    return;
  }

  const epic2 = epic2Res.data.data;
  console.log('Epic 2 created:', epic2.id, epic2.title);
  console.log('  column_id:', epic2.column_id);

  // ============================================
  // STEP 3: Create Tasks under Epics
  // ============================================
  console.log('\n=== STEP 3: Create Tasks ===');

  const tasksToCreate = [
    { title: 'Design donation form UI', type: 'story', points: 3, parent_epic_id: epic1.id, due_date: '2026-03-01' },
    { title: 'Implement payment gateway integration', type: 'task', points: 5, parent_epic_id: epic1.id, due_date: '2026-03-15' },
    { title: 'Fix donation receipt email template', type: 'bug', points: 2, parent_epic_id: epic1.id },
    { title: 'Build donor dashboard layout', type: 'feature', points: 8, parent_epic_id: epic2.id, due_date: '2026-04-01' },
    { title: 'Add donation history chart', type: 'task', points: 3, parent_epic_id: epic2.id, column_id: 'todo' },
  ];

  let createdTasks = 0;
  for (const t of tasksToCreate) {
    const taskRes = await apiCall('POST', '/tasks', token, {
      project_id: project.id,
      ...t,
      priority: 'MEDIUM',
      assignee_id: userId,
      reporter_id: userId,
      start_date: new Date().toISOString(),
    });

    if (taskRes.data.success) {
      const task = taskRes.data.data;
      console.log(`  Task created: ${task.id} "${task.title}" (${task.type}, ${task.points}pts, col: ${task.column_id})`);
      createdTasks++;
    } else {
      console.error(`  FAILED "${t.title}":`, taskRes.status, JSON.stringify(taskRes.data));
    }
  }

  // ============================================
  // STEP 4: Verify in Database
  // ============================================
  console.log('\n=== STEP 4: Verify Database ===');

  const dbProject = await Project.findById(project.id).lean();
  if (dbProject) {
    console.log('Project in DB:', (dbProject as any).name);
    console.log('  status:', (dbProject as any).status);
    console.log('  org_id:', (dbProject as any).organization_id);
    console.log('  docs keys:', (dbProject as any).docs ? Object.keys((dbProject as any).docs) : 'NONE');
    console.log('  vision:', (dbProject as any).vision ? 'YES' : 'NO');
    console.log('  prd:', (dbProject as any).prd ? 'YES' : 'NO');
  }

  const dbTasks = await Task.find({
    project_id: new mongoose.Types.ObjectId(project.id)
  }).lean();
  console.log(`\nTasks in DB: ${dbTasks.length} (expected: ${2 + tasksToCreate.length})`);

  const epics = dbTasks.filter((t: any) => t.type === 'epic');
  const tasks = dbTasks.filter((t: any) => t.type !== 'epic');
  console.log(`  Epics: ${epics.length} (expected: 2)`);
  console.log(`  Tasks: ${tasks.length} (expected: ${tasksToCreate.length})`);

  for (const t of dbTasks) {
    const td = t as any;
    console.log(`  - [${td.type}] "${td.title}" col:${td.column_id} parent:${td.parent_epic_id || 'none'}`);
  }

  // ============================================
  // STEP 5: Cleanup
  // ============================================
  await cleanup(project.id);
}

async function cleanup(projectId: string | null) {
  console.log('\n=== Cleanup ===');
  if (projectId) {
    await Task.deleteMany({ project_id: new mongoose.Types.ObjectId(projectId) });
    await Project.findByIdAndDelete(projectId);
    // Also clean up columns
    const { models: m } = await import('../src/models/index.js');
    if (m.columns_status) {
      await m.columns_status.deleteMany({ project_id: new mongoose.Types.ObjectId(projectId) });
    }
    console.log('Test data cleaned up');
  }
  await disconnectDB();
}

runTest().catch(err => {
  console.error('Test failed:', err);
  disconnectDB();
  process.exit(1);
});
