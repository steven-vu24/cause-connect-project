require('dotenv').config();

const required = process.env.NODE_ENV === 'production' ? ['JWTSECRET', 'TURSO_DATABASE_URL'] : ['JWTSECRET'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = require('./app');
const { applySchema } = require('./db');

const PORT = process.env.PORT || 5001;

applySchema()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((err) => {
    console.error('Could not apply the database schema:', err);
    process.exit(1);
  });
