"use client";

import * as React from "react";
import { useAccount, useChainId } from "wagmi";
import { mainnet } from "wagmi/chains";
import {
  BookOpen,
  PencilLine,
  ArrowDownUp,
  Wallet2,
  ExternalLink,
  Boxes,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FunctionCard } from "./FunctionCard";
import { useRegistry } from "@/store/registry";
import { groupFunctions } from "@/lib/abi";
import { CategoryIcon, CATEGORY_META } from "@/components/common/category";
import { shortenAddress, cn } from "@/lib/utils";

export function InteractionPanel() {
  const contracts = useRegistry((s) => s.contracts);
  const interactionContractId = useRegistry((s) => s.interactionContractId);
  const setInteractionContractId = useRegistry((s) => s.setInteractionContractId);
  const { address } = useAccount();
  const chainId = useChainId();
  const onMainnet = chainId === mainnet.id;

  const contract = React.useMemo(
    () =>
      contracts.find((c) => c.id === interactionContractId) ?? contracts[0],
    [contracts, interactionContractId]
  );

  React.useEffect(() => {
    if (!interactionContractId && contracts.length > 0) {
      setInteractionContractId(contracts[0].id);
    }
  }, [interactionContractId, contracts, setInteractionContractId]);

  if (contracts.length === 0) {
    return <EmptyInteraction />;
  }

  if (!contract) {
    return <EmptyInteraction />;
  }

  const callables = groupFunctions(contract.abi);
  const reads = callables.filter((c) => c.group === "read");
  const writes = callables.filter((c) => c.group === "write");
  const meta = CATEGORY_META[contract.category];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gradient">
          Interaction Panel
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Auto-generated UI from the ABI. Reads work without a wallet; writes
          require a connected wallet on Ethereum Mainnet.
        </p>
      </div>

      <div className="glass-panel p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]", meta.color)}>
              <CategoryIcon category={contract.category} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate">{contract.name}</span>
                <Badge variant="secondary">{meta.label}</Badge>
              </div>
              {contract.address ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <code className="font-mono">{shortenAddress(contract.address, 6)}</code>
                  <a
                    href={`https://etherscan.io/address/${contract.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <span className="text-xs text-amber-300/80">No address — write calls disabled</span>
              )}
            </div>
          </div>
          <div className="w-full sm:w-64">
            <Select
              value={contract.id}
              onValueChange={(v) => setInteractionContractId(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contract" />
              </SelectTrigger>
              <SelectContent>
                {contracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={address ? "success" : "secondary"} className="gap-1">
            <Wallet2 className="h-3 w-3" />
            {address ? shortenAddress(address, 4) : "Not connected"}
          </Badge>
          <Badge variant={onMainnet ? "success" : "warn"}>
            {onMainnet ? "Mainnet" : `Chain ${chainId}`}
          </Badge>
          <Badge variant="accent" className="gap-1">
            <ArrowDownUp className="h-3 w-3" />
            {reads.length} read · {writes.length} write
          </Badge>
        </div>
      </div>

      {callables.length === 0 ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-8 text-center text-sm text-amber-300">
          This contract has no callable functions in its ABI. Re-import with a
          full ABI to enable interaction.
        </div>
      ) : (
        <Tabs defaultValue="read" className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="read" className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                Read
                <Badge variant="success" className="px-1.5 py-0 text-[9px]">{reads.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="write" className="gap-1.5">
                <PencilLine className="h-3.5 w-3.5" />
                Write
                <Badge variant="warn" className="px-1.5 py-0 text-[9px]">{writes.length}</Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="read">
            <div className="grid gap-2 lg:grid-cols-2">
              {reads.length === 0 ? (
                <EmptyGroup label="No read functions" />
              ) : (
                reads.map((c) => (
                  <FunctionCard
                    key={c.id}
                    callable={c}
                    abi={contract.abi}
                    contractAddress={contract.address}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="write">
            <div className="grid gap-2 lg:grid-cols-2">
              {writes.length === 0 ? (
                <EmptyGroup label="No write functions" />
              ) : (
                writes.map((c) => (
                  <FunctionCard
                    key={c.id}
                    callable={c}
                    abi={contract.abi}
                    contractAddress={contract.address}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function EmptyGroup({ label }: { label: string }) {
  return (
    <div className="col-span-full rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function EmptyInteraction() {
  const setActivePanel = useRegistry((s) => s.setActivePanel);
  return (
    <div className="grad-border rounded-2xl">
      <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Boxes className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="font-medium">No contract selected</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Import contracts with ABIs to generate an interaction panel with
            grouped Read and Write functions.
          </p>
        </div>
        <Button variant="gradient" onClick={() => setActivePanel("registry")}>
          Go to Registry
        </Button>
      </div>
    </div>
  );
}
