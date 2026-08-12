"use client";

import * as React from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { Play, Loader2, Check, AlertCircle, ChevronRight, Wallet2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FunctionForm, collectArgs, buildEmptyValues, type FieldValue } from "./FunctionForm";
import { formatAbiValue, isReadFunction } from "@/lib/abi";
import type { AbiFragment, CallableFunction } from "@/types";
import { cn } from "@/lib/utils";
import type { Address } from "viem";

export function FunctionCard({
  callable,
  abi,
  contractAddress,
}: {
  callable: CallableFunction;
  abi: AbiFragment[];
  contractAddress?: Address;
}) {
  const inputs = callable.fragment.inputs ?? [];
  const [values, setValues] = React.useState<Record<string, FieldValue>>(() =>
    buildEmptyValues(inputs)
  );
  const [expanded, setExpanded] = React.useState(true);
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const isRead = callable.group === "read";
  const { address } = useAccount();

  const onChange = (name: string, v: FieldValue) =>
    setValues((prev) => ({ ...prev, [name]: v }));

  const { args, ok, error: argError } = collectArgs(inputs, values);

  // READ via wagmi useReadContract
  const readQuery = useReadContract({
    abi: abi as never,
    address: contractAddress,
    functionName: callable.fragment.name,
    args,
    query: { enabled: false },
  });

  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const runRead = async () => {
    setResult(null);
    setError(null);
    if (!ok) {
      setError(argError ?? "Invalid arguments");
      return;
    }
    try {
      const res = await readQuery.refetch();
      if (res.error) {
        setError(res.error.message);
        return;
      }
      setResult(formatAbiValue(res.data));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const runWrite = async () => {
    setResult(null);
    setError(null);
    if (!ok) {
      setError(argError ?? "Invalid arguments");
      return;
    }
    if (!address) {
      setError("Connect a wallet to send transactions.");
      return;
    }
    try {
      const txHash = await writeContractAsync({
        abi: abi as never,
        address: contractAddress,
        functionName: callable.fragment.name,
        args,
      } as Parameters<typeof writeContractAsync>[0]);
      setResult(`tx: ${txHash}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const run = () => (isRead ? runRead() : runWrite());
  const disabled = !ok || isWritePending;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] transition-colors hover:border-white/20">
      <div className="flex items-center gap-2 p-2.5">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              expanded && "rotate-90"
            )}
          />
          <code className="text-xs font-mono text-foreground/90 truncate">
            {callable.fragment.name}
          </code>
          <Badge variant="outline" className="text-[9px] font-mono">
            {inputs.length} arg{inputs.length === 1 ? "" : "s"}
          </Badge>
        </button>
        <Badge
          variant={isRead ? "success" : "warn"}
          className="text-[9px] uppercase"
        >
          {isRead ? "read" : "write"}
        </Badge>
        <Button
          size="icon-sm"
          variant={isRead ? "glass" : "gradient"}
          onClick={run}
          disabled={disabled}
          aria-label={isRead ? "Query" : "Send transaction"}
        >
          {isWritePending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-white/5 p-2.5 space-y-2.5 animate-fade-in">
          {inputs.length > 0 ? (
            <FunctionForm
              inputs={inputs}
              values={values}
              onChange={onChange}
              disabled={isWritePending}
            />
          ) : (
            <div className="text-[10px] text-muted-foreground px-1">No arguments required</div>
          )}

          {!isRead && !address && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-300">
              <Wallet2 className="h-3 w-3" />
              Connect a wallet to execute write calls.
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-[11px] text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="break-all">{error}</span>
            </div>
          )}

          {result !== null && (
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-2">
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-300">
                <Check className="h-3 w-3" />
                Result
              </div>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-foreground/90">
                {result}
              </pre>
            </div>
          )}

          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
            <span>{callable.fragment.stateMutability}</span>
            <code className="font-mono">{callable.signature}</code>
          </div>
        </div>
      )}
    </div>
  );
}
