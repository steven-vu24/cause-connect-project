# Cause Connect

Cause Connect matches students with volunteer opportunities posted by nonprofits. Nonprofits post events; students find events that match their interests and location, sign up, and see what they've joined.

## Layout

```
client/                React app (Create React App, TypeScript)
  src/utils/api.ts     every call the client makes to the API
  src/utils/time.ts    date/time formatting and the started/upcoming split
  src/utils/causes.ts  the cause list shared by profiles and matching
  src/types/types.ts   the shapes the API returns
server/                Express API over Turso (libsql / SQLite)
  schema.sql           the tables the server relies on
  routes/              account, opportunities, signups
  test/api.test.js     tests for every route the client uses
```

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

Set `JWTSECRET` in `server/.env` before starting the server. The API runs on http://localhost:5001 and the app on http://localhost:3000. Without `TURSO_DATABASE_URL` the server stores data in `server/local.db`, so local development never touches the production database.

## Test

```bash
npm test --prefix server
CI=true npm run build --prefix client
```

The server tests start the API against a throwaway database and exercise every route the client calls.

## Configuration

| Variable | Where | Purpose |
| --- | --- | --- |
| `JWTSECRET` | server | Signs session tokens. Required. |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | server | Production database. Leave unset locally. |
| `CLIENT_ORIGIN` | server | Browser origin allowed by CORS. Defaults to `https://causeconnectus.netlify.app`. |
| `PORT` | server | Defaults to 5001. |
| `REACT_APP_API_URL` | client, at build time | API base URL. Defaults to `https://causeconnectbackend.onrender.com/api`; `client/.env.development` points `npm start` at localhost. |

## Deployment

- The app is served by Netlify at https://causeconnectus.netlify.app, built from `client/` as described in `netlify.toml`.
- The API is a Render web service at https://causeconnectbackend.onrender.com. It must install and start from `server/` (`npm install`, then `npm start`). The entry file is `index.js`; the old `newServer.js` is gone, so a start command that names it needs updating.
- The database is Turso. The production tables were created by hand before `schema.sql` existed; the server applies `schema.sql` at startup with `CREATE TABLE IF NOT EXISTS`, which leaves existing tables as they are.
