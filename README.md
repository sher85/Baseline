# wearable-analytics

Local-first wearable analytics platform focused on transparent recovery insights, seeded demo data, and a premium recruiter-friendly dashboard.

## Status
Milestone 1 foundation is scaffolded. The repo now includes:

- npm workspaces for `api`, `web`, and `shared`
- Prisma schema and seed foundation
- Express API shell
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

## Planned setup
1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Run `npm run db:generate`.
4. Run `npm run db:migrate`.
5. Run `npm run db:seed`.
6. Run `npm run dev`.

## Notes
- Real personal data should stay local and never be committed.
- The public repo should remain usable with seeded demo data only.
- Oura integration will be added on top of the current foundation.
