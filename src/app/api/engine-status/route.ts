import { NextResponse } from 'next/server'

// ── Engine Status API Route ─────────────────────────────────
// GET: Returns status of all 4 off-chain engine modules
// Deterministic data, no Math.random

const ENGINE_START_TIME = new Date('2025-01-15T08:00:00Z').getTime()

interface EngineModuleStatus {
  name: string
  port: number
  status: 'online' | 'degraded' | 'offline'
  uptime: string
  uptimeSeconds: number
  lastUpdate: string
  metrics: {
    label: string
    value: string | number
    trend?: 'up' | 'down' | 'stable'
    color?: string
  }[]
  events: string[]
  description: string
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${days}d ${hours}h ${minutes}m`
}

function getUptimeSeconds(): number {
  return Math.floor((Date.now() - ENGINE_START_TIME) / 1000)
}

function getIfdStatus(): EngineModuleStatus {
  const uptime = getUptimeSeconds()
  return {
    name: 'IFD Weight Calculator',
    port: 3005,
    status: 'online',
    uptime: formatUptime(uptime * 1000),
    uptimeSeconds: uptime,
    lastUpdate: new Date(Date.now() - 3000).toISOString(),
    description: 'Incentivized Fluid Democracy delegation graph with weight decay and cycle detection',
    metrics: [
      { label: 'Total Weight', value: '492.80', trend: 'stable', color: 'emerald' },
      { label: 'Active Nodes', value: 6, trend: 'stable', color: 'emerald' },
      { label: 'Cycles Detected', value: 0, trend: 'stable', color: 'emerald' },
      { label: 'Decay Factor', value: '0.8', color: 'slate' },
      { label: 'Max Depth', value: 3, color: 'slate' },
      { label: 'Broadcast Interval', value: '5s', color: 'slate' },
    ],
    events: ['weight_update', 'graph_change', 'cycle_detected'],
  }
}

function getEceStatus(): EngineModuleStatus {
  const uptime = getUptimeSeconds()
  return {
    name: 'ECE Oracle Client',
    port: 3006,
    status: 'online',
    uptime: formatUptime(uptime * 1000),
    uptimeSeconds: uptime,
    lastUpdate: new Date(Date.now() - 1500).toISOString(),
    description: 'Multi-source price aggregation with median calculation and deviation alerts',
    metrics: [
      { label: 'AFC Price', value: '$1.2487', trend: 'up', color: 'emerald' },
      { label: 'ETH Price', value: '$3,452.30', trend: 'stable', color: 'slate' },
      { label: 'BTC Price', value: '$67,180.50', trend: 'down', color: 'amber' },
      { label: 'USDC Price', value: '$1.0001', trend: 'stable', color: 'emerald' },
      { label: 'Avg Confidence', value: '94%', trend: 'stable', color: 'emerald' },
      { label: 'Data Sources', value: '5/5 healthy', color: 'emerald' },
    ],
    events: ['price_update', 'deviation_alert', 'source_health'],
  }
}

function getPoueStatus(): EngineModuleStatus {
  const uptime = getUptimeSeconds()
  return {
    name: 'PoUE ZK Prover',
    port: 3007,
    status: 'online',
    uptime: formatUptime(uptime * 1000),
    uptimeSeconds: uptime,
    lastUpdate: new Date(Date.now() - 5000).toISOString(),
    description: 'Zero-knowledge proof verification with optimistic mode and 7-day challenge period',
    metrics: [
      { label: 'Proofs Verified', value: 127, trend: 'up', color: 'emerald' },
      { label: 'Proofs Rejected', value: 8, trend: 'stable', color: 'amber' },
      { label: 'Pending Queue', value: 3, trend: 'stable', color: 'slate' },
      { label: 'Total Rewards', value: '142.5 AFC', trend: 'up', color: 'emerald' },
      { label: 'Avg Quality', value: '84/100', trend: 'stable', color: 'emerald' },
      { label: 'Challenge Period', value: '7 days', color: 'slate' },
    ],
    events: ['proof_submitted', 'proof_verified', 'proof_rejected', 'reward_distributed'],
  }
}

function getMcpStatus(): EngineModuleStatus {
  const uptime = getUptimeSeconds()
  return {
    name: 'MCP Router',
    port: 3008,
    status: 'online',
    uptime: formatUptime(uptime * 1000),
    uptimeSeconds: uptime,
    lastUpdate: new Date(Date.now() - 4000).toISOString(),
    description: 'Model Context Protocol routing with weighted provider selection and slashing',
    metrics: [
      { label: '#1 CognitionCore', value: '87.40', trend: 'stable', color: 'emerald' },
      { label: '#2 NeuralPath', value: '79.30', trend: 'stable', color: 'emerald' },
      { label: '#3 SynapticLink', value: '72.70', trend: 'down', color: 'amber' },
      { label: 'Total Requests', value: 842, trend: 'up', color: 'emerald' },
      { label: 'Slash Events', value: 2, trend: 'stable', color: 'amber' },
      { label: 'Routing Weights', value: '40/30/30', color: 'slate' },
    ],
    events: ['provider_registered', 'request_routed', 'response_received', 'provider_slashed', 'leaderboard_update'],
  }
}

export async function GET() {
  try {
    const modules: EngineModuleStatus[] = [
      getIfdStatus(),
      getEceStatus(),
      getPoueStatus(),
      getMcpStatus(),
    ]

    const onlineCount = modules.filter(m => m.status === 'online').length
    const totalEvents = modules.reduce((sum, m) => sum + m.events.length, 0)

    return NextResponse.json({
      modules,
      summary: {
        totalModules: 4,
        online: onlineCount,
        degraded: modules.filter(m => m.status === 'degraded').length,
        offline: modules.filter(m => m.status === 'offline').length,
        totalEvents,
        systemUptime: formatUptime(getUptimeSeconds() * 1000),
        lastGlobalUpdate: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('[API] Error in GET /api/engine-status:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
