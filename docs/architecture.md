# Architecture

## System shape
The product is deliberately split into four layers:

1. Oura integration
   OAuth, token storage, refresh, and API fetches
2. Normalized storage
   app-owned daily tables in PostgreSQL
3. Analytics engine
   baselines, recovery score, anomaly rules, summary shaping
4. Presentation and AI interfaces
   dashboard pages and compact JSON endpoints

That split is the core architectural choice in the repo. It keeps vendor coupling low and keeps the backend as the deterministic source of truth.

## Principles
- deterministic backend truth
- explicit units and date semantics
- vendor-specific mapping isolated to integration modules
- normalized app-owned records instead of raw payload blobs
- frontend consumes backend contracts only
- local-first development with seeded demo data

## Repo shape
- `apps/api`
  Express API, Oura integration, sync orchestration, analytics engine, AI routes
- `apps/web`
  Next.js dashboard with overview, sleep, recovery, trends, and anomalies surfaces
- `packages/shared`
  shared types and schemas
- `prisma`
  schema, migrations, seed script
- `docs`
  architecture, API, analytics, scope

## Data flow
1. User connects Oura through OAuth
2. API stores local Oura tokens
3. Manual or scheduled sync fetches Oura daily data
4. Integration code maps vendor responses into normalized tables:
   - `DailySleep`
   - `DailyRecoveryInput`
   - `DailyActivity`
   - `SyncRun`
5. Analytics services compute:
   - `BaselineSnapshot`
   - `RecoveryScore`
   - `AnomalyFlag`
6. Summary services shape data for:
   - dashboard endpoints
   - AI-facing endpoints

## Why normalized storage matters
The system does not treat Oura as the application database.

Benefits:
- analytics remain app-owned
- vendor payload shape changes stay isolated
- future multi-vendor support is possible
- AI endpoints stay stable and interpretable

## Analytics stance
The repo does not attempt to clone Oura’s proprietary readiness score.

Instead it computes:
- rolling personal baselines
- a transparent recovery score
- deterministic anomaly rules
- explanation text tied to real baseline deltas

This makes the product more credible than a black-box score imitation.

## Current boundaries
- single-user MVP
- Oura as first vendor
- no raw payload persistence
- no medical claims
- local-first runtime

## Next natural evolution
- route-level integration tests
- stronger scheduler observability
- deployment guidance
- vendor adapters beyond Oura
