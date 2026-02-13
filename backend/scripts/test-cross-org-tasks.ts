import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:3001/api/v1';

async function apiCall(method: string, path: string, token: string, body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No MONGODB_URI');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No db');

  const user = await db.collection('users').findOne({ email: /gagan/i });
  if (!user) throw new Error('No user');

  const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars';
  const token = jwt.sign({ id: user._id.toString(), email: (user as any).email }, secret, { expiresIn: '1h' });
  const realOrgId = (user as any).organization_id?.toString();
  const fakeOrgId = new mongoose.Types.ObjectId().toString();
  const userId = user._id.toString();

  const createdIds: string[] = [];

  try {
    // ============================================
    // STEP 1: Create two projects with SAME code in DIFFERENT orgs
    // ============================================
    console.log('=== STEP 1: Create 2 projects with same code "XYZ" in different orgs ===');

    const proj1Res = await apiCall('POST', '/projects', token, {
      name: 'Org1 Project', code: 'XYZ', organization_id: realOrgId, owner_ids: [userId],
    });
    if (!proj1Res.data.success) throw new Error(`Project 1 failed: ${JSON.stringify(proj1Res.data)}`);
    const proj1 = proj1Res.data.data;
    createdIds.push(proj1.id);
    console.log(`  Project 1: id=${proj1.id}, code=${proj1.code}, org=${realOrgId}`);

    const proj2Res = await apiCall('POST', '/projects', token, {
      name: 'Org2 Project', code: 'XYZ', organization_id: fakeOrgId, owner_ids: [userId],
    });
    if (!proj2Res.data.success) throw new Error(`Project 2 failed: ${JSON.stringify(proj2Res.data)}`);
    const proj2 = proj2Res.data.data;
    createdIds.push(proj2.id);
    console.log(`  Project 2: id=${proj2.id}, code=${proj2.code}, org=${fakeOrgId}`);
    console.log(`  PASS: Both projects created with code "XYZ" in different orgs`);

    // ============================================
    // STEP 2: Create tasks under each project
    // ============================================
    console.log('\n=== STEP 2: Create tasks under each project ===');

    const epic1Res = await apiCall('POST', '/tasks', token, {
      project_id: proj1.id, title: 'Epic in Org1', type: 'epic', priority: 'MEDIUM',
      points: 0, assignee_id: userId, reporter_id: userId,
    });
    if (!epic1Res.data.success) throw new Error(`Epic1 failed: ${JSON.stringify(epic1Res.data)}`);
    const epic1 = epic1Res.data.data;
    console.log(`  Epic1: id=${epic1.id}, key=${epic1.task_key}, project=${epic1.project_id}`);

    const task1Res = await apiCall('POST', '/tasks', token, {
      project_id: proj1.id, title: 'Task in Org1', type: 'task', priority: 'MEDIUM',
      points: 3, assignee_id: userId, reporter_id: userId, parent_epic_id: epic1.id,
    });
    if (!task1Res.data.success) throw new Error(`Task1 failed: ${JSON.stringify(task1Res.data)}`);
    const task1 = task1Res.data.data;
    console.log(`  Task1: id=${task1.id}, key=${task1.task_key}, project=${task1.project_id}, parent=${task1.parent_epic_id}`);

    const epic2Res = await apiCall('POST', '/tasks', token, {
      project_id: proj2.id, title: 'Epic in Org2', type: 'epic', priority: 'MEDIUM',
      points: 0, assignee_id: userId, reporter_id: userId,
    });
    if (!epic2Res.data.success) throw new Error(`Epic2 failed: ${JSON.stringify(epic2Res.data)}`);
    const epic2 = epic2Res.data.data;
    console.log(`  Epic2: id=${epic2.id}, key=${epic2.task_key}, project=${epic2.project_id}`);

    const task2Res = await apiCall('POST', '/tasks', token, {
      project_id: proj2.id, title: 'Task in Org2', type: 'task', priority: 'MEDIUM',
      points: 5, assignee_id: userId, reporter_id: userId, parent_epic_id: epic2.id,
    });
    if (!task2Res.data.success) throw new Error(`Task2 failed: ${JSON.stringify(task2Res.data)}`);
    const task2 = task2Res.data.data;
    console.log(`  Task2: id=${task2.id}, key=${task2.task_key}, project=${task2.project_id}, parent=${task2.parent_epic_id}`);

    // ============================================
    // STEP 3: Verify mappings in database
    // ============================================
    console.log('\n=== STEP 3: Verify database mappings ===');

    const proj1Tasks = await db.collection('tasks').find({
      project_id: new mongoose.Types.ObjectId(proj1.id)
    }).toArray();
    const proj2Tasks = await db.collection('tasks').find({
      project_id: new mongoose.Types.ObjectId(proj2.id)
    }).toArray();

    console.log(`  Project 1 "${proj1.name}" (org: ${realOrgId}):`);
    console.log(`    Tasks: ${proj1Tasks.length} (expected: 2)`);
    for (const t of proj1Tasks) {
      const ta = t as any;
      console.log(`    - [${ta.type}] "${ta.title}" key:${ta.task_key} project_id:${ta.project_id} parent:${ta.parent_epic_id || 'none'}`);
    }

    console.log(`  Project 2 "${proj2.name}" (org: ${fakeOrgId}):`);
    console.log(`    Tasks: ${proj2Tasks.length} (expected: 2)`);
    for (const t of proj2Tasks) {
      const ta = t as any;
      console.log(`    - [${ta.type}] "${ta.title}" key:${ta.task_key} project_id:${ta.project_id} parent:${ta.parent_epic_id || 'none'}`);
    }

    // ============================================
    // STEP 4: Verify isolation
    // ============================================
    console.log('\n=== STEP 4: Verify isolation ===');

    let pass = true;

    // All proj1 tasks should have proj1.id as project_id
    for (const t of proj1Tasks) {
      if ((t as any).project_id.toString() !== proj1.id) {
        console.log(`  FAIL: Task "${(t as any).title}" has wrong project_id`);
        pass = false;
      }
    }

    // All proj2 tasks should have proj2.id as project_id
    for (const t of proj2Tasks) {
      if ((t as any).project_id.toString() !== proj2.id) {
        console.log(`  FAIL: Task "${(t as any).title}" has wrong project_id`);
        pass = false;
      }
    }

    // Task1's parent should be epic1 (not epic2)
    const dbTask1 = proj1Tasks.find((t: any) => t.type === 'task') as any;
    if (dbTask1 && dbTask1.parent_epic_id?.toString() !== epic1.id) {
      console.log(`  FAIL: Task1 parent_epic_id ${dbTask1.parent_epic_id} != epic1 ${epic1.id}`);
      pass = false;
    }

    // Task2's parent should be epic2 (not epic1)
    const dbTask2 = proj2Tasks.find((t: any) => t.type === 'task') as any;
    if (dbTask2 && dbTask2.parent_epic_id?.toString() !== epic2.id) {
      console.log(`  FAIL: Task2 parent_epic_id ${dbTask2.parent_epic_id} != epic2 ${epic2.id}`);
      pass = false;
    }

    // Both projects should have task keys starting with "XYZ-"
    const allKeys = [...proj1Tasks, ...proj2Tasks].map((t: any) => t.task_key);
    const allStartWithXYZ = allKeys.every(k => k.startsWith('XYZ-'));
    if (!allStartWithXYZ) {
      console.log(`  FAIL: Not all task keys start with XYZ-: ${allKeys}`);
      pass = false;
    }

    // Task keys should be independent per project (both start from XYZ-1)
    const proj1Keys = proj1Tasks.map((t: any) => t.task_key).sort();
    const proj2Keys = proj2Tasks.map((t: any) => t.task_key).sort();
    console.log(`  Project 1 keys: ${proj1Keys}`);
    console.log(`  Project 2 keys: ${proj2Keys}`);

    if (pass) {
      console.log('\n  ALL CHECKS PASSED: Tasks correctly mapped to projects across orgs');
    } else {
      console.log('\n  SOME CHECKS FAILED');
    }

  } finally {
    // ============================================
    // CLEANUP
    // ============================================
    console.log('\n=== Cleanup ===');
    for (const id of createdIds) {
      await db.collection('tasks').deleteMany({ project_id: new mongoose.Types.ObjectId(id) });
      await db.collection('columns_status').deleteMany({ project_id: new mongoose.Types.ObjectId(id) });
      await db.collection('projects').deleteOne({ _id: new mongoose.Types.ObjectId(id) });
    }
    console.log('  Cleaned up test data');
    await mongoose.disconnect();
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
