import { query } from '../db/postgres/client.js';

async function checkAdminUsers() {
  const result = await query('SELECT email, role, is_active FROM admin_users');
  console.log(`Admin users in database: ${result.rows.length}`);
  result.rows.forEach((u: any) => console.log(`  - ${u.email} (${u.role}) - Active: ${u.is_active}`));
}

checkAdminUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
