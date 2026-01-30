import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/infinia.db');

console.log('Resetting database...');

// Delete existing database
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('Deleted existing database');
}

// Delete WAL files if they exist
const walPath = DB_PATH + '-wal';
const shmPath = DB_PATH + '-shm';
if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

// Run init and seed
console.log('Running init...');
execSync('npm run db:init', { stdio: 'inherit', cwd: path.join(__dirname, '../..') });

console.log('Running seed...');
execSync('npm run db:seed', { stdio: 'inherit', cwd: path.join(__dirname, '../..') });

console.log('Database reset complete!');
