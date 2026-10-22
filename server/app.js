const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const app = express();

app.set('trust proxy', 1);
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'https://causeconnectus.netlify.app',
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => res.send('API is running'));
app.use('/api', require('./routes/account'));
app.use('/api', require('./routes/opportunities'));
app.use('/api', require('./routes/signups'));

if (process.env.NODE_ENV === 'production') {
  const build = path.join(__dirname, '../client/build');
  app.use(express.static(build));
  app.get('*', (req, res) => res.sendFile(path.join(build, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

module.exports = app;
