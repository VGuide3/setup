import type { DependencyGraph } from "@/types";

/**
 * Hardcoded dependency relationships between well-known Ethereum mainnet
 * contracts. These describe constructor dependencies, token transfer paths,
 * wallet-to-contract flows, and parent-child links. The graph is fused with
 * user-imported registry contracts at runtime (see buildResolvedGraph).
 */

export interface HardcodedNode {
  id: string;
  label: string;
  kind: "contract" | "wallet" | "token" | "external" | "factory";
  address?: `0x${string}`;
  contractId?: string;
}

export interface HardcodedEdge {
  id: string;
  source: string;
  target: string;
  kind: "constructor" | "transfer" | "call" | "parent-child" | "mint" | "burn";
  label?: string;
}

export const HARDCODED_NODES: HardcodedNode[] = [
  {
    id: "wallet-user",
    label: "User Wallet",
    kind: "wallet",
  },
  {
    id: "usdc",
    label: "USDC Token",
    kind: "token",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  {
    id: "weth",
    label: "WETH Token",
    kind: "token",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
  {
    id: "uni-v2-router",
    label: "Uniswap V2 Router",
    kind: "contract",
    address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  },
  {
    id: "uni-v2-factory",
    label: "Uniswap V2 Factory",
    kind: "factory",
    address: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
  },
  {
    id: "uni-v2-pair",
    label: "Uniswap V2 Pair (USDC/WETH)",
    kind: "contract",
    address: "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc",
  },
  {
    id: "aave-pool",
    label: "Aave Pool (Lending)",
    kind: "contract",
    address: "0x87870Bca3F3fF6135C13C7cfc1dEAC6c9Aa14C6f",
  },
  {
    id: "aave-ausdc",
    label: "aUSDC (aToken)",
    kind: "token",
    address: "0x57d04665a4aEa8831cE4425f8141c9b28432a47A",
  },
  {
    id: "ctoken-usdc",
    label: "cUSDC (Compound)",
    kind: "token",
    address: "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
  },
  {
    id: "comptroller",
    label: "Comptroller",
    kind: "contract",
    address: "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B",
  },
  {
    id: "multicall3",
    label: "Multicall3",
    kind: "contract",
    address: "0xcA11bde05977b3631167028862bE2a173976CA11",
  },
];

export const HARDCODED_EDGES: HardcodedEdge[] = [
  {
    id: "e-wallet-usdc-transfer",
    source: "wallet-user",
    target: "usdc",
    kind: "transfer",
    label: "approve / transfer",
  },
  {
    id: "e-wallet-router-call",
    source: "wallet-user",
    target: "uni-v2-router",
    kind: "call",
    label: "swap",
  },
  {
    id: "e-router-factory-ctor",
    source: "uni-v2-router",
    target: "uni-v2-factory",
    kind: "constructor",
    label: "factory() dep",
  },
  {
    id: "e-router-pair-call",
    source: "uni-v2-router",
    target: "uni-v2-pair",
    kind: "call",
    label: "swap()",
  },
  {
    id: "e-factory-pair-parent",
    source: "uni-v2-factory",
    target: "uni-v2-pair",
    kind: "parent-child",
    label: "createPair()",
  },
  {
    id: "e-pair-usdc-transfer",
    source: "uni-v2-pair",
    target: "usdc",
    kind: "transfer",
    label: "swap transfer",
  },
  {
    id: "e-pair-weth-transfer",
    source: "uni-v2-pair",
    target: "weth",
    kind: "transfer",
    label: "swap transfer",
  },
  {
    id: "e-wallet-aave-call",
    source: "wallet-user",
    target: "aave-pool",
    kind: "call",
    label: "supply()",
  },
  {
    id: "e-aave-usdc-transfer",
    source: "aave-pool",
    target: "usdc",
    kind: "transfer",
    label: "pull deposit",
  },
  {
    id: "e-aave-ausdc-mint",
    source: "aave-pool",
    target: "aave-ausdc",
    kind: "mint",
    label: "mint aToken",
  },
  {
    id: "e-wallet-comptroller-call",
    source: "wallet-user",
    target: "comptroller",
    kind: "call",
    label: "enterMarkets()",
  },
  {
    id: "e-wallet-ctoken-mint",
    source: "wallet-user",
    target: "ctoken-usdc",
    kind: "call",
    label: "mint()",
  },
  {
    id: "e-ctoken-usdc-transfer",
    source: "ctoken-usdc",
    target: "usdc",
    kind: "transfer",
    label: "underlying",
  },
  {
    id: "e-comptroller-ctoken-parent",
    source: "comptroller",
    target: "ctoken-usdc",
    kind: "parent-child",
    label: "cToken registry",
  },
  {
    id: "e-wallet-multicall-call",
    source: "wallet-user",
    target: "multicall3",
    kind: "call",
    label: "aggregate()",
  },
  {
    id: "e-multicall-router-call",
    source: "multicall3",
    target: "uni-v2-router",
    kind: "call",
    label: "batched call",
  },
];

export const HARDCODED_GRAPH: DependencyGraph = {
  nodes: HARDCODED_NODES,
  edges: HARDCODED_EDGES,
};
