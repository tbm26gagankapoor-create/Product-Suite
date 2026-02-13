import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config/index.js';
import routes from './routes/index.js';
import { initializeDatabases, closeDatabases, checkDatabaseHealth } from './db/index.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// API routes
app.use('/api/v1', routes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(config.isDev && { stack: err.stack }),
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Initialize databases and start server
async function startServer() {
  // Initialize database connections
  const dbStatus = await initializeDatabases();
  console.log('[Server] Database status:', dbStatus);

  const server = app.listen(config.port, () => {
    console.log(`
====================================
  INFINIA PRODUCTS API SERVER
====================================
  URL: http://localhost:${config.port}
  API: http://localhost:${config.port}/api/v1
  Health: http://localhost:${config.port}/api/v1/health
  Environment: ${config.nodeEnv}

  Databases:
  - PostgreSQL: ${dbStatus.postgres ? 'Connected' : 'Disconnected'}
  - MongoDB: ${dbStatus.mongo ? 'Connected' : 'Disconnected'}
====================================

Available endpoints:
  GET    /api/v1/health

  Users:
  GET    /api/v1/users
  GET    /api/v1/users/:id
  POST   /api/v1/users
  PATCH  /api/v1/users/:id
  DELETE /api/v1/users/:id

  Projects:
  GET    /api/v1/projects
  GET    /api/v1/projects/:id
  POST   /api/v1/projects
  PATCH  /api/v1/projects/:id
  DELETE /api/v1/projects/:id
  GET    /api/v1/projects/:id/members
  POST   /api/v1/projects/:id/members
  DELETE /api/v1/projects/:id/members/:userId

  Sprints:
  GET    /api/v1/sprints?project_id=xxx
  GET    /api/v1/sprints/:id
  POST   /api/v1/sprints
  PATCH  /api/v1/sprints/:id
  POST   /api/v1/sprints/:id/start
  POST   /api/v1/sprints/:id/complete
  DELETE /api/v1/sprints/:id

  Tasks:
  GET    /api/v1/tasks?project_id=xxx&sprint_id=xxx
  GET    /api/v1/tasks/:id
  POST   /api/v1/tasks
  PATCH  /api/v1/tasks/:id
  POST   /api/v1/tasks/:id/move
  POST   /api/v1/tasks/:id/sprint
  DELETE /api/v1/tasks/:id

  Subtasks:
  GET    /api/v1/tasks/:id/subtasks
  POST   /api/v1/tasks/:id/subtasks
  PATCH  /api/v1/tasks/:taskId/subtasks/:subtaskId
  DELETE /api/v1/tasks/:taskId/subtasks/:subtaskId

  Tags:
  GET    /api/v1/tags?project_id=xxx
  GET    /api/v1/tags/:id
  POST   /api/v1/tags
  PATCH  /api/v1/tags/:id
  DELETE /api/v1/tags/:id

  Columns:
  GET    /api/v1/columns?project_id=xxx
  GET    /api/v1/columns/:id
  POST   /api/v1/columns
  PATCH  /api/v1/columns/:id
  POST   /api/v1/columns/reorder
  DELETE /api/v1/columns/:id

  Comments:
  GET    /api/v1/comments/task/:taskId
  GET    /api/v1/comments/:id
  POST   /api/v1/comments
  PATCH  /api/v1/comments/:id
  DELETE /api/v1/comments/:id
  `);
});

// Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await closeDatabases();
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
