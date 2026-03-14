# Architecture

## Principles
- deterministic backend truth
- normalized app-owned data model
- vendor-specific mapping isolated to integration modules
- frontend consumes backend contracts only
- local-first development with seeded demo data

## Repo shape
- `apps/api`: Express API, sync orchestration, analytics engine
- `apps/web`: Next.js dashboard
- `packages/shared`: shared types, constants, schemas
- `prisma`: database schema and seed script

## Early boundaries
- single-user MVP
- Oura as first vendor
- no raw payload persistence
- no medical claims
