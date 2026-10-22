const express = require('express');
const bcrypt = require('bcryptjs');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { db } = require('../db');
const { startSession, endSession, authenticate } = require('../auth');

const router = express.Router();

const PROFILES = {
  student: {
    table: 'student_profiles',
    fields: ['full_name', 'age', 'school', 'bio', 'interests'],
    required: ['full_name', 'age', 'school', 'bio'],
    missing: 'Name, age, location, and bio are required.',
    home: '/landing-page',
  },
  nonprofit: {
    table: 'nonprofit_profiles',
    fields: ['nonprofit_name', 'location', 'category', 'statement'],
    required: ['nonprofit_name', 'location', 'category', 'statement'],
    missing: 'Name, location, causes, and mission statement are required.',
    home: '/organization-page',
  },
};

// hasOwn keeps inherited keys such as "constructor" from passing as a user type.
const profileFor = (userType) => (Object.hasOwn(PROFILES, userType) ? PROFILES[userType] : undefined);

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

function isValidEmail(email) {
  const parts = email.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const labels = parts[1].split('.');
  return labels.length > 1 && labels[labels.length - 1].length >= 2;
}

// bcrypt ignores everything past 72 bytes, hence the upper limit.
function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 12) return 'Password must be at least 12 characters.';
  if (password.length > 70) return 'Password cannot exceed 70 characters.';
  return null;
}

function readProfile(userType, body) {
  const profile = profileFor(userType);
  const text = (field) => String(body?.[field] ?? '').trim();
  if (profile.required.some((field) => !text(field))) return { error: profile.missing };

  const age = Number(body?.age);
  if (userType === 'student' && !(Number.isInteger(age) && age >= 1 && age <= 120)) {
    return { error: 'Age must be a whole number.' };
  }
  return { values: profile.fields.map((field) => (field === 'age' ? age : text(field))) };
}

// Emails were stored as typed before this lowercasing, so lookups compare lowercase.
async function findUserByEmail(email) {
  const result = await db.execute('SELECT * FROM users WHERE lower(email) = ?', [email]);
  return result.rows[0];
}

const isUniqueViolation = (err) => String(err.code).startsWith('SQLITE_CONSTRAINT');

router.post('/signup', async (req, res) => {
  const { password, usertype, profile: profileInput } = req.body ?? {};
  const email = normalizeEmail(req.body?.email);
  const profile = profileFor(usertype);

  if (!isValidEmail(email)) return res.status(400).json({ error: 'Please provide a valid email address.' });
  const problem = passwordProblem(password);
  if (problem) return res.status(400).json({ error: problem });
  if (!profile) return res.status(400).json({ error: "Usertype must be either 'student' or 'nonprofit'." });
  const { values, error } = readProfile(usertype, profileInput);
  if (error) return res.status(400).json({ error });

  if (await findUserByEmail(email)) {
    return res.status(400).json({ error: 'That email address is already registered.' });
  }

  try {
    const [created] = await db.batch(
      [
        {
          sql: 'INSERT INTO users (email, password, user_type) VALUES (?, ?, ?)',
          args: [email, await bcrypt.hash(password, 10), usertype],
        },
        {
          sql: `INSERT INTO ${profile.table} (user_id, ${profile.fields.join(', ')})
                VALUES (last_insert_rowid(), ${profile.fields.map(() => '?').join(', ')})`,
          args: values,
        },
      ],
      'write'
    );
    startSession(res, { id: Number(created.lastInsertRowid), email, user_type: usertype });
    res.status(201).json({ userType: usertype, nextRoute: profile.home });
  } catch (err) {
    if (isUniqueViolation(err)) return res.status(400).json({ error: 'That email address is already registered.' });
    throw err;
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip)}:${normalizeEmail(req.body?.email)}`,
  message: { error: 'Too many failed attempts. Try again in 15 minutes.' },
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res) => {
  const { password } = req.body ?? {};
  const user = await findUserByEmail(normalizeEmail(req.body?.email));
  if (!user || typeof password !== 'string' || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: 'Invalid email or password.' });
  }

  const profile = profileFor(user.user_type);
  if (!profile) return res.status(400).json({ error: 'Unrecognized user type.' });

  startSession(res, user);
  res.json({ userType: user.user_type, nextRoute: profile.home });
});

router.post('/logout', (req, res) => {
  endSession(res);
  res.json({ message: 'Logged out' });
});

router.get('/session', authenticate, (req, res) => {
  res.json({ email: req.user.email });
});

router.get('/me', authenticate, async (req, res) => {
  const userResult = await db.execute('SELECT id, email, user_type FROM users WHERE id = ?', [req.user.id]);
  const user = userResult.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const profile = profileFor(user.user_type);
  if (!profile) return res.status(400).json({ error: 'Unrecognized user type.' });

  const profileResult = await db.execute(`SELECT * FROM ${profile.table} WHERE user_id = ?`, [user.id]);
  res.json({ ...user, profile: profileResult.rows[0] || null });
});

router.get('/profile', authenticate, async (req, res) => {
  const profile = profileFor(req.user.userType);
  if (!profile) return res.status(400).json({ error: 'Unrecognized user type.' });

  const result = await db.execute(`SELECT ${profile.fields.join(', ')} FROM ${profile.table} WHERE user_id = ?`, [
    req.user.id,
  ]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found.' });
  res.json(result.rows[0]);
});

// Creates the profile on first save, updates it afterwards.
router.put('/profile', authenticate, async (req, res) => {
  const profile = profileFor(req.user.userType);
  if (!profile) return res.status(400).json({ error: 'Unrecognized user type.' });
  const { values, error } = readProfile(req.user.userType, req.body);
  if (error) return res.status(400).json({ error });

  const existing = await db.execute(`SELECT id FROM ${profile.table} WHERE user_id = ?`, [req.user.id]);
  if (existing.rows.length === 0) {
    await db.execute(
      `INSERT INTO ${profile.table} (user_id, ${profile.fields.join(', ')})
       VALUES (?, ${profile.fields.map(() => '?').join(', ')})`,
      [req.user.id, ...values]
    );
  } else {
    await db.execute(
      `UPDATE ${profile.table} SET ${profile.fields.map((field) => `${field} = ?`).join(', ')} WHERE user_id = ?`,
      [...values, req.user.id]
    );
  }
  res.json({ message: 'Profile saved.' });
});

router.post('/account/update', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  const userResult = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const user = userResult.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found.' });
  if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(400).json({ error: 'Your current password is incorrect.' });
  }

  const updates = {};
  const email = normalizeEmail(req.body.email);
  if (email && email !== user.email.toLowerCase()) {
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Please provide a valid email address.' });
    const taken = await findUserByEmail(email);
    if (taken && taken.id !== user.id) return res.status(400).json({ error: 'Email already in use.' });
    updates.email = email;
  }
  if (newPassword) {
    const problem = passwordProblem(newPassword);
    if (problem) return res.status(400).json({ error: problem });
    updates.password = await bcrypt.hash(newPassword, 10);
  }

  const columns = Object.keys(updates);
  if (columns.length === 0) return res.json({ message: 'No changes to update.' });

  await db.execute(`UPDATE users SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE id = ?`, [
    ...Object.values(updates),
    user.id,
  ]);
  startSession(res, { ...user, ...updates });
  res.json({ message: 'Account updated successfully.' });
});

module.exports = router;
