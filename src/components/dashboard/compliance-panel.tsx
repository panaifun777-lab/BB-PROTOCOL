'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  ShieldCheck,
  Globe,
  Eye,
  FileText,
  Gavel,
  MapPin,
  CheckCircle,
  AlertCircle,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────

type PluginStatus = 'active' | 'inactive';
type JurisdictionStatus = 'in_progress' | 'pending' | 'not_required';
type AccessibilityResult = 'pass' | 'partial' | 'fail';

interface CompliancePlugin {
  id: string;
  name: string;
  label: string;
  icon: string;
  description: string;
  isActive: boolean;
  activationCondition: string;
  futureIntegration: string;
  status: PluginStatus;
}

interface Jurisdiction {
  id: string;
  name: string;
  flag: string;
  entityName: string;
  status: JurisdictionStatus;
  statusLabel: string;
  lawFramework: string;
}

interface LegalStatus {
  tokenClassification: string;
  classificationStatus: 'confirmed' | 'pending' | 'disputed';
  legalOpinion: string;
  opinionDate: string;
  complianceOfficer: string;
}

interface RiskLevel {
  threshold: number;
  confirmation: string;
  timeout: number;
}

interface RiskConfig {
  low: RiskLevel;
  medium: RiskLevel;
  high: RiskLevel;
}

interface AccessibilityReport {
  lighthouseScore: number;
  colorContrast: AccessibilityResult;
  keyboardNav: AccessibilityResult;
  screenReader: AccessibilityResult;
  ariaLabels: number;
  ariaMissing: number;
}

// ── Mock Data ──────────────────────────────────────────────

const INITIAL_PLUGINS: CompliancePlugin[] = [
  {
    id: 'kyc',
    name: 'KYCPlugin',
    label: '身份验证',
    icon: '🪪',
    description: '企业客户或监管要求时激活，对接eID/数字护照',
    isActive: false,
    activationCondition: 'Enterprise tier or regulatory requirement',
    futureIntegration: 'eID / Digital Passport',
    status: 'inactive',
  },
  {
    id: 'tax',
    name: 'TaxLabelPlugin',
    label: '收益申报',
    icon: '📋',
    description: '特定司法辖区收益自动标记，生成税务报告',
    isActive: false,
    activationCondition: 'Specific jurisdiction requirement',
    futureIntegration: 'Auto tax report generation',
    status: 'inactive',
  },
  {
    id: 'zk_privacy',
    name: 'ZKPrivacyPlugin',
    label: '数据隐私',
    icon: '🔐',
    description: 'GDPR/个人信息保护法合规，Halo2/Noir ZK电路',
    isActive: true,
    activationCondition: 'Default ON for privacy compliance',
    futureIntegration: 'Halo2/Noir ZK circuits',
    status: 'active',
  },
  {
    id: 'geo',
    name: 'GeoCompliancePlugin',
    label: '地理围栏',
    icon: '🌍',
    description: '区域限制要求，IP+GPS双重验证',
    isActive: false,
    activationCondition: 'Regional regulatory requirement',
    futureIntegration: 'IP+GPS dual verification',
    status: 'inactive',
  },
  {
    id: 'arbitration',
    name: 'ArbitrationPlugin',
    label: '争议解决',
    icon: '⚖️',
    description: '高价值合约纠纷，对接在线仲裁平台',
    isActive: false,
    activationCondition: 'High-value contract disputes',
    futureIntegration: 'Online arbitration platform',
    status: 'inactive',
  },
];

const JURISDICTIONS: Jurisdiction[] = [
  { id: 'ch', name: '瑞士', flag: '🇨🇭', entityName: 'Cognitive Avatar Foundation', status: 'in_progress', statusLabel: '备案中', lawFramework: 'FINMA / DLT法案' },
  { id: 'sg', name: '新加坡', flag: '🇸🇬', entityName: 'Cognitive Avatar Pte. Ltd.', status: 'pending', statusLabel: '待设立', lawFramework: 'MAS / PSA法案' },
  { id: 'us', name: '美国', flag: '🇺🇸', entityName: '—', status: 'not_required', statusLabel: '暂不需要', lawFramework: 'SEC / CFTC' },
  { id: 'eu', name: '欧盟', flag: '🇪🇺', entityName: '—', status: 'not_required', statusLabel: '暂不需要', lawFramework: 'MiCA法规' },
  { id: 'jp', name: '日本', flag: '🇯🇵', entityName: '—', status: 'not_required', statusLabel: '暂不需要', lawFramework: 'FSA / 支付服务法' },
];

const LEGAL_STATUS: LegalStatus = {
  tokenClassification: 'Utility Token (效用代币)',
  classificationStatus: 'confirmed',
  legalOpinion: 'Legal opinion issued by Swiss counsel — AFC qualifies as utility token under FINMA guidance',
  opinionDate: '2026-02-15',
  complianceOfficer: 'Dr. Legal Counsel',
};

const RISK_CONFIG: RiskConfig = {
  low: { threshold: 0.05, confirmation: '生物识别/密码', timeout: 60 },
  medium: { threshold: 0.50, confirmation: '2FA TOTP/邮箱验证码', timeout: 300 },
  high: { threshold: Infinity, confirmation: '多签+24h时锁', timeout: 86400 },
};

const ACCESSIBILITY: AccessibilityReport = {
  lighthouseScore: 92,
  colorContrast: 'pass',
  keyboardNav: 'pass',
  screenReader: 'partial',
  ariaLabels: 45,
  ariaMissing: 3,
};

// ── Plugin Icon Map ────────────────────────────────────────

const PLUGIN_ICONS: Record<string, typeof ShieldCheck> = {
  kyc: FileText,
  tax: FileText,
  zk_privacy: Lock,
  geo: Globe,
  arbitration: Gavel,
};

// ── Jurisdiction Status Config ─────────────────────────────

const JURISDICTION_STATUS_CONFIG: Record<
  JurisdictionStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  in_progress: {
    label: '进行中',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    dotClass: 'bg-amber-400',
  },
  pending: {
    label: '待处理',
    badgeClass: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    dotClass: 'bg-slate-400',
  },
  not_required: {
    label: '不需要',
    badgeClass: 'bg-slate-700/50 text-slate-500 border-slate-600/50',
    dotClass: 'bg-slate-600',
  },
};

// ── Accessibility Result Config ────────────────────────────

const A11Y_RESULT_CONFIG: Record<AccessibilityResult, { label: string; icon: typeof CheckCircle; colorClass: string }> = {
  pass: { label: 'Pass', icon: CheckCircle, colorClass: 'text-emerald-400' },
  partial: { label: 'Partial', icon: AlertCircle, colorClass: 'text-amber-400' },
  fail: { label: 'Fail', icon: AlertCircle, colorClass: 'text-red-400' },
};

// ── Component ──────────────────────────────────────────────

export default function CompliancePanel() {
  const [plugins, setPlugins] = useState<CompliancePlugin[]>(INITIAL_PLUGINS);
  const [activeJurisdiction, setActiveJurisdiction] = useState('ch');
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('plugins');

  // ── Plugin Toggle Handler ───────────────────────────────
  const handleTogglePlugin = useCallback((pluginId: string) => {
    setPlugins((prev) =>
      prev.map((p) =>
        p.id === pluginId
          ? { ...p, isActive: !p.isActive, status: p.isActive ? 'inactive' as const : 'active' as const }
          : p,
      ),
    );
  }, []);

  // ── Expand Toggle ───────────────────────────────────────
  const toggleExpand = useCallback((pluginId: string) => {
    setExpandedPlugin((prev) => (prev === pluginId ? null : pluginId));
  }, []);

  // ── Active Plugin Count ─────────────────────────────────
  const activePluginCount = plugins.filter((p) => p.isActive).length;

  // ── Risk Level Visual ───────────────────────────────────
  const riskLevels = [
    { key: 'low' as const, label: '低风险', color: 'emerald', amount: '≤ $0.05' },
    { key: 'medium' as const, label: '中风险', color: 'amber', amount: '≤ $0.50' },
    { key: 'high' as const, label: '高风险', color: 'red', amount: '> $0.50' },
  ];

  const riskColorMap: Record<string, { bg: string; border: string; text: string; bar: string }> = {
    emerald: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/30', text: 'text-emerald-400', bar: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-500/5', border: 'border-amber-500/30', text: 'text-amber-400', bar: 'bg-amber-500' },
    red: { bg: 'bg-red-500/5', border: 'border-red-500/30', text: 'text-red-400', bar: 'bg-red-500' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-slate-700 bg-slate-800/80 backdrop-blur-sm">
        {/* Top accent bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-emerald-500 to-violet-500" />

        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base text-slate-100">
              <Scale className="size-5 text-violet-400" />
              合规接口
            </CardTitle>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"
            >
              {activePluginCount}/{plugins.length} 已激活
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-8 w-full bg-slate-900/60 p-0.5 mb-4">
              <TabsTrigger
                value="plugins"
                className="h-7 flex-1 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
              >
                <ShieldCheck className="size-3.5 mr-1" />
                合规插件
              </TabsTrigger>
              <TabsTrigger
                value="jurisdiction"
                className="h-7 flex-1 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
              >
                <Globe className="size-3.5 mr-1" />
                司法辖区
              </TabsTrigger>
              <TabsTrigger
                value="risk"
                className="h-7 flex-1 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
              >
                <Eye className="size-3.5 mr-1" />
                风险配置
              </TabsTrigger>
            </TabsList>

            {/* ════════════════════════════════════════════════
                TAB 1: Compliance Plugins Grid
                ════════════════════════════════════════════════ */}
            <TabsContent value="plugins" className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {plugins.map((plugin) => {
                  const PluginIcon = PLUGIN_ICONS[plugin.id] || ShieldCheck;
                  const isExpanded = expandedPlugin === plugin.id;

                  return (
                    <motion.div
                      key={plugin.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'rounded-lg border p-3 transition-all',
                        plugin.isActive
                          ? 'border-emerald-500/30 bg-emerald-500/5'
                          : 'border-slate-700 bg-slate-900/40',
                      )}
                    >
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{plugin.icon}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-slate-100 truncate">
                                {plugin.label}
                              </span>
                              {plugin.isActive ? (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0 shrink-0"
                                >
                                  ACTIVE
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-slate-700/50 text-slate-500 border-slate-600/50 text-[9px] px-1.5 py-0 shrink-0"
                                >
                                  OFF
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {plugin.name}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={plugin.isActive}
                          onCheckedChange={() => handleTogglePlugin(plugin.id)}
                          className={cn(
                            'shrink-0',
                            plugin.isActive && 'data-[state=checked]:bg-emerald-500',
                          )}
                        />
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        {plugin.description}
                      </p>

                      {/* Expand/Collapse Button */}
                      <button
                        onClick={() => toggleExpand(plugin.id)}
                        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 mt-2 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="size-3" />
                            收起详情
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-3" />
                            查看详情
                          </>
                        )}
                      </button>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-2">
                              <div className="flex items-start gap-2 text-xs">
                                <PluginIcon className="size-3.5 text-slate-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-slate-500">激活条件: </span>
                                  <span className="text-slate-300">{plugin.activationCondition}</span>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 text-xs">
                                <Lock className="size-3.5 text-slate-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-slate-500">未来集成: </span>
                                  <span className="text-slate-300">{plugin.futureIntegration}</span>
                                </div>
                              </div>
                              {plugin.id === 'kyc' && (
                                <div className="mt-2 rounded-md bg-slate-800/60 border border-slate-700/50 p-2 space-y-1.5">
                                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">KYC 字段预览</p>
                                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                    <div className="flex items-center gap-1"><span className="text-slate-500">姓名</span><span className="text-slate-400">—</span></div>
                                    <div className="flex items-center gap-1"><span className="text-slate-500">证件号</span><span className="text-slate-400">—</span></div>
                                    <div className="flex items-center gap-1"><span className="text-slate-500">证件类型</span><span className="text-slate-400">Passport</span></div>
                                    <div className="flex items-center gap-1"><span className="text-slate-500">验证状态</span><Badge variant="outline" className="text-[8px] px-1 py-0 border-slate-600 text-slate-400">未验证</Badge></div>
                                  </div>
                                </div>
                              )}
                              {plugin.id === 'tax' && (
                                <div className="mt-2 rounded-md bg-slate-800/60 border border-slate-700/50 p-2 space-y-1.5">
                                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">税务报告预览</p>
                                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                    <div className="flex items-center gap-1"><span className="text-slate-500">税务年度</span><span className="text-slate-400">2026</span></div>
                                    <div className="flex items-center gap-1"><span className="text-slate-500">辖区</span><span className="text-slate-400">CH</span></div>
                                    <div className="flex items-center gap-1 col-span-2"><span className="text-slate-500">报告状态</span><Badge variant="outline" className="text-[8px] px-1 py-0 border-slate-600 text-slate-400">未生成</Badge></div>
                                  </div>
                                </div>
                              )}
                              {plugin.id === 'zk_privacy' && (
                                <div className="mt-2 rounded-md bg-slate-800/60 border border-slate-700/50 p-2 space-y-1.5">
                                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">隐私等级</p>
                                  <div className="flex gap-1.5">
                                    {(['Public', 'Private', 'Hybrid'] as const).map((level) => (
                                      <Badge
                                        key={level}
                                        variant="outline"
                                        className={cn(
                                          'text-[9px] px-1.5 py-0.5',
                                          level === 'Hybrid'
                                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                                            : 'border-slate-600 text-slate-500',
                                        )}
                                      >
                                        {level === 'Hybrid' && <Lock className="size-2.5 mr-0.5" />}
                                        {level === 'Public' && <Unlock className="size-2.5 mr-0.5" />}
                                        {level}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {plugin.id === 'geo' && (
                                <div className="mt-2 rounded-md bg-slate-800/60 border border-slate-700/50 p-2 space-y-1.5">
                                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">区域配置</p>
                                  <div className="text-[10px] space-y-1">
                                    <div className="flex items-center gap-1"><MapPin className="size-3 text-emerald-400" /><span className="text-slate-300">允许区域:</span><span className="text-slate-400">CH, SG, EU</span></div>
                                    <div className="flex items-center gap-1"><AlertCircle className="size-3 text-red-400" /><span className="text-slate-300">限制操作:</span><span className="text-slate-400">高价值合约签署</span></div>
                                  </div>
                                </div>
                              )}
                              {plugin.id === 'arbitration' && (
                                <div className="mt-2 rounded-md bg-slate-800/60 border border-slate-700/50 p-2 space-y-1.5">
                                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">争议追踪</p>
                                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                    <div className="flex items-center gap-1"><span className="text-slate-500">活跃争议</span><span className="text-slate-300">0</span></div>
                                    <div className="flex items-center gap-1"><span className="text-slate-500">解决率</span><span className="text-emerald-400">—</span></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              {/* Active Plugins Summary */}
              {activePluginCount > 0 && (
                <Alert className="border-emerald-500/20 bg-emerald-500/5">
                  <ShieldCheck className="size-4 text-emerald-400" />
                  <AlertTitle className="text-emerald-400 text-xs">合规保障已激活</AlertTitle>
                  <AlertDescription className="text-emerald-300/80 text-[11px]">
                    当前 {activePluginCount} 个合规插件运行中 —
                    {plugins.filter((p) => p.isActive).map((p) => p.label).join('、')}
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* ════════════════════════════════════════════════
                TAB 2: Jurisdiction Selector + Legal Entity
                ════════════════════════════════════════════════ */}
            <TabsContent value="jurisdiction" className="space-y-4">
              {/* Jurisdiction Selector */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400">
                  活跃司法辖区
                </p>
                <div className="flex flex-wrap gap-2">
                  {JURISDICTIONS.map((j) => (
                    <button
                      key={j.id}
                      onClick={() => setActiveJurisdiction(j.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all',
                        activeJurisdiction === j.id
                          ? 'border-violet-500/50 bg-violet-500/10 text-violet-300'
                          : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-600 hover:text-slate-300',
                      )}
                    >
                      <span className="text-sm">{j.flag}</span>
                      {j.name}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-slate-700" />

              {/* Jurisdiction Detail Cards */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400">
                  法律实体状态
                </p>
                <div className="space-y-2">
                  {JURISDICTIONS.map((j) => {
                    const statusCfg = JURISDICTION_STATUS_CONFIG[j.status];
                    const isActive = activeJurisdiction === j.id;

                    return (
                      <motion.div
                        key={j.id}
                        layout
                        className={cn(
                          'rounded-lg border p-3 transition-all',
                          isActive
                            ? 'border-violet-500/30 bg-violet-500/5'
                            : 'border-slate-700/50 bg-slate-900/30',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{j.flag}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-100">
                                  {j.name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn('text-[9px] px-1.5 py-0', statusCfg.badgeClass)}
                                >
                                  <span className={cn('inline-block size-1.5 rounded-full mr-1', statusCfg.dotClass)} />
                                  {j.statusLabel}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {j.entityName !== '—' ? j.entityName : '未设立实体'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500">法律框架</p>
                            <p className="text-[10px] text-slate-400 font-mono">{j.lawFramework}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-slate-700" />

              {/* Legal Opinion Section */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400">
                  法律意见书
                </p>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="size-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-300">
                        {LEGAL_STATUS.tokenClassification}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]"
                    >
                      已确认
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {LEGAL_STATUS.legalOpinion}
                  </p>
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t border-emerald-500/10">
                    <div className="text-[10px]">
                      <span className="text-slate-500">意见日期: </span>
                      <span className="text-slate-300">{LEGAL_STATUS.opinionDate}</span>
                    </div>
                    <div className="text-[10px]">
                      <span className="text-slate-500">合规官: </span>
                      <span className="text-slate-300">{LEGAL_STATUS.complianceOfficer}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ════════════════════════════════════════════════
                TAB 3: Risk Configuration + Accessibility
                ════════════════════════════════════════════════ */}
            <TabsContent value="risk" className="space-y-4">
              {/* Risk Level Configuration */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400">
                  操作风险阈值配置
                </p>
                <div className="space-y-2">
                  {riskLevels.map((level) => {
                    const cfg = RISK_CONFIG[level.key];
                    const colors = riskColorMap[level.color];
                    const timeoutLabel =
                      cfg.timeout >= 86400
                        ? `${Math.round(cfg.timeout / 3600)}h`
                        : cfg.timeout >= 60
                          ? `${Math.round(cfg.timeout / 60)}min`
                          : `${cfg.timeout}s`;

                    return (
                      <div
                        key={level.key}
                        className={cn(
                          'rounded-lg border p-3',
                          colors.bg,
                          colors.border,
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={cn('size-2 rounded-full', colors.bar)} />
                            <span className={cn('text-sm font-medium', colors.text)}>
                              {level.label}
                            </span>
                          </div>
                          <span className={cn('text-xs font-mono', colors.text)}>
                            {level.amount}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          <div className="flex items-center gap-1">
                            <ShieldCheck className="size-3" />
                            <span>{cfg.confirmation}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertCircle className="size-3" />
                            <span>超时: {timeoutLabel}</span>
                          </div>
                        </div>
                        {/* Visual risk bar */}
                        <div className="mt-2 h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                          <motion.div
                            className={cn('h-full rounded-full', colors.bar)}
                            initial={{ width: 0 }}
                            animate={{
                              width:
                                level.key === 'low'
                                  ? '15%'
                                  : level.key === 'medium'
                                    ? '50%'
                                    : '85%',
                            }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-slate-700" />

              {/* WCAG Accessibility Score */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-400">
                    WCAG 无障碍审计
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      ACCESSIBILITY.lighthouseScore >= 90
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                    )}
                  >
                    Lighthouse {ACCESSIBILITY.lighthouseScore}/100
                  </Badge>
                </div>

                {/* Score Circle */}
                <div className="flex items-center gap-4">
                  <div className="relative size-16 shrink-0">
                    <svg className="size-16 -rotate-90" viewBox="0 0 36 36">
                      <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="text-slate-700"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeDasharray={`${ACCESSIBILITY.lighthouseScore} ${100 - ACCESSIBILITY.lighthouseScore}`}
                        strokeLinecap="round"
                        className="text-emerald-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-emerald-400">
                        {ACCESSIBILITY.lighthouseScore}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    {/* Audit Items */}
                    {([
                      { key: 'colorContrast' as const, label: '色彩对比度' },
                      { key: 'keyboardNav' as const, label: '键盘导航' },
                      { key: 'screenReader' as const, label: '屏幕阅读器' },
                    ] as const).map((item) => {
                      const result = ACCESSIBILITY[item.key];
                      const cfg = A11Y_RESULT_CONFIG[result];
                      const ItemIcon = cfg.icon;
                      return (
                        <div key={item.key} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">{item.label}</span>
                          <div className="flex items-center gap-1">
                            <ItemIcon className={cn('size-3', cfg.colorClass)} />
                            <span className={cn('font-medium text-[10px]', cfg.colorClass)}>
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ARIA Labels Stats */}
                <div className="rounded-md bg-slate-900/40 border border-slate-700/50 p-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1">
                      <Eye className="size-3 text-slate-500" />
                      <span className="text-slate-400">ARIA 标签覆盖</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">{ACCESSIBILITY.ariaLabels} 已标注</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-amber-400">{ACCESSIBILITY.ariaMissing} 缺失</span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.round((ACCESSIBILITY.ariaLabels / (ACCESSIBILITY.ariaLabels + ACCESSIBILITY.ariaMissing)) * 100)}%`,
                      }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
