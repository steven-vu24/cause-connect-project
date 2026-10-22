const express = require('express');
const { db } = require('../db');
const { authenticate, requireOwnEvent } = require('../auth');
const { EVENT_COLUMNS, todayInLosAngeles, toEvent } = require('../events');
const { calculateDistance, getCoordinates } = require('../geocoding');

const router = express.Router();

const REQUIRED_FIELDS = ['nonprofit_name', 'title', 'description', 'date', 'time', 'location'];
const hasRequiredFields = (body) => REQUIRED_FIELDS.every((field) => body[field]);

const upcomingEvents = () =>
  db.execute(`SELECT ${EVENT_COLUMNS} FROM opportunities o WHERE o.date >= ? ORDER BY o.date ASC, o.time ASC`, [
    todayInLosAngeles(),
  ]);

router.get('/opportunities/all', async (req, res) => {
  try {
    const result = await upcomingEvents();
    res.json(result.rows.map(toEvent));
  } catch (err) {
    console.error('Error fetching all opportunities:', err);
    res.status(500).json({ error: 'Database error backend.', details: err.message });
  }
});

router.get('/opportunities', authenticate, async (req, res) => {
  try {
    const result = await db.execute(`SELECT ${EVENT_COLUMNS} FROM opportunities o WHERE o.user_id = ?`, [req.user.id]);
    res.json(result.rows.map(toEvent));
  } catch (err) {
    console.error('Error fetching opportunities:', err);
    res.status(500).json({ error: 'Database error.' });
  }
});

router.get('/opportunities/nearby', async (req, res) => {
  const { location, radius } = req.query;
  if (!location || !radius) {
    return res.status(400).json({ error: 'Location and radius are required query parameters.' });
  }

  try {
    const origin = await getCoordinates(location);
    if (!origin) return res.status(400).json({ error: 'Unable to geocode the provided location.' });

    const result = await upcomingEvents();
    const nearby = [];
    for (const row of result.rows) {
      const coords = await getCoordinates(row.location);
      if (!coords) continue;
      const distance = calculateDistance(origin.lat, origin.lon, coords.lat, coords.lon);
      if (distance <= parseFloat(radius)) nearby.push({ ...toEvent(row), distance: distance.toFixed(1) });
    }
    res.json(nearby);
  } catch (err) {
    console.error('Error in nearby search:', err);
    res.status(500).json({ error: 'Error processing location search.' });
  }
});

router.post('/opportunities', authenticate, async (req, res) => {
  if (req.user.userType !== 'nonprofit') {
    return res.status(403).json({ error: 'Only nonprofit users can create opportunities.' });
  }
  if (!hasRequiredFields(req.body)) return res.status(400).json({ error: 'All fields are required.' });

  const { nonprofit_name, title, description, date, time, location, end_time } = req.body;
  try {
    const result = await db.execute(
      `INSERT INTO opportunities (user_id, nonprofit_name, title, description, date, time, location, end_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, nonprofit_name, title, description, date, time, location, end_time ?? null]
    );
    res.status(201).json({
      message: 'Opportunity created successfully.',
      opportunityId: Number(result.lastInsertRowid),
    });
  } catch (err) {
    console.error('Error creating opportunity:', err);
    res.status(500).json({ error: 'Database error.' });
  }
});

router.put('/opportunities/:id', authenticate, requireOwnEvent('id'), async (req, res) => {
  if (!hasRequiredFields(req.body)) return res.status(400).json({ error: 'All fields are required.' });

  const { nonprofit_name, title, description, date, time, location, end_time } = req.body;
  try {
    await db.execute(
      `UPDATE opportunities
       SET nonprofit_name = ?, title = ?, description = ?, date = ?, time = ?, location = ?, end_time = ?
       WHERE id = ?`,
      [nonprofit_name, title, description, date, time, location, end_time ?? null, req.event.id]
    );
    res.json({ message: 'Opportunity updated successfully.' });
  } catch (err) {
    console.error('Error updating opportunity:', err);
    res.status(500).json({ error: 'Database error.' });
  }
});

router.delete('/opportunities/:id', authenticate, requireOwnEvent('id'), async (req, res) => {
  try {
    await db.execute('DELETE FROM volunteer_signups WHERE opportunity_id = ?', [req.event.id]);
    await db.execute('DELETE FROM opportunities WHERE id = ?', [req.event.id]);
    res.json({ message: 'Opportunity and all volunteer signups deleted successfully.' });
  } catch (err) {
    console.error('Error deleting opportunity:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

module.exports = router;
