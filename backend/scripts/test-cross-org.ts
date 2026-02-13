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
  const realOrgId = (user as any).organization_id?.toString();

  // Create a fake org ID (different from the user's real org)
  const fakeOrgId = new mongoose.Types.ObjectId().toString();

  // Test: Same code "CHA" but in a DIFFERENT org → should SUCCEED
  console.log('Test: Same code (CHA) + different org → should SUCCEED:');
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: 'Cross-Org Charity',
      code: 'CHA',
      organization_id: fakeOrgId,
      owner_ids: [user._id.toString()]
    })
  });
  const data = await res.json();
  console.log(`  Status: ${res.status}, Success: ${data.success}`);
  if (data.success) {
    console.log(`  Project: ${data.data.name}, Code: ${data.data.code}, ID: ${data.data.id}`);
  } else {
    console.log(`  Error: ${JSON.stringify(data.error)}`);
  }

  // Clean up
  if (data.success) {
    await db.collection('projects').deleteOne({ _id: new mongoose.Types.ObjectId(data.data.id) });
    await db.collection('columns_status').deleteMany({ project_id: new mongoose.Types.ObjectId(data.data.id) });
    console.log('  Cleaned up cross-org project');
  }

  // Verify original CHA still exists in real org
  const original = await db.collection('projects').findOne({ code: 'CHA', organization_id: new mongoose.Types.ObjectId(realOrgId) });
  console.log(`\nOriginal CHA in real org: ${original ? 'EXISTS' : 'MISSING'}`);

  console.log('\nCross-org test complete');
  await mongoose.disconnect();
}
run();
