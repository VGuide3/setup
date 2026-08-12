"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import {
  FlaskConical,
  Play,
  Loader2,
  Fuel,
  ArrowLeftRight,
  ListTree,
  AlertTriangle,
  CheckCircle2,
  Zap,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRegistry } from "@/store/registry";
import { simulateTransaction } from "@/lib/simulation";
import { encodeCall } from "@/lib/abi";
import { shortenAddress, cn, formatTimestamp } from "@/lib/utils";
import type { SimulationResult } from "@/types";
import type { Address } from "viem";

export function SimulationPanel() {
  const contracts = useRegistry((s) => s.contracts);
  const simulationConfig = useRegistry((s) => s.simulationConfig);
  const setSimulationConfig = useRegistry((s) => s.setSimulationConfig);

  const { address } = useAccount();

  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [value, setValue] = React.useState("0");
  const [fnName, setFnName] = React.useState("");
  const [args, setArgs] = React.useState("");
  const [result, setResult] = React.useState<SimulationResult | null>(null);
  const [loading, setLoading] = React.useState(false);

  const contract = contracts[0];
  const [contractId, setContractId] = React.useState(contracts[0]?.id ?? "");

  React.useEffect(() => {
    if (address && !from) setFrom(address);
  }, [address, from]);

  React.useEffect(() => {
    const c = contracts.find((c) => c.id === contractId) ?? contracts[0];
    if (c) {
      setTo(c.address ?? "");
      setFnName("");
      setArgs("");
    }
  }, [contractId, contracts]);

  const selectedContract = contracts.find((c) => c.id === contractId);
  const callableNames = selectedContract
    ? selectedContract.abi
        .filter((f) => f.type === "function" && f.name)
        .map((f) => f.name!)
    : [];

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      let data: `0x${string}` | undefined = undefined;
      let parsedArgs: unknown[] | undefined = undefined;
      if (fnName && selectedContract) {
        const argsArray = parseArgsArray(args);
        const enc = encodeCall(
          selectedContract.abi as never,
          fnName,
          argsArray
        );
        if (enc.ok && enc.data) data = enc.data;
        parsedArgs = argsArray;
      }
      const res = await simulateTransaction({
        provider: simulationConfig.provider,
        apiKey: simulationConfig.apiKey,
        from: (from || "0x0000000000000000000000000000000000000001") as Address,
        to: (to || "0x0000000000000000000000000000000000000002") as Address,
        data,
        value,
        abi: selectedContract?.abi as never,
        functionName: fnName || undefined,
        args: parsedArgs,
      });
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gradient">
          Transaction Simulation
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Preview gas estimates, asset transfers, and a step-by-step execution
          trace before broadcasting. Bring your own Ankr / QuickNode key.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Provider Configuration</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Select
                  value={simulationConfig.provider}
                  onValueChange={(v) =>
                    setSimulationConfig({ provider: v as "ankr" | "quicknode" })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ankr">Ankr Advanced API</SelectItem>
                    <SelectItem value="quicknode">QuickNode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>API Key (optional)</Label>
                <Input
                  type="password"
                  value={simulationConfig.apiKey}
                  onChange={(e) => setSimulationConfig({ apiKey: e.target.value })}
                  placeholder="paste your key"
                  className="font-mono text-xs"
                />
              </div>
            </div>
            {!simulationConfig.apiKey && (
              <p className="text-[10px] text-amber-300/80">
                Without a key, public RPC fallbacks are used for gas estimation.
              </p>
            )}
          </div>

          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Transaction Builder</span>
            </div>
            {contracts.length === 0 ? (
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-300">
                Import a contract with an ABI to populate the call builder.
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>From (caller)</Label>
                  <Input
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    placeholder={address ?? "0x…"}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label>Contract</Label>
                    <Select value={contractId} onValueChange={setContractId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {contracts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Value (ETH)</Label>
                    <Input
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                {selectedContract?.address && (
                  <div className="text-[10px] text-muted-foreground">
                    To: <code className="font-mono">{shortenAddress(selectedContract.address, 8)}</code>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Function (optional)</Label>
                  <Select value={fnName} onValueChange={setFnName}>
                    <SelectTrigger><SelectValue placeholder="none (raw value transfer)" /></SelectTrigger>
                    <SelectContent>
                      {callableNames.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {fnName && (
                  <div className="space-y-1.5">
                    <Label>Arguments (comma separated)</Label>
                    <Textarea
                      value={args}
                      onChange={(e) => setArgs(e.target.value)}
                      placeholder="e.g. 0x1234…, 1000000000000000000"
                      className="min-h-[60px] font-mono text-xs"
                    />
                  </div>
                )}
                <Button
                  variant="gradient"
                  className="w-full gap-2"
                  onClick={run}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {loading ? "Simulating…" : "Run Simulation"}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass-panel p-4 min-h-[260px]">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-chart-5" />
              <span className="text-sm font-medium">Result</span>
              {result && (
                <Badge variant={result.status === "success" ? "success" : "danger"} className="ml-auto">
                  {result.status}
                </Badge>
              )}
            </div>
            {!result ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
                <FlaskConical className="mb-2 h-8 w-8 opacity-40" />
                Run a simulation to preview results here.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <MetricCard
                    icon={Fuel}
                    label="Gas Limit"
                    value={result.gasEstimate?.gasLimit ?? "—"}
                  />
                  <MetricCard
                    icon={Fuel}
                    label="Gas (gwei)"
                    value={result.gasEstimate?.gasPriceGwei ?? "—"}
                  />
                  <MetricCard
                    icon={Fuel}
                    label="Cost (ETH)"
                    value={result.gasEstimate?.costEth ?? "—"}
                  />
                </div>
                {result.revertReason && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span className="break-all">{result.revertReason}</span>
                  </div>
                )}
                {result.errorMessage && !result.revertReason && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-2 text-[11px] text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span className="break-all">{result.errorMessage}</span>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
                    <ArrowLeftRight className="h-3 w-3" />
                    Asset Transfers
                  </div>
                  {result.assetTransfers.length === 0 ? (
                    <div className="text-[11px] text-muted-foreground px-2 py-1">No transfers detected.</div>
                  ) : (
                    <div className="space-y-1">
                      {result.assetTransfers.map((t, i) => (
                        <div key={i} className="rounded-lg border border-white/10 bg-white/[0.02] p-2 text-[11px]">
                          <div className="flex items-center justify-between">
                            <code className="font-mono text-foreground/80">{shortenAddress(t.from)}</code>
                            <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                            <code className="font-mono text-foreground/80">{shortenAddress(t.to)}</code>
                          </div>
                          <div className="mt-1 text-muted-foreground">
                            {t.type} · {t.amount} {t.symbol ?? ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {result && (
            <div className="glass-panel p-4">
              <div className="flex items-center gap-2 mb-3">
                <ListTree className="h-4 w-4 text-chart-1" />
                <span className="text-sm font-medium">Execution Trace</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {formatTimestamp(result.simulatedAt)}
                </span>
              </div>
              <ScrollArea className="h-48">
                <ol className="space-y-1">
                  {result.trace.map((step, i) => (
                    <li
                      key={step.index}
                      className={cn(
                        "flex items-start gap-2 rounded-lg p-2 text-[11px]",
                        step.action === "Revert" || step.action === "Error"
                          ? "bg-destructive/10 text-destructive"
                          : step.action === "Success"
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-white/[0.02] text-muted-foreground"
                      )}
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-white/10 text-[9px] tabular-nums">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-medium text-foreground/90">{step.action}</span>
                        {step.contract && (
                          <span className="ml-1.5 text-primary/70">· {step.contract}</span>
                        )}
                        <div className="text-muted-foreground">{step.detail}</div>
                        {step.stateChange && (
                          <div className="mt-0.5 text-emerald-300/80">→ {step.stateChange}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 truncate font-mono text-xs text-foreground/90" title={value}>
        {value}
      </div>
    </div>
  );
}

function parseArgsArray(raw: string): unknown[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of trimmed) {
    if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());

  return parts.map((p) => {
    if (/^0x[a-fA-F0-9]+$/.test(p)) return p;
    if (p === "true") return true;
    if (p === "false") return false;
    if (/^-?\d+$/.test(p)) return BigInt(p);
    if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'")))
      return p.slice(1, -1);
    return p;
  });
}
