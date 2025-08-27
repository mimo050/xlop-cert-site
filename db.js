// db.js — PostgreSQL wrapper يحاكي أسلوب sqlite3 (run/get/all)
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[DB] DATABASE_URL مفقود. ضِفّه في Variables على Railway.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  // Railway يوفّر SSL غالبًا؛ نخفّف التحقق الصارم
  ssl: { rejectUnauthorized: false }
});

// helpers لتوحيد الباراميترز (sqlite كان يسمح بمصفوفة، هنا كذلك)
function paramsArray(params) {
  if (params === undefined || params === null) return [];
  if (Array.isArray(params)) return params;
  return [params];
}

// بدائل run/get/all بأسلوب callbacks
function run(sql, params, cb) {
  const arr = paramsArray(params);
  pool.query(sql, arr)
    .then(res => cb && cb(null, res))
    .catch(err => cb && cb(err));
}

function get(sql, params, cb) {
  const arr = paramsArray(params);
  pool.query(sql, arr)
    .then(res => cb && cb(null, res.rows[0] || null))
    .catch(err => cb && cb(err));
}

function all(sql, params, cb) {
  const arr = paramsArray(params);
  pool.query(sql, arr)
    .then(res => cb && cb(null, res.rows))
    .catch(err => cb && cb(err));
}

// نسخة Promise مفيدة لبعض المواضع
async function query(sql, params) {
  const arr = paramsArray(params);
  const res = await pool.query(sql, arr);
  return res.rows;
}

module.exports = { run, get, all, query, pool };
