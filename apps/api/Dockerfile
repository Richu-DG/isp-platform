FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

# Install deps
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules 2>/dev/null || true
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true
COPY tsconfig.base.json ./
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN cd packages/database && pnpm generate
RUN cd packages/database && npx tsc
RUN cd packages/shared && npx tsc
RUN cd apps/api && pnpm build

# Run
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@9

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

EXPOSE 3001
CMD ["node", "apps/api/dist/main"]
