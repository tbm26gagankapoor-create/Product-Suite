<div align="center">

# Infinia Product Suite

### AI-Powered Product Management Platform

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://www.mongodb.com/)

*Transform your product ideas into actionable plans with AI-assisted documentation, task generation, and sprint management.*

[Features](#-features) • [Getting Started](#-getting-started) • [Documentation](docs/README.md) • [Architecture](docs/architecture/system-architecture.md) • [API Reference](docs/api/README.md)

</div>

---

## Overview

Infinia Product Suite is a comprehensive product management platform that leverages AI to streamline the entire product development lifecycle. From initial concept to sprint execution, the platform guides teams through a structured workflow while automating documentation, task breakdown, and project planning.

## ✨ Features

### 🧙‍♂️ AI-Powered Product Wizard

A sophisticated 4-step wizard that transforms product ideas into fully-planned projects:

| Step | Description |
|------|-------------|
| **1. Define** | Input product name, description, tags, or import existing documents (PDF/DOCX) |
| **2. Vision** | AI generates strategic vision with actionable suggestions |
| **3. Documents** | Auto-generates 12 comprehensive documents (PRD, Architecture, Specs, etc.) |
| **4. Plan** | Creates epics and granular tasks with story points and assignments |

**Key UX Features:**
- Animated step transitions with smooth navigation
- Clickable progress stepper for backward navigation
- Step summaries showing context from previous steps
- Real-time document generation progress tracking
- Mobile-responsive design

### 📋 Project Management

- **Kanban Board** - Drag-and-drop task management
- **List View** - Detailed task filtering and sorting
- **Timeline View** - Gantt-style project visualization
- **Sprint Planning** - Backlog management and sprint assignment

### 📄 Documentation Suite

Auto-generated documents include:
- Product Requirements Document (PRD)
- Feature Roadmap
- Business Architecture
- Data Architecture
- Application Architecture
- Technology Architecture
- Design Documents
- Architecture Decision Records (ADRs)
- Technical Specifications
- Business Workflows
- System Workflows
- Integration Workflows

### 🎯 Sprint Management

- Create and manage sprints with goals and timelines
- Drag tasks between backlog and sprints
- Track sprint progress with burndown metrics
- Grid, List, and Timeline views for sprints

### 👥 Team Collaboration

- Organization and team management
- Role-based task assignments
- Member invitations and permissions
- Activity tracking and notifications

## 🚀 Getting Started

### Quick Start

Get up and running in 5 minutes:

```bash
# Clone the repository
git clone https://github.com/tbm26gagankapoor-create/Product-Suite.git
cd Product-Suite

# Install dependencies
npm install
cd backend && npm install && cd ..

# Configure environment (see docs for details)
# Create backend/.env and .env.local

# Start backend
cd backend && npm run dev

# Start frontend (in new terminal)
npm run dev
```

**For detailed setup instructions**, see:
- 📘 [Quick Start Guide](docs/getting-started/quick-start.md) - 5-minute setup
- 📗 [Complete Installation Guide](docs/getting-started/installation.md) - Full setup with troubleshooting
- 📙 [Environment Configuration](docs/getting-started/environment-setup.md) - All environment variables explained

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MongoDB** 7.0+ (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- **npm** 8+ (comes with Node.js)

### Quick Commands

```bash
# Frontend
npm run dev          # Start dev server (port 3000)
npm run build        # Production build

# Backend
cd backend
npm run dev          # Start with tsx watch (port 3001)
npm run db:seed      # Seed database with sample data
```

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS |
| **State Management** | React Context API (5 contexts) |
| **Backend** | Node.js 18+, Express 4, TypeScript |
| **Database** | MongoDB 7.0 with Mongoose 9 |
| **Authentication** | JWT + OAuth 2.0 (Google, Microsoft, GitHub) |
| **AI Integration** | Google Gemini, Anthropic Claude |
| **Email** | Resend |
| **Security** | Helmet, CORS, Rate Limiting |

**For detailed architecture**, see:
- 🏛️ [System Architecture](docs/architecture/system-architecture.md) - Complete architecture overview
- 🗄️ [Database Schema](docs/architecture/database-schema.md) - 27+ models with ERD (coming soon)
- 🔐 [Authentication & Authorization](docs/architecture/authentication-authorization.md) - Security design (coming soon)

### Project Structure

```
infinia-products/
├── components/           # 62 React components
│   ├── ProductGeneratorModal.tsx   # AI Product Wizard (4 steps)
│   ├── KanbanBoard.tsx            # Drag-drop task board
│   ├── SprintsView.tsx            # Sprint management
│   ├── TaskDetailModal.tsx        # Task editing
│   └── ...
├── context/              # React Context providers
│   ├── ProjectDataContext.tsx     # Central data hub
│   ├── ThemeContext.tsx           # Dark/light mode
│   └── ...
├── services/             # Frontend API services
│   ├── projects.service.ts
│   ├── tasks.service.ts
│   └── ...
├── lib/                  # Utilities and clients
│   ├── api.ts            # API client
│   ├── httpClient.ts     # HTTP wrapper
│   └── mappers.ts        # Data transformers
├── types.ts              # TypeScript definitions
└── backend/
    └── src/
        ├── routes/       # 19 API route groups
        ├── services/     # 22 business logic services
        ├── models/       # 27+ Mongoose schemas
        ├── middleware/   # Auth, error handling
        └── config/       # Environment config
```

**See [Code Structure](docs/developer/code-structure.md) for detailed organization** (coming soon)

## 📖 Documentation

**📚 [Complete Documentation Hub](docs/README.md)** - Start here for all documentation

### Documentation Sections

| Section | Description | Status |
|---------|-------------|--------|
| **[Getting Started](docs/getting-started/)** | Quick start, installation, environment setup | ✅ Complete |
| **[Architecture](docs/architecture/)** | System design, database schema, authentication | 🚧 In Progress |
| **[API Reference](docs/api/)** | Complete API documentation (80+ endpoints) | 🚧 In Progress |
| **[User Guides](docs/user-guides/)** | Step-by-step feature guides | 📝 Planned |
| **[Testing](docs/testing/)** | Test strategy, test plans, test cases (200+) | 🚧 In Progress |
| **[Developer Guides](docs/developer/)** | Code structure, development workflows | 📝 Planned |
| **[Deployment](docs/deployment/)** | Production deployment, security checklist | 📝 Planned |

### Quick Links

- 🚀 [Quick Start Guide](docs/getting-started/quick-start.md) - Get running in 5 minutes
- 🏗️ [System Architecture](docs/architecture/system-architecture.md) - Technical overview
- 🔑 [Authentication API](docs/api/authentication.md) - Login, OAuth, JWT
- 🧪 [Test Strategy](docs/testing/test-strategy.md) - Testing approach

### API Statistics

- **80+ API endpoints** across 19 route groups
- **27+ database models** with relationships
- **Multi-tenant architecture** with organization scoping
- **Complete OpenAPI documentation** (coming soon)

### Product Wizard Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCT WIZARD                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Define  │───▶│  Vision  │───▶│   Docs   │───▶│   Plan   │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │               │               │               │         │
│       ▼               ▼               ▼               ▼         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Name    │    │   AI     │    │   12     │    │  Epics   │  │
│  │  Desc    │    │  Vision  │    │  Docs    │    │  Tasks   │  │
│  │  Tags    │    │  Ideas   │    │Generated │    │  Points  │  │
│  │  Team    │    │Suggestions│   │          │    │          │  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│                                                                 │
│  ◀────────────── Backward Navigation ──────────────▶           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

#### ProductGeneratorModal
The core wizard component featuring:
- Multi-step form with animated transitions
- AI-powered content generation
- Document import (PDF/DOCX parsing)
- Real-time progress tracking
- Responsive stepper with backward navigation

#### KanbanBoard
Drag-and-drop task management:
- Customizable columns (To Do, In Progress, Review, Done)
- Task cards with priority, assignee, and points
- Quick actions and inline editing

#### SprintsView
Sprint lifecycle management:
- Grid, List, and Timeline views
- Sprint health indicators
- Progress tracking with burndown metrics

## 🎨 UI/UX Highlights

### Animated Transitions
- Smooth slide animations between wizard steps
- Progress line connecting stepper steps
- Pulse animations on active elements

### Responsive Design
- Desktop: Full stepper with labels
- Mobile: Compact dot indicators
- Adaptive layouts for all screen sizes

### Dark Mode
- Full dark theme support
- Automatic system preference detection
- Consistent styling across components

## 🔧 Configuration

### Environment Variables

The platform requires configuration for both frontend and backend:

**Backend** (`backend/.env`):
```env
# Server
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/infinia_dev

# JWT Authentication
JWT_SECRET=your-secret-key-minimum-32-characters
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
MICROSOFT_CLIENT_ID=your_microsoft_client_id
GITHUB_CLIENT_ID=your_github_client_id

# Email (optional)
RESEND_API_KEY=your_resend_api_key
```

**Frontend** (`.env.local` - optional):
```env
# AI APIs (for AI features)
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_CLAUDE_API_KEY=your_claude_api_key
```

**See [Environment Configuration Guide](docs/getting-started/environment-setup.md) for complete variable reference**

### Database Setup

The platform uses MongoDB with 27+ collections:

```bash
# Seed database with sample data
cd backend
npm run db:seed

# Creates:
# - Sample organizations
# - Test users (admin@example.com / Admin123!)
# - Sample projects with tasks
# - Sprints and teams
```

**See [Database Schema](docs/architecture/database-schema.md) for complete schema documentation** (coming soon)

## 🌿 Branch Strategy

| Branch | Database | Purpose |
|--------|----------|---------|
| `main` | `infinia` | Production-ready code deployed to users |
| `staging` | `infinia_staging` | Pre-production testing and QA environment |
| `dev` | `infinia_dev` | Active development branch |
| `feature/*` | `infinia_dev` | Feature development branches |

### Workflow

1. Create feature branches from `dev`
2. Open PRs to merge into `dev` for integration testing
3. Merge `dev` into `staging` for QA testing
4. After QA approval, merge `staging` into `main` for production release

**Note**: Each branch uses a separate MongoDB database for data isolation. See [Database Setup](docs/deployment/database-setup.md) for configuration (coming soon)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch from `staging` (`git checkout -b feature/amazing-feature staging`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request to `staging`

## 📄 License

This project is proprietary software. All rights reserved.

---

<div align="center">

**Built with ❤️ using React, TypeScript, and AI**

</div>
