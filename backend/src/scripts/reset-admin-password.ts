import { query } from '../db/postgres/client.js';
import bcrypt from 'bcryptjs';

async function resetAdminPassword() {
  const email = 'admin@infinia.app';
  const password = 'admin123';

  console.log(`🔑 Resetting admin password for ${email}...`);

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);
  console.log('Password hashed');

  // Update password
  const result = await query(
    'UPDATE admin_users SET password_hash = $1 WHERE email = $2 RETURNING email, role',
    [passwordHash, email]
  );

  if (result.rows.length > 0) {
    console.log(`✅ Password reset successfully`);
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Role: ${result.rows[0].role}`);
    console.log(`   Password: ${password}`);
  } else {
    console.log(`❌ Admin user not found`);
  }
}

resetAdminPassword()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
