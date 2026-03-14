# API

## Planned surface

### Health
- `GET /health`
- `GET /health/db`

### Dashboard
- `GET /api/overview/latest`
- `GET /api/sleep/latest`
- `GET /api/recovery/latest`
- `GET /api/trends?window=7d`
- `GET /api/trends?window=30d`
- `GET /api/anomalies/latest`
- `GET /api/baselines/latest`

### AI
- `GET /api/ai/daily-brief`
- `GET /api/ai/last-night`
- `GET /api/ai/recovery`
- `GET /api/ai/anomalies`
- `GET /api/ai/context?window=7d`

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
- `GET /api/integrations/oura/status`: returns local configuration state and whether a connection is currently stored
- `POST /api/integrations/oura/connect`: creates a fresh stateful authorization URL for the current API process
- `GET /api/integrations/oura/callback`: exchanges the OAuth code for tokens and stores the local Oura connection
- `POST /api/integrations/oura/disconnect`: removes the stored local Oura connection
