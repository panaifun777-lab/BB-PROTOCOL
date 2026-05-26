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

// ── Contract Addresses (Mock/Placeholder) ────────────────
export const CONTRACT_ADDRESSES = {
  avatarCore: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as Address,
  dynamicSplitter: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address,
  circuitGuard: '0x9fE46736679d2D9a65F0992F2272De9f3c7fa6e0' as Address,
  skillVault: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' as Address,
  ifdRouter: '0xDc64a140Aa8C5D5AeB9F8a7E0F1C9b9B9b9b9b9b' as Address,
  tokenVault: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707' as Address,
  eceOracle: '0x0165878A594ca255338adfa4d48449f69242Eb8F' as Address,
  afcToken: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853' as Address,
  governance: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6' as Address,
  proxyAdmin: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318' as Address,
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
  afcToken: [
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
      type: 'event',
      name: 'Transfer',
      inputs: [
        { name: 'from', type: 'address', indexed: true },
        { name: 'to', type: 'address', indexed: true },
        { name: 'value', type: 'uint256', indexed: false },
      ],
    },
  ],
  governance: [
    {
      type: 'function',
      name: 'propose',
      inputs: [
        { name: 'targets', type: 'address[]' },
        { name: 'values', type: 'uint256[]' },
        { name: 'calldatas', type: 'bytes[]' },
        { name: 'description', type: 'string' },
      ],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'nonpayable',
    },
  ],
  proxyAdmin: [
    {
      type: 'function',
      name: 'upgrade',
      inputs: [
        { name: 'proxy', type: 'address' },
        { name: 'implementation', type: 'address' },
      ],
      outputs: [],
      stateMutability: 'nonpayable',
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
