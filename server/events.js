const TIME_ZONE = 'America/Los_Angeles';

// A correlated subquery rather than a join, so an organization with more than
// one profile row cannot duplicate its events.
const EVENT_COLUMNS =
  'o.*, (SELECT category FROM nonprofit_profiles WHERE user_id = o.user_id LIMIT 1) AS organization_causes';

// Events are stored as Los Angeles wall-clock date and time. Rendering "now" in
// the same 'YYYY-MM-DD HH:MM' shape as date || ' ' || time makes "has this
// event started" a string comparison, independent of the server's timezone.
function nowInLosAngeles(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

const hasStarted = (event) => `${event.date} ${event.time}` <= nowInLosAngeles();

const toEvent = (row) => ({
  id: row.id,
  title: row.title,
  organization: row.nonprofit_name,
  body: row.description,
  startDate: row.date,
  startTime: row.time,
  endDate: row.end_date || row.date,
  endTime: row.end_time || '',
  location: row.location,
  cause: row.organization_causes || '',
});

module.exports = { EVENT_COLUMNS, nowInLosAngeles, hasStarted, toEvent };
