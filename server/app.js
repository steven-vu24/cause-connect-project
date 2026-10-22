const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { db } = require('./db');

const app = express();
const clientBuild = path.join(__dirname, '../client/build');

// Render terminates TLS in front of the app; trusting one hop gives req.ip the
// client's address, which the login rate limit keys on.
app.set('trust proxy', 1);
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' });
  next();
});
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', async (req, res) => {
  await db.execute('SELECT 1');
  res.json({ ok: true });
});
app.use('/api', require('./routes/account'));
app.use('/api', require('./routes/opportunities'));
app.use('/api', require('./routes/signups'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// In production the API also serves the built client, so the browser sees one
// origin: no CORS, and the session cookie stays first-party in every browser.
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('/{*path}', (req, res) => res.sendFile('index.html', { root: clientBuild }));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = app;
