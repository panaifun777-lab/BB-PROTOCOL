// ===== Web3 Configuration — Wagmi v2 + Viem for Base L2 =====

import { base, baseSepolia } from 'viem/chains';
import { http } from 'viem';
import type { Address, Abi } from 'viem';

// ── Chain Configuration ──────────────────────────────────
export const SUPPORTED_CHAINS = [base, baseSepolia] as const;

export const CHAIN_CONFIG = {
  base: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  },
  baseSepolia: {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  },
} as const;

// ── Contract Addresses (Deployed on Base Sepolia Testnet) ──
export const CONTRACT_ADDRESSES = {
  avatarCore: '0x521109f047742Cb178b6dAEb885B24BDB1A58f2E' as Address,
  dynamicSplitter: '0x725aeb5c0e0A115a2C92ed5e0C38B3A93029f2B8' as Address,
  circuitGuard: '0xBDEbe9ce46F2f4D75f14778537d8b23baA9f2a6B' as Address,
  skillVault: '0x72F1de8C97fdc3AA8Ec027Abe405d10E5739ccAc' as Address,
  ifdRouter: '0x5cA3a41138AD21D00e3C71725Fd4A3C285f92a12' as Address,
  tokenVault: '0x79DE3DF928Dd0B98110B6D8fDE63C4F7134071C6' as Address,
  eceOracle: '0x93bca6E51a5c597f86563aC320977427e5df669D' as Address,
  poueVerifier: '0xfbADf35642A1A5Ec92411358ac7735cD766b9Ff6' as Address,
  mcpRouter: '0x9923B7CB6B509991b3250f53b386c53C56abbDbF' as Address,
  governanceToken: '0xC742381FBb85e6c7e76233a37bD90c1Ffd502536' as Address,
} as const;

export type ContractName = keyof typeof CONTRACT_ADDRESSES;

// ── ABI Snippets ─────────────────────────────────────────

export const AVATAR_CORE_ABI: Abi = [
  {
    type: 'function',
    name: 'createAvatar',
    inputs: [
      { name: 'soulId', type: 'string' },
      { name: 'cognitionRoot', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateCognitionRoot',
    inputs: [
      { name: 'avatarId', type: 'uint256' },
      { name: 'newRoot', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getAvatarProfile',
    inputs: [{ name: 'avatarId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'soulId', type: 'string' },
          { name: 'owner', type: 'address' },
          { name: 'cognitionRoot', type: 'bytes32' },
          { name: 'resonanceScore', type: 'uint256' },
          { name: 'circuitState', type: 'uint8' },
          { name: 'isFrozen', type: 'bool' },
          { name: 'createdAt', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'AvatarCreated',
    inputs: [
      { name: 'avatarId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'soulId', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'CognitionUpdated',
    inputs: [
      { name: 'avatarId', type: 'uint256', indexed: true },
      { name: 'newRoot', type: 'bytes32', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
];

export const DYNAMIC_SPLITTER_ABI: Abi = [
  {
    type: 'function',
    name: 'executeSplit',
    inputs: [
      { name: 'avatarId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
      { name: 'source', type: 'uint8' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getSplitConfig',
    inputs: [{ name: 'avatarId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'humanBps', type: 'uint256' },
          { name: 'avatarBps', type: 'uint256' },
          { name: 'protocolBps', type: 'uint256' },
          { name: 'lastUpdated', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'RevenueSplit',
    inputs: [
      { name: 'avatarId', type: 'uint256', indexed: true },
      { name: 'totalAmount', type: 'uint256', indexed: false },
      { name: 'humanShare', type: 'uint256', indexed: false },
      { name: 'avatarShare', type: 'uint256', indexed: false },
      { name: 'protocolShare', type: 'uint256', indexed: false },
      { name: 'source', type: 'uint8', indexed: false },
    ],
  },
];

export const CIRCUIT_GUARD_ABI: Abi = [
  {
    type: 'function',
    name: 'evaluateState',
    inputs: [{ name: 'avatarId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'triggerRecovery',
    inputs: [{ name: 'avatarId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getCircuitState',
    inputs: [{ name: 'avatarId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'CircuitStateChanged',
    inputs: [
      { name: 'avatarId', type: 'uint256', indexed: true },
      { name: 'oldState', type: 'uint8', indexed: false },
      { name: 'newState', type: 'uint8', indexed: false },
      { name: 'resonanceScore', type: 'uint256', indexed: false },
    ],
  },
];

export const TOKEN_VAULT_ABI: Abi = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'avatarId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      { name: 'avatarId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getBalance',
    inputs: [{ name: 'avatarId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getStakingInfo',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'totalStaked', type: 'uint256' },
          { name: 'apy', type: 'uint256' },
          { name: 'stakers', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'TokenDeposit',
    inputs: [
      { name: 'avatarId', type: 'uint256', indexed: true },
      { name: 'depositor', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'lpMinted', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TokenWithdrawal',
    inputs: [
      { name: 'avatarId', type: 'uint256', indexed: true },
      { name: 'withdrawer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'lpBurned', type: 'uint256', indexed: false },
    ],
  },
];

// Additional contract ABIs for completeness

export const SKILL_VAULT_ABI: Abi = [
  {
    type: 'function',
    name: 'unlockSkill',
    inputs: [
      { name: 'avatarId', type: 'uint256' },
      { name: 'skillId', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getSkillStatus',
    inputs: [
      { name: 'avatarId', type: 'uint256' },
      { name: 'skillId', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'SkillUnlocked',
    inputs: [
      { name: 'avatarId', type: 'uint256', indexed: true },
      { name: 'skillId', type: 'uint256', indexed: true },
      { name: 'tier', type: 'uint256', indexed: false },
    ],
  },
];

export const IFD_ROUTER_ABI: Abi = [
  {
    type: 'function',
    name: 'delegateVote',
    inputs: [
      { name: 'domain', type: 'string' },
      { name: 'delegatee', type: 'address' },
      { name: 'weight', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'DelegationCreated',
    inputs: [
      { name: 'delegator', type: 'address', indexed: true },
      { name: 'delegatee', type: 'address', indexed: true },
      { name: 'domain', type: 'string', indexed: false },
      { name: 'weight', type: 'uint256', indexed: false },
    ],
  },
];

export const ECE_ORACLE_ABI: Abi = [
  {
    type: 'function',
    name: 'submitResonanceScore',
    inputs: [
      { name: 'avatarId', type: 'uint256' },
      { name: 'score', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'ResonanceUpdated',
    inputs: [
      { name: 'avatarId', type: 'uint256', indexed: true },
      { name: 'score', type: 'uint256', indexed: false },
      { name: 'delta', type: 'int256', indexed: false },
    ],
  },
];

// ── Contract ABIs Map ────────────────────────────────────
export const CONTRACT_ABIS: Record<ContractName, Abi> = {
  avatarCore: AVATAR_CORE_ABI,
  dynamicSplitter: DYNAMIC_SPLITTER_ABI,
  circuitGuard: CIRCUIT_GUARD_ABI,
  skillVault: SKILL_VAULT_ABI,
  ifdRouter: IFD_ROUTER_ABI,
  tokenVault: TOKEN_VAULT_ABI,
  eceOracle: ECE_ORACLE_ABI,
  poueVerifier: [
    {
      type: 'function',
      name: 'submitProof',
      inputs: [
        { name: 'taskId', type: 'bytes32' },
        { name: 'proofHash', type: 'bytes32' },
        { name: 'proofData', type: 'bytes' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'verifyProof',
      inputs: [{ name: 'taskId', type: 'bytes32' }],
      outputs: [{ name: 'status', type: 'uint8' }],
      stateMutability: 'view',
    },
    {
      type: 'event',
      name: 'ProofSubmitted',
      inputs: [
        { name: 'taskId', type: 'bytes32', indexed: true },
        { name: 'proofHash', type: 'bytes32', indexed: false },
      ],
    },
  ],
  mcpRouter: [
    {
      type: 'function',
      name: 'registerProvider',
      inputs: [
        { name: 'providerId', type: 'bytes32' },
        { name: 'provider', type: 'address' },
        { name: 'stake', type: 'uint256' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'routeRequest',
      inputs: [
        { name: 'modelId', type: 'bytes32' },
        { name: 'input', type: 'bytes' },
      ],
      outputs: [{ name: 'requestId', type: 'bytes32' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'event',
      name: 'RequestRouted',
      inputs: [
        { name: 'requestId', type: 'bytes32', indexed: true },
        { name: 'modelId', type: 'bytes32', indexed: false },
      ],
    },
  ],
  governanceToken: [
    {
      type: 'function',
      name: 'balanceOf',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'approve',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'propose',
      inputs: [
        { name: 'description', type: 'string' },
        { name: 'targets', type: 'address[]' },
        { name: 'values', type: 'uint256[]' },
        { name: 'calldatas', type: 'bytes[]' },
      ],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'castVote',
      inputs: [
        { name: 'proposalId', type: 'uint256' },
        { name: 'support', type: 'uint8' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'event',
      name: 'Transfer',
      inputs: [
        { name: 'from', type: 'address', indexed: true },
        { name: 'to', type: 'address', indexed: true },
        { name: 'value', type: 'uint256', indexed: false },
      ],
    },
    {
      type: 'event',
      name: 'VoteCast',
      inputs: [
        { name: 'proposalId', type: 'uint256', indexed: true },
        { name: 'voter', type: 'address', indexed: true },
        { name: 'support', type: 'uint8', indexed: false },
        { name: 'weight', type: 'uint256', indexed: false },
      ],
    },
  ],
};

// ── Wagmi Transport Config ───────────────────────────────
export const TRANSPORTS = {
  [base.id]: http('https://mainnet.base.org'),
  [baseSepolia.id]: http('https://sepolia.base.org'),
} as const;

// ── Block Explorer URL Builder ───────────────────────────
export function getBlockExplorerUrl(
  chainId: number,
  type: 'tx' | 'address' | 'block',
  value: string,
): string {
  const explorers: Record<number, string> = {
    8453: 'https://basescan.org',
    84532: 'https://sepolia.basescan.org',
    1: 'https://etherscan.io',
    42161: 'https://arbiscan.io',
  };
  const base = explorers[chainId] || 'https://basescan.org';
  return `${base}/${type}/${value}`;
}

// ── Gas Price Constants (Base L2) ────────────────────────
export const GAS_CONSTANTS = {
  baseL2GasPrice: 0.0000000025, // USD per gas unit on Base L2
  maxPriorityFeePerGas: 1000000000n, // 1 Gwei
  maxFeePerGas: 3000000000n, // 3 Gwei
} as const;
