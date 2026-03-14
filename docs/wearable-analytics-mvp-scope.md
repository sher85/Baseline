# Wearable Analytics MVP Scope

## Project name
Working title: **wearable-analytics**

## Purpose
Build a **TypeScript-first, local-first, single-user wearable analytics platform** that ingests Oura data through the official API, stores normalized data in PostgreSQL, computes transparent recovery-oriented analytics, exposes AI-friendly endpoints, and renders the results in a browser dashboard.

This document is the execution brief for the repository.

---

## Product summary
The system should:

- [x] Sync wearable data from **Oura API** into a **local PostgreSQL** database.
- [x] Normalize vendor data into app-owned tables.
- [x] Compute baseline-aware analytics for sleep, HRV, resting HR, temperature deviation, and recovery.
- [x] Expose deterministic backend endpoints that an AI health-coach agent can read.
- [x] Render the analytics in a **Next.js** dashboard.
- [x] Support **manual sync** and **scheduled sync**.
- [ ] Support **CSV fallback ingestion** later as a stretch goal.
- [x] Stay **public-repo-safe**, with real personal data stored only locally.

---

## Experience direction
This repo should feel like a serious frontier-tech product:

- [ ] Backend quality should feel principal-engineer-grade: robust, simple, explicit, and well-structured.
- [ ] Frontend quality should feel elegant and premium: calm, sharp, readable, and recruiter-friendly.
- [ ] Analytics should feel scientifically literate, transparent, and trustworthy.
- [ ] The whole system should be impressive to an engineer at Oura or another high-bar product company.

Design language:
- clean and minimal, not sterile
- premium but restrained
- light-first presentation, with OS-adaptive theming support
- high signal density without clutter
- clear typography, generous spacing, strong information hierarchy
- charts that explain, not decorate
- modern illustration used intentionally to create atmosphere and identity

---

## Locked decisions

### Core stack
- **Language:** TypeScript everywhere
- **Frontend:** Next.js
- **Backend:** Node.js + Express
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Charts:** Recharts
- **Repo shape:** Monorepo
- **Runtime mode:** Local-first MVP
- **Cloud deployability:** Stretch goal for v1
- **Primary ingestion:** Oura API
- **Fallback ingestion:** CSV import (stretch goal)
- **User model:** Single-user in v1, multi-user later
- **AI role:** Consumer of structured analytics endpoints only
- **Data storage:** Normalized tables only; do not store raw payloads
- **Public repo:** Yes
- **Demo data:** Yes, seeded example data
- **Real user data:** Stored locally only, outside Git
- **Bluetooth access:** Out of scope
- **Medical claims:** Out of scope
- **Multi-vendor support:** Out of scope for v1

### Sync strategy
- Manual sync trigger
- Daily scheduled sync
- Incremental sync by default
- Backfill mode as a manual/admin action
- Near-real-time webhook/event-driven sync is a stretch goal, not MVP

---

## Architecture overview

### Engineering stance
The architecture should optimize for:

- deterministic backend truth
- explicit units and date semantics
- isolated vendor integration code
- app-owned normalized data
- simple API contracts
- clean upgrade path to multi-user later

### Monorepo layout
Use one repository with separate frontend and backend apps plus shared types.

```text
wearable-analytics/
  apps/
    api/
      src/
        config/
        modules/
          auth/
          sync/
          oura/
          analytics/
          recovery/
          summaries/
          jobs/
          health/
        routes/
        middleware/
        lib/
        app.ts
        server.ts
    web/
      src/
        app/
        components/
        lib/
        hooks/
        services/
        types/
  packages/
    shared/
      src/
        types/
        constants/
        schemas/
  prisma/
    schema.prisma
    seed.ts
  docs/
    architecture.md
    api.md
    analytics.md
  scripts/
  data-private/
  .env.example
  .gitignore
  package.json
  README.md
```

### Notes
- `data-private/` should be gitignored and can store local-only imports, exports, debugging files, or local fixtures.
- Shared TypeScript types should live in `packages/shared`.
- Keep backend analytics deterministic and explainable.
- The frontend should consume backend endpoints only; it should not calculate official analytics logic on its own.

---

## MVP goals

### Goal 1: Oura API sync
- [x] Authenticate against Oura API.
- [x] Sync the current user’s wearable data into PostgreSQL.
- [x] Support manual sync and scheduled sync.
- [x] Support incremental sync windows.
- [x] Log sync status, timestamps, and failures.

### Goal 2: Normalized data model
- [x] Store app-owned normalized records for daily sleep summary.
- [x] Store app-owned normalized records for daily readiness and recovery inputs.
- [x] Store app-owned normalized records for daily activity summary.
- [x] Store trends and computed metrics.
- [x] Store sync metadata.
- [x] Do **not** persist raw Oura payload blobs.

### Goal 3: Analytics engine
- [x] Compute last-night sleep summary.
- [x] Compute HRV baseline and deviation.
- [x] Compute resting heart rate baseline and deviation.
- [x] Compute temperature deviation from baseline.
- [x] Compute recovery score v1.
- [x] Generate explanation for the recovery score.
- [x] Generate deterministic anomaly flags.

### Goal 4: Dashboard
- [x] Build overview page.
- [x] Build sleep page.
- [x] Build recovery page.
- [x] Build trends page.
- [x] Build anomalies page.
- [x] Show sync status clearly.

### Goal 5: AI-friendly interface
- [x] Expose latest summary.
- [x] Expose last-night summary.
- [x] Expose baseline snapshot.
- [x] Expose latest recovery explanation.
- [x] Expose anomalies.
- [x] Expose 7-day and 30-day trend summaries.

---

## Scope boundaries

### In scope for MVP
- [x] Single-user app
- [x] Local PostgreSQL database
- [x] Oura API integration
- [x] Scheduled and manual sync
- [x] Normalized relational schema
- [x] Transparent custom recovery score
- [x] Explanation engine
- [x] Browser dashboard
- [x] Seeded demo data
- [x] Public-repo-safe structure
- [x] AI-facing summary endpoints

### Out of scope for MVP
- Bluetooth or device-level communication
- direct ring access
- multi-user support
- mobile app
- multi-vendor wearable support
- storage of raw payload blobs
- advanced habits or correlation engine
- medical advice or diagnosis
- advanced AI-generated coaching persisted to DB
- real-time webhook sync
- cloud deployment as required functionality

### Stretch goals
- [ ] CSV fallback ingestion
- [ ] Webhook or event-driven sync
- [ ] Habits and correlation analysis
- [ ] Cloud deployment
- [ ] Multi-user support
- [ ] Vendor adapters beyond Oura

---

## Product philosophy

### This is not an Oura clone
The project should **not** claim to reproduce Oura’s proprietary readiness score exactly.

Instead, it should implement:
- a **transparent custom recovery score**
- app-owned logic
- baseline-aware explanations
- user-understandable metrics

### AI is not the source of truth
The AI agent should consume structured facts from the backend.
The backend should remain the deterministic truth layer.

### Privacy
- Real personal data must remain local.
- The repository must never include actual personal health exports or secrets.
- `.env`, token files, and local data folders must be gitignored.

---

## Functional requirements

## 1. Authentication and Oura integration
The backend must support connecting a single Oura account and storing whatever credentials or tokens are needed for future syncs.

Requirements:
- [x] Connect Oura account.
- [x] Store tokens securely in local DB or local env-safe mechanism.
- [x] Refresh tokens as needed.
- [ ] Handle revoked or expired access gracefully.
- [x] Surface current connection status in API and UI.

Suggested endpoints:
- [x] `GET /api/integrations/oura/status`
- [x] `POST /api/integrations/oura/connect`
- [x] `POST /api/integrations/oura/disconnect`

---

## 2. Sync engine
The system must support:
- [x] Manual sync initiation
- [x] Scheduled daily sync
- [x] Incremental sync by time window
- [ ] Manual backfill action
- [x] Sync history visibility

Requirements:
- [x] Prevent duplicate overlapping syncs.
- [x] Log success and failure.
- [x] Log sync start and end timestamps.
- [x] Track which data ranges were synced.
- [x] Allow re-sync of a selected date range later.

Suggested endpoints:
- [x] `POST /api/sync/oura/run`
- [ ] `POST /api/sync/oura/backfill`
- [x] `GET /api/sync/history`
- [x] `GET /api/sync/status`

---

## 3. Normalized database design
Use normalized relational tables.
Do not store raw payload JSON blobs.

### Suggested initial Prisma models
These names can be adjusted, but the structure should stay close.

#### `User`
Single-user now, future-ready later.
Fields:
- `id`
- `email` or external identifier
- `createdAt`
- `updatedAt`

#### `OuraConnection`
Fields:
- `id`
- `userId`
- `accessToken`
- `refreshToken`
- `tokenExpiresAt`
- `isActive`
- `createdAt`
- `updatedAt`

#### `SyncRun`
Fields:
- `id`
- `userId`
- `source` (`oura`)
- `mode` (`manual`, `scheduled`, `backfill`)
- `status` (`pending`, `running`, `succeeded`, `failed`)
- `rangeStart`
- `rangeEnd`
- `startedAt`
- `finishedAt`
- `errorMessage` nullable
- `createdAt`
- `updatedAt`

#### `DailySleep`
Fields:
- `id`
- `userId`
- `day`
- `totalSleepSeconds`
- `timeInBedSeconds`
- `sleepEfficiency`
- `sleepLatencySeconds`
- `averageHr`
- `lowestHr`
- `averageHrv`
- `bedtimeStart`
- `bedtimeEnd`
- `createdAt`
- `updatedAt`

#### `DailyRecoveryInput`
Fields:
- `id`
- `userId`
- `day`
- `restingHeartRate`
- `hrv`
- `temperatureDeviation`
- `readinessEquivalent` nullable
- `activityBalance` nullable
- `createdAt`
- `updatedAt`

#### `DailyActivity`
Fields:
- `id`
- `userId`
- `day`
- `activeCalories`
- `totalCalories`
- `steps`
- `equivalentWalkingDistance` nullable
- `createdAt`
- `updatedAt`

#### `BaselineSnapshot`
Fields:
- `id`
- `userId`
- `day`
- `hrvBaseline`
- `restingHrBaseline`
- `temperatureBaseline`
- `sleepDurationBaseline`
- `createdAt`
- `updatedAt`

#### `RecoveryScore`
Fields:
- `id`
- `userId`
- `day`
- `score`
- `confidence`
- `hrvContribution`
- `restingHrContribution`
- `temperatureContribution`
- `sleepContribution`
- `explanationSummary`
- `createdAt`
- `updatedAt`

#### `AnomalyFlag`
Fields:
- `id`
- `userId`
- `day`
- `type`
- `severity`
- `title`
- `description`
- `createdAt`
- `updatedAt`

### Seed data
- [x] Provide fake demo records so the app can run without a real Oura account.

---

## 4. Analytics requirements

### Baselines
Compute rolling personal baselines for:
- [x] HRV
- [x] Resting heart rate
- [x] Temperature deviation
- [x] Sleep duration

Suggested default approach:
- 21-day rolling baseline for HRV and resting HR
- 7-day or 14-day baseline for sleep duration
- temperature baseline can be derived from rolling average or rolling median

The exact windows can be configuration values.

### Recovery score v1
Create a transparent app-owned score from 0 to 100.

Inputs:
- [x] HRV deviation from baseline
- [x] Resting HR deviation from baseline
- [x] Sleep duration deviation from baseline
- [x] Temperature deviation from baseline

Requirements:
- [x] Keep formula explainable.
- [x] Return a numerical score.
- [x] Return factor breakdowns.
- [x] Return a short human-readable explanation.
- [ ] Do not claim clinical accuracy.

Example explanation:
> Recovery is lower today because HRV is below your baseline and resting heart rate is elevated. Sleep was near normal. Temperature showed a mild positive deviation.

### Anomaly detection
Flag notable conditions such as:
- [x] HRV significantly below baseline
- [x] Resting HR significantly above baseline
- [x] Temperature deviation beyond threshold
- [x] Very short sleep compared with baseline

Anomalies should be deterministic and threshold-based for v1.

---

## 5. Backend API requirements

### Dashboard endpoints
- [x] `GET /api/overview/latest`
- [x] `GET /api/sleep/latest`
- [x] `GET /api/recovery/latest`
- [x] `GET /api/trends?window=7d`
- [x] `GET /api/trends?window=30d`
- [x] `GET /api/anomalies/latest`
- [x] `GET /api/baselines/latest`

### AI-facing endpoints
- [x] `GET /api/ai/daily-brief`
- [x] `GET /api/ai/last-night`
- [x] `GET /api/ai/recovery`
- [x] `GET /api/ai/anomalies`
- [x] `GET /api/ai/context?window=7d`

These endpoints should return compact, structured JSON optimized for AI consumption.

Suggested characteristics:
- [x] Minimal nesting
- [x] Deterministic field names
- [x] No raw vendor payload structures
- [x] Include dates and units clearly
- [x] Include short explanation text where useful

---

## 6. Frontend requirements

### Tech choice
Use **Next.js** for the frontend.

### Dashboard pages
At minimum:

#### Overview
Show:
- [x] Last-night sleep total
- [x] HRV versus baseline
- [x] Resting HR versus baseline
- [x] Temperature deviation
- [x] Current recovery score
- [x] Latest anomaly cards
- [x] Sync status card

#### Sleep
Show:
- [x] Sleep duration trend
- [x] Time in bed
- [x] Efficiency if available
- [ ] Bedtime consistency visuals

#### Recovery
Show:
- [x] Recovery score trend
- [x] Factor contribution breakdown
- [x] Explanation of latest score
- [x] Baseline comparison cards

#### Trends
Show:
- [x] 7-day and 30-day trend charts
- [x] HRV, resting HR, sleep, temperature

#### Anomalies
Show:
- [x] Recent anomaly list
- [x] Severity
- [x] Dates
- [x] Descriptions

### UI style
- simple, professional dashboard
- elegant and premium, not flashy
- clean and calm, but still an experience
- luxury with roughly a 60/40 scientific balance
- highly readable cards and charts
- restrained motion and strong spacing
- easy for a recruiter or engineer to understand quickly
- should feel closer to Apple Health meets a lab dashboard than a generic admin panel
- support OS-adaptive light and dark appearance, with light as the primary showcase mode

---

## 7. Job system requirements

For MVP, a lightweight scheduler is acceptable.
No queueing system is required unless implementation clearly benefits from one.

Required:
- [x] Manual sync route
- [x] Scheduled daily sync
- [x] Sync history
- [x] Duplicate-run protection
- [x] Basic retry or rerun support

Possible implementation options:
- cron-based scheduler inside backend
- lightweight scheduling library
- later upgrade path to a more robust job system

---

## 8. Local-first development requirements

### The app must run locally
Requirements:
- [x] Local PostgreSQL
- [x] Local API server
- [x] Local Next.js frontend
- [x] Local environment variables
- [x] Seed script for demo data
- [x] Dev scripts that are easy to run

Suggested npm scripts:
- [x] `dev:api`
- [x] `dev:web`
- [x] `dev`
- [x] `db:migrate`
- [x] `db:seed`
- [x] `sync:oura`
- [x] `build`
- [x] `test`

### Local private data
Create a gitignored folder such as:

```text
data-private/
```

This can hold:
- local-only exports
- local-only fixtures
- debug files
- private import artifacts

Do not commit anything from this folder.

---

## 9. Public repo requirements

The repo should be usable by someone who clones it without Oura access.

Required:
- [x] `.env.example`
- [x] Prisma schema
- [x] Seed script with fake data
- [x] Clear setup instructions
- [ ] Screenshots or demo GIFs later
- [x] Architecture notes
- [x] Clear note that real data is not included

---

## 10. Documentation requirements

Minimum docs to create:
- [x] `README.md`
- [x] `docs/architecture.md`
- [x] `docs/analytics.md`
- [x] `docs/api.md`

### README should cover
- [x] What the project is
- [x] Why it exists
- [x] Stack
- [x] Local setup
- [x] Environment variables
- [x] Demo data mode
- [x] Oura integration setup
- [x] Roadmap
- [x] Privacy note

---

## High-level milestones

## Milestone 1 - Repository foundation
Deliver:
- [x] Monorepo scaffold
- [x] Next.js frontend app
- [x] Express backend app
- [x] Shared package
- [x] Prisma and PostgreSQL setup
- [x] Base environment handling
- [x] Seed data support

Done when:
- [x] Repo installs cleanly
- [x] DB migrates
- [x] Seed data loads
- [x] Frontend and backend both run locally

---

## Milestone 2 - Oura integration and sync
Deliver:
- [x] Oura account connect flow
- [x] Token handling
- [x] Manual sync trigger
- [x] Scheduled daily sync
- [x] Sync history model and endpoints

Done when:
- [x] User can connect Oura
- [x] Backend can sync data into DB
- [x] Sync history is visible
- [ ] Local scheduled sync can run through the same pipeline

---

## Milestone 3 - Normalized storage
Deliver:
- [x] Normalized schema implementation
- [x] Mappers from Oura responses to app-owned records
- [x] Upsert and update behavior
- [x] No raw payload persistence

Done when:
- [x] Daily sleep, recovery inputs, and activity rows are populated correctly

---

## Milestone 4 - Analytics engine
Deliver:
- [x] Baseline calculations
- [x] Recovery score v1
- [x] Anomaly rules
- [x] Explanation generator
- [x] Trend aggregation helpers

Done when:
- [x] Backend can return meaningful latest and historical analytics

---

## Milestone 5 - Dashboard
Deliver:
- [x] Overview page
- [x] Sleep page
- [x] Recovery page
- [x] Trends page
- [x] Anomalies page
- [x] Sync status UI

Done when:
- [x] A local user can inspect the data visually in browser

---

## Milestone 6 - AI interface
Deliver:
- [x] AI-friendly JSON endpoints
- [x] Concise daily brief payload
- [x] Anomaly summary payload
- [x] Baseline snapshot payload
- [x] Latest recovery explanation payload

Done when:
- [x] An external AI agent can pull structured analytics without reading raw tables

---

## Milestone 7 - Stretch goals
Possible stretch items:
- [ ] CSV fallback ingestion
- [ ] Webhook or event-driven sync
- [ ] Cloud deployment
- [ ] Habits and correlation features
- [ ] Future multi-user evolution

---

## Acceptance criteria for MVP
The MVP is complete when all of the following are true:

- [x] The project runs locally from a fresh clone using seed data.
- [x] The backend and frontend run successfully.
- [x] The database schema is stable and normalized.
- [x] A real local user can connect an Oura account.
- [x] Manual sync works.
- [ ] Daily scheduled sync works.
- [x] Oura data is mapped into normalized tables.
- [x] The app computes baseline-aware analytics.
- [x] The app computes a transparent custom recovery score.
- [x] The app shows overview, recovery, sleep, trends, and anomalies in the browser.
- [x] The backend exposes AI-friendly summary endpoints.
- [x] No real personal data is committed.
- [x] No raw payloads are stored.
- [x] Documentation is clear enough for another engineer to run the project.

---

## Implementation notes for the coding agent

### Priorities
1. Build correctness before polish.
2. Keep vendor payload logic isolated to the Oura integration module.
3. Keep analytics deterministic and testable.
4. Keep types strict and explicit.
5. Optimize for clarity over cleverness.

### Coding preferences
- Use TypeScript strictly.
- Keep modules small and domain-oriented.
- Prefer explicit names over abstractions that are too early.
- Keep backend logic separated by feature domain.
- Keep all units explicit in code and API responses.

### Important non-goals
- Do not attempt Bluetooth integration.
- Do not attempt to reverse-engineer proprietary Oura algorithms exactly.
- Do not implement medical claims.
- Do not store raw payload snapshots.

---

## Recommended implementation order
- [x] Scaffold monorepo
- [x] Add Prisma schema and migrations
- [x] Add seed data
- [x] Build backend health check and DB check endpoints
- [x] Build frontend shell
- [x] Add Oura connection flow
- [x] Add manual sync
- [x] Add normalized storage
- [x] Add baselines and recovery score
- [x] Add overview dashboard
- [x] Add AI endpoints
- [x] Add scheduled sync
- [ ] Add stretch goals

---

## Final summary
This repository should become a **local-first, AI-friendly, TypeScript wearable analytics platform** that starts with Oura API ingestion, stores normalized data in PostgreSQL, computes transparent custom recovery analytics, and exposes those analytics both in a browser dashboard and in structured endpoints for an external health-coach AI agent.

The MVP should be practical, deterministic, explainable, public-repo-safe, and genuinely useful in daily personal use.
