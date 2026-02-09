import { connectDB, disconnectDB } from '../src/lib/mongodb.js';
import { database } from '../src/lib/database.js';

async function debugAPI() {
  try {
    await connectDB();
    console.log('Testing projects API with debug info...\n');

    const userId = '6983027a562be64310bbab3c';
    const organizationId = '69830297562be64310bbab6d';

    // Get all projects in the org
    const allProjects = await database.findMany<any>('projects', { organization_id: organizationId });
    console.log(`Total projects in organization: ${allProjects.length}\n`);

    // Test the filtering logic
    const memberships = await database.findMany<any>('project_members', { user_id: userId });
    console.log(`User memberships: ${memberships.length}\n`);

    const membershipProjectIds = new Set(memberships.map(pm => pm.project_id?.toString()));

    for (const project of allProjects) {
      const projectOwnerId = project.owner_id?.toString();
      const projectId = project.id?.toString();

      const isOwner = projectOwnerId === userId;
      const isMember = membershipProjectIds.has(projectId);
      const shouldBeVisible = isOwner || isMember;

      console.log(`Project: ${project.name}`);
      console.log(`  owner_id: ${project.owner_id} (type: ${typeof project.owner_id})`);
      console.log(`  owner_id.toString(): ${projectOwnerId}`);
      console.log(`  userId: ${userId}`);
      console.log(`  Is owner? ${isOwner}`);
      console.log(`  Is member? ${isMember}`);
      console.log(`  Should be visible? ${shouldBeVisible ? '✅ YES' : '❌ NO'}`);
      console.log('');
    }

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await disconnectDB();
    process.exit(1);
  }
}

debugAPI();
