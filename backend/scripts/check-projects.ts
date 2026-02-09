import { connectDB, disconnectDB } from '../src/lib/mongodb.js';
import { Project, User } from '../src/models/index.js';

async function checkProjects() {
  try {
    await connectDB();
    console.log('Connected to database\n');

    // Get all projects
    const projects = await Project.find({}).lean();
    console.log(`Total projects in database: ${projects.length}\n`);

    // Display all projects
    projects.forEach((project: any, index: number) => {
      console.log(`${index + 1}. ${project.name}`);
      console.log(`   ID: ${project.id || project._id}`);
      console.log(`   Code: ${project.code}`);
      console.log(`   Status: ${project.status}`);
      console.log(`   Organization ID: ${project.organization_id || 'NOT SET ⚠️'}`);
      console.log(`   Owner ID: ${project.owner_id}`);
      console.log(`   Draft Step: ${project.draft_step || 'N/A'}`);
      console.log('');
    });

    // Check for projects without organization_id
    const projectsWithoutOrg = projects.filter((p: any) => !p.organization_id);
    if (projectsWithoutOrg.length > 0) {
      console.log(`\n⚠️  WARNING: ${projectsWithoutOrg.length} projects WITHOUT organization_id:`);
      projectsWithoutOrg.forEach((p: any) => {
        console.log(`   - ${p.name} (ID: ${p.id || p._id}, Status: ${p.status})`);
      });
      console.log('\nThese projects will NOT be visible to users!\n');
    }

    // Get current user
    const users = await User.find({}).lean();
    if (users.length > 0) {
      const currentUser: any = users[0];
      console.log(`\n📋 Current user: ${currentUser.name || currentUser.email}`);
      console.log(`   User's organization_id: ${currentUser.organization_id || 'NOT SET'}\n`);

      if (currentUser.organization_id) {
        // Check data types
        console.log(`   User org_id type: ${typeof currentUser.organization_id}`);
        console.log(`   User org_id value: ${currentUser.organization_id}`);

        // Filter projects by user's organization (convert to string for comparison)
        const userOrgId = currentUser.organization_id.toString();
        const userProjects = projects.filter((p: any) => {
          const projOrgId = p.organization_id ? p.organization_id.toString() : null;
          return projOrgId === userOrgId;
        });

        console.log(`\n✅ Projects visible to user (in organization ${userOrgId}): ${userProjects.length}`);
        userProjects.forEach((p: any) => {
          console.log(`   - ${p.name} (${p.status})`);
        });

        // Also show which projects were filtered out
        const otherProjects = projects.filter((p: any) => {
          const projOrgId = p.organization_id ? p.organization_id.toString() : null;
          return projOrgId !== userOrgId;
        });
        console.log(`\n❌ Projects NOT visible (different org or no org_id): ${otherProjects.length}`);
        otherProjects.forEach((p: any) => {
          console.log(`   - ${p.name} (org: ${p.organization_id || 'NONE'})`);
        });
      } else {
        console.log('⚠️  User has no organization_id set!');
      }
    }

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await disconnectDB();
    process.exit(1);
  }
}

checkProjects();
