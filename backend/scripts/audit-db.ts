import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;

  console.log('=== DATABASE AUDIT ===\n');

  // 1. USERS
  console.log('--- USERS ---');
  const users = await db.collection('users').find({}).toArray();
  console.log('Count:', users.length);
  users.forEach((u: any) => {
    const idType = typeof u._id === 'object' ? 'ObjectId' : typeof u._id;
    console.log(`  ${u.email} | _id: ${u._id} (${idType})`);
  });

  // 2. ORGANIZATIONS
  console.log('\n--- ORGANIZATIONS ---');
  const orgs = await db.collection('organizations').find({}).toArray();
  console.log('Count:', orgs.length);
  orgs.forEach((o: any) => {
    const idType = typeof o._id === 'object' ? 'ObjectId' : typeof o._id;
    console.log(`  ${o.name} | _id: ${o._id} (${idType})`);
  });

  // 3. ORGANIZATION MEMBERS
  console.log('\n--- ORGANIZATION MEMBERS ---');
  const orgMembers = await db.collection('organizationmembers').find({}).toArray();
  console.log('Count:', orgMembers.length);
  orgMembers.forEach((m: any) => {
    const userIdType = typeof m.user_id === 'object' ? 'ObjectId' : typeof m.user_id;
    const orgIdType = typeof m.organization_id === 'object' ? 'ObjectId' : typeof m.organization_id;
    console.log(`  user_id: ${m.user_id} (${userIdType}) | org_id: ${m.organization_id} (${orgIdType})`);
  });

  // 4. PROJECTS
  console.log('\n--- PROJECTS ---');
  const projects = await db.collection('projects').find({}).toArray();
  console.log('Count:', projects.length);
  projects.slice(0, 5).forEach((p: any) => {
    const idType = typeof p._id === 'object' ? 'ObjectId' : typeof p._id;
    const orgIdType = p.organization_id ? (typeof p.organization_id === 'object' ? 'ObjectId' : typeof p.organization_id) : 'null';
    const ownerIdType = p.owner_id ? (typeof p.owner_id === 'object' ? 'ObjectId' : typeof p.owner_id) : 'null';
    console.log(`  ${p.name} | _id: ${idType} | org_id: ${orgIdType} | owner_id: ${ownerIdType}`);
  });

  // 5. TASKS - Check ID formats
  console.log('\n--- TASKS ---');
  const tasks = await db.collection('tasks').find({}).toArray();
  console.log('Count:', tasks.length);

  // Analyze ID formats
  const assigneeFormats = { ObjectId: 0, string: 0, null: 0 };
  const reporterFormats = { ObjectId: 0, string: 0, null: 0 };
  const projectIdFormats = { ObjectId: 0, string: 0, null: 0 };

  tasks.forEach((t: any) => {
    if (!t.assignee_id) assigneeFormats.null++;
    else if (typeof t.assignee_id === 'object') assigneeFormats.ObjectId++;
    else assigneeFormats.string++;

    if (!t.reporter_id) reporterFormats.null++;
    else if (typeof t.reporter_id === 'object') reporterFormats.ObjectId++;
    else reporterFormats.string++;

    if (!t.project_id) projectIdFormats.null++;
    else if (typeof t.project_id === 'object') projectIdFormats.ObjectId++;
    else projectIdFormats.string++;
  });

  console.log('  assignee_id formats:', assigneeFormats);
  console.log('  reporter_id formats:', reporterFormats);
  console.log('  project_id formats:', projectIdFormats);

  // Show unique string IDs (likely orphaned)
  const stringAssignees = new Set<string>();
  const stringProjects = new Set<string>();
  tasks.forEach((t: any) => {
    if (t.assignee_id && typeof t.assignee_id === 'string') stringAssignees.add(t.assignee_id);
    if (t.project_id && typeof t.project_id === 'string') stringProjects.add(t.project_id);
  });

  if (stringAssignees.size > 0) {
    console.log('\n  String assignee_ids (orphaned UUIDs):');
    stringAssignees.forEach(id => console.log(`    - ${id}`));
  }

  if (stringProjects.size > 0) {
    console.log('\n  String project_ids (orphaned UUIDs):');
    stringProjects.forEach(id => console.log(`    - ${id}`));
  }

  // 6. SPRINTS
  console.log('\n--- SPRINTS ---');
  const sprints = await db.collection('sprints').find({}).toArray();
  console.log('Count:', sprints.length);
  if (sprints.length > 0) {
    const sprintProjectFormats = { ObjectId: 0, string: 0, null: 0 };
    sprints.forEach((s: any) => {
      if (!s.project_id) sprintProjectFormats.null++;
      else if (typeof s.project_id === 'object') sprintProjectFormats.ObjectId++;
      else sprintProjectFormats.string++;
    });
    console.log('  project_id formats:', sprintProjectFormats);
  }

  // 7. TEAMS
  console.log('\n--- TEAMS ---');
  const teams = await db.collection('teams').find({}).toArray();
  console.log('Count:', teams.length);
  if (teams.length > 0) {
    teams.slice(0, 3).forEach((t: any) => {
      const orgIdType = t.organization_id ? (typeof t.organization_id === 'object' ? 'ObjectId' : typeof t.organization_id) : 'null';
      console.log(`  ${t.name} | org_id: ${t.organization_id} (${orgIdType})`);
    });
  }

  // 8. TEAM MEMBERS
  console.log('\n--- TEAM MEMBERS ---');
  const teamMembers = await db.collection('teammembers').find({}).toArray();
  console.log('Count:', teamMembers.length);
  if (teamMembers.length > 0) {
    teamMembers.slice(0, 5).forEach((m: any) => {
      const userIdType = typeof m.user_id === 'object' ? 'ObjectId' : typeof m.user_id;
      const teamIdType = typeof m.team_id === 'object' ? 'ObjectId' : typeof m.team_id;
      console.log(`  user_id: ${m.user_id} (${userIdType}) | team_id: ${m.team_id} (${teamIdType})`);
    });
  }

  // 9. PROJECT MEMBERS
  console.log('\n--- PROJECT MEMBERS ---');
  const projectMembers = await db.collection('project_members').find({}).toArray();
  console.log('Count:', projectMembers.length);
  if (projectMembers.length > 0) {
    projectMembers.slice(0, 5).forEach((m: any) => {
      const userIdType = typeof m.user_id === 'object' ? 'ObjectId' : typeof m.user_id;
      const projectIdType = typeof m.project_id === 'object' ? 'ObjectId' : typeof m.project_id;
      console.log(`  user_id: ${m.user_id} (${userIdType}) | project_id: ${m.project_id} (${projectIdType})`);
    });
  }

  // 10. COMMENTS
  console.log('\n--- COMMENTS ---');
  const comments = await db.collection('comments').find({}).toArray();
  console.log('Count:', comments.length);
  if (comments.length > 0) {
    comments.slice(0, 3).forEach((c: any) => {
      const authorIdType = typeof c.author_id === 'object' ? 'ObjectId' : typeof c.author_id;
      const taskIdType = typeof c.task_id === 'object' ? 'ObjectId' : typeof c.task_id;
      console.log(`  author_id: ${c.author_id} (${authorIdType}) | task_id: ${c.task_id} (${taskIdType})`);
    });
  }

  await mongoose.disconnect();
  console.log('\n=== AUDIT COMPLETE ===');
}

audit().catch(console.error);
