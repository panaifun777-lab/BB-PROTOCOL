# =============================================================================
# Dockerfile — Resonance Simulation Service
# =============================================================================

FROM oven/bun:1.1.38-slim AS runner

WORKDIR /app

# Copy package files
COPY mini-services/resonance-sim/package.json ./
COPY mini-services/resonance-sim/bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source
COPY mini-services/resonance-sim/index.ts ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3003

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3003/health || exit 1

# Start the service
CMD ["bun", "run", "index.ts"]
