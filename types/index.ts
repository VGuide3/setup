import type { Address, Hex } from "viem";

export type { Address, Hex };

export type AbiFragment = {
  type: string;
  name?: string;
  inputs?: AbiParameter[];
  outputs?: AbiParameter[];
  stateMutability?: string;
  anonymous?: boolean;
};

export type AbiParameter = {
  name?: string;
  type: string;
  internalType?: string;
  components?: AbiParameter[];
  indexed?: boolean;
};

export type Abi = AbiFragment[];

export type ContractCategory =
  | "token"
  | "nft"
  | "vault"
  | "router"
  | "governance"
  | "oracle"
  | "custom";

export type AddressSource =
  | "markdown"
  | "build-artifact"
  | "json"
  | "paste"
  | "manual";

export interface ContractEntry {
  id: string;
  name: string;
  address?: Address;
  abi: Abi;
  category: ContractCategory;
  source: AddressSource;
  description?: string;
  links: ContractLink[];
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export interface ContractLink {
  type: "etherscan" | "tenderly" | "blockscout" | "sourcify" | "explorer" | "url";
  url: string;
  label: string;
}

export interface ParsedImport {
  id: string;
  name: string;
  address?: Address;
  abi: Abi;
  category: ContractCategory;
  source: AddressSource;
  links: ContractLink[];
  description?: string;
  notes?: string;
  rawSnippet?: string;
  _selected?: boolean;
}

export type NodeKind =
  | "contract"
  | "wallet"
  | "token"
  | "external"
  | "factory";

export interface DependencyNode {
  id: string;
  label: string;
  kind: NodeKind;
  contractId?: string;
  address?: Address;
}

export interface DependencyEdge {
  id: string;
  source: string;
  target: string;
  kind: "constructor" | "transfer" | "call" | "parent-child" | "mint" | "burn";
  label?: string;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export type FunctionGroup = "read" | "write";

export interface CallableFunction {
  id: string;
  fragment: AbiFragment;
  group: FunctionGroup;
  signature: string;
}

export type ParamValue = string | boolean | string[];

export interface SimulationTraceStep {
  index: number;
  action: string;
  contract?: string;
  detail: string;
  stateChange?: string;
}

export type SimulationStatus = "idle" | "loading" | "success" | "error";

export interface SimulationResult {
  status: SimulationStatus;
  provider: "ankr" | "quicknode";
  gasEstimate?: {
    gasLimit?: string;
    gasPriceGwei?: string;
    costEth?: string;
  };
  assetTransfers: AssetTransfer[];
  trace: SimulationTraceStep[];
  errorMessage?: string;
  revertReason?: string;
  from?: Address;
  to?: Address;
  data?: Hex;
  value?: string;
  simulatedAt: number;
}

export interface AssetTransfer {
  from: Address;
  to: Address;
  token?: Address;
  type: "native" | "erc20" | "erc721" | "erc1155";
  amount: string;
  symbol?: string;
}

export type PanelId =
  | "registry"
  | "interaction"
  | "dependency"
  | "simulation"
  | "payload"
  | "settings";

export interface SimulationConfig {
  provider: "ankr" | "quicknode";
  apiKey: string;
}
