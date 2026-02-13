// Centralized AI prompt template references
// Functions return { templateName, variables } for backend resolution from DB.
// Data-transformation utilities (copilotContext, formatResearchContext) remain as code.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromptRequest {
  templateName: string;
  variables: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Research context formatter (data transformation — stays in code)
// ---------------------------------------------------------------------------

export interface ResearchReportData {
  competitiveLandscape: string;
  marketTrends: string;
  userInsights: string;
  technicalContext: string;
  keyFindings: string[];
  sources: { title: string; url: string }[];
}

/** Format a research report into a context block for injection into prompts */
export function formatResearchContext(report: ResearchReportData): string {
  const findings = report.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n');
  const sources = report.sources.map(s => `- ${s.title}: ${s.url}`).join('\n');

  return `
## COMPETITIVE RESEARCH (from web search)

### Competitive Landscape
${report.competitiveLandscape}

### Market Trends
${report.marketTrends}

### User Insights
${report.userInsights}

### Technical Context
${report.technicalContext}

### Key Findings
${findings}

### Sources
${sources}
`.trim();
}

// ---------------------------------------------------------------------------
// ProductGeneratorModal prompts
// ---------------------------------------------------------------------------

/** Step 1 — import mode: analyse an uploaded document */
export function analyzeImportedDocument(content: string, researchContext?: string): PromptRequest {
  return {
    templateName: 'analyze_imported_document',
    variables: {
      content: content.substring(0, 150000),
      ...(researchContext ? { researchContext } : {}),
    },
  };
}

/** Step 1 — scratch mode: analyse a product concept from name/desc/tags */
export function analyzeProductConcept(productName: string, description: string, tags: string, researchContext?: string): PromptRequest {
  return {
    templateName: 'analyze_product_concept',
    variables: {
      productName,
      description: description || 'No specific description provided, please infer from name and tags.',
      tags: tags || '',
      ...(researchContext ? { researchContext } : {}),
    },
  };
}

/** Vision step: generate 3 more strategic suggestions */
export function generateMoreSuggestions(productName: string, visionSummary: string): PromptRequest {
  return {
    templateName: 'generate_more_suggestions',
    variables: {
      productName,
      visionSummary: visionSummary.substring(0, 500),
    },
  };
}

/** Step 2 — generate the main PRD document (markdown) */
export function generatePRD(productName: string, context: string, researchContext?: string): PromptRequest {
  return {
    templateName: 'generate_prd',
    variables: {
      productName,
      context,
      ...(researchContext ? { researchContext } : {}),
    },
  };
}

/** Step 2 — generate an individual doc section (loop + retry) */
export function generateDocSection(sectionLabel: string, context: string, researchContext?: string): PromptRequest {
  return {
    templateName: 'generate_doc_section',
    variables: {
      sectionLabel,
      context,
      ...(researchContext ? { researchContext } : {}),
    },
  };
}

/** Step 3 — generate a full project plan with epics and tasks */
export function generateProjectPlan(contextToUse: string, researchContext?: string): PromptRequest {
  const trimmedContext = contextToUse.length > 6000
    ? contextToUse.substring(0, 5000) + '\n\n[...truncated for brevity]'
    : contextToUse;

  return {
    templateName: 'generate_project_plan',
    variables: {
      contextToUse: trimmedContext,
      ...(researchContext ? { researchContext } : {}),
    },
  };
}

/** Step 3b — generate epics for a specific category (batch mode) */
export function generateCategoryEpics(
  category: {
    name: string;
    display_name: string;
    description: string;
    minimum_tasks: number;
    prompt_guidance: string;
  },
  prdContext: string,
  docSummaries?: string,
  researchContext?: string
): PromptRequest {
  return {
    templateName: 'generate_category_epics',
    variables: {
      categoryName: category.display_name,
      categoryDescription: category.description,
      categoryGuidance: category.prompt_guidance,
      minimumTasks: category.minimum_tasks.toString(),
      prdContext: prdContext.substring(0, 4000), // Truncate per-category to stay within limits
      ...(docSummaries ? { docSummaries } : {}),
      ...(researchContext ? { researchContext } : {}),
    },
  };
}

/** Step 4 — generate tasks for a specific epic via AI */
export function generateTasksForEpic(epicTitle: string, requirement: string, referenceContext?: string): PromptRequest {
  return {
    templateName: 'generate_tasks_for_epic',
    variables: {
      epicTitle,
      requirement,
      ...(referenceContext ? { referenceContext } : {}),
    },
  };
}

/** Chat — refine the product vision based on user feedback */
export function refineVision(currentVision: string, userRequest: string): PromptRequest {
  return {
    templateName: 'refine_vision',
    variables: { currentVision, userRequest },
  };
}

/** Chat — edit a doc section inside the wizard */
export function editDocSection(sectionName: string, currentContent: string, userRequest: string): PromptRequest {
  return {
    templateName: 'edit_doc_section',
    variables: { sectionName, currentContent, userRequest },
  };
}

/** Chat — edit the plan structure (epics/tasks) */
export function editPlanStructure(currentEpicsJson: string, userRequest: string): PromptRequest {
  return {
    templateName: 'edit_plan_structure',
    variables: { currentEpicsJson, userRequest },
  };
}

// ---------------------------------------------------------------------------
// PRDView prompt
// ---------------------------------------------------------------------------

/** PRDView / DocumentsView — AI-assisted section editing */
export function editPRDSection(sectionName: string, currentContent: string, prompt: string): PromptRequest {
  return {
    templateName: 'edit_prd_section',
    variables: { sectionName, currentContent, prompt },
  };
}

// ---------------------------------------------------------------------------
// CreateTaskModal prompt
// ---------------------------------------------------------------------------

/** Generate a new task from a natural-language description */
export function generateTask(aiPrompt: string, taskType: string, isEpic: boolean): PromptRequest {
  return {
    templateName: 'generate_task',
    variables: {
      aiPrompt,
      taskType,
      isEpic: isEpic ? 'true' : '',
    },
  };
}

// ---------------------------------------------------------------------------
// TaskDetailModal prompt
// ---------------------------------------------------------------------------

/** Update / enrich an existing task via AI */
export function updateTask(aiPrompt: string, taskType: string, isEpic: boolean): PromptRequest {
  return {
    templateName: 'update_task',
    variables: {
      aiPrompt,
      taskType,
      isEpic: isEpic ? 'true' : '',
    },
  };
}

// ---------------------------------------------------------------------------
// CopilotModal prompts
// ---------------------------------------------------------------------------

export interface CopilotWorkspaceData {
  currentUserName: string;
  projectCount: number;
  projectsList: string;
  activeSprintsList: string;
  taskCount: number;
  blockedCount: number;
  highPriorityCount: number;
  taskSnapshot: string;
}

/** Build the workspace-context block for the copilot (data transformation — stays in code) */
export function copilotContext(data: CopilotWorkspaceData): string {
  return `
WORKSPACE DATA:
Current User: ${data.currentUserName}
Total Projects: ${data.projectCount}
Projects: ${data.projectsList}
Active Sprints: ${data.activeSprintsList}
Total Tasks: ${data.taskCount}
Blocked Tasks: ${data.blockedCount}
High Priority Tasks: ${data.highPriorityCount}
Recent Tasks (30):
${data.taskSnapshot}
  `;
}

/** Static tools definition text for the copilot (stays in frontend, passed as variable to build_copilot_prompt) */
export function copilotToolsDef(): string {
  return `AVAILABLE TOOLS (respond with JSON when using):

1. create_task: Create a new task
   { "tool": "create_task", "args": { "title": "string", "type": "task|bug|story", "priority": "LOW|MEDIUM|HIGH|CRITICAL", "points": number, "description": "string" } }

2. show_blockers: Show all blocked tasks
   { "tool": "show_blockers" }

3. summarize_status: Summarize project/sprint status
   { "tool": "summarize_status", "args": { "summary": "markdown summary text", "stats": { "total": n, "done": n, "inProgress": n, "blocked": n } } }

4. create_epic: Create an epic with tasks
   { "tool": "create_epic", "args": { "title": "string", "description": "string", "tasks": [{ "title": "string", "type": "task", "points": n }] } }

5. plan_sprint: Create a sprint plan
   { "tool": "plan_sprint", "args": { "name": "string", "goal": "string", "duration": "2 weeks", "tasks": ["task ids or titles"] } }

INSTRUCTIONS:
- For questions, answer directly using WORKSPACE DATA
- For actions (create, show, summarize), return the appropriate tool JSON
- Be concise but helpful
- Output ONLY valid JSON when using tools, nothing else before or after`;
}

/** Assemble the full copilot prompt from context + tools + history + query */
export function buildCopilotPrompt(context: string, tools: string, historyLines: string, query: string): PromptRequest {
  return {
    templateName: 'build_copilot_prompt',
    variables: { context, tools, historyLines, query },
  };
}
