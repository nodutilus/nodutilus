/** @module {Schema} @ndk/pg/connect */
'use strict';
const ndk_cfg = require('@ndk/cfg');
const { Pool, Client } = require('pg');
const pool = new Pool({
  host: ndk_cfg.pg_host || ndk_cfg.PGHOST,
  port: ndk_cfg.pg_port || ndk_cfg.PGPORT,
  database: ndk_cfg.pg_database || ndk_cfg.PGDATABASE,
  user: ndk_cfg.pg_user || ndk_cfg.PGUSER,
  password: ndk_cfg.pg_password || ndk_cfg.PGPASSWORD
});

module.exports.connect = pool.connect.bind(pool);
module.exports.query = pool.query.bind(pool);
module.exports.pool = pool;
module.exports.resolveclient = resolveclient;
module.exports.transaction = transaction;

async function resolveclient(client, ...args) {
  const handler = args.pop();
  let result, need_release = false;
  if (!(client instanceof Client)) {
    need_release = true;
    client = await pool.connect();
  }
  try {
    result = await handler(client, ...args);
  } catch (err) {
    throw err;
  } finally {
    if (need_release) {
      client.release();
    }
  }
  return result;
}

async function transaction(client, ...args) {
  const handler = args.pop();
  return await resolveclient(client, async(client) => {
    try {
      await client.query('BEGIN');
      await handler(client, ...args);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
}
