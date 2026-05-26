// ===== AI分身系统 — 性能优化监控 API =====

import { NextResponse } from 'next/server';

// ── Types ──────────────────────────────────────────────
interface PerformanceMetric {
  name: string;
  value: number;
  target: number;
  unit: string;
  status: 'good' | 'needs_improvement' | 'poor';
}

interface CacheStrategyEntry {
  id: string;
  name: string;
  ttl: number;
  ttlLabel: string;
  hitRate: number;
  swrInterval: number;
  swrLabel: string;
  type: 'ssr' | 'api' | 'static' | 'isr' | 'cdn';
}

interface CDNConfig {
  provider: string;
  edgeLocations: string;
  cacheHitRate: number;
  bandwidthSaved: string;
  ssl: string;
  http2: boolean;
  brotli: boolean;
}

interface LazyLoadingModule {
  id: string;
  name: string;
  chunkSize: number;
  loadTime: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  loaded: boolean;
}

interface BudgetItem {
  category: string;
  actual: number;
  budget: number;
  unit: string;
}

interface PerformanceBudget {
  items: BudgetItem[];
  firstPartyRequests: number;
  thirdPartyRequests: number;
  waterfallDepth: number;
}

interface SparklinePoint {
  day: string;
  value: number;
}

interface CacheTrendPoint {
  time: string;
  hitRate: number;
}

interface OptimizationRecommendation {
  id: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedSavings: string;
  description: string;
}

interface PerformanceAlert {
  id: string;
  title: string;
  severity: 'warning' | 'critical';
  description: string;
  timestamp: string;
}

interface PerformanceData {
  metrics: PerformanceMetric[];
  cacheStrategies: CacheStrategyEntry[];
  cdnConfig: CDNConfig;
  lazyModules: LazyLoadingModule[];
  budget: PerformanceBudget;
  performanceScore: number;
  jsBundleSize: number;
  jsBundleBudget: number;
  cssBundleSize: number;
  imageOptimizationRate: number;
  cacheHitRate: number;
  cdnBandwidthSaved: string;
  sparklines: Record<string, SparklinePoint[]>;
  cacheTrend: CacheTrendPoint[];
  recommendations: OptimizationRecommendation[];
  alerts: PerformanceAlert[];
}

// ── Deterministic Mock Data ────────────────────────────
const METRICS: PerformanceMetric[] = [
  {
    name: 'FCP',
    value: 1.2,
    target: 1.8,
    unit: 's',
    status: 'good',
  },
  {
    name: 'LCP',
    value: 2.1,
    target: 2.5,
    unit: 's',
    status: 'good',
  },
  {
    name: 'INP',
    value: 120,
    target: 200,
    unit: 'ms',
    status: 'good',
  },
  {
    name: 'CLS',
    value: 0.05,
    target: 0.1,
    unit: '',
    status: 'good',
  },
  {
    name: 'TTFB',
    value: 180,
    target: 200,
    unit: 'ms',
    status: 'good',
  },
];

const CACHE_STRATEGIES: CacheStrategyEntry[] = [
  {
    id: 'cs_1',
    name: 'SSR 页面缓存',
    ttl: 300,
    ttlLabel: '300s',
    hitRate: 87,
    swrInterval: 30,
    swrLabel: '30s',
    type: 'ssr',
  },
  {
    id: 'cs_2',
    name: 'API 响应缓存',
    ttl: 60,
    ttlLabel: '60s',
    hitRate: 92,
    swrInterval: 10,
    swrLabel: '10s',
    type: 'api',
  },
  {
    id: 'cs_3',
    name: '静态资源缓存',
    ttl: 31536000,
    ttlLabel: '1年',
    hitRate: 99,
    swrInterval: 0,
    swrLabel: 'immutable',
    type: 'static',
  },
  {
    id: 'cs_4',
    name: 'ISR 增量缓存',
    ttl: 600,
    ttlLabel: '600s',
    hitRate: 78,
    swrInterval: 60,
    swrLabel: '60s',
    type: 'isr',
  },
  {
    id: 'cs_5',
    name: 'CDN 边缘缓存',
    ttl: 1800,
    ttlLabel: '1800s',
    hitRate: 85,
    swrInterval: 0,
    swrLabel: 'purge',
    type: 'cdn',
  },
];

const CDN_CONFIG: CDNConfig = {
  provider: 'Cloudflare',
  edgeLocations: '280+',
  cacheHitRate: 91.2,
  bandwidthSaved: '847GB/月',
  ssl: 'TLS 1.3',
  http2: true,
  brotli: true,
};

const LAZY_MODULES: LazyLoadingModule[] = [
  {
    id: 'lm_1',
    name: 'cognitive-card',
    chunkSize: 12,
    loadTime: 45,
    priority: 'critical',
    loaded: true,
  },
  {
    id: 'lm_2',
    name: 'split-dashboard',
    chunkSize: 18,
    loadTime: 62,
    priority: 'critical',
    loaded: true,
  },
  {
    id: 'lm_3',
    name: 'resonance-wave',
    chunkSize: 24,
    loadTime: 85,
    priority: 'high',
    loaded: true,
  },
  {
    id: 'lm_4',
    name: 'contract-simulation',
    chunkSize: 32,
    loadTime: 120,
    priority: 'medium',
    loaded: false,
  },
  {
    id: 'lm_5',
    name: 'lp-liquidity',
    chunkSize: 28,
    loadTime: 95,
    priority: 'medium',
    loaded: false,
  },
  {
    id: 'lm_6',
    name: 'security-audit',
    chunkSize: 22,
    loadTime: 78,
    priority: 'low',
    loaded: false,
  },
  {
    id: 'lm_7',
    name: 'compliance-panel',
    chunkSize: 20,
    loadTime: 70,
    priority: 'low',
    loaded: false,
  },
  {
    id: 'lm_8',
    name: 'avatar-marketplace',
    chunkSize: 15,
    loadTime: 55,
    priority: 'high',
    loaded: true,
  },
];

const BUDGET: PerformanceBudget = {
  items: [
    { category: 'JS', actual: 142, budget: 150, unit: 'KB' },
    { category: 'CSS', actual: 28, budget: 50, unit: 'KB' },
    { category: 'Images', actual: 89, budget: 200, unit: 'KB' },
    { category: 'Fonts', actual: 42, budget: 80, unit: 'KB' },
  ],
  firstPartyRequests: 12,
  thirdPartyRequests: 3,
  waterfallDepth: 4,
};

// Deterministic sparkline data (7 days, no Math.random)
const SPARKLINES: Record<string, SparklinePoint[]> = {
  FCP: [
    { day: 'Mon', value: 1.4 },
    { day: 'Tue', value: 1.3 },
    { day: 'Wed', value: 1.35 },
    { day: 'Thu', value: 1.25 },
    { day: 'Fri', value: 1.2 },
    { day: 'Sat', value: 1.18 },
    { day: 'Sun', value: 1.2 },
  ],
  LCP: [
    { day: 'Mon', value: 2.5 },
    { day: 'Tue', value: 2.4 },
    { day: 'Wed', value: 2.3 },
    { day: 'Thu', value: 2.2 },
    { day: 'Fri', value: 2.15 },
    { day: 'Sat', value: 2.12 },
    { day: 'Sun', value: 2.1 },
  ],
  INP: [
    { day: 'Mon', value: 150 },
    { day: 'Tue', value: 145 },
    { day: 'Wed', value: 140 },
    { day: 'Thu', value: 135 },
    { day: 'Fri', value: 128 },
    { day: 'Sat', value: 122 },
    { day: 'Sun', value: 120 },
  ],
  CLS: [
    { day: 'Mon', value: 0.08 },
    { day: 'Tue', value: 0.07 },
    { day: 'Wed', value: 0.065 },
    { day: 'Thu', value: 0.06 },
    { day: 'Fri', value: 0.055 },
    { day: 'Sat', value: 0.052 },
    { day: 'Sun', value: 0.05 },
  ],
  TTFB: [
    { day: 'Mon', value: 210 },
    { day: 'Tue', value: 200 },
    { day: 'Wed', value: 195 },
    { day: 'Thu', value: 190 },
    { day: 'Fri', value: 185 },
    { day: 'Sat', value: 182 },
    { day: 'Sun', value: 180 },
  ],
};

// Deterministic cache trend data (24h, every 2 hours)
const CACHE_TREND: CacheTrendPoint[] = [
  { time: '00:00', hitRate: 88.2 },
  { time: '02:00', hitRate: 89.5 },
  { time: '04:00', hitRate: 90.1 },
  { time: '06:00', hitRate: 89.8 },
  { time: '08:00', hitRate: 88.5 },
  { time: '10:00', hitRate: 87.2 },
  { time: '12:00', hitRate: 86.5 },
  { time: '14:00', hitRate: 87.8 },
  { time: '16:00', hitRate: 89.2 },
  { time: '18:00', hitRate: 90.5 },
  { time: '20:00', hitRate: 91.2 },
  { time: '22:00', hitRate: 91.0 },
];

const RECOMMENDATIONS: OptimizationRecommendation[] = [
  {
    id: 'rec_1',
    title: '延迟加载非关键字体',
    priority: 'high',
    estimatedSavings: '12KB / 200ms',
    description: '将非首屏字体改为font-display:swap，减少初始阻塞资源',
  },
  {
    id: 'rec_2',
    title: '启用图片AVIF格式',
    priority: 'medium',
    estimatedSavings: '25KB / 图片',
    description: '将WebP图片升级为AVIF格式，可进一步减少30%体积',
  },
  {
    id: 'rec_3',
    title: '预连接第三方域名',
    priority: 'medium',
    estimatedSavings: '100ms TTFB',
    description: '添加dns-prefetch和preconnect提示，加速第三方资源加载',
  },
  {
    id: 'rec_4',
    title: '合并小请求为HTTP/2多路复用',
    priority: 'low',
    estimatedSavings: '2个请求',
    description: '将3个第三方请求合并为1个，减少连接开销',
  },
  {
    id: 'rec_5',
    title: 'ISR缓存TTL优化',
    priority: 'high',
    estimatedSavings: '15% 缓存命中率',
    description: '将ISR revalidate从60s调整为120s，提高缓存效率',
  },
];

const ALERTS: PerformanceAlert[] = [
  {
    id: 'alert_1',
    title: 'JS Bundle 接近预算上限',
    severity: 'warning',
    description: 'JS Bundle已达142KB/150KB (94.7%)，建议关注新增依赖体积',
    timestamp: '2026-03-04T08:30:00Z',
  },
  {
    id: 'alert_2',
    title: 'ISR缓存命中率下降',
    severity: 'warning',
    description: 'ISR缓存命中率从82%降至78%，可能需要调整revalidate间隔',
    timestamp: '2026-03-04T06:15:00Z',
  },
];

// ── GET Handler ────────────────────────────────────────
export async function GET() {
  try {
    const data: PerformanceData = {
      metrics: METRICS,
      cacheStrategies: CACHE_STRATEGIES,
      cdnConfig: CDN_CONFIG,
      lazyModules: LAZY_MODULES,
      budget: BUDGET,
      performanceScore: 94,
      jsBundleSize: 142,
      jsBundleBudget: 150,
      cssBundleSize: 28,
      imageOptimizationRate: 94,
      cacheHitRate: 91.2,
      cdnBandwidthSaved: '847GB/月',
      sparklines: SPARKLINES,
      cacheTrend: CACHE_TREND,
      recommendations: RECOMMENDATIONS,
      alerts: ALERTS,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] Error in GET /api/performance:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
