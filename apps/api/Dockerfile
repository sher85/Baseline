# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

FROM deps AS builder
WORKDIR /app

ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wearable_analytics

COPY tsconfig.base.json prisma.config.ts ./
COPY prisma ./prisma
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY openapi ./openapi

RUN npm run db:generate
RUN npm run openapi:generate
RUN npm run build --workspace @wearable-analytics/shared
RUN npm run build --workspace @wearable-analytics/api

FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci --omit=dev

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/openapi ./openapi

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health >/dev/null || exit 1

CMD ["node", "apps/api/dist/server.js"]
