-- ============================================
-- INFINIA PRODUCTS SEED DATA
-- Sample data matching the application mock data
-- ============================================

-- ============================================
-- USERS
-- ============================================
INSERT INTO users (id, name, email, avatar_url, role) VALUES
('user-001', 'Alice Smith', 'alice@infinia.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', 'Product Owner'),
('user-002', 'Bob Johnson', 'bob@infinia.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', 'Frontend Lead'),
('user-003', 'Charlie Davis', 'charlie@infinia.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie', 'UI/UX Designer'),
('user-004', 'Dave Wilson', 'dave@infinia.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dave', 'Backend Lead'),
('user-005', 'Eve Brown', 'eve@infinia.com', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eve', 'QA Engineer');

-- ============================================
-- PROJECTS
-- ============================================
INSERT INTO projects (id, name, description, code, status, progress_percentage, is_favorite, owner_id) VALUES
('proj-001', 'Infinia Platform', 'Main product management platform with comprehensive features for team collaboration', 'INF', 'In Progress', 68, TRUE, 'user-001'),
('proj-002', 'StrataScratch', 'Data analytics and reporting dashboard', 'STR', 'In Progress', 42, FALSE, 'user-004');

-- ============================================
-- PROJECT MEMBERS
-- ============================================
INSERT INTO project_members (id, project_id, user_id, role) VALUES
-- Infinia Platform team
('pm-001', 'proj-001', 'user-001', 'owner'),
('pm-002', 'proj-001', 'user-002', 'admin'),
('pm-003', 'proj-001', 'user-003', 'member'),
('pm-004', 'proj-001', 'user-004', 'member'),
('pm-005', 'proj-001', 'user-005', 'member'),
-- StrataScratch team
('pm-006', 'proj-002', 'user-004', 'owner'),
('pm-007', 'proj-002', 'user-001', 'member'),
('pm-008', 'proj-002', 'user-005', 'member');

-- ============================================
-- COLUMNS (Status Workflow)
-- ============================================
INSERT INTO columns_status (id, project_id, title, display_order, color, is_default) VALUES
-- Infinia Platform columns
('col-001', 'proj-001', 'IDEA', 0, 'gray', FALSE),
('col-002', 'proj-001', 'TO DO', 1, 'blue', TRUE),
('col-003', 'proj-001', 'IN PROGRESS', 2, 'yellow', FALSE),
('col-004', 'proj-001', 'TESTING', 3, 'purple', FALSE),
('col-005', 'proj-001', 'DONE', 4, 'green', FALSE),
-- StrataScratch columns
('col-006', 'proj-002', 'IDEA', 0, 'gray', FALSE),
('col-007', 'proj-002', 'TO DO', 1, 'blue', TRUE),
('col-008', 'proj-002', 'IN PROGRESS', 2, 'yellow', FALSE),
('col-009', 'proj-002', 'TESTING', 3, 'purple', FALSE),
('col-010', 'proj-002', 'DONE', 4, 'green', FALSE);

-- ============================================
-- SPRINTS
-- ============================================
INSERT INTO sprints (id, project_id, name, goal, start_date, end_date, status, velocity) VALUES
('sprint-001', 'proj-001', 'Sprint 25: Mobile Optimization', 'Improve mobile experience and performance across all views', '2025-01-06', '2025-01-20', 'active', 45),
('sprint-002', 'proj-001', 'Sprint 26: UI Polish', 'Refine UI components and improve accessibility', '2025-01-21', '2025-02-03', 'planned', NULL),
('sprint-003', 'proj-002', 'Sprint 12: Data Pipeline', 'Build data ingestion pipeline', '2025-01-06', '2025-01-20', 'active', 38);

-- ============================================
-- TAGS
-- ============================================
INSERT INTO tags (id, project_id, label, color) VALUES
-- Infinia Platform tags
('tag-001', 'proj-001', 'Frontend', 'blue'),
('tag-002', 'proj-001', 'Backend', 'purple'),
('tag-003', 'proj-001', 'Design', 'green'),
('tag-004', 'proj-001', 'UI/UX', 'yellow'),
('tag-005', 'proj-001', 'Bug', 'red'),
('tag-006', 'proj-001', 'Performance', 'purple'),
('tag-007', 'proj-001', 'API', 'blue'),
('tag-008', 'proj-001', 'Mobile', 'green'),
('tag-009', 'proj-001', 'AI', 'purple'),
('tag-010', 'proj-001', 'Tech Debt', 'gray'),
('tag-011', 'proj-001', 'High Priority', 'red'),
-- StrataScratch tags
('tag-012', 'proj-002', 'Analytics', 'blue'),
('tag-013', 'proj-002', 'Data', 'green'),
('tag-014', 'proj-002', 'Visualization', 'purple');

-- ============================================
-- TASKS
-- ============================================
INSERT INTO tasks (id, project_id, column_id, sprint_id, assignee_id, reporter_id, task_number, title, description, type, priority, points, estimate, time_spent, start_date, due_date, impact_score, product_theme, image_url, has_description) VALUES
-- INF-101: Dark Mode Support
('task-001', 'proj-001', 'col-003', 'sprint-001', 'user-002', 'user-001', 101,
 'Dark Mode Support',
 'Implement system-wide dark mode with toggle support. Should respect system preferences and allow manual override.',
 'feature', 'HIGH', 8, '3d', '1d 4h', '2025-01-08', '2025-01-15', 85, 'Delight Users',
 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400', TRUE),

-- INF-102: Unified Dashboard V2
('task-002', 'proj-001', 'col-003', 'sprint-001', 'user-003', 'user-001', 102,
 'Unified Dashboard V2',
 'Redesign the main dashboard with improved widget layout and customization options.',
 'feature', 'HIGH', 13, '5d', '2d', '2025-01-06', '2025-01-18', 92, 'Delight Users',
 NULL, TRUE),

-- INF-201: Optimize Database Queries
('task-003', 'proj-001', 'col-002', 'sprint-001', 'user-004', 'user-004', 201,
 'Optimize Database Queries',
 'Improve query performance for task list and sprint views. Target: 50% reduction in load time.',
 'task', 'MEDIUM', 5, '2d', NULL, '2025-01-10', '2025-01-17', 75, 'Scale',
 NULL, TRUE),

-- INF-202: User Profile Page
('task-004', 'proj-001', 'col-002', 'sprint-001', 'user-003', 'user-001', 202,
 'User Profile Page',
 'Create comprehensive user profile page with activity history, settings, and team information.',
 'story', 'MEDIUM', 5, '2d', NULL, '2025-01-12', '2025-01-19', 68, 'Delight Users',
 NULL, TRUE),

-- INF-301: AI-Powered Search Assistant
('task-005', 'proj-001', 'col-001', NULL, 'user-001', 'user-001', 301,
 'AI-Powered Search Assistant',
 'Integrate Claude AI for intelligent search across tasks, documents, and project data.',
 'feature', 'HIGH', 21, '2w', NULL, NULL, NULL, 95, 'Innovation',
 NULL, TRUE),

-- INF-302: Mobile App Offline Mode
('task-006', 'proj-001', 'col-001', NULL, 'user-002', 'user-001', 302,
 'Mobile App Offline Mode',
 'Enable offline functionality with smart sync for mobile applications.',
 'story', 'MEDIUM', 13, '1w', NULL, NULL, NULL, 78, 'Scale',
 NULL, TRUE),

-- INF-099: Legacy Data Migration (Completed)
('task-007', 'proj-001', 'col-005', NULL, 'user-004', 'user-004', 99,
 'Legacy Data Migration',
 'Migrate data from legacy system to new database schema.',
 'feature', 'HIGH', 8, '3d', '3d 2h', '2024-12-15', '2024-12-20', 70, 'Scale',
 NULL, TRUE);

-- ============================================
-- SUBTASKS
-- ============================================
INSERT INTO subtasks (id, parent_task_id, sprint_id, assignee_id, title, type, status, is_completed, display_order) VALUES
-- Subtasks for INF-101 (Dark Mode Support)
('sub-001', 'task-001', 'sprint-001', 'user-002', 'Implement theme context provider', 'task', 'done', TRUE, 1),
('sub-002', 'task-001', 'sprint-001', 'user-003', 'Design dark color palette', 'task', 'done', TRUE, 2),
('sub-003', 'task-001', 'sprint-001', 'user-002', 'Update all components for dark mode', 'task', 'in-progress', FALSE, 3),

-- Subtasks for INF-102 (Unified Dashboard V2)
('sub-004', 'task-002', 'sprint-001', 'user-003', 'Create wireframes and mockups', 'task', 'done', TRUE, 1),
('sub-005', 'task-002', 'sprint-001', 'user-002', 'Implement widget grid system', 'task', 'in-progress', FALSE, 2);

-- ============================================
-- TASK TAGS (Many-to-Many)
-- ============================================
INSERT INTO task_tags (id, task_id, tag_id) VALUES
-- INF-101 tags
('tt-001', 'task-001', 'tag-001'),  -- Frontend
('tt-002', 'task-001', 'tag-004'),  -- UI/UX
-- INF-102 tags
('tt-003', 'task-002', 'tag-001'),  -- Frontend
('tt-004', 'task-002', 'tag-003'),  -- Design
('tt-005', 'task-002', 'tag-004'),  -- UI/UX
-- INF-201 tags
('tt-006', 'task-003', 'tag-002'),  -- Backend
('tt-007', 'task-003', 'tag-006'),  -- Performance
-- INF-202 tags
('tt-008', 'task-004', 'tag-001'),  -- Frontend
('tt-009', 'task-004', 'tag-003'),  -- Design
-- INF-301 tags
('tt-010', 'task-005', 'tag-009'),  -- AI
('tt-011', 'task-005', 'tag-001'),  -- Frontend
('tt-012', 'task-005', 'tag-002'),  -- Backend
-- INF-302 tags
('tt-013', 'task-006', 'tag-008'),  -- Mobile
('tt-014', 'task-006', 'tag-001'),  -- Frontend
-- INF-099 tags
('tt-015', 'task-007', 'tag-002'),  -- Backend
('tt-016', 'task-007', 'tag-010'); -- Tech Debt

-- ============================================
-- COMMENTS (Sample)
-- ============================================
INSERT INTO comments (id, task_id, user_id, content) VALUES
('com-001', 'task-001', 'user-001', 'This is a high priority feature. Lets make sure we get the color contrast right for accessibility.'),
('com-002', 'task-001', 'user-003', 'I have prepared the color palette based on WCAG guidelines. Ready for implementation.'),
('com-003', 'task-001', 'user-002', 'Theme context is now implemented. Moving on to component updates.'),
('com-004', 'task-002', 'user-001', 'The new dashboard mockups look great! Lets proceed with implementation.'),
('com-005', 'task-002', 'user-003', 'Thanks! Ill be available for any design clarifications during implementation.'),
('com-006', 'task-003', 'user-004', 'Identified 3 N+1 query issues. Will fix in this sprint.'),
('com-007', 'task-005', 'user-001', 'This will be a game-changer for user productivity. Prioritizing for next quarter.');

-- ============================================
-- ATTACHMENTS (Sample)
-- ============================================
INSERT INTO attachments (id, task_id, uploaded_by, filename, file_url, file_type, file_size) VALUES
('att-001', 'task-001', 'user-003', 'dark-mode-palette.png', '/attachments/dark-mode-palette.png', 'image/png', 245760),
('att-002', 'task-002', 'user-003', 'dashboard-wireframe.pdf', '/attachments/dashboard-wireframe.pdf', 'application/pdf', 1048576),
('att-003', 'task-002', 'user-003', 'dashboard-mockup-v2.fig', '/attachments/dashboard-mockup-v2.fig', 'application/figma', 2097152);

-- ============================================
-- ACTIVITY LOG (Sample recent activities)
-- ============================================
INSERT INTO activity_log (id, project_id, task_id, user_id, action, entity_type, entity_id, old_value, new_value, description) VALUES
('act-001', 'proj-001', 'task-001', 'user-002', 'updated', 'subtask', 'sub-001', 'in-progress', 'done', 'Marked subtask as completed'),
('act-002', 'proj-001', 'task-001', 'user-003', 'updated', 'subtask', 'sub-002', 'in-progress', 'done', 'Marked subtask as completed'),
('act-003', 'proj-001', 'task-002', 'user-003', 'created', 'comment', 'com-005', NULL, NULL, 'Added a comment'),
('act-004', 'proj-001', 'task-002', 'user-002', 'moved', 'task', 'task-002', 'TO DO', 'IN PROGRESS', 'Moved task to In Progress'),
('act-005', 'proj-001', 'task-003', 'user-004', 'assigned', 'task', 'task-003', NULL, 'user-004', 'Self-assigned task');

-- ============================================
-- USER PREFERENCES
-- ============================================
INSERT INTO user_preferences (id, user_id, theme, default_project_id, notification_email, notification_push) VALUES
('pref-001', 'user-001', 'light', 'proj-001', TRUE, TRUE),
('pref-002', 'user-002', 'dark', 'proj-001', TRUE, TRUE),
('pref-003', 'user-003', 'system', 'proj-001', TRUE, FALSE),
('pref-004', 'user-004', 'dark', 'proj-002', TRUE, TRUE),
('pref-005', 'user-005', 'light', 'proj-001', FALSE, TRUE);

-- ============================================
-- SPRINT RETROSPECTIVES (Sample)
-- ============================================
INSERT INTO sprint_retrospectives (id, sprint_id, what_went_well, what_to_improve, action_items) VALUES
('retro-001', 'sprint-001',
 '- Team collaboration was excellent\n- Daily standups were efficient\n- Code reviews were thorough',
 '- Need better estimation for large features\n- More communication with design team\n- Reduce context switching',
 '- Implement planning poker for estimation\n- Schedule weekly design sync\n- Block focus time on calendars');
