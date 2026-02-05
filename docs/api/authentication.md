# Authentication API

Complete reference for authentication endpoints including email/password and OAuth flows.

## Overview

The authentication API provides endpoints for user registration, login, and OAuth integration with Google, Microsoft, and GitHub.

**Base Path**: `/api/v1/auth`

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login with email/password | No |
| GET | `/auth/me` | Get current user | Yes |
| GET | `/auth/microsoft` | Initiate Microsoft OAuth | No |
| GET | `/auth/microsoft/callback` | Microsoft OAuth callback | No |
| GET | `/auth/google` | Initiate Google OAuth | No |
| GET | `/auth/google/callback` | Google OAuth callback | No |
| GET | `/auth/github` | Initiate GitHub OAuth | Yes |
| GET | `/auth/github/callback` | GitHub OAuth callback | Yes |
| GET | `/auth/providers` | List configured OAuth providers | No |

---

## Email/Password Authentication

### POST /auth/register

Register a new user with email and password.

**Request**:
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | User's full name (1-255 chars) |
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | Password (8-128 chars) |
| `organizationId` | string | No | Organization to join (if invited) |

**Validation Rules**:
- Email must be valid format
- Email must be unique (not already registered)
- Password minimum 8 characters
- Name minimum 1 character

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_abc123",
      "name": "John Doe",
      "email": "john@example.com",
      "designation": "Member",
      "organizationId": null,
      "avatar_url": null,
      "created_at": "2026-02-05T12:00:00.000Z"
    }
  }
}
```

**Error Responses**:

**409 Conflict** - Email already exists:
```json
{
  "success": false,
  "error": "User with this email already exists"
}
```

**400 Bad Request** - Validation error:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": "Invalid email format",
      "password": "Password must be at least 8 characters"
    }
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```

---

### POST /auth/login

Login with email and password.

**Request**:
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `password` | string | Yes | User's password |

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_abc123",
      "name": "John Doe",
      "email": "john@example.com",
      "designation": "Member",
      "organizationId": "org_xyz789",
      "avatar_url": "https://example.com/avatar.jpg",
      "location": "San Francisco, CA",
      "bio": "Product Manager",
      "created_at": "2026-02-05T12:00:00.000Z",
      "last_active_at": "2026-02-05T14:30:00.000Z"
    }
  }
}
```

**Token Details**:
- **Type**: JWT (JSON Web Token)
- **Algorithm**: HS256
- **Expiration**: 7 days (configurable via JWT_EXPIRES_IN)
- **Payload**:
  ```json
  {
    "userId": "user_abc123",
    "email": "john@example.com",
    "iat": 1641024000,
    "exp": 1641628800
  }
  ```

**Error Responses**:

**401 Unauthorized** - Invalid credentials:
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

**400 Bad Request** - Missing fields:
```json
{
  "success": false,
  "error": "Email and password are required"
}
```

**Example**:
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```

**Using the Token**:
```bash
# Store token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Use in subsequent requests
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/projects
```

---

### GET /auth/me

Get current authenticated user's profile.

**Authentication**: Required (JWT Bearer token)

**Request**:
```http
GET /api/v1/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "user_abc123",
    "name": "John Doe",
    "email": "john@example.com",
    "designation": "Admin",
    "organizationId": "org_xyz789",
    "avatar_url": "https://example.com/avatar.jpg",
    "location": "San Francisco, CA",
    "bio": "Product Manager passionate about building great products",
    "website": "https://johndoe.com",
    "job_title": "Senior Product Manager",
    "social_links": {
      "twitter": "https://twitter.com/johndoe",
      "linkedin": "https://linkedin.com/in/johndoe"
    },
    "status": "active",
    "oauth_provider": null,
    "created_at": "2026-01-15T10:00:00.000Z",
    "last_active_at": "2026-02-05T14:30:00.000Z"
  }
}
```

**Error Responses**:

**401 Unauthorized** - Missing or invalid token:
```json
{
  "success": false,
  "error": "Authentication required"
}
```

**Example**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/auth/me
```

---

## Microsoft OAuth

### GET /auth/microsoft

Initiate Microsoft OAuth authentication flow.

**Request**:
```http
GET /api/v1/auth/microsoft
```

**Query Parameters**: None

**Flow**:
1. Backend generates random state token (CSRF protection)
2. Stores state in database with 10-minute expiration
3. Redirects to Microsoft authorization URL

**Response** (302 Redirect):
Redirects browser to Microsoft login page:
```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize
  ?client_id=<client_id>
  &response_type=code
  &redirect_uri=<callback_url>
  &response_mode=query
  &scope=openid+profile+email+User.Read
  &state=<random_state_token>
```

**Scopes Requested**:
- `openid` - Basic authentication
- `profile` - User's profile information
- `email` - User's email address
- `User.Read` - Read user's profile from Microsoft Graph

**Example**:
```bash
# This redirects to Microsoft login
curl -L http://localhost:3001/api/v1/auth/microsoft
```

**Frontend Usage**:
```javascript
// Redirect user to Microsoft OAuth
window.location.href = 'http://localhost:3001/api/v1/auth/microsoft';
```

---

### GET /auth/microsoft/callback

Microsoft OAuth callback handler (internal use).

**Request**:
```http
GET /api/v1/auth/microsoft/callback?code=<auth_code>&state=<state_token>
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Authorization code from Microsoft |
| `state` | string | State token for CSRF protection |

**Backend Flow**:
1. Validates state token (CSRF protection)
2. Exchanges authorization code for access token
3. Fetches user profile from Microsoft Graph API
4. Finds or creates user in database
5. Generates JWT token
6. Redirects to frontend with token

**Response** (302 Redirect):
Redirects to frontend with token in URL:
```
http://localhost:3000/oauth-callback?token=<jwt_token>
```

**Frontend Handling**:
```javascript
// In OAuthCallback component
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (token) {
  localStorage.setItem('vulcan_token', token);
  // Redirect to dashboard
  navigate('/');
}
```

**Error Responses**:

**400 Bad Request** - Invalid state token:
```json
{
  "success": false,
  "error": "Invalid or expired state token"
}
```

**401 Unauthorized** - Microsoft authorization failed:
```json
{
  "success": false,
  "error": "Failed to authenticate with Microsoft"
}
```

---

## Google OAuth

### GET /auth/google

Initiate Google OAuth authentication flow.

**Request**:
```http
GET /api/v1/auth/google
```

**Flow**:
1. Backend generates random state token
2. Stores state in database with 10-minute expiration
3. Redirects to Google authorization URL

**Response** (302 Redirect):
Redirects to Google login:
```
https://accounts.google.com/o/oauth2/v2/auth
  ?client_id=<client_id>
  &redirect_uri=<callback_url>
  &response_type=code
  &scope=openid+profile+email
  &access_type=offline
  &state=<random_state_token>
```

**Scopes Requested**:
- `openid` - OpenID Connect authentication
- `profile` - User's basic profile
- `email` - User's email address

**Example**:
```bash
curl -L http://localhost:3001/api/v1/auth/google
```

**Frontend Usage**:
```javascript
window.location.href = 'http://localhost:3001/api/v1/auth/google';
```

---

### GET /auth/google/callback

Google OAuth callback handler (internal use).

**Request**:
```http
GET /api/v1/auth/google/callback?code=<auth_code>&state=<state_token>
```

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | Authorization code from Google |
| `state` | string | State token for CSRF protection |

**Backend Flow**:
1. Validates state token
2. Exchanges code for access token
3. Fetches user profile from Google API
4. Finds or creates user
5. Generates JWT
6. Redirects to frontend with token

**Response** (302 Redirect):
```
http://localhost:3000/oauth-callback?token=<jwt_token>
```

**Account Linking**:
If a user with the same email already exists:
- Links OAuth provider to existing account
- Updates `oauth_provider` and `oauth_provider_id` fields
- User can now log in with both email/password and OAuth

---

## GitHub OAuth

Used for PRD document synchronization to GitHub repositories.

### GET /auth/github

Initiate GitHub OAuth flow for repository integration.

**Authentication**: Required (JWT Bearer token)

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | string | Yes | Project ID to connect GitHub |

**Request**:
```http
GET /api/v1/auth/github?projectId=proj_abc123
Authorization: Bearer <token>
```

**Flow**:
1. Validates user is project member
2. Generates state token with project context
3. Redirects to GitHub authorization

**Response** (302 Redirect):
```
https://github.com/login/oauth/authorize
  ?client_id=<client_id>
  &redirect_uri=<callback_url>
  &scope=repo+read:user+user:email
  &state=<state_with_project_context>
```

**Scopes Requested**:
- `repo` - Full repository access (read/write)
- `read:user` - Read user profile
- `user:email` - Access user email

**Example**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/api/v1/auth/github?projectId=proj_abc123"
```

---

### GET /auth/github/callback

GitHub OAuth callback handler.

**Request**:
```http
GET /api/v1/auth/github/callback?code=<auth_code>&state=<state_token>
```

**Backend Flow**:
1. Validates state token and extracts project ID
2. Exchanges code for access token
3. Fetches GitHub user profile
4. Creates or updates GitHubIntegration record
5. Encrypts and stores access token
6. Redirects to project settings

**Response** (302 Redirect):
```
http://localhost:3000/projects/<project_id>/settings?github=connected
```

**Database Storage**:
```json
{
  "id": "github_int_123",
  "project_id": "proj_abc123",
  "github_access_token": "<encrypted_token>",
  "github_username": "johndoe",
  "github_user_id": "12345678",
  "repo_owner": null,
  "repo_name": null,
  "branch": null,
  "file_path": null,
  "auto_sync_enabled": false,
  "connected_by": "user_abc123",
  "created_at": "2026-02-05T12:00:00.000Z"
}
```

---

## GET /auth/providers

Get list of configured OAuth providers.

**Authentication**: Not required

**Request**:
```http
GET /api/v1/auth/providers
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "microsoft": {
      "enabled": true,
      "name": "Microsoft",
      "icon": "microsoft"
    },
    "google": {
      "enabled": true,
      "name": "Google",
      "icon": "google"
    },
    "github": {
      "enabled": true,
      "name": "GitHub",
      "icon": "github"
    }
  }
}
```

**Provider Object**:

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Whether provider is configured |
| `name` | string | Display name |
| `icon` | string | Icon identifier |

**Example**:
```bash
curl http://localhost:3001/api/v1/auth/providers
```

**Frontend Usage**:
```javascript
const { data } = await fetch('/api/v1/auth/providers');

// Show only enabled OAuth providers
if (data.google.enabled) {
  // Show "Login with Google" button
}
if (data.microsoft.enabled) {
  // Show "Login with Microsoft" button
}
```

---

## Security Considerations

### Password Hashing

Passwords are hashed using **bcrypt** with 12 rounds:
```typescript
import bcrypt from 'bcrypt';
const hashedPassword = await bcrypt.hash(password, 12);
```

### JWT Token Security

- **Algorithm**: HS256 (HMAC with SHA-256)
- **Secret**: Minimum 32 characters (64+ recommended for production)
- **Expiration**: 7 days (configurable)
- **Payload**: Minimal (userId, email only)

**Token Storage**:
- Frontend stores in `localStorage` (⚠️ vulnerable to XSS)
- Consider using httpOnly cookies for production

### OAuth CSRF Protection

State tokens prevent CSRF attacks:
1. Generated with `crypto.randomBytes(32)`
2. Stored in database with 10-minute TTL
3. Validated on callback
4. Deleted after use

### Account Linking

When OAuth email matches existing account:
- Automatically links OAuth provider
- User can log in with either method
- No duplicate accounts created

**Security Risk**: If attacker controls email, they can link OAuth to existing account.
**Mitigation**: Email verification recommended before linking.

### Rate Limiting

Authentication endpoints are rate-limited:
- **Login/Register**: 5 attempts per 15 minutes per IP
- **OAuth**: 10 attempts per 15 minutes per IP

---

## Examples

### Complete Registration Flow

```bash
# 1. Register new user
RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "password": "SecurePass123!"
  }')

# 2. Extract token
TOKEN=$(echo $RESPONSE | jq -r '.data.token')

# 3. Verify authentication works
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/auth/me
```

### Complete Login Flow

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "SecurePass123!"
  }' | jq -r '.data.token')

# 2. Use token for API calls
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/projects
```

### OAuth Flow (Frontend)

```javascript
// Login with Google
const handleGoogleLogin = () => {
  window.location.href = `${API_URL}/auth/google`;
};

// Handle OAuth callback
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (token) {
    localStorage.setItem('vulcan_token', token);

    // Fetch user data
    fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      localStorage.setItem('vulcan_user', JSON.stringify(data.data));
      navigate('/dashboard');
    });
  }
}, []);
```

---

## Testing

### Postman Collection

Import these requests into Postman:

**Register**:
```
POST {{baseUrl}}/auth/register
Body (JSON):
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "TestPass123!"
}
```

**Login**:
```
POST {{baseUrl}}/auth/login
Body (JSON):
{
  "email": "test@example.com",
  "password": "TestPass123!"
}

Tests:
pm.environment.set("token", pm.response.json().data.token);
```

**Get Current User**:
```
GET {{baseUrl}}/auth/me
Headers:
Authorization: Bearer {{token}}
```

---

## Next Steps

- [Organizations API](organizations.md) - Create and manage organizations
- [Projects API](projects.md) - Create your first project
- [Users API](users.md) - Update user profile

---

**Last Updated**: 2026-02-05

Need help? Check the [API Overview](README.md) or [Troubleshooting Guide](../developer/troubleshooting.md).
