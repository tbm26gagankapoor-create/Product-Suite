import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/lib/mongodb.js';
import { Project, Task } from '../src/models/index.js';

async function check() {
  await connectDB();

  const uberId = '6985f93114449dadf7e0fa12';

  // Check project docs
  const project = await Project.findById(uberId).lean();
  if (project) {
    console.log('=== Uber Project (UBE1) ===');
    const hasVision = project.vision ? true : false;
    const hasPrd = project.prd ? true : false;
    const hasDocs = project.docs ? true : false;
    console.log('Has vision:', hasVision);
    console.log('Vision length:', project.vision ? String(project.vision).length : 0);
    console.log('Has prd:', hasPrd);
    console.log('PRD length:', project.prd ? String(project.prd).length : 0);
    console.log('Has docs:', hasDocs);
    if (project.docs && typeof project.docs === 'object') {
      const docKeys = Object.keys(project.docs as any);
      console.log('Doc keys:', docKeys);
      docKeys.forEach(k => {
        const val = (project.docs as any)[k];
        console.log('  ', k, ':', val ? String(val).length : 0, 'chars');
      });
    } else {
      console.log('docs field is:', project.docs);
    }
  }

  // Check tasks for this project
  const tasks = await Task.find({ project_id: new mongoose.Types.ObjectId(uberId) }).lean();
  console.log('\n=== Tasks for Uber (UBE1) ===');
  console.log('Total tasks:', tasks.length);
  tasks.slice(0, 5).forEach(t => {
    console.log(' -', (t as any).title, '| type:', (t as any).type);
  });

  await disconnectDB();
}
check();
