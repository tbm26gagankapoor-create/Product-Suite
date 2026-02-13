import { query } from '../db/postgres/client.js';

async function listUsers() {
  const result = await query('SELECT email, name FROM users WHERE status = $1 LIMIT 10', ['active']);
  console.log('Available users in PostgreSQL:');
  result.rows.forEach((u: any) => console.log('  -', u.email, '(', u.name, ')'));
  process.exit(0);
}

listUsers().catch(console.error);
