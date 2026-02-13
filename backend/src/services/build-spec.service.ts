import database from '../lib/database.js';
import githubSyncService from './github-sync.service.js';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface ProjectSpec {
  project: any;
  tasks: any[];
  sprints: any[];
}

const DOC_LABELS: Record<string, string> = {
  prd: 'Product Requirements Document (PRD)',
  roadmap: 'Roadmap',
  modules: 'Modules & Features',
  business: 'Business Logic',
  data: 'Data Schema',
  app: 'App Structure',
  tech: 'Tech Stack',
  'design-guidelines': 'Design Guidelines',
  design: 'Design System',
  adrs: 'Architecture Decision Records (ADRs)',
  specs: 'Technical Specifications',
  'user-flows': 'User Flows',
  'biz-flow': 'Business Flows',
  'sys-flow': 'System Flows',
  integrations: 'Integrations',
};

// Order matters — most architecturally important docs first
const DOC_ORDER = [
  'tech', 'app', 'data', 'prd', 'modules', 'business',
  'design', 'design-guidelines', 'user-flows', 'sys-flow',
  'biz-flow', 'integrations', 'adrs', 'specs', 'roadmap',
];

function convertDoc(html: string): string {
  if (!html || !html.trim()) return '';
  return githubSyncService.convertHtmlToMarkdown(html).trim();
}

function compileSpec(spec: ProjectSpec): string {
  const { project, tasks, sprints } = spec;
  const docs: Record<string, string> = project.docs || {};

  const sections: string[] = [];

  // Header
  sections.push(`# ${project.name} — Project Specification\n`);

  // Project overview
  sections.push(`## Project Overview\n`);
  sections.push(`- **Code**: ${project.code}`);
  if (project.description) sections.push(`- **Description**: ${project.description}`);
  if (project.category) sections.push(`- **Category**: ${project.category}`);
  if (project.target_audience) sections.push(`- **Target Audience**: ${project.target_audience}`);
  if (project.lifecycle_stage) sections.push(`- **Lifecycle Stage**: ${project.lifecycle_stage}`);
  sections.push('');

  // Vision (top-level field, stored as plain text)
  if (project.vision?.trim()) {
    sections.push(`## Product Vision\n`);
    sections.push(project.vision.trim());
    sections.push('');
  }

  // Top-level PRD field (may differ from docs.prd)
  if (project.prd?.trim()) {
    const prdMd = convertDoc(project.prd);
    if (prdMd) {
      sections.push(`## PRD (Product Requirements)\n`);
      sections.push(prdMd);
      sections.push('');
    }
  }

  // All document sections in priority order
  for (const key of DOC_ORDER) {
    const content = docs[key];
    if (!content?.trim()) continue;
    // Skip if this is prd and we already added the top-level one
    if (key === 'prd' && project.prd?.trim()) continue;

    const md = convertDoc(content);
    if (!md) continue;

    const label = DOC_LABELS[key] || key.toUpperCase();
    sections.push(`## ${label}\n`);
    sections.push(md);
    sections.push('');
  }

  // Any doc keys not in our predefined order
  for (const [key, content] of Object.entries(docs)) {
    if (DOC_ORDER.includes(key)) continue;
    if (!content?.trim()) continue;
    const md = convertDoc(content);
    if (!md) continue;

    const label = DOC_LABELS[key] || key.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    sections.push(`## ${label}\n`);
    sections.push(md);
    sections.push('');
  }

  // Epics & work items
  const epics = tasks.filter(t => t.type === 'epic');
  const workItems = tasks.filter(t => t.type !== 'epic');

  if (epics.length > 0 || workItems.length > 0) {
    sections.push(`## Epics & Work Items\n`);

    for (const epic of epics) {
      sections.push(`### Epic: ${epic.title}`);
      if (epic.description) sections.push(convertDoc(epic.description) || epic.description);
      sections.push('');

      const children = workItems.filter(t => t.parent_epic_id?.toString() === epic._id?.toString());
      for (const child of children) {
        sections.push(formatWorkItem(child));
      }
      sections.push('');
    }

    // Orphan work items (not under any epic)
    const epicIds = new Set(epics.map(e => e._id?.toString()));
    const orphans = workItems.filter(t => !t.parent_epic_id || !epicIds.has(t.parent_epic_id?.toString()));
    if (orphans.length > 0) {
      sections.push(`### Additional Work Items\n`);
      for (const item of orphans) {
        sections.push(formatWorkItem(item));
      }
      sections.push('');
    }
  }

  // Sprint context
  const activeSprints = sprints.filter(s => s.status === 'active' || s.status === 'planned');
  if (activeSprints.length > 0) {
    sections.push(`## Sprint Context\n`);
    for (const sprint of activeSprints) {
      const sprintTasks = workItems.filter(t => t.sprint_id?.toString() === sprint._id?.toString());
      sections.push(`- **${sprint.name}** (${sprint.status}): ${sprint.goal || 'No goal set'} — ${sprintTasks.length} items`);
    }
    sections.push('');
  }

  // Build instructions for Claude Code
  sections.push(`## Build Instructions

Based on ALL the specifications above, generate a complete, production-ready, buildable project.

### What to Generate
1. **Project setup** — package.json with all dependencies, tsconfig.json, vite/webpack config, .env.example
2. **Source code** — All components, pages, API routes, services, models, middleware, utilities
3. **Database** — Schema definitions, seed scripts, and migrations based on the Data Schema section
4. **Styling** — Follow the Design System and Design Guidelines sections exactly
5. **README.md** — Setup instructions, environment variables, and how to run

### Folder Structure Guidelines

Keep the codebase clean and well-organized. Use this structure (adapt based on the Tech Stack section):

\`\`\`
project-root/
├── src/
│   ├── components/          # Reusable UI components (one component per file)
│   │   ├── ui/              # Generic UI primitives (Button, Input, Modal, etc.)
│   │   ├── layout/          # Layout components (Header, Sidebar, Footer)
│   │   └── [feature]/       # Feature-specific components grouped by domain
│   ├── pages/               # Route-level page components (one per route)
│   ├── hooks/               # Custom React hooks
│   ├── context/             # React context providers
│   ├── services/            # API client functions (one file per resource)
│   ├── lib/                 # Utility functions, helpers, constants
│   ├── types/               # TypeScript type definitions and interfaces
│   ├── styles/              # Global styles, theme, CSS variables
│   └── assets/              # Static assets (images, fonts, icons)
├── backend/                 # If fullstack (skip if frontend-only)
│   └── src/
│       ├── routes/          # Express route handlers (one file per resource)
│       ├── services/        # Business logic layer (one file per domain)
│       ├── models/          # Database models/schemas
│       ├── middleware/       # Express middleware (auth, validation, error handling)
│       ├── config/          # Environment config, constants
│       ├── lib/             # Database client, external service clients
│       └── utils/           # Shared utility functions
├── public/                  # Static public files
└── scripts/                 # Build, seed, migration scripts
\`\`\`

### Code Organization Rules
- **One responsibility per file** — each file should do one thing well
- **Group by feature, not by type** — keep related components, hooks, and services together when they belong to a single feature
- **Index files for clean imports** — use barrel exports (index.ts) in component directories
- **Separate concerns** — routes call services, services call models, never skip layers
- **No god files** — if a file exceeds ~300 lines, split it into smaller modules
- **Consistent naming** — PascalCase for components, camelCase for utilities, kebab-case for files
- **Co-locate tests** — place test files next to the code they test (Component.test.tsx)

### Code Quality Rules
- Generate EVERY file needed for the project to compile and run
- Use the tech stack specified in the Tech Stack section. If none specified, default to: React + TypeScript + Vite (frontend), Node.js + Express + TypeScript (backend)
- Follow the App Structure section for directory layout if one is provided; otherwise use the structure above
- Implement real business logic, not stubs or placeholders
- Include proper error handling, input validation, and TypeScript types throughout
- Create working API endpoints that match the specifications
- Ensure all imports are correct and files reference each other properly
- Write clean, production-quality code without unnecessary comments
- Use environment variables for all secrets and configuration (never hardcode)
- Add proper TypeScript interfaces for all data shapes — no \`any\` types
`);

  return sections.join('\n');
}

function formatWorkItem(task: any): string {
  const parts: string[] = [];
  const type = (task.type || 'task').toUpperCase();
  const priority = task.priority || 'MEDIUM';
  const points = task.points != null ? ` | ${task.points} pts` : '';

  parts.push(`- **[${type}]** ${task.title} *(Priority: ${priority}${points})*`);

  if (task.description) {
    const desc = convertDoc(task.description) || task.description;
    const trimmed = desc.split('\n').map((l: string) => `  ${l}`).join('\n');
    parts.push(trimmed);
  }

  if (task.acceptance_criteria?.length) {
    parts.push(`  **Acceptance Criteria:**`);
    for (const ac of task.acceptance_criteria) {
      parts.push(`  - ${ac}`);
    }
  }

  if (task.blocked_by?.length) {
    parts.push(`  *Blocked by:* ${task.blocked_by.join(', ')}`);
  }
  if (task.blocks?.length) {
    parts.push(`  *Blocks:* ${task.blocks.join(', ')}`);
  }

  return parts.join('\n');
}

export const buildSpecService = {
  async generateSpec(projectId: string): Promise<{ content: string; fileName: string }> {
    const project = await database.findById<any>('projects', projectId);
    if (!project) throw new Error('Project not found');

    const tasks = await database.findMany<any>('tasks', { project_id: projectId });
    const sprints = await database.findMany<any>('sprints', { project_id: projectId });

    const hasDocs = project.docs && Object.values(project.docs).some((v: any) => v?.trim());
    const hasVision = project.vision?.trim();
    const hasPrd = project.prd?.trim();
    const hasTasks = tasks.length > 0;

    if (!hasDocs && !hasVision && !hasPrd && !hasTasks) {
      throw new Error('No specifications found. Generate docs or add tasks to this project first.');
    }

    const content = compileSpec({ project, tasks, sprints });
    const code = (project.code || project.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const fileName = `${code}-spec.md`;

    return { content, fileName };
  },

  /**
   * Save spec as CLAUDE.md on Desktop and open Claude Code in Terminal
   */
  async launchClaudeCode(projectId: string): Promise<{ projectDir: string; projectName: string }> {
    const { content } = await this.generateSpec(projectId);

    // Get project name for folder
    const project = await database.findById<any>('projects', projectId);
    const folderName = (project.name || 'project').replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '-');

    // Create ~/Desktop/{project-name}/
    const desktopDir = path.join(os.homedir(), 'Desktop');
    const projectDir = path.join(desktopDir, folderName);
    await fs.mkdir(projectDir, { recursive: true });

    // Write CLAUDE.md
    const claudeMdPath = path.join(projectDir, 'CLAUDE.md');
    await fs.writeFile(claudeMdPath, content, 'utf-8');

    // Open Terminal.app with claude in that directory (macOS)
    // Use single quotes around the path inside the shell command to avoid AppleScript quote conflicts
    const shellSafePath = projectDir.replace(/'/g, "'\\''");
    const appleScript = 'tell application "Terminal"\n  activate\n  do script "cd \'' + shellSafePath + '\' && claude"\nend tell';

    await new Promise<void>((resolve) => {
      execFile('osascript', ['-e', appleScript], (err) => {
        if (err) console.error('Failed to open Terminal:', err.message);
        resolve();
      });
    });

    return { projectDir, projectName: project.name };
  },
};
