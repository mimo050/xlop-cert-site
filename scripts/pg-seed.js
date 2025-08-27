const fs = require('fs');
require('dotenv').config();
const { pool } = require('../db');

(async () => {
  try {
    const sql = fs.readFileSync('seed.pg.sql', 'utf8');
    await pool.query(sql);
    console.log('Postgres seed: OK');
  } catch (e) {
    console.error('Seed error:', e);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
