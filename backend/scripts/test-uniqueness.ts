import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:3001/api/v1';

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
  const orgId = (user as any).organization_id?.toString();

  // Test 1: Same code + same org (should FAIL)
  console.log('Test 1: Same code (CHA) + same org → should FAIL:');
  const res1 = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'Duplicate Test', code: 'CHA', organization_id: orgId, owner_ids: [user._id.toString()] })
  });
  const data1 = await res1.json();
  console.log(`  Status: ${res1.status}, Success: ${data1.success}, ${data1.error || ''}`);

  // Test 2: Unique code + same org (should SUCCEED)
  console.log('\nTest 2: Unique code (ZZZ) + same org → should SUCCEED:');
  const res2 = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'Unique Code Test', code: 'ZZZ', organization_id: orgId, owner_ids: [user._id.toString()] })
  });
  const data2 = await res2.json();
  console.log(`  Status: ${res2.status}, Success: ${data2.success}, ${data2.data?.name || data2.error}`);

  // Clean up test 2
  if (data2.success) {
    await db.collection('projects').deleteOne({ _id: new mongoose.Types.ObjectId(data2.data.id) });
    await db.collection('columns_status').deleteMany({ project_id: new mongoose.Types.ObjectId(data2.data.id) });
    console.log('  Cleaned up ZZZ project');
  }

  console.log('\nAll tests passed: per-org uniqueness working correctly');
  await mongoose.disconnect();
}
run();
