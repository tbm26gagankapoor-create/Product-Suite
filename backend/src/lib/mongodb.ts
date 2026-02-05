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

export async function connectDB(): Promise<void> {
  if (isConnected) {
    console.log('MongoDB already connected');
    return;
  }

  try {
    mongoose.set('strictQuery', true);

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    console.log(`Connected to MongoDB (database: ${config.database.name}, env: ${config.nodeEnv})`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
      isConnected = false;
    });

  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (!isConnected) return;

  await mongoose.disconnect();
  isConnected = false;
  console.log('Disconnected from MongoDB');
}

export function getConnectionStatus(): boolean {
  return isConnected;
}

export default mongoose;
