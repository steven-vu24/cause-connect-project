const express = require('express');
const { db } = require('../db');
const { authenticate, requireOwnEvent } = require('../auth');

const router = express.Router();

router.post('/events/volunteer', authenticate, async (req, res) => {
  const { opportunity_id } = req.body;
  if (!opportunity_id) return res.status(400).json({ error: 'Opportunity ID is required.' });

  try {
    const event = await db.execute('SELECT id FROM opportunities WHERE id = ?', [opportunity_id]);
    if (event.rows.length === 0) return res.status(404).json({ error: 'Opportunity not found.' });

    const existing = await db.execute(
      'SELECT id FROM volunteer_signups WHERE user_id = ? AND opportunity_id = ?',
      [req.user.id, opportunity_id]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You have already signed up for this opportunity.' });
    }

    const result = await db.execute(
      'INSERT INTO volunteer_signups (user_id, opportunity_id, signup_date) VALUES (?, ?, ?)',
      [req.user.id, opportunity_id, new Date().toISOString()]
    );
    res.status(201).json({
      message: 'Successfully signed up for the opportunity.',
      signupId: Number(result.lastInsertRowid),
    });
  } catch (err) {
    console.error('Volunteer signup error:', err);
    res.status(500).json({ error: err.message || 'Database error.' });
  }
});

router.get('/events/volunteered', authenticate, async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT o.id, o.title, o.description, o.date, o.time, o.location
       FROM opportunities o
       JOIN volunteer_signups vs ON o.id = vs.opportunity_id
       WHERE vs.user_id = ?`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching signups:', err);
    res.status(500).json({ error: 'Database error.' });
  }
});

router.delete('/events/volunteer/cancel/:opportunity_id', authenticate, async (req, res) => {
  try {
    const result = await db.execute('DELETE FROM volunteer_signups WHERE user_id = ? AND opportunity_id = ?', [
      req.user.id,
      req.params.opportunity_id,
    ]);
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Signup not found.' });
    res.json({ message: 'Signup canceled successfully.' });
  } catch (err) {
    console.error('Error canceling signup:', err);
    res.status(500).json({ error: 'Database error.' });
  }
});

router.get('/opportunities/:id/volunteers', authenticate, requireOwnEvent('id'), async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT sp.id, sp.user_id, sp.full_name, sp.age, sp.school, sp.bio, sp.interests, u.email, vs.signup_date
       FROM volunteer_signups vs
       JOIN users u ON vs.user_id = u.id
       JOIN student_profiles sp ON u.id = sp.user_id
       WHERE vs.opportunity_id = ?
       ORDER BY vs.signup_date ASC`,
      [req.event.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching event volunteers:', err);
    res.status(500).json({ error: 'Failed to fetch volunteers' });
  }
});

router.delete(
  '/opportunities/:eventId/volunteers/:userId',
  authenticate,
  requireOwnEvent('eventId'),
  async (req, res) => {
    if (new Date(`${req.event.date}T${req.event.time}`) <= new Date()) {
      return res.status(400).json({ error: 'Cannot remove volunteers from past events' });
    }

    try {
      const result = await db.execute('DELETE FROM volunteer_signups WHERE opportunity_id = ? AND user_id = ?', [
        req.event.id,
        req.params.userId,
      ]);
      if (result.rowsAffected === 0) return res.status(404).json({ error: 'Volunteer signup not found' });
      res.json({ message: 'Volunteer removed successfully' });
    } catch (err) {
      console.error('Error removing volunteer:', err);
      res.status(500).json({ error: 'Failed to remove volunteer' });
    }
  }
);

module.exports = router;
