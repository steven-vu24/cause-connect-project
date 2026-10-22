const TIME_ZONE = 'America/Los_Angeles';

// A correlated subquery rather than a join, so an organization with more than
// one profile row cannot duplicate its events.
const EVENT_COLUMNS =
  'o.*, (SELECT category FROM nonprofit_profiles WHERE user_id = o.user_id LIMIT 1) AS organization_causes';

function todayInLosAngeles() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

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

module.exports = { EVENT_COLUMNS, todayInLosAngeles, toEvent };
