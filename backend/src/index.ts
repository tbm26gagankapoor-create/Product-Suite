import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { config } from './config/index.js';
import { connectDB, disconnectDB } from './lib/mongodb.js';
import routes from './routes/index.js';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));

// Response compression (gzip) - significant speed improvement for larger responses
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress responses with no-transform cache-control header
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// Rate limiting - protect against abuse
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // Default: 15 minutes
  max: config.rateLimit.maxRequests, // Default: 100 requests per window
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable deprecated X-RateLimit headers
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
    },
  },
  skip: (req) => {
    // Skip rate limiting for health checks and auth routes in development
    if (config.isDev) {
      return req.path.startsWith('/api/v1/health') ||
             req.path.startsWith('/api/v1/auth') ||
             req.path.startsWith('/api/v1/oauth');
    }
    return req.path.startsWith('/api/v1/health');
  },
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Request timing middleware for performance monitoring
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Log slow requests (> 1000ms) as warnings
    if (duration > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  next();
});

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

// Start server function
async function startServer() {
  // Connect to MongoDB with retry
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await connectDB();
      console.log('✅ MongoDB connected');
      break;
    } catch (error) {
      if (attempt === maxRetries) {
        console.error('❌ Failed to connect to MongoDB after', maxRetries, 'attempts:', error);
        console.log('💡 Make sure MongoDB is running or MONGODB_URI is set correctly');
        process.exit(1);
      }
      console.log(`⏳ MongoDB connection attempt ${attempt}/${maxRetries} failed, retrying in 5s...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Start Express server - Listen on 0.0.0.0 for network access
  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`
====================================
  INFINIA PRODUCTS API SERVER
====================================
  Local:   http://localhost:${config.port}
  Network: http://0.0.0.0:${config.port}
  API:     http://localhost:${config.port}/api/v1
  Health:  http://localhost:${config.port}/api/v1/health
  Database: MongoDB (${config.database.name})
  Environment: ${config.nodeEnv}
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
  const gracefulShutdown = async (signal: string) => {
    console.log(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await disconnectDB();
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

// Start the server
startServer();

export default app;
