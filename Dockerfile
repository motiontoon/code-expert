FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci --production=false

# Build
FROM deps AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

# Production
FROM base AS runner
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 forge && \
    adduser --system --uid 1001 forge

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# Create data directory
RUN mkdir -p /app/data /app/logs && chown -R forge:forge /app

USER forge

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
