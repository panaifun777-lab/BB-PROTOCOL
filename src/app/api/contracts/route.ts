import { NextRequest, NextResponse } from 'next/server';
import {
  CONTRACT_ADDRESSES,
  CONTRACT_ABIS,
  CHAIN_CONFIG,
  GAS_CONSTANTS,
} from '@/lib/web3-config';
import { db } from '@/lib/db';

// GET /api/contracts — Return smart contract information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeDeployments = searchParams.get('includeDeployments') === 'true';
    const contractName = searchParams.get('contract');

    // Build contract info from web3-config
    const contracts = Object.entries(CONTRACT_ADDRESSES).map(
      ([name, address]) => ({
        name,
        address,
        abi: CONTRACT_ABIS[name as keyof typeof CONTRACT_ABIS]
          ? JSON.stringify(CONTRACT_ABIS[name as keyof typeof CONTRACT_ABIS])
          : null,
        functions: CONTRACT_ABIS[name as keyof typeof CONTRACT_ABIS]
          ?.filter((item) => item.type === 'function')
          .map((fn) => fn.name) || [],
        events: CONTRACT_ABIS[name as keyof typeof CONTRACT_ABIS]
          ?.filter((item) => item.type === 'event')
          .map((ev) => ev.name) || [],
      })
    );

    // If a specific contract is requested, filter to that one
    const resultContracts = contractName
      ? contracts.filter((c) => c.name === contractName)
      : contracts;

    // Chain information
    const chains = Object.entries(CHAIN_CONFIG).map(([_key, config]) => ({
      chainId: config.chainId,
      name: config.name,
      rpcUrl: config.rpcUrl,
      blockExplorer: config.blockExplorer,
      nativeCurrency: config.nativeCurrency,
    }));

    // Convert BigInt values to strings for JSON serialization
    const gasConstants = {
      baseL2GasPrice: GAS_CONSTANTS.baseL2GasPrice,
      maxPriorityFeePerGas: GAS_CONSTANTS.maxPriorityFeePerGas.toString(),
      maxFeePerGas: GAS_CONSTANTS.maxFeePerGas.toString(),
    };

    const result: {
      contracts: typeof resultContracts;
      chains: typeof chains;
      gasConstants: typeof gasConstants;
      deployments?: Awaited<ReturnType<typeof db.contractDeploymentRecord.findMany>>;
    } = {
      contracts: resultContracts,
      chains,
      gasConstants,
    };

    // Optionally include deployment records from DB
    if (includeDeployments) {
      const where = contractName
        ? { contractName }
        : {};
      result.deployments = await db.contractDeploymentRecord.findMany({
        where,
        orderBy: { deployedAt: 'desc' },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error in GET /api/contracts:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve contract information',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
