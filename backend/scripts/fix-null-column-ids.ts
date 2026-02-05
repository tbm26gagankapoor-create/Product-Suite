/**
 * Migration script to fix column status index issue
 *
 * The columnstatuses collection had a unique index on 'id' field, but:
 * - The database layer uses MongoDB's _id as the canonical ID
 * - The 'id' field was stripped before insertion, causing null values
 * - Multiple null values violated the unique constraint
 *
 * This script drops the problematic index and removes the 'id' field.
 *
 * Run with: npx tsx scripts/fix-null-column-ids.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/infinia_dev';

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const collection = db.collection('columnstatuses');

  // Drop the problematic index if it exists
  try {
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(i => i.name).join(', '));

    const hasIdIndex = indexes.some(idx => idx.name === 'id_1');
    if (hasIdIndex) {
      console.log('Dropping id_1 index (causes duplicate key errors)...');
      await collection.dropIndex('id_1');
      console.log('Index dropped');
    } else {
      console.log('No id_1 index found - already clean');
    }
  } catch (err) {
    console.log('Note: Could not drop index:', err);
  }

  // Remove the 'id' field from all records (we use _id instead)
  const result = await collection.updateMany(
    { id: { $exists: true } },
    { $unset: { id: '' } }
  );
  console.log(`Cleaned 'id' field from ${result.modifiedCount} records`);

  await mongoose.disconnect();
  console.log('\nMigration complete!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
