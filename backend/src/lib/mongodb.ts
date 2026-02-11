import mongoose from 'mongoose';
import { config } from '../config/index.js';

// Build MongoDB connection URI with environment-specific database name
function buildMongoUri(): string {
  const baseUri = config.database.mongoUri;
  const dbName = config.database.name;

  // If URI already contains a database name (after the last /), replace it
  // This handles both local and Atlas URIs
  const uriWithoutDb = baseUri.replace(/\/[^/?]+(\?|$)/, '/$1');

  // Check if there are query parameters
  if (uriWithoutDb.includes('?')) {
    return uriWithoutDb.replace('?', `${dbName}?`);
  }

  // Remove trailing slash if present and add database name
  return `${uriWithoutDb.replace(/\/$/, '')}/${dbName}`;
}

const MONGODB_URI = buildMongoUri();

let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
let keepaliveInterval: ReturnType<typeof setInterval> | null = null;

export async function connectDB(): Promise<void> {
  if (isConnected) {
    console.log('MongoDB already connected');
    return;
  }

  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(MONGODB_URI, {
      // Server selection: how long to try finding a suitable server
      serverSelectionTimeoutMS: 30000,
      // Socket timeout: how long a send/receive on a socket can take
      socketTimeoutMS: 45000,
      // Heartbeat: check server status frequently to detect issues early
      heartbeatFrequencyMS: 10000,
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 2,
      // Max time a connection can be idle before being removed
      maxIdleTimeMS: 60000,
      // Wait queue timeout: how long to wait for a connection from the pool
      waitQueueTimeoutMS: 15000,
      // Connection timeout for initial connection
      connectTimeoutMS: 30000,
      // Retry reads/writes on transient errors
      retryReads: true,
      retryWrites: true,
    });

    isConnected = true;
    reconnectAttempts = 0;
    console.log(`Connected to MongoDB (database: ${config.database.name}, env: ${config.nodeEnv})`);

    // Warm up the connection pool by running a simple query
    try {
      await mongoose.connection.db?.admin().ping();
      console.log('MongoDB connection pool warmed up');
    } catch {
      // Non-fatal: pool will warm up on first real query
    }

    // Keepalive: ping MongoDB every 30s to prevent idle connection drops
    if (keepaliveInterval) clearInterval(keepaliveInterval);
    keepaliveInterval = setInterval(async () => {
      try {
        if (mongoose.connection.readyState === 1) {
          await mongoose.connection.db?.admin().ping();
        }
      } catch {
        // Ping failure is handled by mongoose's built-in reconnection
      }
    }, 30000);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message || err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
      attemptReconnect();
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
      isConnected = true;
      reconnectAttempts = 0;
    });

  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

async function attemptReconnect(): Promise<void> {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`MongoDB: Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts`);
    return;
  }

  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
  console.log(`MongoDB: Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms...`);

  setTimeout(async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGODB_URI);
        isConnected = true;
        reconnectAttempts = 0;
        console.log('MongoDB: Reconnected successfully');
      }
    } catch (err: any) {
      console.error('MongoDB: Reconnect failed:', err.message || err);
      attemptReconnect();
    }
  }, delay);
}

export async function disconnectDB(): Promise<void> {
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
    keepaliveInterval = null;
  }
  if (!isConnected) return;

  await mongoose.disconnect();
  isConnected = false;
  console.log('Disconnected from MongoDB');
}

export function getConnectionStatus(): boolean {
  return isConnected;
}

export default mongoose;
