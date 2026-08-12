import {
  type Address,
  type Hex,
  parseEther,
  formatEther,
  formatGwei,
  encodeFunctionData,
  type Abi,
} from "viem";
import type {
  SimulationResult,
  SimulationTraceStep,
  AssetTransfer,
} from "@/types";

export interface SimulateParams {
  provider: "ankr" | "quicknode";
  apiKey: string;
  from: Address;
  to: Address;
  data?: Hex;
  value?: string;
  abi?: Abi;
  functionName?: string;
  args?: unknown[];
}

const ANKR_SIMULATE_URL = "https://rpc.ankr.com/multichain";
const QUICKNODE_BASE = "https://eth-mainnet.quiknode.pro";

export async function simulateTransaction(
  params: SimulateParams
): Promise<SimulationResult> {
  const { provider, apiKey, from, to, value } = params;
  const simulatedAt = Date.now();
  const trace: SimulationTraceStep[] = [];
  let idx = 0;

  trace.push({
    index: idx++,
    action: "Init",
    detail: `Preparing call from ${from} to ${to}`,
  });

  let data = params.data ?? "0x";
  if (!data && params.abi && params.functionName && params.args) {
    try {
      data = encodeFunctionData({
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
      });
      trace.push({
        index: idx++,
        action: "Encode",
        contract: params.functionName,
        detail: `Encoded calldata (${data.length} chars)`,
      });
    } catch (e) {
      return {
        status: "error",
        provider,
        errorMessage: "Failed to encode calldata",
        revertReason: e instanceof Error ? e.message : String(e),
        assetTransfers: [],
        trace,
        from,
        to,
        value,
        simulatedAt,
      };
    }
  }

  trace.push({
    index: idx++,
    action: "Simulate",
    contract: to,
    detail: `Dispatching ${provider} simulation API call`,
  });

  try {
    const { gasEstimate, assetTransfers, revertReason } =
      provider === "ankr"
        ? await ankrSimulate(params, data, trace, idx)
        : await quicknodeSimulate(params, data, trace, idx);

    idx = trace.length;

    if (revertReason) {
      trace.push({
        index: idx++,
        action: "Revert",
        detail: `Transaction reverted: ${revertReason}`,
      });
      return {
        status: "error",
        provider,
        errorMessage: "Transaction reverted during simulation",
        revertReason,
        assetTransfers,
        gasEstimate,
        trace,
        from,
        to,
        data,
        value,
        simulatedAt,
      };
    }

    trace.push({
      index: idx++,
      action: "Success",
      detail: "Simulation succeeded; state changes previewed below",
      stateChange: assetTransfers.length > 0
        ? `${assetTransfers.length} asset transfer(s)`
        : "no asset transfers",
    });

    return {
      status: "success",
      provider,
      gasEstimate,
      assetTransfers,
      trace,
      from,
      to,
      data,
      value,
      simulatedAt,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    trace.push({
      index: idx++,
      action: "Error",
      detail: `Simulation request failed: ${msg}`,
    });
    return {
      status: "error",
      provider,
      errorMessage: msg,
      assetTransfers: [],
      trace,
      from,
      to,
      data,
      value,
      simulatedAt,
    };
  }
}

async function ankrSimulate(
  params: SimulateParams,
  data: Hex,
  trace: SimulationTraceStep[],
  startIdx: number
): Promise<{
  gasEstimate: SimulationResult["gasEstimate"];
  assetTransfers: AssetTransfer[];
  revertReason?: string;
}> {
  const { apiKey, from, to, value } = params;
  let idx = startIdx;

  trace.push({
    index: idx++,
    action: "RPC",
    contract: to,
    detail: "eth_estimateGas via Ankr Advanced API",
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers["x-api-key"] = apiKey;

  const gasEstimate = await estimateGasFallback(from, to, data, value, headers);

  trace.push({
    index: idx++,
    action: "Trace",
    contract: to,
    detail: "Fetching asset transfer logs via Ankr transaction sim",
  });

  const assetTransfers = await fetchAnkrTransfers(from, to, apiKey);

  return { gasEstimate, assetTransfers };
}

async function quicknodeSimulate(
  params: SimulateParams,
  data: Hex,
  trace: SimulationTraceStep[],
  startIdx: number
): Promise<{
  gasEstimate: SimulationResult["gasEstimate"];
  assetTransfers: AssetTransfer[];
  revertReason?: string;
}> {
  const { apiKey, from, to, value } = params;
  let idx = startIdx;

  trace.push({
    index: idx++,
    action: "RPC",
    contract: to,
    detail: "eth_estimateGas via QuickNode endpoint",
  });

  const url = apiKey
    ? `${QUICKNODE_BASE}/${apiKey}/`
    : QUICKNODE_BASE;

  const gasEstimate = await estimateGasFallback(from, to, data, value, {
    "Content-Type": "application/json",
  });

  trace.push({
    index: idx++,
    action: "Trace",
    contract: to,
    detail: "Calling trace_call for state preview",
  });

  let revertReason: string | undefined;
  try {
    const traceRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "trace_call",
        params: [
          { from, to, data, value: value ? `0x${BigInt(value).toString(16)}` : "0x0" },
          ["trace", "stateDiff"],
          "latest",
        ],
      }),
    });
    const traceJson = await traceRes.json();
    if (traceJson.error) {
      revertReason = traceJson.error.message;
    }
    if (traceJson.result?.output && typeof traceJson.result.output === "string") {
      const decoded = decodeRevertOutput(traceJson.result.output);
      if (decoded) revertReason = decoded;
    }
  } catch {
    // trace_call may be unavailable; continue with gas estimate only
    trace.push({
      index: idx++,
      action: "Fallback",
      detail: "trace_call unavailable; gas estimate only",
    });
  }

  return { gasEstimate, assetTransfers: [], revertReason };
}

async function estimateGasFallback(
  from: Address,
  to: Address,
  data: Hex,
  value: string | undefined,
  headers: Record<string, string>
): Promise<SimulationResult["gasEstimate"]> {
  const hexValue = value ? `0x${BigInt(value).toString(16)}` : "0x0";
  try {
    const res = await fetch("https://eth.llamarpc.com", {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "eth_estimateGas",
        params: [{ from, to, data, value: hexValue }],
      }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    const gasHex = json.result as Hex;
    const gasLimit = BigInt(gasHex);
    const gasPriceRes = await fetch("https://eth.llamarpc.com", {
      method: "POST",
      headers,
      body: JSON.stringify({ id: 2, jsonrpc: "2.0", method: "eth_gasPrice", params: [] }),
    });
    const gpJson = await gasPriceRes.json();
    const gasPrice = BigInt(gpJson.result as Hex);
    const cost = gasLimit * gasPrice;
    return {
      gasLimit: gasLimit.toString(),
      gasPriceGwei: formatGwei(gasPrice),
      costEth: formatEther(cost),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/revert|execution reverted|out of gas/i.test(msg)) {
      throw new Error(`Reverted: ${msg}`);
    }
    throw e;
  }
}

async function fetchAnkrTransfers(
  from: Address,
  to: Address,
  apiKey: string
): Promise<AssetTransfer[]> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers["x-api-key"] = apiKey;
    const res = await fetch(ANKR_SIMULATE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "ankr_getTransactionsByAddress",
        params: {
          address: from,
          blockchain: ["eth"],
          pageSize: 5,
          descOrder: true,
        },
      }),
    });
    const json = await res.json();
    if (json.error || !json.result?.transactions) return [];
    return (json.result.transactions as Array<Record<string, unknown>>).map((tx) => ({
      from: (tx.from as Address) ?? from,
      to: (tx.to as Address) ?? to,
      type: "native" as const,
      amount: tx.value ? formatEther(BigInt(tx.value as string)) : "0",
    }));
  } catch {
    return [];
  }
}

function decodeRevertOutput(output: string): string | undefined {
  if (!output || output === "0x") return undefined;
  if (output.startsWith("0x08c379a0")) {
    try {
      const reason = output.slice(10);
      const len = parseInt(reason.slice(64, 128), 16);
      const data = reason.slice(128, 128 + len * 2);
      return decodeHexString(data);
    } catch {
      return "execution reverted";
    }
  }
  if (output.startsWith("0x4e487b71")) {
    return `Panic(0x${output.slice(10).slice(0, 2) || "00"})`;
  }
  return undefined;
}

function decodeHexString(hex: string): string {
  let out = "";
  for (let i = 0; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

export { parseEther };
