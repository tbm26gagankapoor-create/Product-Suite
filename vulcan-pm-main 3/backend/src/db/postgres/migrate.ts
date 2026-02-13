import { spawn } from 'child_process';
import { config } from '../../config/index.js';

/**
 * Run all pending migrations using node-pg-migrate CLI
 */
export async function runMigrations(): Promise<void> {
  console.log('[PostgreSQL] Running migrations...');

  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      DATABASE_URL: config.postgres.url,
    };

    const migrate = spawn('node', ['node_modules/node-pg-migrate/bin/node-pg-migrate.js', 'up', '--no-lock'], {
      env,
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    migrate.stdout.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) {
        console.log(`[PostgreSQL] ${msg}`);
        stdout += msg + '\n';
      }
    });

    migrate.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) {
        console.error(`[PostgreSQL] ${msg}`);
        stderr += msg + '\n';
      }
    });

    migrate.on('close', (code) => {
      if (code === 0) {
        console.log('[PostgreSQL] Migrations complete');
        resolve();
      } else {
        reject(new Error(`Migration failed with code ${code}: ${stderr}`));
      }
    });

    migrate.on('error', (err) => {
      reject(err);
    });
  });
}

export default { runMigrations };
