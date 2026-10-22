-- The schema the server relies on. Applied on every start; IF NOT EXISTS makes
-- it a no-op for tables that already exist, so it never alters production data.
--
-- opportunities.date is YYYY-MM-DD and opportunities.time / end_time are HH:MM,
-- all America/Los_Angeles wall-clock time.
-- student_profiles.interests and nonprofit_profiles.category hold comma-separated
-- cause names from client/src/utils/causes.ts.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  user_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users (id),
  full_name TEXT,
  age INTEGER,
  school TEXT,
  bio TEXT,
  interests TEXT
);

CREATE TABLE IF NOT EXISTS nonprofit_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users (id),
  nonprofit_name TEXT,
  location TEXT,
  category TEXT,
  statement TEXT
);

CREATE TABLE IF NOT EXISTS opportunities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id),
  nonprofit_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  end_time TEXT,
  location TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS volunteer_signups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  opportunity_id INTEGER NOT NULL REFERENCES opportunities (id),
  user_id INTEGER NOT NULL REFERENCES users (id),
  signup_date TEXT NOT NULL,
  UNIQUE (opportunity_id, user_id)
);
