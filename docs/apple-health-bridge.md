# Apple Health Bridge

## Architecture

Baseline cannot read Apple Health directly from the Mac-hosted API.

The current design is:

1. `apps/ios/BaselineHealthBridge`
   A small SwiftUI iPhone companion app
2. HealthKit
   Local data access on iPhone
3. `POST /api/integrations/apple-health/ingest`
   Token-protected LAN-only ingestion endpoint
4. PostgreSQL
   Durable source of truth for raw Apple Health batches plus normalized records
5. Baseline web UI
   Reads normalized data from the API

## What syncs in this pass

- workouts
- workout calories
- workout distance
- steps
- active energy
- resting heart rate
- HRV (SDNN)
- VO2 max
- body weight
- body fat percentage
- sleep category samples
- walking/running distance

Workout routes are scaffolded in the payload model and storage path, but the current iPhone bridge sends an empty route array until route extraction is added.

## Server setup

Add a shared API bearer token to `.env`:

```env
API_TOKEN="choose-a-long-random-local-token"
```

Then run the normal server flow:

```bash
npm run db:generate
npm run db:migrate
npm run dev
```

Relevant routes:

- `GET /api/integrations/apple-health/status`
- `POST /api/integrations/apple-health/ingest`
- `GET /api/activity/latest`

Both Apple Health integration routes require:

```http
Authorization: Bearer <API_TOKEN>
```

## iPhone bridge setup

The bridge app lives in:

- [apps/ios/BaselineHealthBridge](/Volumes/Sage%204%20TB/Users/mauriciocastro/Documents/GitHub/Baseline/apps/ios/BaselineHealthBridge)

This repo currently ships the Swift sources plus an `XcodeGen` project spec:

- `project.yml`
- `Sources/`
- `Support/`

To generate the Xcode project:

```bash
cd apps/ios/BaselineHealthBridge
xcodegen generate
```

Open the generated `.xcodeproj` in Xcode, choose your free Apple ID signing team, and build to your iPhone.

## HealthKit permissions

The bridge app requests read access for:

- workouts
- workout routes
- step count
- active energy burned
- heart rate
- resting heart rate
- heart rate variability
- VO2 max
- body mass
- body fat percentage
- walking/running distance
- sleep analysis

## LAN-only configuration

Use your Mac mini or development Mac’s local network IP in the iPhone app, not `localhost`.

Example:

```text
http://192.168.1.10:3001
```

`localhost` on the iPhone points to the phone itself, not your Mac.

## Sideloading

Preferred path: Sideloadly with a free Apple Developer account.

Important practical constraint:

- the app may expire roughly every 7 days
- expiration is expected in this setup
- Baseline is designed to recover later

Recovery behavior:

- the app stores `lastSuccessfulSyncAt` locally
- it does not advance that timestamp unless the server confirms durable storage
- when the app is reinstalled or reopened later, it syncs again from the last successful cursor with a built-in overlap window
- server ingestion is idempotent, so replaying recent records is safe

## Sync behavior

- sync runs on app open
- sync can be triggered manually with `Sync Now`
- background sync is best-effort only
- frequency options are:
  - manual only
  - every 6 hours
  - every 12 hours
  - every 24 hours

The iOS scheduler is intentionally opportunistic, not cron-like. If background execution is skipped, the app catches up the next time it is opened.

## Data storage model

Raw-ish durable storage:

- `AppleHealthSyncBatch`
- `AppleHealthRecord`

App-facing normalized storage:

- `WorkoutSession`
- existing Baseline activity summary queries, now preferring Apple Health workout and daily movement data when present

## Current limitations

- workout route extraction is scaffolded but not yet populated
- Apple Health sleep, body composition, and cardio-fitness data are stored generically first and not yet deeply visualized in the Baseline UI
- activity UI is intentionally minimal in this pass and focused on frequency, calories, and workout type
