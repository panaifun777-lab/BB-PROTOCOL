import { NextResponse } from 'next/server';

// ── Mock Data ──────────────────────────────────────────────

const compliancePlugins = [
  {
    id: 'kyc',
    name: 'KYCPlugin',
    label: '身份验证',
    icon: '🪪',
    description: '企业客户或监管要求时激活，对接eID/数字护照',
    isActive: false,
    activationCondition: 'Enterprise tier or regulatory requirement',
    futureIntegration: 'eID / Digital Passport',
    status: 'inactive' as const,
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
    status: 'inactive' as const,
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
    status: 'active' as const,
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
    status: 'inactive' as const,
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
    status: 'inactive' as const,
  },
];

const jurisdictions = [
  { id: 'ch', name: '瑞士', flag: '🇨🇭', entityName: 'Cognitive Avatar Foundation', status: 'in_progress' as const, statusLabel: '备案中', lawFramework: 'FINMA / DLT法案' },
  { id: 'sg', name: '新加坡', flag: '🇸🇬', entityName: 'Cognitive Avatar Pte. Ltd.', status: 'pending' as const, statusLabel: '待设立', lawFramework: 'MAS / PSA法案' },
  { id: 'us', name: '美国', flag: '🇺🇸', entityName: '—', status: 'not_required' as const, statusLabel: '暂不需要', lawFramework: 'SEC / CFTC' },
  { id: 'eu', name: '欧盟', flag: '🇪🇺', entityName: '—', status: 'not_required' as const, statusLabel: '暂不需要', lawFramework: 'MiCA法规' },
  { id: 'jp', name: '日本', flag: '🇯🇵', entityName: '—', status: 'not_required' as const, statusLabel: '暂不需要', lawFramework: 'FSA / 支付服务法' },
];

const legalStatus = {
  tokenClassification: 'Utility Token (效用代币)',
  classificationStatus: 'confirmed' as const,
  legalOpinion: 'Legal opinion issued by Swiss counsel — AFC qualifies as utility token under FINMA guidance',
  opinionDate: '2026-02-15',
  complianceOfficer: 'Dr. Legal Counsel',
};

const riskConfig = {
  low: { threshold: 0.05, confirmation: '生物识别/密码', timeout: 60 },
  medium: { threshold: 0.50, confirmation: '2FA TOTP/邮箱验证码', timeout: 300 },
  high: { threshold: Infinity, confirmation: '多签+24h时锁', timeout: 86400 },
};

const accessibility = {
  lighthouseScore: 92,
  colorContrast: 'pass' as const,
  keyboardNav: 'pass' as const,
  screenReader: 'partial' as const,
  ariaLabels: 45,
  ariaMissing: 3,
};

// ── In-memory plugin state (mock persistence) ──────────────
let pluginsState = [...compliancePlugins];

// ── GET handler ────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    plugins: pluginsState,
    jurisdictions,
    legalStatus,
    riskConfig,
    accessibility,
  });
}

// ── POST handler — toggle plugin ───────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pluginId, isActive } = body as { pluginId: string; isActive: boolean };

    if (!pluginId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request body. Required: { pluginId: string, isActive: boolean }' },
        { status: 400 },
      );
    }

    const pluginIndex = pluginsState.findIndex((p) => p.id === pluginId);
    if (pluginIndex === -1) {
      return NextResponse.json(
        { error: `Plugin not found: ${pluginId}` },
        { status: 404 },
      );
    }

    pluginsState = pluginsState.map((p) =>
      p.id === pluginId
        ? { ...p, isActive, status: isActive ? 'active' as const : 'inactive' as const }
        : p,
    );

    return NextResponse.json({
      success: true,
      plugin: pluginsState.find((p) => p.id === pluginId),
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }
}
