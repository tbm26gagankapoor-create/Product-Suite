import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = process.env.DATABASE_PATH || path.join(dataDir, 'infinia.db');

console.log(`Initializing database at: ${DB_PATH}`);

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

// Schema SQL
const schema = `
-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS task_tags;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS sprint_retrospectives;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS subtasks;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS sprints;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS columns_status;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;

-- USERS TABLE
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    avatar_url TEXT,
    role TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);

-- PROJECTS TABLE
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    code TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'active',
    progress_percentage INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0,
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_projects_code ON projects(code);
CREATE INDEX idx_projects_owner ON projects(owner_id);

-- PROJECT MEMBERS
CREATE TABLE project_members (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TEXT DEFAULT (datetime('now')),
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- COLUMNS STATUS TABLE
CREATE TABLE columns_status (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    color TEXT,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_columns_project ON columns_status(project_id);

-- SPRINTS TABLE
CREATE TABLE sprints (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    goal TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
    velocity INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_sprints_project ON sprints(project_id);
CREATE INDEX idx_sprints_status ON sprints(status);

-- TAGS TABLE
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    color TEXT NOT NULL CHECK (color IN ('purple', 'blue', 'yellow', 'green', 'red', 'gray')),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(project_id, label)
);

CREATE INDEX idx_tags_project ON tags(project_id);

-- TASKS TABLE
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    column_id TEXT REFERENCES columns_status(id) ON DELETE SET NULL,
    sprint_id TEXT REFERENCES sprints(id) ON DELETE SET NULL,
    assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    task_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'task' CHECK (type IN ('feature', 'task', 'bug', 'story')),
    priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    points INTEGER,
    estimate TEXT,
    time_spent TEXT,
    start_date TEXT,
    due_date TEXT,
    completed_at TEXT,
    impact_score INTEGER CHECK (impact_score >= 0 AND impact_score <= 100),
    product_theme TEXT,
    image_url TEXT,
    has_description INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_tasks_project_number ON tasks(project_id, task_number);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_column ON tasks(column_id);
CREATE INDEX idx_tasks_sprint ON tasks(sprint_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);

-- SUBTASKS TABLE
CREATE TABLE subtasks (
    id TEXT PRIMARY KEY,
    parent_task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    sprint_id TEXT REFERENCES sprints(id) ON DELETE SET NULL,
    assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'task' CHECK (type IN ('task', 'bug')),
    status TEXT DEFAULT 'todo',
    is_completed INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_subtasks_parent ON subtasks(parent_task_id);

-- TASK_TAGS TABLE
CREATE TABLE task_tags (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(task_id, tag_id)
);

CREATE INDEX idx_task_tags_task ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag ON task_tags(tag_id);

-- COMMENTS TABLE
CREATE TABLE comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_edited INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_comments_task ON comments(task_id);

-- ATTACHMENTS TABLE
CREATE TABLE attachments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    uploaded_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_attachments_task ON attachments(task_id);

-- ACTIVITY LOG TABLE
CREATE TABLE activity_log (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_value TEXT,
    new_value TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_activity_project ON activity_log(project_id);
CREATE INDEX idx_activity_task ON activity_log(task_id);

-- SPRINT RETROSPECTIVES TABLE
CREATE TABLE sprint_retrospectives (
    id TEXT PRIMARY KEY,
    sprint_id TEXT NOT NULL UNIQUE REFERENCES sprints(id) ON DELETE CASCADE,
    what_went_well TEXT,
    what_to_improve TEXT,
    action_items TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- USER PREFERENCES TABLE
CREATE TABLE user_preferences (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    default_project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    notification_email INTEGER DEFAULT 1,
    notification_push INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
`;

// Execute schema
db.exec(schema);

console.log('Database initialized successfully!');
db.close();
