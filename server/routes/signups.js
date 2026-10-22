const express = require('express');
const { db } = require('../db');
const { authenticate, requireRole, requireOwnEvent } = require('../auth');
const { EVENT_COLUMNS, hasStarted, toEvent } = require('../events');

const router = express.Router();
const studentOnly = [authenticate, requireRole('student')];
const nonprofitOnly = [authenticate, requireRole('nonprofit')];

async function findEvent(id) {
  const result = await db.execute('SELECT id, date, time FROM opportunities WHERE id = ?', [id]);
  return result.rows[0];
}

router.post('/events/volunteer', ...studentOnly, async (req, res) => {
  if (!req.body?.opportunity_id) return res.status(400).json({ error: 'Opportunity ID is required.' });
  const event = await findEvent(req.body.opportunity_id);
  if (!event) return res.status(404).json({ error: 'Opportunity not found.' });
  if (hasStarted(event)) return res.status(400).json({ error: 'This event has already started.' });

  const existing = await db.execute('SELECT id FROM volunteer_signups WHERE user_id = ? AND opportunity_id = ?', [
    req.user.id,
    event.id,
  ]);
  if (existing.rows.length > 0) {
    return res.status(400).json({ error: 'You have already signed up for this opportunity.' });
  }

  await db.execute('INSERT INTO volunteer_signups (user_id, opportunity_id, signup_date) VALUES (?, ?, ?)', [
    req.user.id,
    event.id,
    new Date().toISOString(),
  ]);
  res.status(201).json({ message: 'Signed up.' });
});

router.get('/events/volunteered', ...studentOnly, async (req, res) => {
  const result = await db.execute(
    `SELECT ${EVENT_COLUMNS} FROM opportunities o
     JOIN volunteer_signups vs ON vs.opportunity_id = o.id
     WHERE vs.user_id = ?
     ORDER BY o.date, o.time`,
    [req.user.id]
  );
  res.json(result.rows.map(toEvent));
});

router.delete('/events/volunteer/cancel/:opportunity_id', ...studentOnly, async (req, res) => {
  const event = await findEvent(req.params.opportunity_id);
  if (!event) return res.status(404).json({ error: 'Opportunity not found.' });
  if (hasStarted(event)) return res.status(400).json({ error: "You can't leave an event that has started." });

  const result = await db.execute('DELETE FROM volunteer_signups WHERE user_id = ? AND opportunity_id = ?', [
    req.user.id,
    event.id,
  ]);
  if (result.rowsAffected === 0) return res.status(404).json({ error: 'Signup not found.' });
  res.json({ message: 'Signup canceled.' });
});

router.get('/opportunities/:id/volunteers', ...nonprofitOnly, requireOwnEvent('id'), async (req, res) => {
  const result = await db.execute(
    `SELECT sp.id, sp.user_id, sp.full_name, sp.age, sp.school, sp.bio, sp.interests, u.email, vs.signup_date
     FROM volunteer_signups vs
     JOIN users u ON vs.user_id = u.id
     JOIN student_profiles sp ON u.id = sp.user_id
     WHERE vs.opportunity_id = ?
     ORDER BY vs.signup_date`,
    [req.event.id]
  );
  res.json(result.rows);
});

router.delete(
  '/opportunities/:eventId/volunteers/:userId',
  ...nonprofitOnly,
  requireOwnEvent('eventId'),
  async (req, res) => {
    if (hasStarted(req.event)) return res.status(400).json({ error: 'Cannot remove volunteers from past events.' });

    const result = await db.execute('DELETE FROM volunteer_signups WHERE opportunity_id = ? AND user_id = ?', [
      req.event.id,
      req.params.userId,
    ]);
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Volunteer signup not found.' });
    res.json({ message: 'Volunteer removed.' });
  }
);

module.exports = router;
