# Infinia Backend API

A Node.js/Express backend with OpenFGA RBAC authorization and Supabase database.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Express    │────▶│  Supabase   │
│   (React)   │     │   API       │     │  Database   │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  OpenFGA    │
                    │  Auth       │
                    └─────────────┘
```

## RBAC Model

```
Platform
  └── admin: [user]

Tenant (Organization)
  ├── admin: [user]
  └── member: [user] or admin

Workspace (Project)
  ├── tenant: [tenant]
  ├── admin: [user] or tenant.can_manage
  ├── member: [user] or admin
  └── viewer: [user] or member

Task
  ├── workspace: [workspace]
  ├── reporter: [user] - full access
  └── assignee: [user] - comment + stages only
```

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Docker (for OpenFGA)
- Supabase project

### 2. Start OpenFGA

```bash
# Start OpenFGA locally
docker-compose -f docker-compose.dev.yml up -d

# Verify it's running
curl http://localhost:8080/healthz
```

### 3. Setup Environment

```bash
# Copy example env
cp .env.example .env

# Edit with your values
nano .env
```

### 4. Install & Setup

```bash
# Install dependencies
npm install

# Setup OpenFGA (creates store and writes model)
npm run fga:setup

# Copy the output OPENFGA_STORE_ID and OPENFGA_MODEL_ID to .env

# Run database migrations (optional, if using custom auth)
npm run db:migrate
```

### 5. Run

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/auth/me` | Get current user |
| PATCH | `/api/v1/auth/me` | Update profile |
| POST | `/api/v1/auth/change-password` | Change password |

### Tasks

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/tasks` | workspace.can_read | List tasks |
| GET | `/api/v1/tasks/:taskId` | task.can_read | Get task |
| GET | `/api/v1/tasks/:taskId/permissions` | - | Get user permissions |
| POST | `/api/v1/tasks` | workspace.can_write | Create task |
| PATCH | `/api/v1/tasks/:taskId` | task.can_manage_fields | Update fields |
| PATCH | `/api/v1/tasks/:taskId/stage` | task.can_manage_stages | Update stage |
| PATCH | `/api/v1/tasks/:taskId/assignee` | task.can_assign | Update assignee |
| DELETE | `/api/v1/tasks/:taskId` | task.can_delete | Delete task |
| GET | `/api/v1/tasks/:taskId/comments` | task.can_read | Get comments |
| POST | `/api/v1/tasks/:taskId/comments` | task.can_comment | Add comment |

### Workspaces

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/workspaces` | tenant.can_read | List workspaces |
| GET | `/api/v1/workspaces/:id` | workspace.can_read | Get workspace |
| POST | `/api/v1/workspaces` | tenant.can_manage | Create workspace |
| PATCH | `/api/v1/workspaces/:id` | workspace.can_manage | Update workspace |
| DELETE | `/api/v1/workspaces/:id` | workspace.can_manage | Delete workspace |
| GET | `/api/v1/workspaces/:id/members` | workspace.can_read | List members |
| POST | `/api/v1/workspaces/:id/members` | workspace.can_manage | Add member |
| DELETE | `/api/v1/workspaces/:id/members/:userId` | workspace.can_manage | Remove member |

### Tenants

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/tenants` | - | List tenants |
| GET | `/api/v1/tenants/:id` | tenant.can_read | Get tenant |
| POST | `/api/v1/tenants` | - | Create tenant |
| PATCH | `/api/v1/tenants/:id` | tenant.can_manage | Update tenant |
| DELETE | `/api/v1/tenants/:id` | tenant.can_manage | Delete tenant |
| GET | `/api/v1/tenants/:id/members` | tenant.can_read | List members |
| POST | `/api/v1/tenants/:id/members` | tenant.can_manage | Add member |

## Deployment

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f api
```

### Cloud Platforms

**Railway/Render/Fly.io:**
1. Connect your repository
2. Set environment variables
3. Deploy

**AWS/GCP/Azure:**
1. Build Docker image
2. Push to container registry
3. Deploy to ECS/Cloud Run/Container Apps

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `OPENFGA_API_URL` | Yes | OpenFGA server URL |
| `OPENFGA_STORE_ID` | Yes | OpenFGA store ID |
| `OPENFGA_MODEL_ID` | No | OpenFGA model ID |
| `JWT_SECRET` | Yes | JWT signing secret (32+ chars) |
| `JWT_EXPIRES_IN` | No | JWT expiration (default: 7d) |
| `CORS_ORIGIN` | No | Allowed CORS origin |

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration
│   ├── lib/            # External clients (Supabase, OpenFGA)
│   ├── middleware/     # Express middleware
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── scripts/        # Setup scripts
│   ├── types/          # TypeScript types
│   ├── utils/          # Utilities
│   └── index.ts        # Entry point
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Permission Matrix

### Task Permissions

| Action | Reporter | Assignee | Workspace Admin |
|--------|----------|----------|-----------------|
| Read | ✓ | ✓ | ✓ |
| Comment | ✓ | ✓ | - |
| Manage Stages | ✓ | ✓ | - |
| Manage Fields | ✓ | - | ✓ |
| Delete | ✓ | - | ✓ |
| Assign | ✓ | - | ✓ |

## License

MIT
