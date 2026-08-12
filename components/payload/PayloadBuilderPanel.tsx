"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import {
  FileCode2,
  Copy,
  Check,
  Download,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Code2,
  Wallet2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRegistry } from "@/store/registry";
import { buildTransactionPayload, generateDistJs, type TransactionPayload } from "@/lib/payload";
import { parseParam } from "@/lib/abi";
import { shortenAddress, cn, formatTimestamp } from "@/lib/utils";
import type { AbiParameter } from "@/types";

export function PayloadBuilderPanel() {
  const contracts = useRegistry((s) => s.contracts);
  const { address } = useAccount();

  const [contractId, setContractId] = React.useState("");
  const [fnName, setFnName] = React.useState("");
  const [argValues, setArgValues] = React.useState<Record<string, string>>({});
  const [value, setValue] = React.useState("0");
  const [from, setFrom] = React.useState("");
  const [autoSubmit, setAutoSubmit] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [result, setResult] = React.useState<{ distJs: string; payload: TransactionPayload } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [ran, setRan] = React.useState(false);

  React.useEffect(() => {
    if (address && !from) setFrom(address);
  }, [address, from]);

  React.useEffect(() => {
    if (!contractId && contracts[0]) setContractId(contracts[0].id);
  }, [contractId, contracts]);

  const contract = contracts.find((c) => c.id === contractId);
  const callableFns = React.useMemo(
    () =>
      contract
        ? contract.abi.filter(
            (f) => f.type === "function" && f.name && f.stateMutability !== "view" && f.stateMutability !== "pure"
          )
        : [],
    [contract]
  );

  const selectedFn = React.useMemo(
    () => contract?.abi.find((f) => f.type === "function" && f.name === fnName),
    [contract, fnName]
  );

  const inputs = (selectedFn?.inputs ?? []) as AbiParameter[];

  React.useEffect(() => {
    setArgValues({});
  }, [fnName]);

  const build = () => {
    setError(null);
    setResult(null);
    setRan(true);
    if (!contract?.address) {
      setError("Selected contract has no deployed address.");
      return;
    }
    if (!fnName) {
      setError("Select a write function to build a payload.");
      return;
    }
    const args = inputs.map((inp) => {
      const raw = argValues[inp.name ?? inp.type] ?? "";
      const parsed = parseParam(raw, inp.type);
      return parsed.ok ? parsed.value : raw;
    });

    const res = buildTransactionPayload({
      abi: contract.abi,
      address: contract.address,
      functionName: fnName,
      args,
      value,
      from: (from || undefined) as never,
      chainId: 1,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const distJs = generateDistJs(res.payload, {
      autoSubmit,
      label: label || `${contract.name}.${fnName}`,
    });
    setResult({ distJs, payload: res.payload });
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.distJs);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const download = () => {
    if (!result) return;
    const blob = new Blob([result.distJs], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payload-${contract?.name ?? "tx"}-${fnName || "call"}.dist.js`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (contracts.length === 0) {
    return (
      <div className="grad-border rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <FileCode2 className="h-8 w-8 text-primary" />
          <div>
            <h3 className="font-medium">No contracts available</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Import a contract with an ABI to build executable transaction
              payloads and generate a standalone dist.js.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gradient">
          Payload Builder
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure a transaction from an imported ABI, encode the calldata with
          viem, and generate a standalone <code className="font-mono">dist.js</code> that
          reconstructs and exposes the payload at load time.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
        {/* Builder */}
        <div className="glass-panel p-4 space-y-3.5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Transaction Configuration</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
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
              <Label>Function (write)</Label>
              <Select value={fnName} onValueChange={setFnName}>
                <SelectTrigger><SelectValue placeholder="select function" /></SelectTrigger>
                <SelectContent>
                  {callableFns.length === 0 ? (
                    <SelectItem value="__none" disabled>No write functions</SelectItem>
                  ) : (
                    callableFns.map((f) => (
                      <SelectItem key={f.name} value={f.name!}>{f.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {contract?.address && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>To:</span>
              <code className="font-mono">{shortenAddress(contract.address, 8)}</code>
              <Badge variant="outline" className="text-[9px]">chain 1</Badge>
            </div>
          )}

          {inputs.length > 0 && (
            <div className="space-y-2 rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Arguments</div>
              {inputs.map((inp, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px] gap-2">
                  <Input
                    placeholder={`value for ${inp.name ?? inp.type}`}
                    value={argValues[inp.name ?? inp.type] ?? ""}
                    onChange={(e) =>
                      setArgValues((p) => ({ ...p, [inp.name ?? inp.type]: e.target.value }))
                    }
                    className="font-mono text-xs"
                  />
                  <div className="flex items-center gap-1 px-1">
                    <code className="truncate text-[10px] font-mono text-primary/80" title={inp.type}>
                      {inp.name ?? `arg${i}`}
                    </code>
                    <Badge variant="secondary" className="text-[9px]">{inp.type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1.5">
              <Label>Value (ETH)</Label>
              <Input value={value} onChange={(e) => setValue(e.target.value)} className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label>From (caller)</Label>
              <Input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder={address ?? "0x…"}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Export label</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={`${contract?.name ?? "tx"}.${fnName || "call"}`}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
            <div className="flex items-center gap-2">
              <Wallet2 className="h-3.5 w-3.5 text-accent" />
              <div>
                <div className="text-xs font-medium">Auto-submit at load</div>
                <div className="text-[10px] text-muted-foreground">
                  Embed wallet.eth_sendTransaction call in dist.js
                </div>
              </div>
            </div>
            <Switch checked={autoSubmit} onCheckedChange={setAutoSubmit} />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="break-all">{error}</span>
            </div>
          )}

          <Button variant="gradient" className="w-full gap-2" onClick={build}>
            <Sparkles className="h-4 w-4" />
            Build Payload & Generate dist.js
          </Button>
        </div>

        {/* Output */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className="glass-panel p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium">Payload</span>
                  <Badge variant="success" className="ml-auto gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    encoded
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="Selector" value={result.payload.selector} mono />
                  <Metric label="Chain" value={`#${result.payload.chainId}`} />
                  <Metric label="Value" value={`${result.payload.value} ETH`} />
                  <Metric label="Args" value={`${result.payload.args.length}`} />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Calldata (data)</div>
                  <pre className="max-h-28 overflow-auto rounded-lg bg-black/40 p-2 font-mono text-[10px] text-emerald-300/90 break-all whitespace-pre-wrap">
                    {result.payload.data}
                  </pre>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Generated {formatTimestamp(result.payload.generatedAt)}</span>
                  <span>viem encodeFunctionData</span>
                </div>
              </div>

              <div className="glass-panel p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">dist.js</span>
                  <div className="ml-auto flex gap-1.5">
                    <Button size="sm" variant="glass" className="gap-1.5" onClick={copy}>
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copied" : "Copy"}
                    </Button>
                    <Button size="sm" variant="gradient" className="gap-1.5" onClick={download}>
                      <Download className="h-3 w-3" />
                      Download
                    </Button>
                  </div>
                </div>
                <pre className="max-h-[420px] overflow-auto rounded-lg bg-black/50 p-3 font-mono text-[10px] leading-relaxed text-foreground/80">
                  {result.distJs}
                </pre>
              </div>
            </>
          ) : (
            <div className="glass-panel p-4 min-h-[520px]">
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <FileCode2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground max-w-xs">
                  {ran
                    ? "Configure a transaction and build to generate the standalone dist.js."
                    : "Select a contract and write function, fill in arguments, then build to generate a load-time executable dist.js."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-1 truncate text-xs text-foreground/90", mono && "font-mono")} title={value}>
        {value}
      </div>
    </div>
  );
}
