# AI Prompts Glossary

> Complete reference of all AI prompts used in the Infinia Products codebase.
> **Total Prompts: 17** | **AI Provider:** SAIF AI (OpenAI-compatible) | **Primary Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`

---

## Quick Reference Table

| # | Prompt Name | File | Line | Type | Model | Output |
|---|-------------|------|------|------|-------|--------|
| 1 | Product Vision (Import Mode) | `ProductGeneratorModal.tsx` | ~482 | User | Qwen3-VL-235B | JSON |
| 2 | Product Vision (Scratch Mode) | `ProductGeneratorModal.tsx` | ~540 | User | Qwen3-VL-235B | JSON |
| 3 | More Suggestions | `ProductGeneratorModal.tsx` | ~677 | User | Qwen3-VL-235B | JSON |
| 4 | PRD Generation | `ProductGeneratorModal.tsx` | ~747 | User | Qwen3-VL-235B | HTML |
| 5 | Generic Document Generation | `ProductGeneratorModal.tsx` | ~808 | User | Qwen3-VL-235B | HTML |
| 6 | Document Retry Generation | `ProductGeneratorModal.tsx` | ~875 | User | Qwen3-VL-235B | HTML |
| 7 | Category-Based Epic Breakdown | `ProductGeneratorModal.tsx` | ~1049 | User | Qwen3-VL-235B | JSON |
| 8 | Fallback Epic Generation | `ProductGeneratorModal.tsx` | ~1195 | User | Qwen3-VL-235B | JSON |
| 9 | AI Task Generation for Epic | `ProductGeneratorModal.tsx` | ~1327 | User | Qwen3-VL-235B | JSON |
| 10 | Background Doc Generation | `ProductGeneratorModal.tsx` | ~1571 | User | Qwen3-VL-235B | HTML |
| 11 | Vision Update Chat | `ProductGeneratorModal.tsx` | ~1651 | User | Qwen3-VL-235B | Text |
| 12 | Document Content Update Chat | `ProductGeneratorModal.tsx` | ~1662 | User | Qwen3-VL-235B | HTML |
| 13 | Epic Plan Update Chat | `ProductGeneratorModal.tsx` | ~1681 | User | Qwen3-VL-235B | JSON |
| 14 | Doc Chat - Edit Request | `ProductGeneratorModal.tsx` | ~1771 | User | Qwen3-VL-235B | HTML |
| 15 | Doc Chat - Question | `ProductGeneratorModal.tsx` | ~1807 | User | Qwen3-VL-235B | Text |
| 16 | PRD Section AI Edit | `PRDView.tsx` | ~289 | User | gpt-oss-120b | HTML |
| 17 | Vulcan AI Copilot | `CopilotModal.tsx` | ~190 | User | Qwen3-VL-235B | Text/JSON |
| 18 | Task AI Builder | `TaskDetailModal.tsx` | ~228 | User | gpt-oss-120b | JSON |

---

## AI Client Configuration

**File:** `lib/ai.ts`

- **API Endpoint:** `https://model.iamsaif.ai/v1/chat/completions`
- **Default Model:** `openai/gpt-oss-120b` (env: `VITE_SAIF_MODEL`)
- **Temperature:** `0` (deterministic)
- **CORS Fallback:** `https://corsproxy.io/?` proxy used when direct connection fails
- **JSON Mode:** When `responseMimeType === 'application/json'`, a system message is injected: `"IMPORTANT: Respond strictly in valid JSON format without markdown code blocks."`
- **Retry Logic:** `generateWithRetry()` — 5 retries, 2s initial delay, exponential backoff

---

## Full Prompt Details

---

### Prompt #1 — Product Vision (Import Mode)

**File:** `components/product-generator/ProductGeneratorModal.tsx` ~line 482
**Function:** `handleAnalyze()` (import branch)
**Purpose:** Analyze an uploaded document and transform it into a structured product blueprint.
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** JSON

```
Act as a Product Manager preparing a product for engineering implementation.
Analyze the provided document content below and transform it into an actionable product blueprint.

DOCUMENT CONTENT:
${content.substring(0, 150000)}

Your goal: Create a comprehensive, implementation-ready product plan with clear user flows.

Tasks:
1. Extract or infer the product name.

2. Write a concise elevator pitch (1-2 sentences) that explains what the product does and who it's for.

3. **Create a Detailed Product Vision** that includes:

   **Target Users & Pain Points**
   - Define 2-3 specific user personas (roles, not names)
   - List the key problems they face that this product solves
   - Explain why existing solutions fall short

   **Core Value Proposition**
   - What makes this product unique and valuable?
   - What is the "magic moment" when users realize the value?

   **Primary User Flows** (CRITICAL - be specific)
   For each major use case, describe the step-by-step user journey:
   - Flow 1: [Name] - Numbered steps from entry point to completion
   - Flow 2: [Name] - Numbered steps from entry point to completion
   - Flow 3: [Name] - Numbered steps from entry point to completion

   **User Stories** (Format: "As a [user], I want [action], so that [benefit]")
   - List 5-8 core user stories that drive the feature set

   **Key Features & Capabilities**
   - Preserve ALL original features from the document
   - Organize into MVP (Phase 1) vs Future Enhancements (Phase 2+)
   - For each feature, note the user story it supports

   **Success Metrics**
   - How will you measure if the product is successful?
   - What are the key KPIs to track?

   The vision should be comprehensive (500-800 words) and actionable for an engineering team.

4. **Strategic Suggestions**: Brainstorm 5 specific, high-impact suggestions to enhance the product (features, integrations, or differentiators).

Output the response in STRICT JSON format:
{
  "productName": "string",
  "description": "string (concise elevator pitch)",
  "vision": "string (comprehensive markdown-formatted vision with sections above)",
  "suggestions": [
    { "title": "string", "description": "string", "type": "feature" }
  ]
}
```

---

### Prompt #2 — Product Vision (Scratch Mode)

**File:** `components/product-generator/ProductGeneratorModal.tsx` ~line 540
**Function:** `handleAnalyze()` (scratch branch)
**Purpose:** Transform a product concept (name, description, tags) into a full product blueprint.
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** JSON

```
Act as a Product Manager preparing a product for engineering implementation.
Transform this product concept into an actionable product blueprint with clear user flows.

PRODUCT CONCEPT:
- Product Name: ${productName}
- Description: ${description || 'No specific description provided, please infer from name and tags.'}
- Tags/Category: ${tags}

Your goal: Create a comprehensive, implementation-ready product plan.

Tasks:
1. Refine the product name if needed (keep it concise and memorable).

2. Write a compelling elevator pitch (1-2 sentences) that explains what the product does and who it's for.

3. **Develop a Detailed Product Vision** that includes:

   **Target Users & Pain Points**
   - Define 2-3 specific user personas (e.g., "Small business owner", "Enterprise IT manager")
   - List the key problems they face that this product solves
   - Explain the impact of these pain points on their work/life

   **Core Value Proposition**
   - What makes this product unique and compelling?
   - What is the "magic moment" when users realize the value?
   - Why would users choose this over alternatives?

   **Primary User Flows** (CRITICAL - be specific and detailed)
   Map out 3-4 key user journeys with numbered steps:

   Example format:
   **Flow 1: First-Time User Onboarding**
   1. User lands on welcome screen and sees value proposition
   2. User selects their role/use case from predefined options
   3. System configures personalized dashboard based on selection
   4. User completes guided tutorial (3-4 key actions)
   5. User reaches "aha moment" by completing first meaningful task

   [Create similar detailed flows for other core use cases]

   **User Stories** (Format: "As a [user], I want [action], so that [benefit]")
   - List 6-10 core user stories that cover the main functionality
   - Prioritize by impact (mark as MVP or Phase 2)

   **Key Features & Capabilities**
   - List all core features organized by category
   - Clearly separate MVP features from future enhancements
   - For each feature, note which user story/flow it supports

   **Technical Considerations**
   - Key integrations or APIs needed
   - Data storage and security requirements
   - Performance or scalability considerations

   **Success Metrics**
   - Define 3-5 KPIs to measure product success
   - Include both engagement and business metrics

   The vision should be substantial (400-600 words), well-structured, and actionable for an engineering team to start building.

4. **Strategic Suggestions**: Brainstorm 5 specific, high-impact ideas to enhance the product (features, integrations, growth strategies, or UX differentiators).

Output strictly in this JSON format:
{
  "productName": "string (refined name if appropriate)",
  "description": "string (concise elevator pitch)",
  "vision": "string (comprehensive markdown-formatted vision with all sections above)",
  "suggestions": [
    { "title": "string", "description": "string (one sentence)", "type": "feature" }
  ]
}
```

---

### Prompt #3 — More Suggestions

**File:** `components/product-generator/ProductGeneratorModal.tsx` ~line 677
**Function:** `handleMoreSuggestions()`
**Purpose:** Generate 3 additional strategic suggestions for the product.
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** JSON

```
Product: ${productName}
Current Vision Summary: ${refinedVision.substring(0, 500)}...

Generate 3 NEW, distinct strategic suggestions (features, monetization, or market angles) that might improve this product.

Output valid JSON with format:
{
  "suggestions": [
    { "title": "Title", "description": "Desc", "type": "feature" }
  ]
}
```

---

### Prompt #4 — PRD Generation

**File:** `components/product-generator/ProductGeneratorModal.tsx` ~line 747
**Function:** `handleGenerateDocs()`
**Purpose:** Generate a comprehensive Product Requirements Document with styled HTML.
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** Raw HTML with Tailwind CSS

```
Role: Chief Product Architect.
Task: Generate a comprehensive Product Requirements Document (PRD) for: ${productName}.
Context Summary: ${context}

**VISUAL STYLE GUIDE (Strict Tailwind CSS):**
- **Typography**: Use 'text-[#172B4D] dark:text-white' for headings. Use 'text-gray-600 dark:text-gray-300' for body.
- **Spacing**: Generous spacing. 'mb-8' between sections. 'p-6' inside cards.
- **Containers**: Wrap major sections in rounded cards: 'bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#2D2F36] p-6 mb-8 shadow-sm'.
- **Tables**: Use 'w-full text-left border-collapse'. Header: 'bg-gray-50 dark:bg-[#1F2128] text-xs uppercase tracking-wider text-gray-500 font-bold'. Cells: 'p-4 border-b border-gray-100 dark:border-[#2D2F36] text-sm'.
- **Badges**: Use pill-shaped badges for status/priority (e.g., 'bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold').
- **Emphasis**: Use 'border-l-4 border-purple-500 pl-4 py-1' for key statements or quotes.

**STRUCTURE:**
1. <h2>Executive Summary</h2>
   - Wrap in a Hero Card: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-blue-100 dark:border-blue-900/20'.
2. <h2>Problem Statement & Context</h2>
   - Use a 2-column grid layout ('grid grid-cols-1 md:grid-cols-2 gap-6') for Current vs Future state.
3. <h2>Goals & Non-Goals</h2>
   - Use a comparison table or distinct cards.
4. <h2>User Personas</h2>
   - Display as specific cards with "Avatar" placeholders (colored circles with initials).
5. <h2>Functional Requirements</h2>
   - **MUST** be a detailed Table: ID | Feature Name | Priority | Description.
6. <h2>Technical Architecture</h2>
   - Use a dashed border box for Diagram Placeholder.
7. <h2>Rollout Strategy</h2>
   - Timeline style list.

Output strictly valid raw HTML. No markdown.
```

**Dynamic Context (injected as `${context}`):**
```
Product: ${productName}
Description: ${description}
Refined Vision: ${refinedVision}
Tags: ${tags}
[Optional] Original Document Context: ${fileText.substring(0, 150000)}
```

---

### Prompt #5 — Generic Document Generation

**File:** `components/product-generator/ProductGeneratorModal.tsx` ~line 808
**Function:** `handleGenerateDocs()` (loop for each section)
**Purpose:** Generate individual product documentation sections (Roadmap, Business Architecture, Design, etc.).
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** Raw HTML with Tailwind CSS

```
Role: Chief Product Architect.
Task: Generate the "${sec.label}" document.
Context Summary: ${context}

**Style Guide:**
- Use 'bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#2D2F36] p-6 mb-6' for main containers.
- Use <h2> for section headers (text-xl font-bold mb-4).
- Use tables for structured data.
- Make it look professional, spacious, and easy to read.

Output strictly valid HTML using Tailwind CSS classes. No markdown.
```

---

### Prompt #6 — Document Retry Generation

**File:** `components/product-generator/ProductGeneratorModal.tsx` ~line 875
**Function:** `handleRetryDocument(sectionId)`
**Purpose:** Retry generation for a document section that previously failed.
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** Raw HTML with Tailwind CSS

*(Same prompt as #5 — Generic Document Generation)*

```
Role: Chief Product Architect.
Task: Generate the "${section.label}" document.
Context Summary: ${context}

**Style Guide:**
- Use 'bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#2D2F36] p-6 mb-6' for main containers.
- Use <h2> for section headers (text-xl font-bold mb-4).
- Use tables for structured data.
- Make it look professional, spacious, and easy to read.

Output strictly valid HTML using Tailwind CSS classes. No markdown.
```

---

### Prompt #7 — Category-Based Epic Breakdown

**File:** `components/product-generator/ProductGeneratorModal.tsx` ~line 1049
**Function:** `handleGeneratePlan()` via `generateCategoryPrompt()`
**Purpose:** Generate 2-3 epics per development category (14 categories) with detailed tasks.
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** JSON

**14 Categories:**
1. Infrastructure & Setup
2. Database & Data Layer
3. Authentication & Authorization
4. User Management
5. Core Features - Part 1
6. Core Features - Part 2
7. API Development
8. UI Components & Design System
9. UI Pages & User Flows
10. Analytics & Monitoring
11. Testing & Quality Assurance
12. Deployment & DevOps
13. Third-Party Integrations
14. Documentation & Onboarding

```
You are a Senior Product Manager creating a DETAILED epic for: ${category.emoji} ${category.name}

PRODUCT CONTEXT:
Product: ${productName}
Vision: ${refinedVision.substring(0, 3000)}

RELEVANT DOCUMENTATION:
${context.substring(0, 40000)}

YOUR TASK:
Generate 2-3 comprehensive epics focused ONLY on "${category.name}" covering: ${category.focus}

REQUIREMENTS:
- Each epic MUST have ${category.minTasks}-15 granular, actionable tasks
- Tasks should be atomic - one clear action per task
- Include implementation details in descriptions

TASK DESCRIPTION FORMAT (use HTML):
<p>
  <strong>User Story:</strong> As a [role], I want [feature] so that [benefit].<br/><br/>
  <strong>Source:</strong> ${category.docTypes.join('/')}<br/><br/>
  <strong>Implementation:</strong>
  <ul>
    <li>File paths to create/modify</li>
    <li>Libraries to use</li>
    <li>Key code patterns</li>
  </ul>
  <strong>Acceptance Criteria:</strong>
  <ul>
    <li>Testable condition 1</li>
    <li>Testable condition 2</li>
  </ul>
</p>

TASK TYPES: 'story' (user-facing), 'task' (technical), 'feature' (new capability), 'bug' (fix)
STORY POINTS: 1 (tiny), 2 (small), 3 (medium), 5 (large), 8 (very large)
ROLES: "Frontend", "Backend", "Full-Stack", "DevOps", "QA", "Design"

OUTPUT FORMAT (STRICT JSON ONLY - NO MARKDOWN):
{
  "epics": [
    {
      "title": "${category.emoji} Epic Title",
      "description": "2-3 sentence description of business value",
      "tasks": [
        {
          "title": "Specific actionable task",
          "description": "<p>...</p>",
          "type": "task",
          "points": 3,
          "role": "Full-Stack"
        }
      ]
    }
  ]
}

Generate comprehensive, production-ready tasks. A real team will build from this plan.
```

---

### Prompt #8 — Fallback Epic Generation

**File:** `components/product-generator/ProductGeneratorModal.tsx` ~line 1195
**Function:** `handleGeneratePlan()` (fallback branch)
**Purpose:** Backup generation when category-based approach yields fewer than 5 epics.
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** JSON

```
You are a Senior Product Manager. Create a comprehensive project plan.

Product: ${productName}
Vision: ${refinedVision.substring(0, 5000)}

Generate 10-15 epics covering ALL aspects of building this product:
- Infrastructure & Setup
- Database & Data Layer
- Authentication & Security
- User Management
- Core Features (multiple epics)
- API Development
- UI/UX Implementation
- Testing & QA
- Deployment
- Integrations
- Documentation

Each epic needs 8-12 detailed tasks with descriptions including user story, implementation steps, and acceptance criteria.

OUTPUT ONLY VALID JSON:
{"epics":[{"title":"Epic","description":"Description","tasks":[{"title":"Task","description":"<p>Details...</p>","type":"task","points":3,"role":"Full-Stack"}]}]}
```

---

### Prompt #9 — AI Task Generation for Epic

**File:** `components/product-generator/ProductGeneratorModal.tsx` ~line 1327
**Function:** `handleAiAddTasks(epicId)`
**Purpose:** Generate specific atomic tasks within an epic based on a user requirement.
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** JSON

```
Act as a Technical Lead.
We are breaking down work for the Epic: "${epic?.title}".
User Requirement: "${aiTaskPrompt}"
${fileText ? `\nReference Context: ${fileText.substring(0, 10000)}` : ''}

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
      "description": "<p>Details...</p>"
    }
  ]
}
```

---

### Prompt #10 — Background Document Generation

**File:** `components/product-generator/ProductGeneratorModal.tsx` ~line 1571
**Function:** `generateDocsInBackground(draftId, incompleteDocs)`
**Purpose:** Generate remaining document sections in background (for draft resume).
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** Raw HTML with Tailwind CSS

*(Same prompt as #5 — Generic Document Generation)*

```
Role: Chief Product Architect.
Task: Generate the "${doc.label}" document.
Context Summary: ${context}

**Style Guide:**
- Use 'bg-white dark:bg-[#15171E] rounded-xl border border-gray-200 dark:border-[#2D2F36] p-6 mb-6' for main containers.
- Use <h2> for section headers (text-xl font-bold mb-4).
- Use tables for structured data.
- Make it look professional, spacious, and easy to read.

Output strictly valid HTML using Tailwind CSS classes. No markdown.
```

---

### Prompt #11 — Vision Update Chat

**File:** `components/product-generator/ProductGeneratorModal.tsx` ~line 1651
**Function:** `handleChatSubmit()` (review step)
**Purpose:** Rewrite the product vision based on user feedback in chat.
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** Plain text

```
Current Vision: "${refinedVision}"
User Request: "${userMsg}"
Rewrite the vision statement based on the request. Return only the updated vision text.
```

---

### Prompt #12 — Document Content Update Chat

**File:** `components/product-generator/ProductGeneratorModal.tsx` ~line 1662
**Function:** `handleChatSubmit()` (prd_view step)
**Purpose:** Update a specific PRD section's HTML content based on user chat request.
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** Raw HTML

```
You are editing the "${sectionName}" section of a PRD.
Current Content (HTML): ${currentContent}
User Request: "${userMsg}"

Return the FULL updated HTML for this section based on the request. Do not wrap in markdown.
```

---

### Prompt #13 — Epic Plan Update Chat

**File:** `components/product-generator/ProductGeneratorModal.tsx` ~line 1681
**Function:** `handleChatSubmit()` (planning step)
**Purpose:** Modify the epic/task structure (add, rename, remove) based on user request.
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** JSON

```
Current Epics JSON: ${JSON.stringify(generatedEpics.map(e => ({
  title: e.title,
  tasks: e.tasks.map(t => ({ title: t.title, type: t.type, points: t.points }))
})))}
User Request: "${userMsg}"

Update the plan structure based on the request (e.g. add a task to all epics, rename epics, remove bugs).
Return the FULL updated JSON array of Epics.
```

---

### Prompt #14 — Doc Chat - Edit Request

**File:** `components/product-generator/ProductGeneratorModal.tsx` ~line 1771
**Function:** `handleDocChatSubmit()` (edit branch)
**Purpose:** Edit a specific document section while preserving HTML structure and styling.
**Trigger:** Detected via regex: `/\b(change|update|modify|edit|add|remove|delete|replace|rewrite|make|fix|improve)\b/i`
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** Raw HTML

```
You are an expert document editor. You are editing the "${sectionName}" section of a Product Requirements Document.

Current Content (HTML):
${currentContent}

User Request: "${userMessage}"

Instructions:
1. Make the requested changes to the document
2. Return the FULL updated HTML content (not just the changed parts)
3. Preserve the existing HTML structure and styling
4. Do not wrap in markdown code blocks
5. Only return the HTML, nothing else
```

---

### Prompt #15 — Doc Chat - Question

**File:** `components/product-generator/ProductGeneratorModal.tsx` ~line 1807
**Function:** `handleDocChatSubmit()` (question branch)
**Purpose:** Answer questions about the product documentation by searching all sections.
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** Concise text (2-3 sentences)

```
You are a precise product documentation assistant. Search ALL sections below to answer.

FULL PRODUCT DOCUMENTATION:
${allDocsContext}

Question: "${userMessage}"

STRICT RULES:
- Search ALL document sections above to find the answer
- Answer in 2-3 sentences MAX unless more detail is explicitly requested
- Use bullet points for lists (max 4-5 items)
- No introductory phrases - start directly with the answer
- Cite which section(s) the info came from in parentheses at the end
- If not found anywhere, say "Not covered in documentation"
- Be specific with names, numbers, and facts
```

**Dynamic Context (`${allDocsContext}` is built as):**
```
=== PRD ===
[plain text content of PRD]

---

=== ROADMAP ===
[plain text content of Roadmap]

---

... (all generated document sections)
```

---

### Prompt #16 — PRD Section AI Edit

**File:** `components/prd/PRDView.tsx` ~line 289
**Function:** `handleAiSubmit()`
**Purpose:** Generate or update a PRD section based on user instruction in the PRD editor.
**Model:** `openai/gpt-oss-120b`
**Output:** Raw HTML with Tailwind CSS

```
You are an expert Product Manager and Technical Architect.
Your task is to update or generate the "${sectionName}" section of a PRD based on the user's request.

CURRENT CONTENT (HTML):
${currentContent}

USER INSTRUCTION:
${prompt}

REQUIREMENTS:
1. Return the FULL updated HTML for this section.
2. Use Tailwind CSS classes for styling.
3. **Style Guide**:
   - Use spacious layouts (p-6, mb-8).
   - Use cards for grouping related info (bg-white dark:bg-[#1E2028] border border-gray-200 dark:border-[#2D2F36] rounded-xl shadow-sm).
   - Use headers with clear hierarchy (text-xl font-bold mb-4 text-[#172B4D] dark:text-white).
   - Use tables for structured data (w-full text-left border-collapse, headers bg-gray-50 dark:bg-[#1F2128]).
   - Use accent colors for emphasis (text-blue-600, bg-blue-50, border-l-4 border-blue-500).
4. Maintain a dark-mode friendly professional look.
5. Do NOT wrap output in markdown. Return raw HTML only.
```

---

### Prompt #17 — Vulcan AI Copilot

**File:** `components/copilot/CopilotModal.tsx` ~line 190
**Function:** `processQuery(query)`
**Purpose:** Comprehensive workspace-aware AI assistant with tool calling for project management.
**Model:** `Qwen/Qwen3-VL-235B-A22B-Instruct`
**Output:** Text or Tool-call JSON

**Full prompt is composed of 3 dynamic sections:**

#### Section A — Product Roadmap & Workspace Context (dynamic)
```
PRODUCT ROADMAP & WORKSPACE CONTEXT:

## Products & Strategic Goals
[Per-project: name, key, status, lifecycle stage, vision, PRD summary, target release, work items count, active epics, sprints]

## Active Epics & Roadmap
[Per-epic: title, product theme, impact score, customer value, progress, child work items]

## Product Themes
[Theme distribution across tasks]

## Task Dependencies
[Tasks with blockedBy/blocks relationships]

## Current Sprints
[Active sprints with project, goal, task counts]

## Backlog Tasks Ready for Sprint Planning (${readyForSprint.length} work items)
[Up to 20 unblocked, estimated tasks not in a sprint — epics excluded]

## Workspace Stats
- Current User: ${currentUser?.name}
- Total Projects: ${projects.length}
- Total Work Items: ${count} (excludes epics - they are containers)
- Total Epics: ${count} (containers only, not added to sprints)
- Blocked Work Items: ${count}
- Work Items Ready for Sprint: ${count}
```

#### Section B — Tools Definition (static)
```
AVAILABLE TOOLS (respond with JSON when using):

1. create_task: Create a new task
   { "tool": "create_task", "args": { "title": "string", "type": "task|bug|story", "priority": "LOW|MEDIUM|HIGH", "points": number, "description": "string" } }

2. show_blockers: Show all blocked tasks
   { "tool": "show_blockers" }

3. summarize_status: Summarize project/sprint status
   { "tool": "summarize_status", "args": { "summary": "markdown summary text", "stats": { "total": n, "done": n, "inProgress": n, "blocked": n } } }

4. create_epic: Create an epic with tasks
   { "tool": "create_epic", "args": { "title": "string", "description": "string", "tasks": [{ "title": "string", "type": "task", "points": n }] } }

5. plan_sprint: Create a strategic sprint plan based on product roadmap
   { "tool": "plan_sprint", "args": { "name": "string", "goal": "string", "duration": "2 weeks", "tasks": ["task ids or titles"], "projectId": "string" } }

SPRINT PLANNING STRATEGY:
When planning a sprint, you MUST consider the product roadmap and strategic goals, NOT just task priority:

**CRITICAL RULES:**
- NEVER include epics in sprint plans - Epics are containers, NOT work items
- ONLY include: Feature, Task, Bug, Story types in sprints
- When counting work items or points, EXCLUDE epics from your calculations

**Planning Guidelines:**
1. **Product Vision Alignment**: Select work items that align with the product's vision, PRD, and lifecycle stage
2. **Epic-Based Grouping**: Group related work items FROM THE SAME EPIC to show progress on that epic
3. **Product Themes**: Balance work across product themes relevant to current goals
4. **Task Dependencies**: Respect work item sequencing - include blocking items before blocked items
5. **Ready Backlog**: Use the "Backlog Tasks Ready for Sprint Planning" section
6. **Customer Value**: Consider impact scores and customer value, not just priority labels
7. **Sprint Goal**: Create a coherent sprint goal that represents a meaningful product increment

EXAMPLE - GOOD Sprint Plan:
Sprint Goal: "Complete user authentication foundation for MVP launch"
Tasks: [DIG-47, DIG-46, DIG-41] - All authentication-related Features/Tasks/Stories from the "User Authentication" epic

EXAMPLE - BAD Sprint Plan:
Sprint Goal: "Work on high priority items"
Tasks: Random high-priority items from different epics/themes with no coherent story

INSTRUCTIONS:
- For questions, answer directly using PRODUCT ROADMAP & WORKSPACE CONTEXT
- For sprint planning, analyze epics, themes, and product goals FIRST before selecting tasks
- For actions (create, show, summarize), return the appropriate tool JSON
- Be strategic and consider the bigger product picture
- Output ONLY valid JSON when using tools, nothing else before or after
```

#### Section C — Conversation + Query
```
CONVERSATION:
[Last 6 messages from chat history]

User: ${query}

Respond appropriately:
```

---

### Prompt #18 — Task AI Builder

**File:** `components/task-detail/TaskDetailModal.tsx` ~line 228
**Function:** `handleAiBuild()`
**Purpose:** Generate or update task details (title, description, priority, points) based on a user prompt.
**Model:** `openai/gpt-oss-120b`
**Output:** JSON (with `responseMimeType: 'application/json'`)

```
You are an expert Project Manager. Update the task: "${aiPrompt}"
Current Task Type: ${currentTask.type || 'task'}
Generate JSON: { "title": "...", "description": "HTML content", "priority": "HIGH/MEDIUM/LOW", "points": number ${isEpic ? ', "subtasks": ["..."]' : ''} }
```

---

## Prompt Flow Diagram

```
User creates product
        |
        v
[#1/#2] Product Vision Generation (import/scratch)
        |
        v
[#3] More Suggestions (optional)
        |
        v
[#11] Vision Update Chat (optional edits)
        |
        v
[#4] PRD Generation
        |
        v
[#5/#6/#10] Document Generation (loop per section, with retry & background)
        |
        v
[#12] Document Content Update Chat (optional edits)
[#14] Doc Chat - Edit Request (optional edits)
[#15] Doc Chat - Question (Q&A about docs)
        |
        v
[#7] Category-Based Epic Breakdown (14 categories x 2-3 epics)
        |
        v
[#8] Fallback Epic Generation (if < 5 epics)
        |
        v
[#9] AI Task Generation for Epic (on-demand)
[#13] Epic Plan Update Chat (optional edits)
        |
        v
  Project Created!

--- Standalone Prompts ---
[#16] PRD Section AI Edit (PRDView editor)
[#17] Vulcan AI Copilot (workspace assistant)
[#18] Task AI Builder (task detail panel)
```
