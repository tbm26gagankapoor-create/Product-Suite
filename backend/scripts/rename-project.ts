import { connectDB, disconnectDB } from '../src/lib/mongodb.js';
import { Project } from '../src/models/index.js';

async function renameProject() {
  try {
    await connectDB();
    console.log('Connected to database\n');

    // Find the project with code "DIG"
    const project = await Project.findOne({ code: 'DIG' });

    if (!project) {
      console.log('❌ Project with code "DIG" not found');
      await disconnectDB();
      return;
    }

    console.log(`Found project: ${project.name} (code: ${project.code})`);
    console.log(`Current name: ${project.name}`);
    console.log(`New name will be: Digisign\n`);

    // Update the name
    project.name = 'Digisign';
    await project.save();

    console.log('✅ Project renamed successfully!');
    console.log(`   ${project.name} (code: ${project.code}, status: ${project.status})`);

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await disconnectDB();
    process.exit(1);
  }
}

renameProject();
