# Infinia Product Suite — Architecture

## System Overview

```
                           +------------------+
                           |   Entra ID SSO   |
                           |  (Azure AD)      |
                           +--------+---------+
                                    |
            +-----------+-----------+-----------+-----------+
            |           |                       |           |
     +------+------+  +-+----------+     +------+------+   |
     |  Frontend   |  |   Admin    |     |  Git APIs   |   |
     |  (React)    |  |  (React)   |     | GH/GL/BB    |   |
     |  :8080      |  |  :8084     |     +------+------+   |
     +------+------+  +-----+------+            |          |
            |                |                   |          |
            +-----+----+----+-------------------+          |
                  |    |                                    |
           +------+----+------+                             |
           |  Express.js API  +-----------------------------+
           |     :3000        |
           +--+-----+-----+--+
              |     |     |
     +--------+  +--+--+  +--------+
     |Postgres|  |Mongo|  |OpenFGA |
     | :5432  |  |:27017| | :8088  |
     +--------+  +-----+  +--------+
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React, TypeScript, Tailwind CSS, Vite | React 19, TS 5.8, Vite 6.4 |
| **Admin Portal** | React, TypeScript, Tailwind CSS, Vite | React 19, TS 5.6, Vite 6.0 |
| **Backend** | Node.js, Express.js, TypeScript | Node 20, Express 4.18 |
| **Relational DB** | PostgreSQL | 16 |
| **Document DB** | MongoDB | 7 |
| **Authorization** | OpenFGA (Google Zanzibar) | Latest |
| **Authentication** | Microsoft Entra ID, JWT | — |
| **AI** | Multi-provider (OpenAI, Anthropic, Google, etc.) | — |
| **Deployment** | Docker Compose | — |

---

## Project Structure

```
/
├── frontend/                        # Tenant-facing SPA
│   ├── src/
│   │   ├── components/              # React components
│   │   │   ├── git/                 # Git integration UI
│   │   │   ├── KanbanBoard.tsx      # Drag-and-drop board
│   │   │   ├── ProductGeneratorModal.tsx  # AI wizard (4-step)
│   │   │   ├── CopilotModal.tsx     # AI assistant
│   │   │   ├── SprintsView.tsx      # Sprint management
│   │   │   ├── TimelineView.tsx     # Gantt timeline
│   │   │   └── ...
│   │   ├── context/                 # React Context providers
│   │   ├── hooks/                   # Custom hooks
│   │   ├── lib/
│   │   │   ├── ai.ts               # AI client (backend proxy)
│   │   │   └── prompts.ts          # Centralized AI prompt templates
│   │   ├── services/
│   │   │   ├── draft.service.ts     # Draft session management
│   │   │   ├── git.service.ts       # Git API client
│   │   │   └── product-generator.service.ts
│   │   └── App.tsx
│   ├── nginx.conf                   # SPA routing + API proxy
│   └── Dockerfile
│
├── admin/                           # Admin portal SPA
│   ├── src/
│   │   ├── components/              # Admin UI components
│   │   ├── pages/                   # Admin pages
│   │   │   └── GitProvidersPage.tsx
│   │   └── context/                 # Admin auth context
│   └── Dockerfile
│
├── backend/                         # Express.js API server
│   ├── src/
│   │   ├── routes/
│   │   │   ├── ai.routes.ts         # AI generation endpoints
│   │   │   ├── sso.routes.ts        # Entra ID SSO flow
│   │   │   ├── admin.routes.ts      # Admin portal API
│   │   │   ├── projects.routes.ts   # Project CRUD + members
│   │   │   ├── tasks.sqlite.routes.ts # Task CRUD
│   │   │   ├── sprints.routes.ts    # Sprint management
│   │   │   ├── git-auth.routes.ts   # Git OAuth + PAT
│   │   │   ├── documents.routes.ts  # Document CRUD
│   │   │   ├── doc-sync.routes.ts   # Git doc sync
│   │   │   ├── product-generator.routes.ts  # Async creation jobs
│   │   │   ├── draft-sessions.routes.ts
│   │   │   └── index.ts            # Route registration
│   │   ├── services/
│   │   │   ├── ai.service.ts        # Multi-provider AI
│   │   │   ├── entra-sso.service.ts # Entra ID integration
│   │   │   ├── openfga.service.ts   # Authorization engine
│   │   │   ├── projects.service.ts  # Project business logic
│   │   │   ├── product-generator.service.ts  # Async wizard backend
│   │   │   ├── git-oauth.service.ts # Git OAuth flows
│   │   │   ├── git-operations.service.ts # Git push/pull
│   │   │   ├── git-clients/         # GitHub, GitLab, Bitbucket
│   │   │   ├── doc-sync.service.ts  # Document sync logic
│   │   │   └── ...
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts    # JWT verification
│   │   │   └── ...
│   │   ├── db/
│   │   │   ├── postgres/
│   │   │   │   ├── client.ts        # PG connection pool
│   │   │   │   ├── migrate.ts       # Migration runner
│   │   │   │   └── repositories/    # Data access layer
│   │   │   ├── mongo/
│   │   │   │   ├── client.ts        # System MongoDB client
│   │   │   │   ├── tenant-router.ts # Per-tenant DB routing
│   │   │   │   └── repositories/    # Document repositories
│   │   │   └── index.ts            # DB initialization
│   │   └── config/                  # Environment config
│   ├── fga/
│   │   ├── model.dsl               # OpenFGA auth model
│   │   └── model.json
│   ├── migrations/                  # PostgreSQL migrations
│   └── Dockerfile
│
├── docker-compose.yml               # Full stack orchestration
├── .env.example                     # Environment template
└── CLAUDE.md                        # AI assistant instructions
```

---

## Database Architecture

### Dual-Database Strategy

The platform uses PostgreSQL for relational/transactional data and MongoDB for document-oriented project management data.

### PostgreSQL (Port 5432)

Stores system-wide relational data that requires ACID transactions and cross-tenant queries.

**Core Tables:**
| Table | Purpose |
|-------|---------|
| `tenants` | Organization records with slug identifiers |
| `users` | User accounts with tenant association |
| `plans` | Subscription tiers (free, pro, enterprise) |
| `sessions` | Active user sessions |
| `api_keys` | API key management |

**Authentication & SSO:**
| Table | Purpose |
|-------|---------|
| `sso_providers` | System-wide SSO provider configs |
| `sso_org_consents` | Org-level Entra ID admin consents |
| `sso_connections` | Tenant-specific SSO configurations |
| `user_sso_identities` | Maps SSO identities to local users |
| `password_reset_tokens` | Password reset flow |
| `invitations` | User invite tokens |

**Authorization:**
| Table | Purpose |
|-------|---------|
| `roles` | Custom roles per tenant |
| `user_roles` | User-role assignments |

**AI Configuration:**
| Table | Purpose |
|-------|---------|
| `ai_providers` | Provider configs (endpoint, API key, settings) |
| `ai_provider_models` | Model catalog with context windows and pricing |

**Git Integration:**
| Table | Purpose |
|-------|---------|
| `git_providers` | Git platform configs (GitHub, GitLab, Bitbucket) |
| `user_git_tokens` | Per-user OAuth tokens and PATs |

**Admin & Audit:**
| Table | Purpose |
|-------|---------|
| `admin_users` | Super admin accounts |
| `admin_audit_log` | Admin action audit trail |
| `auth_audit_log` | Authentication event log |
| `system_settings` | Global SaaS settings |

### MongoDB (Port 27017)

Stores tenant-scoped document data. Each tenant gets a separate database (`tenant_<tenantId>`) for data isolation.

**Collections per tenant database:**
| Collection | Purpose |
|------------|---------|
| `projects` | Project metadata and configuration |
| `tasks` | Tasks with type, priority, points, assignments |
| `sprints` | Sprint definitions and state |
| `columns` | Kanban board column configuration |
| `tags` | Project tags and labels |
| `comments` | Comment threads on tasks |
| `activity_log` | Activity history for audit |
| `documents` | Project documentation sections |
| `draft_sessions` | In-progress document drafts |

### Tenant Routing

```
Request → Auth Middleware (extract tenantId from JWT)
        → Tenant Router (getTenantDb(tenantId))
        → MongoDB database: tenant_<tenantId>
        → Collection: projects / tasks / etc.
```

Two separate MongoDB clients are maintained:
1. **System client** (`client.ts`) — connects to the `infinia` database for system-level operations
2. **Tenant router** (`tenant-router.ts`) — routes to `tenant_<id>` databases for tenant-scoped data

Both are initialized at startup in `db/index.ts`.

---

## Authentication Architecture

### SSO Flow (Entra ID)

```
Browser                    Backend                     Entra ID
  │                          │                            │
  │  GET /sso/entra/login    │                            │
  │─────────────────────────>│                            │
  │  { authUrl }             │                            │
  │<─────────────────────────│                            │
  │                          │                            │
  │  Redirect to Entra ID    │                            │
  │──────────────────────────────────────────────────────>│
  │                          │                            │
  │  Redirect with code      │                            │
  │<──────────────────────────────────────────────────────│
  │                          │                            │
  │  POST /sso/entra/callback│                            │
  │  { code, state }         │                            │
  │─────────────────────────>│  Exchange code for tokens  │
  │                          │───────────────────────────>│
  │                          │  { id_token, access_token }│
  │                          │<───────────────────────────│
  │                          │                            │
  │                          │  Check directory roles     │
  │                          │───────────────────────────>│
  │                          │  { roles }                 │
  │                          │<───────────────────────────│
  │                          │                            │
  │  { jwt, user }           │                            │
  │<─────────────────────────│                            │
```

**Auto-provisioning logic:**
1. Extract user info from ID token (email, name, oid, tid)
2. Look up existing consent by Entra tenant ID
3. If no consent exists:
   - Check domain whitelist (if enabled)
   - Use pre-assigned tenant or create a new one
   - Initialize tenant MongoDB database
   - Create consent record
4. Find or create user record
5. Check Azure AD roles → set org admin if Global/Directory Admin
6. First user for a new tenant always becomes org admin
7. Set OpenFGA permissions (admin or member)
8. Issue JWT with `{ userId, email, tenantId, isOrgAdmin }`

### JWT Token Structure

```json
{
  "userId": "uuid",
  "email": "user@org.com",
  "tenantId": "uuid",
  "isOrgAdmin": true
}
```

Stored in `localStorage` as `infinia_token`. Sent as `Authorization: Bearer <token>` header.

---

## Authorization Model (OpenFGA)

Based on Google Zanzibar, providing relationship-based access control.

```
organization
  ├── relation admin: [user]
  └── relation member: [user] or admin

project
  ├── relation organization: [organization]
  ├── relation admin: [user] or admin from organization
  ├── relation member: [user] or admin or member from organization
  └── relation viewer: [user] or member

team
  ├── relation project: [project]
  ├── relation lead: [user]
  └── relation member: [user] or lead

task
  ├── relation project: [project]
  ├── relation assignee: [user]
  ├── relation can_edit: assignee or admin from project or member from project
  └── relation can_view: can_edit or viewer from project

sprint
  ├── relation project: [project]
  ├── relation can_manage: admin from project
  └── relation can_view: member from project or viewer from project
```

**Permission inheritance:** Organization admin/member roles cascade down to project, team, task, and sprint levels through relation tuples.

---

## AI Architecture

### Backend AI Service

```
Frontend                    Backend                     AI Provider
  │                          │                            │
  │  POST /api/v1/ai/generate│                            │
  │  { messages, model,      │                            │
  │    temperature }         │                            │
  │─────────────────────────>│                            │
  │                          │  Load provider config      │
  │                          │  (cached 60s)              │
  │                          │                            │
  │                          │  POST /chat/completions    │
  │                          │  { model, messages,        │
  │                          │    max_tokens, temperature }│
  │                          │───────────────────────────>│
  │                          │                            │
  │                          │  { choices, usage }        │
  │                          │<───────────────────────────│
  │                          │                            │
  │  { text, model, usage }  │                            │
  │<─────────────────────────│                            │
```

**Supported providers:**
| Provider | Type | Default Model |
|----------|------|---------------|
| OpenAI | `openai` | gpt-4o-mini |
| Anthropic | `anthropic` | claude-3-5-sonnet |
| Google | `google` | gemini-1.5-flash |
| Groq | `groq` | llama-3.1-70b-versatile |
| Together AI | `together` | meta-llama/Llama-3-70b |
| Azure OpenAI | `openai_compatible` | Configured per deployment |
| OpenRouter | `openai_compatible` | Configured per setup |
| Ollama / LM Studio / vLLM | `openai_compatible` | default |

**Key behaviors:**
- API keys stored in PostgreSQL, never exposed to frontend
- Default `max_tokens: 4096` for OpenAI-compatible providers
- 120-second fetch timeout to prevent hanging requests
- Anthropic uses a separate API format handler (`/messages` endpoint)
- JSON response mode appends instruction to system message
- Provider config cached for 60 seconds with manual cache clear

### Centralized Prompt Templates

All 16 AI prompts are centralized in `frontend/src/lib/prompts.ts`:

| Function | Purpose |
|----------|---------|
| `analyzeImportedDocument` | Analyze uploaded document for product vision |
| `analyzeProductConcept` | Analyze product idea from scratch |
| `generateMoreSuggestions` | Generate additional vision suggestions |
| `generatePRD` | Generate full PRD document |
| `generateDocSection` | Generate individual doc section |
| `generateProjectPlan` | Generate epics and tasks plan |
| `generateTasksForEpic` | AI-generate tasks within an epic |
| `refineVision` | Refine vision via chat |
| `editDocSection` | Edit doc section via chat |
| `editPlanStructure` | Edit plan via chat |
| `editPRDSection` | Edit PRD section inline |
| `generateTask` | AI-generate a single task |
| `updateTask` | AI-update existing task |
| `copilotContext` | Build copilot workspace context |
| `copilotToolsDef` | Define copilot tool schema |
| `buildCopilotPrompt` | Assemble full copilot prompt |

Shared style constants (`TAILWIND_STYLE_FULL`, `TAILWIND_STYLE_COMPACT`, etc.) are reused across prompts to ensure consistent HTML output.

---

## Docker Deployment

### Services

| Service | Image | Port | Health Check |
|---------|-------|------|-------------|
| **frontend** | Node + nginx | 8080 | nginx alive |
| **admin** | Node + nginx | 8084 | nginx alive |
| **api** | Node 20 Alpine | 3000 | `GET /api/v1/health` |
| **postgres** | PostgreSQL 16 | 5432 | `pg_isready` |
| **mongo** | MongoDB 7 | 27017 | `mongosh --eval` |
| **openfga** | OpenFGA | 8088 (HTTP), 8089 (gRPC), 3002 (Playground) | grpc_health_probe |
| **openfga-migrate** | OpenFGA | — | Runs once at startup |
| **adminer** | Adminer | 8081 | — |
| **mongo-express** | Mongo Express | 8083 | — |

### Startup Order

```
postgres ──────────────────> openfga-migrate ──> openfga
    │                                              │
    ├──> mongo ─────────────────────────────────────┤
    │                                              │
    └──────────────── api (waits for all 3) ───────┘
                        │
              ┌─────────┴─────────┐
              │                   │
          frontend             admin
```

### Network

All services share a single Docker bridge network. Frontend and admin proxy API requests to the `api` service via nginx:

```nginx
location /api/ {
    proxy_pass http://api:3000/api/;
    proxy_read_timeout 300s;
    proxy_connect_timeout 60s;
    proxy_send_timeout 300s;
}
```

---

## API Endpoints

**Base URL:** `http://localhost:3000/api/v1`

| Group | Prefix | Key Endpoints |
|-------|--------|---------------|
| Auth | `/auth` | register, login, me |
| SSO | `/sso` | providers, entra/login, entra/callback |
| Admin | `/admin` | auth, settings, providers, tenants, users |
| Projects | `/projects` | CRUD, members, git linking |
| Tasks | `/tasks` | CRUD, assign, move, filter |
| Sprints | `/sprints` | CRUD, start, close, active |
| Users | `/users` | CRUD |
| Tags | `/tags` | CRUD |
| Columns | `/columns` | CRUD, reorder |
| Comments | `/comments` | CRUD per task |
| Activity | `/activity` | List by entity |
| AI | `/ai` | generate, complete, models, status, test |
| Git | `/git` | providers, connections, OAuth, repos |
| Documents | `/documents` | CRUD per project |
| Doc Sync | `/projects/:id/docs/sync` | push/pull to Git |
| Products | `/products` | create (async job), status, SSE stream |
| Drafts | `/drafts` | Session management |
| Health | `/health` | DB connection status |

---

## State Management

### Frontend (React Context)

| Context | Purpose |
|---------|---------|
| `ProjectDataContext` | Projects, tasks, teams, users, sprints, columns, tags |
| `ThemeContext` | Dark/light mode toggle |
| `ToastContext` | Toast notification queue |

### Admin Portal

| Context | Purpose |
|---------|---------|
| `AuthContext` | Admin authentication state |

All API state is fetched on mount and refreshed after mutations. No external state management library — React Context + `useState` throughout.

---

## Security

- **API keys** — AI and Git provider keys stored server-side, never sent to frontend
- **JWT** — Signed with `JWT_SECRET`, includes tenant scoping
- **CORS** — Configured via `cors` middleware
- **Helmet** — Security headers via `helmet` middleware
- **CSRF** — OAuth state parameter with cryptographic nonce
- **Input validation** — Zod schemas for request validation
- **Password hashing** — bcryptjs with salt rounds
- **Tenant isolation** — Separate MongoDB databases per tenant
- **Domain whitelist** — Optional signup restriction by email domain
- **OpenFGA** — Fine-grained permission checks before data access
- **Git token encryption** — OAuth tokens stored encrypted in PostgreSQL
