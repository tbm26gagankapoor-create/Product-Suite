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

  // Legacy JSON database (for fallback)
  database: {
    path: process.env.DATABASE_PATH || path.join(__dirname, '../../data/infinia.db'),
  },

  // PostgreSQL (Users, Tenants, Plans, SSO, Auth)
  postgres: {
    url: process.env.DATABASE_URL || 'postgresql://infinia:infinia@localhost:5432/infinia',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'infinia',
    password: process.env.POSTGRES_PASSWORD || 'infinia',
    database: process.env.POSTGRES_DB || 'infinia',
  },

  // MongoDB (Projects, Tasks, Sprints, Comments, etc.)
  mongo: {
    url: process.env.MONGODB_URI || 'mongodb://infinia:infinia@localhost:27017/infinia?authSource=admin',
    host: process.env.MONGO_HOST || 'localhost',
    port: parseInt(process.env.MONGO_PORT || '27017', 10),
    dbName: process.env.MONGO_DB || 'infinia',
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

  // Microsoft Entra ID (Multi-Tenant SSO for Users)
  entra: {
    clientId: process.env.ENTRA_CLIENT_ID || '',
    clientSecret: process.env.ENTRA_CLIENT_SECRET || '',
    tenantId: process.env.ENTRA_TENANT_ID || 'common', // 'common' for multi-tenant
    redirectUri: process.env.ENTRA_REDIRECT_URI || 'http://localhost:5173/auth/callback',
    // OIDC endpoints (using 'common' for multi-tenant)
    authority: `https://login.microsoftonline.com/${process.env.ENTRA_TENANT_ID || 'common'}`,
    get authorizationEndpoint() {
      return `${this.authority}/oauth2/v2.0/authorize`;
    },
    get tokenEndpoint() {
      return `${this.authority}/oauth2/v2.0/token`;
    },
    scopes: ['openid', 'profile', 'email', 'User.Read', 'Directory.Read.All'],
  },

  // Microsoft Entra ID (Admin Portal SSO)
  entraAdmin: {
    clientId: process.env.ENTRA_ADMIN_CLIENT_ID || '',
    clientSecret: process.env.ENTRA_ADMIN_CLIENT_SECRET || '',
    tenantId: process.env.ENTRA_ADMIN_TENANT_ID || 'common',
    redirectUri: process.env.ENTRA_ADMIN_REDIRECT_URI || 'http://localhost:8084/auth/callback',
    groupId: process.env.ENTRA_ADMIN_GROUP_ID || '', // Required: Entra ID group for admin access
    allowedDomains: (process.env.ENTRA_ADMIN_ALLOWED_DOMAINS || '').split(',').filter(Boolean),
    get authority() {
      return `https://login.microsoftonline.com/${this.tenantId}`;
    },
    get authorizationEndpoint() {
      return `${this.authority}/oauth2/v2.0/authorize`;
    },
    get tokenEndpoint() {
      return `${this.authority}/oauth2/v2.0/token`;
    },
    scopes: ['openid', 'profile', 'email', 'User.Read', 'GroupMember.Read.All'],
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:8084',

  // OpenFGA (Fine-Grained Authorization)
  openfga: {
    apiUrl: process.env.OPENFGA_API_URL || 'http://localhost:8082',
    storeId: process.env.OPENFGA_STORE_ID || '',
    modelId: process.env.OPENFGA_MODEL_ID || '',
  },
} as const;

export type Config = typeof config;
