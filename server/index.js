require('dotenv').config();
const app = require('./app');
const { applySchema } = require('./db');

const PORT = process.env.PORT || 5001;

applySchema()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((err) => {
    console.error('Could not apply the database schema:', err);
    process.exit(1);
  });
