import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function fixDatabase() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;

  console.log('=== FIXING DATABASE ID INCONSISTENCIES ===\n');

  // Get valid ObjectIds for reference
  const users = await db.collection('users').find({}).toArray();
  const orgs = await db.collection('organizations').find({}).toArray();
  const validUserIds = new Set(users.map(u => u._id.toString()));
  const validOrgIds = new Set(orgs.map(o => o._id.toString()));

  console.log('Valid user IDs:', [...validUserIds]);
  console.log('Valid org IDs:', [...validOrgIds]);

  // Pick a default user and org for reassignment
  const defaultUserId = users[0]?._id;
  const defaultOrgId = orgs[0]?._id;

  if (!defaultUserId || !defaultOrgId) {
    console.log('ERROR: No valid users or orgs found!');
    process.exit(1);
  }

  console.log('\nDefault user for reassignment:', users[0].email, defaultUserId.toString());
  console.log('Default org for reassignment:', orgs[0].name, defaultOrgId.toString());

  // 1. FIX ORGANIZATION MEMBERS - Delete orphaned records
  console.log('\n--- FIXING ORGANIZATION MEMBERS ---');
  const orphanedOrgMembers = await db.collection('organizationmembers').deleteMany({
    $or: [
      { user_id: { $type: 'string' } },
      { organization_id: { $type: 'string' } }
    ]
  });
  console.log(`Deleted ${orphanedOrgMembers.deletedCount} orphaned organization members`);

  // 2. FIX PROJECTS - Update string IDs to valid ObjectIds
  console.log('\n--- FIXING PROJECTS ---');
  const projectsWithStringIds = await db.collection('projects').find({
    $or: [
      { organization_id: { $type: 'string' } },
      { owner_id: { $type: 'string' } }
    ]
  }).toArray();

  for (const project of projectsWithStringIds) {
    await db.collection('projects').updateOne(
      { _id: project._id },
      {
        $set: {
          organization_id: defaultOrgId,
          owner_id: defaultUserId
        }
      }
    );
    console.log(`Fixed project: ${project.name}`);
  }

  // Get the updated project ID for task reassignment
  const validProjects = await db.collection('projects').find({}).toArray();
  const validProjectIds = new Set(validProjects.map(p => p._id.toString()));
  const defaultProjectId = validProjects[0]?._id;

  console.log('\nValid project IDs:', [...validProjectIds]);

  // 3. FIX TASKS - Reassign to valid project/user or delete
  console.log('\n--- FIXING TASKS ---');

  // First, update all tasks with string project_id to use valid project
  const tasksWithStringProjectId = await db.collection('tasks').find({
    project_id: { $type: 'string' }
  }).toArray();

  console.log(`Found ${tasksWithStringProjectId.length} tasks with string project_id`);

  if (defaultProjectId) {
    for (const task of tasksWithStringProjectId) {
      await db.collection('tasks').updateOne(
        { _id: task._id },
        {
          $set: {
            project_id: defaultProjectId,
            assignee_id: defaultUserId,
            reporter_id: defaultUserId
          }
        }
      );
    }
    console.log(`Updated ${tasksWithStringProjectId.length} tasks to valid project/user IDs`);
  }

  // Also fix any remaining tasks with string assignee_id or reporter_id
  const tasksWithStringUserIds = await db.collection('tasks').find({
    $or: [
      { assignee_id: { $type: 'string' } },
      { reporter_id: { $type: 'string' } }
    ]
  }).toArray();

  for (const task of tasksWithStringUserIds) {
    await db.collection('tasks').updateOne(
      { _id: task._id },
      {
        $set: {
          assignee_id: defaultUserId,
          reporter_id: defaultUserId
        }
      }
    );
  }
  console.log(`Fixed ${tasksWithStringUserIds.length} additional tasks with string user IDs`);

  // 4. FIX SPRINTS - Update to valid project
  console.log('\n--- FIXING SPRINTS ---');
  const sprintsWithStringIds = await db.collection('sprints').find({
    project_id: { $type: 'string' }
  }).toArray();

  if (defaultProjectId) {
    for (const sprint of sprintsWithStringIds) {
      await db.collection('sprints').updateOne(
        { _id: sprint._id },
        { $set: { project_id: defaultProjectId } }
      );
    }
    console.log(`Updated ${sprintsWithStringIds.length} sprints to valid project ID`);
  }

  // 5. FIX TEAMS - Delete orphaned teams with string org_id
  console.log('\n--- FIXING TEAMS ---');
  const orphanedTeams = await db.collection('teams').deleteMany({
    organization_id: { $type: 'string' }
  });
  console.log(`Deleted ${orphanedTeams.deletedCount} orphaned teams`);

  // 6. FIX TEAM MEMBERS - Delete orphaned records
  console.log('\n--- FIXING TEAM MEMBERS ---');
  const orphanedTeamMembers = await db.collection('teammembers').deleteMany({
    $or: [
      { user_id: { $type: 'string' } },
      { team_id: { $type: 'string' } }
    ]
  });
  console.log(`Deleted ${orphanedTeamMembers.deletedCount} orphaned team members`);

  // 7. Ensure all users are members of the default org
  console.log('\n--- ENSURING USER ORG MEMBERSHIPS ---');
  for (const user of users) {
    const existingMembership = await db.collection('organizationmembers').findOne({
      user_id: user._id,
      organization_id: defaultOrgId
    });

    if (!existingMembership) {
      await db.collection('organizationmembers').insertOne({
        user_id: user._id,
        organization_id: defaultOrgId,
        role: 'member',
        joined_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log(`Added ${user.email} to ${orgs[0].name}`);
    }
  }

  await mongoose.disconnect();
  console.log('\n=== DATABASE FIX COMPLETE ===');
}

fixDatabase().catch(console.error);
