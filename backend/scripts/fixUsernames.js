// scripts/fixUsernames.js
import pool from '../config/db.js';

function cleanUsername(raw) {
  return raw.toLowerCase().replace(/\s+/g, ''); // lowercase + remove spaces
}

(async () => {
  try {
    const [rows] = await pool.query('SELECT id, username FROM users');
    for (const row of rows) {
      const cleaned = cleanUsername(row.username);
      if (cleaned !== row.username) {
        console.log(`Fixing user ${row.id}: "${row.username}" -> "${cleaned}"`);

        // check if cleaned username already exists
        const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [cleaned]);
        if (existing.length) {
          console.warn(`⚠️ Skipped user ${row.id} because "${cleaned}" already exists`);
          continue;
        }

        await pool.query('UPDATE users SET username = ? WHERE id = ?', [cleaned, row.id]);
      }
    }
    console.log('✅ Username cleanup finished.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
