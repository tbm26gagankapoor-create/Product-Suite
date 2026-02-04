# Infinia Products

A product management dashboard with React frontend and Node.js/Express backend.

## Important Guidelines

- **Do not modify UI/styling** unless explicitly requested. The design system is intentional - avoid "improving" colors, spacing, layouts, or component styles without being asked.
- **No neon or cyberpunk colors.** Stick to the muted, professional palette defined below. Avoid bright/saturated neons like `#00ff00`, `#ff00ff`, `#00ffff`, or overly vibrant gradients.
- Focus on functionality and bug fixes over visual changes.

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  React Frontend │─────▶│  Express API    │─────▶│    MongoDB      │
│  (Vite + TS)    │      │  (Node.js)      │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                │
                         OAuth Providers
                    (Google, Microsoft, GitHub)
```

## Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS (CDN)
- **Icons**: Lucide React
- **State**: React Context (ThemeContext)
- **AI Integration**: Anthropic Claude API, Google Gemini API

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 4
- **Database**: MongoDB with Mongoose 9
- **Auth**: JWT (jsonwebtoken), OAuth 2.0 (Google, Microsoft)
- **Validation**: Zod
- **Email**: Resend, Nodemailer
- **Security**: Helmet, CORS, Rate Limiting

## Project Structure

```
infinia-products/
├── components/           # React UI components
│   ├── Sidebar.tsx       # Navigation sidebar
│   ├── Header.tsx        # Tab navigation
│   ├── KanbanBoard.tsx   # Drag-drop kanban
│   ├── ListView.tsx      # Table view
│   ├── TimelineView.tsx  # Gantt view
│   └── ...
├── context/              # React context providers
│   └── ThemeContext.tsx
├── services/             # Frontend API services
├── src/lib/              # Frontend utilities
├── types.ts              # Frontend TypeScript types
├── constants.ts          # Mock data and constants
├── App.tsx               # Main app with routing
├── index.tsx             # React entry point
├── vite.config.ts        # Vite configuration
│
└── backend/
    ├── src/
    │   ├── index.ts          # Express server entry
    │   ├── config/           # Environment config
    │   ├── lib/              # MongoDB client setup
    │   ├── middleware/       # Auth, error handling
    │   ├── models/index.ts   # Mongoose schemas (all models)
    │   ├── routes/           # API route handlers
    │   ├── services/         # Business logic
    │   ├── scripts/          # DB seed/migrate scripts
    │   └── utils/            # Error classes
    ├── Dockerfile
    └── docker-compose.yml
```

## Development Commands

### Frontend
```bash
npm install        # Install dependencies
npm run dev        # Start dev server (port 3000)
npm run build      # Production build
npm run preview    # Preview production build
```

### Backend
```bash
cd backend
npm install              # Install dependencies
npm run dev              # Start with tsx watch
npm run build            # Compile TypeScript
npm start                # Run compiled code
npm run db:seed          # Seed database
npm run db:migrate       # Run migrations
```


## Environment Variables

### Frontend (.env.local)
```
GEMINI_API_KEY=your_key
CLAUDE_API_KEY=your_key
```

### Backend (.env)
```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/infinia
JWT_SECRET=your_secret_min_32_chars
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
RESEND_API_KEY=your_key
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret
MICROSOFT_CLIENT_ID=your_id
MICROSOFT_CLIENT_SECRET=your_secret
```

## Database Environments

Different environments use different MongoDB databases on the same cluster, mapped to git branches:

| Branch | Database Name | Environment | Usage |
|--------|---------------|-------------|-------|
| `dev` | `infinia_dev` | Development | Local development and feature testing |
| `staging` | `infinia_staging` | Staging | Pre-production testing and QA |
| `main` | `infinia` | Production | Live production deployment |

**Important:** When switching branches, update the `MONGODB_URI` in `backend/.env` to match:
```bash
# dev branch
MONGODB_URI=mongodb+srv://...@cluster0.zxio7yo.mongodb.net/infinia_dev?retryWrites=true&w=majority

# staging branch
MONGODB_URI=mongodb+srv://...@cluster0.zxio7yo.mongodb.net/infinia_staging?retryWrites=true&w=majority

# main branch (production)
MONGODB_URI=mongodb+srv://...@cluster0.zxio7yo.mongodb.net/infinia?retryWrites=true&w=majority
```

Projects are scoped to organizations. Each project must have an `organization_id` to be visible to users in that organization.

## API Routes

Base URL: `/api/v1`

| Resource | Endpoints |
|----------|-----------|
| Auth | `/auth/register`, `/auth/login`, `/auth/me` |
| OAuth | `/oauth/google`, `/oauth/microsoft`, `/oauth/callback` |
| Users | `/users`, `/users/:id` |
| Organizations | `/organizations`, `/organizations/:id/members` |
| Projects | `/projects`, `/projects/:id` |
| Tasks | `/tasks`, `/tasks/:id`, `/tasks/:id/comments` |
| Sprints | `/sprints`, `/sprints/:id` |
| Teams | `/teams`, `/teams/:id/members` |
| Tags | `/tags` |
| Columns | `/columns` |

## Data Models

### Core Entities
- **User**: Auth, profile, organization membership
- **Organization**: Multi-tenant workspaces with domain-based join
- **Project**: Products with lifecycle tracking, PRD, vision
- **Task**: Issues with kanban workflow, dependencies, points
- **Sprint**: Time-boxed iterations per project
- **Team**: Cross-project member groups

### Key Relationships
- Users belong to Organizations (many-to-many via OrganizationMember)
- Projects belong to Organizations
- Tasks belong to Projects and optionally Sprints
- Tasks can have parent Epics (parent_epic_id)
- Tasks can block/be blocked by other tasks

## Code Conventions

### TypeScript
- Interfaces for all data shapes (types.ts, models/index.ts)
- Strict typing with union types for enums (`TaskType`, `Priority`)
- Use `camelCase` in frontend, `snake_case` in backend DB fields

### React
- Functional components with hooks
- Context for global state (theme)
- Props interfaces above components
- Tailwind utility classes for styling

### Backend
- Route → Service → Model pattern
- Async/await with express-async-errors
- Zod for request validation
- Custom error classes in utils/errors.ts
- JWT middleware for protected routes

### Styling
- Tailwind CSS with `dark:` prefix for dark mode
- Color palette: Indigo/purple primary
- Border color: `dark:border-[#1F2128]`
- Background: `dark:bg-[#0B0C0E]`, `dark:bg-[#15171E]`

## Key Features

1. **Kanban Board** - Drag-drop task management with 5 columns
2. **Sprint Planning** - Time-boxed iterations with goals
3. **Product Discovery** - Impact scoring, product themes
4. **Multi-Organization** - Domain-based auto-join, role-based access
5. **OAuth Login** - Google, Microsoft authentication
6. **Dark Mode** - System-wide theme toggle

## Design Guidelines

### Typography
- **Font**: Inter (Google Fonts)
- **Weights**: 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)
- **Sizes**: `text-[10px]` labels, `text-xs` small, `text-sm` body, `text-[13px]` cards, `text-[15px]` headings

### Color Palette

#### Backgrounds
| Context | Light Mode | Dark Mode |
|---------|------------|-----------|
| Page | `bg-[#F8F9FC]` | `bg-[#050505]` |
| Sidebar | `bg-[#FAFAFA]` | `bg-[#15171E]` |
| Cards | `bg-white` | `bg-[#15171E]` |
| Inputs | `bg-white` | `bg-[#0B0C0E]` |
| Hover/Muted | `bg-gray-50`, `bg-gray-100` | `bg-[#1F2128]`, `bg-[#2D2F36]` |

#### Borders
| Context | Light Mode | Dark Mode |
|---------|------------|-----------|
| Default | `border-gray-200` | `border-[#1F2128]` |
| Subtle | `border-gray-100` | `border-white/5` |
| Divider | `border-gray-200` | `border-[#2D2F36]` |

#### Text
| Context | Light Mode | Dark Mode |
|---------|------------|-----------|
| Primary | `text-[#172B4D]` | `text-gray-100` |
| Secondary | `text-gray-600` | `text-gray-400` |
| Muted | `text-gray-400` | `text-gray-500` |
| Brand | `text-gray-900` | `text-white` |

#### Accent Colors
- **Primary**: Blue (`text-blue-500`, `bg-blue-500/10`, `border-blue-500`)
- **Success**: Green/Emerald (`text-green-500`, `text-emerald-500`)
- **Warning**: Amber/Yellow (`text-amber-500`, `text-yellow-500`)
- **Danger**: Red (`text-red-500`, `bg-red-500/10`)
- **Info**: Purple (`text-purple-500`, `bg-purple-500/10`)

### Spacing & Layout
- **Border Radius**: `rounded-md` (small), `rounded-lg` (medium), `rounded-xl` (large/cards)
- **Padding**: `p-1.5` (tight), `p-2` (small), `p-3` (medium), `p-4` (standard)
- **Gaps**: `gap-1.5` (tight), `gap-2` (small), `gap-3` (medium), `gap-4` (standard)

### Component Patterns

#### Cards
```jsx
<div className="bg-white dark:bg-[#15171E] rounded-xl border border-gray-100 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-500/50 hover:shadow-lg transition-all">
```

#### Buttons (Primary)
```jsx
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
```

#### Buttons (Ghost)
```jsx
<button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#1F2128] transition-colors">
```

#### Input Fields
```jsx
<input className="bg-white dark:bg-[#0B0C0E] border border-gray-200 dark:border-[#2D2F36] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500/50" />
```

#### Badges/Tags
```jsx
<span className="px-2 py-1 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-[#1F2128] text-gray-600 dark:text-gray-400">
```

#### Status Indicators
```jsx
// Online dot
<div className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-[#15171E]" />

// Active indicator
<div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
```

### Icons
- **Library**: Lucide React
- **Sizes**: `size={12}` tiny, `size={14}` small, `size={16}` default, `size={18}` medium, `size={20}` large
- **Stroke**: `strokeWidth={2}` default, `strokeWidth={3}` bold (logo)

#### Icon Color Conventions
| Type | Color Class |
|------|-------------|
| Epic | `text-purple-500` |
| Feature | `text-pink-500` |
| Bug | `text-red-500` |
| Story | `text-emerald-500` |
| Task | `text-blue-500` |
| User | `text-orange-500` |
| Sprint | `text-purple-500` |
| Project | `text-blue-500` |

### Shadows
- **Cards**: `shadow-sm` default, `hover:shadow-lg` on hover
- **Modals**: `shadow-2xl`
- **Elevated**: `shadow-xl`

### Animations
- **Transitions**: `transition-all duration-200`, `transition-colors`
- **Hover Scale**: `hover:scale-105`, `group-hover:scale-110`
- **Custom Keyframes** (defined in index.html):
  - `animate-fadeIn` - fade in effect
  - `animate-slideInFromRight` / `animate-slideInFromLeft` - wizard steps
  - `animate-shimmer` - loading skeleton
  - `animate-todayPulse` - timeline today indicator

### Scrollbar
Custom ultra-slim scrollbar (6px):
- Light: `rgba(156, 163, 175, 0.3)` track
- Dark: `rgba(255, 255, 255, 0.1)` track

### Dark Mode
- Toggle via `ThemeContext` using class strategy (`html.dark`)
- Always provide both variants: `bg-white dark:bg-[#15171E]`
- Use `/10`, `/20` opacity modifiers for tinted backgrounds

## Testing

No test infrastructure currently configured. Consider adding:
- Vitest for unit tests
- React Testing Library for components
- Supertest for API integration tests

