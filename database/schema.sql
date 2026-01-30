-- ============================================
-- INFINIA PRODUCTS DATABASE SCHEMA
-- SQL Database for Product Management Platform
-- ============================================

-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS task_tags;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS attachments;
DROP TABLE IF EXISTS subtasks;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS sprints;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS columns_status;
DROP TABLE IF EXISTS users;

-- ============================================
-- USERS TABLE
-- Team members who work on products/projects
-- ============================================
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url VARCHAR(500),
    role VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster email lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- PROJECTS TABLE
-- Products/Projects being managed
-- ============================================
CREATE TABLE projects (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    code VARCHAR(10) NOT NULL UNIQUE,  -- e.g., 'INF', 'STR'
    status VARCHAR(50) DEFAULT 'active',
    progress_percentage INT DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    is_favorite BOOLEAN DEFAULT FALSE,
    owner_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_code ON projects(code);

-- ============================================
-- PROJECT MEMBERS (Junction Table)
-- Many-to-many relationship between projects and users
-- ============================================
CREATE TABLE project_members (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',  -- 'owner', 'admin', 'member', 'viewer'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- ============================================
-- COLUMNS/STATUS TABLE
-- Workflow stages (IDEA, TO DO, IN PROGRESS, TESTING, DONE)
-- ============================================
CREATE TABLE columns_status (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    color VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_columns_project ON columns_status(project_id);
CREATE INDEX idx_columns_order ON columns_status(display_order);

-- ============================================
-- SPRINTS TABLE
-- Time-boxed iterations for agile planning
-- ============================================
CREATE TABLE sprints (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'completed')),
    velocity INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_sprints_project ON sprints(project_id);
CREATE INDEX idx_sprints_status ON sprints(status);
CREATE INDEX idx_sprints_dates ON sprints(start_date, end_date);

-- ============================================
-- TAGS TABLE
-- Reusable labels for categorizing tasks
-- ============================================
CREATE TABLE tags (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    color VARCHAR(20) NOT NULL CHECK (color IN ('purple', 'blue', 'yellow', 'green', 'red', 'gray')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, label)
);

CREATE INDEX idx_tags_project ON tags(project_id);

-- ============================================
-- TASKS TABLE
-- Main work items (features, stories, bugs, tasks)
-- ============================================
CREATE TABLE tasks (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    column_id VARCHAR(36) REFERENCES columns_status(id) ON DELETE SET NULL,
    sprint_id VARCHAR(36) REFERENCES sprints(id) ON DELETE SET NULL,
    assignee_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    reporter_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,

    -- Task identification
    task_number INT NOT NULL,  -- Sequential number within project
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Task classification
    type VARCHAR(20) DEFAULT 'task' CHECK (type IN ('feature', 'task', 'bug', 'story')),
    priority VARCHAR(10) DEFAULT 'MEDIUM' CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),

    -- Planning & estimation
    points INT CHECK (points >= 0),
    estimate VARCHAR(20),  -- e.g., '2h', '1d', '1w'
    time_spent VARCHAR(20),

    -- Dates
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMP,

    -- Product management fields
    impact_score INT CHECK (impact_score >= 0 AND impact_score <= 100),
    product_theme VARCHAR(100),  -- e.g., 'Delight Users', 'Scale', 'Innovation'

    -- Media
    image_url VARCHAR(500),
    has_description BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Composite unique constraint for task identification
CREATE UNIQUE INDEX idx_tasks_project_number ON tasks(project_id, task_number);

-- Performance indexes
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_column ON tasks(column_id);
CREATE INDEX idx_tasks_sprint ON tasks(sprint_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_status ON tasks(column_id, sprint_id);
CREATE INDEX idx_tasks_dates ON tasks(start_date, due_date);
CREATE INDEX idx_tasks_impact ON tasks(impact_score);

-- ============================================
-- SUBTASKS TABLE
-- Child items under tasks (sub-tasks, child bugs)
-- ============================================
CREATE TABLE subtasks (
    id VARCHAR(36) PRIMARY KEY,
    parent_task_id VARCHAR(36) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    sprint_id VARCHAR(36) REFERENCES sprints(id) ON DELETE SET NULL,
    assignee_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,

    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'task' CHECK (type IN ('task', 'bug')),
    status VARCHAR(50) DEFAULT 'todo',
    is_completed BOOLEAN DEFAULT FALSE,

    -- Ordering
    display_order INT DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subtasks_parent ON subtasks(parent_task_id);
CREATE INDEX idx_subtasks_sprint ON subtasks(sprint_id);
CREATE INDEX idx_subtasks_assignee ON subtasks(assignee_id);
CREATE INDEX idx_subtasks_status ON subtasks(is_completed);

-- ============================================
-- TASK_TAGS (Junction Table)
-- Many-to-many relationship between tasks and tags
-- ============================================
CREATE TABLE task_tags (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id VARCHAR(36) NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, tag_id)
);

CREATE INDEX idx_task_tags_task ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag ON task_tags(tag_id);

-- ============================================
-- TASK_LINKS TABLE
-- Task dependencies (blocked by / blocks relationships)
-- ============================================
CREATE TABLE task_links (
    id VARCHAR(36) PRIMARY KEY,
    blocking_task_id VARCHAR(36) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    blocked_task_id VARCHAR(36) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    link_type VARCHAR(50) DEFAULT 'blocks',  -- 'blocks', 'relates_to', 'duplicates'
    created_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_self_link CHECK (blocking_task_id != blocked_task_id),
    CONSTRAINT unique_link UNIQUE (blocking_task_id, blocked_task_id, link_type)
);

CREATE INDEX idx_task_links_blocking ON task_links(blocking_task_id);
CREATE INDEX idx_task_links_blocked ON task_links(blocked_task_id);
CREATE INDEX idx_task_links_type ON task_links(link_type);

-- ============================================
-- COMMENTS TABLE
-- Comments on tasks
-- ============================================
CREATE TABLE comments (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id VARCHAR(36) REFERENCES comments(id) ON DELETE CASCADE,  -- For threaded comments

    content TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_comments_created ON comments(created_at);

-- ============================================
-- ATTACHMENTS TABLE
-- Files attached to tasks
-- ============================================
CREATE TABLE attachments (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    uploaded_by VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    filename VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,  -- Size in bytes

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attachments_task ON attachments(task_id);
CREATE INDEX idx_attachments_uploaded_by ON attachments(uploaded_by);

-- ============================================
-- ACTIVITY LOG TABLE
-- Track all changes for audit trail
-- ============================================
CREATE TABLE activity_log (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,
    task_id VARCHAR(36) REFERENCES tasks(id) ON DELETE CASCADE,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(50) NOT NULL,  -- 'created', 'updated', 'deleted', 'moved', 'assigned', etc.
    entity_type VARCHAR(50) NOT NULL,  -- 'task', 'subtask', 'comment', 'sprint', etc.
    entity_id VARCHAR(36),

    old_value TEXT,
    new_value TEXT,
    description TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_project ON activity_log(project_id);
CREATE INDEX idx_activity_task ON activity_log(task_id);
CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_created ON activity_log(created_at);
CREATE INDEX idx_activity_action ON activity_log(action);

-- ============================================
-- SPRINT RETROSPECTIVES TABLE
-- Store sprint retrospective notes
-- ============================================
CREATE TABLE sprint_retrospectives (
    id VARCHAR(36) PRIMARY KEY,
    sprint_id VARCHAR(36) NOT NULL UNIQUE REFERENCES sprints(id) ON DELETE CASCADE,

    what_went_well TEXT,
    what_to_improve TEXT,
    action_items TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_retro_sprint ON sprint_retrospectives(sprint_id);

-- ============================================
-- USER PREFERENCES TABLE
-- Store user-specific settings
-- ============================================
CREATE TABLE user_preferences (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    default_project_id VARCHAR(36) REFERENCES projects(id) ON DELETE SET NULL,
    notification_email BOOLEAN DEFAULT TRUE,
    notification_push BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prefs_user ON user_preferences(user_id);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Tasks with full details
CREATE VIEW v_tasks_detailed AS
SELECT
    t.id,
    t.task_number,
    CONCAT(p.code, '-', t.task_number) AS task_key,
    t.title,
    t.description,
    t.type,
    t.priority,
    t.points,
    t.estimate,
    t.time_spent,
    t.start_date,
    t.due_date,
    t.impact_score,
    t.product_theme,
    t.image_url,
    t.created_at,
    t.updated_at,
    p.id AS project_id,
    p.name AS project_name,
    p.code AS project_code,
    c.id AS column_id,
    c.title AS column_title,
    s.id AS sprint_id,
    s.name AS sprint_name,
    u.id AS assignee_id,
    u.name AS assignee_name,
    u.avatar_url AS assignee_avatar,
    (SELECT COUNT(*) FROM comments WHERE task_id = t.id) AS comments_count,
    (SELECT COUNT(*) FROM subtasks WHERE parent_task_id = t.id) AS subtasks_count,
    (SELECT COUNT(*) FROM subtasks WHERE parent_task_id = t.id AND is_completed = TRUE) AS subtasks_completed
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
LEFT JOIN columns_status c ON t.column_id = c.id
LEFT JOIN sprints s ON t.sprint_id = s.id
LEFT JOIN users u ON t.assignee_id = u.id;

-- View: Sprint summary with task counts
CREATE VIEW v_sprint_summary AS
SELECT
    s.id,
    s.name,
    s.goal,
    s.start_date,
    s.end_date,
    s.status,
    s.velocity,
    p.id AS project_id,
    p.name AS project_name,
    (SELECT COUNT(*) FROM tasks WHERE sprint_id = s.id) AS total_tasks,
    (SELECT COUNT(*) FROM tasks t
     JOIN columns_status c ON t.column_id = c.id
     WHERE t.sprint_id = s.id AND c.title = 'DONE') AS completed_tasks,
    (SELECT COALESCE(SUM(points), 0) FROM tasks WHERE sprint_id = s.id) AS total_points,
    (SELECT COALESCE(SUM(points), 0) FROM tasks t
     JOIN columns_status c ON t.column_id = c.id
     WHERE t.sprint_id = s.id AND c.title = 'DONE') AS completed_points
FROM sprints s
LEFT JOIN projects p ON s.project_id = p.id;

-- View: Project dashboard stats
CREATE VIEW v_project_stats AS
SELECT
    p.id,
    p.name,
    p.code,
    p.status,
    p.progress_percentage,
    (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) AS total_tasks,
    (SELECT COUNT(*) FROM tasks t
     JOIN columns_status c ON t.column_id = c.id
     WHERE t.project_id = p.id AND c.title = 'DONE') AS completed_tasks,
    (SELECT COUNT(*) FROM sprints WHERE project_id = p.id AND status = 'active') AS active_sprints,
    (SELECT COUNT(DISTINCT user_id) FROM project_members WHERE project_id = p.id) AS team_size,
    (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND priority = 'HIGH') AS high_priority_tasks
FROM projects p;

-- ============================================
-- FUNCTIONS & TRIGGERS (PostgreSQL specific)
-- Uncomment if using PostgreSQL
-- ============================================

-- Function to update updated_at timestamp
-- CREATE OR REPLACE FUNCTION update_updated_at_column()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     NEW.updated_at = CURRENT_TIMESTAMP;
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- Apply trigger to tables with updated_at
-- CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- CREATE TRIGGER update_subtasks_updated_at BEFORE UPDATE ON subtasks
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON sprints
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
--     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-generate task_number
-- CREATE OR REPLACE FUNCTION generate_task_number()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     SELECT COALESCE(MAX(task_number), 0) + 1 INTO NEW.task_number
--     FROM tasks WHERE project_id = NEW.project_id;
--     RETURN NEW;
-- END;
-- $$ language 'plpgsql';

-- CREATE TRIGGER auto_task_number BEFORE INSERT ON tasks
--     FOR EACH ROW EXECUTE FUNCTION generate_task_number();
