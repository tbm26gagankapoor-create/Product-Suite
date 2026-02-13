import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/database.json');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log(`Seeding database at: ${DB_PATH}`);

const defaultPassword = bcrypt.hashSync('password123', 10);
const timestamp = new Date().toISOString();

const database = {
  users: [
    { id: 'user-001', name: 'Alice Smith', email: 'alice@infinia.com', password_hash: defaultPassword, avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', role: 'Product Owner', created_at: timestamp, updated_at: timestamp },
    { id: 'user-002', name: 'Bob Johnson', email: 'bob@infinia.com', password_hash: defaultPassword, avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob', role: 'Frontend Lead', created_at: timestamp, updated_at: timestamp },
    { id: 'user-003', name: 'Charlie Davis', email: 'charlie@infinia.com', password_hash: defaultPassword, avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie', role: 'UI/UX Designer', created_at: timestamp, updated_at: timestamp },
    { id: 'user-004', name: 'Dave Wilson', email: 'dave@infinia.com', password_hash: defaultPassword, avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dave', role: 'Backend Lead', created_at: timestamp, updated_at: timestamp },
    { id: 'user-005', name: 'Eve Brown', email: 'eve@infinia.com', password_hash: defaultPassword, avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eve', role: 'QA Engineer', created_at: timestamp, updated_at: timestamp },
  ],

  projects: [
    { id: 'proj-001', name: 'Infinia Platform', description: 'Main product management platform with comprehensive features for team collaboration', code: 'INF', status: 'In Progress', progress_percentage: 68, is_favorite: true, owner_id: 'user-001', created_at: timestamp, updated_at: timestamp },
    { id: 'proj-002', name: 'StrataScratch', description: 'Data analytics and reporting dashboard', code: 'STR', status: 'In Progress', progress_percentage: 42, is_favorite: false, owner_id: 'user-004', created_at: timestamp, updated_at: timestamp },
  ],

  project_members: [
    { id: 'pm-001', project_id: 'proj-001', user_id: 'user-001', role: 'owner', joined_at: timestamp },
    { id: 'pm-002', project_id: 'proj-001', user_id: 'user-002', role: 'admin', joined_at: timestamp },
    { id: 'pm-003', project_id: 'proj-001', user_id: 'user-003', role: 'member', joined_at: timestamp },
    { id: 'pm-004', project_id: 'proj-001', user_id: 'user-004', role: 'member', joined_at: timestamp },
    { id: 'pm-005', project_id: 'proj-001', user_id: 'user-005', role: 'member', joined_at: timestamp },
    { id: 'pm-006', project_id: 'proj-002', user_id: 'user-004', role: 'owner', joined_at: timestamp },
    { id: 'pm-007', project_id: 'proj-002', user_id: 'user-001', role: 'member', joined_at: timestamp },
    { id: 'pm-008', project_id: 'proj-002', user_id: 'user-005', role: 'member', joined_at: timestamp },
  ],

  columns_status: [
    { id: 'col-001', project_id: 'proj-001', title: 'IDEA', display_order: 0, color: 'gray', is_default: false, created_at: timestamp },
    { id: 'col-002', project_id: 'proj-001', title: 'TO DO', display_order: 1, color: 'blue', is_default: true, created_at: timestamp },
    { id: 'col-003', project_id: 'proj-001', title: 'IN PROGRESS', display_order: 2, color: 'yellow', is_default: false, created_at: timestamp },
    { id: 'col-004', project_id: 'proj-001', title: 'TESTING', display_order: 3, color: 'purple', is_default: false, created_at: timestamp },
    { id: 'col-005', project_id: 'proj-001', title: 'DONE', display_order: 4, color: 'green', is_default: false, created_at: timestamp },
    { id: 'col-006', project_id: 'proj-002', title: 'IDEA', display_order: 0, color: 'gray', is_default: false, created_at: timestamp },
    { id: 'col-007', project_id: 'proj-002', title: 'TO DO', display_order: 1, color: 'blue', is_default: true, created_at: timestamp },
    { id: 'col-008', project_id: 'proj-002', title: 'IN PROGRESS', display_order: 2, color: 'yellow', is_default: false, created_at: timestamp },
    { id: 'col-009', project_id: 'proj-002', title: 'TESTING', display_order: 3, color: 'purple', is_default: false, created_at: timestamp },
    { id: 'col-010', project_id: 'proj-002', title: 'DONE', display_order: 4, color: 'green', is_default: false, created_at: timestamp },
  ],

  sprints: [
    { id: 'sprint-001', project_id: 'proj-001', name: 'Sprint 25: Mobile Optimization', goal: 'Improve mobile experience and performance across all views', start_date: '2025-01-06', end_date: '2025-01-20', status: 'active', velocity: 45, created_at: timestamp, updated_at: timestamp },
    { id: 'sprint-002', project_id: 'proj-001', name: 'Sprint 26: UI Polish', goal: 'Refine UI components and improve accessibility', start_date: '2025-01-21', end_date: '2025-02-03', status: 'planned', velocity: null, created_at: timestamp, updated_at: timestamp },
    { id: 'sprint-003', project_id: 'proj-002', name: 'Sprint 12: Data Pipeline', goal: 'Build data ingestion pipeline', start_date: '2025-01-06', end_date: '2025-01-20', status: 'active', velocity: 38, created_at: timestamp, updated_at: timestamp },
  ],

  tags: [
    { id: 'tag-001', project_id: 'proj-001', label: 'Frontend', color: 'blue', created_at: timestamp },
    { id: 'tag-002', project_id: 'proj-001', label: 'Backend', color: 'purple', created_at: timestamp },
    { id: 'tag-003', project_id: 'proj-001', label: 'Design', color: 'green', created_at: timestamp },
    { id: 'tag-004', project_id: 'proj-001', label: 'UI/UX', color: 'yellow', created_at: timestamp },
    { id: 'tag-005', project_id: 'proj-001', label: 'Bug', color: 'red', created_at: timestamp },
    { id: 'tag-006', project_id: 'proj-001', label: 'Performance', color: 'purple', created_at: timestamp },
    { id: 'tag-007', project_id: 'proj-001', label: 'API', color: 'blue', created_at: timestamp },
    { id: 'tag-008', project_id: 'proj-001', label: 'Mobile', color: 'green', created_at: timestamp },
    { id: 'tag-009', project_id: 'proj-001', label: 'AI', color: 'purple', created_at: timestamp },
    { id: 'tag-010', project_id: 'proj-001', label: 'Tech Debt', color: 'gray', created_at: timestamp },
    { id: 'tag-011', project_id: 'proj-001', label: 'High Priority', color: 'red', created_at: timestamp },
    { id: 'tag-012', project_id: 'proj-002', label: 'Analytics', color: 'blue', created_at: timestamp },
    { id: 'tag-013', project_id: 'proj-002', label: 'Data', color: 'green', created_at: timestamp },
    { id: 'tag-014', project_id: 'proj-002', label: 'Visualization', color: 'purple', created_at: timestamp },
  ],

  tasks: [
    { id: 'task-001', project_id: 'proj-001', column_id: 'col-003', sprint_id: 'sprint-001', assignee_id: 'user-002', reporter_id: 'user-001', task_number: 101, title: 'Dark Mode Support', description: 'Implement system-wide dark mode with toggle support. Should respect system preferences and allow manual override.', type: 'feature', priority: 'HIGH', points: 8, estimate: '3d', time_spent: '1d 4h', start_date: '2025-01-08', due_date: '2025-01-15', completed_at: null, impact_score: 85, product_theme: 'Delight Users', image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400', has_description: true, created_at: timestamp, updated_at: timestamp },
    { id: 'task-002', project_id: 'proj-001', column_id: 'col-003', sprint_id: 'sprint-001', assignee_id: 'user-003', reporter_id: 'user-001', task_number: 102, title: 'Unified Dashboard V2', description: 'Redesign the main dashboard with improved widget layout and customization options.', type: 'feature', priority: 'HIGH', points: 13, estimate: '5d', time_spent: '2d', start_date: '2025-01-06', due_date: '2025-01-18', completed_at: null, impact_score: 92, product_theme: 'Delight Users', image_url: null, has_description: true, created_at: timestamp, updated_at: timestamp },
    { id: 'task-003', project_id: 'proj-001', column_id: 'col-002', sprint_id: 'sprint-001', assignee_id: 'user-004', reporter_id: 'user-004', task_number: 201, title: 'Optimize Database Queries', description: 'Improve query performance for task list and sprint views. Target: 50% reduction in load time.', type: 'task', priority: 'MEDIUM', points: 5, estimate: '2d', time_spent: null, start_date: '2025-01-10', due_date: '2025-01-17', completed_at: null, impact_score: 75, product_theme: 'Scale', image_url: null, has_description: true, created_at: timestamp, updated_at: timestamp },
    { id: 'task-004', project_id: 'proj-001', column_id: 'col-002', sprint_id: 'sprint-001', assignee_id: 'user-003', reporter_id: 'user-001', task_number: 202, title: 'User Profile Page', description: 'Create comprehensive user profile page with activity history, settings, and team information.', type: 'story', priority: 'MEDIUM', points: 5, estimate: '2d', time_spent: null, start_date: '2025-01-12', due_date: '2025-01-19', completed_at: null, impact_score: 68, product_theme: 'Delight Users', image_url: null, has_description: true, created_at: timestamp, updated_at: timestamp },
    { id: 'task-005', project_id: 'proj-001', column_id: 'col-001', sprint_id: null, assignee_id: 'user-001', reporter_id: 'user-001', task_number: 301, title: 'AI-Powered Search Assistant', description: 'Integrate Claude AI for intelligent search across tasks, documents, and project data.', type: 'feature', priority: 'HIGH', points: 21, estimate: '2w', time_spent: null, start_date: null, due_date: null, completed_at: null, impact_score: 95, product_theme: 'Innovation', image_url: null, has_description: true, created_at: timestamp, updated_at: timestamp },
    { id: 'task-006', project_id: 'proj-001', column_id: 'col-001', sprint_id: null, assignee_id: 'user-002', reporter_id: 'user-001', task_number: 302, title: 'Mobile App Offline Mode', description: 'Enable offline functionality with smart sync for mobile applications.', type: 'story', priority: 'MEDIUM', points: 13, estimate: '1w', time_spent: null, start_date: null, due_date: null, completed_at: null, impact_score: 78, product_theme: 'Scale', image_url: null, has_description: true, created_at: timestamp, updated_at: timestamp },
    { id: 'task-007', project_id: 'proj-001', column_id: 'col-005', sprint_id: null, assignee_id: 'user-004', reporter_id: 'user-004', task_number: 99, title: 'Legacy Data Migration', description: 'Migrate data from legacy system to new database schema.', type: 'feature', priority: 'HIGH', points: 8, estimate: '3d', time_spent: '3d 2h', start_date: '2024-12-15', due_date: '2024-12-20', completed_at: null, impact_score: 70, product_theme: 'Scale', image_url: null, has_description: true, created_at: timestamp, updated_at: timestamp },
  ],

  subtasks: [
    { id: 'sub-001', parent_task_id: 'task-001', sprint_id: 'sprint-001', assignee_id: 'user-002', title: 'Implement theme context provider', description: null, type: 'task', status: 'done', is_completed: true, display_order: 1, created_at: timestamp, updated_at: timestamp },
    { id: 'sub-002', parent_task_id: 'task-001', sprint_id: 'sprint-001', assignee_id: 'user-003', title: 'Design dark color palette', description: null, type: 'task', status: 'done', is_completed: true, display_order: 2, created_at: timestamp, updated_at: timestamp },
    { id: 'sub-003', parent_task_id: 'task-001', sprint_id: 'sprint-001', assignee_id: 'user-002', title: 'Update all components for dark mode', description: null, type: 'task', status: 'in-progress', is_completed: false, display_order: 3, created_at: timestamp, updated_at: timestamp },
    { id: 'sub-004', parent_task_id: 'task-002', sprint_id: 'sprint-001', assignee_id: 'user-003', title: 'Create wireframes and mockups', description: null, type: 'task', status: 'done', is_completed: true, display_order: 1, created_at: timestamp, updated_at: timestamp },
    { id: 'sub-005', parent_task_id: 'task-002', sprint_id: 'sprint-001', assignee_id: 'user-002', title: 'Implement widget grid system', description: null, type: 'task', status: 'in-progress', is_completed: false, display_order: 2, created_at: timestamp, updated_at: timestamp },
  ],

  task_tags: [
    { id: 'tt-001', task_id: 'task-001', tag_id: 'tag-001', created_at: timestamp },
    { id: 'tt-002', task_id: 'task-001', tag_id: 'tag-004', created_at: timestamp },
    { id: 'tt-003', task_id: 'task-002', tag_id: 'tag-001', created_at: timestamp },
    { id: 'tt-004', task_id: 'task-002', tag_id: 'tag-003', created_at: timestamp },
    { id: 'tt-005', task_id: 'task-002', tag_id: 'tag-004', created_at: timestamp },
    { id: 'tt-006', task_id: 'task-003', tag_id: 'tag-002', created_at: timestamp },
    { id: 'tt-007', task_id: 'task-003', tag_id: 'tag-006', created_at: timestamp },
    { id: 'tt-008', task_id: 'task-004', tag_id: 'tag-001', created_at: timestamp },
    { id: 'tt-009', task_id: 'task-004', tag_id: 'tag-003', created_at: timestamp },
    { id: 'tt-010', task_id: 'task-005', tag_id: 'tag-009', created_at: timestamp },
    { id: 'tt-011', task_id: 'task-005', tag_id: 'tag-001', created_at: timestamp },
    { id: 'tt-012', task_id: 'task-005', tag_id: 'tag-002', created_at: timestamp },
    { id: 'tt-013', task_id: 'task-006', tag_id: 'tag-008', created_at: timestamp },
    { id: 'tt-014', task_id: 'task-006', tag_id: 'tag-001', created_at: timestamp },
    { id: 'tt-015', task_id: 'task-007', tag_id: 'tag-002', created_at: timestamp },
    { id: 'tt-016', task_id: 'task-007', tag_id: 'tag-010', created_at: timestamp },
  ],

  comments: [
    { id: 'com-001', task_id: 'task-001', user_id: 'user-001', parent_comment_id: null, content: 'This is a high priority feature. Lets make sure we get the color contrast right for accessibility.', is_edited: false, created_at: timestamp, updated_at: timestamp },
    { id: 'com-002', task_id: 'task-001', user_id: 'user-003', parent_comment_id: null, content: 'I have prepared the color palette based on WCAG guidelines. Ready for implementation.', is_edited: false, created_at: timestamp, updated_at: timestamp },
    { id: 'com-003', task_id: 'task-001', user_id: 'user-002', parent_comment_id: null, content: 'Theme context is now implemented. Moving on to component updates.', is_edited: false, created_at: timestamp, updated_at: timestamp },
    { id: 'com-004', task_id: 'task-002', user_id: 'user-001', parent_comment_id: null, content: 'The new dashboard mockups look great! Lets proceed with implementation.', is_edited: false, created_at: timestamp, updated_at: timestamp },
    { id: 'com-005', task_id: 'task-002', user_id: 'user-003', parent_comment_id: null, content: 'Thanks! Ill be available for any design clarifications during implementation.', is_edited: false, created_at: timestamp, updated_at: timestamp },
    { id: 'com-006', task_id: 'task-003', user_id: 'user-004', parent_comment_id: null, content: 'Identified 3 N+1 query issues. Will fix in this sprint.', is_edited: false, created_at: timestamp, updated_at: timestamp },
    { id: 'com-007', task_id: 'task-005', user_id: 'user-001', parent_comment_id: null, content: 'This will be a game-changer for user productivity. Prioritizing for next quarter.', is_edited: false, created_at: timestamp, updated_at: timestamp },
  ],

  attachments: [],
  activity_log: [],
  user_preferences: [
    { id: 'pref-001', user_id: 'user-001', theme: 'light', default_project_id: 'proj-001', notification_email: true, notification_push: true, created_at: timestamp, updated_at: timestamp },
    { id: 'pref-002', user_id: 'user-002', theme: 'dark', default_project_id: 'proj-001', notification_email: true, notification_push: true, created_at: timestamp, updated_at: timestamp },
    { id: 'pref-003', user_id: 'user-003', theme: 'system', default_project_id: 'proj-001', notification_email: true, notification_push: false, created_at: timestamp, updated_at: timestamp },
    { id: 'pref-004', user_id: 'user-004', theme: 'dark', default_project_id: 'proj-002', notification_email: true, notification_push: true, created_at: timestamp, updated_at: timestamp },
    { id: 'pref-005', user_id: 'user-005', theme: 'light', default_project_id: 'proj-001', notification_email: false, notification_push: true, created_at: timestamp, updated_at: timestamp },
  ],
};

fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2));

console.log('Database seeded successfully!');
console.log('Default password for all users: password123');
console.log(`Database file: ${DB_PATH}`);
