import { connectDB, disconnectDB } from '../src/lib/mongodb.js';
import { projectsService } from '../src/services/projects.service.js';

async function testAPI() {
  try {
    await connectDB();
    console.log('Testing projects API...\n');

    // Simulate the API call with user context
    const userId = '6983027a562be64310bbab3c'; // Current user ID
    const organizationId = '69830297562be64310bbab6d'; // Current org ID
    const isAdmin = false;
    const includeDrafts = true;

    const projects = await projectsService.getAllForUser(
      userId,
      isAdmin,
      organizationId,
      includeDrafts
    );

    console.log(`Total projects returned by API: ${projects.length}\n`);

    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name}`);
      console.log(`   Status: ${project.status}`);
      console.log(`   Org ID: ${project.organization_id}`);
      console.log('');
    });

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await disconnectDB();
    process.exit(1);
  }
}

testAPI();
