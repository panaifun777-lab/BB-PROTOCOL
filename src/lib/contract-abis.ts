// ── BB Protocol: Contract ABI Registry ──
// Auto-generated from forge build output. Do not edit manually.

import type { Abi } from 'viem';

// ── AvatarCore ──
import AvatarCoreArtifact from '../../contracts/out/AvatarCore.sol/AvatarCore.json';
export const avatarCoreAbi: Abi = AvatarCoreArtifact.abi as Abi;

// ── CircuitGuard ──
import CircuitGuardArtifact from '../../contracts/out/CircuitGuard.sol/CircuitGuard.json';
export const circuitGuardAbi: Abi = CircuitGuardArtifact.abi as Abi;

// ── DynamicSplitter ──
import DynamicSplitterArtifact from '../../contracts/out/DynamicSplitter.sol/DynamicSplitter.json';
export const dynamicSplitterAbi: Abi = DynamicSplitterArtifact.abi as Abi;

// ── SkillVault ──
import SkillVaultArtifact from '../../contracts/out/SkillVault.sol/SkillVault.json';
export const skillVaultAbi: Abi = SkillVaultArtifact.abi as Abi;

// ── IFDRouter ──
import IFDRouterArtifact from '../../contracts/out/IFDRouter.sol/IFDRouter.json';
export const ifdRouterAbi: Abi = IFDRouterArtifact.abi as Abi;

// ── ECEOracle ──
import ECEOracleArtifact from '../../contracts/out/ECEOracle.sol/ECEOracle.json';
export const eceOracleAbi: Abi = ECEOracleArtifact.abi as Abi;

// ── TokenVault ──
import TokenVaultArtifact from '../../contracts/out/TokenVault.sol/TokenVault.json';
export const tokenVaultAbi: Abi = TokenVaultArtifact.abi as Abi;

// ── PoUEVerifier ──
import PoUEVerifierArtifact from '../../contracts/out/PoUEVerifier.sol/PoUEVerifier.json';
export const poueVerifierAbi: Abi = PoUEVerifierArtifact.abi as Abi;

// ── MCPRouter ──
import MCPRouterArtifact from '../../contracts/out/MCPRouter.sol/MCPRouter.json';
export const mcpRouterAbi: Abi = MCPRouterArtifact.abi as Abi;

// ── GovernanceToken ──
import GovernanceTokenArtifact from '../../contracts/out/GovernanceToken.sol/GovernanceToken.json';
export const governanceTokenAbi: Abi = GovernanceTokenArtifact.abi as Abi;

// ── Contract ABI Map ──
import { CONTRACT_ADDRESSES, type ContractName } from '@/lib/web3-config';

export const contractAbiMap: Record<ContractName, Abi> = {
  avatarCore: avatarCoreAbi,
  circuitGuard: circuitGuardAbi,
  dynamicSplitter: dynamicSplitterAbi,
  skillVault: skillVaultAbi,
  ifdRouter: ifdRouterAbi,
  eceOracle: eceOracleAbi,
  tokenVault: tokenVaultAbi,
  poueVerifier: poueVerifierAbi,
  mcpRouter: mcpRouterAbi,
  governanceToken: governanceTokenAbi,
};

/** Get contract ABI by name */
export function getContractAbi(name: ContractName): Abi {
  return contractAbiMap[name];
}

/** Get full contract config (address + ABI) */
export function getContractConfig(name: ContractName) {
  return {
    address: CONTRACT_ADDRESSES[name],
    abi: contractAbiMap[name],
  } as const;
}
