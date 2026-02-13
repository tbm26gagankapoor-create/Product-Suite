import { query } from '../db/postgres/client.js';

async function checkSchema() {
  const result = await query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_name = 'admin_audit_log'
     ORDER BY ordinal_position`
  );

  console.log('admin_audit_log columns:');
  result.rows.forEach((r: any) => console.log(`  - ${r.column_name}: ${r.data_type}`));
}

checkSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
