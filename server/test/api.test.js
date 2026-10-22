const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createClient } = require('@libsql/client');

// SERVER_DIR lets the same suite run against another checkout of the server.
const serverDir = process.env.SERVER_DIR || path.join(__dirname, '..');
const entry = process.env.SERVER_ENTRY || 'index.js';
const port = 20000 + Math.floor(Math.random() * 20000);
const base = `http://localhost:${port}`;
const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cause-connect-')), 'test.db');

let server;

before(async () => {
  const db = createClient({ url: `file:${dbFile}` });
  await db.executeMultiple(fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8'));
  db.close();

  server = spawn(process.execPath, [entry], {
    cwd: serverDir,
    env: { ...process.env, PORT: String(port), TURSO_DATABASE_URL: `file:${dbFile}`, JWTSECRET: 'test-secret' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stderr.on('data', (chunk) => process.stderr.write(chunk));
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (chunk) => chunk.toString().includes('running') && resolve());
    server.on('exit', (code) => reject(new Error(`server exited with ${code}`)));
  });
});

after(() => server.kill());

async function call(method, route, { token, body } = {}) {
  const response = await fetch(base + route, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: response.status, text, json, headers: response.headers };
}

function futureDate(days) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

const password = 'correct horse battery';
const student = { email: 'student@example.com', usertype: 'student' };
const otherStudent = { email: 'other@example.com', usertype: 'student' };
const org = { email: 'org@example.com', usertype: 'nonprofit' };
const otherOrg = { email: 'other-org@example.com', usertype: 'nonprofit' };
const tokens = {};
let eventId;
let studentId;

async function register(user, profile) {
  const signup = await call('POST', '/api/signup', { body: { ...user, password } });
  assert.equal(signup.status, 201, signup.text);
  const login = await call('POST', '/api/login', { body: { email: user.email, password } });
  assert.equal(login.status, 200, login.text);
  const saved = await call('PUT', '/api/profile', { token: login.json.token, body: profile });
  assert.equal(saved.status, 200, saved.text);
  return login.json.token;
}

test('health check responds', async () => {
  const res = await call('GET', '/');
  assert.equal(res.status, 200);
  assert.equal(res.text, 'API is running');
});

test('signup validates its input', async () => {
  const cases = [
    [{ password, usertype: 'student' }, 'You must provide an email address.'],
    [{ email: 'not-an-email', password, usertype: 'student' }, 'Please provide a valid email address.'],
    [{ email: 'a@b.co', password: 'short', usertype: 'student' }, 'Password must be at least 12 characters.'],
    [{ email: 'a@b.co', password, usertype: 'admin' }, "Usertype must be either 'student' or 'nonprofit'."],
    [{ email: 'a@b.co', password, usertype: 'constructor' }, "Usertype must be either 'student' or 'nonprofit'."],
  ];
  for (const [body, message] of cases) {
    const res = await call('POST', '/api/signup', { body });
    assert.equal(res.status, 400);
    assert.equal(res.text, message);
  }
});

test('students and nonprofits can register, log in and save a profile', async () => {
  tokens.student = await register(student, {
    full_name: 'Sam Student',
    age: 17,
    school: 'Irvine, CA',
    bio: 'Likes animals',
    interests: 'Animals, Environment',
  });
  tokens.otherStudent = await register(otherStudent, {
    full_name: 'Olive Other',
    age: 16,
    school: 'Irvine, CA',
    bio: 'Hi',
    interests: 'Sports',
  });
  tokens.org = await register(org, {
    nonprofit_name: 'Paws Rescue',
    location: 'Irvine, CA',
    category: 'Animals, Elderly',
    statement: 'We rescue animals',
  });
  tokens.otherOrg = await register(otherOrg, {
    nonprofit_name: 'Other Org',
    location: 'Irvine, CA',
    category: 'Sports',
    statement: 'Other',
  });

  const duplicate = await call('POST', '/api/signup', { body: { ...student, password } });
  assert.equal(duplicate.status, 400);
  assert.equal(duplicate.text, 'That email address is already registered.');
});

test('login reports bad credentials and routes each user type home', async () => {
  const wrong = await call('POST', '/api/login', { body: { email: student.email, password: 'wrong password!' } });
  assert.equal(wrong.status, 400);
  assert.equal(wrong.text, 'Invalid credentials');

  const login = await call('POST', '/api/login', { body: { email: org.email, password } });
  assert.equal(login.json.nextRoute, '/organization-page');
  assert.match(login.headers.get('set-cookie'), /token=/);
});

test('requests without a valid token are rejected', async () => {
  for (const route of ['/api/me', '/api/profile', '/api/opportunities', '/api/events/volunteered']) {
    const res = await call('GET', route);
    assert.ok([401, 403].includes(res.status), `${route} returned ${res.status}`);
    const forged = await call('GET', route, { token: 'not-a-real-token' });
    assert.equal(forged.status, 403, route);
  }
});

test('me, session and profile describe the logged-in user', async () => {
  const me = await call('GET', '/api/me', { token: tokens.student });
  assert.equal(me.status, 200);
  assert.equal(me.json.email, student.email);
  assert.equal(me.json.user_type, 'student');
  assert.equal(me.json.profile.full_name, 'Sam Student');
  studentId = me.json.id;

  const session = await call('GET', '/api/session', { token: tokens.student });
  assert.deepEqual(session.json, { email: student.email });

  const profile = await call('GET', '/api/profile', { token: tokens.org });
  assert.deepEqual(profile.json, {
    nonprofit_name: 'Paws Rescue',
    location: 'Irvine, CA',
    category: 'Animals, Elderly',
    statement: 'We rescue animals',
  });
});

test('only nonprofits can create opportunities, with every field filled in', async () => {
  const opportunity = {
    nonprofit_name: 'Paws Rescue',
    title: 'Shelter walk',
    description: 'Walk the dogs',
    date: futureDate(30),
    time: '09:00',
    end_time: '12:00',
    location: 'Irvine, CA',
  };

  const asStudent = await call('POST', '/api/opportunities', { token: tokens.student, body: opportunity });
  assert.equal(asStudent.status, 403);

  const incomplete = await call('POST', '/api/opportunities', {
    token: tokens.org,
    body: { ...opportunity, title: '' },
  });
  assert.equal(incomplete.status, 400);

  const created = await call('POST', '/api/opportunities', { token: tokens.org, body: opportunity });
  assert.equal(created.status, 201, created.text);
  eventId = created.json.opportunityId;
  assert.ok(eventId);
});

test('the public feed and the organization list return the event contract', async () => {
  const feed = await call('GET', '/api/opportunities/all');
  const event = feed.json.find((e) => e.id === eventId);
  assert.ok(event, 'event is in the public feed');
  assert.equal(event.title, 'Shelter walk');
  assert.equal(event.organization, 'Paws Rescue');
  assert.equal(event.body, 'Walk the dogs');
  assert.equal(event.startDate, futureDate(30));
  assert.equal(event.startTime, '09:00');
  assert.equal(event.endDate, futureDate(30));
  assert.equal(event.endTime, '12:00');
  assert.equal(event.location, 'Irvine, CA');
  assert.equal(event.cause, 'Animals, Elderly');

  const mine = await call('GET', '/api/opportunities', { token: tokens.org });
  assert.deepEqual(
    mine.json.map((e) => e.id),
    [eventId]
  );
  const theirs = await call('GET', '/api/opportunities', { token: tokens.otherOrg });
  assert.deepEqual(theirs.json, []);
});

test('only the owner can edit an opportunity', async () => {
  const update = {
    nonprofit_name: 'Paws Rescue',
    title: 'Shelter walk (updated)',
    description: 'Walk the dogs',
    date: futureDate(30),
    time: '10:00',
    end_time: '12:00',
    location: 'Irvine, CA',
  };
  const notOwner = await call('PUT', `/api/opportunities/${eventId}`, { token: tokens.otherOrg, body: update });
  assert.equal(notOwner.status, 403);
  const missing = await call('PUT', '/api/opportunities/999999', { token: tokens.org, body: update });
  assert.equal(missing.status, 404);
  const owner = await call('PUT', `/api/opportunities/${eventId}`, { token: tokens.org, body: update });
  assert.equal(owner.status, 200, owner.text);

  const feed = await call('GET', '/api/opportunities/all');
  assert.equal(feed.json.find((e) => e.id === eventId).title, 'Shelter walk (updated)');
});

test('students can join an event once and see it in their signups', async () => {
  const joined = await call('POST', '/api/events/volunteer', {
    token: tokens.student,
    body: { opportunity_id: eventId },
  });
  assert.equal(joined.status, 201, joined.text);

  const again = await call('POST', '/api/events/volunteer', {
    token: tokens.student,
    body: { opportunity_id: eventId },
  });
  assert.equal(again.status, 400);
  assert.match(again.json.error, /already/);

  const mine = await call('GET', '/api/events/volunteered', { token: tokens.student });
  assert.deepEqual(
    mine.json.map((e) => e.id),
    [eventId]
  );
});

test('only the owner sees and removes volunteers', async () => {
  const notOwner = await call('GET', `/api/opportunities/${eventId}/volunteers`, { token: tokens.otherOrg });
  assert.equal(notOwner.status, 403);

  const volunteers = await call('GET', `/api/opportunities/${eventId}/volunteers`, { token: tokens.org });
  assert.equal(volunteers.status, 200);
  assert.equal(volunteers.json.length, 1);
  assert.equal(volunteers.json[0].user_id, studentId);
  assert.equal(volunteers.json[0].full_name, 'Sam Student');
  assert.equal(volunteers.json[0].email, student.email);

  const removed = await call('DELETE', `/api/opportunities/${eventId}/volunteers/${studentId}`, {
    token: tokens.org,
  });
  assert.equal(removed.status, 200, removed.text);
  const after = await call('GET', `/api/opportunities/${eventId}/volunteers`, { token: tokens.org });
  assert.deepEqual(after.json, []);
});

test('students can leave an event they joined', async () => {
  await call('POST', '/api/events/volunteer', { token: tokens.otherStudent, body: { opportunity_id: eventId } });
  const left = await call('DELETE', `/api/events/volunteer/cancel/${eventId}`, { token: tokens.otherStudent });
  assert.equal(left.status, 200, left.text);
  const again = await call('DELETE', `/api/events/volunteer/cancel/${eventId}`, { token: tokens.otherStudent });
  assert.equal(again.status, 404);
});

test('changing a password requires the current one', async () => {
  const wrong = await call('POST', '/api/account/update', {
    token: tokens.otherStudent,
    body: { currentPassword: 'not my password', newPassword: 'a brand new password' },
  });
  assert.equal(wrong.status, 400);

  const changed = await call('POST', '/api/account/update', {
    token: tokens.otherStudent,
    body: { currentPassword: password, newPassword: 'a brand new password' },
  });
  assert.equal(changed.status, 200, changed.text);

  const login = await call('POST', '/api/login', {
    body: { email: otherStudent.email, password: 'a brand new password' },
  });
  assert.equal(login.status, 200);
});

test('deleting an opportunity removes it from the feed', async () => {
  await call('POST', '/api/events/volunteer', { token: tokens.student, body: { opportunity_id: eventId } });
  const notOwner = await call('DELETE', `/api/opportunities/${eventId}`, { token: tokens.otherOrg });
  assert.equal(notOwner.status, 403);

  const deleted = await call('DELETE', `/api/opportunities/${eventId}`, { token: tokens.org });
  assert.equal(deleted.status, 200, deleted.text);

  const feed = await call('GET', '/api/opportunities/all');
  assert.equal(
    feed.json.find((e) => e.id === eventId),
    undefined
  );
  const mine = await call('GET', '/api/events/volunteered', { token: tokens.student });
  assert.deepEqual(mine.json, []);
});

test('logout clears the cookie', async () => {
  const res = await call('POST', '/api/logout', { token: tokens.student });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('set-cookie'), /token=;/);
});
