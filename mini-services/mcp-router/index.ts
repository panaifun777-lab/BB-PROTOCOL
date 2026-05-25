import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3008

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ── Types ────────────────────────────────────────────────────

interface Provider {
  providerId: string
  name: string
  stake: number // AFC tokens staked
  latencyScore: number // 0-100 (lower latency = higher score)
  reputation: number // 0-100
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  slashed: boolean
  slashCount: number
  registeredAt: number
}

interface RoutedRequest {
  requestId: string
  taskType: string
  providerId: string
  providerName: string
  routedAt: number
  respondedAt: number | null
  responseValid: boolean | null
  latency: number | null
}

interface ProviderSlashing {
  providerId: string
  providerName: string
  reason: string
  slashAmount: number
  timestamp: number
}

interface LeaderboardEntry {
  rank: number
  providerId: string
  name: string
  compositeScore: number
  latencyScore: number
  stakeWeight: number
  reputation: number
  totalRequests: number
  successRate: number
}

// ── Deterministic Simulation State ───────────────────────────

let tickCount = 0
let requestCounter = 0

// 3 providers: CognitionCore, NeuralPath, SynapticLink
const providers: Map<string, Provider> = new Map()

const PROVIDER_CONFIGS: Omit<Provider, 'totalRequests' | 'successfulRequests' | 'failedRequests' | 'slashed' | 'slashCount' | 'registeredAt'>[] = [
  {
    providerId: 'provider-cognition-core',
    name: 'CognitionCore',
    stake: 50000,
    latencyScore: 85,
    reputation: 92,
  },
  {
    providerId: 'provider-neural-path',
    name: 'NeuralPath',
    stake: 35000,
    latencyScore: 78,
    reputation: 88,
  },
  {
    providerId: 'provider-synaptic-link',
    name: 'SynapticLink',
    stake: 25000,
    latencyScore: 72,
    reputation: 75,
  },
]

const TASK_TYPES = [
  'cognition_inference',
  'skill_execution',
  'data_aggregation',
  'model_training',
  'response_generation',
]

const recentRequests: RoutedRequest[] = []
const recentSlashings: ProviderSlashing[] = []

// ── Routing Algorithm ────────────────────────────────────────
// Composite score: latency(40%) + stake(30%) + reputation(30%)

function calculateCompositeScore(provider: Provider): number {
  const stakeWeight = Math.min(provider.stake / 50000, 1) * 100 // Normalize to max 50k stake
  const composite = provider.latencyScore * 0.4 + stakeWeight * 0.3 + provider.reputation * 0.3
  return Math.round(composite * 100) / 100
}

function selectProvider(taskType: string): Provider | null {
  const activeProviders = Array.from(providers.values()).filter(p => !p.slashed)
  if (activeProviders.length === 0) return null

  // Weighted selection based on composite score
  const scores = activeProviders.map(p => ({
    provider: p,
    score: calculateCompositeScore(p),
  }))

  // Deterministic selection: use tick count to rotate among top providers
  const normalizedIndex = tickCount % scores.length

  // Sort by score descending, pick based on tick rotation
  scores.sort((a, b) => b.score - a.score)
  return scores[normalizedIndex % scores.length].provider
}

function getLeaderboard(): LeaderboardEntry[] {
  const entries = Array.from(providers.values())
    .map(p => {
      const compositeScore = calculateCompositeScore(p)
      const successRate = p.totalRequests > 0
        ? Math.round((p.successfulRequests / p.totalRequests) * 100)
        : 0
      const stakeWeight = Math.min(p.stake / 50000, 1) * 100
      return {
        rank: 0,
        providerId: p.providerId,
        name: p.name,
        compositeScore,
        latencyScore: p.latencyScore,
        stakeWeight: Math.round(stakeWeight),
        reputation: p.reputation,
        totalRequests: p.totalRequests,
        successRate,
      }
    })
    .sort((a, b) => b.compositeScore - a.compositeScore)

  // Assign ranks
  entries.forEach((entry, index) => {
    entry.rank = index + 1
  })

  return entries
}

// ── Simulation Tick (7s cycle) ──────────────────────────────

function simulationTick() {
  tickCount++
  requestCounter++

  // Route a request every tick
  const taskType = TASK_TYPES[(tickCount - 1) % TASK_TYPES.length]
  const selectedProvider = selectProvider(taskType)

  if (selectedProvider) {
    const requestId = `req-${requestCounter.toString().padStart(5, '0')}`
    const routedRequest: RoutedRequest = {
      requestId,
      taskType,
      providerId: selectedProvider.providerId,
      providerName: selectedProvider.name,
      routedAt: Date.now(),
      respondedAt: null,
      responseValid: null,
      latency: null,
    }

    io.emit('request_routed', {
      requestId,
      taskType,
      providerId: selectedProvider.providerId,
      providerName: selectedProvider.name,
      compositeScore: calculateCompositeScore(selectedProvider),
      routedAt: routedRequest.routedAt,
    })

    console.log(`[MCP] Request routed: ${requestId} → ${selectedProvider.name} (${taskType})`)

    // Simulate response with deterministic delay
    const responseDelay = Math.round(1000 + (100 - selectedProvider.latencyScore) * 20)

    setTimeout(() => {
      const provider = providers.get(selectedProvider.providerId)
      if (!provider) return

      // Deterministic response quality: based on reputation and sin wave
      const qualityThreshold = provider.reputation / 100
      const sinVal = Math.sin(requestCounter * 0.3)
      const isValid = sinVal > -0.9 || qualityThreshold > 0.7

      routedRequest.respondedAt = Date.now()
      routedRequest.responseValid = isValid
      routedRequest.latency = Date.now() - routedRequest.routedAt

      provider.totalRequests++

      if (isValid) {
        provider.successfulRequests++
        // Slight reputation increase for successful responses
        provider.reputation = Math.min(100, provider.reputation + 0.1)

        io.emit('response_received', {
          requestId,
          providerId: provider.providerId,
          providerName: provider.name,
          responseValid: true,
          latency: routedRequest.latency,
          respondedAt: routedRequest.respondedAt,
        })
      } else {
        provider.failedRequests++

        // Provider slashing: reduce stake and reputation
        const slashAmount = Math.round(provider.stake * 0.05) // 5% slash
        provider.stake = Math.max(0, provider.stake - slashAmount)
        provider.reputation = Math.max(0, provider.reputation - 5)
        provider.slashCount++

        // Mark as temporarily slashed if too many failures
        if (provider.slashCount > 5) {
          provider.slashed = true
          // Un-slash after reputation recovers
          setTimeout(() => {
            const p = providers.get(provider.providerId)
            if (p) {
              p.slashed = false
              p.reputation = Math.min(100, p.reputation + 10)
            }
          }, 30000) // 30 second cooldown
        }

        const slashing: ProviderSlashing = {
          providerId: provider.providerId,
          providerName: provider.name,
          reason: `Invalid response for task ${taskType}`,
          slashAmount,
          timestamp: Date.now(),
        }
        recentSlashings.push(slashing)
        if (recentSlashings.length > 10) recentSlashings.shift()

        io.emit('response_received', {
          requestId,
          providerId: provider.providerId,
          providerName: provider.name,
          responseValid: false,
          latency: routedRequest.latency,
          respondedAt: routedRequest.respondedAt,
        })

        io.emit('provider_slashed', slashing)
        console.log(`[MCP] Provider slashed: ${provider.name} -${slashAmount} AFC (stake: ${provider.stake})`)
      }

      recentRequests.push(routedRequest)
      if (recentRequests.length > 30) recentRequests.shift()

      providers.set(provider.providerId, provider)
    }, responseDelay)
  }

  // Update provider scores with sin-wave variation (every 3 ticks)
  if (tickCount % 3 === 0) {
    for (const [id, provider] of providers) {
      // Sin-wave latency fluctuation
      const latWave = Math.sin(tickCount * 0.15 + id.length) * 3
      provider.latencyScore = Math.max(50, Math.min(100, Math.round(provider.latencyScore + latWave)))

      // Slow stake recovery
      const originalStake = PROVIDER_CONFIGS.find(c => c.providerId === id)!.stake
      if (!provider.slashed && provider.stake < originalStake) {
        provider.stake = Math.min(originalStake, provider.stake + 10)
      }

      providers.set(id, provider)
    }
  }

  // Broadcast leaderboard every tick (7s)
  const leaderboard = getLeaderboard()
  io.emit('leaderboard_update', leaderboard)
  console.log(`[MCP] Leaderboard: ${leaderboard.map(l => `#${l.rank} ${l.name}(${l.compositeScore})`).join(' | ')}`)
}

// ── Connection Handler ───────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Connect] client: ${socket.id}`)

  // Send current MCP state on connection
  socket.emit('mcp_state', {
    providers: Array.from(providers.values()),
    leaderboard: getLeaderboard(),
    recentRequests: recentRequests.slice(-10),
    recentSlashings: recentSlashings.slice(-5),
    tickCount,
    timestamp: Date.now(),
  })

  socket.on('get_state', () => {
    socket.emit('mcp_state', {
      providers: Array.from(providers.values()),
      leaderboard: getLeaderboard(),
      recentRequests: recentRequests.slice(-10),
      recentSlashings: recentSlashings.slice(-5),
      tickCount,
      timestamp: Date.now(),
    })
  })

  socket.on('disconnect', (reason) => {
    console.log(`[Disconnect] client: ${socket.id} reason: ${reason}`)
  })

  socket.on('error', (error) => {
    console.error(`[Error] socket ${socket.id}:`, error)
  })
})

// ── Start Server ─────────────────────────────────────────────

// Initialize providers
for (const config of PROVIDER_CONFIGS) {
  providers.set(config.providerId, {
    ...config,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    slashed: false,
    slashCount: 0,
    registeredAt: Date.now(),
  })
}

httpServer.listen(PORT, () => {
  console.log(`✅ MCP Router Service running on port ${PORT}`)
  console.log(`   Socket.IO path: /`)
  console.log(`   Providers: ${providers.size}`)
  console.log(`   Task types: ${TASK_TYPES.length}`)

  // Broadcast provider registration on startup
  for (const [id, provider] of providers) {
    io.emit('provider_registered', {
      providerId: id,
      name: provider.name,
      stake: provider.stake,
      latencyScore: provider.latencyScore,
      reputation: provider.reputation,
      registeredAt: provider.registeredAt,
    })
  }

  // Broadcast leaderboard_update every 7 seconds
  setInterval(simulationTick, 7000)
})

// ── Graceful Shutdown ────────────────────────────────────────

function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`)
  io.close()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
