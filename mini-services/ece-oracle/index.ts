import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3006

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

interface PriceSubmission {
  sourceId: string
  sourceName: string
  asset: string
  price: number
  timestamp: number
}

interface AssetPrice {
  asset: string
  price: number
  median: number
  confidence: number // 0-100
  submissions: PriceSubmission[]
  lastUpdate: number
  change1m: number // percentage change in last minute
}

interface DeviationAlert {
  asset: string
  previousPrice: number
  currentPrice: number
  changePercent: number
  direction: 'up' | 'down'
  timestamp: number
}

interface SourceHealth {
  sources: SourceStatus[]
  heartbeatStatus: 'healthy' | 'degraded' | 'down'
  timestamp: number
}

interface SourceStatus {
  sourceId: string
  sourceName: string
  lastSubmission: number
  isStale: boolean // no submission in 60s
  submissionCount: number
}

// ── Deterministic Simulation State ───────────────────────────

let tickCount = 0
const HEARTBEAT_THRESHOLD = 60000 // 60 seconds staleness check

const ASSETS = ['AFC', 'ETH', 'USDC', 'BTC']

// 5 simulated price sources
const DATA_SOURCES = [
  { sourceId: 'src-chainlink', sourceName: 'Chainlink Feed' },
  { sourceId: 'src-pyth', sourceName: 'Pyth Network' },
  { sourceId: 'src-dia', sourceName: 'DIA Oracle' },
  { sourceId: 'src-band', sourceName: 'Band Protocol' },
  { sourceId: 'src-umma', sourceName: 'UMA Optimistic' },
]

// Base prices (deterministic, NO Math.random)
const BASE_PRICES: Record<string, number> = {
  AFC: 1.25,
  ETH: 3450.0,
  USDC: 1.0,
  BTC: 67200.0,
}

// Sin-wave parameters per asset (frequency, amplitude, phase)
const SIN_PARAMS: Record<string, { freq: number; amp: number; phase: number }> = {
  AFC: { freq: 0.08, amp: 0.05, phase: 0 },
  ETH: { freq: 0.06, amp: 50, phase: 1.2 },
  USDC: { freq: 0.02, amp: 0.002, phase: 2.5 },
  BTC: { freq: 0.04, amp: 200, phase: 0.8 },
}

// Per-source offset to simulate different sources reporting slightly different prices
const SOURCE_OFFSETS: Record<string, number> = {
  'src-chainlink': 0,
  'src-pyth': 0.001,
  'src-dia': -0.002,
  'src-band': 0.003,
  'src-umma': -0.001,
}

// Store recent submissions per asset (last 5 per source)
const recentSubmissions: Map<string, PriceSubmission[]> = new Map()
const priceHistory: Map<string, { price: number; timestamp: number }[]> = new Map()

// Current asset prices
const currentPrices: Map<string, AssetPrice> = new Map()

// ── Price Generation (deterministic sin-wave) ────────────────

function sinWave(tick: number, freq: number, amp: number, phase: number): number {
  return Math.sin(tick * freq + phase) * amp
}

function generateSourcePrice(asset: string, sourceId: string, tick: number): number {
  const base = BASE_PRICES[asset]
  const params = SIN_PARAMS[asset]
  const offset = SOURCE_OFFSETS[sourceId] || 0

  // Sin-wave price variation + source offset (all deterministic)
  const variation = sinWave(tick, params.freq, params.amp, params.phase)
  const sourceVariation = sinWave(tick + sourceId.length, params.freq * 1.3, params.amp * 0.1, params.phase + 0.5)

  const price = base + variation + sourceVariation + (offset * base)

  // Round to appropriate precision
  if (asset === 'BTC' || asset === 'ETH') return Math.round(price * 100) / 100
  if (asset === 'AFC') return Math.round(price * 10000) / 10000
  return Math.round(price * 100000) / 100000 // USDC
}

function calculateMedian(prices: number[]): number {
  const sorted = [...prices].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

function calculateConfidence(prices: number[], median: number): number {
  if (prices.length < 2) return 50
  // Confidence based on how close source prices are to median
  const maxDeviation = median * 0.05 // 5% threshold
  const deviations = prices.map(p => Math.abs(p - median))
  const avgDeviation = deviations.reduce((s, d) => s + d, 0) / deviations.length
  const normalizedDeviation = avgDeviation / maxDeviation
  return Math.round(Math.max(0, Math.min(100, 100 - normalizedDeviation * 100)))
}

// ── Price Update Cycle (every 3s) ───────────────────────────

function updatePrices() {
  tickCount++

  for (const asset of ASSETS) {
    const submissions: PriceSubmission[] = []

    // Generate submissions from all 5 sources
    for (const source of DATA_SOURCES) {
      // Sources submit at slightly different ticks (deterministic stagger)
      const sourceTickOffset = source.sourceId.charCodeAt(source.sourceId.length - 1) % 3
      if ((tickCount + sourceTickOffset) % 2 === 0) {
        const price = generateSourcePrice(asset, source.sourceId, tickCount)
        const submission: PriceSubmission = {
          sourceId: source.sourceId,
          sourceName: source.sourceName,
          asset,
          price,
          timestamp: Date.now(),
        }
        submissions.push(submission)
      }
    }

    // Store submissions
    const key = asset
    const existing = recentSubmissions.get(key) || []
    const updated = [...existing, ...submissions].slice(-25) // Keep last 25
    recentSubmissions.set(key, updated)

    // Calculate aggregate price from last 5 submissions (median aggregation)
    const recentPrices = updated.slice(-5).map(s => s.price)
    if (recentPrices.length === 0) continue

    const median = calculateMedian(recentPrices)
    const confidence = calculateConfidence(recentPrices, median)

    // Track price history for deviation detection
    const history = priceHistory.get(asset) || []
    history.push({ price: median, timestamp: Date.now() })
    // Keep 1 minute of history (20 entries at 3s intervals)
    priceHistory.set(asset, history.slice(-20))

    // Calculate 1-minute change
    let change1m = 0
    if (history.length >= 2) {
      const oldPrice = history[0].price
      change1m = Math.round(((median - oldPrice) / oldPrice) * 10000) / 100
    }

    // Previous price for deviation check
    const previousAssetPrice = currentPrices.get(asset)
    const previousMedian = previousAssetPrice?.median || median

    const assetPrice: AssetPrice = {
      asset,
      price: median,
      median,
      confidence,
      submissions: updated.slice(-5),
      lastUpdate: Date.now(),
      change1m,
    }
    currentPrices.set(asset, assetPrice)

    // Broadcast price update every 3s
    io.emit('price_update', assetPrice)

    // Check for price deviation >5%
    if (previousMedian > 0) {
      const deviation = Math.abs((median - previousMedian) / previousMedian) * 100
      if (deviation > 5) {
        const alert: DeviationAlert = {
          asset,
          previousPrice: previousMedian,
          currentPrice: median,
          changePercent: Math.round(deviation * 100) / 100,
          direction: median > previousMedian ? 'up' : 'down',
          timestamp: Date.now(),
        }
        io.emit('deviation_alert', alert)
        console.log(`[ECE] Deviation alert: ${asset} ${alert.direction} ${alert.changePercent}%`)
      }
    }
  }

  // Broadcast source health
  const sourceHealth = generateSourceHealth()
  io.emit('source_health', sourceHealth)

  const latestAFC = currentPrices.get('AFC')
  console.log(
    `[ECE] tick: ${tickCount} | AFC: $${latestAFC?.price.toFixed(4)} | confidence: ${latestAFC?.confidence}%`
  )
}

function generateSourceHealth(): SourceHealth {
  const sources: SourceStatus[] = DATA_SOURCES.map(source => {
    let submissionCount = 0
    let lastSubmission = 0
    for (const asset of ASSETS) {
      const subs = recentSubmissions.get(asset) || []
      const sourceSubs = subs.filter(s => s.sourceId === source.sourceId)
      submissionCount += sourceSubs.length
      if (sourceSubs.length > 0) {
        const latest = sourceSubs[sourceSubs.length - 1].timestamp
        if (latest > lastSubmission) lastSubmission = latest
      }
    }

    // 60s staleness check
    const isStale = lastSubmission > 0 && (Date.now() - lastSubmission) > HEARTBEAT_THRESHOLD

    return {
      sourceId: source.sourceId,
      sourceName: source.sourceName,
      lastSubmission,
      isStale,
      submissionCount,
    }
  })

  const staleCount = sources.filter(s => s.isStale).length
  const heartbeatStatus: 'healthy' | 'degraded' | 'down' =
    staleCount === 0 ? 'healthy' : staleCount < 3 ? 'degraded' : 'down'

  return {
    sources,
    heartbeatStatus,
    timestamp: Date.now(),
  }
}

// ── Connection Handler ───────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Connect] client: ${socket.id}`)

  // Send current oracle state on connection
  const allPrices: AssetPrice[] = []
  for (const [, price] of currentPrices) {
    allPrices.push(price)
  }

  socket.emit('oracle_state', {
    prices: allPrices,
    sourceHealth: generateSourceHealth(),
    tickCount,
    timestamp: Date.now(),
  })

  socket.on('get_state', () => {
    const prices: AssetPrice[] = []
    for (const [, price] of currentPrices) {
      prices.push(price)
    }
    socket.emit('oracle_state', {
      prices,
      sourceHealth: generateSourceHealth(),
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

// Initialize prices
for (const asset of ASSETS) {
  recentSubmissions.set(asset, [])
  priceHistory.set(asset, [])
}

httpServer.listen(PORT, () => {
  console.log(`✅ ECE Oracle Client Service running on port ${PORT}`)
  console.log(`   Socket.IO path: /`)
  console.log(`   Assets: ${ASSETS.join(', ')}`)
  console.log(`   Data sources: ${DATA_SOURCES.length}`)

  // Update prices every 3 seconds
  setInterval(updatePrices, 3000)
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
