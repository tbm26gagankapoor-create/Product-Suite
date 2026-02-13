console.log('Script started');

import { query } from '../db/postgres/client.js';

async function test() {
  console.log('Test function called');

  try {
    const result = await query('SELECT NOW()');
    console.log('Query result:', result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
  }
}

test().then(() => {
  console.log('Test complete');
  process.exit(0);
});
