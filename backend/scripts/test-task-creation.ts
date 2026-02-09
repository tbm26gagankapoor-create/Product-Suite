import { connectDB, disconnectDB } from '../src/lib/mongodb.js';
import { tasksService } from '../src/services/tasks.service.js';

async function test() {
  await connectDB();

  const projectId = '6985f93114449dadf7e0fa12'; // Uber UBE1

  try {
    console.log('Creating test epic...');
    const epic = await tasksService.create({
      project_id: projectId,
      title: 'Test Epic from Script',
      description: 'Testing epic creation',
      type: 'epic',
      priority: 'MEDIUM',
      points: 0,
      assignee_id: '6983027a562be64310bbab3c',
      reporter_id: '6983027a562be64310bbab3c',
      column_id: 'todo',
      start_date: new Date().toISOString(),
    });
    console.log('Epic created successfully:', epic.id, epic.title);

    console.log('\nCreating test task...');
    const task = await tasksService.create({
      project_id: projectId,
      title: 'Test Task from Script',
      description: 'Testing task creation',
      type: 'task',
      priority: 'MEDIUM',
      points: 3,
      assignee_id: '6983027a562be64310bbab3c',
      reporter_id: '6983027a562be64310bbab3c',
      column_id: 'todo',
      parent_epic_id: epic.id,
      start_date: new Date().toISOString(),
      due_date: '2026-03-01',
    });
    console.log('Task created successfully:', task.id, task.title);

  } catch (error: any) {
    console.error('FAILED:', error.message);
    console.error('Full error:', error);
  }

  await disconnectDB();
}
test();
