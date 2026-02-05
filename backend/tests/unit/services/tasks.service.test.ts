/**
 * Tasks Service Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { tasksService } from '../../../src/services/tasks.service.js';
import database from '../../../src/lib/database.js';
import { createProjectDocument, createTaskDocument, createColumnDocument, createSprintDocument } from '../../fixtures/projects.js';
import { createUserDocument } from '../../fixtures/users.js';
import { generateObjectId } from '../../utils/test-helpers.js';

describe('TasksService', () => {
  let testProject: any;
  let testColumn: any;
  let testUser: any;

  beforeEach(async () => {
    // Create common test data
    testUser = await createUserDocument();
    testProject = await createProjectDocument({ owner_id: testUser.id });
    testColumn = await createColumnDocument({
      project_id: testProject.id,
      title: 'TO DO',
      is_default: true,
    });
  });

  describe('create', () => {
    it('should create task with required fields', async () => {
      const input = {
        project_id: testProject.id,
        title: 'Test Task',
      };

      const task = await tasksService.create(input);

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.project_id).toBe(testProject.id);
      // Task key uses project code (TST) or defaults to 'TSK'
      expect(task.task_key).toMatch(/^(TST|TSK)-\d+$/);
      expect(task.type).toBe('task');
      expect(task.priority).toBe('MEDIUM');
    });

    it('should auto-generate sequential task keys', async () => {
      const task1 = await tasksService.create({
        project_id: testProject.id,
        title: 'First Task',
      });
      const task2 = await tasksService.create({
        project_id: testProject.id,
        title: 'Second Task',
      });

      // Task keys should be sequential (code may be TST or TSK)
      const key1Match = task1.task_key.match(/^(TST|TSK)-(\d+)$/);
      const key2Match = task2.task_key.match(/^(TST|TSK)-(\d+)$/);
      expect(key1Match).not.toBeNull();
      expect(key2Match).not.toBeNull();
      expect(parseInt(key2Match![2])).toBe(parseInt(key1Match![2]) + 1);
    });

    it('should use default column when not specified', async () => {
      const task = await tasksService.create({
        project_id: testProject.id,
        title: 'Default Column Task',
      });

      expect(task.column_id).toBe(testColumn.id);
    });

    it('should create task with assignee and reporter', async () => {
      const assignee = await createUserDocument({ email: 'assignee@test.com' });

      const task = await tasksService.create({
        project_id: testProject.id,
        title: 'Assigned Task',
        assignee_id: assignee.id,
        reporter_id: testUser.id,
      });

      expect(task.assignee_id).toBe(assignee.id);
      expect(task.reporter_id).toBe(testUser.id);
    });

    it('should create task with sprint', async () => {
      const sprint = await createSprintDocument(testProject.id, {
        name: 'Sprint 1',
        status: 'planned',
      });

      const task = await tasksService.create({
        project_id: testProject.id,
        title: 'Sprint Task',
        sprint_id: sprint.id,
      });

      expect(task.sprint_id).toBe(sprint.id);
    });

    it('should create task with custom type and priority', async () => {
      const task = await tasksService.create({
        project_id: testProject.id,
        title: 'Bug Task',
        type: 'bug',
        priority: 'HIGH',
      });

      expect(task.type).toBe('bug');
      expect(task.priority).toBe('HIGH');
    });
  });

  describe('getById', () => {
    it('should return task by id', async () => {
      const created = await tasksService.create({
        project_id: testProject.id,
        title: 'Get By ID Task',
      });

      const task = await tasksService.getById(created.id);

      expect(task).not.toBeNull();
      expect(task?.id).toBe(created.id);
      expect(task?.title).toBe('Get By ID Task');
    });

    it('should return task by task_key', async () => {
      const created = await tasksService.create({
        project_id: testProject.id,
        title: 'Get By Key Task',
      });

      const task = await tasksService.getById(created.task_key);

      expect(task).not.toBeNull();
      expect(task?.task_key).toBe(created.task_key);
    });

    it('should return null for non-existent task', async () => {
      const task = await tasksService.getById(generateObjectId());

      expect(task).toBeNull();
    });

    it('should enrich task with column title and assignee info', async () => {
      const assignee = await createUserDocument({ email: 'assignee@test.com', name: 'John Doe' });

      const created = await tasksService.create({
        project_id: testProject.id,
        title: 'Enriched Task',
        assignee_id: assignee.id,
      });

      const task = await tasksService.getById(created.id);

      expect(task?.column_title).toBe('TO DO');
      expect(task?.assignee_name).toBe('John Doe');
    });
  });

  describe('getAllPaginated', () => {
    beforeEach(async () => {
      // Create multiple tasks
      for (let i = 0; i < 15; i++) {
        await tasksService.create({
          project_id: testProject.id,
          title: `Task ${i + 1}`,
        });
      }
    });

    it('should return paginated tasks', async () => {
      const result = await tasksService.getAllPaginated({}, { page: 1, limit: 10 });

      expect(result.data.length).toBe(10);
      expect(result.pagination.total).toBe(15);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should filter by project_id', async () => {
      const otherProject = await createProjectDocument({ name: 'Other Project', code: 'OTH' });
      await tasksService.create({
        project_id: otherProject.id,
        title: 'Other Project Task',
      });

      const result = await tasksService.getAllPaginated({ project_id: testProject.id });

      expect(result.data.every(t => t.project_id === testProject.id)).toBe(true);
    });

    it('should filter by assignee_id', async () => {
      const assignee = await createUserDocument({ email: 'specific@test.com' });
      await tasksService.create({
        project_id: testProject.id,
        title: 'Assigned Task',
        assignee_id: assignee.id,
      });

      const result = await tasksService.getAllPaginated({ assignee_id: assignee.id });

      expect(result.data.length).toBe(1);
      expect(result.data[0].assignee_id).toBe(assignee.id);
    });

    it('should filter by reporter_id', async () => {
      const reporter = await createUserDocument({ email: 'reporter@test.com' });
      await tasksService.create({
        project_id: testProject.id,
        title: 'Reported Task',
        reporter_id: reporter.id,
      });

      const result = await tasksService.getAllPaginated({ reporter_id: reporter.id });

      expect(result.data.length).toBe(1);
      expect(result.data[0].reporter_id).toBe(reporter.id);
    });

    it('should filter by user_id (assignee OR reporter)', async () => {
      const user = await createUserDocument({ email: 'user@test.com' });

      // Create task where user is assignee
      await tasksService.create({
        project_id: testProject.id,
        title: 'Assigned to User',
        assignee_id: user.id,
      });

      // Create task where user is reporter
      await tasksService.create({
        project_id: testProject.id,
        title: 'Reported by User',
        reporter_id: user.id,
      });

      const result = await tasksService.getAllPaginated({ user_id: user.id });

      // Should return both tasks
      expect(result.data.length).toBe(2);
      expect(result.data.some(t => t.assignee_id === user.id)).toBe(true);
      expect(result.data.some(t => t.reporter_id === user.id)).toBe(true);
    });

    it('should filter by sprint_id', async () => {
      const sprint = await createSprintDocument(testProject.id, {
        name: 'Sprint 1',
        status: 'active',
      });

      await tasksService.create({
        project_id: testProject.id,
        title: 'Sprint Task',
        sprint_id: sprint.id,
      });

      const result = await tasksService.getAllPaginated({ sprint_id: sprint.id });

      expect(result.data.length).toBe(1);
      expect(result.data[0].sprint_id).toBe(sprint.id);
    });
  });

  describe('update', () => {
    it('should update task title', async () => {
      const created = await tasksService.create({
        project_id: testProject.id,
        title: 'Original Title',
      });

      const updated = await tasksService.update(created.id, { title: 'Updated Title' });

      expect(updated?.title).toBe('Updated Title');
    });

    it('should update task by task_key', async () => {
      const created = await tasksService.create({
        project_id: testProject.id,
        title: 'Key Update Task',
      });

      const updated = await tasksService.update(created.task_key, { title: 'Updated by Key' });

      expect(updated?.title).toBe('Updated by Key');
    });

    it('should update assignee', async () => {
      const assignee = await createUserDocument({ email: 'newassignee@test.com' });
      const created = await tasksService.create({
        project_id: testProject.id,
        title: 'Assignee Update Task',
      });

      const updated = await tasksService.update(created.id, { assignee_id: assignee.id });

      expect(updated?.assignee_id).toBe(assignee.id);
    });

    it('should return null for non-existent task', async () => {
      const updated = await tasksService.update(generateObjectId(), { title: 'Test' });

      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete task by id', async () => {
      const created = await tasksService.create({
        project_id: testProject.id,
        title: 'Delete Task',
      });

      const deleted = await tasksService.delete(created.id);

      expect(deleted).toBe(true);

      const task = await tasksService.getById(created.id);
      expect(task).toBeNull();
    });

    it('should delete task by task_key', async () => {
      const created = await tasksService.create({
        project_id: testProject.id,
        title: 'Delete by Key Task',
      });

      const deleted = await tasksService.delete(created.task_key);

      expect(deleted).toBe(true);
    });

    it('should delete related subtasks', async () => {
      const created = await tasksService.create({
        project_id: testProject.id,
        title: 'Task with Subtasks',
      });

      await tasksService.createSubtask(created.id, { title: 'Subtask 1' });
      await tasksService.createSubtask(created.id, { title: 'Subtask 2' });

      await tasksService.delete(created.id);

      const subtasks = await tasksService.getSubtasks(created.id);
      expect(subtasks.length).toBe(0);
    });

    it('should return false for non-existent task', async () => {
      const deleted = await tasksService.delete(generateObjectId());

      expect(deleted).toBe(false);
    });
  });

  describe('moveToColumn', () => {
    it('should move task to different column', async () => {
      const inProgressColumn = await createColumnDocument({
        project_id: testProject.id,
        title: 'IN PROGRESS',
      });

      const created = await tasksService.create({
        project_id: testProject.id,
        title: 'Move Task',
      });

      const moved = await tasksService.moveToColumn(created.id, inProgressColumn.id);

      expect(moved?.column_id).toBe(inProgressColumn.id);
    });
  });

  describe('assignToSprint', () => {
    it('should assign task to sprint', async () => {
      const sprint = await createSprintDocument(testProject.id, {
        name: 'Sprint 1',
        status: 'active',
      });

      const created = await tasksService.create({
        project_id: testProject.id,
        title: 'Sprint Assign Task',
      });

      const assigned = await tasksService.assignToSprint(created.id, sprint.id);

      expect(assigned?.sprint_id).toBe(sprint.id);
    });

    it('should remove task from sprint', async () => {
      const sprint = await createSprintDocument(testProject.id, {
        name: 'Sprint 1',
        status: 'active',
      });

      const created = await tasksService.create({
        project_id: testProject.id,
        title: 'Remove from Sprint Task',
        sprint_id: sprint.id,
      });

      const removed = await tasksService.assignToSprint(created.id, null);

      expect(removed?.sprint_id).toBeNull();
    });
  });

  describe('subtasks', () => {
    let parentTask: any;

    beforeEach(async () => {
      parentTask = await tasksService.create({
        project_id: testProject.id,
        title: 'Parent Task',
      });
    });

    describe('createSubtask', () => {
      it('should create subtask', async () => {
        const subtask = await tasksService.createSubtask(parentTask.id, {
          title: 'Test Subtask',
        });

        expect(subtask.id).toBeDefined();
        expect(subtask.title).toBe('Test Subtask');
        expect(subtask.task_id).toBe(parentTask.id);
        expect(subtask.is_completed).toBe(false);
        expect(subtask.status).toBe('pending');
      });

      it('should create subtask with assignee', async () => {
        const assignee = await createUserDocument({ email: 'subtask-assignee@test.com' });

        const subtask = await tasksService.createSubtask(parentTask.id, {
          title: 'Assigned Subtask',
          assignee_id: assignee.id,
        });

        expect(subtask.assignee_id).toBe(assignee.id);
      });
    });

    describe('getSubtasks', () => {
      it('should return all subtasks for a task', async () => {
        await tasksService.createSubtask(parentTask.id, { title: 'Subtask 1' });
        await tasksService.createSubtask(parentTask.id, { title: 'Subtask 2' });
        await tasksService.createSubtask(parentTask.id, { title: 'Subtask 3' });

        const subtasks = await tasksService.getSubtasks(parentTask.id);

        expect(subtasks.length).toBe(3);
      });

      it('should return empty array for task without subtasks', async () => {
        const subtasks = await tasksService.getSubtasks(parentTask.id);

        expect(subtasks).toEqual([]);
      });
    });

    describe('updateSubtask', () => {
      it('should update subtask title', async () => {
        const subtask = await tasksService.createSubtask(parentTask.id, {
          title: 'Original Subtask',
        });

        const updated = await tasksService.updateSubtask(subtask.id, {
          title: 'Updated Subtask',
        });

        expect(updated?.title).toBe('Updated Subtask');
      });

      it('should mark subtask as completed', async () => {
        const subtask = await tasksService.createSubtask(parentTask.id, {
          title: 'Complete Me',
        });

        const updated = await tasksService.updateSubtask(subtask.id, {
          is_completed: true,
          status: 'completed',
        });

        expect(updated?.is_completed).toBe(true);
        expect(updated?.status).toBe('completed');
      });
    });

    describe('deleteSubtask', () => {
      it('should delete subtask', async () => {
        const subtask = await tasksService.createSubtask(parentTask.id, {
          title: 'Delete Me',
        });

        const deleted = await tasksService.deleteSubtask(subtask.id);

        expect(deleted).toBe(true);

        const subtasks = await tasksService.getSubtasks(parentTask.id);
        expect(subtasks.length).toBe(0);
      });
    });
  });

  describe('task links', () => {
    let task1: any;
    let task2: any;

    beforeEach(async () => {
      task1 = await tasksService.create({
        project_id: testProject.id,
        title: 'Blocking Task',
      });
      task2 = await tasksService.create({
        project_id: testProject.id,
        title: 'Blocked Task',
      });
    });

    describe('addTaskLink', () => {
      it('should create blocking link between tasks', async () => {
        const link = await tasksService.addTaskLink(task2.id, task1.id, 'blocks', testUser.id);

        expect(link.id).toBeDefined();
        expect(link.blocking_task_id).toBe(task1.id);
        expect(link.blocked_task_id).toBe(task2.id);
        expect(link.link_type).toBe('blocks');
        expect(link.created_by).toBe(testUser.id);
      });

      it('should return enriched link with blocking task details', async () => {
        const link = await tasksService.addTaskLink(task2.id, task1.id, 'blocks');

        expect(link.blocking_task).toBeDefined();
        expect(link.blocking_task?.id).toBe(task1.id);
        expect(link.blocking_task?.title).toBe('Blocking Task');
      });
    });

    describe('getTaskLinks', () => {
      it('should return blocked by and blocks links', async () => {
        const task3 = await tasksService.create({
          project_id: testProject.id,
          title: 'Third Task',
        });

        // task1 blocks task2
        await tasksService.addTaskLink(task2.id, task1.id, 'blocks');
        // task2 blocks task3
        await tasksService.addTaskLink(task3.id, task2.id, 'blocks');

        const links = await tasksService.getTaskLinks(task2.id);

        expect(links.blockedBy.length).toBe(1);
        expect(links.blockedBy[0].blocking_task_id).toBe(task1.id);

        expect(links.blocks.length).toBe(1);
        expect(links.blocks[0].blocked_task_id).toBe(task3.id);
      });
    });

    describe('removeTaskLink', () => {
      it('should remove task link', async () => {
        const link = await tasksService.addTaskLink(task2.id, task1.id, 'blocks');

        const removed = await tasksService.removeTaskLink(link.id);

        expect(removed).toBe(true);

        const links = await tasksService.getTaskLinks(task2.id);
        expect(links.blockedBy.length).toBe(0);
      });
    });

    describe('getAvailableLinksForTask', () => {
      it('should return tasks from same project that are not already linked', async () => {
        const task3 = await tasksService.create({
          project_id: testProject.id,
          title: 'Available Task',
        });

        // Link task1 to task2
        await tasksService.addTaskLink(task2.id, task1.id, 'blocks');

        const available = await tasksService.getAvailableLinksForTask(task2.id);

        // Should include task3, exclude task2 itself and already linked task1
        expect(available.length).toBe(1);
        expect(available[0].id).toBe(task3.id);
      });
    });
  });

  describe('getTaskPermissions', () => {
    it('should return permissions for reporter', async () => {
      const task = await tasksService.create({
        project_id: testProject.id,
        title: 'Permission Task',
        reporter_id: testUser.id,
      });

      const permissions = await tasksService.getTaskPermissions(task.id, testUser.id, false);

      expect(permissions.isReporter).toBe(true);
      expect(permissions.canEdit).toBe(true);
      expect(permissions.canDelete).toBe(true);
    });

    it('should return permissions for assignee', async () => {
      const assignee = await createUserDocument({ email: 'assignee@test.com' });
      const task = await tasksService.create({
        project_id: testProject.id,
        title: 'Assigned Task',
        reporter_id: testUser.id,
        assignee_id: assignee.id,
      });

      const permissions = await tasksService.getTaskPermissions(task.id, assignee.id, false);

      expect(permissions.isAssignee).toBe(true);
      expect(permissions.isReporter).toBe(false);
    });

    it('should grant full access to admin', async () => {
      const admin = await createUserDocument({ email: 'admin@test.com' });
      const task = await tasksService.create({
        project_id: testProject.id,
        title: 'Admin Permission Task',
        reporter_id: testUser.id,
      });

      const permissions = await tasksService.getTaskPermissions(task.id, admin.id, true);

      expect(permissions.canEdit).toBe(true);
      expect(permissions.canComment).toBe(true);
      expect(permissions.canChangeStatus).toBe(true);
      expect(permissions.canDelete).toBe(true);
    });

    it('should grant full access to project owner', async () => {
      const task = await tasksService.create({
        project_id: testProject.id,
        title: 'Owner Permission Task',
        reporter_id: testUser.id,
      });

      // testUser is the project owner
      const permissions = await tasksService.getTaskPermissions(task.id, testUser.id, false);

      expect(permissions.canEdit).toBe(true);
      expect(permissions.canDelete).toBe(true);
    });

    it('should return no permissions for non-existent task', async () => {
      const permissions = await tasksService.getTaskPermissions(generateObjectId(), testUser.id, false);

      expect(permissions.canEdit).toBe(false);
      expect(permissions.canComment).toBe(false);
      expect(permissions.canChangeStatus).toBe(false);
      expect(permissions.canDelete).toBe(false);
    });
  });

  describe('isStatusOnlyUpdate', () => {
    it('should return true for column_id only update', () => {
      const result = tasksService.isStatusOnlyUpdate({ column_id: 'test' });

      expect(result).toBe(true);
    });

    it('should return true for status only update', () => {
      const result = tasksService.isStatusOnlyUpdate({ status: 'completed' } as any);

      expect(result).toBe(true);
    });

    it('should return false for title update', () => {
      const result = tasksService.isStatusOnlyUpdate({ title: 'New Title' });

      expect(result).toBe(false);
    });

    it('should return false for mixed update', () => {
      const result = tasksService.isStatusOnlyUpdate({
        column_id: 'test',
        title: 'New Title',
      });

      expect(result).toBe(false);
    });
  });
});
