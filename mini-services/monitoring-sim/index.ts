import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3004

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

interface SystemMetricsPayload {
  cpu: number
  memory: number
  diskUsage: number
  networkIn: number
  networkOut: number
  activeConnections: number
  requestRate: number
  errorRate: number
  p50Latency: number
  p95Latency: number
  p99Latency: number
  timestamp: number
}

interface ChainEventPayload {
  eventName: string
  contract: string
  blockNumber: number
  txHash: string
  timestamp: number
  data: Record<string, string | number>
}

interface AnomalyAlertPayload {
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  detectedAt: number
  metric: string
  value: number
  baseline: number
}

interface MonitoringStatePayload {
  systemMetrics: SystemMetricsPayload
  recentChainEvents: ChainEventPayload[]
  tickCount: number
  timestamp: number
}

// ── Deterministic Simulation State ───────────────────────────

let tickCount = 0
const BASE_CPU = 34
const BASE_MEMORY = 62
const BASE_DISK = 45
const BASE_NETWORK_IN = 245
const BASE_NETWORK_OUT = 128
const BASE_CONNECTIONS = 1247
const BASE_REQUEST_RATE = 3420
const BASE_ERROR_RATE = 0.12
const BASE_P50 = 45
const BASE_P95 = 180
const BASE_P99 = 420

// Chain events cycle
const CHAIN_EVENT_TEMPLATES: Omit<ChainEventPayload, 'timestamp'>[] = [
  { eventName: 'AvatarCreated', contract: 'AvatarCore', blockNumber: 28451020, txHash: '0xa3f1...8b2c', data: { avatarId: '0x7a3f...9b2c' } },
  { eventName: 'SkillUnlocked', contract: 'SkillVault', blockNumber: 28451018, txHash: '0xb7c2...3e4d', data: { skillId: 'SKILL-005' } },
  { eventName: 'RevenueSplit', contract: 'DynamicSplitter', blockNumber: 28451015, txHash: '0xc9d3...5f6e', data: { totalAmount: '$125.50' } },
  { eventName: 'CircuitStateChange', contract: 'CircuitGuard', blockNumber: 28451010, txHash: '0xd1e4...7a8b', data: { from: 'NORMAL', to: 'SOFT_LIMIT' } },
  { eventName: 'DelegationWeightUpdate', contract: 'IFDRouter', blockNumber: 28451005, txHash: '0xe5f6...9c0d', data: { weight: 150 } },
  { eventName: 'TokensBurned', contract: 'TokenVault', blockNumber: 28451001, txHash: '0xf8a7...2b3c', data: { amount: '5000 AFC' } },
  { eventName: 'LiquidityAdded', contract: 'TokenVault', blockNumber: 28450998, txHash: '0x1a2b...3c4d', data: { amount: '$12,500' } },
  { eventName: 'AvatarUpdated', contract: 'AvatarCore', blockNumber: 28450990, txHash: '0x2b3c...4d5e', data: { field: 'cognitionRoot' } },
]

let chainEventIndex = 0
let nextBlockOffset = 0

// Recent events buffer
const recentChainEvents: ChainEventPayload[] = []

// ── Deterministic sin-wave generation ────────────────────────

function sinWave(tick: number, frequency: number, amplitude: number, phase: number): number {
  return Math.sin(tick * frequency + phase) * amplitude
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function generateSystemMetrics(): SystemMetricsPayload {
  tickCount++

  // CPU: sin-wave with 30-tick period, amplitude 15, base 34
  const cpuWave = sinWave(tickCount, 0.21, 15, 0)
  const cpu = clamp(Math.round(BASE_CPU + cpuWave), 10, 95)

  // Memory: sin-wave with 50-tick period, amplitude 10, base 62
  const memWave = sinWave(tickCount, 0.126, 10, 1.2)
  const memory = clamp(Math.round(BASE_MEMORY + memWave), 30, 90)

  // Disk: slowly increasing, amplitude 3
  const diskWave = sinWave(tickCount, 0.05, 3, 2.5)
  const diskUsage = clamp(Math.round(BASE_DISK + diskWave), 20, 80)

  // Network In: sin-wave amplitude 80
  const netInWave = sinWave(tickCount, 0.18, 80, 0.5)
  const networkIn = clamp(Math.round(BASE_NETWORK_IN + netInWave), 100, 500)

  // Network Out: sin-wave amplitude 50
  const netOutWave = sinWave(tickCount, 0.15, 50, 1.8)
  const networkOut = clamp(Math.round(BASE_NETWORK_OUT + netOutWave), 50, 300)

  // Active connections: sin-wave amplitude 200
  const connWave = sinWave(tickCount, 0.1, 200, 0.8)
  const activeConnections = clamp(Math.round(BASE_CONNECTIONS + connWave), 800, 2000)

  // Request rate: sin-wave amplitude 800
  const reqWave = sinWave(tickCount, 0.17, 800, 1.5)
  const requestRate = clamp(Math.round(BASE_REQUEST_RATE + reqWave), 1000, 6000)

  // Error rate: sin-wave amplitude 0.08, rarely spikes
  const errWave = sinWave(tickCount, 0.12, 0.08, 2.1)
  const errorRate = clamp(Math.round((BASE_ERROR_RATE + errWave) * 100) / 100, 0.01, 2.0)

  // Latencies: correlated with CPU
  const latWave = sinWave(tickCount, 0.19, 1.5, 0)
  const p50 = clamp(Math.round(BASE_P50 * (1 + latWave * 0.3)), 20, 200)
  const p95 = clamp(Math.round(BASE_P95 * (1 + latWave * 0.4)), 80, 800)
  const p99 = clamp(Math.round(BASE_P99 * (1 + latWave * 0.5)), 200, 2000)

  return {
    cpu,
    memory,
    diskUsage,
    networkIn,
    networkOut,
    activeConnections,
    requestRate,
    errorRate,
    p50Latency: p50,
    p95Latency: p95,
    p99Latency: p99,
    timestamp: Date.now(),
  }
}

function generateChainEvent(): ChainEventPayload {
  const template = CHAIN_EVENT_TEMPLATES[chainEventIndex % CHAIN_EVENT_TEMPLATES.length]
  chainEventIndex++
  nextBlockOffset += 3 + (chainEventIndex % 5)

  const event: ChainEventPayload = {
    ...template,
    blockNumber: template.blockNumber + nextBlockOffset,
    timestamp: Date.now(),
  }

  // Keep last 8 events
  recentChainEvents.push(event)
  if (recentChainEvents.length > 8) {
    recentChainEvents.shift()
  }

  return event
}

// ── Anomaly Detection (deterministic, triggers on sin-wave peaks) ──

function checkAnomaly(metrics: SystemMetricsPayload): AnomalyAlertPayload | null {
  // Trigger anomaly when CPU sin-wave is near peak (cpu > 75)
  if (metrics.cpu > 75) {
    return {
      description: 'CPU使用率异常峰值',
      severity: 'medium',
      detectedAt: metrics.timestamp,
      metric: 'cpu',
      value: metrics.cpu,
      baseline: BASE_CPU,
    }
  }
  // Trigger anomaly when error rate > 1.0
  if (metrics.errorRate > 1.0) {
    return {
      description: '错误率异常升高',
      severity: 'high',
      detectedAt: metrics.timestamp,
      metric: 'errorRate',
      value: metrics.errorRate,
      baseline: BASE_ERROR_RATE,
    }
  }
  return null
}

// ── Intervals ────────────────────────────────────────────────

const METRICS_INTERVAL = 3000  // 3 seconds
const CHAIN_EVENT_INTERVAL = 10000  // 10 seconds

let currentMetrics: SystemMetricsPayload | null = null

// ── Connection Handler ───────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Connect] client: ${socket.id}`)

  // Send current monitoring state on connection
  const statePayload: MonitoringStatePayload = {
    systemMetrics: currentMetrics || {
      cpu: BASE_CPU,
      memory: BASE_MEMORY,
      diskUsage: BASE_DISK,
      networkIn: BASE_NETWORK_IN,
      networkOut: BASE_NETWORK_OUT,
      activeConnections: BASE_CONNECTIONS,
      requestRate: BASE_REQUEST_RATE,
      errorRate: BASE_ERROR_RATE,
      p50Latency: BASE_P50,
      p95Latency: BASE_P95,
      p99Latency: BASE_P99,
      timestamp: Date.now(),
    },
    recentChainEvents: recentChainEvents.slice(-8),
    tickCount,
    timestamp: Date.now(),
  }
  socket.emit('monitoring_state', statePayload)

  socket.on('get_state', () => {
    socket.emit('monitoring_state', statePayload)
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
  console.log(`✅ Monitoring Simulation Service running on port ${PORT}`)
  console.log(`   Socket.IO path: /`)
  console.log(`   Metrics interval: ${METRICS_INTERVAL}ms`)
  console.log(`   Chain event interval: ${CHAIN_EVENT_INTERVAL}ms`)

  // Broadcast system metrics every 3 seconds
  setInterval(() => {
    const metrics = generateSystemMetrics()
    currentMetrics = metrics
    io.emit('metrics_update', metrics)

    // Check for anomalies
    const anomaly = checkAnomaly(metrics)
    if (anomaly) {
      io.emit('anomaly_alert', anomaly)
      console.log(`[Anomaly] ${anomaly.description} (value: ${anomaly.value}, baseline: ${anomaly.baseline})`)
    }
  }, METRICS_INTERVAL)

  // Broadcast chain events every 10 seconds
  setInterval(() => {
    const event = generateChainEvent()
    io.emit('chain_event', event)
    console.log(`[ChainEvent] ${event.eventName} at block ${event.blockNumber}`)
  }, CHAIN_EVENT_INTERVAL)
})

// ── Graceful Shutdown ────────────────────────────────────────

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...')
  io.close()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...')
  io.close()
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
