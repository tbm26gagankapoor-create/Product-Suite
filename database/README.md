# Infinia Products Database

SQL database schema for the Infinia Products management platform.

## Files

| File | Description |
|------|-------------|
| `schema.sql` | Complete database schema with tables, indexes, constraints, and views |
| `seed.sql` | Sample data matching the application mock data |
| `types.ts` | TypeScript interfaces matching the database schema |

## Database Structure

### Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│   USERS     │◄──────│ PROJECT_MEMBERS │──────►│  PROJECTS   │
└─────────────┘       └─────────────────┘       └─────────────┘
      │                                               │
      │                                               │
      ▼                                               ▼
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│   TASKS     │◄──────│    SPRINTS      │───────│COLUMNS_STATUS│
└─────────────┘       └─────────────────┘       └─────────────┘
      │
      ├──────────────────────┬──────────────────┬───────────────┐
      ▼                      ▼                  ▼               ▼
┌─────────────┐       ┌─────────────┐    ┌───────────┐   ┌─────────────┐
│  SUBTASKS   │       │  COMMENTS   │    │ TASK_TAGS │   │ ATTACHMENTS │
└─────────────┘       └─────────────┘    └───────────┘   └─────────────┘
                                               │
                                               ▼
                                         ┌───────────┐
                                         │   TAGS    │
                                         └───────────┘
```

### Tables Overview

| Table | Purpose |
|-------|---------|
| `users` | Team members with roles |
| `projects` | Products/projects being managed |
| `project_members` | Many-to-many: users ↔ projects |
| `columns_status` | Workflow stages (IDEA → DONE) |
| `sprints` | Time-boxed iterations |
| `tags` | Reusable labels for categorization |
| `tasks` | Main work items (features, stories, bugs) |
| `subtasks` | Child items under tasks |
| `task_tags` | Many-to-many: tasks ↔ tags |
| `comments` | Comments on tasks (supports threading) |
| `attachments` | Files attached to tasks |
| `activity_log` | Audit trail of all changes |
| `sprint_retrospectives` | Sprint retro notes |
| `user_preferences` | User-specific settings |

## Setup Instructions

### PostgreSQL

```bash
# Create database
createdb infinia_products

# Run schema
psql -d infinia_products -f schema.sql

# Load seed data
psql -d infinia_products -f seed.sql
```

### MySQL

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE infinia_products;"

# Run schema (may need minor syntax adjustments)
mysql -u root -p infinia_products < schema.sql

# Load seed data
mysql -u root -p infinia_products < seed.sql
```

### SQLite

```bash
# Create database and run schema
sqlite3 infinia_products.db < schema.sql

# Load seed data
sqlite3 infinia_products.db < seed.sql
```

## SQL Dialect Notes

The schema is written in standard SQL and should work with most databases. Some features may need adjustments:

| Feature | PostgreSQL | MySQL | SQLite |
|---------|------------|-------|--------|
| UUID | Use `uuid-ossp` extension | Use `CHAR(36)` | Use `TEXT` |
| BOOLEAN | Native | Use `TINYINT(1)` | Use `INTEGER` |
| Views | Full support | Full support | Full support |
| Triggers | See commented section | Adjust syntax | Adjust syntax |

## Views

Pre-built views for common queries:

- **`v_tasks_detailed`** - Tasks with project, column, sprint, assignee details
- **`v_sprint_summary`** - Sprint stats with task counts and points
- **`v_project_stats`** - Project dashboard statistics

## Sample Queries

### Get all tasks for a sprint

```sql
SELECT * FROM v_tasks_detailed
WHERE sprint_id = 'sprint-001'
ORDER BY priority DESC, created_at;
```

### Get sprint burndown data

```sql
SELECT
    s.name,
    s.status,
    COUNT(t.id) as total_tasks,
    SUM(CASE WHEN c.title = 'DONE' THEN 1 ELSE 0 END) as completed,
    COALESCE(SUM(t.points), 0) as total_points
FROM sprints s
LEFT JOIN tasks t ON t.sprint_id = s.id
LEFT JOIN columns_status c ON t.column_id = c.id
WHERE s.project_id = 'proj-001'
GROUP BY s.id, s.name, s.status;
```

### Get team workload

```sql
SELECT
    u.name,
    u.role,
    COUNT(t.id) as assigned_tasks,
    SUM(CASE WHEN c.title != 'DONE' THEN 1 ELSE 0 END) as open_tasks
FROM users u
LEFT JOIN tasks t ON t.assignee_id = u.id
LEFT JOIN columns_status c ON t.column_id = c.id
GROUP BY u.id, u.name, u.role
ORDER BY open_tasks DESC;
```

### Search tasks

```sql
SELECT * FROM v_tasks_detailed
WHERE (title ILIKE '%search%' OR description ILIKE '%search%')
  AND project_id = 'proj-001'
ORDER BY impact_score DESC;
```

## TypeScript Integration

Import types for type-safe database operations:

```typescript
import type {
  User,
  Task,
  TaskDetailed,
  CreateTaskInput,
  TaskFilters
} from './database/types';

// Example: Create a new task
const newTask: CreateTaskInput = {
  project_id: 'proj-001',
  title: 'New Feature',
  type: 'feature',
  priority: 'HIGH',
  points: 8
};

// Example: Filter tasks
const filters: TaskFilters = {
  project_id: 'proj-001',
  sprint_id: 'sprint-001',
  priority: 'HIGH',
  assignee_id: 'user-002'
};
```
