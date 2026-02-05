import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const COLLECTIONS = [
  'users',
  'organizations',
  'organizationmembers',
  'projects',
  'project_members',
  'tasks',
  'sprints',
  'teams',
  'teammembers',
  'comments',
  'tags',
  'columns_status',
  'subtasks',
  'activity_log',
  'notifications',
  'organization_invites',
  'github_integrations',
];

async function removeLegacyIds() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;

  console.log('=== REMOVING LEGACY UUID ID FIELDS ===\n');

  for (const collectionName of COLLECTIONS) {
    try {
      const collection = db.collection(collectionName);

      // Check if collection exists and has documents with 'id' field
      const sampleDoc = await collection.findOne({ id: { $exists: true } });

      if (sampleDoc) {
        // Remove the 'id' field from all documents
        const result = await collection.updateMany(
          { id: { $exists: true } },
          { $unset: { id: '' } }
        );
        console.log(`${collectionName}: Removed 'id' field from ${result.modifiedCount} documents`);
      } else {
        console.log(`${collectionName}: No legacy 'id' fields found`);
      }
    } catch (e: any) {
      // Collection might not exist
      console.log(`${collectionName}: Skipped (${e.message})`);
    }
  }

  // Also drop any indexes on the 'id' field
  console.log('\n--- REMOVING ID FIELD INDEXES ---');
  for (const collectionName of COLLECTIONS) {
    try {
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();

      for (const index of indexes) {
        if (index.key && index.key.id !== undefined && index.name !== '_id_') {
          await collection.dropIndex(index.name!);
          console.log(`${collectionName}: Dropped index '${index.name}'`);
        }
      }
    } catch (e: any) {
      // Ignore errors
    }
  }

  await mongoose.disconnect();
  console.log('\n=== MIGRATION COMPLETE ===');
}

removeLegacyIds().catch(console.error);
