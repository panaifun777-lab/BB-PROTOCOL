import { NextResponse } from 'next/server';

// ── Web3 Integration Mock Data ────────────────────────────

const walletConnections = [
  { wallet: 'MetaMask', status: 'connected', address: '0x7a3f...b2c1', chainId: 8453, chainName: 'Base', balance: '1,250.45 AFC', balanceUsd: '$3,062.85', lastConnected: '2026-03-10T14:30:00Z' },
  { wallet: 'WalletConnect', status: 'available', address: '', chainId: 0, chainName: '', balance: '', balanceUsd: '', lastConnected: '' },
  { wallet: 'Coinbase Wallet', status: 'available', address: '', chainId: 0, chainName: '', balance: '', balanceUsd: '', lastConnected: '' },
  { wallet: 'Rainbow', status: 'available', address: '', chainId: 0, chainName: '', balance: '', balanceUsd: '', lastConnected: '' },
  { wallet: 'Ledger', status: 'available', address: '', chainId: 0, chainName: '', balance: '', balanceUsd: '', lastConnected: '' },
];

const contractInteractions = [
  { contract: 'AvatarCore', function: 'createAvatar', status: 'available', gasEstimate: '185,000', gasCost: '$0.37', lastCalled: '2026-03-10T10:00:00Z', calls24h: 12 },
  { contract: 'AvatarCore', function: 'updateCognitionRoot', status: 'available', gasEstimate: '45,000', gasCost: '$0.09', lastCalled: '2026-03-10T14:20:00Z', calls24h: 28 },
  { contract: 'DynamicSplitter', function: 'executeSplit', status: 'available', gasEstimate: '92,000', gasCost: '$0.18', lastCalled: '2026-03-10T14:28:00Z', calls24h: 156 },
  { contract: 'CircuitGuard', function: 'evaluateState', status: 'available', gasEstimate: '38,000', gasCost: '$0.08', lastCalled: '2026-03-10T14:30:00Z', calls24h: 340 },
  { contract: 'IFDRouter', function: 'delegate', status: 'available', gasEstimate: '55,000', gasCost: '$0.11', lastCalled: '2026-03-10T09:15:00Z', calls24h: 8 },
  { contract: 'SkillVault', function: 'unlockSkill', status: 'available', gasEstimate: '45,000', gasCost: '$0.09', lastCalled: '2026-03-09T18:00:00Z', calls24h: 3 },
  { contract: 'ECEOracle', function: 'submitResonanceScore', status: 'restricted', gasEstimate: '68,000', gasCost: '$0.14', lastCalled: '2026-03-10T14:30:00Z', calls24h: 720 },
  { contract: 'TokenVault', function: 'stake', status: 'available', gasEstimate: '75,000', gasCost: '$0.15', lastCalled: '2026-03-10T12:00:00Z', calls24h: 45 },
];

const eventSubscriptions = [
  { event: 'AvatarCreated', contract: 'AvatarCore', status: 'subscribed', events24h: 12, lastEvent: '2026-03-10T10:00:00Z' },
  { event: 'CognitionUpdated', contract: 'AvatarCore', status: 'subscribed', events24h: 28, lastEvent: '2026-03-10T14:20:00Z' },
  { event: 'SplitExecuted', contract: 'DynamicSplitter', status: 'subscribed', events24h: 156, lastEvent: '2026-03-10T14:28:00Z' },
  { event: 'CircuitStateChanged', contract: 'CircuitGuard', status: 'subscribed', events24h: 5, lastEvent: '2026-03-10T12:15:00Z' },
  { event: 'DelegationCreated', contract: 'IFDRouter', status: 'subscribed', events24h: 8, lastEvent: '2026-03-10T09:15:00Z' },
  { event: 'SkillUnlocked', contract: 'SkillVault', status: 'subscribed', events24h: 3, lastEvent: '2026-03-09T18:00:00Z' },
  { event: 'ResonanceUpdated', contract: 'ECEOracle', status: 'subscribed', events24h: 720, lastEvent: '2026-03-10T14:30:00Z' },
  { event: 'Staked', contract: 'TokenVault', status: 'subscribed', events24h: 45, lastEvent: '2026-03-10T12:00:00Z' },
];

const transactionHistory = [
  { id: '1', type: 'contract_call', contract: 'DynamicSplitter', function: 'executeSplit', hash: '0xabc123...def456', status: 'confirmed', gasUsed: 89500, gasCost: '$0.18', blockNumber: 21456789, timestamp: '2026-03-10T14:28:00Z' },
  { id: '2', type: 'contract_call', contract: 'CircuitGuard', function: 'evaluateState', hash: '0x789012...345678', status: 'confirmed', gasUsed: 36200, gasCost: '$0.07', blockNumber: 21456788, timestamp: '2026-03-10T14:28:30Z' },
  { id: '3', type: 'token_transfer', contract: 'AFC', function: 'transfer', hash: '0x111222...333444', status: 'confirmed', gasUsed: 51000, gasCost: '$0.10', blockNumber: 21456750, timestamp: '2026-03-10T14:20:00Z' },
  { id: '4', type: 'contract_call', contract: 'TokenVault', function: 'stake', hash: '0x555666...777888', status: 'pending', gasUsed: 0, gasCost: '--', blockNumber: 0, timestamp: '2026-03-10T14:25:00Z' },
  { id: '5', type: 'contract_call', contract: 'IFDRouter', function: 'delegate', hash: '0x999000...aaabbb', status: 'confirmed', gasUsed: 52800, gasCost: '$0.11', blockNumber: 21456600, timestamp: '2026-03-10T09:15:00Z' },
];

const wagmiConfig = {
  chains: [
    { id: 8453, name: 'Base', status: 'active', rpcUrl: 'https://mainnet.base.org', blockExplorer: 'https://basescan.org', nativeCurrency: 'ETH' },
    { id: 84532, name: 'Base Sepolia', status: 'testnet', rpcUrl: 'https://sepolia.base.org', blockExplorer: 'https://sepolia.basescan.org', nativeCurrency: 'ETH' },
    { id: 1, name: 'Ethereum', status: 'available', rpcUrl: 'https://eth.llamarpc.com', blockExplorer: 'https://etherscan.io', nativeCurrency: 'ETH' },
    { id: 42161, name: 'Arbitrum', status: 'available', rpcUrl: 'https://arb1.arbitrum.io/rpc', blockExplorer: 'https://arbiscan.io', nativeCurrency: 'ETH' },
  ],
  connectors: ['injected', 'walletConnect', 'coinbaseWallet'],
  autoConnect: true,
  pollingInterval: 4000,
};

const gasTracker = {
  base: { slow: '0.01', standard: '0.02', fast: '0.05', instant: '0.1' },
  ethereum: { slow: '8', standard: '12.5', fast: '18', instant: '25' },
  arbitrum: { slow: '0.03', standard: '0.05', fast: '0.08', instant: '0.15' },
  gasHistory: [
    { date: '03-04', base: 0.018, ethereum: 11.2, arbitrum: 0.04 },
    { date: '03-05', base: 0.022, ethereum: 13.5, arbitrum: 0.05 },
    { date: '03-06', base: 0.015, ethereum: 10.8, arbitrum: 0.04 },
    { date: '03-07', base: 0.025, ethereum: 14.2, arbitrum: 0.06 },
    { date: '03-08', base: 0.019, ethereum: 12.0, arbitrum: 0.05 },
    { date: '03-09', base: 0.021, ethereum: 11.8, arbitrum: 0.05 },
    { date: '03-10', base: 0.02, ethereum: 12.5, arbitrum: 0.05 },
  ],
};

export async function GET() {
  return NextResponse.json({
    walletConnections,
    contractInteractions,
    eventSubscriptions,
    transactionHistory,
    wagmiConfig,
    gasTracker,
  });
}
