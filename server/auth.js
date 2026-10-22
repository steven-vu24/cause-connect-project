const jwt = require('jsonwebtoken');
const { db } = require('./db');

const signToken = (user) =>
  jwt.sign({ email: user.email, userType: user.user_type, id: user.id }, process.env.JWTSECRET, {
    expiresIn: '1h',
  });

// The Netlify client sends the token as a Bearer header because Safari drops
// the cross-site cookie; the cookie remains as a fallback for other browsers.
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  const token = (header && header.split(' ')[1]) || req.cookies.token;
  if (!token) return res.status(403).json({ error: 'Authentication required.' });

  jwt.verify(token, process.env.JWTSECRET, (err, payload) => {
    if (err) return res.status(403).json({ error: 'Invalid token.' });
    req.user = payload;
    next();
  });
}

const requireOwnEvent = (param) => async (req, res, next) => {
  try {
    const result = await db.execute('SELECT * FROM opportunities WHERE id = ?', [req.params[param]]);
    const event = result.rows[0];
    if (!event) return res.status(404).json({ error: 'Opportunity not found.' });
    if (event.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only manage your own opportunities.' });
    }
    req.event = event;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { signToken, authenticate, requireOwnEvent };
