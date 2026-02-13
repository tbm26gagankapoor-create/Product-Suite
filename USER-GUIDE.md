# Infinia Products - User Guide

**Version**: 1.0
**Last Updated**: 2026-02-12
**Audience**: Product Managers, Teams, End Users

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Product](#creating-your-first-product)
3. [AI-Powered Product Generation](#ai-powered-product-generation)
4. [Managing Projects](#managing-projects)
5. [Working with Tasks](#working-with-tasks)
6. [Kanban Board](#kanban-board)
7. [Sprint Planning](#sprint-planning)
8. [Collaboration Features](#collaboration-features)
9. [Notifications](#notifications)
10. [Settings & Preferences](#settings--preferences)

---

## Getting Started

### Creating an Account

1. Visit your organization's Infinia Products URL
2. Click **Sign Up**
3. Enter your email, name, and password
4. Click **Create Account**
5. Verify your email (if required)

**Email Domain Auto-Join**: If your organization has configured domain whitelisting, you'll automatically join your company's organization.

### Logging In

1. Visit the login page
2. Enter your email and password
3. Click **Sign In**

**Forgot Password?** Click "Forgot Password" and follow the email instructions to reset.

### Dashboard Overview

After logging in, you'll see the main dashboard with:

- **Sidebar** - Navigation menu
- **Header** - Project/view tabs
- **Main Area** - Kanban board, list view, or timeline
- **Quick Actions** - Create product, create task, search

---

## Creating Your First Product

### Manual Product Creation

1. Click **+ New Product** in the sidebar
2. Enter basic information:
   - **Product Name** - Name of your product
   - **Description** - Brief description
   - **Code** - Short code (e.g., "INF" for Infinia)
3. Click **Create Project**

### AI-Powered Product Creation (Recommended)

Use the AI Product Generator for a comprehensive product plan with tasks, epics, and documentation.

1. Click **+ New Product** → **Generate with AI**
2. Follow the wizard (detailed in next section)
3. Review and customize the generated product
4. Click **Create Project**

---

## AI-Powered Product Generation

The AI Product Generator creates a complete product plan including vision, PRD, epics, tasks, and team recommendations.

### Step 1: Product Input

**Basic Information**:
- **Product Name** - What you're building
- **Problem Statement** - What problem does this solve?
- **Target Audience** - Who is this for?
- **Core Features** - Key capabilities (bullet points)

**Example**:
```
Product Name: TaskMaster Pro
Problem: Teams struggle to track projects across tools
Target Audience: Small to medium teams (5-50 people)
Core Features:
- Kanban boards
- Sprint planning
- Time tracking
- GitHub integration
```

**Optional Advanced Fields**:
- **Success Metrics** - How you'll measure success
- **Constraints** - Technical, budget, or timeline constraints
- **Competitors** - Similar products to compare against
- **Additional Context** - Any other relevant information

**AI Provider Selection**:

If your administrator has enabled multiple AI providers, you can choose which AI to use:

- **SAIF AI** (Default) - Fast, cost-effective
- **OpenAI** - GPT-4 for high-quality output
- **Anthropic** - Claude for detailed analysis
- **Google AI** - Gemini for creative ideas

**Tip**: Different providers have different strengths. Try experimenting to find your favorite.

**What if a provider fails?**

Don't worry! The system automatically falls back to other providers if your selected one fails. You'll see a notification if this happens.

### Step 2: AI Processing

The AI generates:
1. **Product Vision** - High-level overview and goals
2. **Key Features** - Detailed feature breakdown
3. **Target Users** - User personas
4. **Success Metrics** - Measurable outcomes
5. **Technical Considerations** - Architecture notes

This takes **15-30 seconds**. You'll see a progress indicator.

### Step 3: Review & Refine

Review the generated vision. You can:

- **Accept** - Move to next step
- **Regenerate** - Try again with different AI output
- **Edit** - Make manual changes via chat
- **Add More Context** - Provide additional details

**Using the Chat**:

Ask the AI to modify the vision:
- "Make it more focused on mobile users"
- "Add emphasis on data privacy"
- "Simplify the technical stack"

### Step 4: Document Generation

The AI generates comprehensive documentation:

**Default Documents**:
- **PRD** (Product Requirements Document) - Detailed specifications
- **Architecture Design** - Technical architecture
- **User Stories** - Feature stories
- **API Specification** - API design
- **Security & Privacy** - Security considerations
- **Testing Strategy** - QA approach

**Optional Documents** (select as needed):
- Marketing Strategy
- Data Flow Diagrams
- Deployment Plan
- Risk Assessment
- User Research Plan

**Document Generation Time**: 30-60 seconds depending on document count.

### Step 5: Document Review (PRD View)

Review each generated document:

**Actions**:
- **View** - Read the full document
- **Edit** - Make changes via chat
- **Regenerate** - Create new version
- **Delete** - Remove unwanted document
- **Add Document** - Generate additional documents

**Editing Documents**:

Use the chat interface to request changes:
- "Add more details to the authentication section"
- "Include pricing strategy"
- "Make the API spec more detailed"

### Step 6: Planning & Epics

The AI generates a comprehensive project plan with:

**Epic Categories** (14 default categories):
1. Core Features
2. User Experience
3. Backend Services
4. API Development
5. UI/UX Implementation
6. Authentication & Security
7. Data Management
8. Testing & QA
9. Deployment
10. Integrations
11. Documentation
12. Performance
13. Accessibility
14. Analytics

**Each Epic Includes**:
- Title and description
- 8-12 detailed tasks
- Estimated story points
- Assigned roles (Frontend, Backend, Full-Stack, etc.)

**Epic Structure**:
```
Epic: User Authentication System
├── Task: Design login UI (3 points, Frontend)
├── Task: Implement JWT authentication (5 points, Backend)
├── Task: Add password reset flow (3 points, Full-Stack)
└── Task: Write auth tests (2 points, QA)
```

**Customizing Epics**:

- **Add Epic** - Create custom epic
- **Edit Epic** - Modify title/description/tasks
- **Delete Epic** - Remove unwanted epic
- **Reorder** - Drag to prioritize

### Step 7: Review & Create

Final review before creating the project:

**Summary Shows**:
- Project name and description
- Total epics count
- Total tasks count
- Documents generated
- Estimated effort

**Actions**:
- **Create Project** - Finalize and create
- **Save as Draft** - Save progress and come back later
- **Go Back** - Return to previous step
- **Cancel** - Discard everything

**Draft System**:

Drafts are automatically saved every few minutes. If you close the wizard, you can resume later:
1. Click **+ New Product**
2. You'll see "Resume Draft" option
3. Click to continue where you left off

### What Happens After Creation

Once created, the project includes:

✅ **Project** - Fully configured project
✅ **Epics** - All epics created as work items
✅ **Tasks** - All tasks under their respective epics
✅ **Documents** - PRD and other docs attached
✅ **Team Roles** - Suggested roles for each task

You can immediately start:
- Assigning tasks to team members
- Creating sprints
- Tracking progress on Kanban board
- Collaborating with your team

---

## Managing Projects

### Project Views

Switch between different views using the header tabs:

| View | Best For |
|------|----------|
| **Kanban** | Visual task flow |
| **List** | Detailed task management |
| **Timeline** | Gantt chart, dependencies |
| **Calendar** | Date-based planning |

### Project Settings

Access via gear icon in project header:

**General**:
- Project name
- Description
- Project code
- Status (In Progress, On Hold, Completed)

**Members**:
- Add/remove team members
- Set member roles
- Configure permissions

**Integrations**:
- Connect GitHub repository
- Configure webhooks
- Enable notifications

**Danger Zone**:
- Archive project
- Delete project (requires confirmation)

### Favoriting Projects

Mark frequently used projects as favorites:

1. Click star icon next to project name
2. Favorited projects appear at the top of the sidebar

---

## Working with Tasks

### Creating Tasks

**Quick Create**:
1. Click **+ Add Task** in any column
2. Enter task title
3. Press Enter

**Detailed Create**:
1. Click **+ New Task**
2. Fill in details:
   - Title
   - Description (supports markdown)
   - Type (Feature, Bug, Task, Story, Epic)
   - Priority (Low, Medium, High, Critical)
   - Story Points
   - Assigned To
   - Due Date
   - Tags/Labels
3. Click **Create**

**Task Types**:

| Type | Icon | Use When |
|------|------|----------|
| **Epic** | 🟣 | Container for related work (NOT a task itself) |
| **Feature** | 🔵 | New functionality |
| **Task** | 🔘 | Standard work item |
| **Bug** | 🔴 | Defect to fix |
| **Story** | 🟢 | User story |

**Important**: Epics are containers, not tasks. You add Features, Tasks, Bugs, or Stories to sprints, not Epics.

### Editing Tasks

**Quick Edit**:
- Click task title to rename
- Click assignee avatar to reassign
- Drag to different column to change status

**Full Edit**:
1. Click task to open detail panel
2. Edit any field
3. Changes save automatically

### Task Detail Panel

Click any task to view:

**Overview**:
- Title and description
- Type, priority, points
- Assignee, reporter
- Status, sprint
- Created/updated dates

**Comments**:
- Add comments
- @ mention team members
- Attach files

**Activity**:
- Full activity history
- Status changes
- Assignment changes

**Attachments**:
- Upload files
- Link GitHub PRs
- Add screenshots

### Task Dependencies

Create dependencies to show task relationships:

1. Open task detail panel
2. Click **Add Dependency**
3. Select "Blocks" or "Blocked By"
4. Choose related task
5. Dependency appears in timeline view

**Example**: "Backend API" blocks "Frontend Integration"

### Bulk Actions

Select multiple tasks to:
- Assign to user
- Change priority
- Move to sprint
- Add tags
- Delete

**How to Select**:
- Click checkboxes on tasks
- Or: Shift + Click to select range

---

## Kanban Board

The Kanban board provides a visual workflow for tasks.

### Default Columns

| Column | Meaning |
|--------|---------|
| **Backlog** | Not yet started |
| **To Do** | Ready to work on |
| **In Progress** | Actively being worked on |
| **In Review** | Awaiting review/approval |
| **Done** | Completed |

### Moving Tasks

**Drag and Drop**:
1. Click and hold task card
2. Drag to target column
3. Release to drop

**Keyboard**:
- Arrow keys to navigate
- Space to pick up/drop

### Filtering Tasks

Use the filter bar to show specific tasks:

**Filter By**:
- Assignee
- Priority
- Type
- Tags
- Sprint
- Due date

**Example**: Show only "High Priority" bugs assigned to me.

### Searching Tasks

Use the search box to find tasks:
- Search by title
- Search by ID (e.g., "INF-123")
- Search by description content

### Customizing Columns

Add custom columns for your workflow:

1. Click **+ Add Column**
2. Name the column
3. Set WIP limit (optional)
4. Choose position
5. Click **Save**

**WIP Limits**: Work In Progress limits prevent column overload. If set to 5, the column highlights when it has more than 5 tasks.

---

## Sprint Planning

Organize work into time-boxed sprints (typically 1-2 weeks).

### Creating a Sprint

1. Click **Sprints** in sidebar
2. Click **+ New Sprint**
3. Fill in:
   - Sprint name (e.g., "Sprint 12")
   - Start date
   - End date (typically 1-2 weeks)
   - Sprint goal (optional)
4. Click **Create**

### Adding Tasks to Sprint

**Method 1: Drag & Drop**
1. Open sprint planning view
2. Drag tasks from backlog to sprint

**Method 2: Task Edit**
1. Open task detail
2. Select sprint from dropdown
3. Save

**Important**: Only add work items (Feature, Task, Bug, Story) to sprints, not Epics. Epics are containers.

### Sprint Capacity Planning

Track team capacity vs committed work:

**Capacity**: Total story points your team can handle
- Example: 3 developers × 8 points/week × 2 weeks = 48 points

**Committed**: Sum of story points in sprint
- Shows real-time as you add tasks

**Indicator**:
- 🟢 Under capacity - room for more work
- 🟡 At capacity - perfect
- 🔴 Over capacity - too much work

### Starting a Sprint

1. Finalize task selection
2. Click **Start Sprint**
3. Sprint status changes to "Active"

Only one sprint can be active at a time.

### During Sprint

**Track Progress**:
- Burndown chart shows remaining work
- Daily standup view highlights blockers
- Sprint board (Kanban view filtered to sprint tasks)

**Adjust Sprint**:
- Add/remove tasks as needed
- Update estimates
- Mark tasks as done

### Completing a Sprint

1. Move all "Done" tasks to completed
2. Click **Complete Sprint**
3. Review sprint report:
   - Completed vs planned points
   - Velocity (points completed)
   - Tasks rolled over to next sprint
4. Move incomplete tasks to next sprint or backlog

---

## Collaboration Features

### Comments

Add comments to tasks for discussion:

1. Open task detail
2. Scroll to Comments section
3. Type your comment (supports markdown)
4. Click **Comment**

**@ Mentions**: Type `@` followed by name to notify team members.

**Formatting**:
- **Bold**: `**text**`
- *Italic*: `*text*`
- Code: `` `code` ``
- Lists: `- item` or `1. item`

### Document Collaboration

Collaborate on PRDs and other documents:

**Inline Comments**:
1. Select text in document
2. Click comment icon
3. Add comment
4. Team members can reply

**Document Chat**:
- Ask questions about the document
- Request changes
- Get AI assistance

### Activity Feed

See all project activity in real-time:
- Task status changes
- New comments
- Assignments
- Document updates

Access via **Activity** tab in project view.

### Team Mentions

Notify team members:
- In comments: `@username`
- In task descriptions: `@team`
- In documents: `@reviewer`

Mentioned users receive notifications.

---

## Notifications

### Notification Types

| Type | Trigger |
|------|---------|
| **Task Assigned** | You're assigned a task |
| **Comment** | Someone comments on your task |
| **Mention** | You're @ mentioned |
| **Status Change** | Task you created changes status |
| **Due Soon** | Task due within 24 hours |
| **Overdue** | Task past due date |

### Notification Settings

Configure notifications in Settings → Notifications:

**Delivery Methods**:
- In-app notifications (bell icon)
- Email notifications
- Browser push (if enabled)

**Frequency**:
- Real-time
- Daily digest (once per day)
- Weekly digest (once per week)

**Quiet Hours**:
Set times to not receive notifications:
- Weekdays: 6 PM - 8 AM
- Weekends: All day
- Custom schedule

**Per-Event Settings**:
Choose which events trigger notifications:
- ✅ Task assigned to me
- ✅ Comments on my tasks
- ✅ @ Mentions
- ❌ All task updates (too noisy)
- ✅ Due soon reminders

### Managing Notifications

**Mark as Read**:
- Click notification to mark as read
- Or: Click "Mark all as read"

**Notification Panel**:
- Click bell icon in header
- See recent notifications
- Click to jump to task/comment

---

## Settings & Preferences

Access via avatar → Settings in header.

### Profile

**Personal Information**:
- Name
- Email
- Avatar (upload image)
- Bio

**Password**:
- Change password
- Require current password for security

### Preferences

**Appearance**:
- Theme: Light, Dark, or System
- Accent color
- Compact/Comfortable view density

**Language**:
- UI language (if multiple languages supported)

**Timezone**:
- Your local timezone (affects due dates)

**Default View**:
- Default project view (Kanban, List, Timeline, Calendar)
- Default task view

### Integrations

**GitHub**:
1. Click **Connect GitHub**
2. Authorize on GitHub
3. Select repositories to link
4. PRs and commits appear in tasks

**Slack** (if enabled):
- Connect Slack workspace
- Get notifications in Slack
- Create tasks from Slack

### AI Provider Preference

If multiple AI providers are available:

1. Go to Settings → AI
2. Select your preferred provider:
   - SAIF AI (Default)
   - OpenAI
   - Anthropic
   - Google AI
3. Click **Save**

Your choice applies to all AI generation (product creation, document editing, etc.).

**Don't see multiple providers?** Your administrator may have only enabled one provider.

---

## Tips & Best Practices

### Product Generation

✅ **DO**:
- Provide detailed problem statements
- Include specific features you want
- Mention constraints upfront
- Review and refine AI output
- Save drafts if you need time to think

❌ **DON'T**:
- Use vague descriptions ("build a good app")
- Skip the review step
- Accept AI output without reading
- Generate without a clear goal

### Task Management

✅ **DO**:
- Break large tasks into smaller ones
- Use story points consistently
- Add acceptance criteria
- Assign tasks to specific people
- Set realistic due dates

❌ **DON'T**:
- Create epics without child tasks
- Add epics to sprints (add the work items inside them)
- Leave tasks unassigned for weeks
- Overload sprints with too many points

### Sprint Planning

✅ **DO**:
- Plan sprint goal first
- Consider team capacity
- Include buffer for unexpected work
- Review sprint retrospectively
- Adjust estimates based on actual time

❌ **DON'T**:
- Commit to more points than capacity
- Change sprint scope mid-sprint (unless critical)
- Skip sprint retrospectives
- Plan too far in advance (stick to 1-2 sprints)

### Collaboration

✅ **DO**:
- Use @ mentions to notify people
- Keep comments constructive
- Update task status promptly
- Document decisions in comments
- Respond to comments within 24 hours

❌ **DON'T**:
- Have side conversations outside the tool
- Forget to notify stakeholders
- Spam team with unnecessary mentions

---

## Keyboard Shortcuts

### Global

| Shortcut | Action |
|----------|--------|
| `G` then `K` | Go to Kanban |
| `G` then `L` | Go to List |
| `G` then `T` | Go to Timeline |
| `C` | Create new task |
| `/` | Focus search |
| `?` | Show shortcuts |

### Task View

| Shortcut | Action |
|----------|--------|
| `J` / `K` | Next/Previous task |
| `Enter` | Open task detail |
| `E` | Edit task |
| `A` | Assign to me |
| `Esc` | Close panel |

### Kanban

| Shortcut | Action |
|----------|--------|
| `Space` | Pick up/Drop task |
| Arrow keys | Move selection |

---

## Getting Help

### In-App Help

- Click `?` icon in header for help menu
- Hover over field labels for tooltips
- Watch embedded tutorials

### Documentation

- [Admin Guide](ADMIN-GUIDE.md) - For administrators
- [API Reference](API-REFERENCE.md) - For developers
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues

### Video Tutorials

1. [Getting Started with Infinia Products](link)
2. [Creating Products with AI](link)
3. [Sprint Planning Best Practices](link)

### Support

- **Email**: support@infinia.app
- **Help Center**: https://help.infinia.app
- **Status Page**: https://status.infinia.app

---

**Document Version**: 1.0
**Last Updated**: 2026-02-12
**Next Review**: 2026-03-12
