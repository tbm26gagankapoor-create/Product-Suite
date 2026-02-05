# API Reference

Complete API documentation for Infinia Products backend.

## Base URL

```
Development: http://localhost:3001/api/v1
Staging:     https://api-staging.infinia.app/api/v1
Production:  https://api.infinia.app/api/v1
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token

**Email/Password Login**:
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "John Doe",
      "organizationId": "org_456"
    }
  }
}
```

### Using the Token

Include the token in subsequent requests:

```bash
curl -X GET http://localhost:3001/api/v1/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Response Format

### Success Response

All successful responses follow this format:

```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Paginated Response

List endpoints return paginated data:

```json
{
  "success": true,
  "data": [
    // Array of items
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3,
    "hasMore": true
  }
}
```

### Error Response

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message"
}
```

Or with detailed error information:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": "Invalid email format"
    }
  }
}
```

## Common Query Parameters

### Pagination

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-indexed) |
| `limit` | number | 50 | Items per page (max 100) |

**Example**:
```bash
GET /api/v1/tasks?page=2&limit=25
```

### Filtering

Most list endpoints support filtering by common fields:

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | string | Filter by project ID |
| `organizationId` | string | Filter by organization ID |
| `status` | string | Filter by status |
| `assigneeId` | string | Filter by assignee |
| `sprintId` | string | Filter by sprint |

**Example**:
```bash
GET /api/v1/tasks?projectId=proj_123&status=in_progress
```

### Sorting

| Parameter | Type | Description |
|-----------|------|-------------|
| `sortBy` | string | Field to sort by |
| `sortOrder` | string | `asc` or `desc` |

**Example**:
```bash
GET /api/v1/tasks?sortBy=created_at&sortOrder=desc
```

## HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Invalid request data or parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource conflict (e.g., duplicate email) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error (unhandled exception) |

## Rate Limiting

**Limit**: 100 requests per 15 minutes per IP address

**Headers**:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1641024000
```

**Rate Limit Exceeded Response**:
```json
{
  "success": false,
  "error": "Too many requests, please try again later"
}
```

## CORS

Cross-origin requests are allowed from:
- Development: `http://localhost:3000`
- Production: Configured domain

**Allowed Methods**: `GET, POST, PATCH, DELETE, OPTIONS`

**Allowed Headers**: `Content-Type, Authorization`

## API Endpoints

### Authentication
- [Authentication API](authentication.md) - Login, registration, OAuth flows

### Resources
- [Organizations API](organizations.md) - Organization management
- [Projects API](projects.md) - Project CRUD and members
- [Tasks API](tasks.md) - Task management and operations
- [Sprints API](sprints.md) - Sprint lifecycle
- [Teams API](teams.md) - Team management
- [Users API](users.md) - User profiles and preferences

### Features
- [Comments API](comments.md) - Task comments
- [Document Comments API](document-comments.md) - PRD commenting
- [Notifications API](notifications.md) - Notification system
- [Activity API](activity.md) - Activity logging
- [Tags API](tags.md) - Tag management
- [Columns API](columns.md) - Kanban columns

### Integrations
- [GitHub Integration API](github-integration.md) - GitHub OAuth and sync

## Common Patterns

### Creating a Resource

```bash
POST /api/v1/<resource>
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Resource Name",
  "description": "Description",
  // ... other fields
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "resource_123",
    "name": "Resource Name",
    "created_at": "2026-02-05T12:00:00.000Z",
    // ... other fields
  }
}
```

### Updating a Resource

```bash
PATCH /api/v1/<resource>/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Updated Name"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "resource_123",
    "name": "Updated Name",
    "updated_at": "2026-02-05T13:00:00.000Z",
    // ... other fields
  }
}
```

### Deleting a Resource

```bash
DELETE /api/v1/<resource>/:id
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Resource deleted successfully"
}
```

### Getting a List

```bash
GET /api/v1/<resource>?page=1&limit=50
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    { "id": "resource_1", ... },
    { "id": "resource_2", ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2,
    "hasMore": true
  }
}
```

### Getting a Single Resource

```bash
GET /api/v1/<resource>/:id
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "resource_123",
    "name": "Resource Name",
    // ... all fields
  }
}
```

## Data Types

### Common Field Types

| Type | Format | Example |
|------|--------|---------|
| **ID** | String (prefixed) | `user_abc123`, `proj_xyz789` |
| **Date** | ISO 8601 string | `2026-02-05T12:00:00.000Z` |
| **Email** | String (RFC 5322) | `user@example.com` |
| **URL** | String (valid URL) | `https://example.com/image.png` |
| **Enum** | String (predefined values) | `active`, `completed` |
| **Array** | JSON array | `["tag1", "tag2"]` |
| **Object** | JSON object | `{"key": "value"}` |

### Common Enums

**Task Types**:
```typescript
'epic' | 'feature' | 'story' | 'task' | 'bug'
```

**Task Priorities**:
```typescript
'low' | 'medium' | 'high' | 'critical'
```

**Task Status**:
```typescript
'todo' | 'in_progress' | 'blocked' | 'testing' | 'done'
```

**Organization Roles**:
```typescript
'owner' | 'admin' | 'member' | 'viewer'
```

**Sprint Status**:
```typescript
'planned' | 'active' | 'completed'
```

## Validation

All input data is validated using Zod schemas. Invalid requests return:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "email": "Invalid email format",
      "name": "Name is required"
    }
  }
}
```

### Common Validation Rules

| Field | Rules |
|-------|-------|
| **Email** | Valid email format, max 255 chars |
| **Password** | Min 8 chars, max 128 chars |
| **Name** | Min 1 char, max 255 chars |
| **Description** | Max 5000 chars |
| **ID** | Valid UUID or prefixed ID |
| **URL** | Valid URL format |

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Webhooks (Planned)

Webhook support for real-time notifications is planned for future release.

**Planned Events**:
- `task.created`
- `task.updated`
- `task.completed`
- `sprint.started`
- `sprint.completed`
- `project.created`

## API Versioning

Current version: **v1**

Future API versions will be released as:
- `/api/v2/...`
- `/api/v3/...`

Legacy versions will be maintained for at least 12 months after new version release.

## SDK & Client Libraries (Planned)

Official SDKs planned for:
- JavaScript/TypeScript
- Python
- Go

## Testing the API

### Using cURL

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "Admin123!"}' \
  | jq -r '.data.token')

# Get projects
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/projects
```

### Using Postman

1. Import Postman collection (planned)
2. Set `{{baseUrl}}` environment variable
3. Set `{{token}}` environment variable after login

### Using Insomnia

1. Import Insomnia workspace (planned)
2. Configure base URL and auth token

## Support & Feedback

- **Bug Reports**: Create GitHub issue
- **Feature Requests**: Create GitHub discussion
- **API Questions**: Check documentation or ask in discussions

## Next Steps

- [Authentication API](authentication.md) - Start with authentication
- [Projects API](projects.md) - Create your first project via API
- [Tasks API](tasks.md) - Manage tasks programmatically

---

**API Version**: 1.0.0
**Last Updated**: 2026-02-05

Ready to start? Check out the [Authentication API documentation](authentication.md).
