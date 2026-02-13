# 🚀 Deploy Infinia Products - Quick Start

**Time to Deploy**: 10-15 minutes
**Prerequisites**: Docker Desktop, MongoDB Atlas account (free)

---

## Quick Deploy (3 Steps)

### Step 1: Get MongoDB Atlas Connection String

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up for free tier (if you don't have an account)
3. Create a cluster (M0 Free tier)
4. Create database user (Database Access → Add New User)
5. Whitelist IP: `0.0.0.0/0` (Network Access → Add IP Address)
6. Get connection string (Clusters → Connect → Connect your application)
7. Copy the connection string:
   ```
   mongodb+srv://your_user:your_password@cluster0.xxxxx.mongodb.net/infinia_dev
   ```

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file
nano .env  # or use your favorite editor
```

**Required changes in .env**:
```bash
# Paste your MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://your_user:your_password@cluster0.xxxxx.mongodb.net/infinia_dev

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 64)

# Generate encryption key
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Set PostgreSQL password
POSTGRES_PASSWORD=your_secure_password_123

# Update CORS for your domain (production only)
CORS_ORIGIN=http://localhost:3000
```

**Quick generate all secrets**:
```bash
echo "JWT_SECRET=$(openssl rand -base64 64)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-32)"
```

Copy the output and paste into your `.env` file.

### Step 3: Deploy!

```bash
# Run deployment script
./deploy.sh

# Select option 1 (Development) or 2 (Production)
# Script will:
# - Build Docker containers
# - Start all services
# - Run database migrations
# - Seed initial data
# - Run health checks
```

**That's it!** 🎉

---

## Access Your Application

After deployment completes:

### Frontend
**URL**: http://localhost:3000

**Features**:
- Product management
- AI-powered product generator
- Kanban boards
- Sprint planning

### Admin Portal
**URL**: http://localhost:3000/admin

**Default Credentials**:
- Email: `admin@infinia.app`
- Password: `admin123` (change immediately!)

**Admin Features**:
- AI provider management
- Tenant management
- System health dashboard
- User management

### Backend API
**URL**: http://localhost:3001

**Health Check**: http://localhost:3001/api/v1/health

---

## Next Steps

### 1. Configure AI Providers

1. Login to admin portal: http://localhost:3000/admin
2. Go to AI Providers
3. Click "+ Add Provider"
4. Choose method:

**Option A: cURL Import (Easy)**
```bash
# Example: Add OpenAI
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY" \
  -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "Hello"}]}'
```
Copy this cURL, paste into admin portal, click "Parse & Import"

**Option B: Manual**
- Name: `openai`
- Display Name: `OpenAI`
- Provider Type: `openai`
- API Endpoint: `https://api.openai.com/v1/chat/completions`
- API Key: Your OpenAI API key
- Is Default: Yes
- Is Enabled: Yes

### 2. Create Your First Product

1. Login to main app: http://localhost:3000
2. Click "+ New Product"
3. Select "Generate with AI"
4. Fill in product details
5. Follow the 7-step wizard
6. Review and create!

### 3. Invite Team Members

1. Click avatar → Settings
2. Go to Organization
3. Click "Invite Members"
4. Enter email addresses
5. They'll receive invitation emails

---

## Common Issues

### Issue: Docker not running

**Error**: "Cannot connect to the Docker daemon"

**Solution**:
```bash
# macOS
open -a Docker

# Wait 20-30 seconds for Docker to start
```

### Issue: Port already in use

**Error**: "Port 3000 is already in use"

**Solution**:
```bash
# Find what's using the port
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or change port in docker-compose.yml
```

### Issue: MongoDB connection failed

**Error**: "MongoNetworkError: connection refused"

**Solutions**:
1. Check MongoDB Atlas IP whitelist includes your IP
2. Verify connection string is correct
3. Check database user credentials

### Issue: "Module not found" errors

**Solution**:
```bash
# Rebuild containers with no cache
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Useful Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Stop Everything
```bash
# Stop containers (keep data)
docker-compose stop

# Stop and remove containers (keep data)
docker-compose down

# Stop and remove everything including data
docker-compose down -v
```

### Database Access
```bash
# PostgreSQL
docker-compose exec postgres psql -U infinia -d infinia_system

# Run migrations
docker-compose exec backend npx node-pg-migrate up

# Seed data
docker-compose exec backend npx tsx src/scripts/seed-postgres.ts
```

---

## Production Deployment

For production deployment with SSL/HTTPS:

1. **Get a domain name**
2. **Get SSL certificate** (Let's Encrypt is free)
3. **Update environment**:
   ```bash
   CORS_ORIGIN=https://your-domain.com
   NODE_ENV=production
   ```
4. **Configure nginx** for SSL termination
5. **Deploy**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

See [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) for complete production setup.

---

## Alternative: Cloud Deployment

### Railway (Easiest, ~$5/month)

1. Fork repository to your GitHub
2. Go to https://railway.app
3. Click "New Project" → "Deploy from GitHub"
4. Select your repository
5. Add PostgreSQL database from marketplace
6. Add environment variables
7. Deploy automatically!

### Render (Free tier available)

1. Go to https://render.com
2. New → Web Service → Connect repository
3. Select Docker
4. Add PostgreSQL database
5. Add environment variables
6. Deploy!

---

## Support

- **Documentation**: [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)
- **Admin Guide**: [ADMIN-GUIDE.md](ADMIN-GUIDE.md)
- **User Guide**: [USER-GUIDE.md](USER-GUIDE.md)
- **Issues**: Check logs with `docker-compose logs -f`

---

**Happy Deploying!** 🚀
