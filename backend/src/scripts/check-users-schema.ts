import { query } from '../db/postgres/client.js';

async function checkSchema() {
  const result = await query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_name = 'users'
     ORDER BY ordinal_position`
  );

  console.log('Users table columns:');
  result.rows.forEach((r: any) => console.log(`  - ${r.column_name}: ${r.data_type}`));
}

checkSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
