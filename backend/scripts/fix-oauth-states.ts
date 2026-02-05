/**
 * Fix OAuth States Collection
 *
 * This script:
 * 1. Drops the problematic id_1 index from oauthstates collection
 * 2. Removes any documents with id: null
 * 3. Cleans up expired OAuth states
 */

import mongoose from 'mongoose';
import { connectDB } from '../src/lib/mongodb.js';

async function fixOAuthStates() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('oauthstates');

    // 1. Check existing indexes
    console.log('\nChecking existing indexes...');
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));

    // 2. Drop the id_1 index if it exists
    const hasIdIndex = indexes.some(idx => idx.name === 'id_1');
    if (hasIdIndex) {
      console.log('\nDropping id_1 index...');
      await collection.dropIndex('id_1');
      console.log('✅ Dropped id_1 index');
    } else {
      console.log('\nℹ️  No id_1 index found');
    }

    // 3. Remove documents with id: null
    console.log('\nRemoving documents with id: null...');
    const deleteResult = await collection.deleteMany({ id: null });
    console.log(`✅ Removed ${deleteResult.deletedCount} documents with id: null`);

    // 4. Clean up expired OAuth states
    console.log('\nCleaning up expired OAuth states...');
    const now = new Date();
    const expiredResult = await collection.deleteMany({
      expires_at: { $lt: now }
    });
    console.log(`✅ Removed ${expiredResult.deletedCount} expired OAuth states`);

    // 5. Show remaining documents
    const count = await collection.countDocuments();
    console.log(`\nℹ️  Remaining OAuth states: ${count}`);

    console.log('\n✅ OAuth states collection fixed successfully!');
  } catch (error) {
    console.error('Error fixing OAuth states:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the fix
fixOAuthStates()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
