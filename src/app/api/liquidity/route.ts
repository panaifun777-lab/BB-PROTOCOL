import { NextResponse } from 'next/server';

// ── Mock Data ─────────────────────────────────────────────────

const MOCK_LIQUIDITY_POOL = {
  pair: 'AFC/USDC',
  totalLiquidity: 52847.50,
  afcReserve: 264237500,
  usdcReserve: 26423.75,
  afcPrice: 0.10,
  priceChange24h: 2.5,
  volume24h: 12450,
  fees24h: 62.25,
  feeRate: 0.003,
};

const MOCK_TOKEN_ECONOMICS = {
  totalSupply: 1000000000,
  circulatingSupply: 20000000,
  burnRate: 0.05,
  buybackRate: 0.20,
  valueCaptureRate: 0.157,
  monthlyBurn: [
    { month: '2025-10', burned: 12000 },
    { month: '2025-11', burned: 18500 },
    { month: '2025-12', burned: 24000 },
    { month: '2026-01', burned: 31000 },
    { month: '2026-02', burned: 38000 },
    { month: '2026-03', burned: 45000 },
  ],
};

const MOCK_STAKING = {
  totalStaked: 5200000,
  apy: 12.5,
  stakers: 342,
  minStake: 1000,
  lockPeriod: '30天',
  rewardsDistributed: 650000,
};

// Liquidity depth data (deterministic, no Math.random)
const MOCK_DEPTH_DATA = (() => {
  const data: Array<{
    price: number;
    bidLiquidity: number;
    askLiquidity: number;
  }> = [];
  const basePrice = 0.10;
  for (let i = -20; i <= 20; i++) {
    const price = basePrice + i * 0.002;
    const depth = 50000 * Math.exp(-Math.abs(i) * 0.15);
    data.push({
      price: Math.round(price * 1000) / 1000,
      bidLiquidity: i <= 0 ? Math.round(depth) : 0,
      askLiquidity: i >= 0 ? Math.round(depth) : 0,
    });
  }
  return data;
})();

const MOCK_LP_TRANSACTIONS = [
  { id: 'lp1', type: 'add_liquidity' as const, amountAfc: 50000, amountUsdc: 5000, txHash: '0xlp01...ab12', createdAt: '2026-03-04T14:30:00Z' },
  { id: 'lp2', type: 'swap' as const, amountAfc: 10000, amountUsdc: 1000, direction: 'buy' as const, txHash: '0xlp02...cd34', createdAt: '2026-03-04T13:15:00Z' },
  { id: 'lp3', type: 'remove_liquidity' as const, amountAfc: 20000, amountUsdc: 2000, txHash: '0xlp03...ef56', createdAt: '2026-03-04T11:00:00Z' },
  { id: 'lp4', type: 'swap' as const, amountAfc: 5000, amountUsdc: 500, direction: 'sell' as const, txHash: '0xlp04...gh78', createdAt: '2026-03-04T09:45:00Z' },
  { id: 'lp5', type: 'add_liquidity' as const, amountAfc: 100000, amountUsdc: 10000, txHash: '0xlp05...ij90', createdAt: '2026-03-03T16:00:00Z' },
];

// ── GET Handler ────────────────────────────────────────────────

export async function GET() {
  try {
    const response = {
      pool: MOCK_LIQUIDITY_POOL,
      tokenEconomics: MOCK_TOKEN_ECONOMICS,
      staking: MOCK_STAKING,
      depthData: MOCK_DEPTH_DATA,
      transactions: MOCK_LP_TRANSACTIONS,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Error in GET /api/liquidity:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
