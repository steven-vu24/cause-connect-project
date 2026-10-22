const express = require('express');
const { db } = require('../db');
const { authenticate, requireRole, requireOwnEvent } = require('../auth');
const { EVENT_COLUMNS, nowInLosAngeles, hasStarted, toEvent } = require('../events');
const { calculateDistance, getCoordinates } = require('../geocoding');

const router = express.Router();
const nonprofitOnly = [authenticate, requireRole('nonprofit')];

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

function readOpportunity(body) {
  const { title, description, date, time, end_time, location } = body ?? {};
  const filled = (value) => typeof value === 'string' && value.trim();
  if (![title, description, date, time, location].every(filled)) return { error: 'All fields are required.' };
  if (!DATE.test(date) || !TIME.test(time) || (end_time && !TIME.test(end_time))) {
    return { error: 'Dates must be YYYY-MM-DD and times HH:MM.' };
  }
  if (end_time && end_time <= time) return { error: 'End time must be after start time.' };
  if (hasStarted({ date, time })) return { error: 'The start time must be in the future.' };
  return { values: [title.trim(), description.trim(), date, time, end_time || null, location.trim()] };
}

// The organization name is copied from the profile so a client cannot post under another name.
async function organizationName(userId) {
  const result = await db.execute('SELECT nonprofit_name FROM nonprofit_profiles WHERE user_id = ? LIMIT 1', [userId]);
  return result.rows[0]?.nonprofit_name;
}

const upcomingEvents = () =>
  db.execute(
    `SELECT ${EVENT_COLUMNS} FROM opportunities o
     WHERE o.date || ' ' || o.time > ?
     ORDER BY o.date, o.time`,
    [nowInLosAngeles()]
  );

router.get('/opportunities/all', async (req, res) => {
  const result = await upcomingEvents();
  res.json(result.rows.map(toEvent));
});

router.get('/opportunities/nearby', async (req, res) => {
  const { location } = req.query;
  const radius = parseFloat(req.query.radius);
  if (!location || !(radius > 0)) {
    return res.status(400).json({ error: 'Location and radius are required query parameters.' });
  }

  const origin = await getCoordinates(location);
  if (!origin) return res.status(400).json({ error: 'Unable to find that location.' });

  const nearby = [];
  for (const row of (await upcomingEvents()).rows) {
    const coords = await getCoordinates(row.location);
    if (!coords) continue;
    const distance = calculateDistance(origin.lat, origin.lon, coords.lat, coords.lon);
    if (distance <= radius) nearby.push({ ...toEvent(row), distance: distance.toFixed(1) });
  }
  res.json(nearby);
});

router.get('/opportunities', ...nonprofitOnly, async (req, res) => {
  const result = await db.execute(
    `SELECT ${EVENT_COLUMNS} FROM opportunities o WHERE o.user_id = ? ORDER BY o.date, o.time`,
    [req.user.id]
  );
  res.json(result.rows.map(toEvent));
});

router.post('/opportunities', ...nonprofitOnly, async (req, res) => {
  const { values, error } = readOpportunity(req.body);
  if (error) return res.status(400).json({ error });
  const name = await organizationName(req.user.id);
  if (!name) return res.status(400).json({ error: 'Complete your organization profile first.' });

  const result = await db.execute(
    `INSERT INTO opportunities (user_id, nonprofit_name, title, description, date, time, end_time, location)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, name, ...values]
  );
  res.status(201).json({ opportunityId: Number(result.lastInsertRowid) });
});

router.put('/opportunities/:id', ...nonprofitOnly, requireOwnEvent('id'), async (req, res) => {
  if (hasStarted(req.event)) return res.status(400).json({ error: "Events that have started can't be edited." });
  const { values, error } = readOpportunity(req.body);
  if (error) return res.status(400).json({ error });
  const name = await organizationName(req.user.id);

  await db.execute(
    `UPDATE opportunities
     SET nonprofit_name = ?, title = ?, description = ?, date = ?, time = ?, end_time = ?, location = ?
     WHERE id = ?`,
    [name || req.event.nonprofit_name, ...values, req.event.id]
  );
  res.json({ message: 'Opportunity updated.' });
});

router.delete('/opportunities/:id', ...nonprofitOnly, requireOwnEvent('id'), async (req, res) => {
  await db.batch(
    [
      { sql: 'DELETE FROM volunteer_signups WHERE opportunity_id = ?', args: [req.event.id] },
      { sql: 'DELETE FROM opportunities WHERE id = ?', args: [req.event.id] },
    ],
    'write'
  );
  res.json({ message: 'Opportunity deleted.' });
});

module.exports = router;
