# Cause Connect

Cause Connect matches students with volunteer opportunities posted by nonprofits. Nonprofits post events; students find events that match their interests and location, sign up, and see what they've joined.

## Layout

```
client/                React app (Create React App, TypeScript)
  src/utils/api.ts     every call the client makes to the API
  src/utils/time.ts    date/time formatting and the Los Angeles "has it started" rule
  src/utils/causes.ts  the cause list shared by profiles and matching
  src/types/types.ts   the shapes the API returns
server/                Express API over Turso (libsql / SQLite); also serves the built client
  schema.sql           the tables the server relies on
  routes/              account, opportunities, signups
  test/api.test.js     tests for every route the client uses
render.yaml            the production service
```

Event dates and times are stored and compared as America/Los_Angeles wall-clock time on both sides.

## Run it locally

Requires Node 20 or later. In one terminal:

```bash
cp server/.env.example server/.env
npm install --prefix server
npm run dev --prefix server
```

In another:

```bash
npm install --prefix client
npm start --prefix client
```

Set `JWTSECRET` in `server/.env` before starting the server. Open http://localhost:3000; the dev server forwards `/api` to the API on port 5001. Without `TURSO_DATABASE_URL` the server stores data in `server/local.db`, so local development never touches the production database.

## Test

```bash
npm test --prefix server
npm test --prefix client -- --watchAll=false
npm run build --prefix client
```

CI runs the same three commands on every pull request.

## Configuration

| Variable | Purpose |
| --- | --- |
| `JWTSECRET` | Signs session cookies. Required. |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Production database. Required when `NODE_ENV=production`; leave unset locally. |
| `NODE_ENV` | `production` makes the session cookie `Secure`. |
| `PORT` | Defaults to 5001. |

## Deployment

Production is one Render web service, defined in `render.yaml`. It builds the client, then starts the API, which serves the app and `/api` from the same origin. That keeps the session cookie first-party in every browser and removes the need for CORS.

To create it, open Render → New → Blueprint, choose this repository, and enter `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Render generates `JWTSECRET`. The health check is `/api/health`.

On the free plan the service sleeps after 15 minutes without traffic, and the next request waits about a minute for it to wake. A paid instance avoids that.

### Database constraints

The production tables were created by hand before `schema.sql` existed, so they may lack the uniqueness constraints a fresh database gets. Once these queries return no rows:

```sql
SELECT lower(email), COUNT(*) FROM users GROUP BY lower(email) HAVING COUNT(*) > 1;
SELECT user_id, COUNT(*) FROM nonprofit_profiles GROUP BY user_id HAVING COUNT(*) > 1;
SELECT opportunity_id, user_id, COUNT(*) FROM volunteer_signups GROUP BY 1, 2 HAVING COUNT(*) > 1;
```

add the constraints with:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS nonprofit_profiles_user ON nonprofit_profiles (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS volunteer_signups_once ON volunteer_signups (opportunity_id, user_id);
```
