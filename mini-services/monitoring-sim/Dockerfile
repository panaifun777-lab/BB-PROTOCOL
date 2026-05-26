# =============================================================================
# Dockerfile — Monitoring Simulation Service
# =============================================================================

FROM oven/bun:1.1.38-slim AS runner

WORKDIR /app

# Copy package files
COPY mini-services/monitoring-sim/package.json ./
COPY mini-services/monitoring-sim/bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source
COPY mini-services/monitoring-sim/index.ts ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3004

# Expose port
EXPOSE 3004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3004/health || exit 1

# Start the service
CMD ["bun", "run", "index.ts"]
