# wearable-analytics

Local-first wearable analytics platform focused on transparent recovery insights, seeded demo data, and a premium recruiter-friendly dashboard.

## Status
The repo now includes:

- npm workspaces for `api`, `web`, and `shared`
- Prisma schema and seed foundation
- Express API shell with Oura OAuth connection flow
- Next.js app shell
- shared domain types and schemas
- starter docs and local-first environment config

## Stack
- TypeScript
- Next.js
- Express
- Prisma
- PostgreSQL
- Recharts

## Product direction
- local-first and privacy-respecting
- deterministic backend truth
- transparent, baseline-aware recovery analytics
- elegant premium dashboard with a scientific edge

## Local setup
1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Run `npm run db:generate`.
4. Run `npm run db:migrate`.
5. Run `npm run db:seed`.
6. Run `npm run dev:api`.
7. Run `npm run dev:web`.

## Environment variables
Core local values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wearable_analytics"
API_PORT=4000
WEB_PORT=3000
WEB_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
SYNC_SCHEDULE_ENABLED="true"
SYNC_SCHEDULE_CRON="0 6 * * *"
SYNC_SCHEDULE_RUN_ON_START="false"
```

Oura OAuth values:

```env
OURA_CLIENT_ID="your_oura_client_id"
OURA_CLIENT_SECRET="your_oura_client_secret"
OURA_REDIRECT_URI="http://localhost:4000/api/integrations/oura/callback"
OURA_SCOPES="daily email personal"
```

## Oura integration setup
This repo supports seeded demo data without Oura, but a real local connection requires an Oura OAuth application.

1. Create an Oura API application in the Oura developer dashboard.
2. Use the server-side flow.
3. Add this exact redirect URI in the Oura app settings:

```text
http://localhost:4000/api/integrations/oura/callback
```

4. Copy the Oura client ID and client secret into `.env`.
5. Start the local servers:

```bash
npm run dev:api
npm run dev:web
```

6. Generate a fresh authorization URL from the local API:

```bash
curl -s -X POST http://localhost:4000/api/integrations/oura/connect
```

7. Open the returned `authorizationUrl` in your browser and approve access.
8. Verify the connection:

```bash
curl http://localhost:4000/api/integrations/oura/status
```

Successful connection should return JSON with `connected: true`.

### Important Oura auth notes
- Use the authorization URL returned by `/api/integrations/oura/connect`, not the example URL shown in the Oura dashboard.
- The redirect URI must match exactly.
- The auth URL is stateful and short-lived. If you restart the API or wait too long, generate a fresh URL.
- If the browser lands on `?oura=invalid_state`, generate a new authorization URL and retry with the currently running API process.

## Useful local checks

```bash
curl http://localhost:4000/health
curl http://localhost:4000/health/db
curl http://localhost:4000/api/integrations/oura/status
```

## Scheduled sync
The API supports a daily scheduled Oura sync that reuses the same ingestion path as manual sync.

Scheduler env:

```env
SYNC_SCHEDULE_ENABLED="true"
SYNC_SCHEDULE_CRON="0 6 * * *"
SYNC_SCHEDULE_RUN_ON_START="false"
```

Notes:
- `SYNC_SCHEDULE_CRON` currently supports daily expressions in the form `minute hour * * *`
- scheduled runs are stored in `SyncRun` with `mode: scheduled`
- if Oura is not connected locally, the scheduler logs a skip instead of failing startup

Local scheduler test:
1. Set `SYNC_SCHEDULE_RUN_ON_START="true"` in `.env`
2. Start the API with `npm run dev:api`
3. Check `curl http://localhost:4000/api/sync/status`
4. Check `curl http://localhost:4000/api/sync/history`
5. Set `SYNC_SCHEDULE_RUN_ON_START` back to `false` after testing

## Notes
- Real personal data should stay local and never be committed.
- The public repo should remain usable with seeded demo data only.
- `.env` must stay out of Git.
- If secrets were ever exposed publicly, rotate them immediately.
