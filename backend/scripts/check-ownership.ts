import { connectDB, disconnectDB } from '../src/lib/mongodb.js';
import { Project, User } from '../src/models/index.js';
import mongoose from 'mongoose';

async function checkOwnership() {
  try {
    await connectDB();
    console.log('Checking project ownership and membership...\n');

    const currentUserId = '6983027a562be64310bbab3c';
    const orgId = '69830297562be64310bbab6d';

    // Get projects in the organization
    const projects = await Project.find({ organization_id: orgId }).lean();
    console.log(`Projects in organization ${orgId}:\n`);

    for (const project of projects) {
      console.log(`📦 ${project.name}`);
      console.log(`   Owner ID: ${project.owner_id} (type: ${typeof project.owner_id})`);
      console.log(`   Current User ID: ${currentUserId}`);

      // Convert to strings for comparison
      const projectOwnerId = project.owner_id ? project.owner_id.toString() : null;
      const isOwner = projectOwnerId === currentUserId;
      console.log(`   Is current user owner? ${isOwner ? '✅ YES' : '❌ NO'}`);

      // Check memberships
      const ProjectMember = mongoose.model('ProjectMember');
      const memberships = await ProjectMember.find({ project_id: project._id }).lean();
      console.log(`   Members: ${memberships.length}`);

      const isUserMember = memberships.some((m: any) => {
        const memberUserId = m.user_id ? m.user_id.toString() : null;
        return memberUserId === currentUserId;
      });
      console.log(`   Is current user a member? ${isUserMember ? '✅ YES' : '❌ NO'}`);

      const shouldBeVisible = isOwner || isUserMember;
      console.log(`   Should be visible to user? ${shouldBeVisible ? '✅ YES' : '❌ NO'}`);
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

checkOwnership();
