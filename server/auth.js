const jwt = require('jsonwebtoken');
const { db } = require('./db');

const SESSION_DAYS = 7;
const COOKIE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

function startSession(res, user) {
  const token = jwt.sign({ id: user.id, email: user.email, userType: user.user_type }, process.env.JWTSECRET, {
    expiresIn: `${SESSION_DAYS}d`,
  });
  res.cookie('token', token, { ...COOKIE, maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000 });
}

const endSession = (res) => res.clearCookie('token', COOKIE);

function authenticate(req, res, next) {
  try {
    req.user = jwt.verify(req.cookies.token, process.env.JWTSECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Please log in.' });
  }
}

const requireRole = (userType) => (req, res, next) =>
  req.user.userType === userType
    ? next()
    : res.status(403).json({ error: `Only ${userType} accounts can do that.` });

const requireOwnEvent = (param) => async (req, res, next) => {
  const result = await db.execute('SELECT * FROM opportunities WHERE id = ?', [req.params[param]]);
  const event = result.rows[0];
  if (!event) return res.status(404).json({ error: 'Opportunity not found.' });
  if (event.user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only manage your own opportunities.' });
  }
  req.event = event;
  next();
};

module.exports = { startSession, endSession, authenticate, requireRole, requireOwnEvent };
