const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createClient } = require('@libsql/client');
const { nowInLosAngeles } = require('../events');

const port = 20000 + Math.floor(Math.random() * 20000);
const base = `http://localhost:${port}`;
const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cause-connect-')), 'test.db');
const db = createClient({ url: `file:${dbFile}` });

let server;

before(async () => {
  server = spawn(process.execPath, ['index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), TURSO_DATABASE_URL: `file:${dbFile}`, JWTSECRET: 'test-secret' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (chunk) => chunk.toString().includes('running') && resolve());
    server.on('exit', (code) => reject(new Error(`server exited with ${code}`)));
  });
});

after(() => {
  server.kill();
  db.close();
});

async function call(method, route, { cookie, body } = {}) {
  const response = await fetch(base + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: response.status, text, json, headers: response.headers };
}

const sessionCookie = (res) => res.headers.get('set-cookie')?.split(';')[0];

function laDate(daysFromToday) {
  const [date] = nowInLosAngeles(new Date(Date.now() + daysFromToday * 24 * 60 * 60 * 1000)).split(' ');
  return date;
}

const password = 'correct horse battery';
const studentProfile = {
  full_name: 'Sam Student',
  age: 17,
  school: 'Irvine, CA',
  bio: 'Likes animals',
  interests: 'Animals, Environment',
};
const orgProfile = {
  nonprofit_name: 'Paws Rescue',
  location: 'Irvine, CA',
  category: 'Animals, Elderly',
  statement: 'We rescue animals',
};
const opportunity = {
  title: 'Shelter walk',
  description: 'Walk the dogs',
  date: laDate(30),
  time: '09:00',
  end_time: '12:00',
  location: 'Irvine, CA',
};
const cookies = {};
let eventId;
let studentId;

async function register(email, usertype, profile) {
  const res = await call('POST', '/api/signup', { body: { email, password, usertype, profile } });
  assert.equal(res.status, 201, res.text);
  return sessionCookie(res);
}

test('health check and unknown API routes answer with JSON', async () => {
  const health = await call('GET', '/api/health');
  assert.deepEqual(health.json, { ok: true });
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');

  const missing = await call('GET', '/api/nope');
  assert.equal(missing.status, 404);
  assert.deepEqual(missing.json, { error: 'Not found.' });
});

test('signup validates its input', async () => {
  const cases = [
    [{ password, usertype: 'student', profile: studentProfile }, 'Please provide a valid email address.'],
    [{ email: 'a@b.co', password: 'short', usertype: 'student', profile: studentProfile }, 'Password must be at least 12 characters.'],
    [{ email: 'a@b.co', password, usertype: 'constructor', profile: orgProfile }, "Usertype must be either 'student' or 'nonprofit'."],
    [{ email: 'a@b.co', password, usertype: 'student' }, 'Name, age, location, and bio are required.'],
    [{ email: 'a@b.co', password, usertype: 'student', profile: { ...studentProfile, age: 'old' } }, 'Age must be a whole number.'],
  ];
  for (const [body, error] of cases) {
    const res = await call('POST', '/api/signup', { body });
    assert.equal(res.status, 400);
    assert.equal(res.json.error, error);
  }
});

test('signup creates the account and profile together and starts a session', async () => {
  cookies.student = await register('Student@Example.com', 'student', studentProfile);
  cookies.org = await register('org@example.com', 'nonprofit', orgProfile);
  cookies.otherOrg = await register('other-org@example.com', 'nonprofit', { ...orgProfile, nonprofit_name: 'Other Org' });
  cookies.otherStudent = await register('other@example.com', 'student', { ...studentProfile, full_name: 'Olive Other' });
  assert.match(cookies.student, /^token=/);

  const me = await call('GET', '/api/me', { cookie: cookies.student });
  assert.equal(me.json.email, 'student@example.com');
  assert.equal(me.json.profile.full_name, 'Sam Student');
  studentId = me.json.id;

  const duplicate = await call('POST', '/api/signup', {
    body: { email: 'STUDENT@example.com', password, usertype: 'student', profile: studentProfile },
  });
  assert.equal(duplicate.status, 400);
  assert.equal(duplicate.json.error, 'That email address is already registered.');
});

test('login ignores email case and sets an httpOnly cookie', async () => {
  const wrong = await call('POST', '/api/login', { body: { email: 'org@example.com', password: 'wrong password!' } });
  assert.equal(wrong.status, 400);

  const login = await call('POST', '/api/login', { body: { email: 'ORG@example.com', password } });
  assert.equal(login.status, 200);
  assert.equal(login.json.nextRoute, '/organization-page');
  assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(login.headers.get('set-cookie'), /SameSite=Lax/i);
  assert.equal(login.json.token, undefined);
});

test('requests without a valid session get 401', async () => {
  for (const route of ['/api/me', '/api/profile', '/api/opportunities', '/api/events/volunteered']) {
    assert.equal((await call('GET', route)).status, 401, route);
    assert.equal((await call('GET', route, { cookie: 'token=forged' })).status, 401, route);
  }
});

test('each role is limited to its own actions', async () => {
  const studentCreates = await call('POST', '/api/opportunities', { cookie: cookies.student, body: opportunity });
  assert.equal(studentCreates.status, 403);
  const studentLists = await call('GET', '/api/opportunities', { cookie: cookies.student });
  assert.equal(studentLists.status, 403);
});

test('opportunities take the organization name from the profile and must start in the future', async () => {
  const past = await call('POST', '/api/opportunities', {
    cookie: cookies.org,
    body: { ...opportunity, date: laDate(-1) },
  });
  assert.equal(past.status, 400);
  const backwards = await call('POST', '/api/opportunities', {
    cookie: cookies.org,
    body: { ...opportunity, end_time: '08:00' },
  });
  assert.equal(backwards.status, 400);

  const created = await call('POST', '/api/opportunities', {
    cookie: cookies.org,
    body: { ...opportunity, nonprofit_name: 'Someone Else' },
  });
  assert.equal(created.status, 201, created.text);
  eventId = created.json.opportunityId;

  const feed = await call('GET', '/api/opportunities/all');
  const event = feed.json.find((e) => e.id === eventId);
  assert.equal(event.organization, 'Paws Rescue');
  assert.equal(event.cause, 'Animals, Elderly');
  assert.equal(event.startTime, '09:00');
  assert.equal(event.endTime, '12:00');
});

test('only the owner can edit an opportunity', async () => {
  const update = { ...opportunity, title: 'Shelter walk (updated)', time: '10:00' };
  const notOwner = await call('PUT', `/api/opportunities/${eventId}`, { cookie: cookies.otherOrg, body: update });
  assert.equal(notOwner.status, 403);
  const missing = await call('PUT', '/api/opportunities/999999', { cookie: cookies.org, body: update });
  assert.equal(missing.status, 404);
  const owner = await call('PUT', `/api/opportunities/${eventId}`, { cookie: cookies.org, body: update });
  assert.equal(owner.status, 200, owner.text);

  const feed = await call('GET', '/api/opportunities/all');
  assert.equal(feed.json.find((e) => e.id === eventId).title, 'Shelter walk (updated)');
});

test('students join upcoming events once and cannot join one that has started', async () => {
  const orgJoins = await call('POST', '/api/events/volunteer', { cookie: cookies.org, body: { opportunity_id: eventId } });
  assert.equal(orgJoins.status, 403);

  const joined = await call('POST', '/api/events/volunteer', {
    cookie: cookies.student,
    body: { opportunity_id: eventId },
  });
  assert.equal(joined.status, 201, joined.text);
  const again = await call('POST', '/api/events/volunteer', {
    cookie: cookies.student,
    body: { opportunity_id: eventId },
  });
  assert.equal(again.status, 400);
  assert.match(again.json.error, /already/);

  const pastInsert = await db.execute(
    `INSERT INTO opportunities (user_id, nonprofit_name, title, description, date, time, location)
     SELECT user_id, nonprofit_name, 'Last week', 'Done', ?, '09:00', 'Irvine, CA' FROM opportunities WHERE id = ?`,
    [laDate(-7), eventId]
  );
  const pastId = Number(pastInsert.lastInsertRowid);
  const late = await call('POST', '/api/events/volunteer', { cookie: cookies.student, body: { opportunity_id: pastId } });
  assert.equal(late.status, 400);

  await db.execute('INSERT INTO volunteer_signups (user_id, opportunity_id, signup_date) VALUES (?, ?, ?)', [
    studentId,
    pastId,
    new Date().toISOString(),
  ]);
  const mine = await call('GET', '/api/events/volunteered', { cookie: cookies.student });
  assert.deepEqual(
    mine.json.map((e) => e.title),
    ['Last week', 'Shelter walk (updated)']
  );

  const feed = await call('GET', '/api/opportunities/all');
  assert.equal(
    feed.json.find((e) => e.id === pastId),
    undefined
  );
});

test('only the owner sees and removes volunteers', async () => {
  const notOwner = await call('GET', `/api/opportunities/${eventId}/volunteers`, { cookie: cookies.otherOrg });
  assert.equal(notOwner.status, 403);

  const volunteers = await call('GET', `/api/opportunities/${eventId}/volunteers`, { cookie: cookies.org });
  assert.equal(volunteers.json.length, 1);
  assert.equal(volunteers.json[0].email, 'student@example.com');

  const removed = await call('DELETE', `/api/opportunities/${eventId}/volunteers/${studentId}`, { cookie: cookies.org });
  assert.equal(removed.status, 200, removed.text);
  const again = await call('DELETE', `/api/opportunities/${eventId}/volunteers/${studentId}`, { cookie: cookies.org });
  assert.equal(again.status, 404);
});

test('students can leave an upcoming event they joined', async () => {
  await call('POST', '/api/events/volunteer', { cookie: cookies.otherStudent, body: { opportunity_id: eventId } });
  const left = await call('DELETE', `/api/events/volunteer/cancel/${eventId}`, { cookie: cookies.otherStudent });
  assert.equal(left.status, 200, left.text);
  const again = await call('DELETE', `/api/events/volunteer/cancel/${eventId}`, { cookie: cookies.otherStudent });
  assert.equal(again.status, 404);
});

test('account changes require the current password and keep the session current', async () => {
  const noPassword = await call('POST', '/api/account/update', {
    cookie: cookies.otherStudent,
    body: { email: 'taken-over@example.com' },
  });
  assert.equal(noPassword.status, 400);

  const short = await call('POST', '/api/account/update', {
    cookie: cookies.otherStudent,
    body: { currentPassword: password, newPassword: 'short' },
  });
  assert.equal(short.status, 400);

  const changed = await call('POST', '/api/account/update', {
    cookie: cookies.otherStudent,
    body: { currentPassword: password, email: 'Renamed@Example.com', newPassword: 'a brand new password' },
  });
  assert.equal(changed.status, 200, changed.text);
  const session = await call('GET', '/api/session', { cookie: sessionCookie(changed) });
  assert.deepEqual(session.json, { email: 'renamed@example.com' });

  const login = await call('POST', '/api/login', {
    body: { email: 'renamed@example.com', password: 'a brand new password' },
  });
  assert.equal(login.status, 200);
});

test('deleting an opportunity removes it and its signups', async () => {
  await call('POST', '/api/events/volunteer', { cookie: cookies.student, body: { opportunity_id: eventId } });
  const notOwner = await call('DELETE', `/api/opportunities/${eventId}`, { cookie: cookies.otherOrg });
  assert.equal(notOwner.status, 403);

  const deleted = await call('DELETE', `/api/opportunities/${eventId}`, { cookie: cookies.org });
  assert.equal(deleted.status, 200, deleted.text);

  const feed = await call('GET', '/api/opportunities/all');
  assert.equal(
    feed.json.find((e) => e.id === eventId),
    undefined
  );
  const signups = await db.execute('SELECT COUNT(*) AS n FROM volunteer_signups WHERE opportunity_id = ?', [eventId]);
  assert.equal(signups.rows[0].n, 0);
});

test('logout clears the session cookie', async () => {
  const res = await call('POST', '/api/logout', { cookie: cookies.student });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('set-cookie'), /token=;/);
});

test('repeated failed logins are rate limited', async () => {
  let res;
  for (let attempt = 0; attempt < 11; attempt++) {
    res = await call('POST', '/api/login', { body: { email: 'org@example.com', password: 'not the password' } });
  }
  assert.equal(res.status, 429);
  assert.match(res.json.error, /Too many failed attempts/);
});
