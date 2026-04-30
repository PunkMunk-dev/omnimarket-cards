FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ---- deps stage ----
FROM base AS deps
COPY package.json package-lock.json* ./
# Copy shared package
COPY ../../packages/shared ./packages/shared
RUN npm ci --workspace=packages/shared
RUN npm ci --only=production

# ---- builder stage ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN npm run build

# ---- runner stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker

COPY --from=builder --chown=worker:nodejs /app/dist ./dist
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/package.json ./package.json

USER worker

EXPOSE 3000

CMD ["node", "--experimental-specifier-resolution=node", "dist/worker.js"]
