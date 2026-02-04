import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',
  isProd: process.env.NODE_ENV === 'production',

  database: {
    path: process.env.DATABASE_PATH || path.join(__dirname, '../../data/infinia.db'),
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'infinia-dev-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Microsoft OAuth Configuration
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
    redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/microsoft/callback',
    scopes: ['openid', 'profile', 'email', 'User.Read'],
  },

  // Google OAuth Configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/google/callback',
    scopes: ['openid', 'profile', 'email'],
  },

  // GitHub OAuth Configuration (for repository integration)
  // App owned by: @tbm26gagankapoor-create | App ID: 2787348
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || 'Iv23likKwxpNvstXyFyK',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '36e5355722e6cf55876dd94ab063db3513607eae',
    redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3001/api/v1/auth/github/callback',
    scopes: ['repo', 'read:user', 'user:email'],
  },

  // Encryption Configuration (for storing sensitive tokens)
  encryption: {
    key: process.env.ENCRYPTION_KEY || '',
  },

  // Frontend URL (for OAuth redirects)
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },

  // Gmail SMTP Configuration (legacy - kept for fallback)
  gmail: {
    user: process.env.GMAIL_USER || '',
    appPassword: process.env.GMAIL_APP_PASSWORD || '',
  },

  // Resend Email Configuration
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.RESEND_FROM_EMAIL || 'noreply@infinia.app',
    fromName: process.env.RESEND_FROM_NAME || 'Infinia',
    replyTo: process.env.RESEND_REPLY_TO || '',
  },
} as const;

export type Config = typeof config;
