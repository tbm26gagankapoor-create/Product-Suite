# Infinia Products - Deployment Guide

**Version**: 1.0
**Last Updated**: 2026-02-12
**Deployment Methods**: Docker, Docker Compose, Cloud Platforms

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker Compose)](#quick-start-docker-compose)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Running Migrations](#running-migrations)
6. [Deployment Options](#deployment-options)
7. [Production Deployment](#production-deployment)
8. [Monitoring & Health Checks](#monitoring--health-checks)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required

- **Docker** 20.10+ and **Docker Compose** 2.0+
- **MongoDB Atlas Account** (free tier available)
- **Domain name** (for production)
- **SSL Certificate** (for production)

### Recommended

- **Node.js** 18+ (for local development)
- **PostgreSQL client** (for database management)
- **Git** (for version control)

---

## Quick Start (Docker Compose)

### 1. Clone & Setup

```bash
# Clone the repository
git clone https://github.com/your-org/infinia-products.git
cd infinia-products

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment

Edit `.env` file with your values:

```bash
# Required: MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://your_user:your_password@cluster.mongodb.net/infinia_dev

# Required: PostgreSQL password
POSTGRES_PASSWORD=your_secure_password_123

# Required: JWT Secret (generate with: openssl rand -base64 64)
JWT_SECRET=your_generated_jwt_secret_here

# Required: Encryption key (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your_generated_encryption_key_here

# Production: Update CORS origin
CORS_ORIGIN=https://your-domain.com
```

### 3. Start All Services

```bash
# Build and start all containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**Services Started**:
- `postgres` - PostgreSQL database (port 5432)
- `backend` - Express API (port 3001)
- `frontend` - React app (port 3000)

### 4. Run Database Migrations

```bash
# Run PostgreSQL migrations
docker-compose exec backend npx node-pg-migrate up

# Seed initial data (admin user, AI providers)
docker-compose exec backend npx tsx src/scripts/seed-postgres.ts
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/v1
- **Health Check**: http://localhost:3001/api/v1/health
- **Admin Portal**: http://localhost:3000/admin

**Default Admin Credentials**:
- Email: `admin@infinia.app`
- Password: Check your seed script or set via environment variable

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/infinia_dev` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `secure_password_123` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Generate with `openssl rand -base64 64` |
| `ENCRYPTION_KEY` | API key encryption key (64 hex chars) | Generate with `openssl rand -hex 32` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |
| `RESEND_API_KEY` | Email service API key | None |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | None |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | None |
| `MICROSOFT_CLIENT_ID` | Microsoft OAuth client ID | None |
| `MICROSOFT_CLIENT_SECRET` | Microsoft OAuth secret | None |

### Generating Secrets

```bash
# JWT Secret (64 characters base64)
openssl rand -base64 64

# Encryption Key (64 hex characters)
openssl rand -hex 32

# PostgreSQL Password (32 characters alphanumeric)
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
```

---

## Database Setup

### MongoDB Atlas Setup

1. **Create Account**:
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for free tier

2. **Create Cluster**:
   - Click "Build a Cluster"
   - Select Free Tier (M0)
   - Choose region closest to your users

3. **Create Database User**:
   - Database Access → Add New Database User
   - Username: `infinia_user`
   - Password: Generate strong password
   - Role: `readWriteAnyDatabase`

4. **Whitelist IP**:
   - Network Access → Add IP Address
   - For development: `0.0.0.0/0` (allow all)
   - For production: Add specific IPs

5. **Get Connection String**:
   - Clusters → Connect → Connect your application
   - Copy connection string
   - Replace `<password>` with your database password
   - Add database name: `/infinia_dev` or `/infinia_prod`

**Example Connection String**:
```
mongodb+srv://infinia_user:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/infinia_dev?retryWrites=true&w=majority
```

### PostgreSQL Setup

PostgreSQL is included in Docker Compose. No external setup needed.

**To access PostgreSQL**:
```bash
# Connect to PostgreSQL container
docker-compose exec postgres psql -U infinia -d infinia_system

# List tables
\dt

# Exit
\q
```

---

## Running Migrations

### PostgreSQL Migrations

```bash
# Run all pending migrations
docker-compose exec backend npx node-pg-migrate up

# Rollback last migration
docker-compose exec backend npx node-pg-migrate down

# Create new migration
docker-compose exec backend npx node-pg-migrate create migration-name
```

**Migration Files**: `backend/migrations/*.js`

### Seed Data

```bash
# Seed PostgreSQL (admin users, AI providers, etc.)
docker-compose exec backend npx tsx src/scripts/seed-postgres.ts

# Seed MongoDB (sample projects, tasks - for development only)
docker-compose exec backend npx tsx src/scripts/seed-db.ts
```

---

## Deployment Options

### Option 1: Docker Compose (Recommended for Self-Hosting)

**Pros**:
- Complete control
- All services in one place
- Easy to manage
- Cost-effective

**Cons**:
- Requires server management
- Need to handle scaling manually

**Best For**: Self-hosted deployments, small to medium teams

See [Quick Start](#quick-start-docker-compose) above.

### Option 2: Cloud Platforms (Easiest)

#### Railway (Recommended)

1. **Connect Repository**:
   - Go to https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

2. **Add Services**:
   - Backend: Automatically detected (Dockerfile)
   - Frontend: Add new service, select Dockerfile.frontend
   - PostgreSQL: Add database from marketplace

3. **Configure Environment Variables**:
   - Copy from `.env.example`
   - Add MongoDB Atlas connection string
   - Railway auto-generates DATABASE_URL

4. **Deploy**:
   - Railway auto-deploys on push to main branch
   - Get public URLs for frontend and backend

**Cost**: ~$5/month for starter plan

#### Render

1. **Create Web Services**:
   - Backend: New Web Service → Docker → Select backend/Dockerfile
   - Frontend: New Static Site → Build Command: `npm run build`

2. **Add PostgreSQL**:
   - New PostgreSQL → Copy connection string

3. **Environment Variables**:
   - Add all required variables
   - Use internal DATABASE_URL from Render

**Cost**: Free tier available, paid plans from $7/month

#### Vercel (Frontend Only)

For frontend-only deployment (backend deployed elsewhere):

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables
vercel env add VITE_API_URL production
```

---

## Production Deployment

### 1. Pre-Deployment Checklist

- [ ] **Environment Variables**:
  - [ ] Strong JWT secret generated
  - [ ] Encryption key generated
  - [ ] PostgreSQL password set
  - [ ] MongoDB Atlas configured
  - [ ] CORS_ORIGIN set to production domain

- [ ] **Database**:
  - [ ] MongoDB Atlas production cluster created
  - [ ] PostgreSQL backups configured
  - [ ] Migrations run successfully

- [ ] **Security**:
  - [ ] SSL/TLS certificate obtained
  - [ ] Firewall rules configured
  - [ ] Secrets stored securely (not in code)
  - [ ] npm audit vulnerabilities fixed

- [ ] **Domain & DNS**:
  - [ ] Domain registered
  - [ ] DNS records configured
  - [ ] SSL certificate installed

### 2. Docker Compose Production Setup

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      - POSTGRES_USER=infinia
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=infinia_system
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - infinia-network
    # Don't expose port externally in production

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    environment:
      - NODE_ENV=production
      - PORT=3001
      - MONGODB_URI=${MONGODB_URI}
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - CORS_ORIGIN=${CORS_ORIGIN}
    depends_on:
      - postgres
    networks:
      - infinia-network
    # Use reverse proxy (nginx/caddy) for SSL termination

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    restart: always
    depends_on:
      - backend
    networks:
      - infinia-network
    # Use reverse proxy for SSL termination

  # Nginx reverse proxy (SSL termination)
  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-prod.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - infinia-network

networks:
  infinia-network:
    driver: bridge

volumes:
  postgres-data:
```

**Deploy**:
```bash
# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx node-pg-migrate up

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. SSL Configuration (Nginx)

Create `nginx-prod.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }

    upstream frontend {
        server frontend:80;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # API proxy
        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

### 4. Obtain SSL Certificate

**Using Let's Encrypt (Free)**:

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Certificates saved to:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# Copy to project
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/

# Set up auto-renewal
sudo certbot renew --dry-run
```

---

## Monitoring & Health Checks

### Health Endpoints

```bash
# Backend health
curl http://localhost:3001/api/v1/health

# Response:
{
  "status": "healthy",
  "timestamp": "2026-02-12T10:30:00Z",
  "uptime": 86400,
  "version": "1.0.0"
}

# Detailed health (includes database status)
curl http://localhost:3001/api/v1/health/detailed

# Frontend health
curl http://localhost:3000/health
```

### Docker Health Checks

```bash
# Check container health
docker-compose ps

# Expected output:
# infinia-backend    healthy
# infinia-frontend   healthy
# infinia-postgres   healthy
```

### Monitoring Tools (Recommended)

**Application Monitoring**:
- **New Relic** - Full APM
- **DataDog** - Infrastructure + app monitoring
- **Sentry** - Error tracking

**Uptime Monitoring**:
- **UptimeRobot** - Free tier available
- **Pingdom** - Comprehensive monitoring
- **StatusCake** - Free uptime checks

**Logs**:
```bash
# View all logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# View last 100 lines
docker-compose logs --tail=100 backend
```

---

## Troubleshooting

### Issue: Backend Can't Connect to MongoDB

**Symptoms**: "MongoNetworkError" in logs

**Solutions**:
1. Check MongoDB Atlas IP whitelist includes your server IP
2. Verify connection string is correct
3. Test connection:
   ```bash
   docker-compose exec backend node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('OK')).catch(console.error)"
   ```

### Issue: Backend Can't Connect to PostgreSQL

**Symptoms**: "ECONNREFUSED" errors

**Solutions**:
1. Check PostgreSQL container is running: `docker-compose ps postgres`
2. Verify DATABASE_URL is correct
3. Check PostgreSQL logs: `docker-compose logs postgres`

### Issue: Frontend Can't Reach Backend

**Symptoms**: API calls failing with CORS errors

**Solutions**:
1. Check CORS_ORIGIN matches frontend URL
2. Verify backend is running: `curl http://localhost:3001/api/v1/health`
3. Check nginx configuration (if using reverse proxy)

### Issue: Migrations Won't Run

**Symptoms**: "Migration failed" errors

**Solutions**:
1. Check PostgreSQL connection
2. Verify migrations table exists:
   ```bash
   docker-compose exec postgres psql -U infinia -d infinia_system -c "\dt"
   ```
3. Run migrations manually:
   ```bash
   docker-compose exec backend npx node-pg-migrate up
   ```

### Issue: Out of Memory

**Symptoms**: Container crashes, "JavaScript heap out of memory"

**Solutions**:
1. Increase Docker memory limit (Docker Desktop → Settings → Resources)
2. Add Node memory flag:
   ```yaml
   # docker-compose.yml
   backend:
     environment:
       - NODE_OPTIONS=--max-old-space-size=2048
   ```

---

## Backup & Recovery

### Database Backups

**MongoDB Atlas** (automatic):
- Backups included in free tier
- Restore via Atlas UI

**PostgreSQL**:
```bash
# Backup
docker-compose exec postgres pg_dump -U infinia infinia_system > backup_$(date +%Y%m%d).sql

# Restore
docker-compose exec -T postgres psql -U infinia -d infinia_system < backup_20260212.sql
```

### Automated Backups (Cron)

```bash
# Add to crontab (daily at 2 AM)
0 2 * * * cd /path/to/infinia-products && docker-compose exec postgres pg_dump -U infinia infinia_system > /backups/postgres_$(date +\%Y\%m\%d).sql
```

---

## Updating the Application

```bash
# Pull latest code
git pull origin main

# Rebuild containers
docker-compose build

# Stop old containers
docker-compose down

# Start new containers
docker-compose up -d

# Run new migrations
docker-compose exec backend npx node-pg-migrate up

# Check status
docker-compose ps
docker-compose logs -f
```

---

## Support

- **Documentation**: See [Admin Guide](ADMIN-GUIDE.md), [User Guide](USER-GUIDE.md)
- **Issues**: https://github.com/your-org/infinia-products/issues
- **Email**: support@infinia.app

---

**Document Version**: 1.0
**Last Updated**: 2026-02-12
**Next Review**: 2026-03-12
