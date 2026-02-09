import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/lib/mongodb.js';
import { Task } from '../src/models/index.js';

async function cleanup() {
  await connectDB();
  const result = await Task.deleteMany({ title: { $regex: /^Test.*from Script$/ } });
  console.log('Cleaned up', result.deletedCount, 'test tasks');
  await disconnectDB();
}
cleanup();
