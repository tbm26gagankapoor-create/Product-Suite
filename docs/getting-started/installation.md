# Installation Guide

Complete setup instructions for Infinia Products development environment.

## System Requirements

### Required Software
- **Node.js**: 18.0.0 or higher ([Download](https://nodejs.org/))
- **npm**: 8.0.0 or higher (comes with Node.js)
- **MongoDB**: 5.0 or higher (local or Atlas)
- **Git**: 2.0 or higher

### Recommended Tools
- **VS Code** or your preferred IDE
- **Postman** or **Insomnia** for API testing
- **MongoDB Compass** for database management
- **Docker** (optional) for containerized deployment

### Hardware Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **Disk Space**: 2GB for dependencies and build artifacts
- **CPU**: Modern multi-core processor

## Installation Steps

### 1. Install Node.js and npm

**macOS** (using Homebrew):
```bash
brew install node@18
node --version  # Should show v18.x.x or higher
npm --version   # Should show 8.x.x or higher
```

**Windows**:
1. Download installer from [nodejs.org](https://nodejs.org/)
2. Run installer and follow prompts
3. Verify installation:
```bash
node --version
npm --version
```

**Linux** (Ubuntu/Debian):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

### 2. Install MongoDB

#### Option A: Local MongoDB Installation

**macOS**:
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community@7.0

# Start MongoDB
brew services start mongodb-community@7.0

# Verify installation
mongosh --version
```

**Windows**:
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run installer and follow setup wizard
3. Start MongoDB service from Services panel

**Linux** (Ubuntu):
```bash
# Import MongoDB GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Option B: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create free account
3. Create new cluster (M0 Free Tier available)
4. Click **Connect** → **Connect your application**
5. Copy connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/`)
6. Add your IP address to whitelist
7. Create database user with read/write permissions

### 3. Clone Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/infinia-products.git
cd infinia-products

# Checkout development branch
git checkout dev
```

### 4. Install Frontend Dependencies

```bash
# From project root
npm install

# This installs:
# - React 19
# - Vite 6
# - TypeScript
# - Lucide React (icons)
# - All other frontend dependencies
```

**Expected Output**:
```
added 483 packages in 45s
```

### 5. Install Backend Dependencies

```bash
cd backend
npm install

# This installs:
# - Express 4
# - Mongoose 9
# - JWT authentication
# - OAuth libraries
# - Email services
# - All other backend dependencies
```

**Expected Output**:
```
added 267 packages in 32s
```

### 6. Configure Environment Variables

#### Backend Configuration

Create `backend/.env` file:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/infinia_dev
# For Atlas: mongodb+srv://username:password@cluster.mongodb.net/infinia_dev?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-key-minimum-32-characters-required-for-production-environment
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Infinia Products

# OAuth - Microsoft
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
MICROSOFT_TENANT_ID=common
MICROSOFT_REDIRECT_URI=http://localhost:3001/api/v1/auth/microsoft/callback

# OAuth - Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/v1/auth/google/callback

# OAuth - GitHub (for PRD sync)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3001/api/v1/auth/github/callback
GITHUB_ENCRYPTION_KEY=your-32-character-encryption-key-here
```

**Required Variables** (minimum to run):
- `MONGODB_URI`
- `JWT_SECRET` (must be 32+ characters)
- `CORS_ORIGIN`

**Optional Variables**:
- Email service (RESEND_*)
- OAuth providers (MICROSOFT_*, GOOGLE_*, GITHUB_*)

#### Frontend Configuration

Create `.env.local` file in project root (optional):

```bash
# AI API Keys (optional - for AI features)
VITE_GEMINI_API_KEY=your_google_gemini_api_key
VITE_CLAUDE_API_KEY=your_anthropic_claude_api_key

# Backend API URL (default is correct for local dev)
VITE_API_URL=http://localhost:3001/api/v1
```

**Note**: Frontend env vars must start with `VITE_` prefix.

### 7. Initialize Database

#### Option 1: Start Fresh (Empty Database)

```bash
cd backend
npm run dev
```

Database collections will be created automatically on first API call.

#### Option 2: Seed with Sample Data

```bash
cd backend
npm run db:seed
```

This creates:
- Sample organizations
- Sample users (admin@example.com, user@example.com)
- Sample projects with tasks
- Sample sprints and teams

**Seeded Users**:
```
Admin User:
Email: admin@example.com
Password: Admin123!

Regular User:
Email: user@example.com
Password: User123!
```

### 8. Verify Installation

#### Start Backend Server

```bash
cd backend
npm run dev
```

**Expected Output**:
```
Server running on port 3001
MongoDB connected: localhost:27017/infinia_dev
```

**Test Health Endpoint**:
```bash
curl http://localhost:3001/api/v1/health
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-02-05T12:00:00.000Z"
}
```

#### Start Frontend Server

Open new terminal:

```bash
npm run dev
```

**Expected Output**:
```
VITE v6.0.0  ready in 1234 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

#### Access Application

1. Open browser to [http://localhost:3000](http://localhost:3000)
2. You should see the login/registration page
3. If you seeded data, login with:
   - Email: `admin@example.com`
   - Password: `Admin123!`

## Environment-Specific Setup

### Development Environment

```bash
# Backend .env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/infinia_dev
```

### Staging Environment

```bash
# Backend .env
NODE_ENV=staging
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/infinia_staging?retryWrites=true&w=majority
```

### Production Environment

```bash
# Backend .env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/infinia?retryWrites=true&w=majority
JWT_SECRET=<strong-random-secret-64-characters-minimum>
CORS_ORIGIN=https://yourdomain.com
```

**Production Checklist**:
- ✅ Use strong JWT_SECRET (64+ characters, random)
- ✅ Set specific CORS_ORIGIN (not *)
- ✅ Use MongoDB Atlas with IP whitelist
- ✅ Enable SSL/TLS for MongoDB
- ✅ Use environment variable management (e.g., AWS Secrets Manager)
- ✅ Remove hardcoded secrets from code
- ✅ Enable rate limiting
- ✅ Set up monitoring and logging

## Docker Installation (Optional)

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Docker Compose File** (`backend/docker-compose.yml`):
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: infinia_dev

  backend:
    build: .
    ports:
      - "3001:3001"
    depends_on:
      - mongodb
    environment:
      MONGODB_URI: mongodb://mongodb:27017/infinia_dev
    volumes:
      - .:/app
      - /app/node_modules

volumes:
  mongodb_data:
```

## IDE Setup

### VS Code Recommended Extensions

Create `.vscode/extensions.json`:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "mongodb.mongodb-vscode",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

### VS Code Settings

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## Troubleshooting

### MongoDB Connection Issues

**Error**: `MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017`

**Solution**:
```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Linux
```

### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::3001`

**Solution**:
```bash
# Find and kill process
lsof -ti:3001 | xargs kill -9

# Or use different port in .env
PORT=3002
```

### Module Not Found

**Error**: `Cannot find module 'express'`

**Solution**:
```bash
# Delete and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### JWT Secret Length Error

**Error**: `JWT_SECRET must be at least 32 characters long`

**Solution**:
```bash
# Generate secure secret (macOS/Linux)
openssl rand -base64 32

# Update .env with generated secret
JWT_SECRET=<generated-secret>
```

### TypeScript Compilation Errors

**Solution**:
```bash
cd backend
npm run build  # This will show detailed errors
```

Fix TypeScript errors in the indicated files.

## Next Steps

- **Environment Setup**: See [Environment Setup Guide](environment-setup.md) for detailed variable explanations
- **First Project**: Follow [Your First Project](first-project.md) tutorial
- **Architecture**: Learn about [System Architecture](../architecture/system-architecture.md)
- **Development**: Read [Backend Development](../developer/backend-development.md) and [Frontend Development](../developer/frontend-development.md)

## Getting Help

- **Installation Issues**: Check [Troubleshooting Guide](../developer/troubleshooting.md)
- **MongoDB Issues**: See [MongoDB Docs](https://docs.mongodb.com/)
- **Node.js Issues**: Check [Node.js Docs](https://nodejs.org/docs/)

---

**Installation Time**: 15-30 minutes (including downloads)

Your development environment is now ready!
