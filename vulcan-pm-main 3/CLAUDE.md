# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Infinia Product Suite is an AI-powered product management platform that transforms product ideas into actionable plans with AI-assisted documentation, task generation, and sprint management. It features multi-tenant SaaS architecture with Microsoft Entra ID SSO, fine-grained authorization via OpenFGA, and Git integration with GitHub/GitLab/Bitbucket.

For detailed documentation see `docs/FEATURES.md` and `docs/ARCHITECTURE.md`.

## Commands

### Frontend (/frontend directory)
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Admin Portal (/admin directory)
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5174)
npm run build        # Build for production
```

### Backend (/backend directory)
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build TypeScript
npm start            # Start production server

# Migrations (node-pg-migrate)
npm run migrate:up      # Run pending migrations
npm run migrate:down    # Rollback last migration
npm run migrate:create name_here  # Create new migration
```

### Docker (from root directory)
```bash
docker-compose up -d              # Start all services
docker-compose up -d --build      # Rebuild and start all services
docker-compose ps                 # Check container status
docker-compose logs -f api        # View API logs
docker-compose down               # Stop all services
```

## Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript 5.8, Tailwind CSS, Vite 6.4
- **Admin Portal**: React 19, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js 20, Express.js 4.18, TypeScript
- **Databases**:
  - PostgreSQL 16 — Users, tenants, plans, SSO, sessions, auth, AI/Git provider config
  - MongoDB 7 — Projects, tasks, sprints, documents, comments, activity (per-tenant databases)
- **Authorization**: OpenFGA (Fine-Grained Authorization based on Google Zanzibar)
- **Authentication**: Microsoft Entra ID (Azure AD) multi-tenant SSO + email/password
- **AI**: Multi-provider — OpenAI, Anthropic, Google, Groq, Together, Azure OpenAI, OpenRouter, custom OpenAI-compatible endpoints
- **Web Search**: Tavily, Serper, Brave Search (for AI-powered competitive research)
- **Git**: GitHub, GitLab, Bitbucket (OAuth + PAT)
- **Deployment**: Docker Compose (full stack)

### Project Structure
```
/
├── frontend/                        # Tenant Frontend (React)
│   ├── src/
│   │   ├── components/              # React components
│   │   │   └── git/                 # Git integration UI
│   │   ├── context/                 # React Context providers
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── lib/
│   │   │   ├── ai.ts               # AI client (backend proxy)
│   │   │   └── prompts.ts          # Centralized AI prompt templates (16 functions)
│   │   ├── services/
│   │   │   ├── draft.service.ts     # Draft session management
│   │   │   ├── git.service.ts       # Git API client
│   │   │   ├── research.service.ts  # Competitive research API client
│   │   │   └── product-generator.service.ts
│   │   └── App.tsx
│   ├── Dockerfile                   # Multi-stage build (node + nginx)
│   └── nginx.conf                   # SPA routing + API proxy
│
├── admin/                           # Admin Portal (React)
│   ├── src/
│   │   ├── components/              # Admin components
│   │   ├── context/                 # Auth context
│   │   └── pages/                   # Admin pages (GitProvidersPage, SearchProvidersPage, etc.)
│   └── Dockerfile
│
├── backend/                         # Backend (Express.js)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── sso.routes.ts        # Tenant SSO endpoints
│   │   │   ├── admin.routes.ts      # Admin portal endpoints
│   │   │   ├── ai.routes.ts         # AI generation endpoints
│   │   │   ├── git-auth.routes.ts   # Git OAuth + PAT
│   │   │   ├── documents.routes.ts  # Document CRUD
│   │   │   ├── doc-sync.routes.ts   # Git doc sync
│   │   │   ├── product-generator.routes.ts  # Async creation jobs
│   │   │   ├── research.routes.ts   # AI competitive research
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── ai.service.ts        # Multi-provider AI (OpenAI-compatible + Anthropic)
│   │   │   ├── entra-sso.service.ts # Entra ID OAuth
│   │   │   ├── openfga.service.ts   # Authorization
│   │   │   ├── git-oauth.service.ts # Git OAuth flows
│   │   │   ├── git-operations.service.ts # Git push/pull
│   │   │   ├── git-clients/         # GitHub, GitLab, Bitbucket clients
│   │   │   ├── product-generator.service.ts  # Async product creation
│   │   │   ├── doc-sync.service.ts  # Document sync with Git
│   │   │   ├── web-search.service.ts # Multi-provider web search (Tavily/Serper/Brave)
│   │   │   ├── research.service.ts  # Agentic research orchestrator
│   │   │   ├── research-prompts.ts  # AI prompts for research pipeline
│   │   │   └── ...
│   │   ├── middleware/              # Auth, tenant, error handling
│   │   ├── db/
│   │   │   ├── postgres/            # PostgreSQL client + repositories
│   │   │   └── mongo/
│   │   │       ├── client.ts        # System MongoDB client
│   │   │       ├── tenant-router.ts # Per-tenant DB routing
│   │   │       └── repositories/    # Document repositories
│   │   └── config/                  # Environment config
│   ├── fga/                         # OpenFGA authorization model
│   │   ├── model.dsl
│   │   └── model.json
│   └── migrations/                  # PostgreSQL migrations
│
├── docs/                            # Documentation
│   ├── FEATURES.md                  # Product features
│   └── ARCHITECTURE.md              # Technical architecture
│
├── docker-compose.yml
├── .env                             # Environment variables (gitignored)
└── .env.example
```

### Environment Configuration

All configuration is via `.env` file in the root directory:

```bash
cp .env.example .env    # Copy template
# Edit .env with your values
```

Key variables:
- `POSTGRES_USER`, `POSTGRES_PASSWORD` — PostgreSQL credentials
- `MONGO_USER`, `MONGO_PASSWORD` — MongoDB credentials
- `JWT_SECRET` — JWT signing key
- `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET` — Tenant SSO
- `ENTRA_ADMIN_CLIENT_ID`, `ENTRA_ADMIN_CLIENT_SECRET` — Admin portal SSO

### Database Architecture

**PostgreSQL** (port 5432): Relational/transactional data
- `users`, `tenants`, `plans` — Core entities
- `sso_providers`, `sso_org_consents`, `user_sso_identities` — SSO configuration
- `admin_users`, `admin_audit_log` — Admin portal
- `sessions`, `api_keys` — Authentication
- `ai_providers`, `ai_provider_models` — AI provider configuration
- `git_providers`, `user_git_tokens` — Git integration
- `roles`, `user_roles` — Role management
- `invitations`, `password_reset_tokens` — User flows
- `search_providers` — Web search provider config (Tavily, Serper, Brave)
- `system_settings` — Global SaaS settings

**MongoDB** (port 27017): Tenant-scoped document data (separate database per tenant: `tenant_<id>`)
- `projects`, `tasks`, `sprints` — Project management
- `columns`, `tags` — Kanban configuration
- `comments`, `activity_log` — Collaboration
- `documents` — Project documentation (PRD, specs, guides)
- `draft_sessions` — In-progress document drafts

**Important**: Two separate MongoDB clients exist:
- `client.ts` — System-level `infinia` database
- `tenant-router.ts` — Routes to `tenant_<tenantId>` databases; must be initialized at startup via `db/index.ts`

### Authorization Model (OpenFGA)

Hierarchical permission model:
```
organization
  └── admin, member

project (belongs to organization)
  └── admin, member, viewer
  └── inherits from organization

team (belongs to project)
  └── lead, member

task (belongs to project)
  └── assignee, can_edit, can_view

sprint (belongs to project)
  └── can_manage, can_view
```

- Azure AD admins (Global Admin, Directory Admin) become org admins
- First user from new organization becomes org admin
- Org admins can create projects
- Permissions cascade from organization down through relation tuples

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| frontend | 8080 | Tenant app (React via nginx) |
| admin | 8084 | Admin portal (React via nginx) |
| api | 3000 | Express.js backend |
| postgres | 5432 | PostgreSQL database |
| mongo | 27017 | MongoDB database |
| openfga | 8088 | OpenFGA HTTP API |
| openfga | 3002 | OpenFGA Playground |
| adminer | 8081 | PostgreSQL admin UI |
| mongo-express | 8083 | MongoDB admin UI |

### Authentication Flow

**Tenant SSO (Multi-tenant)**:
1. User clicks "Sign in with Microsoft"
2. Redirect to Entra ID authorization
3. Callback with auth code
4. Exchange code for tokens
5. Extract user info from ID token
6. Auto-create tenant + MongoDB database if first user from organization
7. Check domain whitelist if enabled
8. Auto-provision user if new
9. Check Azure AD roles → set org admin if applicable
10. Set up OpenFGA permissions
11. Issue JWT token (`{ userId, email, tenantId, isOrgAdmin }`)

**Admin Portal SSO**:
- Single-tenant Entra ID app
- SSO-only (no email/password)
- Restricted to allowed domains

### API Endpoints

Base URL: `http://localhost:3000/api/v1`

| Group | Prefix | Description |
|-------|--------|-------------|
| Auth | `/auth` | register, login, me |
| SSO | `/sso` | providers, entra/login, entra/callback, admin-consent |
| Admin | `/admin` | auth, settings, AI providers, SSO config, tenants, users |
| Projects | `/projects` | CRUD, members, git linking |
| Tasks | `/tasks` | CRUD, assign, move, filter by project/sprint/assignee/type/priority |
| Sprints | `/sprints` | CRUD, start, close, active sprint |
| Users | `/users` | CRUD |
| Tags | `/tags` | CRUD |
| Columns | `/columns` | CRUD, reorder |
| Comments | `/comments` | CRUD per task |
| Activity | `/activity` | List by entity |
| AI | `/ai` | generate, complete, models, status, test |
| Git | `/git` | providers, connections, OAuth, PAT, repos |
| Documents | `/documents` | CRUD per project |
| Doc Sync | `/projects/:id/docs/sync` | Push/pull docs to Git |
| Products | `/products` | Async creation job, status polling, SSE stream |
| Research | `/research` | AI competitive research (web search + synthesis) |
| Drafts | `/drafts` | Draft session management |
| Health | `/health` | DB connection status |

### AI Integration

All AI calls go through the backend (`/api/v1/ai/*`) to keep API keys secure. Provider config is stored in PostgreSQL and cached for 60 seconds.

- Supports OpenAI, Anthropic, Google, Groq, Together, Azure OpenAI, OpenRouter, Ollama, LM Studio, vLLM, and any OpenAI-compatible endpoint
- Default `max_tokens: 4096` for OpenAI-compatible providers
- 120-second fetch timeout on all AI requests
- Anthropic uses separate API format handler (`/messages` endpoint)
- All 16 AI prompt templates are centralized in `frontend/src/lib/prompts.ts` with shared Tailwind style constants

### Git Integration

- GitHub, GitLab, Bitbucket support via OAuth 2.0 or Personal Access Tokens
- Per-user token storage with encryption in PostgreSQL
- Repository creation, listing, and document push/pull
- HTML-to-Markdown conversion for Git-stored docs
- Git clients: `backend/src/services/git-clients/{github,gitlab,bitbucket}.client.ts`

### State Management

Global state via React Context:
- `ProjectDataContext` — Projects, tasks, teams, users, sprints, columns, tags
- `ThemeContext` — Dark/light mode
- `ToastContext` — Notifications
- `AuthContext` (admin) — Admin authentication

### Key Components

**Frontend**:
- `ProductGeneratorModal.tsx` — 4-step AI wizard (vision → docs → plan → create)
- `KanbanBoard.tsx` — Drag-and-drop task board
- `CopilotModal.tsx` — AI assistant with workspace context
- `SprintsView.tsx` / `TimelineView.tsx` — Sprint and timeline management
- `PRDView.tsx` — PRD viewer with inline AI editing
- `git/` — Git connections, repo linking, doc sync modals
- `lib/prompts.ts` — All AI prompt templates

**Admin Portal**:
- `LoginPage.tsx` — SSO-only login
- `Dashboard.tsx` — Tenant management
- `GitProvidersPage.tsx` — Git provider configuration

## Development Notes

- Frontend proxies `/api` requests to backend via nginx (`proxy_read_timeout 300s`)
- JWT tokens stored in `localStorage` as `infinia_token`
- OpenFGA auto-initializes store and model on first use
- Azure AD role checking requires `Directory.Read.All` permission
- Both MongoDB clients (system + tenant-router) must be initialized at startup
- Tenant MongoDB database is created when a tenant is created (SSO or admin route)
- AI provider config is cached 60s; call `aiService.clearCache()` after config changes
- Product generator uses async jobs with SSE streaming for real-time progress
- No test framework currently configured

### Web Search / Research Integration

- Search providers (Tavily, Serper, Brave) configured in `search_providers` table via Admin Portal
- Research pipeline: AI generates 4 search queries → parallel web search → AI synthesizes structured report
- Research is optional — toggled per-session in the Product Generator wizard
- Research context is injected into vision analysis, PRD, docs, and plan prompts
- Search provider config cached 60s; call `webSearchService.clearCache()` after config changes
- Graceful degradation: if research fails, wizard proceeds without it
