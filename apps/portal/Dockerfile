FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/portal/package.json ./apps/portal/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/portal ./apps/portal
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd packages/shared && npx tsc
RUN cd apps/portal && pnpm build

FROM node:20-alpine AS runner
WORKDIR /app/apps/portal
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=builder /app/apps/portal/.next ./.next
COPY --from=builder /app/apps/portal/public ./public 2>/dev/null || true
COPY --from=builder /app/apps/portal/package.json ./
COPY --from=builder /app/apps/portal/node_modules ./node_modules

EXPOSE 3002
CMD ["node_modules/.bin/next", "start", "-p", "3002"]
