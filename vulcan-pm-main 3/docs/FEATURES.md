# Infinia Product Suite — Features

## Overview

Infinia Product Suite is an AI-powered product management platform that transforms product ideas into actionable plans. It combines AI-assisted documentation, task generation, sprint management, and Git integration within a multi-tenant SaaS architecture.

---

## AI-Powered Product Creation Wizard

A guided 4-step wizard that takes a product idea from concept to a fully structured project with documentation, epics, and tasks.

### Step 1 — Vision & Analysis
- Describe a product idea from scratch or import an existing document
- AI analyzes the concept and generates a structured vision with goals, target audience, and key differentiators
- Interactive chat to refine the vision before proceeding

### Step 2 — Document Generation
- AI generates a full Product Requirements Document (PRD) with styled HTML output
- Additional documents generated in parallel: UI/UX Specifications, Technical Architecture, API Design, Data Model, Security & Compliance, Testing Strategy, Deployment Guide
- Each section generated independently with retry support for rate-limited APIs
- Real-time progress tracking per section
- Interactive AI editor to refine any section via chat

### Step 3 — Project Planning
- AI generates a project plan with epics and tasks based on the PRD and documentation
- Drag-and-drop epic and task reordering
- Interactive chat to modify the plan structure
- AI-powered task generation within individual epics

### Step 4 — Project Creation
- Async backend job creates the project, saves all documents, creates epics and tasks, assigns team members, and optionally links a Git repository
- Real-time progress via Server-Sent Events (SSE)
- Automatic document sync to Git on creation

---

## Project Management

### Kanban Board
- Drag-and-drop task cards across customizable columns
- Filter tasks by assignee, type, priority, sprint, and search text
- Visual priority and type indicators on task cards
- Column management (create, rename, reorder, delete)

### Task Management
- Task types: Task, Bug, Story, Feature, Epic
- Priority levels: Urgent, High, Medium, Low
- Point estimation for sprint velocity
- Task assignment and reassignment
- Parent-child task relationships (epics contain sub-tasks)
- Task dependency linking within the same project
- AI-powered task generation and editing
- Rich text descriptions
- Comment threads on tasks
- Activity history per task

### Sprint Management
- Create sprints with start and end dates
- Start, manage, and close sprints
- Active sprint tracking per project
- Move tasks between sprints
- Sprint backlog management

### Timeline View
- Gantt-style timeline visualization
- Task bars with gradient coloring by priority
- Today indicator line
- Avatar stacks for assigned team members
- Date-based task scheduling

### Goals & Planning
- Project-level goals and objectives
- Planning view for sprint organization

---

## Documentation System

### Document Types
- Product Requirements Document (PRD)
- UI/UX Specifications
- Technical Architecture
- API Design
- Data Model
- Security & Compliance
- Testing Strategy
- Deployment Guide

### Document Features
- Rich HTML editor with AI assistance
- AI-powered section editing via inline chat
- Section-level retry for failed generations
- Document sync with Git repositories (push/pull)
- HTML to Markdown conversion for Git storage
- Draft sessions with incremental persistence
- Document templates for new sections

---

## AI Copilot

An AI assistant modal available across the application.

- Natural language queries about projects, tasks, sprints, and team
- Workspace-aware context (knows about all projects, tasks, sprints, users)
- Tool-based architecture for structured data retrieval
- Conversation history within a session
- Markdown-rendered responses

---

## Git Integration

### Supported Providers
- GitHub
- GitLab
- Bitbucket

### Authentication Methods
- OAuth 2.0 flow per provider
- Personal Access Token (PAT) connection
- Token capability detection (repo creation permissions)

### Features
- Connect multiple Git providers per user
- Link repositories to projects
- Automatic repository creation during product setup
- Push project documentation to Git repositories
- Pull documentation updates from Git
- Branch strategy configuration (direct push or pull request)
- Repository mode: shared, dedicated, or code-only
- Configurable docs path within repositories

---

## Multi-Tenant Architecture

### Tenant Isolation
- Automatic tenant creation on first SSO login from a new organization
- Separate MongoDB database per tenant (`tenant_<id>`)
- Tenant-scoped data access for all project management entities
- Shared PostgreSQL for cross-tenant data (users, auth, config)

### Organization Management
- Organization admin dashboard
- User management and invitations
- Member role assignment
- Domain whitelist for signup restrictions
- Pre-assigned tenant mapping via domain whitelist

---

## Authentication & Authorization

### Authentication Methods
- Microsoft Entra ID (Azure AD) multi-tenant SSO
- Email and password registration/login
- Password reset flow

### SSO Features
- Multi-tenant Entra ID application
- Automatic user provisioning on first SSO login
- Azure AD directory role detection (Global Admin, Directory Admin)
- Admin consent flow for organizations
- Domain-based tenant mapping
- First user from a new organization auto-promoted to org admin

### Fine-Grained Authorization (OpenFGA)
- Based on Google Zanzibar authorization model
- Hierarchical permissions: Organization > Project > Team > Task
- Roles: org admin, org member, project admin, project member, project viewer, team lead, team member, task assignee
- Permission inheritance from organization to project level
- Azure AD admins automatically receive org admin role

---

## Admin Portal

A separate single-page application for SaaS platform administration.

### Features
- SSO-only authentication (restricted to allowed domains)
- Tenant management (view, create, configure)
- User management across tenants
- AI provider configuration (API keys, models, endpoints)
- SSO provider configuration
- Git provider management
- System settings management
- Domain whitelist configuration
- Audit logging for admin actions

### AI Provider Management
- Configure multiple AI providers simultaneously
- Supported: OpenAI, Anthropic, Google, Groq, Together AI, Azure OpenAI, custom OpenAI-compatible endpoints (Ollama, LM Studio, vLLM, OpenRouter)
- Per-provider model management with pricing
- Connection testing
- Default provider selection
- Enable/disable providers and individual models

---

## Additional Features

### User Profile
- Profile management (name, email, avatar)
- Password change
- Connected Git accounts

### Settings
- Project-level settings
- Theme switching (dark/light mode)
- AI model preferences

### Import
- Jira project import support

### Notifications
- Toast notification system
- Real-time status updates during long operations

### Responsive UI
- Tailwind CSS styling
- Dark and light theme support
- Animated particle background on login
- Loading skeletons for async content
- Error boundary protection
