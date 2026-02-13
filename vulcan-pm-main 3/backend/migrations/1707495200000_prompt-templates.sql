-- Prompt Templates Migration
-- Stores AI prompt templates in the database for admin management, versioning, and runtime resolution.

CREATE TABLE IF NOT EXISTS prompt_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    template_body TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_name ON prompt_templates(name);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_active ON prompt_templates(is_active);

CREATE TABLE IF NOT EXISTS prompt_template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES prompt_templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    template_body TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]',
    metadata JSONB NOT NULL DEFAULT '{}',
    change_note TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, version)
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_template ON prompt_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_lookup ON prompt_template_versions(template_id, version DESC);

-- =====================================================
-- SEED: All 17 prompt templates
-- =====================================================

-- 1. analyze_imported_document
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'analyze_imported_document',
    'Analyze Imported Document',
    'product_generator',
    'Vision step (import mode): Analyze an uploaded document to extract a structured product concept.',
    $$Act as a Chief Product Officer and Visionary Architect.
Analyze the provided document content below. Treat this text as the absolute truth source for the product.

DOCUMENT CONTENT:
{{content}}
{{#if researchContext}}
{{researchContext}}
{{/if}}
Tasks:
1. Extract the product name from the document (or infer a professional one).
2. **Preserve and Enhance the Product Vision**:
   - **Do NOT summarize or shorten**. Keep ALL original details, features, and specifications.
   - EXPAND on the existing content with additional professional insights.
   - Maintain the full depth and richness of the original document.
   - Add structure and clarity while preserving every detail.
   - The 'vision' should be comprehensive and AT LEAST as detailed as the source (aim for 500+ words).
3. Extract the main Description or purpose as a concise elevator pitch.
4. Extract ALL key pillars, capabilities, and features mentioned.
5. Brainstorm 5 strategic suggestions to further enhance the product.

Output the response in STRICT JSON format with the following keys:
{
  "productName": "string",
  "description": "string (concise elevator pitch)",
  "vision": "string (comprehensive, detailed - preserve ALL original content and enhance)",
  "suggestions": [
    { "title": "string", "description": "string", "type": "feature" }
  ]
}$$,
    '[{"name":"content","description":"Uploaded document text content (truncated to 150k chars)","required":true},{"name":"researchContext","description":"Formatted competitive research context block","required":false}]',
    '{"response_format":"json"}'
) ON CONFLICT (name) DO NOTHING;

-- 2. analyze_product_concept
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'analyze_product_concept',
    'Analyze Product Concept',
    'product_generator',
    'Vision step (scratch mode): Transform a product concept (name, description, tags) into a full product blueprint.',
    $$Act as a Chief Product Officer and Visionary Architect.
Analyze this product concept:
- Product Name: {{productName}}
- Raw Description: {{description}}
- Tags: {{tags}}
{{#if researchContext}}
{{researchContext}}
{{/if}}
Tasks:
1. **Develop a Detailed Product Vision & Strategy**:
   - **Do NOT summarize**. Expand on the input ideas significantly.
   - Create a compelling narrative that defines the core value proposition.
   - Describe the Target Audience and the specific pain points solved.
   - Outline the User Experience and the "Magic Moment".
   - Articulate the Technical Innovation and Long-term Impact.
   - The 'vision' text should be substantial, professional, and inspiring (approx 200-300 words).

2. **Strategic Suggestions**:
   - Brainstorm 5 specific, high-impact strategic suggestions (Features, Monetization models, Growth hacks, or UX differentiators).

Output strictly in this JSON format:
{
  "productName": "Refined Name (if appropriate)",
  "description": "A concise 1-sentence elevator pitch.",
  "vision": "The full detailed vision text...",
  "suggestions": [
    { "title": "Short Title", "description": "One sentence explanation", "type": "feature" }
  ]
}$$,
    '[{"name":"productName","description":"Product name","required":true},{"name":"description","description":"Raw product description","required":false},{"name":"tags","description":"Product tags/categories","required":false},{"name":"researchContext","description":"Formatted competitive research context block","required":false}]',
    '{"response_format":"json"}'
) ON CONFLICT (name) DO NOTHING;

-- 3. generate_more_suggestions
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'generate_more_suggestions',
    'Generate More Suggestions',
    'product_generator',
    'Vision step: Generate 3 additional strategic suggestions for the product.',
    $$Product: {{productName}}
Current Vision Summary: {{visionSummary}}...

Generate 3 NEW, distinct strategic suggestions (features, monetization, or market angles) that might improve this product.

Output valid JSON with format:
{
  "suggestions": [
    { "title": "Title", "description": "Desc", "type": "feature" }
  ]
}$$,
    '[{"name":"productName","description":"Product name","required":true},{"name":"visionSummary","description":"First ~500 chars of the refined vision","required":true}]',
    '{"response_format":"json"}'
) ON CONFLICT (name) DO NOTHING;

-- 4. generate_prd
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'generate_prd',
    'Generate PRD',
    'product_generator',
    'Documentation step: Generate a comprehensive Product Requirements Document in markdown.',
    $$Role: Chief Product Architect.
Task: Generate a comprehensive Product Requirements Document (PRD) for: {{productName}}.
Context Summary: {{context}}
{{#if researchContext}}
{{researchContext}}
Use the research data to reference real competitors, market data, and user insights in the PRD.
{{/if}}

**OUTPUT FORMAT:**
- Output clean GitHub-Flavored Markdown (GFM).
- Use ## for section headers, ### for subsections.
- Use markdown tables (| header | header |) for structured data.
- Use **bold** for emphasis, bullet lists for enumerations.
- Use > blockquotes for key statements or callouts.
- Do NOT output HTML tags or Tailwind CSS classes.

**STRUCTURE:**
1. ## Executive Summary
   - A concise overview of the product, its purpose, and core value proposition.
2. ## Problem Statement & Context
   - Describe the current pain points and the future state after the product ships.
3. ## Goals & Non-Goals
   - Use a table or bullet lists to clearly separate goals from non-goals.
4. ## User Personas
   - Describe 2-4 key personas with their role, pain points, and goals.
5. ## Functional Requirements
   - **MUST** be a detailed markdown table: | ID | Feature Name | Priority | Description |
6. ## Technical Architecture
   - Include a Mermaid architecture diagram showing major components and their relationships.
7. ## Rollout Strategy
   - Timeline or phased list.

**DIAGRAM INSTRUCTIONS:**
- Include Mermaid diagrams using fenced code blocks: ```mermaid
- Supported types: flowchart TD/LR, sequenceDiagram, erDiagram, classDiagram, stateDiagram-v2, pie, gantt, mindmap, timeline.
- Keep diagram code clean — only valid Mermaid syntax inside the block.
- Do NOT use placeholder boxes, ASCII art, or dashed-border divs for diagrams — always use Mermaid.$$,
    '[{"name":"productName","description":"Product name","required":true},{"name":"context","description":"Vision context summary (product name, description, vision, tags)","required":true},{"name":"researchContext","description":"Formatted competitive research context block","required":false}]',
    '{"response_format":"text"}'
) ON CONFLICT (name) DO NOTHING;

-- 5. generate_doc_section
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'generate_doc_section',
    'Generate Document Section',
    'product_generator',
    'Documentation step: Generate an individual document section (Roadmap, Business Architecture, Design, etc.).',
    $$Role: Chief Product Architect.
Task: Generate the "{{sectionLabel}}" document.
Context Summary: {{context}}
{{#if researchContext}}
{{researchContext}}
Leverage the research data to ground this document in real market context.
{{/if}}

**OUTPUT FORMAT:**
- Output clean GitHub-Flavored Markdown (GFM).
- Use ## for section headers, ### for subsections.
- Use markdown tables (| header | header |) for structured data.
- Use **bold** for emphasis, bullet lists for enumerations.
- Use > blockquotes for key statements or callouts.
- Do NOT output HTML tags or Tailwind CSS classes.

**DIAGRAM INSTRUCTIONS:**
- Include Mermaid diagrams using fenced code blocks: ```mermaid
- Supported types: flowchart TD/LR, sequenceDiagram, erDiagram, classDiagram, stateDiagram-v2, pie, gantt, mindmap, timeline.
- Keep diagram code clean — only valid Mermaid syntax inside the block.
- Do NOT use placeholder boxes, ASCII art, or dashed-border divs for diagrams — always use Mermaid.$$,
    '[{"name":"sectionLabel","description":"Name of the document section to generate","required":true},{"name":"context","description":"Vision context summary","required":true},{"name":"researchContext","description":"Formatted competitive research context block","required":false}]',
    '{"response_format":"text"}'
) ON CONFLICT (name) DO NOTHING;

-- 6. generate_project_plan
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'generate_project_plan',
    'Generate Project Plan',
    'product_generator',
    'Planning step: Generate a full project plan with epics and granular tasks from the PRD context.',
    $$Role: Senior Technical Lead & Project Architect.
Task: Create a highly detailed, exhaustive project execution plan based on the provided documentation.

DOCUMENTATION CONTEXT:
{{contextToUse}}
{{#if researchContext}}
{{researchContext}}
Consider competitive urgency and market timing when prioritizing tasks.
{{/if}}

STRICT REQUIREMENTS:
1. **Granularity**: Break down features into the "minutest" possible jobs (Atomic Developer Tasks).
   - BAD: "Build Authentication"
   - GOOD: "Setup Users Table", "Create Login API Endpoint", "Implement JWT Logic", "Build Login UI Form", "Add Form Validation".
2. **Completeness**: Do NOT limit the number of Epics or Tasks. Generate as many as required to build the full product described in the context.
3. **Structure**: Group tasks logically into Epics.
4. **Task Types**: Distinguish between 'story' (user value), 'task' (technical chore/setup), and 'bug' (if noted).
5. **Estimates**: Provide points (1, 2, 3, 5, 8) for each task. Small atomic tasks should be 1 or 2 points.
6. **Descriptions**: For each task, generate a rich markdown description containing:
   - **User Story**: (If applicable) "As a user..."
   - **Implementation Details**: Specific steps, libraries, or logic to be used.
   - **Acceptance Criteria**: A bulleted list of what defines "Done".

CRITICAL OUTPUT INSTRUCTIONS:
- Output ONLY valid JSON, nothing else.
- Do NOT include any thinking, reasoning, or explanation.
- Do NOT wrap the JSON in markdown code blocks.
- Do NOT include <think> tags or any other XML tags.
- Start your response directly with the opening brace {

STRICT JSON RULES:
- The root object MUST have an "epics" key containing an array.
- Each epic MUST have "title" (string), "description" (string), and "tasks" (array).
- Each task MUST have "title", "description", "type", "points", and "role".
- Do NOT include any text outside the JSON object.
- Do NOT use trailing commas.
- Ensure all strings are properly escaped (no unescaped newlines or quotes).

OUTPUT FORMAT (return exactly this structure):
{
  "epics": [
    {
        "title": "Epic Title",
        "description": "High level summary...",
        "tasks": [
            {
                "title": "Setup Database Schema for Users",
                "description": "**Implementation:** Create migration file.\n\n**Criteria:**\n- Schema validated\n- Types generated",
                "type": "task",
                "points": 2,
                "role": "Backend"
            }
        ]
    }
  ]
}$$,
    '[{"name":"contextToUse","description":"PRD and documentation context (pre-truncated to ~6000 chars)","required":true},{"name":"researchContext","description":"Formatted competitive research context block","required":false}]',
    '{"response_format":"json"}'
) ON CONFLICT (name) DO NOTHING;

-- 7. generate_tasks_for_epic
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'generate_tasks_for_epic',
    'Generate Tasks for Epic',
    'product_generator',
    'Planning step: Generate specific atomic tasks within an epic based on a user requirement.',
    $$Act as a Technical Lead.
We are breaking down work for the Epic: "{{epicTitle}}".
User Requirement: "{{requirement}}"
{{#if referenceContext}}
Reference Context: {{referenceContext}}
{{/if}}

Generate a list of specific, actionable tasks based on the requirement.
Break them down into atomic units (e.g. separate tasks for DB schema, API, and UI).

OUTPUT FORMAT:
Return strictly a JSON object with a key "tasks" containing an array.
{
  "tasks": [
    {
      "title": "Task Title",
      "type": "task",
      "points": 2,
      "role": "Frontend",
      "description": "**Details:** Implementation notes and acceptance criteria in markdown."
    }
  ]
}$$,
    '[{"name":"epicTitle","description":"Title of the parent epic","required":true},{"name":"requirement","description":"User requirement or AI prompt text","required":true},{"name":"referenceContext","description":"Optional reference document context","required":false}]',
    '{"response_format":"json"}'
) ON CONFLICT (name) DO NOTHING;

-- 8. refine_vision
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'refine_vision',
    'Refine Vision',
    'product_generator',
    'Chat: Rewrite the product vision based on user feedback.',
    $$Current Vision: "{{currentVision}}"
User Request: "{{userRequest}}"
Rewrite the vision statement based on the request. Return only the updated vision text.$$,
    '[{"name":"currentVision","description":"The current product vision text","required":true},{"name":"userRequest","description":"User feedback or edit request","required":true}]',
    '{"response_format":"text"}'
) ON CONFLICT (name) DO NOTHING;

-- 9. edit_doc_section
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'edit_doc_section',
    'Edit Document Section',
    'product_generator',
    'Chat: Edit a specific document section based on user request inside the wizard.',
    $$You are editing the "{{sectionName}}" section of a PRD.
Current Content (Markdown): {{currentContent}}
User Request: "{{userRequest}}"

Return the FULL updated markdown for this section based on the request.

**OUTPUT FORMAT:**
- Output clean GitHub-Flavored Markdown (GFM).
- Use ## for section headers, ### for subsections.
- Use markdown tables (| header | header |) for structured data.
- Use **bold** for emphasis, bullet lists for enumerations.
- Use > blockquotes for key statements or callouts.
- Do NOT output HTML tags or Tailwind CSS classes.

**DIAGRAM INSTRUCTIONS:**
- Include Mermaid diagrams using fenced code blocks: ```mermaid
- Supported types: flowchart TD/LR, sequenceDiagram, erDiagram, classDiagram, stateDiagram-v2, pie, gantt, mindmap, timeline.
- Keep diagram code clean — only valid Mermaid syntax inside the block.
- Do NOT use placeholder boxes, ASCII art, or dashed-border divs for diagrams — always use Mermaid.$$,
    '[{"name":"sectionName","description":"Name of the document section being edited","required":true},{"name":"currentContent","description":"Current markdown content of the section","required":true},{"name":"userRequest","description":"User edit request","required":true}]',
    '{"response_format":"text"}'
) ON CONFLICT (name) DO NOTHING;

-- 10. edit_plan_structure
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'edit_plan_structure',
    'Edit Plan Structure',
    'product_generator',
    'Chat: Modify the epic/task structure (add, rename, remove) based on user request.',
    $$Current Epics JSON: {{currentEpicsJson}}
User Request: "{{userRequest}}"

Update the plan structure based on the request (e.g. add a task to all epics, rename epics, remove bugs).
Return the FULL updated JSON array of Epics.$$,
    '[{"name":"currentEpicsJson","description":"JSON string of current epics array","required":true},{"name":"userRequest","description":"User edit request for the plan","required":true}]',
    '{"response_format":"json"}'
) ON CONFLICT (name) DO NOTHING;

-- 11. edit_prd_section
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'edit_prd_section',
    'Edit PRD Section',
    'document',
    'PRDView / DocumentsView: AI-assisted section editing in the PRD editor.',
    $$You are an expert Product Manager and Technical Architect.
Your task is to update or generate the "{{sectionName}}" section of a PRD based on the user's request.

CURRENT CONTENT (Markdown):
{{currentContent}}

USER INSTRUCTION:
{{prompt}}

REQUIREMENTS:
1. Return the FULL updated markdown for this section.

**OUTPUT FORMAT:**
- Output clean GitHub-Flavored Markdown (GFM).
- Use ## for section headers, ### for subsections.
- Use markdown tables (| header | header |) for structured data.
- Use **bold** for emphasis, bullet lists for enumerations.
- Use > blockquotes for key statements or callouts.
- Do NOT output HTML tags or Tailwind CSS classes.

**DIAGRAM INSTRUCTIONS:**
- Include Mermaid diagrams using fenced code blocks: ```mermaid
- Supported types: flowchart TD/LR, sequenceDiagram, erDiagram, classDiagram, stateDiagram-v2, pie, gantt, mindmap, timeline.
- Keep diagram code clean — only valid Mermaid syntax inside the block.
- Do NOT use placeholder boxes, ASCII art, or dashed-border divs for diagrams — always use Mermaid.$$,
    '[{"name":"sectionName","description":"Name of the PRD section being edited","required":true},{"name":"currentContent","description":"Current markdown content of the section","required":true},{"name":"prompt","description":"User instruction for the edit","required":true}]',
    '{"response_format":"text"}'
) ON CONFLICT (name) DO NOTHING;

-- 12. generate_task
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'generate_task',
    'Generate Task',
    'task',
    'CreateTaskModal: Generate a new task from a natural-language description.',
    $$You are an expert Project Manager.
Generate a detailed task based on this request: "{{aiPrompt}}"
Task Type: {{taskType}}

Provide an **EXTREMELY DETAILED** markdown description including:
1. **User Story**
2. **Acceptance Criteria** (Checklist)
3. **Technical Notes** (API, DB, Logic)
4. **UI/UX Flow**

Return STRICTLY Valid JSON with these keys:
- "title" (string): Clear, actionable title.
- "description" (string): The rich markdown description.
- "priority" (string): "HIGH", "MEDIUM", or "LOW".
- "points" (number): 1, 2, 3, 5, 8, or 13.
{{#if isEpic}}- "subtasks" (array of strings): List of 3-5 child task titles.{{/if}}$$,
    '[{"name":"aiPrompt","description":"User natural-language description of the task","required":true},{"name":"taskType","description":"Task type (task, bug, story, feature, epic)","required":true},{"name":"isEpic","description":"Whether this is an epic (adds subtasks field)","required":false}]',
    '{"response_format":"json"}'
) ON CONFLICT (name) DO NOTHING;

-- 13. update_task
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'update_task',
    'Update Task',
    'task',
    'TaskDetailModal: Update or enrich an existing task via AI.',
    $$You are an expert Project Manager. Update the task: "{{aiPrompt}}"
Current Task Type: {{taskType}}
Generate JSON: { "title": "...", "description": "markdown content", "priority": "HIGH/MEDIUM/LOW", "points": number {{#if isEpic}}, "subtasks": ["..."]{{/if}} }$$,
    '[{"name":"aiPrompt","description":"User request for updating the task","required":true},{"name":"taskType","description":"Current task type","required":true},{"name":"isEpic","description":"Whether this is an epic (adds subtasks field)","required":false}]',
    '{"response_format":"json"}'
) ON CONFLICT (name) DO NOTHING;

-- 14. copilot_tools_def
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'copilot_tools_def',
    'Copilot Tools Definition',
    'copilot',
    'Static tools definition for the Vulcan AI Copilot.',
    $$AVAILABLE TOOLS (respond with JSON when using):

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
- Output ONLY valid JSON when using tools, nothing else before or after$$,
    '[]',
    '{"response_format":"text","is_static":true}'
) ON CONFLICT (name) DO NOTHING;

-- 15. build_copilot_prompt
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'build_copilot_prompt',
    'Build Copilot Prompt',
    'copilot',
    'Assembly template: Combines workspace context, tools definition, conversation history, and user query into the full copilot prompt.',
    $${{context}}
{{tools}}

CONVERSATION:
{{historyLines}}

User: {{query}}

Respond appropriately:$$,
    '[{"name":"context","description":"Workspace context block (generated by copilotContext function)","required":true},{"name":"tools","description":"Tools definition block (from copilot_tools_def template)","required":true},{"name":"historyLines","description":"Recent conversation history lines","required":false},{"name":"query","description":"Current user query","required":true}]',
    '{"response_format":"text","is_assembly":true}'
) ON CONFLICT (name) DO NOTHING;

-- 16. generate_search_queries
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'generate_search_queries',
    'Generate Search Queries',
    'research',
    'Research pipeline: Generate 4 targeted web search queries for competitive research.',
    $$You are a market research analyst. Given a product concept, generate exactly 4 targeted search queries to research the competitive landscape.

Product Name: {{productName}}
Description: {{description}}
Tags: {{tags}}

Generate 4 search queries, one for each category:
1. **Competitive**: Find direct and indirect competitors
2. **Trends**: Current market trends and industry direction
3. **Users**: Target audience pain points and needs
4. **Technical**: Technical approaches and architecture patterns used by similar products

Return strictly valid JSON:
{
  "queries": [
    { "category": "competitive", "query": "..." },
    { "category": "trends", "query": "..." },
    { "category": "users", "query": "..." },
    { "category": "technical", "query": "..." }
  ]
}

IMPORTANT: Make queries specific and actionable. Include the product domain/industry in each query.
Do NOT wrap in markdown code blocks. Return only the JSON object.$$,
    '[{"name":"productName","description":"Product name","required":true},{"name":"description","description":"Product description","required":false},{"name":"tags","description":"Product tags/categories","required":false}]',
    '{"response_format":"json"}'
) ON CONFLICT (name) DO NOTHING;

-- 17. synthesize_research_report
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'synthesize_research_report',
    'Synthesize Research Report',
    'research',
    'Research pipeline: Synthesize web search results into a structured competitive research report.',
    $$You are a senior market research analyst. Synthesize the following web search results into a structured research report for: "{{productName}}".

Product Description: {{description}}

## RAW SEARCH RESULTS:
{{formattedResults}}

## INSTRUCTIONS:
Analyze all search results and produce a comprehensive research report. Extract key insights, identify patterns, and provide actionable intelligence.

Return strictly valid JSON:
{
  "competitiveLandscape": "2-3 paragraphs analyzing competitors, their strengths, weaknesses, and market positioning",
  "marketTrends": "2-3 paragraphs on current market trends, growth areas, and industry direction",
  "userInsights": "2-3 paragraphs on target user needs, pain points, and expectations",
  "technicalContext": "2-3 paragraphs on technical approaches, common architectures, and technology choices",
  "keyFindings": [
    "Finding 1: concise insight",
    "Finding 2: concise insight",
    "Finding 3: concise insight",
    "Finding 4: concise insight",
    "Finding 5: concise insight"
  ],
  "sources": [
    { "title": "Source title", "url": "https://..." },
    { "title": "Source title", "url": "https://..." }
  ]
}

IMPORTANT: Base your analysis strictly on the provided search results. Cite specific sources.
Do NOT wrap in markdown code blocks. Return only the JSON object.$$,
    '[{"name":"productName","description":"Product name","required":true},{"name":"description","description":"Product description","required":false},{"name":"formattedResults","description":"Pre-formatted search results (query + results pairs)","required":true}]',
    '{"response_format":"json"}'
) ON CONFLICT (name) DO NOTHING;

-- 18. generate_category_epics
INSERT INTO prompt_templates (name, display_name, category, description, template_body, variables, metadata)
VALUES (
    'generate_category_epics',
    'Generate Category Epics',
    'product_generator',
    'Planning step (batch mode): Generate epics and tasks for a specific category based on PRD context.',
    $$Role: Senior Technical Lead & Project Architect.
Task: Generate epics and atomic tasks ONLY for the "{{categoryName}}" category.

CATEGORY DEFINITION:
{{categoryDescription}}

CATEGORY-SPECIFIC GUIDANCE:
{{categoryGuidance}}

MINIMUM TASKS REQUIRED: {{minimumTasks}}

DOCUMENTATION CONTEXT:
{{prdContext}}
{{#if docSummaries}}

OTHER DOCUMENTS:
{{docSummaries}}
{{/if}}
{{#if researchContext}}

{{researchContext}}
{{/if}}

STRICT REQUIREMENTS:
1. **Focus ONLY on {{categoryName}}** - Do NOT generate tasks for other categories
2. **Minimum Tasks**: Generate AT LEAST {{minimumTasks}} tasks total across all epics in this category
3. **Granularity**: Break down into atomic developer tasks (each 1-3 points)
   - BAD: "Build Authentication System"
   - GOOD: "Create users table schema", "Implement JWT token generation", "Build login API endpoint"
4. **Category Relevance**: Every task must directly relate to {{categoryName}}
5. **Epic Structure**: Group related tasks into 2-5 epics within this category
6. **Task Fields**: Each task needs: title, description (markdown with acceptance criteria), type (task/story/bug), points (1-8), role (Frontend/Backend/DevOps/Design/QA)

CRITICAL OUTPUT INSTRUCTIONS:
- Output ONLY valid JSON, nothing else
- Do NOT include thinking, reasoning, or explanation
- Do NOT wrap in markdown code blocks
- Start response directly with opening brace {

OUTPUT FORMAT (return exactly this structure):
{
  "category": "{{categoryName}}",
  "epics": [
    {
      "title": "Epic Title for {{categoryName}}",
      "description": "Epic description explaining the business value and scope...",
      "tasks": [
        {
          "title": "Atomic task title",
          "description": "**User Story**: As a [role], I want [feature] so that [benefit]\n\n**Implementation**: Detailed steps...\n\n**Acceptance Criteria**:\n- Criterion 1\n- Criterion 2\n- Criterion 3",
          "type": "task",
          "points": 2,
          "role": "Backend"
        }
      ]
    }
  ]
}$$,
    '[{"name":"categoryName","description":"Category display name","required":true},{"name":"categoryDescription","description":"Category description/scope","required":true},{"name":"categoryGuidance","description":"AI prompt guidance for this category","required":true},{"name":"minimumTasks","description":"Minimum number of tasks required","required":true},{"name":"prdContext","description":"Full PRD content (truncated)","required":true},{"name":"docSummaries","description":"Summaries of other documents","required":false},{"name":"researchContext","description":"Formatted competitive research context block","required":false}]',
    '{"response_format":"json"}'
) ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SEED: Create v1 version records for all templates
-- =====================================================

INSERT INTO prompt_template_versions (template_id, version, template_body, variables, metadata, change_note, created_by)
SELECT id, 1, template_body, variables, metadata, 'Initial seed from codebase', 'system'
FROM prompt_templates
WHERE name IN (
    'analyze_imported_document', 'analyze_product_concept', 'generate_more_suggestions',
    'generate_prd', 'generate_doc_section', 'generate_project_plan',
    'generate_tasks_for_epic', 'refine_vision', 'edit_doc_section',
    'edit_plan_structure', 'edit_prd_section', 'generate_task',
    'update_task', 'copilot_tools_def', 'build_copilot_prompt',
    'generate_search_queries', 'synthesize_research_report'
);
