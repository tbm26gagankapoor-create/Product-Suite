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
  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No MONGODB_URI');
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  const user = await db.collection('users').findOne({ email: /gagan/i });
  if (!user) throw new Error('No user');

  const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars';
  const token = jwt.sign({ id: user._id.toString(), email: (user as any).email }, secret, { expiresIn: '1h' });
  const orgId = (user as any).organization_id?.toString();
  const userId = user._id.toString();

  // Create a project + task first
  const testCode = 'CMT';
  const projRes = await apiCall('POST', '/projects', token, {
    name: 'Comment Test Project', code: testCode, organization_id: orgId, owner_ids: [userId],
  });
  console.log(`Project: ${projRes.status} ${projRes.data.success}`);
  const projectId = projRes.data.data?.id;

  const taskRes = await apiCall('POST', '/tasks', token, {
    project_id: projectId, title: 'Comment Test Task', type: 'task', priority: 'MEDIUM',
    assignee_id: userId, reporter_id: userId,
  });
  console.log(`Task: ${taskRes.status} ${taskRes.data.success}`);
  const taskId = taskRes.data.data?.id;

  // Now test comment creation
  console.log('\nTesting POST /comments...');
  try {
    const res = await apiCall('POST', '/comments', token, {
      task_id: taskId,
      content: 'Test comment on task',
    });
    console.log(`Comment: status=${res.status}, success=${res.data.success}`);
    console.log('Response:', JSON.stringify(res.data, null, 2));
  } catch (err: any) {
    console.error('Fetch error:', err.message);
    if (err.cause) console.error('Cause:', err.cause.message);
  }

  // Check backend logs
  console.log('\nWaiting 2 seconds to check if backend crashed...');
  await new Promise(r => setTimeout(r, 2000));
  try {
    const health = await apiCall('GET', '/auth/me', token);
    console.log(`Backend still alive: ${health.data.success}`);
  } catch (err: any) {
    console.error('Backend crashed!', err.message);
  }

  // Cleanup
  if (projectId) {
    await db.collection('tasks').deleteMany({ project_id: new mongoose.Types.ObjectId(projectId) });
    await db.collection('comments').deleteMany({});
    await db.collection('columns_status').deleteMany({ project_id: new mongoose.Types.ObjectId(projectId) });
    await db.collection('projects').deleteOne({ _id: new mongoose.Types.ObjectId(projectId) });
    console.log('Cleaned up');
  }

  await mongoose.disconnect();
}
run().catch(err => { console.error('Script crashed:', err); mongoose.disconnect(); });
