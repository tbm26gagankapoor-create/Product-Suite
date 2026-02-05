# Test Strategy

Comprehensive testing strategy for Infinia Products platform.

## Overview

This document outlines the testing approach, coverage targets, tools, and processes for ensuring quality in the Infinia Products platform.

## Testing Philosophy

Our testing approach follows the **Testing Pyramid** principle:

```
           /\
          /  \
         / E2E \         10% - End-to-End Tests
        /______\
       /        \
      / Integration\     30% - Integration Tests
     /____________\
    /              \
   /   Unit Tests   \    60% - Unit Tests
  /__________________\
```

### Test Distribution

| Test Type | Coverage Target | Purpose |
|-----------|----------------|---------|
| **Unit Tests** | 60% of test suite | Test individual functions/components in isolation |
| **Integration Tests** | 30% of test suite | Test API endpoints, service layer, database interactions |
| **End-to-End Tests** | 10% of test suite | Test critical user flows through UI |

## Testing Levels

### 1. Unit Testing

**Scope**: Individual functions, components, and modules

**Frontend Unit Tests**:
- React components (rendering, props, state)
- Service functions (API calls, data transformation)
- Utility functions (date formatting, validation, etc.)
- Context providers (state management)

**Backend Unit Tests**:
- Service layer functions
- Validation schemas
- Utility functions
- Model methods

**Tools**: Vitest (frontend), Jest (backend)

**Coverage Target**: 70% code coverage

**Example**:
```typescript
// tests/services/tasks.service.test.ts
describe('TasksService', () => {
  describe('createTask', () => {
    it('should create task with required fields', async () => {
      const taskData = {
        title: 'Test Task',
        projectId: 'proj_123',
        type: 'feature'
      };
      const task = await tasksService.createTask(taskData);
      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
    });

    it('should throw error if required field missing', async () => {
      await expect(
        tasksService.createTask({ title: 'Test' })
      ).rejects.toThrow('Project ID required');
    });
  });
});
```

### 2. Integration Testing

**Scope**: API endpoints, database operations, external services

**Backend Integration Tests**:
- API endpoint responses
- Database CRUD operations
- Authentication/authorization flows
- External API integrations (OAuth, email)

**Tools**: Supertest (API testing), MongoDB Memory Server (test database)

**Coverage Target**: 80% of API endpoints

**Example**:
```typescript
// tests/api/tasks.test.ts
describe('POST /api/v1/tasks', () => {
  it('should create task with valid auth', async () => {
    const response = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'New Task',
        projectId: 'proj_123',
        type: 'feature',
        priority: 'high'
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.title).toBe('New Task');

    // Verify in database
    const task = await Task.findById(response.body.data.id);
    expect(task).toBeDefined();
  });

  it('should return 401 without auth', async () => {
    await request(app)
      .post('/api/v1/tasks')
      .send({ title: 'Test' })
      .expect(401);
  });
});
```

### 3. End-to-End Testing

**Scope**: Complete user workflows through the UI

**Critical User Flows**:
- User registration and login
- Organization onboarding
- Product creation via wizard
- Task management (create, edit, move)
- Sprint planning and execution
- Team collaboration

**Tools**: Playwright or Cypress

**Coverage Target**: 95% of critical paths

**Example**:
```typescript
// e2e/product-wizard.spec.ts
test('complete product creation via wizard', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Navigate to product wizard
  await page.click('[data-testid="create-product-btn"]');

  // Step 1: Define Product
  await page.fill('[name="name"]', 'Test Product');
  await page.fill('[name="description"]', 'Product description');
  await page.click('[data-testid="next-btn"]');

  // Step 2: AI Vision
  await page.waitForSelector('[data-testid="vision-content"]');
  await page.click('[data-testid="next-btn"]');

  // Step 3: Documents
  await page.waitForSelector('[data-testid="document-progress"]');
  await page.click('[data-testid="next-btn"]');

  // Step 4: Planning
  await page.waitForSelector('[data-testid="epics-list"]');
  await page.click('[data-testid="create-project-btn"]');

  // Verify project created
  await expect(page).toHaveURL(/\/projects\/.+/);
  await expect(page.locator('h1')).toContainText('Test Product');
});
```

## Testing Tools

### Frontend Testing Stack

| Tool | Purpose | Usage |
|------|---------|-------|
| **Vitest** | Unit test runner | Component and function tests |
| **React Testing Library** | Component testing | Render and interact with components |
| **MSW (Mock Service Worker)** | API mocking | Mock backend responses |
| **Playwright** | E2E testing | Browser automation |

### Backend Testing Stack

| Tool | Purpose | Usage |
|------|---------|-------|
| **Jest** | Unit test runner | Service and utility tests |
| **Supertest** | API testing | HTTP request/response testing |
| **MongoDB Memory Server** | Test database | In-memory MongoDB for tests |
| **Faker** | Test data generation | Generate realistic test data |

### Additional Tools

| Tool | Purpose |
|------|---------|
| **Postman/Insomnia** | Manual API testing |
| **MongoDB Compass** | Database inspection |
| **Chrome DevTools** | Frontend debugging |
| **React DevTools** | Component inspection |

## Test Environment Setup

### Test Databases

Separate databases for each environment:

| Environment | Database | Purpose |
|-------------|----------|---------|
| **Unit Tests** | MongoDB Memory Server | Isolated in-memory DB per test suite |
| **Integration Tests** | `infinia_test` | Persistent test database, reset before each run |
| **E2E Tests** | `infinia_e2e` | Persistent E2E database with seed data |
| **Staging** | `infinia_staging` | Pre-production testing |

### Test Data Management

**Strategies**:

1. **Test Fixtures**: Pre-defined test data in JSON files
   ```typescript
   // tests/fixtures/users.ts
   export const testUsers = {
     admin: {
       email: 'admin@test.com',
       password: 'Admin123!',
       name: 'Admin User'
     },
     member: {
       email: 'member@test.com',
       password: 'Member123!',
       name: 'Member User'
     }
   };
   ```

2. **Factory Pattern**: Generate test data programmatically
   ```typescript
   // tests/factories/task.factory.ts
   export const createTestTask = (overrides = {}) => ({
     title: faker.lorem.sentence(),
     description: faker.lorem.paragraph(),
     type: 'feature',
     priority: 'medium',
     projectId: 'proj_test_123',
     ...overrides
   });
   ```

3. **Database Seeding**: Seed test database before E2E tests
   ```bash
   npm run db:seed:test
   ```

4. **Cleanup**: Reset database state after each test
   ```typescript
   afterEach(async () => {
     await Task.deleteMany({});
     await Project.deleteMany({});
   });
   ```

## Coverage Targets

### Code Coverage

| Component | Target | Measurement |
|-----------|--------|-------------|
| **Backend Services** | 80% | Line coverage |
| **Backend Routes** | 85% | Branch coverage |
| **Frontend Components** | 70% | Line coverage |
| **Frontend Services** | 75% | Line coverage |
| **Overall** | 75% | Combined coverage |

### Functional Coverage

| Feature Area | Target | Measurement |
|-------------|--------|-------------|
| **Authentication** | 100% | All flows tested |
| **Core Workflows** | 95% | Critical paths covered |
| **API Endpoints** | 90% | Endpoints with tests |
| **UI Components** | 80% | Components with tests |

## Test Plans by Feature

Detailed test plans for each feature area:

1. [Authentication Test Plan](test-plans/authentication.md)
   - Email/password registration and login
   - OAuth flows (Google, Microsoft, GitHub)![alt text](image.png)
   - Password reset
   - Session management

2. [Organization Management Test Plan](test-plans/organization-management.md)
   - Organization creation
   - Member management
   - Role-based access
   - Domain-based joining

3. [Project Management Test Plan](test-plans/project-management.md)
   - Project CRUD operations
   - Product wizard flow
   - Project member management
   - Project settings

4. [Task Management Test Plan](test-plans/task-management.md)
   - Task CRUD operations
   - Subtasks
   - Task dependencies
   - Comments and attachments

5. [Sprint Planning Test Plan](test-plans/sprint-planning.md)
   - Sprint creation
   - Sprint lifecycle (planned → active → completed)
   - Task assignment
   - Sprint metrics

6. [Team Collaboration Test Plan](test-plans/team-collaboration.md)
   - Team creation
   - Member management
   - Cross-project teams

7. [Notifications Test Plan](test-plans/notifications.md)
   - Notification generation
   - Notification preferences
   - Email delivery
   - Quiet hours

8. [GitHub Integration Test Plan](test-plans/github-integration.md)
   - GitHub OAuth
   - Repository connection
   - PRD synchronization
   - Auto-sync

## Test Execution

### Local Development Testing

```bash
# Frontend unit tests
npm run test

# Frontend tests with coverage
npm run test:coverage

# Frontend tests in watch mode
npm run test:watch

# Backend unit tests
cd backend
npm run test

# Backend integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### CI/CD Pipeline (Planned)

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 18
      - name: Install dependencies
        run: npm install && cd backend && npm install
      - name: Lint
        run: npm run lint
      - name: Unit Tests
        run: npm run test:coverage
      - name: Integration Tests
        run: cd backend && npm run test:integration
      - name: E2E Tests
        run: npm run test:e2e
      - name: Upload Coverage
        uses: codecov/codecov-action@v2
```

### Pre-Deployment Testing

**Staging Deployment**:
1. Deploy to staging environment
2. Run automated smoke tests
3. Execute manual test scenarios
4. Verify critical user flows
5. Check database migrations
6. Validate external integrations (OAuth, email)

**Production Deployment**:
1. Automated tests pass in CI/CD
2. Manual QA approval on staging
3. Deploy to production
4. Run production smoke tests
5. Monitor error rates and performance

## Test Scenarios

### Smoke Tests (Critical Paths)

Quick tests to verify basic functionality:

- ✅ Application loads
- ✅ User can log in
- ✅ Dashboard renders
- ✅ Can create a project
- ✅ Can create a task
- ✅ API health check passes

**Execution Time**: < 5 minutes

### Regression Tests

Full test suite to catch regressions:

- All unit tests
- All integration tests
- All E2E tests
- Manual exploratory testing

**Execution Time**: 30-45 minutes

### Performance Tests (Planned)

Load and stress testing:

- API response times under load
- Database query performance
- Frontend rendering performance
- Concurrent user capacity

**Tools**: Artillery, k6, Lighthouse

## Manual Testing

### Exploratory Testing

**Frequency**: Before each release

**Areas to Explore**:
- New features (deep testing)
- Edge cases not covered by automated tests
- UI/UX issues
- Cross-browser compatibility
- Mobile responsiveness

### User Acceptance Testing (UAT)

**Participants**: Product managers, stakeholders

**Focus**:
- Verify features meet requirements
- Validate user experience
- Confirm acceptance criteria

### Browser Compatibility

**Supported Browsers**:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

**Mobile Browsers**:
- iOS Safari (latest)
- Android Chrome (latest)

## Bug Tracking & Reporting

### Bug Severity Levels

| Severity | Description | Response Time | Example |
|----------|-------------|---------------|---------|
| **Critical** | System down, data loss, security breach | Immediate | Authentication broken, database corruption |
| **High** | Major feature broken, affects many users | 24 hours | Sprint planning not working, tasks not saving |
| **Medium** | Feature partially broken, workaround exists | 1 week | UI glitch, minor calculation error |
| **Low** | Cosmetic issue, minor inconvenience | 2 weeks | Typo, alignment issue |

### Bug Report Template

```markdown
### Bug Description
Clear description of the issue

### Steps to Reproduce
1. Go to...
2. Click on...
3. Observe...

### Expected Behavior
What should happen

### Actual Behavior
What actually happens

### Environment
- Browser: Chrome 120
- OS: macOS 14.1
- User: admin@example.com
- Organization: Test Org

### Screenshots
[Attach screenshots]

### Console Errors
[Paste console errors]

### Severity
Critical / High / Medium / Low
```

## Quality Metrics

### Test Metrics to Track

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Test Pass Rate** | > 95% | Passed tests / Total tests |
| **Code Coverage** | > 75% | Lines covered / Total lines |
| **Bug Density** | < 5 per sprint | Bugs found / Sprint |
| **Defect Escape Rate** | < 2% | Prod bugs / Total bugs |
| **Test Execution Time** | < 45 min | Full suite runtime |

### Continuous Monitoring

- **Failed Test Trends**: Track flaky tests
- **Coverage Trends**: Monitor coverage over time
- **Bug Trends**: Track bug creation/resolution rates
- **Performance Metrics**: API response times, page load times

## Testing Best Practices

### General Principles

1. **Write Tests First** (TDD): Write failing test, implement feature, test passes
2. **Independent Tests**: Tests should not depend on each other
3. **Descriptive Names**: Test names should describe what they test
4. **Arrange-Act-Assert**: Structure tests clearly
5. **One Assertion Per Test**: Focus each test on one thing
6. **Use Factories**: Generate test data with factories
7. **Mock External Services**: Don't hit real APIs in tests
8. **Clean Up**: Reset state after each test

### Code Review Checklist

- ✅ Tests cover new code
- ✅ Tests cover edge cases
- ✅ Tests are independent
- ✅ Test names are descriptive
- ✅ No hardcoded values (use constants/fixtures)
- ✅ Mocks used appropriately
- ✅ No commented-out tests
- ✅ Tests pass locally

## Risk-Based Testing

### High-Risk Areas (Priority 1)

Focus testing efforts on:

1. **Authentication & Authorization**
   - Security vulnerabilities
   - Data access control
   - OAuth flows

2. **Data Integrity**
   - Task creation/updates
   - Sprint planning
   - Organization isolation

3. **Payment Processing** (if applicable)
   - Transaction handling
   - Billing accuracy

### Medium-Risk Areas (Priority 2)

- Email notifications
- GitHub integration
- File uploads
- Search functionality

### Low-Risk Areas (Priority 3)

- UI styling
- Non-critical features
- Documentation pages

## Next Steps

- Review [Test Plans](test-plans/) for feature-specific scenarios
- Check [Test Cases](test-cases/) for detailed test procedures
- Read [Manual Testing Flows](manual-testing-flows.md) for E2E scenarios
- See [Automation Guide](automation-guide.md) for test automation setup

---

**Last Updated**: 2026-02-05
**Version**: 1.0.0

Need help? Check the [Test Plans](test-plans/) or [Test Cases](test-cases/) for specific testing guidance.
