import { query } from '../db/postgres/client.js';

async function checkTables() {
  const result = await query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
     ORDER BY table_name`
  );

  console.log(`PostgreSQL tables (${result.rows.length}):`);
  result.rows.forEach((r: any) => console.log(`  - ${r.table_name}`));
}

checkTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
