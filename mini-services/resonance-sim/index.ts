import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3003

const httpServer = createServer()
const io = new Server(httpServer, {
  // DO NOT change the path, it is used by Caddy to forward the request to the correct port
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// ── Types ────────────────────────────────────────────────────
interface ResonanceUpdate {
  soulId: string
  score: number
  timestamp: number
  trend: 'up' | 'down' | 'stable'
}

interface RevenueEvent {
  soulId: string
  amount: number
  source: string
  split: { human: number; avatar: number; protocol: number }
  txHash: string
}

interface CircuitChange {
  soulId: string
  oldState: string
  newState: string
  reason: string
}

type CircuitState = 'NORMAL' | 'SOFT_LIMIT' | 'HARD_PAUSE' | 'RECOVERY'

// ── Deterministic Seed-Based Random ──────────────────────────
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297
  return x - Math.floor(x)
}

// ── Simulation State ─────────────────────────────────────────
const SOUL_ID = '0x7a3f...9b2c'
const REVENUE_SOURCES = ['skill_call', 'rental', 'collaboration']
const RESONANCE_MIN = 40
const RESONANCE_MAX = 95
const RESONANCE_UPDATE_INTERVAL = 6000 // 6 seconds

let currentScore = 72
let previousScore = 72
let currentCircuitState: CircuitState = 'NORMAL'
let tickCount = 0
let revenueTimeout: ReturnType<typeof setTimeout> | null = null

// Revenue event history (kept in memory for state sync)
const recentRevenueEvents: RevenueEvent[] = []

// ── Helper Functions ─────────────────────────────────────────

function getCircuitState(score: number): CircuitState {
  if (score >= 70) return 'NORMAL'
  if (score >= 50) return 'SOFT_LIMIT'
  if (score >= 30) return 'HARD_PAUSE'
  return 'HARD_PAUSE'
}

function getCircuitReason(
  oldState: CircuitState,
  newState: CircuitState,
  score: number
): string {
  if (newState === 'NORMAL' && oldState !== 'NORMAL') {
    return `共振分恢复至${score}，认知状态回归正常`
  }
  if (newState === 'SOFT_LIMIT' && oldState === 'NORMAL') {
    return `共振分降至${score}，进入软限制状态`
  }
  if (newState === 'HARD_PAUSE' && oldState === 'SOFT_LIMIT') {
    return `共振分降至${score}，触发硬熔断`
  }
  if (newState === 'RECOVERY') {
    return `共振分回升至${score}，进入恢复状态`
  }
  return `共振分${score}，状态变更`
}

function generateTxHash(): string {
  const chars = '0123456789abcdef'
  let hash = '0x'
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      hash += chars[Math.floor(Math.random() * 16)]
    }
    if (i < 3) hash += ''
  }
  hash += '...'
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      hash += chars[Math.floor(Math.random() * 16)]
    }
  }
  return hash
}

function calculateSplit(amount: number, score: number) {
  // Base split: 70% human, 20% avatar, 10% protocol
  // Resonance bonus: if score >= 70, human gets +2%
  let humanBps = 7000
  let avatarBps = 2000
  let protocolBps = 1000

  if (score >= 70) {
    humanBps = 7200
    avatarBps = 1800
    protocolBps = 1000
  } else if (score < 50) {
    humanBps = 6500
    avatarBps = 2500
    protocolBps = 1000
  }

  return {
    human: Math.round((amount * humanBps) / 10000 * 100) / 100,
    avatar: Math.round((amount * avatarBps) / 10000 * 100) / 100,
    protocol: Math.round((amount * protocolBps) / 10000 * 100) / 100,
  }
}

function getTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  const diff = current - previous
  if (diff > 1) return 'up'
  if (diff < -1) return 'down'
  return 'stable'
}

// ── Resonance Update (every 6 seconds) ───────────────────────
function updateResonance() {
  tickCount++
  previousScore = currentScore

  // Random walk with slight mean-reversion toward 65
  const meanReversionForce = (65 - currentScore) * 0.03
  const randomStep = (Math.random() - 0.48) * 6 // slight upward bias
  const change = meanReversionForce + randomStep

  currentScore = Math.round(
    Math.max(RESONANCE_MIN, Math.min(RESONANCE_MAX, currentScore + change))
  )

  const trend = getTrend(currentScore, previousScore)

  const update: ResonanceUpdate = {
    soulId: SOUL_ID,
    score: currentScore,
    timestamp: Date.now(),
    trend,
  }

  io.emit('resonance_update', update)

  // Check circuit state change
  const newCircuitState = getCircuitState(currentScore)
  if (newCircuitState !== currentCircuitState) {
    const circuitChange: CircuitChange = {
      soulId: SOUL_ID,
      oldState: currentCircuitState,
      newState: newCircuitState,
      reason: getCircuitReason(currentCircuitState, newCircuitState, currentScore),
    }
    currentCircuitState = newCircuitState
    io.emit('circuit_change', circuitChange)
    console.log(
      `[Circuit] ${circuitChange.oldState} → ${circuitChange.newState} (score: ${currentScore})`
    )
  }

  console.log(
    `[Resonance] score: ${currentScore} trend: ${trend} circuit: ${currentCircuitState}`
  )
}

// ── Revenue Event (every 15-30 seconds) ──────────────────────
function scheduleRevenueEvent() {
  const delay = 15000 + Math.random() * 15000 // 15-30 seconds

  revenueTimeout = setTimeout(() => {
    const source = REVENUE_SOURCES[Math.floor(Math.random() * REVENUE_SOURCES.length)]
    const amountRanges: Record<string, [number, number]> = {
      skill_call: [5, 80],
      rental: [50, 200],
      collaboration: [100, 400],
    }
    const [min, max] = amountRanges[source] || [10, 100]
    const amount = Math.round((min + Math.random() * (max - min)) * 100) / 100

    const split = calculateSplit(amount, currentScore)
    const txHash = generateTxHash()

    const revenueEvent: RevenueEvent = {
      soulId: SOUL_ID,
      amount,
      source,
      split,
      txHash,
    }

    // Keep recent history (last 20 events)
    recentRevenueEvents.push(revenueEvent)
    if (recentRevenueEvents.length > 20) {
      recentRevenueEvents.shift()
    }

    io.emit('revenue_event', revenueEvent)
    console.log(
      `[Revenue] $${amount} from ${source} | split: $${split.human}/$${split.avatar}/$${split.protocol}`
    )

    // Schedule next revenue event
    scheduleRevenueEvent()
  }, delay)
}

// ── Connection Handler ───────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Connect] client: ${socket.id}`)

  // Send current simulation state on connection
  socket.emit('sim_state', {
    soulId: SOUL_ID,
    score: currentScore,
    circuitState: currentCircuitState,
    trend: getTrend(currentScore, previousScore),
    recentRevenueEvents: recentRevenueEvents.slice(-5),
    timestamp: Date.now(),
  })

  // Allow client to request manual state
  socket.on('get_state', () => {
    socket.emit('sim_state', {
      soulId: SOUL_ID,
      score: currentScore,
      circuitState: currentCircuitState,
      trend: getTrend(currentScore, previousScore),
      recentRevenueEvents: recentRevenueEvents.slice(-5),
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
httpServer.listen(PORT, () => {
  console.log(`✅ Resonance Simulation Service running on port ${PORT}`)
  console.log(`   Socket.IO path: /`)
  console.log(`   Initial state: score=${currentScore}, circuit=${currentCircuitState}`)

  // Start resonance updates every 6 seconds
  setInterval(updateResonance, RESONANCE_UPDATE_INTERVAL)

  // Start revenue events (15-30 second random intervals)
  scheduleRevenueEvent()
})

// ── Graceful Shutdown ────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...')
  if (revenueTimeout) clearTimeout(revenueTimeout)
  io.close()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...')
  if (revenueTimeout) clearTimeout(revenueTimeout)
  io.close()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
