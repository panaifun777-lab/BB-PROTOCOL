import { NextResponse } from 'next/server';

// ===== Contract Simulation API =====

// ── Types ──────────────────────────────────────────────
interface SimulateRequest {
  contract: string;
  function: string;
  params: Record<string, number | string | boolean>;
}

interface GasEstimate {
  units: number;
  costUsd: number;
}

interface Verification {
  status: 'pass' | 'fail';
  details: string;
}

interface SimulateResponse {
  success: boolean;
  result: Record<string, unknown>;
  gasEstimate: GasEstimate;
  verification?: Verification;
  timestamp: string;
}

// ── Constants ──────────────────────────────────────────
const GAS_PRICE_USD = 0.0000000025; // per gas unit on Base L2

const CONTRACT_GAS_MAP: Record<string, Record<string, number>> = {
  AvatarCore: {
    createAvatar: 185000,
    updateCognitionRoot: 45000,
    getAvatarProfile: 28000,
  },
  DynamicSplitter: {
    executeSplit: 65000,
    getSplitConfig: 32000,
  },
  CircuitGuard: {
    evaluateState: 35000,
    triggerRecovery: 52000,
  },
  SkillVault: {
    unlockSkill: 78000,
    getSkillStatus: 28000,
  },
  IFDRouter: {
    delegateVote: 45000,
    executeRoutedVote: 55000,
  },
  TokenVault: {
    deposit: 42000,
    withdraw: 48000,
  },
};

// ── Simulation Logic ───────────────────────────────────

function simulateAvatarCore(fn: string, params: Record<string, number | string | boolean>): Record<string, unknown> {
  if (fn === 'createAvatar') {
    const soulId = Number(params.soulId) || 0;
    const cognitionRoot = String(params.cognitionRoot || '0x0000');
    return {
      status: 'SUCCESS',
      soulId,
      cognitionRoot,
      avatarAddress: `0x${(soulId * 7919 + 0xabcd).toString(16).slice(0, 40).padStart(40, '0')}`,
      circuitState: 'NORMAL',
      tier: 'starter',
      message: 'Avatar created successfully on-chain',
    };
  }
  if (fn === 'updateCognitionRoot') {
    const soulId = Number(params.soulId) || 0;
    const newRoot = String(params.newRoot || '0x0000');
    return {
      status: 'SUCCESS',
      soulId,
      previousRoot: '0x' + 'a1b2'.repeat(8),
      newRoot,
      version: 2,
      message: 'Cognition root updated',
    };
  }
  if (fn === 'getAvatarProfile') {
    const soulId = Number(params.soulId) || 0;
    return {
      status: 'SUCCESS',
      soulId,
      owner: '0x7a3f' + '0'.repeat(36),
      cognitionRoot: '0x' + 'a1b2'.repeat(8),
      resonanceScore: 82,
      circuitState: 'NORMAL',
      tier: 'pro',
      createdAt: '2026-01-15T08:00:00Z',
    };
  }
  return { status: 'UNKNOWN_FUNCTION' };
}

function simulateDynamicSplitter(fn: string, params: Record<string, number | string | boolean>, gasEstimate: GasEstimate): { result: Record<string, unknown>; verification?: Verification } {
  if (fn === 'executeSplit') {
    const amount = Number(params.amount) || 0;
    const resonanceScore = Number(params.resonanceScore) || 50;
    const complexity = Number(params.complexity) || 1;

    // Dynamic adjustment formula: avatarAdj = (70 - resonanceScore) × 50
    // Human bps base = 7000, Avatar bps base = 2000, Protocol bps base = 1000
    // avatarAdj clamped to [1500, 2500]
    const avatarAdj = Math.max(1500, Math.min(2500, (70 - resonanceScore) * 50));
    const humanBps = 7000 - (avatarAdj - 2000);
    const avatarBps = avatarAdj;
    const protocolBps = 1000;

    const humanShare = (amount * humanBps) / 10000;
    const avatarShare = (amount * avatarBps) / 10000;
    const protocolShare = (amount * protocolBps) / 10000;

    const totalCheck = humanShare + avatarShare + protocolShare;
    const splitConservation = Math.abs(totalCheck - amount) < 0.01;

    const result = {
      status: 'SUCCESS',
      input: { amount, resonanceScore, complexity },
      split: {
        humanBps,
        avatarBps,
        protocolBps,
        humanShare: Number(humanShare.toFixed(4)),
        avatarShare: Number(avatarShare.toFixed(4)),
        protocolShare: Number(protocolShare.toFixed(4)),
      },
      dynamicAdjustment: {
        formula: `avatarAdj = clamp((70 - ${resonanceScore}) × 50, 1500, 2500)`,
        avatarAdjBps: avatarAdj,
        humanShiftBps: avatarAdj - 2000,
      },
      conservationCheck: splitConservation,
      gasEstimate,
    };

    const verification: Verification = {
      status: splitConservation ? 'pass' : 'fail',
      details: splitConservation
        ? `Split conservation verified: ${humanShare.toFixed(4)} + ${avatarShare.toFixed(4)} + ${protocolShare.toFixed(4)} = ${totalCheck.toFixed(4)} = ${amount}`
        : `Split conservation FAILED: ${totalCheck.toFixed(4)} ≠ ${amount}`,
    };

    return { result, verification };
  }

  if (fn === 'getSplitConfig') {
    const resonanceScore = Number(params.resonanceScore) || 50;
    const avatarAdj = Math.max(1500, Math.min(2500, (70 - resonanceScore) * 50));
    const humanBps = 7000 - (avatarAdj - 2000);
    const avatarBps = avatarAdj;
    const protocolBps = 1000;

    return {
      result: {
        status: 'SUCCESS',
        resonanceScore,
        config: { humanBps, avatarBps, protocolBps },
        description: `Resonance ${resonanceScore}: Human ${(humanBps / 100).toFixed(0)}% / Avatar ${(avatarBps / 100).toFixed(0)}% / Protocol ${(protocolBps / 100).toFixed(0)}%`,
      },
    };
  }

  return { result: { status: 'UNKNOWN_FUNCTION' } };
}

function simulateCircuitGuard(fn: string, params: Record<string, number | string | boolean>): { result: Record<string, unknown>; verification?: Verification } {
  if (fn === 'evaluateState') {
    const resonanceScore = Number(params.resonanceScore) || 50;

    let newState: string;
    let description: string;
    if (resonanceScore >= 70) {
      newState = 'NORMAL';
      description = `Resonance ${resonanceScore} ≥ 70: All systems operational`;
    } else if (resonanceScore >= 50) {
      newState = 'SOFT_LIMIT';
      description = `Resonance ${resonanceScore} in [50, 69]: High-risk actions paused, low-risk allowed`;
    } else {
      newState = 'HARD_PAUSE';
      description = `Resonance ${resonanceScore} < 50: All actions suspended, manual recovery required`;
    }

    const result = {
      status: 'SUCCESS',
      resonanceScore,
      previousState: 'NORMAL',
      newState,
      description,
      thresholds: { softLimit: 70, hardPause: 50 },
      allowedActions: newState === 'NORMAL'
        ? ['all']
        : newState === 'SOFT_LIMIT'
          ? ['read', 'low_risk_write']
          : ['read_only'],
    };

    const verification: Verification = {
      status: 'pass',
      details: `State transition: NORMAL → ${newState} (resonance=${resonanceScore}, thresholds: ≥70=NORMAL, 50-69=SOFT_LIMIT, <50=HARD_PAUSE)`,
    };

    return { result, verification };
  }

  if (fn === 'triggerRecovery') {
    const soulId = Number(params.soulId) || 0;
    return {
      result: {
        status: 'SUCCESS',
        soulId,
        previousState: 'HARD_PAUSE',
        newState: 'RECOVERY',
        recoveryPeriodHours: 48,
        autoResumeAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      },
      verification: {
        status: 'pass',
        details: 'Recovery initiated: 48-hour cooldown before auto-resume to NORMAL',
      },
    };
  }

  return { result: { status: 'UNKNOWN_FUNCTION' } };
}

function simulateSkillVault(fn: string, params: Record<string, number | string | boolean>): { result: Record<string, unknown>; verification?: Verification } {
  // Revenue thresholds for tiers: 1=0, 2=500, 3=2000, 4=8000, 5=30000
  const TIER_THRESHOLDS: Record<number, number> = {
    1: 0,
    2: 500,
    3: 2000,
    4: 8000,
    5: 30000,
  };

  if (fn === 'unlockSkill') {
    const soulId = Number(params.soulId) || 0;
    const tier = Number(params.tier) || 1;
    const cumulativeRevenue = Number(params.cumulativeRevenue) || 0;

    const threshold = TIER_THRESHOLDS[tier] ?? 999999;
    const canUnlock = cumulativeRevenue >= threshold;

    const result = {
      status: canUnlock ? 'SUCCESS' : 'REJECTED',
      soulId,
      tier,
      cumulativeRevenue,
      threshold,
      canUnlock,
      message: canUnlock
        ? `Tier ${tier} skill unlocked (revenue ${cumulativeRevenue} ≥ threshold ${threshold})`
        : `Tier ${tier} unlock rejected: revenue ${cumulativeRevenue} < threshold ${threshold}`,
    };

    const verification: Verification = {
      status: canUnlock ? 'pass' : 'fail',
      details: canUnlock
        ? `Revenue check passed: ${cumulativeRevenue} ≥ ${threshold}`
        : `Revenue check failed: ${cumulativeRevenue} < ${threshold} (need ${(threshold - cumulativeRevenue).toFixed(0)} more)`,
    };

    return { result, verification };
  }

  if (fn === 'getSkillStatus') {
    const soulId = Number(params.soulId) || 0;
    const tier = Number(params.tier) || 1;
    const threshold = TIER_THRESHOLDS[tier] ?? 999999;

    return {
      result: {
        status: 'SUCCESS',
        soulId,
        tier,
        threshold,
        unlocked: tier <= 2,
        progress: tier <= 2 ? 100 : 65,
      },
    };
  }

  return { result: { status: 'UNKNOWN_FUNCTION' } };
}

function simulateIFDRouter(fn: string, params: Record<string, number | string | boolean>): Record<string, unknown> {
  if (fn === 'delegateVote') {
    const domain = String(params.domain || 'governance');
    const weight = Number(params.weight) || 1;
    return {
      status: 'SUCCESS',
      domain,
      delegateAddress: '0x' + 'def1'.repeat(10),
      weight,
      votingPower: weight * 100,
      message: `Vote delegated in ${domain} with weight ${weight}`,
    };
  }
  if (fn === 'executeRoutedVote') {
    const proposalId = Number(params.proposalId) || 1;
    return {
      status: 'SUCCESS',
      proposalId,
      totalVotes: 12500,
      quorum: 10000,
      passed: true,
      message: `Proposal ${proposalId} passed with 12,500 votes (quorum: 10,000)`,
    };
  }
  return { status: 'UNKNOWN_FUNCTION' };
}

function simulateTokenVault(fn: string, params: Record<string, number | string | boolean>): Record<string, unknown> {
  if (fn === 'deposit') {
    const amount = Number(params.amount) || 0;
    return {
      status: 'SUCCESS',
      amount,
      vaultBalance: 10000 + amount,
      lpTokensMinted: amount * 0.95,
      message: `Deposited ${amount} tokens, minted ${(amount * 0.95).toFixed(2)} LP tokens`,
    };
  }
  if (fn === 'withdraw') {
    const amount = Number(params.amount) || 0;
    return {
      status: 'SUCCESS',
      amount,
      vaultBalance: Math.max(0, 10000 - amount),
      lpTokensBurned: amount * 1.05,
      message: `Withdrew ${amount} tokens, burned ${(amount * 1.05).toFixed(2)} LP tokens`,
    };
  }
  return { status: 'UNKNOWN_FUNCTION' };
}

// ── Split Verification Endpoint ────────────────────────
function verifySplitConservation(params: Record<string, number | string | boolean>): Verification & { calculated: Record<string, number> } {
  const totalAmount = Number(params.totalAmount) || 0;
  const humanBps = Number(params.humanBps) || 0;
  const avatarBps = Number(params.avatarBps) || 0;
  const protocolBps = Number(params.protocolBps) || 0;

  const totalBps = humanBps + avatarBps + protocolBps;
  const humanAmount = (totalAmount * humanBps) / 10000;
  const avatarAmount = (totalAmount * avatarBps) / 10000;
  const protocolAmount = (totalAmount * protocolBps) / 10000;
  const totalCalculated = humanAmount + avatarAmount + protocolAmount;

  const bpsConservation = totalBps === 10000;
  const amountConservation = Math.abs(totalCalculated - totalAmount) < 0.01;

  return {
    status: bpsConservation && amountConservation ? 'pass' : 'fail',
    details: bpsConservation && amountConservation
      ? `Conservation verified: ${humanBps} + ${avatarBps} + ${protocolBps} = ${totalBps} bps (10000), amounts: ${humanAmount.toFixed(4)} + ${avatarAmount.toFixed(4)} + ${protocolAmount.toFixed(4)} = ${totalCalculated.toFixed(4)}`
      : `Conservation FAILED: bps total = ${totalBps} (expected 10000), amount total = ${totalCalculated.toFixed(4)} (expected ${totalAmount})`,
    calculated: {
      humanAmount: Number(humanAmount.toFixed(4)),
      avatarAmount: Number(avatarAmount.toFixed(4)),
      protocolAmount: Number(protocolAmount.toFixed(4)),
      totalBps,
      totalCalculated: Number(totalCalculated.toFixed(4)),
    },
  };
}

// ── POST Handler ───────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body: SimulateRequest = await request.json();
    const { contract, function: fn, params } = body;

    // Get gas estimate
    const contractGasMap = CONTRACT_GAS_MAP[contract];
    if (!contractGasMap) {
      return NextResponse.json(
        { success: false, error: `Unknown contract: ${contract}` },
        { status: 400 }
      );
    }

    const baseGas = contractGasMap[fn] || 30000;
    const gasEstimate: GasEstimate = {
      units: baseGas,
      costUsd: Number((baseGas * GAS_PRICE_USD).toFixed(8)),
    };

    let response: SimulateResponse;

    switch (contract) {
      case 'AvatarCore': {
        const result = simulateAvatarCore(fn, params);
        response = {
          success: true,
          result,
          gasEstimate,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'DynamicSplitter': {
        const { result, verification } = simulateDynamicSplitter(fn, params, gasEstimate);
        response = {
          success: true,
          result,
          gasEstimate,
          verification,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'CircuitGuard': {
        const { result, verification } = simulateCircuitGuard(fn, params);
        response = {
          success: true,
          result,
          gasEstimate,
          verification,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'SkillVault': {
        const { result, verification } = simulateSkillVault(fn, params);
        response = {
          success: true,
          result,
          gasEstimate,
          verification,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'IFDRouter': {
        const result = simulateIFDRouter(fn, params);
        response = {
          success: true,
          result,
          gasEstimate,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      case 'TokenVault': {
        const result = simulateTokenVault(fn, params);
        response = {
          success: true,
          result,
          gasEstimate,
          timestamp: new Date().toISOString(),
        };
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown contract: ${contract}` },
          { status: 400 }
        );
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Simulation failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// ── GET Handler (Split Verification) ───────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');

  if (mode === 'verify') {
    const params: Record<string, number | string | boolean> = {
      totalAmount: Number(searchParams.get('totalAmount')) || 0,
      humanBps: Number(searchParams.get('humanBps')) || 0,
      avatarBps: Number(searchParams.get('avatarBps')) || 0,
      protocolBps: Number(searchParams.get('protocolBps')) || 0,
    };

    const verification = verifySplitConservation(params);

    return NextResponse.json({
      success: true,
      verification,
      formula: {
        expression: `totalAmount × (humanBps + avatarBps + protocolBps) / 10000 = totalAmount`,
        substitution: `${params.totalAmount} × (${params.humanBps} + ${params.avatarBps} + ${params.protocolBps}) / 10000 = ${verification.calculated.totalCalculated}`,
        constraint: 'humanBps + avatarBps + protocolBps === 10000',
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Default: return contract info
  return NextResponse.json({
    success: true,
    contracts: Object.keys(CONTRACT_GAS_MAP),
    gasPrice: GAS_PRICE_USD,
    network: 'Base L2',
    timestamp: new Date().toISOString(),
  });
}
