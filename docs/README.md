# Infinia Products Documentation

Welcome to the comprehensive documentation for Infinia Products - a modern product management platform with React frontend and Node.js/Express backend.

## Quick Links

- **New to Infinia?** Start with the [Quick Start Guide](getting-started/quick-start.md)
- **Need API docs?** Check the [API Reference](api/README.md)
- **Testing?** See our [Test Strategy](testing/test-strategy.md) and [Test Cases](testing/test-cases/)
- **Setting up for production?** Read the [Deployment Guide](deployment/production-deployment.md)

## Documentation Structure

### 🚀 Getting Started

Essential guides to get you up and running quickly.

- [Quick Start Guide](getting-started/quick-start.md) - 5-minute path to running the app
- [Installation](getting-started/installation.md) - Complete setup instructions
- [Environment Setup](getting-started/environment-setup.md) - Configuration guide
- [Your First Project](getting-started/first-project.md) - Tutorial walkthrough

### 🏗️ Architecture

Deep dive into the system design and technical architecture.

- [System Architecture](architecture/system-architecture.md) - Three-tier architecture overview
- [Database Schema](architecture/database-schema.md) - Complete ERD with 27+ models
- [Authentication & Authorization](architecture/authentication-authorization.md) - JWT, OAuth, permissions
- [Multi-Tenancy](architecture/multi-tenancy.md) - Organization isolation and data scoping
- [Data Flow](architecture/data-flow.md) - Request/response lifecycle

### 📡 API Reference

Complete API documentation for all endpoints.

- [API Overview](api/README.md) - Conventions, authentication, error handling
- [Authentication](api/authentication.md) - Login, registration, OAuth flows
- [Organizations](api/organizations.md) - Organization management, members, settings
- [Projects](api/projects.md) - Project CRUD, members, lifecycle
- [Tasks](api/tasks.md) - Task management, subtasks, dependencies
- [Sprints](api/sprints.md) - Sprint planning and execution
- [Teams](api/teams.md) - Team management
- [Users](api/users.md) - User profiles and preferences
- [Notifications](api/notifications.md) - Notification system
- [Comments](api/comments.md) - Task comments
- [Document Comments](api/document-comments.md) - PRD commenting system
- [GitHub Integration](api/github-integration.md) - GitHub OAuth and sync
- [Activity](api/activity.md) - Activity logging
- [Tags](api/tags.md) - Tag management
- [Columns](api/columns.md) - Kanban column management

### 📖 User Guides

Step-by-step guides for all major features.

- [Authentication Flows](user-guides/authentication-flows.md) - Registration, login, OAuth, password reset
- [Organization Management](user-guides/organization-management.md) - Create, join, manage organizations
- [Product Wizard](user-guides/product-wizard.md) - AI-powered product creation (4-step wizard)
- [Project Management](user-guides/project-management.md) - Create and manage projects
- [Task Management](user-guides/task-management.md) - Create, edit, assign tasks
- [Kanban Boards](user-guides/kanban-boards.md) - Drag-drop task boards
- [Sprint Planning](user-guides/sprint-planning.md) - Sprint creation and execution
- [Team Collaboration](user-guides/team-collaboration.md) - Team setup and management
- [PRD Documents](user-guides/prd-documents.md) - Product requirements documentation
- [Notifications](user-guides/notifications.md) - Notification preferences
- [Settings](user-guides/settings.md) - User and organization settings

### 💻 Developer Guides

Resources for developers working on the codebase.

- [Code Structure](developer/code-structure.md) - File organization and conventions
- [Backend Development](developer/backend-development.md) - Express API development
- [Frontend Development](developer/frontend-development.md) - React development
- [Adding Features](developer/adding-features.md) - Step-by-step feature development
- [Database Migrations](developer/database-migrations.md) - Schema changes and seeds
- [State Management](developer/state-management.md) - React context architecture
- [Styling Guide](developer/styling-guide.md) - Tailwind conventions
- [Troubleshooting](developer/troubleshooting.md) - Common issues and solutions

### 🚢 Deployment

Production deployment and operations guides.

- [Production Deployment](deployment/production-deployment.md) - Deployment checklist
- [Environment Configuration](deployment/environment-configuration.md) - Environment variables
- [Docker Setup](deployment/docker-setup.md) - Container orchestration
- [Database Setup](deployment/database-setup.md) - MongoDB configuration
- [Security Checklist](deployment/security-checklist.md) - Security best practices
- [Monitoring](deployment/monitoring.md) - Health checks and logging

### 🧪 Testing

Comprehensive testing documentation and test cases.

- [Test Strategy](testing/test-strategy.md) - Testing approach and tools
- [Manual Testing Flows](testing/manual-testing-flows.md) - End-to-end test scenarios
- [Automation Guide](testing/automation-guide.md) - Test automation setup

#### Test Plans
- [Authentication](testing/test-plans/authentication.md)
- [Organization Management](testing/test-plans/organization-management.md)
- [Project Management](testing/test-plans/project-management.md)
- [Task Management](testing/test-plans/task-management.md)
- [Sprint Planning](testing/test-plans/sprint-planning.md)
- [Team Collaboration](testing/test-plans/team-collaboration.md)
- [Notifications](testing/test-plans/notifications.md)
- [GitHub Integration](testing/test-plans/github-integration.md)

#### Test Cases (200+ detailed test cases)
- [Authentication Test Cases](testing/test-cases/authentication-test-cases.md) - 30+ tests
- [Organization Test Cases](testing/test-cases/organization-test-cases.md) - 25+ tests
- [Project Test Cases](testing/test-cases/project-test-cases.md) - 30+ tests
- [Task Test Cases](testing/test-cases/task-test-cases.md) - 50+ tests
- [Sprint Test Cases](testing/test-cases/sprint-test-cases.md) - 20+ tests
- [Team Test Cases](testing/test-cases/team-test-cases.md) - 15+ tests
- [Notification Test Cases](testing/test-cases/notification-test-cases.md) - 20+ tests
- [Integration Test Cases](testing/test-cases/integration-test-cases.md) - 30+ tests

### 📊 Diagrams

Visual documentation and architecture diagrams.

- [System Architecture](diagrams/system-architecture.svg) - Three-tier architecture
- [Database ERD](diagrams/database-erd.svg) - Entity relationship diagram
- [Authentication Flow](diagrams/authentication-flow.svg) - JWT and OAuth flows
- [Organization Onboarding](diagrams/organization-onboarding.svg) - Onboarding decision tree
- [Product Wizard Flow](diagrams/product-wizard-flow.svg) - 4-step wizard process
- [Task Lifecycle](diagrams/task-lifecycle.svg) - Task state transitions
- [Sprint Workflow](diagrams/sprint-workflow.svg) - Sprint planning and execution
- [Notification Flow](diagrams/notification-flow.svg) - Notification generation

## Tech Stack Summary

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS
- **State**: React Context (ProjectDataContext, ThemeContext)
- **AI**: Claude API, Gemini API

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 4
- **Database**: MongoDB with Mongoose 9
- **Auth**: JWT + OAuth 2.0 (Google, Microsoft, GitHub)
- **Email**: Resend
- **Security**: Helmet, CORS, Rate Limiting

## Project Statistics

- **80+ API endpoints** across 19 route groups
- **27+ database models** with indexes and relationships
- **62 React components** implementing all features
- **200+ comprehensive test cases** covering all flows
- **Multi-tenant architecture** with organization-level isolation
- **AI-powered features** for product generation and task descriptions

## Quick Commands

```bash
# Frontend Development
npm install                 # Install dependencies
npm run dev                 # Start dev server (port 3000)
npm run build               # Production build

# Backend Development
cd backend
npm install                 # Install dependencies
npm run dev                 # Start with tsx watch
npm run db:seed             # Seed database
npm start                   # Run compiled code

# Testing
npm test                    # Run tests
npm run test:coverage       # Coverage report
```

## Getting Help

- **Installation Issues?** See [Troubleshooting](developer/troubleshooting.md)
- **API Questions?** Check the [API Reference](api/README.md)
- **Feature Requests?** Open an issue on GitHub
- **Security Concerns?** See [Security Checklist](deployment/security-checklist.md)

## Contributing

When adding new features or making changes:
1. Update relevant documentation in the same PR
2. Add or update test cases
3. Follow the [Code Structure](developer/code-structure.md) guidelines
4. Update API documentation if endpoints change

## Documentation Maintenance

This documentation is maintained alongside the codebase. If you find outdated information or errors, please:
1. Create an issue with the documentation label
2. Submit a PR with corrections
3. Tag the documentation owner for review

---

**Last Updated**: 2026-02-05
**Version**: 1.0.0
**Documentation Coverage**: Complete
