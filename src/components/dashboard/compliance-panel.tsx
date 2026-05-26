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
import { useI18n } from '@/hooks/use-i18n';

// ── Types ──────────────────────────────────────────────────

type PluginStatus = 'active' | 'inactive';
type JurisdictionStatus = 'in_progress' | 'pending' | 'not_required';
type AccessibilityResult = 'pass' | 'partial' | 'fail';

interface CompliancePlugin {
  id: string;
  name: string;
  labelKey: string;
  icon: string;
  descriptionKey: string;
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
  statusLabelKey: string;
  lawFramework: string;
}

interface LegalStatus {
  tokenClassificationKey: string;
  classificationStatus: 'confirmed' | 'pending' | 'disputed';
  legalOpinion: string;
  opinionDate: string;
  complianceOfficer: string;
}

interface RiskLevel {
  threshold: number;
  confirmationKey: string;
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
    labelKey: 'compliance.pluginKycLabel',
    icon: '🪪',
    descriptionKey: 'compliance.pluginKycDesc',
    isActive: false,
    activationCondition: 'Enterprise tier or regulatory requirement',
    futureIntegration: 'eID / Digital Passport',
    status: 'inactive',
  },
  {
    id: 'tax',
    name: 'TaxLabelPlugin',
    labelKey: 'compliance.pluginTaxLabel',
    icon: '📋',
    descriptionKey: 'compliance.pluginTaxDesc',
    isActive: false,
    activationCondition: 'Specific jurisdiction requirement',
    futureIntegration: 'Auto tax report generation',
    status: 'inactive',
  },
  {
    id: 'zk_privacy',
    name: 'ZKPrivacyPlugin',
    labelKey: 'compliance.pluginZkLabel',
    icon: '🔐',
    descriptionKey: 'compliance.pluginZkDesc',
    isActive: true,
    activationCondition: 'Default ON for privacy compliance',
    futureIntegration: 'Halo2/Noir ZK circuits',
    status: 'active',
  },
  {
    id: 'geo',
    name: 'GeoCompliancePlugin',
    labelKey: 'compliance.pluginGeoLabel',
    icon: '🌍',
    descriptionKey: 'compliance.pluginGeoDesc',
    isActive: false,
    activationCondition: 'Regional regulatory requirement',
    futureIntegration: 'IP+GPS dual verification',
    status: 'inactive',
  },
  {
    id: 'arbitration',
    name: 'ArbitrationPlugin',
    labelKey: 'compliance.pluginArbLabel',
    icon: '⚖️',
    descriptionKey: 'compliance.pluginArbDesc',
    isActive: false,
    activationCondition: 'High-value contract disputes',
    futureIntegration: 'Online arbitration platform',
    status: 'inactive',
  },
];

const JURISDICTIONS: Jurisdiction[] = [
  { id: 'ch', name: 'compliance.switzerland', flag: '🇨🇭', entityName: 'Cognitive Avatar Foundation', status: 'in_progress', statusLabelKey: 'compliance.statusInProgress', lawFramework: 'FINMA / DLT法案' },
  { id: 'sg', name: 'compliance.singapore', flag: '🇸🇬', entityName: 'Cognitive Avatar Pte. Ltd.', status: 'pending', statusLabelKey: 'compliance.statusPendingSetup', lawFramework: 'MAS / PSA法案' },
  { id: 'us', name: 'compliance.usa', flag: '🇺🇸', entityName: '—', status: 'not_required', statusLabelKey: 'compliance.statusNotRequired', lawFramework: 'SEC / CFTC' },
  { id: 'eu', name: 'compliance.eu', flag: '🇪🇺', entityName: '—', status: 'not_required', statusLabelKey: 'compliance.statusNotRequired', lawFramework: 'MiCA法规' },
  { id: 'jp', name: 'compliance.japan', flag: '🇯🇵', entityName: '—', status: 'not_required', statusLabelKey: 'compliance.statusNotRequired', lawFramework: 'FSA / 支付服务法' },
];

const LEGAL_STATUS: LegalStatus = {
  tokenClassificationKey: 'compliance.utilityTokenLabel',
  classificationStatus: 'confirmed',
  legalOpinion: 'Legal opinion issued by Swiss counsel — AFC qualifies as utility token under FINMA guidance',
  opinionDate: '2026-02-15',
  complianceOfficer: 'Dr. Legal Counsel',
};

const RISK_CONFIG: RiskConfig = {
  low: { threshold: 0.05, confirmationKey: 'compliance.riskLowConfirm', timeout: 60 },
  medium: { threshold: 0.50, confirmationKey: 'compliance.riskMediumConfirm', timeout: 300 },
  high: { threshold: Infinity, confirmationKey: 'compliance.riskHighConfirm', timeout: 86400 },
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

// ── Component ──────────────────────────────────────────────

export default function CompliancePanel() {
  const [plugins, setPlugins] = useState<CompliancePlugin[]>(INITIAL_PLUGINS);
  const [activeJurisdiction, setActiveJurisdiction] = useState('ch');
  const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('plugins');
  const { t } = useI18n();

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
    { key: 'low' as const, labelKey: 'compliance.lowRisk', color: 'emerald', amount: '≤ $0.05' },
    { key: 'medium' as const, labelKey: 'compliance.mediumRisk', color: 'amber', amount: '≤ $0.50' },
    { key: 'high' as const, labelKey: 'compliance.highRisk', color: 'red', amount: '> $0.50' },
  ];

  const riskColorMap: Record<string, { bg: string; border: string; text: string; bar: string }> = {
    emerald: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/30', text: 'text-emerald-400', bar: 'bg-emerald-500' },
    amber: { bg: 'bg-amber-500/5', border: 'border-amber-500/30', text: 'text-amber-400', bar: 'bg-amber-500' },
    red: { bg: 'bg-red-500/5', border: 'border-red-500/30', text: 'text-red-400', bar: 'bg-red-500' },
  };

  const jurisdictionStatusConfig: Record<
    JurisdictionStatus,
    { badgeClass: string; dotClass: string }
  > = {
    in_progress: {
      badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      dotClass: 'bg-amber-400',
    },
    pending: {
      badgeClass: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      dotClass: 'bg-slate-400',
    },
    not_required: {
      badgeClass: 'bg-slate-700/50 text-slate-500 border-slate-600/50',
      dotClass: 'bg-slate-600',
    },
  };

  const a11yResultConfig: Record<AccessibilityResult, { label: string; icon: typeof CheckCircle; colorClass: string }> = {
    pass: { label: 'Pass', icon: CheckCircle, colorClass: 'text-emerald-400' },
    partial: { label: 'Partial', icon: AlertCircle, colorClass: 'text-amber-400' },
    fail: { label: 'Fail', icon: AlertCircle, colorClass: 'text-red-400' },
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
              {t('compliance.title')}
            </CardTitle>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"
            >
              {activePluginCount}/{plugins.length} {t('compliance.activated')}
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
                {t('compliance.pluginsTab')}
              </TabsTrigger>
              <TabsTrigger
                value="jurisdiction"
                className="h-7 flex-1 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
              >
                <Globe className="size-3.5 mr-1" />
                {t('compliance.jurisdictionTab')}
              </TabsTrigger>
              <TabsTrigger
                value="risk"
                className="h-7 flex-1 text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100"
              >
                <Eye className="size-3.5 mr-1" />
                {t('compliance.riskTab')}
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
                                {t(plugin.labelKey)}
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
                        {t(plugin.descriptionKey)}
                      </p>

                      {/* Expand/Collapse Button */}
                      <button
                        onClick={() => toggleExpand(plugin.id)}
                        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 mt-2 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="size-3" />
                            {t('compliance.collapseDetails')}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-3" />
                            {t('compliance.viewDetails')}
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
                                  <span className="text-slate-500">{t('compliance.activationCondition')}: </span>
                                  <span className="text-slate-300">{plugin.activationCondition}</span>
                                </div>
                              </div>
                              <div className="flex items-start gap-2 text-xs">
                                <Lock className="size-3.5 text-slate-500 mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-slate-500">{t('compliance.futureIntegration')}: </span>
                                  <span className="text-slate-300">{plugin.futureIntegration}</span>
                                </div>
                              </div>
                              {plugin.id === 'kyc' && (
                                <div className="mt-2 rounded-md bg-slate-800/60 border border-slate-700/50 p-2 space-y-1.5">
                                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{t('compliance.kycFieldPreview')}</p>
                                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                    <div className="flex items-center gap-1"><span className="text-slate-500">{t('compliance.kycName')}</span><span className="text-slate-400">—</span></div>
                                    <div className="flex items-center gap-1"><span className="text-slate-500">{t('compliance.kycIdNumber')}</span><span className="text-slate-400">—</span></div>
                                    <div className="flex items-center gap-1"><span className="text-slate-500">{t('compliance.kycIdType')}</span><span className="text-slate-400">Passport</span></div>
                                    <div className="flex items-center gap-1"><span className="text-slate-500">{t('compliance.kycVerifyStatus')}</span><Badge variant="outline" className="text-[8px] px-1 py-0 border-slate-600 text-slate-400">{t('compliance.kycNotVerified')}</Badge></div>
                                  </div>
                                </div>
                              )}
                              {plugin.id === 'tax' && (
                                <div className="mt-2 rounded-md bg-slate-800/60 border border-slate-700/50 p-2 space-y-1.5">
                                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{t('compliance.taxReportPreview')}</p>
                                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                    <div className="flex items-center gap-1"><span className="text-slate-500">{t('compliance.taxYear')}</span><span className="text-slate-400">2026</span></div>
                                    <div className="flex items-center gap-1"><span className="text-slate-500">{t('compliance.taxJurisdiction')}</span><span className="text-slate-400">CH</span></div>
                                    <div className="flex items-center gap-1 col-span-2"><span className="text-slate-500">{t('compliance.taxReportStatus')}</span><Badge variant="outline" className="text-[8px] px-1 py-0 border-slate-600 text-slate-400">{t('compliance.taxNotGenerated')}</Badge></div>
                                  </div>
                                </div>
                              )}
                              {plugin.id === 'zk_privacy' && (
                                <div className="mt-2 rounded-md bg-slate-800/60 border border-slate-700/50 p-2 space-y-1.5">
                                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{t('compliance.privacyLevel')}</p>
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
                                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{t('compliance.geoConfig')}</p>
                                  <div className="text-[10px] space-y-1">
                                    <div className="flex items-center gap-1"><MapPin className="size-3 text-emerald-400" /><span className="text-slate-300">{t('compliance.geoAllowed')}:</span><span className="text-slate-400">CH, SG, EU</span></div>
                                    <div className="flex items-center gap-1"><AlertCircle className="size-3 text-red-400" /><span className="text-slate-300">{t('compliance.geoRestricted')}:</span><span className="text-slate-400">{t('compliance.geoRestrictedOps')}</span></div>
                                  </div>
                                </div>
                              )}
                              {plugin.id === 'arbitration' && (
                                <div className="mt-2 rounded-md bg-slate-800/60 border border-slate-700/50 p-2 space-y-1.5">
                                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{t('compliance.arbTracking')}</p>
                                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                    <div className="flex items-center gap-1"><span className="text-slate-500">{t('compliance.arbActiveDisputes')}</span><span className="text-slate-300">0</span></div>
                                    <div className="flex items-center gap-1"><span className="text-slate-500">{t('compliance.arbResolutionRate')}</span><span className="text-emerald-400">—</span></div>
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
                  <AlertTitle className="text-emerald-400 text-xs">{t('compliance.complianceActive')}</AlertTitle>
                  <AlertDescription className="text-emerald-300/80 text-[11px]">
                    {t('compliance.complianceActiveDesc', { count: activePluginCount, plugins: plugins.filter((p) => p.isActive).map((p) => t(p.labelKey)).join('、') })}
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
                  {t('compliance.activeJurisdictions')}
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
                      {t(j.name)}
                    </button>
                  ))}
                </div>
              </div>

              <Separator className="bg-slate-700" />

              {/* Jurisdiction Detail Cards */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400">
                  {t('compliance.legalEntityStatus')}
                </p>
                <div className="space-y-2">
                  {JURISDICTIONS.map((j) => {
                    const statusCfg = jurisdictionStatusConfig[j.status];
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
                                  {t(j.name)}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn('text-[9px] px-1.5 py-0', statusCfg.badgeClass)}
                                >
                                  <span className={cn('inline-block size-1.5 rounded-full mr-1', statusCfg.dotClass)} />
                                  {t(j.statusLabelKey)}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {j.entityName !== '—' ? j.entityName : t('compliance.noEntity')}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500">{t('compliance.legalFramework')}</p>
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
                  {t('compliance.legalOpinion')}
                </p>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="size-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-300">
                        {t(LEGAL_STATUS.tokenClassificationKey)}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]"
                    >
                      {t('compliance.confirmed')}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {LEGAL_STATUS.legalOpinion}
                  </p>
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t border-emerald-500/10">
                    <div className="text-[10px]">
                      <span className="text-slate-500">{t('compliance.opinionDate')}: </span>
                      <span className="text-slate-300">{LEGAL_STATUS.opinionDate}</span>
                    </div>
                    <div className="text-[10px]">
                      <span className="text-slate-500">{t('compliance.complianceOfficer')}: </span>
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
                  {t('compliance.riskThresholdConfig')}
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
                              {t(level.labelKey)}
                            </span>
                          </div>
                          <span className={cn('text-xs font-mono', colors.text)}>
                            {level.amount}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          <div className="flex items-center gap-1">
                            <ShieldCheck className="size-3" />
                            <span>{t(cfg.confirmationKey)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertCircle className="size-3" />
                            <span>{t('compliance.timeout')}: {timeoutLabel}</span>
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
                    {t('compliance.wcagAudit')}
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
                      { key: 'colorContrast' as const, labelKey: 'compliance.a11yColorContrast' },
                      { key: 'keyboardNav' as const, labelKey: 'compliance.a11yKeyboardNav' },
                      { key: 'screenReader' as const, labelKey: 'compliance.a11yScreenReader' },
                    ] as const).map((item) => {
                      const result = ACCESSIBILITY[item.key];
                      const cfg = a11yResultConfig[result];
                      const ItemIcon = cfg.icon;
                      return (
                        <div key={item.key} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">{t(item.labelKey)}</span>
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
                      <span className="text-slate-400">{t('compliance.ariaLabelCoverage')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400">{ACCESSIBILITY.ariaLabels} {t('compliance.ariaLabeled')}</span>
                      <span className="text-slate-600">·</span>
                      <span className="text-amber-400">{ACCESSIBILITY.ariaMissing} {t('compliance.ariaMissing')}</span>
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
