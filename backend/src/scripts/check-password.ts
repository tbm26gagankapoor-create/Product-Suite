import { query } from '../db/postgres/client.js';
import bcrypt from 'bcryptjs';

async function checkPassword() {
  const email = 'gagan.kapoor@netgroup.ai';
  const testPassword = 'test123';

  try {
    console.log(`Checking password for ${email}...`);

    const result = await query(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      console.log('User not found');
      process.exit(1);
    }

    const user = result.rows[0];
    console.log('User found:', user.email);
    console.log('Hash starts with:', user.password_hash ? user.password_hash.substring(0, 10) : 'NULL');

    if (!user.password_hash) {
      console.log('\n❌ Password hash is NULL - user has no password set');
      console.log('Setting password to test123...');

      const newHash = await bcrypt.hash(testPassword, 10);
      await query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [newHash, email]
      );

      console.log('✅ Password set successfully');
      process.exit(0);
    }

    const isMatch = await bcrypt.compare(testPassword, user.password_hash);
    console.log(`\nPassword "${testPassword}" matches:`, isMatch);

    if (!isMatch) {
      console.log('\n Setting password to test123...');
      const newHash = await bcrypt.hash(testPassword, 10);
      await query(
        'UPDATE users SET password_hash = $1 WHERE email = $2',
        [newHash, email]
      );
      console.log('✅ Password updated');

      // Verify
      const verify = await query('SELECT password_hash FROM users WHERE email = $1', [email]);
      const verifyMatch = await bcrypt.compare(testPassword, verify.rows[0].password_hash);
      console.log('Verification:', verifyMatch);
    }

  } catch (error: any) {
    console.error('Error:', error.message);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkPassword()
    .then(() => {
      console.log('\n✅ Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}
