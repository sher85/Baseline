# API

## Planned surface

### Health
- `GET /health`
- `GET /health/db`

### Dashboard
- `GET /api/overview/latest`
- `GET /api/sleep/latest`
- `GET /api/recovery/latest`
- `GET /api/recovery/latest/detail`
- `GET /api/trends?window=7d`
- `GET /api/trends?window=30d`
- `GET /api/anomalies/latest`
- `GET /api/anomalies/recent`
- `GET /api/baselines/latest`

### AI
- `GET /api/ai/daily-brief`
- `GET /api/ai/last-night`
- `GET /api/ai/recovery`
- `GET /api/ai/anomalies`
- `GET /api/ai/context?window=7d`
- `GET /api/ai/context?window=30d`

### Integration and sync
- `GET /api/integrations/oura/status`
- `POST /api/integrations/oura/connect`
- `GET /api/integrations/oura/callback`
- `POST /api/integrations/oura/disconnect`
- `POST /api/sync/oura/run`
- `POST /api/sync/oura/backfill`
- `GET /api/sync/history`
- `GET /api/sync/status`

## Oura auth behavior
- `GET /api/integrations/oura/status`: returns local configuration state, whether a connection is currently active, and whether the local user needs to reconnect
- `POST /api/integrations/oura/connect`: creates a fresh stateful authorization URL for the current API process
- `GET /api/integrations/oura/callback`: exchanges the OAuth code for tokens and stores the local Oura connection
- `POST /api/integrations/oura/disconnect`: removes the stored local Oura connection
- if Oura rejects a stored token during refresh or API access, the connection is marked inactive so the next status check can surface `needsReconnect: true`

## Sync behavior
- `POST /api/sync/oura/run`: runs an immediate manual sync against Oura and stores normalized sleep, readiness, and activity data
- request body accepts optional `startDate`, `endDate`, and `lookbackDays`
- if no date range is supplied, the sync defaults to an incremental window
- `POST /api/sync/oura/backfill`: runs an explicit historical backfill and requires `startDate` plus `endDate`
- returns `401` with `reauthenticationRequired: true` when the local Oura authorization is missing, expired, or revoked
- `GET /api/sync/status`: returns whether a sync is running and the latest sync run
- `GET /api/sync/history`: returns recent sync runs for the local user
- scheduled sync reuses the same ingestion path and records `mode: scheduled` in `SyncRun`

## Analytics behavior
- `GET /api/overview/latest`: returns the latest dashboard-ready recovery summary, anomaly notes, sync state, and connection state
- `GET /api/sleep/latest`: returns the latest sleep summary with baseline delta, timing, nightly vitals, and bedtime consistency metrics
- `GET /api/baselines/latest`: computes or returns the latest rolling baseline snapshot
- `GET /api/recovery/latest`: computes or returns the latest recovery score and explanation
- `GET /api/recovery/latest/detail`: returns the latest recovery score plus factor breakdowns, current values, baselines, and anomalies
- `GET /api/trends?window=7d|30d`: returns compact historical series for recovery, sleep, HRV, resting HR, temperature deviation, steps, and anomaly counts
- `GET /api/anomalies/latest`: returns deterministic anomaly flags for the latest day
- `GET /api/anomalies/recent?limit=20`: returns recent anomaly history ordered by day and severity

## AI behavior
- `GET /api/ai/daily-brief`: returns a compact daily status payload for an AI agent, including score, sleep, deltas, anomalies, sync state, and a summary sentence
- `GET /api/ai/last-night`: returns the latest sleep summary in flat, AI-friendly fields
- `GET /api/ai/recovery`: returns the latest recovery score, baselines, contributions, factor breakdowns, and explanation
- `GET /api/ai/anomalies`: returns latest anomaly counts plus recent anomaly history
- `GET /api/ai/context?window=7d|30d`: returns compact historical context for recent days with deterministic series fields
