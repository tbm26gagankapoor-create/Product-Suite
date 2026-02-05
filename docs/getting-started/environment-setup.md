# Environment Setup Guide

Complete reference for all environment variables in Infinia Products.

## Overview

Infinia Products uses environment variables for configuration across different environments (development, staging, production). This guide explains every variable and its purpose.

## Environment Files

### Backend Environment (`.env`)

Location: `backend/.env`

This file contains all backend configuration including database, authentication, email, and OAuth settings.

### Frontend Environment (`.env.local`)

Location: `.env.local` (project root)

This file contains frontend-specific configuration (AI API keys, backend URL).

**Note**: Frontend variables must start with `VITE_` prefix to be accessible.

## Backend Environment Variables

### Server Configuration

#### `PORT`
- **Required**: Yes
- **Default**: `3001`
- **Description**: Port number for Express server
- **Example**: `PORT=3001`

#### `NODE_ENV`
- **Required**: Yes
- **Default**: `development`
- **Values**: `development`, `staging`, `production`
- **Description**: Application environment mode
- **Example**: `NODE_ENV=development`
- **Impact**:
  - `development`: Detailed error messages, no caching, CORS relaxed
  - `staging`: Production-like with some debugging
  - `production`: Optimized, minimal logging, strict security

### Database Configuration

#### `MONGODB_URI`
- **Required**: Yes
- **Description**: MongoDB connection string
- **Format**:
  - Local: `mongodb://localhost:27017/database_name`
  - Atlas: `mongodb+srv://username:password@cluster.mongodb.net/database_name?retryWrites=true&w=majority`
- **Examples**:
  ```bash
  # Development (local)
  MONGODB_URI=mongodb://localhost:27017/infinia_dev

  # Development (Atlas)
  MONGODB_URI=mongodb+srv://dev_user:password@cluster0.zxio7yo.mongodb.net/infinia_dev?retryWrites=true&w=majority

  # Staging (Atlas)
  MONGODB_URI=mongodb+srv://staging_user:password@cluster0.zxio7yo.mongodb.net/infinia_staging?retryWrites=true&w=majority

  # Production (Atlas)
  MONGODB_URI=mongodb+srv://prod_user:password@cluster0.zxio7yo.mongodb.net/infinia?retryWrites=true&w=majority
  ```

#### `MONGODB_DATABASE`
- **Required**: No
- **Description**: Override database name from connection string
- **Example**: `MONGODB_DATABASE=infinia_custom`

### Authentication Configuration

#### `JWT_SECRET`
- **Required**: Yes
- **Minimum Length**: 32 characters (production should use 64+)
- **Description**: Secret key for signing JWT tokens
- **Security**: MUST be random and unique per environment
- **Generation**:
  ```bash
  # Generate secure secret (macOS/Linux)
  openssl rand -base64 64

  # Generate using Node.js
  node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
  ```
- **Examples**:
  ```bash
  # Development (example only - generate your own)
  JWT_SECRET=dev-secret-key-minimum-32-chars-required

  # Production (example only - generate strong random value)
  JWT_SECRET=hR9kL3mN8pQ2sT6vX1yZ4bC7eF0gJ5iK9lM3nP8qS2tV6xY1zA4cE7fH0jL3mN8p
  ```

#### `JWT_EXPIRES_IN`
- **Required**: No
- **Default**: `7d`
- **Description**: JWT token expiration time
- **Format**: `<number><unit>` where unit is `s`, `m`, `h`, or `d`
- **Examples**:
  ```bash
  JWT_EXPIRES_IN=7d    # 7 days
  JWT_EXPIRES_IN=24h   # 24 hours
  JWT_EXPIRES_IN=30d   # 30 days
  ```
- **Recommendations**:
  - Development: `7d` or `30d` (convenience)
  - Production: `7d` or `14d` (security/usability balance)

### CORS Configuration

#### `CORS_ORIGIN`
- **Required**: Yes
- **Default**: `*` (allows all - NOT SECURE)
- **Description**: Allowed origin(s) for CORS requests
- **Examples**:
  ```bash
  # Development
  CORS_ORIGIN=http://localhost:3000

  # Staging
  CORS_ORIGIN=https://staging.infinia.app

  # Production
  CORS_ORIGIN=https://infinia.app

  # Multiple origins (comma-separated)
  CORS_ORIGIN=https://infinia.app,https://www.infinia.app,https://app.infinia.com
  ```
- **Security**: ALWAYS set specific origin in production

### Rate Limiting Configuration

#### `RATE_LIMIT_WINDOW_MS`
- **Required**: No
- **Default**: `900000` (15 minutes)
- **Description**: Time window for rate limiting (in milliseconds)
- **Examples**:
  ```bash
  RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
  RATE_LIMIT_WINDOW_MS=3600000   # 1 hour
  ```

#### `RATE_LIMIT_MAX_REQUESTS`
- **Required**: No
- **Default**: `100`
- **Description**: Maximum requests per IP in time window
- **Examples**:
  ```bash
  # Development (relaxed)
  RATE_LIMIT_MAX_REQUESTS=1000

  # Production (strict)
  RATE_LIMIT_MAX_REQUESTS=100
  ```

### Email Configuration (Resend)

#### `RESEND_API_KEY`
- **Required**: No (email features won't work without it)
- **Description**: API key for Resend email service
- **Get Key**: [resend.com](https://resend.com/api-keys)
- **Example**: `RESEND_API_KEY=re_123abc456def789ghi`

#### `RESEND_FROM_EMAIL`
- **Required**: No
- **Default**: `noreply@infinia.app`
- **Description**: Sender email address
- **Example**: `RESEND_FROM_EMAIL=notifications@yourdomain.com`
- **Note**: Domain must be verified in Resend

#### `RESEND_FROM_NAME`
- **Required**: No
- **Default**: `Infinia Products`
- **Description**: Sender display name
- **Example**: `RESEND_FROM_NAME=Your Company Name`

### OAuth Configuration - Microsoft

#### `MICROSOFT_CLIENT_ID`
- **Required**: No (Microsoft OAuth won't work without it)
- **Description**: Azure AD application client ID
- **Get**: Azure Portal → App Registrations → Your App → Overview
- **Example**: `MICROSOFT_CLIENT_ID=12345678-1234-1234-1234-123456789012`

#### `MICROSOFT_CLIENT_SECRET`
- **Required**: No
- **Description**: Azure AD application client secret
- **Get**: Azure Portal → App Registrations → Your App → Certificates & secrets
- **Example**: `MICROSOFT_CLIENT_SECRET=abc123~def456.ghi789`
- **Security**: Rotate regularly, never commit to git

#### `MICROSOFT_TENANT_ID`
- **Required**: No
- **Default**: `common`
- **Description**: Azure AD tenant ID
- **Values**:
  - `common`: Multi-tenant (any Microsoft account)
  - `organizations`: Work/school accounts only
  - `consumers`: Personal Microsoft accounts only
  - `<tenant-id>`: Specific tenant only
- **Example**: `MICROSOFT_TENANT_ID=common`

#### `MICROSOFT_REDIRECT_URI`
- **Required**: No
- **Default**: `http://localhost:3001/api/v1/auth/microsoft/callback`
- **Description**: OAuth callback URL
- **Must Match**: Azure AD app registration redirect URI exactly
- **Examples**:
  ```bash
  # Development
  MICROSOFT_REDIRECT_URI=http://localhost:3001/api/v1/auth/microsoft/callback

  # Production
  MICROSOFT_REDIRECT_URI=https://api.infinia.app/api/v1/auth/microsoft/callback
  ```

### OAuth Configuration - Google

#### `GOOGLE_CLIENT_ID`
- **Required**: No (Google OAuth won't work without it)
- **Description**: Google OAuth 2.0 client ID
- **Get**: Google Cloud Console → APIs & Services → Credentials
- **Example**: `GOOGLE_CLIENT_ID=123456789-abc123def456.apps.googleusercontent.com`

#### `GOOGLE_CLIENT_SECRET`
- **Required**: No
- **Description**: Google OAuth 2.0 client secret
- **Get**: Google Cloud Console → APIs & Services → Credentials
- **Example**: `GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456ghi789`
- **Security**: Rotate regularly, never commit to git

#### `GOOGLE_REDIRECT_URI`
- **Required**: No
- **Default**: `http://localhost:3001/api/v1/auth/google/callback`
- **Description**: OAuth callback URL
- **Must Match**: Google Cloud Console authorized redirect URI exactly
- **Examples**:
  ```bash
  # Development
  GOOGLE_REDIRECT_URI=http://localhost:3001/api/v1/auth/google/callback

  # Production
  GOOGLE_REDIRECT_URI=https://api.infinia.app/api/v1/auth/google/callback
  ```

### OAuth Configuration - GitHub

Used for PRD document synchronization to GitHub repositories.

#### `GITHUB_CLIENT_ID`
- **Required**: No (GitHub integration won't work without it)
- **Description**: GitHub OAuth app client ID
- **Get**: GitHub Settings → Developer settings → OAuth Apps
- **Example**: `GITHUB_CLIENT_ID=Iv1.abc123def456`

#### `GITHUB_CLIENT_SECRET`
- **Required**: No
- **Description**: GitHub OAuth app client secret
- **Get**: GitHub Settings → Developer settings → OAuth Apps
- **Example**: `GITHUB_CLIENT_SECRET=abc123def456ghi789jkl012mno345pqr678stu`
- **Security**: Rotate regularly, never commit to git

#### `GITHUB_REDIRECT_URI`
- **Required**: No
- **Default**: `http://localhost:3001/api/v1/auth/github/callback`
- **Description**: OAuth callback URL
- **Must Match**: GitHub OAuth app callback URL exactly
- **Examples**:
  ```bash
  # Development
  GITHUB_REDIRECT_URI=http://localhost:3001/api/v1/auth/github/callback

  # Production
  GITHUB_REDIRECT_URI=https://api.infinia.app/api/v1/auth/github/callback
  ```

#### `GITHUB_ENCRYPTION_KEY`
- **Required**: No (but recommended if using GitHub integration)
- **Description**: Encryption key for storing GitHub access tokens in database
- **Length**: Must be exactly 32 characters
- **Generation**:
  ```bash
  openssl rand -hex 16
  ```
- **Example**: `GITHUB_ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

## Frontend Environment Variables

### AI API Keys

#### `VITE_GEMINI_API_KEY`
- **Required**: No (AI product wizard won't work without it)
- **Description**: Google Gemini API key for AI features
- **Get**: [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Example**: `VITE_GEMINI_API_KEY=AIzaSyAbc123Def456Ghi789`
- **Features**: Product vision generation, document generation

#### `VITE_CLAUDE_API_KEY`
- **Required**: No (AI task descriptions won't work without it)
- **Description**: Anthropic Claude API key for AI features
- **Get**: [Anthropic Console](https://console.anthropic.com/)
- **Example**: `VITE_CLAUDE_API_KEY=sk-ant-api03-abc123def456`
- **Features**: Task description generation, copilot features

### Backend API URL

#### `VITE_API_URL`
- **Required**: No
- **Default**: `http://localhost:3001/api/v1`
- **Description**: Backend API base URL
- **Examples**:
  ```bash
  # Development (default)
  VITE_API_URL=http://localhost:3001/api/v1

  # Staging
  VITE_API_URL=https://api-staging.infinia.app/api/v1

  # Production
  VITE_API_URL=https://api.infinia.app/api/v1
  ```

## Environment Templates

### Development Environment

**backend/.env**:
```bash
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/infinia_dev
JWT_SECRET=dev-secret-key-minimum-32-chars-required-change-for-production
JWT_EXPIRES_IN=30d
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

**.env.local** (optional):
```bash
VITE_GEMINI_API_KEY=your_gemini_key
VITE_CLAUDE_API_KEY=your_claude_key
```

### Staging Environment

**backend/.env**:
```bash
PORT=3001
NODE_ENV=staging
MONGODB_URI=mongodb+srv://staging_user:password@cluster.mongodb.net/infinia_staging
JWT_SECRET=<strong-random-secret-64-chars-minimum>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://staging.infinia.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=200
RESEND_API_KEY=<your-resend-key>
RESEND_FROM_EMAIL=staging@yourdomain.com
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-secret>
GOOGLE_REDIRECT_URI=https://api-staging.infinia.app/api/v1/auth/google/callback
MICROSOFT_CLIENT_ID=<your-microsoft-client-id>
MICROSOFT_CLIENT_SECRET=<your-microsoft-secret>
MICROSOFT_REDIRECT_URI=https://api-staging.infinia.app/api/v1/auth/microsoft/callback
```

**.env.local**:
```bash
VITE_API_URL=https://api-staging.infinia.app/api/v1
VITE_GEMINI_API_KEY=your_gemini_key
VITE_CLAUDE_API_KEY=your_claude_key
```

### Production Environment

**backend/.env**:
```bash
PORT=3001
NODE_ENV=production
MONGODB_URI=mongodb+srv://prod_user:strong_password@cluster.mongodb.net/infinia?retryWrites=true&w=majority
JWT_SECRET=<strong-random-secret-128-chars-minimum-rotate-every-90-days>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://infinia.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RESEND_API_KEY=<your-resend-production-key>
RESEND_FROM_EMAIL=noreply@infinia.app
RESEND_FROM_NAME=Infinia Products
GOOGLE_CLIENT_ID=<your-google-production-client-id>
GOOGLE_CLIENT_SECRET=<your-google-production-secret>
GOOGLE_REDIRECT_URI=https://api.infinia.app/api/v1/auth/google/callback
MICROSOFT_CLIENT_ID=<your-microsoft-production-client-id>
MICROSOFT_CLIENT_SECRET=<your-microsoft-production-secret>
MICROSOFT_REDIRECT_URI=https://api.infinia.app/api/v1/auth/microsoft/callback
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-secret>
GITHUB_REDIRECT_URI=https://api.infinia.app/api/v1/auth/github/callback
GITHUB_ENCRYPTION_KEY=<32-char-encryption-key>
```

**.env.local**:
```bash
VITE_API_URL=https://api.infinia.app/api/v1
VITE_GEMINI_API_KEY=<production-gemini-key>
VITE_CLAUDE_API_KEY=<production-claude-key>
```

## Security Best Practices

### Secrets Management

1. **Never Commit Secrets**
   - Add `.env` and `.env.local` to `.gitignore`
   - Use `.env.example` for documentation only
   - Never hardcode secrets in source code

2. **Use Strong Secrets**
   - JWT_SECRET: 64+ characters, randomly generated
   - Database passwords: 20+ characters, complex
   - OAuth secrets: Use provider-generated values

3. **Rotate Secrets Regularly**
   - JWT_SECRET: Every 90 days
   - OAuth secrets: Every 180 days
   - Database passwords: Every 90 days

4. **Environment-Specific Secrets**
   - NEVER use production secrets in development
   - Use different secrets for each environment
   - Store production secrets in secure vault (AWS Secrets Manager, HashiCorp Vault)

### Environment Variable Management

**Development**:
- Use `.env` files locally
- Document all variables in `.env.example`

**Staging/Production**:
- Use environment variable management service:
  - AWS Systems Manager Parameter Store
  - AWS Secrets Manager
  - Azure Key Vault
  - HashiCorp Vault
  - Docker secrets
- Never store secrets in Docker images
- Inject secrets at runtime

## Troubleshooting

### JWT Secret Too Short

**Error**: `JWT_SECRET must be at least 32 characters long`

**Solution**: Generate new secret:
```bash
openssl rand -base64 64
```

### MongoDB Connection Failed

**Error**: `MongoNetworkError: connect ECONNREFUSED`

**Check**:
1. MongoDB service is running
2. Connection string is correct
3. IP is whitelisted (for Atlas)
4. Credentials are valid

### CORS Error in Browser

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**: Set correct `CORS_ORIGIN` in backend `.env`:
```bash
CORS_ORIGIN=http://localhost:3000
```

### OAuth Redirect URI Mismatch

**Error**: `redirect_uri_mismatch`

**Solution**: Ensure callback URI in `.env` matches OAuth provider settings exactly (including protocol, domain, port, path).

## Next Steps

- [Installation Guide](installation.md) - Complete setup instructions
- [Quick Start](quick-start.md) - Get running in 5 minutes
- [Security Checklist](../deployment/security-checklist.md) - Production security
- [Troubleshooting](../developer/troubleshooting.md) - Common issues

---

**Last Updated**: 2026-02-05

Need help? Check the [troubleshooting guide](../developer/troubleshooting.md) or [installation guide](installation.md).
