console.log('Starting password update script...');

import { query } from '../db/postgres/client.js';

async function setPassword() {
  console.log('1. Importing bcrypt...');
  const bcrypt = await import('bcryptjs');
  console.log('2. bcrypt imported');

  const email = 'gagan.kapoor@netgroup.ai';
  const password = 'test123';

  console.log(`3. Hashing password for ${email}...`);
  const passwordHash = await bcrypt.default.hash(password, 10);
  console.log('4. Password hashed:', passwordHash.substring(0, 20) + '...');

  console.log('5. Updating database...');
  const result = await query(
    'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email',
    [passwordHash, email]
  );

  console.log('6. Update result:', result.rows);

  if (result.rows.length > 0) {
    console.log(`\n✅ Password updated successfully for ${email}`);
    console.log(`   New password: ${password}`);
  } else {
    console.log(`\n❌ User not found: ${email}`);
  }
}

setPassword()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
