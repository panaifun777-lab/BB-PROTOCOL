# =============================================================================
# Dockerfile — Cognitive Avatar Protocol (BB System)
# Multi-stage build for Next.js 16 with Bun runtime
# =============================================================================

# ── Stage 1: Install Dependencies ─────────────────────────────────────────────
FROM oven/bun:1.1.38 AS deps

ARG NODE_ENV=production

WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lock ./
COPY prisma ./prisma/

# Install dependencies
RUN bun install --frozen-lockfile --production=false

# Generate Prisma Client
RUN bun run db:generate

# ── Stage 2: Build Next.js Application ───────────────────────────────────────
FROM oven/bun:1.1.38 AS builder

ARG NODE_ENV=production
ARG VERSION=2.2.0

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy source code
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV VERSION=${VERSION}

# Build Next.js application
RUN bun run build

# ── Stage 3: Production Image ────────────────────────────────────────────────
FROM oven/bun:1.1.38-slim AS runner

ARG VERSION=2.2.0

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV VERSION=${VERSION}

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only the necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/db ./db
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Set correct ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["bun", "server.js"]
