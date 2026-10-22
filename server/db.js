const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

// Without TURSO_DATABASE_URL the server uses a local SQLite file, so local
// development never touches the production database.
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, 'local.db')}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const applySchema = () => db.executeMultiple(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

module.exports = { db, applySchema };
