'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  Radio,
  Shield,
  Network,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Zap,
  Server,
  Wifi,
  WifiOff,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────

interface ModuleMetric {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'stable'
  color?: string
}

interface EngineModuleStatus {
  name: string
  port: number
  status: 'online' | 'degraded' | 'offline'
  uptime: string
  uptimeSeconds: number
  lastUpdate: string
  metrics: ModuleMetric[]
  events: string[]
  description: string
}

interface EngineStatusData {
  modules: EngineModuleStatus[]
  summary: {
    totalModules: number
    online: number
    degraded: number
    offline: number
    totalEvents: number
    systemUptime: string
    lastGlobalUpdate: string
  }
}

// ── Module Icon Map ──────────────────────────────────────────

const MODULE_ICONS: Record<string, React.ReactNode> = {
  'IFD Weight Calculator': <Network className="h-5 w-5" />,
  'ECE Oracle Client': <Radio className="h-5 w-5" />,
  'PoUE ZK Prover': <Shield className="h-5 w-5" />,
  'MCP Router': <Activity className="h-5 w-5" />,
}

const MODULE_COLORS: Record<string, string> = {
  'IFD Weight Calculator': 'from-emerald-500/20 to-teal-500/10',
  'ECE Oracle Client': 'from-violet-500/20 to-purple-500/10',
  'PoUE ZK Prover': 'from-amber-500/20 to-orange-500/10',
  'MCP Router': 'from-sky-500/20 to-cyan-500/10',
}

const MODULE_ACCENT: Record<string, string> = {
  'IFD Weight Calculator': 'border-emerald-500/40',
  'ECE Oracle Client': 'border-violet-500/40',
  'PoUE ZK Prover': 'border-amber-500/40',
  'MCP Router': 'border-sky-500/40',
}

// ── Trend Icon ───────────────────────────────────────────────

function TrendIcon({ trend }: { trend?: string }) {
  if (trend === 'up') return <TrendingUp className="h-3 w-3 text-emerald-400" />
  if (trend === 'down') return <TrendingDown className="h-3 w-3 text-amber-400" />
  return <Minus className="h-3 w-3 text-slate-500" />
}

// ── Status Badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'online') {
    return (
      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        Online
      </Badge>
    )
  }
  if (status === 'degraded') {
    return (
      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30">
        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />
        Degraded
      </Badge>
    )
  }
  return (
    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">
      <WifiOff className="mr-1 h-3 w-3" />
      Offline
    </Badge>
  )
}

// ── Relative Time ────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diff = Math.max(0, Math.floor((now - then) / 1000))
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

// ── Metric Color ─────────────────────────────────────────────

function metricColor(color?: string): string {
  if (color === 'emerald') return 'text-emerald-400'
  if (color === 'amber') return 'text-amber-400'
  if (color === 'red') return 'text-red-400'
  return 'text-slate-300'
}

// ── Module Card ──────────────────────────────────────────────

function ModuleCard({ module, index }: { module: EngineModuleStatus; index: number }) {
  const icon = MODULE_ICONS[module.name] || <Server className="h-5 w-5" />
  const gradient = MODULE_COLORS[module.name] || 'from-slate-500/20 to-slate-500/10'
  const accent = MODULE_ACCENT[module.name] || 'border-slate-500/40'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card className={`bg-slate-800/80 border-slate-700 border-l-2 ${accent} overflow-hidden`}>
        {/* Gradient header bar */}
        <div className={`h-1 bg-gradient-to-r ${gradient}`} />

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient}`}>
                {icon}
              </div>
              <div>
                <CardTitle className="text-sm text-white">{module.name}</CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">
                  {module.description}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <StatusBadge status={module.status} />
              <span className="text-[10px] text-slate-500 font-mono">:{module.port}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {module.metrics.map((metric, i) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 + i * 0.03 }}
                className="bg-slate-900/50 rounded-md px-2.5 py-1.5 border border-slate-700/50"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-slate-500 truncate">{metric.label}</span>
                  <TrendIcon trend={metric.trend} />
                </div>
                <span className={`text-sm font-semibold ${metricColor(metric.color)}`}>
                  {metric.value}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Events & Uptime Footer */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-700/50 pt-2">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span>Uptime: {module.uptime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wifi className="h-3 w-3" />
              <span>Updated {relativeTime(module.lastUpdate)}</span>
            </div>
          </div>

          {/* Events List */}
          <div className="mt-2 flex flex-wrap gap-1">
            {module.events.map((event) => (
              <span
                key={event}
                className="text-[9px] font-mono bg-slate-900/60 text-slate-400 border border-slate-700/40 rounded px-1.5 py-0.5"
              >
                {event}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Main Dashboard Component ─────────────────────────────────

export default function EngineStatusDashboard() {
  const [data, setData] = useState<EngineStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/engine-status')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setData(json)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 10000) // Refresh every 10s
    return () => clearInterval(interval)
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="h-5 w-5 text-emerald-400 animate-pulse" />
          <h3 className="text-white font-semibold">Engine Status</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-slate-900/50 rounded-lg h-48 border border-slate-700/30" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error || !data) {
    return (
      <div className="bg-slate-800/80 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <WifiOff className="h-5 w-5 text-red-400" />
          <h3 className="text-white font-semibold">Engine Status — Connection Error</h3>
        </div>
        <p className="text-sm text-slate-400">{error || 'No data available'}</p>
      </div>
    )
  }

  const { modules, summary } = data

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 sm:p-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Zap className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-base">Off-Chain Engine Status</h3>
            <p className="text-xs text-slate-400">Real-time monitoring of 4 engine microservices</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
            <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
            {summary.online} Online
          </Badge>
          {summary.degraded > 0 && (
            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[10px]">
              {summary.degraded} Degraded
            </Badge>
          )}
          {summary.offline > 0 && (
            <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px]">
              {summary.offline} Offline
            </Badge>
          )}
          <span className="text-[10px] text-slate-500 ml-1">
            System Uptime: {summary.systemUptime}
          </span>
        </div>
      </div>

      {/* System Uptime Bar */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="mb-5 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">System Health</span>
          <span className="text-[10px] text-emerald-400 font-mono">{summary.online}/{summary.totalModules} modules operational</span>
        </div>
        <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(summary.online / summary.totalModules) * 100}%` }}
            transition={{ duration: 1, delay: 0.3 }}
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[9px] text-slate-500">{summary.totalEvents} event types registered</span>
          <span className="text-[9px] text-slate-500">
            Last update: {relativeTime(summary.lastGlobalUpdate)}
          </span>
        </div>
      </motion.div>

      {/* Module Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modules.map((module, index) => (
          <ModuleCard key={module.name} module={module} index={index} />
        ))}
      </div>
    </motion.div>
  )
}
