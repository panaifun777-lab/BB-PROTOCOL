import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const agentInfo = {
      protocol: 'BB Protocol',
      version: '1.0.0',
      description: 'Web4.0 Cognitive Ownership Infrastructure',
      capabilities: [
        {
          name: 'cognitive-avatar',
          description: 'Create and manage AI-powered cognitive avatars as on-chain digital twins',
          endpoints: ['/api/avatars', '/api/avatars/{id}'],
          required_inputs: ['wallet_address', 'avatar_configuration'],
          constraints: ['Requires Web3 wallet connection', 'One avatar per DID'],
        },
        {
          name: 'resonance-scoring',
          description: 'Compute resonance scores measuring avatar-user alignment',
          endpoints: ['/api/resonance'],
          required_inputs: ['avatar_id'],
          constraints: ['Score range: 0-100', 'Updated every 15 minutes'],
        },
        {
          name: 'ifp-delegation',
          description: 'Intent-Followed-Protocol delegation for fluid democracy',
          endpoints: ['/api/delegations'],
          required_inputs: ['delegator_did', 'delegatee_did', 'scope'],
          constraints: ['Delegation is revocable', 'Max 10 active delegations per user'],
        },
        {
          name: 'x402-payment',
          description: 'Micro-payment protocol for avatar skill unlocking',
          endpoints: ['/api/avatars/{id}/unlock-skill'],
          required_inputs: ['avatar_id', 'skill_id', 'payment_proof'],
          constraints: ['Minimum payment: 0.001 ETH', 'Payment verified on-chain'],
        },
        {
          name: 'dao-governance',
          description: 'DAO proposal creation and quadratic voting',
          endpoints: ['/api/dao-governance'],
          required_inputs: ['proposal_data', 'voter_did'],
          constraints: ['Quadratic voting', 'Minimum 100 tokens to propose'],
        },
        {
          name: 'multi-chain',
          description: 'Cross-chain deployment and bridge management',
          endpoints: ['/api/multichain'],
          required_inputs: ['source_chain', 'target_chain', 'transaction_data'],
          constraints: ['Supported: Base L2, Ethereum, Arbitrum, Optimism'],
        },
      ],
      smart_contracts: {
        chain: 'Base L2',
        contracts: {
          BBAvatar: 'ERC-721 cognitive avatar NFT',
          BBResonance: 'Resonance score computation and attestation',
          BBRevenueSplit: 'Revenue distribution (human/avatar/protocol)',
          BBGovernance: 'DAO governance with quadratic voting',
          BBx402: 'Micro-payment gateway for skill unlocking',
        },
      },
      rate_limits: {
        general: '60 requests/minute',
        ai_agents: '30 requests/minute',
      },
      documentation: '/llms.txt',
      agents_md: '/AGENTS.md',
    };

    return NextResponse.json(agentInfo, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[API] Error in agent-info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
