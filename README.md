# wearable-analytics

Local-first wearable analytics platform for transparent recovery intelligence.

This repo ingests Oura data through the official API, stores normalized records in PostgreSQL, computes deterministic recovery analytics, exposes AI-friendly endpoints, and renders the results in a premium Next.js dashboard.

## Product preview

<p align="center">
  <img src="./docs/images/overview-screenshot.png" alt="Baseline overview dashboard screenshot" width="100%" />
</p>

<p align="center">
  <img src="./docs/images/sleep-screenshot.png" alt="Baseline sleep surface screenshot" width="72%" />
</p>

<p align="center">
  <img src="./docs/images/anomalies-screenshot.png" alt="Baseline anomalies surface screenshot" width="72%" />
</p>

## System flow

```mermaid
flowchart LR
  Oura[Oura API]
  OAuth[OAuth + token refresh]
  Sync[Sync engine<br/>manual / scheduled / backfill]
  DB[(PostgreSQL<br/>normalized tables)]
  Analytics[Analytics engine<br/>baselines / recovery / anomalies]
  API[Express API<br/>dashboard + AI endpoints]
  Web[Next.js dashboard]
  AI[AI consumer]

  Oura --> OAuth
  OAuth --> Sync
  Sync --> DB
  DB --> Analytics
  Analytics --> API
  API --> Web
  API --> AI
```

GitHub renders the Mermaid diagram cleanly. Some local Markdown previewers may not.

## Why this exists
- prove a principal-engineer-grade backend for wearable data
- show product taste on the frontend without losing scientific clarity
- keep the analytics explicit, inspectable, and app-owned
- stay public-repo-safe while supporting real local personal data

## What is working
- Oura OAuth connect and disconnect
- manual Oura sync into normalized PostgreSQL tables
- scheduled Oura sync orchestration
- rolling baselines for HRV, resting HR, sleep duration, and temperature deviation
- recovery score v1 with factor breakdowns
- deterministic anomaly detection
- overview, sleep, recovery, trends, and anomalies dashboard pages
- AI-facing summary endpoints
- backend tests for analytics math, anomaly rules, recovery scoring, and sync window logic

## Stack
- TypeScript
- Next.js
- Express
- Prisma
- PostgreSQL
- Recharts
- Node `node:test` with `tsx`

## Architecture at a glance
- `apps/api`
  Oura integration, sync orchestration, analytics engine, AI-facing JSON
- `apps/web`
  premium dashboard surface built on backend contracts only
- `packages/shared`
  shared types and schemas
- `prisma`
  schema, migrations, seed script
- `docs`
  architecture, API, analytics, and scoped build brief

More detail:
- [architecture.md](/Volumes/Sage%204%20TB/Users/mauriciocastro/Documents/GitHub/Untitled/Baseline/docs/architecture.md)
- [api.md](/Volumes/Sage%204%20TB/Users/mauriciocastro/Documents/GitHub/Untitled/Baseline/docs/api.md)
- [analytics.md](/Volumes/Sage%204%20TB/Users/mauriciocastro/Documents/GitHub/Untitled/Baseline/docs/analytics.md)

## Quick start
1. Copy `.env.example` to `.env`
2. Install dependencies
3. Generate Prisma client
4. Run migrations
5. Seed demo data
6. Start API and web

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:api
npm run dev:web
```

## Local app run
For the normal local app flow, run both services and use the web app as the public entrypoint:

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Recommended local URLs:
- app: `http://localhost:3000`
- API docs: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi/openapi.json`
- direct API health: `http://localhost:4000/health`

## Environment
Core local values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wearable_analytics"
API_PORT=4000
WEB_PORT=3000
WEB_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
API_INTERNAL_BASE_URL="http://localhost:4000"
API_PROXY_TARGET="http://localhost:4000"
SYNC_SCHEDULE_ENABLED="true"
SYNC_SCHEDULE_CRON="0 6 * * *"
SYNC_SCHEDULE_RUN_ON_START="false"
```

Oura OAuth values:

```env
OURA_CLIENT_ID="your_oura_client_id"
OURA_CLIENT_SECRET="your_oura_client_secret"
OURA_REDIRECT_URI="http://localhost:3000/api/integrations/oura/callback"
OURA_SCOPES="daily email personal"
```

## Oura setup
This project works with seeded demo data, but the real product flow is local Oura connection plus sync.

1. Create an Oura OAuth application in the Oura developer dashboard
2. Use the server-side flow
3. Register this exact redirect URI:

```text
http://localhost:3000/api/integrations/oura/callback
```

4. Add your client ID and client secret to `.env`
5. Start the API and web
6. Generate an auth URL:

```bash
curl -s -X POST http://localhost:4000/api/integrations/oura/connect
```

7. Open the returned `authorizationUrl` in your browser
8. Confirm connection:

```bash
curl http://localhost:4000/api/integrations/oura/status
```

Expected result: `connected: true`

Important notes:
- use the URL returned by `/api/integrations/oura/connect`, not Oura’s dashboard example URL
- the redirect URI must match exactly
- if you get `invalid_state`, generate a fresh auth URL from the currently running API process
- if Oura later rejects the stored token, the app will mark the connection inactive and require a reconnect before the next sync

## Local verification tour
Health and setup:

```bash
curl http://localhost:4000/health
curl http://localhost:4000/health/db
curl http://localhost:4000/api/integrations/oura/status
curl http://localhost:4000/api/sync/status
```

Dashboard routes:
- `http://localhost:3000/`
- `http://localhost:3000/sleep`
- `http://localhost:3000/recovery`
- `http://localhost:3000/trends`
- `http://localhost:3000/anomalies`

Analytics routes:

```bash
curl http://localhost:4000/api/overview/latest
curl http://localhost:4000/api/sleep/latest
curl http://localhost:4000/api/recovery/latest
curl http://localhost:4000/api/recovery/latest/detail
curl "http://localhost:4000/api/trends?window=7d"
curl "http://localhost:4000/api/trends?window=30d"
curl http://localhost:4000/api/anomalies/recent
```

Backfill route:

```bash
curl -X POST http://localhost:4000/api/sync/oura/backfill \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2026-03-01","endDate":"2026-03-03"}'
```

AI routes:

```bash
curl http://localhost:4000/api/ai/daily-brief
curl http://localhost:4000/api/ai/last-night
curl http://localhost:4000/api/ai/recovery
curl http://localhost:4000/api/ai/anomalies
curl "http://localhost:4000/api/ai/context?window=7d"
```

Tests:

```bash
npm run test --workspace @wearable-analytics/api
```

Reconnect check:

```bash
curl http://localhost:4000/api/integrations/oura/status
```

If the response shows `needsReconnect: true`, reconnect Oura locally before running the next sync.

## Scheduled sync
The API supports a daily scheduled Oura sync that reuses the same ingestion path as manual sync.

Notes:
- `SYNC_SCHEDULE_CRON` currently supports daily expressions in the form `minute hour * * *`
- scheduled runs are stored in `SyncRun` with `mode: scheduled`
- if Oura is not connected locally, the scheduler logs a skip instead of failing startup

To test it locally:
1. Temporarily set `SYNC_SCHEDULE_RUN_ON_START="true"` in `.env`
2. Start the API
3. Check:

```bash
curl http://localhost:4000/api/sync/status
curl http://localhost:4000/api/sync/history
```

4. Confirm you see a run with `mode: "scheduled"`
5. Set `SYNC_SCHEDULE_RUN_ON_START` back to `false`

Verified locally in development:
- startup scheduled sync reuses the same pipeline as manual sync
- sync history records `mode: "scheduled"`

## OpenAPI
This repo generates its OpenAPI spec from [apps/api/src/openapi/spec.ts](/Volumes/Sage%204%20TB/Users/mauriciocastro/Documents/GitHub/Baseline/apps/api/src/openapi/spec.ts), backed by shared Zod contracts in [apps/api/src/contracts/api-contract.ts](/Volumes/Sage%204%20TB/Users/mauriciocastro/Documents/GitHub/Baseline/apps/api/src/contracts/api-contract.ts). The generated artifact always lives at [openapi/openapi.json](/Volumes/Sage%204%20TB/Users/mauriciocastro/Documents/GitHub/Baseline/openapi/openapi.json).

The app now exposes the spec and docs in two convenient ways:
- web host: `http://localhost:3000/docs` and `http://localhost:3000/openapi/openapi.json`
- direct API host: `http://localhost:4000/docs` and `http://localhost:4000/openapi/openapi.json`

Regenerate the spec with:

```bash
npm run openapi:generate
```

Validate the generated file with:

```bash
npm run openapi:validate
```

GitHub Actions now runs generation and validation on pushes to `main` and pull requests targeting `main`. A separate publish workflow also runs on pushes to `main`, regenerates and validates the spec, then copies `openapi/openapi.json` into `services/event-scout/openapi.json` in `sher85/openclaw-api-catalog` using the `API_CATALOG_TOKEN` repository secret and only commits when that file changed.

## Docker
The repo is containerized as a small app stack:
- `web`: Next.js app on port `3000`
- `api`: Express API on port `4000`
- `db`: PostgreSQL on port `5432`

Build the images manually:

```bash
docker build -f apps/api/Dockerfile -t baseline-api .
docker build -f apps/web/Dockerfile -t baseline-web .
```

Run them manually if you already have PostgreSQL available:

```bash
docker run --rm -p 4000:4000 \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/wearable_analytics" \
  -e WEB_APP_URL="http://localhost:3000" \
  -e OURA_REDIRECT_URI="http://localhost:3000/api/integrations/oura/callback" \
  baseline-api

docker run --rm -p 3000:3000 \
  -e API_INTERNAL_BASE_URL="http://host.docker.internal:4000" \
  -e API_PROXY_TARGET="http://host.docker.internal:4000" \
  baseline-web
```

## Docker Compose
`docker-compose.yml` is the easiest local container flow because it brings up PostgreSQL, applies Prisma migrations, then starts the API and web app with healthchecks.

```bash
docker compose up --build
```

Compose URLs:
- app: `http://localhost:3000`
- docs: `http://localhost:3000/docs`
- direct API: `http://localhost:4000`

If you want live Oura OAuth through Compose, set `OURA_CLIENT_ID` and `OURA_CLIENT_SECRET` in your shell or `.env` before starting the stack.

## Kong
Recommended public host:

```text
baseline.localhost
```

Recommended deployment shape:
- expose only the `web` service through Kong
- let the Next.js app proxy `/api/*` and `/openapi/*` to the internal API service
- keep the API container private to the app network unless you have a separate reason to expose it

Why host-based routing is preferred here:
- the web app expects to live at the root of a host, not under a prefixed subpath
- Oura OAuth callback URLs are cleaner and safer as `https://baseline.example.com/api/...`
- Redoc and OpenAPI assets work cleanly from root-relative URLs
- host-based routing avoids extra path-prefix rewrite rules for Next.js pages, API calls, and docs assets

Do not configure this app behind Kong as a path route like `/baseline`. Use a dedicated host or subdomain instead.

## Demo script
If you want to show the project to another engineer, this is the clean path:
1. Open the dashboard overview
2. Show the real recovery, sleep, and anomaly pages
3. Trigger `POST /api/sync/oura/run`
4. Show normalized sync history
5. Show `GET /api/ai/daily-brief`
6. Explain that the AI reads structured facts from the backend rather than raw vendor payloads

## Testing philosophy
The backend uses Node’s built-in test runner through `tsx`.

That gives us:
- lightweight TypeScript-native unit tests
- no Jest/Vitest overhead for the backend
- straightforward expansion into integration coverage later

## Privacy
- real personal data stays local
- `.env` stays out of Git
- no raw vendor payloads are stored
- the public repo remains usable with seeded demo data

If a secret was ever exposed publicly, rotate it immediately.
