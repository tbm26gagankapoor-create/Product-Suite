import { connectDB, disconnectDB } from '../src/lib/mongodb.js';
import mongoose from 'mongoose';

// Define all collections and their foreign key fields that should be ObjectIds
// NOTE: Some fields are intentionally EXCLUDED because they use semantic strings, not ObjectIds:
//   - task.column_id: Uses status slugs like "todo", "in-progress", "done"
//   - task.parent_epic_id: Uses task_key like "DIG-1", "PRJ-42" to reference parent epics
const COLLECTION_FIELD_MAP: Record<string, string[]> = {
  users: ['organization_id'],
  organizations: ['owner_id'],
  organization_members: ['organization_id', 'user_id'],
  organization_invites: ['organization_id'],
  organization_join_requests: ['organization_id', 'user_id'],
  projects: ['owner_id', 'organization_id'],
  project_members: ['project_id', 'user_id'],
  // column_id and parent_epic_id use semantic strings, not ObjectIds
  tasks: ['project_id', 'sprint_id', 'assignee_id', 'reporter_id'],
  sprints: ['project_id'],
  columns_status: ['project_id'],
  tags: ['project_id'],
  teams: ['organization_id'],
  team_members: ['team_id', 'user_id'],
  team_projects: ['team_id', 'project_id'],
  comments: ['task_id', 'user_id'],
  document_comments: ['project_id', 'user_id'],
  attachments: ['task_id', 'user_id'],
  activity_log: ['project_id', 'task_id', 'user_id'],
  subtasks: ['task_id'],
  task_tags: ['task_id'],
  task_links: ['blocking_task_id', 'blocked_task_id'],
  user_preferences: ['user_id'],
  task_type_configs: ['organization_id'],
  priority_configs: ['organization_id'],
  status_configs: ['organization_id'],
  role_configs: ['organization_id'],
  nav_items: ['organization_id'],
  theme_colors: ['organization_id'],
  user_notification_preferences: ['user_id'],
  notifications: ['user_id'],
  email_logs: ['to_user_id'],
  github_integrations: ['project_id'],
  github_sync_logs: ['project_id', 'integration_id'],
};

interface MigrationStats {
  collection: string;
  field: string;
  stringIds: number;
  converted: number;
  failed: number;
  invalid: string[];
}

async function migrateIdsToObjectId() {
  try {
    await connectDB();
    const db = mongoose.connection.db!;

    console.log('='.repeat(60));
    console.log('  ID TYPE MIGRATION: STRING → ObjectId');
    console.log('='.repeat(60));
    console.log();

    const stats: MigrationStats[] = [];
    let totalConverted = 0;
    let totalFailed = 0;

    // Phase 1: Audit current state
    console.log('📊 PHASE 1: AUDITING CURRENT STATE\n');

    for (const [collectionName, fields] of Object.entries(COLLECTION_FIELD_MAP)) {
      // Check if collection exists
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) {
        console.log(`   ⚪ ${collectionName}: Collection does not exist, skipping`);
        continue;
      }

      const total = await db.collection(collectionName).countDocuments();

      for (const field of fields) {
        // Count documents with string IDs in this field
        const stringIdCount = await db.collection(collectionName).countDocuments({
          [field]: { $type: 'string', $ne: null }
        });

        // Count documents with ObjectId in this field
        const objectIdCount = await db.collection(collectionName).countDocuments({
          [field]: { $type: 'objectId' }
        });

        if (stringIdCount > 0) {
          console.log(`   🔴 ${collectionName}.${field}: ${stringIdCount} STRING, ${objectIdCount} ObjectId (of ${total} docs)`);
        } else if (objectIdCount > 0) {
          console.log(`   🟢 ${collectionName}.${field}: ${objectIdCount} ObjectId (OK)`);
        } else if (total > 0) {
          console.log(`   ⚪ ${collectionName}.${field}: No values set`);
        }
      }
    }

    console.log();
    console.log('='.repeat(60));
    console.log('🔄 PHASE 2: CONVERTING STRING IDs TO ObjectId\n');

    // Phase 2: Convert string IDs to ObjectIds
    for (const [collectionName, fields] of Object.entries(COLLECTION_FIELD_MAP)) {
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) continue;

      for (const field of fields) {
        const stat: MigrationStats = {
          collection: collectionName,
          field,
          stringIds: 0,
          converted: 0,
          failed: 0,
          invalid: []
        };

        // Find all documents with string IDs in this field
        const docsWithStringId = await db.collection(collectionName).find({
          [field]: { $type: 'string', $ne: null }
        }).toArray();

        stat.stringIds = docsWithStringId.length;

        if (docsWithStringId.length === 0) {
          continue; // No strings to convert
        }

        console.log(`   Converting ${collectionName}.${field}: ${docsWithStringId.length} documents...`);

        for (const doc of docsWithStringId) {
          const stringId = doc[field] as string;

          // Validate it's a valid ObjectId format (24 hex characters)
          if (mongoose.Types.ObjectId.isValid(stringId) && stringId.length === 24) {
            try {
              const objectId = new mongoose.Types.ObjectId(stringId);

              await db.collection(collectionName).updateOne(
                { _id: doc._id },
                { $set: { [field]: objectId } }
              );

              stat.converted++;
              totalConverted++;
            } catch (err: any) {
              console.error(`      ❌ Failed to convert ${collectionName}._id=${doc._id}: ${err.message}`);
              stat.failed++;
              totalFailed++;
            }
          } else {
            // Invalid ID format - log for manual cleanup
            stat.invalid.push(`_id=${doc._id}, ${field}="${stringId}"`);
            stat.failed++;
            totalFailed++;
          }
        }

        if (stat.converted > 0) {
          console.log(`      ✅ Converted: ${stat.converted}`);
        }
        if (stat.failed > 0) {
          console.log(`      ❌ Failed: ${stat.failed}`);
        }

        stats.push(stat);
      }
    }

    console.log();
    console.log('='.repeat(60));
    console.log('✅ PHASE 3: VERIFICATION\n');

    // Phase 3: Verify no string IDs remain
    let remainingIssues = 0;

    for (const [collectionName, fields] of Object.entries(COLLECTION_FIELD_MAP)) {
      const collections = await db.listCollections({ name: collectionName }).toArray();
      if (collections.length === 0) continue;

      for (const field of fields) {
        const remaining = await db.collection(collectionName).countDocuments({
          [field]: { $type: 'string', $ne: null }
        });

        if (remaining > 0) {
          console.log(`   ❌ ${collectionName}.${field}: ${remaining} STRING IDs still remain!`);
          remainingIssues += remaining;
        }
      }
    }

    if (remainingIssues === 0) {
      console.log('   ✅ All foreign key fields are now using ObjectId!\n');
    } else {
      console.log(`\n   ⚠️  ${remainingIssues} string IDs could not be converted (see invalid IDs above)\n`);
    }

    // Summary
    console.log('='.repeat(60));
    console.log('📋 MIGRATION SUMMARY\n');
    console.log(`   Total converted: ${totalConverted}`);
    console.log(`   Total failed: ${totalFailed}`);
    console.log(`   Remaining string IDs: ${remainingIssues}`);
    console.log();

    // Show invalid IDs that need manual attention
    const invalidIds = stats.filter(s => s.invalid.length > 0);
    if (invalidIds.length > 0) {
      console.log('⚠️  INVALID IDs REQUIRING MANUAL CLEANUP:\n');
      for (const stat of invalidIds) {
        console.log(`   ${stat.collection}.${stat.field}:`);
        for (const id of stat.invalid) {
          console.log(`      - ${id}`);
        }
      }
      console.log();
    }

    if (totalFailed === 0 && remainingIssues === 0) {
      console.log('🎉 Migration completed successfully!');
    } else {
      console.log('⚠️  Migration completed with issues. Please review the output above.');
    }

    await disconnectDB();
    process.exit(totalFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await disconnectDB();
    process.exit(1);
  }
}

migrateIdsToObjectId();
