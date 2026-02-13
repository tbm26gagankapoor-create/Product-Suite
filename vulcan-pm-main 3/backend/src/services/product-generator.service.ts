import { jobStore, Job } from './job-store.js';
import { projectsService } from './projects.service.js';
import { tasksService } from './tasks.sqlite.service.js';
import { documentsRepository } from '../db/mongo/repositories/documents.repository.js';
import { draftSessionsRepository } from '../db/mongo/repositories/draft-sessions.repository.js';
import { docSyncService } from './doc-sync.service.js';

export interface ProductCreationInput {
  name: string;
  code: string;
  description?: string;
  ownerId: string;
  tenantId: string;
  team: string[];
  startDate?: string;
  dueDate?: string;
  tags?: string[];
  vision?: string;
  draftSessionId?: string;
  docs: Record<string, string>;
  epics: Array<{
    title: string;
    description: string;
    tasks: Array<{
      title: string;
      description?: string;
      type?: 'task' | 'bug' | 'story' | 'feature';
      points?: number;
      assigneeId?: string;
    }>;
  }>;
  git?: {
    providerId: string;
    repoOwner: string;
    repoName: string;
    docsPath?: string;
    branchStrategy?: 'direct' | 'pr';
    repoMode?: 'shared' | 'dedicated' | 'code';
  };
}

function buildSteps(input: ProductCreationInput): Array<{ id: string; label: string }> {
  const steps: Array<{ id: string; label: string }> = [
    { id: 'project', label: 'Create project' },
  ];

  const docCount = Object.keys(input.docs).length;
  if (docCount > 0) {
    steps.push({ id: 'docs', label: `Save ${docCount} document${docCount > 1 ? 's' : ''}` });
  }

  if (input.epics.length > 0) {
    steps.push({ id: 'epics', label: `Create ${input.epics.length} epic${input.epics.length > 1 ? 's' : ''}` });

    const taskCount = input.epics.reduce((sum, e) => sum + e.tasks.length, 0);
    if (taskCount > 0) {
      steps.push({ id: 'tasks', label: `Create ${taskCount} task${taskCount > 1 ? 's' : ''}` });
    }
  }

  if (input.team.length > 0) {
    steps.push({ id: 'members', label: `Add ${input.team.length} team member${input.team.length > 1 ? 's' : ''}` });
  }

  if (input.git) {
    steps.push({ id: 'git_link', label: 'Link Git repository' });
    if (docCount > 0) {
      steps.push({ id: 'git_sync', label: 'Sync docs to Git' });
    }
  }

  return steps;
}

export async function startProductCreation(userId: string, input: ProductCreationInput): Promise<Job> {
  const steps = buildSteps(input);
  const job = jobStore.create(userId, 'product_creation', steps);

  // Run async - don't await
  runCreation(job.id, userId, input).catch(err => {
    console.error('[ProductGenerator] Unhandled error:', err);
    jobStore.fail(job.id, err.message || 'Unexpected error');
  });

  return job;
}

async function runCreation(jobId: string, userId: string, input: ProductCreationInput): Promise<void> {
  let projectId: string | null = null;

  const tenantId = input.tenantId;

  // Step 1: Create project
  try {
    jobStore.startStep(jobId, 'project', `Creating "${input.name}"...`);

    const project = await projectsService.create(tenantId, {
      name: input.name,
      code: input.code,
      description: input.description,
      owner_id: input.ownerId,
    });

    projectId = project.id;

    // Store vision in settings if provided
    if (input.vision) {
      await projectsService.update(tenantId, project.id, {
        settings: { vision: input.vision },
      });
    }

    jobStore.completeStep(jobId, 'project', `Project "${input.name}" created`);
  } catch (err: any) {
    jobStore.failStep(jobId, 'project', err.message);
    jobStore.fail(jobId, `Failed to create project: ${err.message}`);
    return;
  }

  // Step 2: Save documents — prefer draft session if available, fallback to input.docs
  let draftSession = input.draftSessionId
    ? await draftSessionsRepository.getById(input.draftSessionId)
    : null;

  // Build doc entries: merge draft sections with input.docs (draft takes priority)
  const docMap = new Map<string, string>();
  for (const [sectionId, content] of Object.entries(input.docs)) {
    if (content) docMap.set(sectionId, content);
  }
  if (draftSession) {
    for (const [sectionId, section] of Object.entries(draftSession.sections)) {
      if (section.content) docMap.set(sectionId, section.content);
    }
  }

  const docEntries = Array.from(docMap.entries());
  if (docEntries.length > 0) {
    jobStore.startStep(jobId, 'docs', `Saving 0/${docEntries.length} documents...`);
    let saved = 0;
    let docFails = 0;

    for (const [sectionId, content] of docEntries) {
      try {
        await documentsRepository.upsert(projectId, sectionId, content);
        saved++;
        jobStore.updateStepDetail(jobId, 'docs', `Saving ${saved}/${docEntries.length} documents...`);
      } catch (err: any) {
        console.error(`[ProductGenerator] Failed to save doc ${sectionId}:`, err.message);
        docFails++;
      }
    }

    if (docFails > 0) {
      jobStore.completeStep(jobId, 'docs', `Saved ${saved}/${docEntries.length} documents (${docFails} failed)`);
    } else {
      jobStore.completeStep(jobId, 'docs', `Saved ${saved} documents`);
    }
  }

  // Step 3: Create epics
  const epicIdMap = new Map<number, string>(); // index -> created epic ID
  if (input.epics.length > 0) {
    jobStore.startStep(jobId, 'epics', `Creating 0/${input.epics.length} epics...`);
    let created = 0;

    for (let i = 0; i < input.epics.length; i++) {
      const epicData = input.epics[i];
      try {
        const epic = tasksService.create({
          project_id: projectId,
          title: epicData.title,
          description: epicData.description,
          type: 'feature',
          reporter_id: input.ownerId,
        });
        epicIdMap.set(i, epic.id);
        created++;
        jobStore.updateStepDetail(jobId, 'epics', `Creating ${created}/${input.epics.length} epics...`);
      } catch (err: any) {
        console.error(`[ProductGenerator] Failed to create epic "${epicData.title}":`, err.message);
      }
    }

    jobStore.completeStep(jobId, 'epics', `Created ${created} epics`);
  }

  // Step 4: Create tasks
  const totalTasks = input.epics.reduce((sum, e) => sum + e.tasks.length, 0);
  if (totalTasks > 0) {
    jobStore.startStep(jobId, 'tasks', `Creating 0/${totalTasks} tasks...`);
    let created = 0;

    for (let i = 0; i < input.epics.length; i++) {
      const epicData = input.epics[i];
      for (const taskData of epicData.tasks) {
        try {
          tasksService.create({
            project_id: projectId,
            title: taskData.title,
            description: taskData.description,
            type: taskData.type || 'task',
            points: taskData.points,
            assignee_id: taskData.assigneeId,
            reporter_id: input.ownerId,
          });
          created++;
          jobStore.updateStepDetail(jobId, 'tasks', `Creating ${created}/${totalTasks} tasks...`);
        } catch (err: any) {
          console.error(`[ProductGenerator] Failed to create task "${taskData.title}":`, err.message);
        }
      }
    }

    jobStore.completeStep(jobId, 'tasks', `Created ${created} tasks`);
  }

  // Step 5: Add team members
  if (input.team.length > 0) {
    jobStore.startStep(jobId, 'members', `Adding team members...`);
    let added = 0;

    for (const memberId of input.team) {
      // Skip owner - they're already the owner
      if (memberId === input.ownerId) continue;
      try {
        await projectsService.addMember(tenantId, projectId, memberId, 'member');
        added++;
      } catch (err: any) {
        // UNIQUE constraint = already a member, not an error
        if (!err.message?.includes('UNIQUE')) {
          console.error(`[ProductGenerator] Failed to add member ${memberId}:`, err.message);
        }
      }
    }

    jobStore.completeStep(jobId, 'members', `Added ${added} team member${added !== 1 ? 's' : ''}`);
  }

  // Step 6: Link Git repository
  if (input.git) {
    try {
      jobStore.startStep(jobId, 'git_link', 'Linking repository...');

      const { gitOperationsService } = await import('./git-operations.service.js');

      // Get repo info
      const repoInfo = await gitOperationsService.getRepository(
        userId,
        input.git.providerId,
        input.git.repoOwner,
        input.git.repoName
      );

      const gitSettings = {
        enabled: true,
        provider_id: input.git.providerId,
        repository: {
          owner: input.git.repoOwner,
          name: input.git.repoName,
          full_name: `${input.git.repoOwner}/${input.git.repoName}`,
          url: repoInfo.html_url,
          default_branch: repoInfo.default_branch,
        },
        docs_path: input.git.docsPath || 'docs/',
        branch_strategy: input.git.branchStrategy || 'direct',
        repo_mode: input.git.repoMode || 'dedicated',
        linked_by_user_id: userId,
        last_sync_at: undefined,
      };

      await projectsService.update(tenantId, projectId, {
        settings: { git: gitSettings },
      });

      jobStore.completeStep(jobId, 'git_link', `Linked to ${input.git.repoOwner}/${input.git.repoName}`);
    } catch (err: any) {
      console.error('[ProductGenerator] Failed to link git repo:', err.message);
      jobStore.failStep(jobId, 'git_link', err.message);
    }

    // Step 7: Sync docs to Git — skip sections already synced by draft session
    if (docEntries.length > 0 && jobStore.get(jobId)?.steps.find(s => s.id === 'git_link')?.status === 'completed') {
      try {
        jobStore.startStep(jobId, 'git_sync', 'Syncing documents to Git...');

        // Re-fetch draft session for latest sync state
        if (input.draftSessionId) {
          draftSession = await draftSessionsRepository.getById(input.draftSessionId);
        }

        // Filter to only un-synced sections
        const syncedSections = new Set<string>();
        if (draftSession) {
          for (const [sectionId, section] of Object.entries(draftSession.sections)) {
            if (section.synced_to_git) syncedSections.add(sectionId);
          }
        }

        const unsyncedDocs = docEntries
          .filter(([sectionId]) => !syncedSections.has(sectionId))
          .map(([sectionId, content]) => ({ section_id: sectionId, content }));

        if (unsyncedDocs.length > 0) {
          const result = await docSyncService.pushDocuments(tenantId, projectId, userId, unsyncedDocs, {
            commitMessage: `docs: initial product documentation for ${input.name}`,
          });
          const successCount = result.results.filter(r => r.success).length;
          jobStore.completeStep(jobId, 'git_sync', `Synced ${successCount}/${unsyncedDocs.length} documents to Git (${syncedSections.size} already synced)`);
        } else {
          // All docs already synced via draft — push a final TOC update
          jobStore.completeStep(jobId, 'git_sync', `All ${syncedSections.size} documents already synced to Git`);
        }
      } catch (err: any) {
        console.error('[ProductGenerator] Failed to sync docs to git:', err.message);
        jobStore.failStep(jobId, 'git_sync', err.message);
      }
    }

    // Cleanup: delete draft session after successful migration
    if (input.draftSessionId) {
      try {
        await draftSessionsRepository.delete(input.draftSessionId);
      } catch (err: any) {
        console.warn('[ProductGenerator] Failed to cleanup draft session:', err.message);
      }
    }
  }

  // Calculate result summary
  const epicCount = epicIdMap.size;
  const taskCount = input.epics.reduce((sum, e) => sum + e.tasks.length, 0);

  jobStore.complete(jobId, {
    projectId,
    name: input.name,
    epicsCreated: epicCount,
    tasksCreated: taskCount,
    docsCreated: docEntries.length,
    membersAdded: input.team.filter(m => m !== input.ownerId).length,
  });
}
