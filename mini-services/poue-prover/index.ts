import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3007

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

type ProofStatus = 'pending' | 'verifying' | 'verified' | 'rejected'

interface ProofSubmission {
  proofId: string
  taskId: string
  prover: string
  status: ProofStatus
  submittedAt: number
  verifiedAt: number | null
  challengeDeadline: number | null // 7-day challenge period
  cpuTime: number // ms
  memoryUsed: number // MB
  qualityScore: number // 0-100
  reward: number // AFC tokens
}

interface BatchVerification {
  batchId: string
  proofIds: string[]
  totalProofs: number
  verified: number
  rejected: number
  timestamp: number
}

interface RewardDistribution {
  proofId: string
  prover: string
  amount: number
  token: string
  timestamp: number
}

interface VerificationMetrics {
  totalProofs: number
  verified: number
  rejected: number
  pending: number
  avgCpuTime: number
  avgMemory: number
  avgQualityScore: number
  totalRewards: number
  timestamp: number
}

// ── Deterministic Simulation State ───────────────────────────

let tickCount = 0
let proofCounter = 0
let batchCounter = 0

const proofs: Map<string, ProofSubmission> = new Map()
const recentBatches: BatchVerification[] = []
const recentRewards: RewardDistribution[] = []

// Deterministic prover addresses
const PROVERS = [
  '0xaa11...prover1',
  '0xbb22...prover2',
  '0xcc33...prover3',
]

// Task types
const TASK_TYPES = [
  'cognition_update',
  'skill_execution',
  'delegation_proof',
  'revenue_verification',
  'circuit_check',
]

// ── Deterministic Generation (counter-based, NO Math.random) ─

function seededValue(seed: number, min: number, max: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297
  const normalized = x - Math.floor(x)
  return min + normalized * (max - min)
}

function generateProofId(): string {
  proofCounter++
  const hex = proofCounter.toString(16).padStart(6, '0')
  return `proof-0x${hex}`
}

function generateBatchId(): string {
  batchCounter++
  return `batch-${batchCounter.toString().padStart(4, '0')}`
}

// ── Proof Lifecycle ──────────────────────────────────────────

function submitProof(): ProofSubmission {
  const proofId = generateProofId()
  const taskId = TASK_TYPES[proofCounter % TASK_TYPES.length]
  const prover = PROVERS[proofCounter % PROVERS.length]

  // Deterministic metrics based on counter
  const cpuTime = Math.round(seededValue(proofCounter, 200, 5000)) // 200-5000ms
  const memoryUsed = Math.round(seededValue(proofCounter + 100, 50, 512)) // 50-512MB
  const qualityScore = Math.round(seededValue(proofCounter + 200, 60, 100)) // 60-100

  const proof: ProofSubmission = {
    proofId,
    taskId,
    prover,
    status: 'pending',
    submittedAt: Date.now(),
    verifiedAt: null,
    challengeDeadline: null,
    cpuTime,
    memoryUsed,
    qualityScore,
    reward: 0,
  }

  proofs.set(proofId, proof)

  // Broadcast submission
  io.emit('proof_submitted', {
    proofId,
    taskId,
    prover,
    submittedAt: proof.submittedAt,
  })

  console.log(`[PoUE] Proof submitted: ${proofId} task: ${taskId} prover: ${prover}`)

  // Simulate verification delay (deterministic: 2-5 seconds based on proofCounter)
  const verificationDelay = Math.round(seededValue(proofCounter + 300, 2000, 5000))

  // Move to verifying after 1 second
  setTimeout(() => {
    const currentProof = proofs.get(proofId)
    if (currentProof && currentProof.status === 'pending') {
      currentProof.status = 'verifying'
      proofs.set(proofId, currentProof)
    }
  }, 1000)

  // Complete verification after delay
  setTimeout(() => {
    const currentProof = proofs.get(proofId)
    if (!currentProof || currentProof.status !== 'verifying') return

    // Deterministic pass/fail: qualityScore >= 70 passes
    const passed = currentProof.qualityScore >= 70

    currentProof.status = passed ? 'verified' : 'rejected'
    currentProof.verifiedAt = Date.now()

    if (passed) {
      // 7-day challenge period (optimistic mode)
      currentProof.challengeDeadline = Date.now() + 7 * 24 * 60 * 60 * 1000
      // Reward based on quality score and CPU time
      currentProof.reward = Math.round((currentProof.qualityScore * 0.1 + currentProof.cpuTime * 0.001) * 100) / 100

      io.emit('proof_verified', {
        proofId,
        taskId: currentProof.taskId,
        prover: currentProof.prover,
        verifiedAt: currentProof.verifiedAt,
        challengeDeadline: currentProof.challengeDeadline,
        qualityScore: currentProof.qualityScore,
        cpuTime: currentProof.cpuTime,
        memoryUsed: currentProof.memoryUsed,
        reward: currentProof.reward,
      })

      // Distribute reward
      const reward: RewardDistribution = {
        proofId,
        prover: currentProof.prover,
        amount: currentProof.reward,
        token: 'AFC',
        timestamp: Date.now(),
      }
      recentRewards.push(reward)
      if (recentRewards.length > 20) recentRewards.shift()

      io.emit('reward_distributed', reward)
      console.log(`[PoUE] Proof verified: ${proofId} reward: ${currentProof.reward} AFC`)
    } else {
      io.emit('proof_rejected', {
        proofId,
        taskId: currentProof.taskId,
        prover: currentProof.prover,
        reason: `Quality score below threshold (${currentProof.qualityScore} < 70)`,
        verifiedAt: currentProof.verifiedAt,
      })
      console.log(`[PoUE] Proof rejected: ${proofId} quality: ${currentProof.qualityScore}`)
    }

    proofs.set(proofId, currentProof)
  }, verificationDelay)

  return proof
}

function performBatchVerification(): BatchVerification | null {
  const pendingProofs = Array.from(proofs.values()).filter(p => p.status === 'verified')

  if (pendingProofs.length < 2) return null

  // Take up to 5 verified proofs for batch
  const batchProofs = pendingProofs.slice(0, 5)
  const batchId = generateBatchId()

  const batch: BatchVerification = {
    batchId,
    proofIds: batchProofs.map(p => p.proofId),
    totalProofs: batchProofs.length,
    verified: batchProofs.filter(p => p.status === 'verified').length,
    rejected: 0,
    timestamp: Date.now(),
  }

  recentBatches.push(batch)
  if (recentBatches.length > 10) recentBatches.shift()

  console.log(`[PoUE] Batch verification: ${batchId} with ${batch.totalProofs} proofs`)
  return batch
}

function getMetrics(): VerificationMetrics {
  const allProofs = Array.from(proofs.values())
  const verified = allProofs.filter(p => p.status === 'verified')
  const rejected = allProofs.filter(p => p.status === 'rejected')
  const pending = allProofs.filter(p => p.status === 'pending' || p.status === 'verifying')

  const avgCpuTime = verified.length > 0
    ? Math.round(verified.reduce((s, p) => s + p.cpuTime, 0) / verified.length)
    : 0
  const avgMemory = verified.length > 0
    ? Math.round(verified.reduce((s, p) => s + p.memoryUsed, 0) / verified.length)
    : 0
  const avgQualityScore = verified.length > 0
    ? Math.round(verified.reduce((s, p) => s + p.qualityScore, 0) / verified.length)
    : 0
  const totalRewards = Math.round(verified.reduce((s, p) => s + p.reward, 0) * 100) / 100

  return {
    totalProofs: allProofs.length,
    verified: verified.length,
    rejected: rejected.length,
    pending: pending.length,
    avgCpuTime,
    avgMemory,
    avgQualityScore,
    totalRewards,
    timestamp: Date.now(),
  }
}

// ── Main Simulation Loop (8s broadcast cycle) ───────────────

function simulationTick() {
  tickCount++

  // Submit a new proof every tick (8s)
  submitProof()

  // Batch verification every 4 ticks (32s)
  if (tickCount % 4 === 0) {
    const batch = performBatchVerification()
    if (batch) {
      io.emit('batch_verification', batch)
    }
  }

  // Broadcast verification metrics every 2 ticks (16s)
  if (tickCount % 2 === 0) {
    const metrics = getMetrics()
    io.emit('verification_metrics', metrics)
    console.log(
      `[PoUE] Metrics: total=${metrics.totalProofs} verified=${metrics.verified} rejected=${metrics.rejected} rewards=${metrics.totalRewards} AFC`
    )
  }
}

// ── Connection Handler ───────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Connect] client: ${socket.id}`)

  // Send current prover state on connection
  const allProofs = Array.from(proofs.values()).slice(-20)
  socket.emit('poue_state', {
    proofs: allProofs,
    batches: recentBatches,
    rewards: recentRewards.slice(-10),
    metrics: getMetrics(),
    tickCount,
    timestamp: Date.now(),
  })

  socket.on('get_state', () => {
    const currentProofs = Array.from(proofs.values()).slice(-20)
    socket.emit('poue_state', {
      proofs: currentProofs,
      batches: recentBatches,
      rewards: recentRewards.slice(-10),
      metrics: getMetrics(),
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

httpServer.listen(PORT, () => {
  console.log(`✅ PoUE ZK Prover Simulation Service running on port ${PORT}`)
  console.log(`   Socket.IO path: /`)
  console.log(`   Provers: ${PROVERS.length}`)
  console.log(`   Task types: ${TASK_TYPES.length}`)
  console.log(`   Optimistic mode: 7-day challenge period`)

  // Broadcast proof_verified every 8 seconds
  setInterval(simulationTick, 8000)
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
