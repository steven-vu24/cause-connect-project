const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { signToken, authenticate } = require('../auth');

const router = express.Router();

const PROFILES = {
  student: {
    table: 'student_profiles',
    fields: ['full_name', 'age', 'school', 'bio', 'interests'],
    required: ['full_name', 'age', 'school', 'bio'],
    missing: 'Full name, age, school, and bio are required for student profile.',
    saved: 'Student profile updated successfully.',
    home: '/landing-page',
  },
  nonprofit: {
    table: 'nonprofit_profiles',
    fields: ['nonprofit_name', 'location', 'category', 'statement'],
    required: ['nonprofit_name', 'location', 'category', 'statement'],
    missing: 'All fields are required for nonprofit profile.',
    saved: 'Nonprofit profile updated successfully.',
    home: '/organization-page',
  },
};

// hasOwn keeps inherited keys such as "constructor" from passing as a user type.
const profileFor = (userType) => (Object.hasOwn(PROFILES, userType) ? PROFILES[userType] : undefined);

function isValidEmail(email) {
  const parts = email.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const labels = parts[1].split('.');
  return labels.length > 1 && labels[labels.length - 1].length >= 2;
}

router.post('/signup', async (req, res) => {
  const { email, password, usertype } = req.body;

  if (!email) return res.status(400).send('You must provide an email address.');
  if (!isValidEmail(email)) return res.status(400).send('Please provide a valid email address.');
  if (!password) return res.status(400).send('You must provide a password.');
  if (password.length < 12) return res.status(400).send('Password must be at least 12 characters.');
  if (password.length > 70) return res.status(400).send('Password cannot exceed 70 characters.');
  if (!profileFor(usertype)) {
    return res.status(400).send("Usertype must be either 'student' or 'nonprofit'.");
  }

  try {
    const existing = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.rows.length > 0) return res.status(400).send('That email address is already registered.');

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute('INSERT INTO users (email, password, user_type) VALUES (?, ?, ?)', [
      email,
      hashedPassword,
      usertype,
    ]);
    res.status(201).send('User created');
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).send('Error creating user');
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('Email and password are required');

  try {
    const result = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).send('Invalid credentials');
    }

    const profile = profileFor(user.user_type);
    if (!profile) return res.status(400).send('Unrecognized user type');

    const token = signToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 60 * 60 * 1000,
      path: '/',
    });
    res.json({ success: true, userType: user.user_type, nextRoute: profile.home, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Error logging in');
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out' });
});

router.get('/session', authenticate, (req, res) => {
  res.json({ email: req.user.email });
});

router.get('/me', authenticate, async (req, res) => {
  const { id, userType } = req.user;

  try {
    const userResult = await db.execute('SELECT id, email, user_type FROM users WHERE id = ?', [id]);
    if (userResult.rows.length === 0) return res.status(404).send('User not found');

    const profile = profileFor(userType);
    if (!profile) return res.status(400).send('Unrecognized user type');

    const profileResult = await db.execute(`SELECT * FROM ${profile.table} WHERE user_id = ?`, [id]);
    res.json({ ...userResult.rows[0], profile: profileResult.rows[0] || null });
  } catch (err) {
    console.error('Error in /api/me:', err);
    res.status(500).send('Server error');
  }
});

router.get('/profile', authenticate, async (req, res) => {
  const profile = profileFor(req.user.userType);
  if (!profile) return res.status(400).json({ error: 'Invalid userType.' });

  try {
    const result = await db.execute(
      `SELECT ${profile.fields.join(', ')} FROM ${profile.table} WHERE user_id = ?`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Profile not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Database error.' });
  }
});

// Creates the profile on first save, updates it afterwards.
router.put('/profile', authenticate, async (req, res) => {
  const profile = profileFor(req.user.userType);
  if (!profile) return res.status(400).json({ error: 'Invalid userType.' });
  if (profile.required.some((field) => !req.body[field])) {
    return res.status(400).json({ error: profile.missing });
  }

  const values = profile.fields.map((field) => req.body[field] || '');
  try {
    const existing = await db.execute(`SELECT id FROM ${profile.table} WHERE user_id = ?`, [req.user.id]);
    if (existing.rows.length === 0) {
      await db.execute(
        `INSERT INTO ${profile.table} (user_id, ${profile.fields.join(', ')}) VALUES (?, ${profile.fields
          .map(() => '?')
          .join(', ')})`,
        [req.user.id, ...values]
      );
    } else {
      await db.execute(
        `UPDATE ${profile.table} SET ${profile.fields.map((field) => `${field} = ?`).join(', ')} WHERE user_id = ?`,
        [...values, req.user.id]
      );
    }
    res.json({ message: profile.saved });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Database error.' });
  }
});

router.post('/account/update', authenticate, async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  const { id } = req.user;

  try {
    const userResult = await db.execute('SELECT email, password FROM users WHERE id = ?', [id]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const updates = {};
    if (email && email !== user.email) {
      const taken = await db.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (taken.rows.length > 0) return res.status(400).json({ error: 'Email already in use.' });
      updates.email = email;
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password.' });
      }
      if (!(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      }
      updates.password = await bcrypt.hash(newPassword, 10);
    }

    const columns = Object.keys(updates);
    if (columns.length === 0) return res.json({ message: 'No changes to update.' });

    await db.execute(`UPDATE users SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE id = ?`, [
      ...Object.values(updates),
      id,
    ]);
    res.json({ message: 'Account updated successfully.' });
  } catch (err) {
    console.error('Error updating account:', err);
    res.status(500).json({ error: 'Database error.' });
  }
});

module.exports = router;
