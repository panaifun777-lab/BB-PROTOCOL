'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Code2,
  Download,
  Webhook,
  Copy,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Zap,
  Terminal,
  Package,
  AlertTriangle,
  Globe,
  Plus,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────
interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  auth: string;
  rateLimit: string;
  status: string;
  version: string;
  category: string;
}

interface ApiKeyEntry {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
  status: string;
  permissions: string[];
  rateLimit: string;
  usage30d: number;
}

interface SdkPackage {
  name: string;
  version: string;
  language: string;
  downloads: number;
  description: string;
  status: string;
  size: string;
  lastUpdate: string;
}

interface RateLimitQuota {
  tier: string;
  rpm: number;
  monthlyQuota: number | string;
  price: string;
}

interface RateLimitStats {
  currentRpm: number;
  maxRpm: number;
  burstLimit: number;
  quotas: RateLimitQuota[];
}

interface UsageHistoryPoint {
  date: string;
  calls: number;
  errors: number;
  avgLatency: number;
}

interface WebhookEntry {
  id: string;
  url: string;
  events: string[];
  status: string;
  successRate: number;
  lastDelivery: string;
}

interface SdkPlatformData {
  apiEndpoints: ApiEndpoint[];
  apiKeys: ApiKeyEntry[];
  sdkPackages: SdkPackage[];
  rateLimitStats: RateLimitStats;
  usageHistory: UsageHistoryPoint[];
  webhooks: WebhookEntry[];
}

// ── Color Config ───────────────────────────────────────
const METHOD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  POST: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  PUT: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  stable: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  beta: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  alpha: { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/30' },
  active: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  revoked: { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30' },
  paused: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
};

const LANGUAGE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  TypeScript: { bg: 'bg-blue-500/15', text: 'text-blue-300', icon: 'TS' },
  Python: { bg: 'bg-amber-500/15', text: 'text-amber-300', icon: 'Py' },
  React: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', icon: 'Re' },
  Rust: { bg: 'bg-orange-500/15', text: 'text-orange-300', icon: 'Rs' },
  Go: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', icon: 'Go' },
};

const CATEGORIES = ['All', 'Avatar', 'Skill', 'Revenue', 'Resonance', 'Governance', 'Payment', 'Compliance'] as const;

// ── Helpers ────────────────────────────────────────────
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getRelativeTime(iso: string): string {
  const now = new Date('2026-03-10T15:00:00Z');
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}小时前`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}天前`;
}

function truncateUrl(url: string, maxLen = 40): string {
  if (url.length <= maxLen) return url;
  return url.substring(0, maxLen - 3) + '...';
}

function maskKey(prefix: string): string {
  const suffix = prefix.substring(prefix.length - 2);
  const masked = '****';
  return `${prefix}${masked}${suffix}k2`;
}

function getInstallCommand(pkg: SdkPackage): string {
  if (pkg.language === 'TypeScript' || pkg.language === 'React') return `npm install ${pkg.name}`;
  if (pkg.language === 'Python') return `pip install ${pkg.name.replace('@', '').replace('/', '-')}`;
  if (pkg.language === 'Rust') return `cargo add ${pkg.name.replace('@', '').replace('/', '-')}`;
  if (pkg.language === 'Go') return `go get ${pkg.name.replace('@', '')}`;
  return `npm install ${pkg.name}`;
}

// ── Custom Tooltip for Usage Chart ─────────────────────
function UsageChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="tabular-nums" style={{ color: entry.color }}>
          {entry.dataKey === 'calls' ? '调用次数' : entry.dataKey === 'errors' ? '错误数' : '平均延迟'}: {entry.dataKey === 'avgLatency' ? `${entry.value}ms` : entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ── Copy Button ────────────────────────────────────────
function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'shrink-0 flex items-center justify-center rounded-md p-1 transition-colors',
        copied ? 'bg-emerald-500/20' : 'bg-slate-700/50 hover:bg-slate-600/50',
        className,
      )}
      aria-label="复制"
    >
      {copied ? (
        <CheckCircle className="size-3.5 text-emerald-400" />
      ) : (
        <Copy className="size-3.5 text-slate-400" />
      )}
    </button>
  );
}

// ── Endpoint Row ───────────────────────────────────────
function EndpointRow({ endpoint, expanded, onToggle }: { endpoint: ApiEndpoint; expanded: boolean; onToggle: () => void }) {
  const methodConf = METHOD_COLORS[endpoint.method] || METHOD_COLORS.GET;
  const statusConf = STATUS_COLORS[endpoint.status] || STATUS_COLORS.stable;

  const curlExample = endpoint.method === 'GET'
    ? `curl -X ${endpoint.method} https://api.afc.ai${endpoint.path} \\\n  -H "Authorization: Bearer afc_prod_x7k2" \\\n  -H "Content-Type: application/json"`
    : endpoint.method === 'POST'
    ? `curl -X ${endpoint.method} https://api.afc.ai${endpoint.path} \\\n  -H "Authorization: Bearer+Sig afc_prod_x7k2" \\\n  -H "Content-Type: application/json" \\\n  -d '{"data": "example"}'`
    : `curl -X ${endpoint.method} https://api.afc.ai${endpoint.path} \\\n  -H "Authorization: Bearer+Sig afc_prod_x7k2" \\\n  -H "Content-Type: application/json" \\\n  -d '{"cognitionRoot": "0xab12..."}'`;

  const jsonResponse = endpoint.method === 'GET' && endpoint.path.includes('avatars/:id')
    ? `{\n  "id": "avatar_7a3f",\n  "name": "Echo-Alpha",\n  "cognitionRoot": "0xab12cd34...",\n  "resonanceScore": 82,\n  "circuitState": "NORMAL",\n  "createdAt": "2026-01-15T08:00:00Z"\n}`
    : endpoint.method === 'GET'
    ? `{\n  "data": [...],\n  "total": 42,\n  "page": 1,\n  "pageSize": 20\n}`
    : `{\n  "success": true,\n  "txHash": "0x1234...abcd",\n  "timestamp": "2026-03-10T14:30:00Z"\n}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border border-slate-700/50 bg-slate-800/40"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-700/20 transition-colors"
      >
        <Badge variant="outline" className={cn('shrink-0 text-[10px] font-mono font-bold px-2 py-0.5', methodConf.bg, methodConf.text, methodConf.border)}>
          {endpoint.method}
        </Badge>
        <span className="text-xs font-mono text-slate-200 shrink-0">{endpoint.path}</span>
        <span className="text-[11px] text-slate-400 truncate flex-1 hidden sm:inline">{endpoint.description}</span>
        <Badge variant="outline" className={cn('shrink-0 text-[9px] px-1.5 py-0', statusConf.bg, statusConf.text, statusConf.border)}>
          {endpoint.status}
        </Badge>
        {expanded ? <ChevronDown className="size-3.5 text-slate-500 shrink-0" /> : <ChevronRight className="size-3.5 text-slate-500 shrink-0" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-slate-700/30 space-y-2">
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="text-slate-500">认证:</span>
                <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-300 border-violet-500/20">{endpoint.auth}</Badge>
                <span className="text-slate-500 ml-2">限速:</span>
                <Badge variant="outline" className="text-[9px] bg-slate-600/20 text-slate-300 border-slate-600/30">{endpoint.rateLimit}</Badge>
                <span className="text-slate-500 ml-2">版本:</span>
                <Badge variant="outline" className="text-[9px] bg-slate-600/20 text-slate-300 border-slate-600/30">{endpoint.version}</Badge>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 mb-1 font-medium">cURL 示例</p>
                <div className="relative rounded-md bg-slate-900/80 p-2.5">
                  <pre className="text-[10px] text-emerald-300/90 font-mono whitespace-pre-wrap overflow-x-auto">{curlExample}</pre>
                  <CopyButton text={curlExample} className="absolute top-1.5 right-1.5" />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 mb-1 font-medium">JSON 响应</p>
                <div className="relative rounded-md bg-slate-900/80 p-2.5">
                  <pre className="text-[10px] text-violet-300/90 font-mono whitespace-pre-wrap overflow-x-auto">{jsonResponse}</pre>
                  <CopyButton text={jsonResponse} className="absolute top-1.5 right-1.5" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── API Key Card ───────────────────────────────────────
function ApiKeyCard({ apiKey }: { apiKey: ApiKeyEntry }) {
  const statusConf = STATUS_COLORS[apiKey.status] || STATUS_COLORS.active;
  const isRevoked = apiKey.status === 'revoked';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-xl border p-4',
        isRevoked ? 'border-red-500/20 bg-red-500/5' : 'border-slate-700 bg-slate-800/60',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Key className="size-3.5 text-violet-400 shrink-0" />
            <span className={cn('text-sm font-medium truncate', isRevoked ? 'text-slate-500' : 'text-slate-200')}>{apiKey.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <code className={cn('text-xs font-mono', isRevoked ? 'text-slate-600' : 'text-slate-400')}>{maskKey(apiKey.prefix)}</code>
            <CopyButton text={`${apiKey.prefix}example_key_value_x7k2`} />
          </div>
        </div>
        <Badge variant="outline" className={cn('shrink-0 text-[10px]', statusConf.bg, statusConf.text, statusConf.border)}>
          {apiKey.status === 'active' ? '活跃' : '已吊销'}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {apiKey.permissions.map((perm) => (
          <Badge key={perm} variant="outline" className={cn(
            'text-[9px]',
            perm === 'admin' ? 'bg-red-500/10 text-red-300 border-red-500/20' :
            perm === 'write' ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' :
            'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
          )}>
            {perm}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-500">限速</span>
          <span className="text-slate-300 font-medium">{apiKey.rateLimit}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">30天调用</span>
          <span className="text-emerald-400 font-medium tabular-nums">{formatNumber(apiKey.usage30d)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">创建</span>
          <span className="text-slate-300">{apiKey.createdAt}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">最后使用</span>
          <span className="text-slate-300">{getRelativeTime(apiKey.lastUsed)}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700/30">
        <Button variant="outline" size="sm" className="h-7 text-[10px] border-slate-600 bg-slate-700/30 text-slate-300 hover:bg-slate-600/30">
          <Copy className="mr-1 size-3" /> 复制密钥
        </Button>
        {!isRevoked && (
          <Button variant="outline" size="sm" className="h-7 text-[10px] border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200">
            <XCircle className="mr-1 size-3" /> 吊销
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ── SDK Package Card ───────────────────────────────────
function SdkPackageCard({ pkg }: { pkg: SdkPackage }) {
  const langConf = LANGUAGE_COLORS[pkg.language] || LANGUAGE_COLORS.TypeScript;
  const statusConf = STATUS_COLORS[pkg.status] || STATUS_COLORS.stable;
  const installCmd = getInstallCommand(pkg);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-slate-700 bg-slate-800/60 p-4"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={cn('flex size-9 items-center justify-center rounded-lg text-xs font-bold shrink-0', langConf.bg, langConf.text)}>
          {langConf.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-mono font-medium text-slate-200">{pkg.name}</span>
            <Badge variant="outline" className="text-[9px] bg-slate-600/20 text-slate-300 border-slate-600/30">v{pkg.version}</Badge>
            <Badge variant="outline" className={cn('text-[9px]', statusConf.bg, statusConf.text, statusConf.border)}>{pkg.status}</Badge>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{pkg.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-[10px]">
        <div className="flex items-center gap-1.5">
          <Download className="size-3 text-emerald-400" />
          <span className="text-slate-300 tabular-nums">{formatNumber(pkg.downloads)}</span>
          <span className="text-slate-500">下载</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Package className="size-3 text-violet-400" />
          <span className="text-slate-300">{pkg.size}</span>
        </div>
      </div>

      <div className="relative rounded-md bg-slate-900/80 p-2 mb-3">
        <code className="text-[10px] text-emerald-300/90 font-mono">{installCmd}</code>
        <CopyButton text={installCmd} className="absolute top-1 right-1" />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[9px] text-slate-500">更新于 {pkg.lastUpdate}</span>
        <Button variant="outline" size="sm" className="h-6 text-[10px] border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:text-violet-200">
          <FileText className="mr-1 size-3" /> 查看文档
        </Button>
      </div>
    </motion.div>
  );
}

// ── Webhook Card ───────────────────────────────────────
function WebhookCard({ webhook }: { webhook: WebhookEntry }) {
  const statusConf = STATUS_COLORS[webhook.status] || STATUS_COLORS.active;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-xl border p-4',
        webhook.status === 'paused' ? 'border-amber-500/20 bg-amber-500/5' : 'border-slate-700 bg-slate-800/60',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="size-3.5 text-violet-400 shrink-0" />
            <span className="text-xs font-mono text-slate-200 truncate" title={webhook.url}>{truncateUrl(webhook.url)}</span>
          </div>
        </div>
        <Badge variant="outline" className={cn('shrink-0 text-[10px]', statusConf.bg, statusConf.text, statusConf.border)}>
          {webhook.status === 'active' ? '活跃' : '已暂停'}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {webhook.events.map((evt) => (
          <Badge key={evt} variant="outline" className="text-[9px] bg-violet-500/10 text-violet-300 border-violet-500/20">{evt}</Badge>
        ))}
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-slate-400">成功率</span>
            <span className={cn('font-medium tabular-nums', webhook.successRate >= 99 ? 'text-emerald-400' : webhook.successRate >= 97 ? 'text-amber-400' : 'text-red-400')}>
              {webhook.successRate}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                webhook.successRate >= 99 ? 'bg-emerald-500' : webhook.successRate >= 97 ? 'bg-amber-500' : 'bg-red-500',
              )}
              initial={{ width: 0 }}
              animate={{ width: `${webhook.successRate}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-500">最后投递</span>
          <span className="text-slate-300">{getRelativeTime(webhook.lastDelivery)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Tier Card ──────────────────────────────────────────
function TierCard({ quota, isCurrent }: { quota: RateLimitQuota; isCurrent: boolean }) {
  const tierColors: Record<string, { border: string; bg: string; accent: string; icon: React.ElementType }> = {
    Free: { border: 'border-slate-600', bg: 'bg-slate-800/60', accent: 'text-slate-300', icon: Zap },
    Pro: { border: isCurrent ? 'border-emerald-500/40' : 'border-slate-600', bg: isCurrent ? 'bg-emerald-500/5' : 'bg-slate-800/60', accent: 'text-emerald-400', icon: Shield },
    Enterprise: { border: isCurrent ? 'border-violet-500/40' : 'border-slate-600', bg: isCurrent ? 'bg-violet-500/5' : 'bg-slate-800/60', accent: 'text-violet-400', icon: Globe },
  };
  const conf = tierColors[quota.tier] || tierColors.Free;
  const Icon = conf.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('rounded-xl border p-4', conf.border, conf.bg)}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn('size-4', conf.accent)} />
        <span className={cn('text-sm font-bold', conf.accent)}>{quota.tier}</span>
        <span className="ml-auto text-sm font-semibold text-slate-200">{quota.price}</span>
      </div>

      <div className="space-y-2 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-400">RPM 限制</span>
          <span className="text-slate-200 font-medium tabular-nums">{quota.rpm.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">月度配额</span>
          <span className="text-slate-200 font-medium">{typeof quota.monthlyQuota === 'number' ? quota.monthlyQuota.toLocaleString() : quota.monthlyQuota}</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-700/30">
        {isCurrent ? (
          <Badge className="w-full justify-center bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">当前方案</Badge>
        ) : (
          <Button variant="outline" size="sm" className="w-full h-7 text-[10px] border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:text-violet-200">
            升级
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────
export default function SdkPlatform() {
  const [data, setData] = useState<SdkPlatformData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('docs');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/sdk-platform')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleEndpoint = useCallback((path: string) => {
    setExpandedEndpoints((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  // ── Filtered endpoints ─────────────────────────────
  const filteredEndpoints = useMemo(() => {
    if (!data) return [];
    return data.apiEndpoints.filter((ep) => {
      const matchesCategory = categoryFilter === 'All' || ep.category === categoryFilter;
      const matchesSearch = !searchQuery ||
        ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ep.method.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [data, categoryFilter, searchQuery]);

  // ── Endpoint stats ─────────────────────────────────
  const endpointStats = useMemo(() => {
    if (!data) return { total: 0, stable: 0, beta: 0, alpha: 0 };
    return {
      total: data.apiEndpoints.length,
      stable: data.apiEndpoints.filter((e) => e.status === 'stable').length,
      beta: data.apiEndpoints.filter((e) => e.status === 'beta').length,
      alpha: data.apiEndpoints.filter((e) => e.status === 'alpha').length,
    };
  }, [data]);

  // ── Key stats ──────────────────────────────────────
  const keyStats = useMemo(() => {
    if (!data) return { activeKeys: 0, totalCalls: 0 };
    return {
      activeKeys: data.apiKeys.filter((k) => k.status === 'active').length,
      totalCalls: data.apiKeys.reduce((s, k) => s + k.usage30d, 0),
    };
  }, [data]);

  // ── Webhook stats ──────────────────────────────────
  const webhookStats = useMemo(() => {
    if (!data) return { active: 0, paused: 0 };
    return {
      active: data.webhooks.filter((w) => w.status === 'active').length,
      paused: data.webhooks.filter((w) => w.status === 'paused').length,
    };
  }, [data]);

  // ── Loading State ──────────────────────────────────
  if (loading || !data) {
    return (
      <Card className="border-slate-700 bg-slate-800/80">
        <CardContent className="p-6 flex items-center justify-center min-h-[300px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3"
          >
            <Code2 className="size-8 text-violet-400 animate-pulse" />
            <p className="text-slate-400 text-sm">加载 SDK/API 平台数据...</p>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  // ── Tab Content Renderers ──────────────────────────
  const renderDocs = () => (
    <div className="space-y-5">
      {/* API Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '总端点', value: endpointStats.total, color: 'text-slate-200', bg: 'bg-slate-800/60' },
          { label: 'Stable', value: endpointStats.stable, color: 'text-emerald-400', bg: 'bg-emerald-500/5' },
          { label: 'Beta', value: endpointStats.beta, color: 'text-amber-400', bg: 'bg-amber-500/5' },
          { label: 'Alpha', value: endpointStats.alpha, color: 'text-violet-400', bg: 'bg-violet-500/5' },
        ].map((stat) => (
          <div key={stat.label} className={cn('rounded-lg border border-slate-700 p-3 text-center', stat.bg)}>
            <p className={cn('text-xl font-bold tabular-nums', stat.color)}>{stat.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Category Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
          <Input
            placeholder="搜索端点路径或描述..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-slate-800/60 border-slate-700 text-slate-200 text-xs placeholder:text-slate-500"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors',
                categoryFilter === cat
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'bg-slate-800/40 text-slate-400 border border-slate-700/50 hover:bg-slate-700/30 hover:text-slate-300',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Endpoint List */}
      <ScrollArea className="max-h-96">
        <div className="space-y-2 pr-2">
          {filteredEndpoints.length === 0 ? (
            <div className="text-center py-8">
              <Search className="size-6 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">未找到匹配的端点</p>
            </div>
          ) : (
            filteredEndpoints.map((ep) => (
              <EndpointRow
                key={`${ep.method}-${ep.path}`}
                endpoint={ep}
                expanded={expandedEndpoints.has(`${ep.method}-${ep.path}`)}
                onToggle={() => toggleEndpoint(`${ep.method}-${ep.path}`)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const renderKeys = () => (
    <div className="space-y-5">
      {/* Key Overview + Rate Limit Gauge */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-700 bg-emerald-500/5 p-3 text-center">
            <p className="text-xl font-bold text-emerald-400 tabular-nums">{keyStats.activeKeys}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">活跃密钥</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-violet-500/5 p-3 text-center">
            <p className="text-xl font-bold text-violet-400 tabular-nums">{formatNumber(keyStats.totalCalls)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">30天总调用</p>
          </div>
        </div>

        {/* Rate Limit Gauge */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="size-4 text-amber-400" />
            <h4 className="text-xs font-semibold text-slate-200">速率限制</h4>
          </div>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-slate-400">当前 RPM</span>
            <span className="text-emerald-400 font-bold tabular-nums">{data.rateLimitStats.currentRpm}</span>
          </div>
          <div className="h-3 rounded-full bg-slate-700/50 overflow-hidden mb-2">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-500"
              initial={{ width: 0 }}
              animate={{ width: `${(data.rateLimitStats.currentRpm / data.rateLimitStats.maxRpm) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">0</span>
            <span className="text-slate-300 tabular-nums">{(data.rateLimitStats.currentRpm / data.rateLimitStats.maxRpm * 100).toFixed(1)}%</span>
            <span className="text-slate-500">{data.rateLimitStats.maxRpm.toLocaleString()} RPM</span>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/30">
            <AlertTriangle className="size-3 text-amber-400" />
            <span className="text-[10px] text-slate-400">突发限制: <span className="text-amber-300 font-medium">{data.rateLimitStats.burstLimit} req</span></span>
          </div>
        </div>
      </div>

      {/* Create Key Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
        >
          <Plus className="mr-1.5 size-3.5" /> 创建新密钥
        </Button>
      </div>

      {/* Key List */}
      <div className="space-y-3">
        {data.apiKeys.map((key) => (
          <ApiKeyCard key={key.id} apiKey={key} />
        ))}
      </div>
    </div>
  );

  const renderDownloads = () => (
    <div className="space-y-5">
      {/* SDK Packages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.sdkPackages.map((pkg) => (
          <SdkPackageCard key={pkg.name} pkg={pkg} />
        ))}
      </div>

      {/* Usage Analytics Chart */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Code2 className="size-4 text-emerald-400" />
          <h4 className="text-xs font-semibold text-slate-200">API 调用量 & 延迟趋势 (7天)</h4>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.usageHistory} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={false} tickFormatter={(v: number) => formatNumber(v)} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#334155' }} tickLine={false} tickFormatter={(v: number) => `${v}ms`} />
              <Tooltip content={<UsageChartTooltip />} />
              <Bar yAxisId="left" dataKey="calls" fill="url(#barGrad)" radius={[3, 3, 0, 0]} barSize={24} />
              <Line yAxisId="right" type="monotone" dataKey="avgLatency" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-2 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-sm bg-emerald-500" />
            <span className="text-slate-400">API 调用次数</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full bg-violet-500" />
            <span className="text-slate-400">平均延迟 (ms)</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWebhooks = () => (
    <div className="space-y-5">
      {/* Webhook Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-emerald-400" />
              <span className="text-[11px] text-slate-300">{webhookStats.active} 活跃</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2 rounded-full bg-amber-400" />
              <span className="text-[11px] text-slate-300">{webhookStats.paused} 暂停</span>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-[10px] border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 hover:text-violet-200">
            <Plus className="mr-1 size-3" /> 添加 Webhook
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.webhooks.map((wh) => (
            <WebhookCard key={wh.id} webhook={wh} />
          ))}
        </div>
      </div>

      {/* Rate Limit Quotas */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="size-4 text-emerald-400" />
          <h4 className="text-xs font-semibold text-slate-200">配额方案</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {data.rateLimitStats.quotas.map((quota) => (
            <TierCard key={quota.tier} quota={quota} isCurrent={quota.tier === 'Pro'} />
          ))}
        </div>
      </div>

      {/* Current Usage Summary */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="size-4 text-amber-400" />
          <h4 className="text-xs font-semibold text-slate-200">当前用量概览</h4>
        </div>
        <div className="space-y-4">
          {/* RPM Usage */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-slate-400">RPM 用量</span>
              <span className="text-slate-200 tabular-nums">
                <span className="text-emerald-400 font-bold">{data.rateLimitStats.currentRpm}</span>
                <span className="text-slate-500"> / {data.rateLimitStats.maxRpm.toLocaleString()}</span>
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-700/50 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-amber-500"
                initial={{ width: 0 }}
                animate={{ width: `${(data.rateLimitStats.currentRpm / data.rateLimitStats.maxRpm) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] mt-1">
              <span className="text-slate-600">0</span>
              <span className="text-emerald-400 font-medium tabular-nums">
                {(data.rateLimitStats.currentRpm / data.rateLimitStats.maxRpm * 100).toFixed(1)}% 已用
              </span>
              <span className="text-slate-600">{data.rateLimitStats.maxRpm.toLocaleString()}</span>
            </div>
          </div>

          {/* Monthly Quota (Pro) */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-slate-400">月度配额 (Pro)</span>
              <span className="text-slate-200 tabular-nums">
                <span className="text-emerald-400 font-bold">{formatNumber(keyStats.totalCalls)}</span>
                <span className="text-slate-500"> / 500K</span>
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-700/50 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((keyStats.totalCalls / 500000) * 100, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="flex items-center justify-between text-[9px] mt-1">
              <span className="text-slate-600">0</span>
              <span className={cn('font-medium tabular-nums', keyStats.totalCalls / 500000 > 0.8 ? 'text-amber-400' : 'text-emerald-400')}>
                {(keyStats.totalCalls / 500000 * 100).toFixed(1)}% 已用
              </span>
              <span className="text-slate-600">500,000</span>
            </div>
          </div>

          {/* 7-day call summary */}
          <div className="pt-3 border-t border-slate-700/30">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-sm font-bold text-emerald-400 tabular-nums">{formatNumber(data.usageHistory.reduce((s, d) => s + d.calls, 0))}</p>
                <p className="text-[9px] text-slate-500">7天总调用</p>
              </div>
              <div>
                <p className="text-sm font-bold text-red-400 tabular-nums">{data.usageHistory.reduce((s, d) => s + d.errors, 0)}</p>
                <p className="text-[9px] text-slate-500">7天总错误</p>
              </div>
              <div>
                <p className="text-sm font-bold text-violet-400 tabular-nums">{Math.round(data.usageHistory.reduce((s, d) => s + d.avgLatency, 0) / data.usageHistory.length)}ms</p>
                <p className="text-[9px] text-slate-500">平均延迟</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const TAB_CONFIG = [
    { id: 'docs', label: 'API 文档', icon: Code2 },
    { id: 'keys', label: 'API 密钥', icon: Key },
    { id: 'downloads', label: 'SDK 下载', icon: Download },
    { id: 'webhooks', label: 'Webhook & 配额', icon: Webhook },
  ];

  return (
    <Card className="border-slate-700 bg-slate-800/80">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-violet-500/20 border border-violet-500/20">
              <Terminal className="size-4 text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-sm text-slate-100">SDK/API 开放平台</CardTitle>
              <p className="text-[10px] text-slate-500 mt-0.5">RESTful API · 多语言 SDK · Webhook 集成</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
            <div className="size-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
            在线
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-900/60 border border-slate-700/50 h-9 p-0.5 w-full sm:w-auto">
            {TAB_CONFIG.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="text-[11px] px-3 py-1.5 data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 gap-1.5"
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="mt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'docs' && renderDocs()}
                {activeTab === 'keys' && renderKeys()}
                {activeTab === 'downloads' && renderDownloads()}
                {activeTab === 'webhooks' && renderWebhooks()}
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
