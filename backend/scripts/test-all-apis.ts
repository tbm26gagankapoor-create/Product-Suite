import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';

const API_BASE = 'http://localhost:3001/api/v1';
let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function apiCall(method: string, path: string, token: string, body?: any) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No MONGODB_URI');
  await mongoose.connect(uri);
  const db = mongoose.connection.db!;

  const user = await db.collection('users').findOne({ email: /gagan/i });
  if (!user) throw new Error('No user');

  const secret = process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars';
  const token = jwt.sign({ id: user._id.toString(), email: (user as any).email }, secret, { expiresIn: '1h' });
  const orgId = (user as any).organization_id?.toString();
  const userId = user._id.toString();

  const cleanup: Array<{ collection: string; id: string }> = [];
  const testCode = 'T' + Date.now().toString(36).slice(-2).toUpperCase();
  let projectId: string | undefined;

  try {
    // ============================================
    // 1. AUTH - GET /auth/me
    // ============================================
    console.log('\n=== 1. AUTH ===');
    const meRes = await apiCall('GET', '/auth/me', token);
    check('GET /auth/me returns user', meRes.data.success && meRes.data.data.id === userId);
    check('User has organizationId', !!meRes.data.data.organizationId || !!meRes.data.data.organization_id);

    // ============================================
    // 2. PROJECTS - CRUD
    // ============================================
    console.log('\n=== 2. PROJECTS ===');

    // CREATE
    const projRes = await apiCall('POST', '/projects', token, {
      name: 'API Test Project', code: testCode, description: 'Testing all APIs',
      organization_id: orgId, owner_ids: [userId],
      vision: 'Test vision', prd: '# Test PRD', docs: { prd: '# PRD doc', roadmap: '# Roadmap' },
      status: 'Planning',
    });
    check('POST /projects creates project', projRes.status === 201 && projRes.data.success);
    projectId = projRes.data.data?.id;
    check('Project has valid ID', !!projectId);
    check('Project code matches', projRes.data.data?.code === testCode);
    check('Project org matches', projRes.data.data?.organization_id?.toString() === orgId);
    check('Project docs saved', !!projRes.data.data?.docs?.prd);
    check('Project vision saved', !!projRes.data.data?.vision);
    cleanup.push({ collection: 'projects', id: projectId });

    // GET by ID
    const getProj = await apiCall('GET', `/projects/${projectId}`, token);
    check('GET /projects/:id returns correct project', getProj.data.success && getProj.data.data.id === projectId);
    check('GET project name matches', getProj.data.data.name === 'API Test Project');

    // GET all (skip — large payload, tested via GET /:id above)

    // UPDATE
    const updateProj = await apiCall('PATCH', `/projects/${projectId}`, token, {
      description: 'Updated description',
    });
    check('PATCH /projects/:id updates project', updateProj.data.success);
    check('Description updated', updateProj.data.data.description === 'Updated description');
    check('ID unchanged after update', updateProj.data.data.id === projectId);

    // Duplicate code same org (should fail)
    const dupRes = await apiCall('POST', '/projects', token, {
      name: 'Duplicate', code: testCode, organization_id: orgId, owner_ids: [userId],
    });
    check('Duplicate code same org returns 400', dupRes.status === 400);

    // ============================================
    // 3. COLUMNS - auto-created with project
    // ============================================
    console.log('\n=== 3. COLUMNS ===');

    const colsRes = await apiCall('GET', `/columns?project_id=${projectId}`, token);
    const columns = colsRes.data.data;
    check('GET /columns returns columns', colsRes.data.success && Array.isArray(columns),
      `success=${colsRes.data.success}, isArray=${Array.isArray(columns)}, status=${colsRes.status}`);

    let todoCol: any = null;
    let doneCol: any = null;
    if (Array.isArray(columns)) {
      check('5 default columns created', columns.length === 5, `got ${columns.length}`);
      check('Columns have project_id', columns.every((c: any) => c.project_id?.toString() === projectId));
      todoCol = columns.find((c: any) => c.title === 'TO DO');
      doneCol = columns.find((c: any) => c.title === 'DONE');
      check('TO DO column exists', !!todoCol);
      check('DONE column exists', !!doneCol);
    }

    // ============================================
    // 4. TASKS - CRUD with project mapping
    // ============================================
    console.log('\n=== 4. TASKS ===');

    // Create epic
    const epicRes = await apiCall('POST', '/tasks', token, {
      project_id: projectId, title: 'Test Epic', type: 'epic', priority: 'HIGH',
      points: 0, assignee_id: userId, reporter_id: userId,
    });
    check('POST /tasks creates epic', epicRes.data.success);
    const epicId = epicRes.data.data?.id;
    check('Epic has valid ID', !!epicId);
    check('Epic project_id matches', epicRes.data.data?.project_id?.toString() === projectId);
    check('Epic has task_key', !!epicRes.data.data?.task_key);
    check(`Epic task_key starts with ${testCode}-`, epicRes.data.data?.task_key?.startsWith(`${testCode}-`));
    check('Epic type is epic', epicRes.data.data?.type === 'epic');

    // Create task under epic
    const taskRes = await apiCall('POST', '/tasks', token, {
      project_id: projectId, title: 'Test Task', type: 'task', priority: 'MEDIUM',
      points: 3, assignee_id: userId, reporter_id: userId, parent_epic_id: epicId,
    });
    check('POST /tasks creates task', taskRes.data.success);
    const taskId = taskRes.data.data?.id;
    check('Task project_id matches', taskRes.data.data?.project_id?.toString() === projectId);
    check('Task parent_epic_id matches epic', taskRes.data.data?.parent_epic_id?.toString() === epicId);
    check('Task has task_key', !!taskRes.data.data?.task_key);
    check('Task points = 3', taskRes.data.data?.points === 3);

    // Create bug
    const bugRes = await apiCall('POST', '/tasks', token, {
      project_id: projectId, title: 'Test Bug', type: 'bug', priority: 'CRITICAL',
      points: 2, assignee_id: userId, reporter_id: userId, parent_epic_id: epicId,
    });
    check('POST /tasks creates bug', bugRes.data.success);
    const bugId = bugRes.data.data?.id;
    check('Bug type is bug', bugRes.data.data?.type === 'bug');

    // Create feature
    const featureRes = await apiCall('POST', '/tasks', token, {
      project_id: projectId, title: 'Test Feature', type: 'feature', priority: 'LOW',
      points: 5, assignee_id: userId, reporter_id: userId,
    });
    check('POST /tasks creates feature', featureRes.data.success);
    const featureId = featureRes.data.data?.id;

    // GET task by ID
    const getTask = await apiCall('GET', `/tasks/${taskId}`, token);
    check('GET /tasks/:id returns task', getTask.data.success && getTask.data.data.id === taskId);
    check('GET task has correct project', getTask.data.data.project_id?.toString() === projectId);

    // GET all tasks for project
    const allTasks = await apiCall('GET', `/tasks?project_id=${projectId}`, token);
    check('GET /tasks?project_id returns tasks', allTasks.data.success);
    const taskList = allTasks.data.data?.tasks || allTasks.data.data;
    check('All 4 tasks returned', Array.isArray(taskList) && taskList.length === 4,
      `got ${Array.isArray(taskList) ? taskList.length : 'non-array'}`);
    if (Array.isArray(taskList)) {
      check('All tasks belong to our project',
        taskList.every((t: any) => t.project_id?.toString() === projectId));
    }

    // UPDATE task
    const updateTask = await apiCall('PATCH', `/tasks/${taskId}`, token, {
      title: 'Updated Task Title', points: 5,
    });
    check('PATCH /tasks/:id updates task', updateTask.data.success);
    check('Task title updated', updateTask.data.data?.title === 'Updated Task Title');
    check('Task points updated', updateTask.data.data?.points === 5);
    check('Task project_id unchanged', updateTask.data.data?.project_id?.toString() === projectId);

    // MOVE task to different column (move API uses short names, not UUIDs)
    const moveRes = await apiCall('POST', `/tasks/${taskId}/move`, token, {
      column_id: 'done',
    });
    check('POST /tasks/:id/move moves task', moveRes.data.success,
      `status=${moveRes.status}, error=${JSON.stringify(moveRes.data.error)}`);
    if (doneCol) {
      check('Task moved to DONE column', moveRes.data.data?.column_id?.toString() === doneCol.id);
    }

    // ============================================
    // 5. SPRINTS
    // ============================================
    console.log('\n=== 5. SPRINTS ===');

    const sprintRes = await apiCall('POST', '/sprints', token, {
      project_id: projectId, name: 'Sprint 1', goal: 'Test sprint',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 14 * 86400000).toISOString(),
    });
    check('POST /sprints creates sprint', sprintRes.data.success);
    const sprintId = sprintRes.data.data?.id;
    check('Sprint has valid ID', !!sprintId);
    check('Sprint project_id matches', sprintRes.data.data?.project_id?.toString() === projectId);

    // GET sprint
    const getSprint = await apiCall('GET', `/sprints/${sprintId}`, token);
    check('GET /sprints/:id returns sprint', getSprint.data.success && getSprint.data.data.id === sprintId);

    // GET sprints for project
    const allSprints = await apiCall('GET', `/sprints?project_id=${projectId}`, token);
    check('GET /sprints?project_id returns sprints', allSprints.data.success);

    // Add task to sprint
    const addToSprint = await apiCall('POST', `/tasks/${taskId}/sprint`, token, {
      sprint_id: sprintId,
    });
    check('POST /tasks/:id/sprint adds task to sprint', addToSprint.data.success);
    check('Task sprint_id set correctly', addToSprint.data.data?.sprint_id?.toString() === sprintId);
    check('Task project_id unchanged after sprint add', addToSprint.data.data?.project_id?.toString() === projectId);

    // Add bug to sprint
    const addBugToSprint = await apiCall('POST', `/tasks/${bugId}/sprint`, token, {
      sprint_id: sprintId,
    });
    check('Bug added to sprint', addBugToSprint.data.success);

    // Verify sprint tasks
    const sprintTasks = await apiCall('GET', `/tasks?project_id=${projectId}&sprint_id=${sprintId}`, token);
    check('GET tasks by sprint_id works', sprintTasks.data.success);
    const sprintTaskList = sprintTasks.data.data?.tasks || sprintTasks.data.data;
    if (Array.isArray(sprintTaskList)) {
      check('Sprint has 2 tasks', sprintTaskList.length === 2, `got ${sprintTaskList.length}`);
      check('Sprint tasks belong to correct project',
        sprintTaskList.every((t: any) => t.project_id?.toString() === projectId));
    }

    // UPDATE sprint
    const updateSprint = await apiCall('PATCH', `/sprints/${sprintId}`, token, {
      goal: 'Updated goal',
    });
    check('PATCH /sprints/:id updates sprint', updateSprint.data.success);

    // Clean up sprint
    cleanup.push({ collection: 'sprints', id: sprintId });

    // ============================================
    // 6. TAGS
    // ============================================
    console.log('\n=== 6. TAGS ===');

    const tagRes = await apiCall('POST', '/tags', token, {
      project_id: projectId, label: 'test-tag', color: '#ff0000',
    });
    check('POST /tags creates tag', tagRes.data.success, tagRes.data.error);
    const tagId = tagRes.data.data?.id;
    if (tagId) {
      check('Tag has project_id', tagRes.data.data?.project_id?.toString() === projectId);

      const allTags = await apiCall('GET', `/tags?project_id=${projectId}`, token);
      check('GET /tags?project_id returns tags', allTags.data.success);

      cleanup.push({ collection: 'tags', id: tagId });
    }

    // ============================================
    // 7. COMMENTS
    // ============================================
    console.log('\n=== 7. COMMENTS ===');

    const commentRes = await apiCall('POST', '/comments', token, {
      task_id: taskId, content: 'Test comment on task',
    });
    check('POST /comments creates comment', commentRes.data.success,
      `status=${commentRes.status}, error=${JSON.stringify(commentRes.data.error)}`);
    const commentId = commentRes.data.data?.id;
    if (commentId) {
      check('Comment has task_id', commentRes.data.data?.task_id?.toString() === taskId);

      const getComments = await apiCall('GET', `/comments/task/${taskId}`, token);
      check('GET /comments/task/:taskId returns comments', getComments.data.success);
      const comments = getComments.data.data;
      if (Array.isArray(comments)) {
        check('Comment belongs to correct task',
          comments.some((c: any) => c.id === commentId || c.task_id?.toString() === taskId),
          `commentId=${commentId}, comments=${JSON.stringify(comments.map((c: any) => ({ id: c.id, task_id: c.task_id })))}`);
      }

      cleanup.push({ collection: 'comments', id: commentId });
    }

    // ============================================
    // 8. SUBTASKS
    // ============================================
    console.log('\n=== 8. SUBTASKS ===');

    const subtaskRes = await apiCall('POST', `/tasks/${taskId}/subtasks`, token, {
      title: 'Test subtask', is_completed: false,
    });
    check('POST /tasks/:id/subtasks creates subtask', subtaskRes.data.success);
    if (subtaskRes.data.success) {
      const subtask = subtaskRes.data.data;
      check('Subtask belongs to parent task', subtask?.task_id?.toString() === taskId || subtask?.parent_id?.toString() === taskId);
    }

    // ============================================
    // 9. DELETE - verify cascade/cleanup
    // ============================================
    console.log('\n=== 9. DELETE ===');

    // Delete a task
    const delTask = await apiCall('DELETE', `/tasks/${featureId}`, token);
    check('DELETE /tasks/:id deletes task', delTask.data.success);

    // Verify it's gone
    const getDeleted = await apiCall('GET', `/tasks/${featureId}`, token);
    check('Deleted task returns 404', getDeleted.status === 404,
      `got status=${getDeleted.status}, success=${getDeleted.data.success}`);

    // Remaining tasks should still be 3
    const remaining = await apiCall('GET', `/tasks?project_id=${projectId}`, token);
    const remainList = remaining.data.data?.tasks || remaining.data.data;
    check('3 tasks remain after delete', Array.isArray(remainList) && remainList.length === 3,
      `got ${Array.isArray(remainList) ? remainList.length : 'non-array'}`);

    // ============================================
    // 10. ORGANIZATIONS
    // ============================================
    console.log('\n=== 10. ORGANIZATIONS ===');

    const orgRes = await apiCall('GET', `/organizations/${orgId}`, token);
    check('GET /organizations/:id returns org', orgRes.data.success);

    const membersRes = await apiCall('GET', `/organizations/${orgId}/members`, token);
    check('GET /organizations/:id/members returns members', membersRes.data.success);

    // ============================================
    // 11. USERS
    // ============================================
    console.log('\n=== 11. USERS ===');

    const usersRes = await apiCall('GET', '/users', token);
    check('GET /users returns users', usersRes.data.success);

    const userRes = await apiCall('GET', `/users/${userId}`, token);
    check('GET /users/:id returns user', userRes.data.success && userRes.data.data.id === userId);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('\n' + '='.repeat(50));
    console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
    console.log('='.repeat(50));

  } finally {
    // ============================================
    // CLEANUP
    // ============================================
    console.log('\n=== Cleanup ===');
    // Delete tasks first (foreign key dependency)
    if (projectId) {
      await db.collection('tasks').deleteMany({ project_id: new mongoose.Types.ObjectId(projectId) });
      await db.collection('subtasks').deleteMany({ task_id: { $in: await db.collection('tasks').find({ project_id: new mongoose.Types.ObjectId(projectId) }).map((t: any) => t._id).toArray() } });
    }
    for (const item of cleanup) {
      try {
        await db.collection(item.collection).deleteOne({ _id: new mongoose.Types.ObjectId(item.id) });
      } catch (e) { /* ignore */ }
    }
    if (projectId) {
      await db.collection('columns_status').deleteMany({ project_id: new mongoose.Types.ObjectId(projectId) });
    }
    console.log('Test data cleaned up');
    await mongoose.disconnect();
  }
}

run().catch(err => {
  console.error('Test crashed:', err);
  mongoose.disconnect();
  process.exit(1);
});
