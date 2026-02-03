<div align="center">

# Infinia Product Suite

### AI-Powered Product Management Platform

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)

*Transform your product ideas into actionable plans with AI-assisted documentation, task generation, and sprint management.*

[Features](#-features) • [Getting Started](#-getting-started) • [Architecture](#-architecture) • [Documentation](#-documentation)

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

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for backend)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tbm26gagankapoor-create/Product-Suite.git
   cd Product-Suite
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**

   Create a `.env.local` file:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Tailwind CSS |
| **State** | React Context API |
| **Backend** | Supabase (PostgreSQL, Auth, Storage) |
| **AI** | Google Gemini / OpenAI Compatible APIs |
| **Build** | Vite |

### Project Structure

```
├── components/           # React components
│   ├── ProductGeneratorModal.tsx   # AI Product Wizard
│   ├── KanbanBoard.tsx            # Task board
│   ├── SprintsView.tsx            # Sprint management
│   ├── PlanningView.tsx           # Backlog & sprint planning
│   └── ...
├── context/              # React Context providers
│   ├── ProjectDataContext.tsx     # Global state
│   └── ...
├── services/             # API service layer
│   ├── projects.service.ts
│   ├── tasks.service.ts
│   └── ...
├── lib/                  # Utilities and clients
│   ├── api.ts                     # Supabase API client
│   ├── ai.ts                      # AI client wrapper
│   └── supabase.ts
├── types/                # TypeScript definitions
├── hooks/                # Custom React hooks
└── migrations/           # Database migrations
```

## 📖 Documentation

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

### AI Provider

The platform supports multiple AI providers. Configure in `lib/ai.ts`:

```typescript
// Default: SAIF API (OpenAI compatible)
const AI_BASE_URL = 'https://model.iamsaif.ai/v1';
const AI_MODEL = 'openai/gpt-oss-120b';
```

### Database Schema

Run migrations in Supabase SQL editor:
```bash
# See migrations/001_organization_structure.sql
```

## 🌿 Branch Strategy

| Branch | Purpose |
|--------|---------|
| `live` | Production-ready code deployed to users |
| `staging` | Pre-production testing and QA environment |
| `feature/*` | Feature development branches |

### Workflow

1. Create feature branches from `staging`
2. Open PRs to merge into `staging` for testing
3. After QA approval, merge `staging` into `live` for production release

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
