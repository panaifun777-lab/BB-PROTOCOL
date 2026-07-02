import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3005

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

interface DelegationNode {
  address: string
  delegatedTo: string | null
  weight: number
  effectiveWeight: number
  depth: number
}

interface WeightUpdate {
  timestamp: number
  totalWeight: number
  nodes: DelegationNode[]
  cycles: string[][]
}

interface GraphChange {
  address: string
  oldDelegate: string | null
  newDelegate: string | null
  timestamp: number
}

interface CycleDetected {
  cycles: string[][]
  timestamp: number
}

// ── Deterministic Simulation State ───────────────────────────

let tickCount = 0
const MAX_DEPTH = 3
const DECAY_FACTOR = 0.8

// 6 sample delegation nodes with deterministic data
const delegationGraph: Map<string, DelegationNode> = new Map()

const ADDRESSES = [
  '0x7a3f...9b2c', // Node Alpha - direct voter
  '0xb1c2...3d4e', // Node Beta - delegates to Alpha
  '0xc5d6...7f8a', // Node Gamma - delegates to Beta
  '0xd9e0...1a2b', // Node Delta - delegates to Gamma (depth 3)
  '0xe3f4...5c6d', // Node Epsilon - delegates to Alpha
  '0xf7a8...9e0f', // Node Zeta - delegates to Epsilon
]

// Initial delegation relationships (deterministic, NO Math.random)
const INITIAL_DELEGATIONS: [string, string | null, number][] = [
  [ADDRESSES[0], null, 100],        // Alpha → direct voter, weight 100
  [ADDRESSES[1], ADDRESSES[0], 80],  // Beta → Alpha, weight 80
  [ADDRESSES[2], ADDRESSES[1], 60],  // Gamma → Beta, weight 60
  [ADDRESSES[3], ADDRESSES[2], 40],  // Delta → Gamma, weight 40 (depth 3)
  [ADDRESSES[4], ADDRESSES[0], 70],  // Epsilon → Alpha, weight 70
  [ADDRESSES[5], ADDRESSES[4], 50],  // Zeta → Epsilon, weight 50
]

function initializeGraph() {
  delegationGraph.clear()
  for (const [addr, delegatedTo, weight] of INITIAL_DELEGATIONS) {
    delegationGraph.set(addr, {
      address: addr,
      delegatedTo,
      weight,
      effectiveWeight: 0,
      depth: 0,
    })
  }
}

// ── Weight Calculation Engine ────────────────────────────────
// effectiveWeight = weight × 0.8^depth, max depth 3

function detectCycles(): string[][] {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const path: string[] = []

  function dfs(addr: string) {
    if (recursionStack.has(addr)) {
      // Found a cycle
      const cycleStart = path.indexOf(addr)
      if (cycleStart !== -1) {
        cycles.push(path.slice(cycleStart).concat(addr))
      }
      return
    }
    if (visited.has(addr)) return

    visited.add(addr)
    recursionStack.add(addr)
    path.push(addr)

    const node = delegationGraph.get(addr)
    if (node && node.delegatedTo) {
      dfs(node.delegatedTo)
    }

    path.pop()
    recursionStack.delete(addr)
  }

  for (const addr of ADDRESSES) {
    dfs(addr)
  }

  return cycles
}

function calculateEffectiveWeights(): DelegationNode[] {
  const nodes: DelegationNode[] = []

  for (const [addr, node] of delegationGraph) {
    // Trace delegation depth
    let depth = 0
    let currentAddr: string | null = addr
    const visited = new Set<string>()

    while (currentAddr && !visited.has(currentAddr)) {
      visited.add(currentAddr)
      const currentNode = delegationGraph.get(currentAddr)
      if (!currentNode || !currentNode.delegatedTo) break
      currentAddr = currentNode.delegatedTo
      depth++
    }

    // If we hit a visited node, it's a cycle - cap depth at MAX_DEPTH
    if (currentAddr && visited.has(currentAddr)) {
      depth = MAX_DEPTH
    }

    depth = Math.min(depth, MAX_DEPTH)

    // effectiveWeight = weight × 0.8^depth
    const effectiveWeight = Math.round(node.weight * Math.pow(DECAY_FACTOR, depth) * 100) / 100

    const updatedNode: DelegationNode = {
      address: addr,
      delegatedTo: node.delegatedTo,
      weight: node.weight,
      effectiveWeight,
      depth,
    }

    delegationGraph.set(addr, updatedNode)
    nodes.push(updatedNode)
  }

  return nodes
}

// ── Sin-wave based graph mutation (deterministic) ────────────

function mutateGraph(tick: number) {
  // Every 30 ticks (150 seconds), mutate a delegation
  if (tick % 30 !== 0) return

  const mutationIndex = (tick / 30) % 3
  const sinVal = Math.sin(tick * 0.05)

  switch (mutationIndex) {
    case 0: {
      // Shift Zeta from Epsilon to Alpha
      const zeta = delegationGraph.get(ADDRESSES[5])
      if (zeta) {
        const oldDelegate = zeta.delegatedTo
        zeta.delegatedTo = sinVal > 0 ? ADDRESSES[0] : ADDRESSES[4]
        delegationGraph.set(ADDRESSES[5], zeta)
        const change: GraphChange = {
          address: ADDRESSES[5],
          oldDelegate,
          newDelegate: zeta.delegatedTo,
          timestamp: Date.now(),
        }
        io.emit('graph_change', change)
      }
      break
    }
    case 1: {
      // Shift Delta from Gamma to Beta (shorter path)
      const delta = delegationGraph.get(ADDRESSES[3])
      if (delta) {
        const oldDelegate = delta.delegatedTo
        delta.delegatedTo = sinVal > 0 ? ADDRESSES[1] : ADDRESSES[2]
        delegationGraph.set(ADDRESSES[3], delta)
        const change: GraphChange = {
          address: ADDRESSES[3],
          oldDelegate,
          newDelegate: delta.delegatedTo,
          timestamp: Date.now(),
        }
        io.emit('graph_change', change)
      }
      break
    }
    case 2: {
      // Adjust weights with sin-wave (deterministic)
      const weightDelta = Math.round(sinVal * 10)
      for (const [addr, node] of delegationGraph) {
        const newWeight = Math.max(10, Math.min(150, node.weight + weightDelta))
        node.weight = newWeight
        delegationGraph.set(addr, node)
      }
      break
    }
  }
}

// ── Broadcast Weight Update (every 5s) ──────────────────────

function broadcastWeightUpdate() {
  tickCount++
  mutateGraph(tickCount)

  const nodes = calculateEffectiveWeights()
  const cycles = detectCycles()
  const totalWeight = nodes.reduce((sum, n) => sum + n.effectiveWeight, 0)

  const update: WeightUpdate = {
    timestamp: Date.now(),
    totalWeight: Math.round(totalWeight * 100) / 100,
    nodes,
    cycles,
  }

  io.emit('weight_update', update)

  // Broadcast cycle detection if found
  if (cycles.length > 0) {
    const cycleEvent: CycleDetected = {
      cycles,
      timestamp: Date.now(),
    }
    io.emit('cycle_detected', cycleEvent)
    console.log(`[IFD] Cycle detected: ${cycles.length} cycle(s)`)
  }

  console.log(
    `[IFD] tick: ${tickCount} | totalWeight: ${update.totalWeight} | nodes: ${nodes.length} | cycles: ${cycles.length}`
  )
}

// ── Connection Handler ───────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Connect] client: ${socket.id}`)

  // Send current delegation state on connection
  const nodes = calculateEffectiveWeights()
  const cycles = detectCycles()
  const totalWeight = nodes.reduce((sum, n) => sum + n.effectiveWeight, 0)

  socket.emit('ifd_state', {
    timestamp: Date.now(),
    totalWeight: Math.round(totalWeight * 100) / 100,
    nodes,
    cycles,
    tickCount,
    decayFactor: DECAY_FACTOR,
    maxDepth: MAX_DEPTH,
  })

  socket.on('get_state', () => {
    const currentNodes = calculateEffectiveWeights()
    const currentCycles = detectCycles()
    const currentTotal = currentNodes.reduce((sum, n) => sum + n.effectiveWeight, 0)
    socket.emit('ifd_state', {
      timestamp: Date.now(),
      totalWeight: Math.round(currentTotal * 100) / 100,
      nodes: currentNodes,
      cycles: currentCycles,
      tickCount,
      decayFactor: DECAY_FACTOR,
      maxDepth: MAX_DEPTH,
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

initializeGraph()

httpServer.listen(PORT, () => {
  console.log(`✅ IFD Weight Calculator Service running on port ${PORT}`)
  console.log(`   Socket.IO path: /`)
  console.log(`   Decay factor: ${DECAY_FACTOR}, Max depth: ${MAX_DEPTH}`)
  console.log(`   Initial nodes: ${delegationGraph.size}`)

  // Broadcast weight updates every 5 seconds
  setInterval(broadcastWeightUpdate, 5000)
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
