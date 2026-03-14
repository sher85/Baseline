# Wearable Analytics MVP Scope

## Project name
Working title: **wearable-analytics**

## Purpose
Build a **TypeScript-first, local-first, single-user wearable analytics platform** that ingests Oura data through the official API, stores normalized data in PostgreSQL, computes transparent recovery-oriented analytics, exposes AI-friendly endpoints, and renders the results in a browser dashboard.

This document is the execution brief for the repository.

---

## Product summary
The system should:

- [ ] Sync wearable data from **Oura API** into a **local PostgreSQL** database.
- [ ] Normalize vendor data into app-owned tables.
- [ ] Compute baseline-aware analytics for sleep, HRV, resting HR, temperature deviation, and recovery.
- [ ] Expose deterministic backend endpoints that an AI health-coach agent can read.
- [ ] Render the analytics in a **Next.js** dashboard.
- [ ] Support **manual sync** and **scheduled sync**.
- [ ] Support **CSV fallback ingestion** later as a stretch goal.
- [ ] Stay **public-repo-safe**, with real personal data stored only locally.

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
- [ ] Authenticate against Oura API.
- [ ] Sync the current user’s wearable data into PostgreSQL.
- [ ] Support manual sync and scheduled sync.
- [ ] Support incremental sync windows.
- [ ] Log sync status, timestamps, and failures.

### Goal 2: Normalized data model
- [ ] Store app-owned normalized records for daily sleep summary.
- [ ] Store app-owned normalized records for daily readiness and recovery inputs.
- [ ] Store app-owned normalized records for daily activity summary.
- [ ] Store trends and computed metrics.
- [ ] Store sync metadata.
- [ ] Do **not** persist raw Oura payload blobs.

### Goal 3: Analytics engine
- [ ] Compute last-night sleep summary.
- [ ] Compute HRV baseline and deviation.
- [ ] Compute resting heart rate baseline and deviation.
- [ ] Compute temperature deviation from baseline.
- [ ] Compute recovery score v1.
- [ ] Generate explanation for the recovery score.
- [ ] Generate deterministic anomaly flags.

### Goal 4: Dashboard
- [ ] Build overview page.
- [ ] Build sleep page.
- [ ] Build recovery page.
- [ ] Build trends page.
- [ ] Build anomalies page.
- [ ] Show sync status clearly.

### Goal 5: AI-friendly interface
- [ ] Expose latest summary.
- [ ] Expose last-night summary.
- [ ] Expose baseline snapshot.
- [ ] Expose latest recovery explanation.
- [ ] Expose anomalies.
- [ ] Expose 7-day and 30-day trend summaries.

---

## Scope boundaries

### In scope for MVP
- [ ] Single-user app
- [ ] Local PostgreSQL database
- [ ] Oura API integration
- [ ] Scheduled and manual sync
- [ ] Normalized relational schema
- [ ] Transparent custom recovery score
- [ ] Explanation engine
- [ ] Browser dashboard
- [ ] Seeded demo data
- [ ] Public-repo-safe structure
- [ ] AI-facing summary endpoints

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
- [ ] Connect Oura account.
- [ ] Store tokens securely in local DB or local env-safe mechanism.
- [ ] Refresh tokens as needed.
- [ ] Handle revoked or expired access gracefully.
- [x] Surface current connection status in API and UI.

Suggested endpoints:
- [x] `GET /api/integrations/oura/status`
- [x] `POST /api/integrations/oura/connect`
- [x] `POST /api/integrations/oura/disconnect`

---

## 2. Sync engine
The system must support:
- [ ] Manual sync initiation
- [ ] Scheduled daily sync
- [ ] Incremental sync by time window
- [ ] Manual backfill action
- [ ] Sync history visibility

Requirements:
- [ ] Prevent duplicate overlapping syncs.
- [ ] Log success and failure.
- [ ] Log sync start and end timestamps.
- [ ] Track which data ranges were synced.
- [ ] Allow re-sync of a selected date range later.

Suggested endpoints:
- [ ] `POST /api/sync/oura/run`
- [ ] `POST /api/sync/oura/backfill`
- [ ] `GET /api/sync/history`
- [ ] `GET /api/sync/status`

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
- [ ] Provide fake demo records so the app can run without a real Oura account.

---

## 4. Analytics requirements

### Baselines
Compute rolling personal baselines for:
- [ ] HRV
- [ ] Resting heart rate
- [ ] Temperature deviation
- [ ] Sleep duration

Suggested default approach:
- 21-day rolling baseline for HRV and resting HR
- 7-day or 14-day baseline for sleep duration
- temperature baseline can be derived from rolling average or rolling median

The exact windows can be configuration values.

### Recovery score v1
Create a transparent app-owned score from 0 to 100.

Inputs:
- [ ] HRV deviation from baseline
- [ ] Resting HR deviation from baseline
- [ ] Sleep duration deviation from baseline
- [ ] Temperature deviation from baseline

Requirements:
- [ ] Keep formula explainable.
- [ ] Return a numerical score.
- [ ] Return factor breakdowns.
- [ ] Return a short human-readable explanation.
- [ ] Do not claim clinical accuracy.

Example explanation:
> Recovery is lower today because HRV is below your baseline and resting heart rate is elevated. Sleep was near normal. Temperature showed a mild positive deviation.

### Anomaly detection
Flag notable conditions such as:
- [ ] HRV significantly below baseline
- [ ] Resting HR significantly above baseline
- [ ] Temperature deviation beyond threshold
- [ ] Very short sleep compared with baseline

Anomalies should be deterministic and threshold-based for v1.

---

## 5. Backend API requirements

### Dashboard endpoints
- [ ] `GET /api/overview/latest`
- [ ] `GET /api/sleep/latest`
- [ ] `GET /api/recovery/latest`
- [ ] `GET /api/trends?window=7d`
- [ ] `GET /api/trends?window=30d`
- [ ] `GET /api/anomalies/latest`
- [ ] `GET /api/baselines/latest`

### AI-facing endpoints
- [ ] `GET /api/ai/daily-brief`
- [ ] `GET /api/ai/last-night`
- [ ] `GET /api/ai/recovery`
- [ ] `GET /api/ai/anomalies`
- [ ] `GET /api/ai/context?window=7d`

These endpoints should return compact, structured JSON optimized for AI consumption.

Suggested characteristics:
- [ ] Minimal nesting
- [ ] Deterministic field names
- [ ] No raw vendor payload structures
- [ ] Include dates and units clearly
- [ ] Include short explanation text where useful

---

## 6. Frontend requirements

### Tech choice
Use **Next.js** for the frontend.

### Dashboard pages
At minimum:

#### Overview
Show:
- [ ] Last-night sleep total
- [ ] HRV versus baseline
- [ ] Resting HR versus baseline
- [ ] Temperature deviation
- [ ] Current recovery score
- [ ] Latest anomaly cards
- [ ] Sync status card

#### Sleep
Show:
- [ ] Sleep duration trend
- [ ] Time in bed
- [ ] Efficiency if available
- [ ] Bedtime consistency visuals

#### Recovery
Show:
- [ ] Recovery score trend
- [ ] Factor contribution breakdown
- [ ] Explanation of latest score
- [ ] Baseline comparison cards

#### Trends
Show:
- [ ] 7-day and 30-day trend charts
- [ ] HRV, resting HR, sleep, temperature

#### Anomalies
Show:
- [ ] Recent anomaly list
- [ ] Severity
- [ ] Dates
- [ ] Descriptions

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
- [ ] Manual sync route
- [ ] Scheduled daily sync
- [ ] Sync history
- [ ] Duplicate-run protection
- [ ] Basic retry or rerun support

Possible implementation options:
- cron-based scheduler inside backend
- lightweight scheduling library
- later upgrade path to a more robust job system

---

## 8. Local-first development requirements

### The app must run locally
Requirements:
- [ ] Local PostgreSQL
- [ ] Local API server
- [ ] Local Next.js frontend
- [ ] Local environment variables
- [ ] Seed script for demo data
- [ ] Dev scripts that are easy to run

Suggested npm scripts:
- [ ] `dev:api`
- [ ] `dev:web`
- [ ] `dev`
- [ ] `db:migrate`
- [ ] `db:seed`
- [ ] `sync:oura`
- [ ] `build`
- [ ] `test`

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
- [ ] What the project is
- [ ] Why it exists
- [ ] Stack
- [ ] Local setup
- [ ] Environment variables
- [ ] Demo data mode
- [ ] Oura integration setup
- [ ] Roadmap
- [ ] Privacy note

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
- [ ] Frontend and backend both run locally

---

## Milestone 2 - Oura integration and sync
Deliver:
- [ ] Oura account connect flow
- [ ] Token handling
- [ ] Manual sync trigger
- [ ] Scheduled daily sync
- [ ] Sync history model and endpoints

Done when:
- [ ] User can connect Oura
- [ ] Backend can sync data into DB
- [ ] Sync history is visible

---

## Milestone 3 - Normalized storage
Deliver:
- [ ] Normalized schema implementation
- [ ] Mappers from Oura responses to app-owned records
- [ ] Upsert and update behavior
- [ ] No raw payload persistence

Done when:
- [ ] Daily sleep, recovery inputs, and activity rows are populated correctly

---

## Milestone 4 - Analytics engine
Deliver:
- [ ] Baseline calculations
- [ ] Recovery score v1
- [ ] Anomaly rules
- [ ] Explanation generator
- [ ] Trend aggregation helpers

Done when:
- [ ] Backend can return meaningful latest and historical analytics

---

## Milestone 5 - Dashboard
Deliver:
- [ ] Overview page
- [ ] Sleep page
- [ ] Recovery page
- [ ] Trends page
- [ ] Anomalies page
- [ ] Sync status UI

Done when:
- [ ] A local user can inspect the data visually in browser

---

## Milestone 6 - AI interface
Deliver:
- [ ] AI-friendly JSON endpoints
- [ ] Concise daily brief payload
- [ ] Anomaly summary payload
- [ ] Baseline snapshot payload
- [ ] Latest recovery explanation payload

Done when:
- [ ] An external AI agent can pull structured analytics without reading raw tables

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

- [ ] The project runs locally from a fresh clone using seed data.
- [ ] The backend and frontend run successfully.
- [ ] The database schema is stable and normalized.
- [ ] A real local user can connect an Oura account.
- [ ] Manual sync works.
- [ ] Daily scheduled sync works.
- [ ] Oura data is mapped into normalized tables.
- [ ] The app computes baseline-aware analytics.
- [ ] The app computes a transparent custom recovery score.
- [ ] The app shows overview, recovery, sleep, trends, and anomalies in the browser.
- [ ] The backend exposes AI-friendly summary endpoints.
- [ ] No real personal data is committed.
- [ ] No raw payloads are stored.
- [ ] Documentation is clear enough for another engineer to run the project.

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
- [ ] Add Prisma schema and migrations
- [x] Add seed data
- [x] Build backend health check and DB check endpoints
- [x] Build frontend shell
- [ ] Add Oura connection flow
- [ ] Add manual sync
- [ ] Add normalized storage
- [ ] Add baselines and recovery score
- [ ] Add overview dashboard
- [ ] Add AI endpoints
- [ ] Add scheduled sync
- [ ] Add stretch goals

---

## Final summary
This repository should become a **local-first, AI-friendly, TypeScript wearable analytics platform** that starts with Oura API ingestion, stores normalized data in PostgreSQL, computes transparent custom recovery analytics, and exposes those analytics both in a browser dashboard and in structured endpoints for an external health-coach AI agent.

The MVP should be practical, deterministic, explainable, public-repo-safe, and genuinely useful in daily personal use.
