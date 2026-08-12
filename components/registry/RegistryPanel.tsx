"use client";

import * as React from "react";
import { Plus, Search, Boxes, FileDown, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ContractCard } from "./ContractCard";
import { ImportDialog } from "./ImportDialog";
import { ContractDetailDrawer } from "./ContractDetailDrawer";
import { useRegistry } from "@/store/registry";
import { downloadFile, safeJsonStringify } from "@/lib/utils";

export function RegistryPanel() {
  const contracts = useRegistry((s) => s.contracts);
  const clearAll = useRegistry((s) => s.clearAll);
  const [query, setQuery] = React.useState("");
  const [confirmClear, setConfirmClear] = React.useState(false);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return contracts;
    const q = query.toLowerCase();
    return contracts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [contracts, query]);

  const exportAll = () => {
    const payload = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      contracts: contracts.map((c) => ({
        name: c.name,
        address: c.address,
        abi: c.abi,
        category: c.category,
        source: c.source,
        links: c.links,
        description: c.description,
        tags: c.tags,
      })),
    };
    downloadFile("registry-export.json", safeJsonStringify(payload));
  };

  const totalFunctions = contracts.reduce(
    (acc, c) => acc + c.abi.filter((f) => f.type === "function").length,
    0
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gradient">
            Contract Registry
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage imported ABIs and discovered contracts. Persisted to local
            storage.
          </p>
        </div>
        <ImportDialog>
          <Button variant="gradient" className="gap-2">
            <Plus className="h-4 w-4" />
            Import Contracts
          </Button>
        </ImportDialog>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Contracts" value={contracts.length} accent="text-primary" />
        <StatCard label="Functions" value={totalFunctions} accent="text-accent" />
        <StatCard
          label="With Address"
          value={contracts.filter((c) => c.address).length}
          accent="text-chart-4"
        />
        <StatCard
          label="Links"
          value={contracts.reduce((a, c) => a + c.links.length, 0)}
          accent="text-chart-3"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, address, or tag…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="glass"
            size="sm"
            onClick={exportAll}
            disabled={contracts.length === 0}
            className="gap-1.5"
          >
            <FileDown className="h-4 w-4" />
            Export JSON
          </Button>
          {confirmClear ? (
            <div className="flex items-center gap-1">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  clearAll();
                  setConfirmClear(false);
                }}
                className="gap-1.5"
              >
                <Loader2 className="h-3.5 w-3.5" />
                Confirm
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="glass"
              size="sm"
              onClick={() => setConfirmClear(true)}
              disabled={contracts.length === 0}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {contracts.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center text-sm text-muted-foreground">
          No contracts match “{query}”.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c, i) => (
            <div
              key={c.id}
              className="animate-stagger-1"
              style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}
            >
              <ContractCard contract={c} />
            </div>
          ))}
        </div>
      )}

      <ContractDetailDrawer />
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="glass-card p-4">
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${accent}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="grad-border rounded-2xl">
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Boxes className="h-8 w-8 text-primary" />
          <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl animate-pulse-glow" />
        </div>
        <div>
          <h3 className="font-medium">No contracts yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Import ABIs by pasting JSON, dropping markdown / build artifacts, or
            pasting docs that contain addresses and Tenderly links.
          </p>
        </div>
        <ImportDialog />
        <Badge variant="secondary" className="mt-2">
          Stored in localStorage · key <code className="ml-1 font-mono text-[10px]">scr-registry-v1</code>
        </Badge>
      </div>
    </div>
  );
}
