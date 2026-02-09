import { connectDB, disconnectDB } from '../src/lib/mongodb.js';
import { Project } from '../src/models/index.js';

async function checkCharity() {
  try {
    await connectDB();

    const charity = await Project.findOne({ code: 'CHA' }).lean();
    console.log('Charity project details:');
    console.log(JSON.stringify(charity, null, 2));

    const digisign = await Project.findOne({ code: 'DIG' }).lean();
    console.log('\nDigisign project details:');
    console.log(JSON.stringify(digisign, null, 2));

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await disconnectDB();
    process.exit(1);
  }
}

checkCharity();
