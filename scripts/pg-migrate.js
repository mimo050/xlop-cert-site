const fs = require('fs');
require('dotenv').config();
const { pool } = require('../db');

(async () => {
  try {
    const sql = fs.readFileSync('schema.pg.sql', 'utf8');
    await pool.query(sql);
    console.log('Postgres migration: OK');
  } catch (e) {
    console.error('Migration error:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
