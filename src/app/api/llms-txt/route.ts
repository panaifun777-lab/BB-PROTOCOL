import { NextResponse } from 'next/server';

const API_ENDPOINTS = [
  { path: '/api/health', desc: 'System health check', tokens: '~200' },
  { path: '/api/dashboard', desc: 'Core dashboard metrics and analytics', tokens: '~2K' },
  { path: '/api/avatars', desc: 'Cognitive Avatar CRUD operations', tokens: '~1.5K' },
  { path: '/api/skills', desc: 'Skill vault and tier management', tokens: '~1K' },
  { path: '/api/delegations', desc: 'IFP/Fluid Democracy delegation system', tokens: '~1K' },
  { path: '/api/revenues', desc: 'Revenue stream tracking', tokens: '~1.5K' },
  { path: '/api/resonance', desc: 'Resonance wave computation', tokens: '~1K' },
  { path: '/api/compliance', desc: 'Multi-jurisdiction compliance', tokens: '~1.5K' },
  { path: '/api/security', desc: 'Security audit and threat detection', tokens: '~1.5K' },
  { path: '/api/deployment', desc: 'Smart contract deployment center', tokens: '~2K' },
  { path: '/api/monitoring', desc: 'System monitoring and alerting', tokens: '~1.5K' },
  { path: '/api/performance', desc: 'Performance dashboard', tokens: '~1K' },
  { path: '/api/feature-flags', desc: 'Feature flag management', tokens: '~1K' },
  { path: '/api/multichain', desc: 'Multi-chain deployment', tokens: '~1.5K' },
  { path: '/api/sdk-platform', desc: 'Developer SDK and API key management', tokens: '~1K' },
  { path: '/api/ecosystem', desc: 'Ecosystem hub and partner integration', tokens: '~1.5K' },
  { path: '/api/dao-governance', desc: 'DAO proposal voting and governance', tokens: '~1.5K' },
  { path: '/api/web3-integration', desc: 'Web3 wallet and contract interaction', tokens: '~2K' },
  { path: '/api/liquidity', desc: 'LP liquidity pool management', tokens: '~1.5K' },
  { path: '/api/data-infra', desc: 'Data infrastructure and IPFS', tokens: '~1K' },
  { path: '/api/contracts-arch', desc: 'Smart contract architecture viewer', tokens: '~2K' },
  { path: '/api/engine-arch', desc: 'Cognitive engine architecture', tokens: '~1.5K' },
  { path: '/api/engine-status', desc: 'Real-time engine module status', tokens: '~800' },
  { path: '/api/contracts/simulate', desc: 'Contract revenue simulation', tokens: '~1K' },
];

function generateLlmsTxt(): string {
  const lines: string[] = [
    '# BB Protocol — Cognitive Avatar Protocol',
    '',
    '> Web4.0 Cognitive Ownership Infrastructure — Behavior as Contract · Memory as Eternity · Resonance as Divinity · Awakening as Freedom',
    '',
    '## Overview',
    '- [Home](/): Dashboard and main interface for the BB Protocol platform',
    '',
    '## API Reference (with token estimates)',
  ];

  for (const ep of API_ENDPOINTS) {
    lines.push(`- [${ep.desc}](${ep.path}) — ${ep.tokens} tokens`);
  }

  lines.push('');
  lines.push('## Key Concepts');
  lines.push('- **Cognitive Avatar**: AI-powered digital twin on-chain (ERC-721)');
  lines.push('- **Resonance Score**: Alignment metric (0-100) between avatar and user intent');
  lines.push('- **IFP Delegation**: Intent-Followed-Protocol for fluid democracy');
  lines.push('- **x402 Payment**: Micro-payment protocol for skill unlocking');
  lines.push('- **DID**: Decentralized Identity (did:pkh) for avatar ownership');
  lines.push('- **Multi-chain**: Cross-chain deployment (Base L2, Ethereum, EVM chains)');
  lines.push('');
  lines.push('## Smart Contracts');
  lines.push('- BBAvatar.sol: ERC-721 cognitive avatar NFT');
  lines.push('- BBResonance.sol: Resonance score computation');
  lines.push('- BBRevenueSplit.sol: Revenue distribution');
  lines.push('- BBGovernance.sol: DAO governance with quadratic voting');
  lines.push('- BBx402.sol: Micro-payment gateway');
  lines.push('');
  lines.push('## Constraints');
  lines.push('- All Web3 operations require wallet connection');
  lines.push('- API rate limit: 60 requests/minute');
  lines.push('- Token budget: This file is ~500 tokens');

  return lines.join('\n');
}

export async function GET() {
  try {
    const content = generateLlmsTxt();
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'X-Token-Estimate': '~500',
      },
    });
  } catch (error) {
    console.error('[API] Error generating llms.txt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
