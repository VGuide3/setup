"use client";

import { Settings as SettingsIcon, Database, Trash2, KeyRound, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRegistry } from "@/store/registry";

export function SettingsPanel() {
  const contracts = useRegistry((s) => s.contracts);
  const simulationConfig = useRegistry((s) => s.simulationConfig);
  const setSimulationConfig = useRegistry((s) => s.setSimulationConfig);
  const clearAll = useRegistry((s) => s.clearAll);

  const totalFragments = contracts.reduce((a, c) => a + c.abi.length, 0);

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gradient">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure simulation providers and manage local registry data.
        </p>
      </div>

      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Simulation Provider</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
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
            <Label>API Key</Label>
            <Input
              type="password"
              value={simulationConfig.apiKey}
              onChange={(e) => setSimulationConfig({ apiKey: e.target.value })}
              placeholder="stored locally"
              className="font-mono text-xs"
            />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Your API key is stored only in this browser&apos;s localStorage and is
          sent directly to the provider you select — never to any backend.
        </p>
      </div>

      <div className="glass-panel p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">Local Storage</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Contracts</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{contracts.length}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">ABI Fragments</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">{totalFragments}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            key: <code className="ml-1 font-mono text-[10px]">scr-registry-v1</code>
          </Badge>
        </div>
        <Button
          variant="outline"
          className="gap-2 text-destructive hover:text-destructive"
          onClick={() => {
            if (confirm("Remove all contracts from local storage? This cannot be undone.")) {
              clearAll();
            }
          }}
          disabled={contracts.length === 0}
        >
          <Trash2 className="h-4 w-4" />
          Clear all contracts
        </Button>
      </div>

      <div className="glass-panel p-5 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">About</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Smart Contract Registry v1.0 — an enterprise-grade dashboard for
          importing ABIs, parsing markdown / build artifacts, interacting with
          contracts on Ethereum Mainnet, mapping dependencies, and simulating
          transactions. Built with Next.js App Router, wagmi, viem, React Flow,
          and shadcn-style UI. Client-side only; no backend.
        </p>
      </div>
    </div>
  );
}
