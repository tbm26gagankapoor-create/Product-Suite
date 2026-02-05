# Quick Start Guide

Get Infinia Products running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- MongoDB running (local or Atlas)
- Git installed

## Quick Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd infinia-products

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Configure Environment

**Backend** - Create `backend/.env`:
```bash
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/infinia_dev
JWT_SECRET=your-secret-key-minimum-32-characters-required-for-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

**Frontend** - Create `.env.local` (optional for AI features):
```bash
VITE_GEMINI_API_KEY=your_gemini_key
VITE_CLAUDE_API_KEY=your_claude_key
```

### 3. Start Development Servers

**Terminal 1** - Start backend:
```bash
cd backend
npm run dev
```

Backend runs on `http://localhost:3001`

**Terminal 2** - Start frontend:
```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

### 4. Access the Application

1. Open browser to [http://localhost:3000](http://localhost:3000)
2. Click **Register** to create your first account
3. Complete the onboarding wizard to create your organization
4. You're ready to start!

## First Steps

### Create Your First Project

1. **Navigate to Dashboard** - You'll see the bento grid layout
2. **Click "Create Product"** or use the AI Product Wizard
3. **Fill in project details**:
   - Product name
   - Description
   - Team members
   - Start date
4. **Complete the wizard** - AI generates PRD, epics, and tasks

### Create Your First Task

1. **Click on your project** in the sidebar
2. **Go to "Boards" tab** to see the Kanban view
3. **Click the "+" button** in any column
4. **Fill in task details**:
   - Title
   - Type (Feature, Bug, Story, Task, Epic)
   - Priority (Low, Medium, High, Critical)
   - Assignee
5. **Click "Create"** - Task appears in the column

### Plan Your First Sprint

1. **Go to "Sprints" tab**
2. **Click "Create Sprint"**
3. **Set sprint details**:
   - Sprint name (e.g., "Sprint 1")
   - Goal (optional)
   - Start and end dates
4. **Drag tasks** from backlog into sprint
5. **Click "Start Sprint"** to activate

## Common First-Time Setup

### Set Up Team Members

1. Go to **Settings** (click profile picture → Settings)
2. Navigate to **Members** tab
3. Click **Invite Member**
4. Enter email and select role (Admin, Member, or Viewer)
5. Member receives invitation email

### Connect GitHub (Optional)

1. Open a project
2. Go to **Settings** → **Integrations**
3. Click **Connect GitHub**
4. Authorize GitHub access
5. Select repository and branch for PRD sync

### Configure Notifications

1. Go to **Settings** → **Notifications**
2. Set email preferences:
   - Email digest frequency (Instant, Daily, Weekly, None)
   - Toggle specific notification types
3. Set in-app notification preferences
4. Configure quiet hours (optional)

## Verification

### Check Backend is Running

```bash
# Health check
curl http://localhost:3001/api/v1/health

# Expected response:
# {"success": true, "message": "Server is running"}
```

### Check Database Connection

```bash
# In backend directory
npm run db:seed
```

This seeds the database with sample data (optional).

## Quick Troubleshooting

### Port Already in Use

**Frontend (3000)**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm run dev
```

**Backend (3001)**:
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
npm run dev
```

### MongoDB Connection Error

**Using local MongoDB:**
```bash
# Start MongoDB
brew services start mongodb-community
# Or
mongod --config /usr/local/etc/mongod.conf
```

**Using MongoDB Atlas:**
- Verify connection string in `backend/.env`
- Ensure IP whitelist includes your IP
- Check username/password are correct

### Module Not Found Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# For backend
cd backend
rm -rf node_modules package-lock.json
npm install
```

### JWT Secret Error

Ensure your `JWT_SECRET` in `backend/.env` is at least 32 characters:
```bash
JWT_SECRET=this-is-a-long-secret-key-with-at-least-32-characters
```

## Next Steps

- **Complete Setup**: See [Installation Guide](installation.md) for detailed setup
- **Environment Config**: Check [Environment Setup](environment-setup.md) for all variables
- **First Project Tutorial**: Follow [Your First Project](first-project.md) for guided walkthrough
- **Architecture**: Understand the system in [System Architecture](../architecture/system-architecture.md)
- **API Docs**: Explore endpoints in [API Reference](../api/README.md)

## Quick Reference

### Default Accounts After Seeding
```
Admin: admin@example.com / Admin123!
User: user@example.com / User123!
```

### API Base URL
```
Development: http://localhost:3001/api/v1
```

### Default Database Names
```
Development: infinia_dev
Staging: infinia_staging
Production: infinia
```

### Useful Commands
```bash
# Frontend
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build

# Backend
npm run dev          # Start with tsx watch
npm start            # Run compiled code
npm run build        # Compile TypeScript
npm run db:seed      # Seed database
```

## Getting Help

- **Installation Issues?** See [Troubleshooting Guide](../developer/troubleshooting.md)
- **API Questions?** Check [API Documentation](../api/README.md)
- **Feature Questions?** See [User Guides](../user-guides/)

---

**Estimated Setup Time**: 5-10 minutes

Ready to dive deeper? Continue to the [complete installation guide](installation.md).
