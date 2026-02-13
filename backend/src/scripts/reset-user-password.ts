import { query } from '../db/postgres/client.js';
import bcrypt from 'bcryptjs';

/**
 * Reset password for gagan.kapoor@netgroup.ai to test123
 */

async function resetPassword() {
  const email = 'gagan.kapoor@netgroup.ai';
  const newPassword = 'test123';

  try {
    console.log(`🔑 Resetting password for ${email}...`);

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    const result = await query(
      `UPDATE users
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE email = $2 AND status = 'active'
       RETURNING id, email, name`,
      [passwordHash, email]
    );

    if (result.rows.length === 0) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    const user = result.rows[0];
    console.log(`✅ Password reset successfully!`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   User ID: ${user.id}`);

  } catch (error: any) {
    console.error(`❌ Error resetting password:`, error.message);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  resetPassword()
    .then(() => {
      console.log('\n✅ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Failed:', error);
      process.exit(1);
    });
}
