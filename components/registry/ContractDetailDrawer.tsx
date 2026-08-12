"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Copy,
  Check,
  Download,
  ExternalLink,
  MousePointerClick,
  Tag,
  Hash,
  FileJson,
} from "lucide-react";
import { useRegistry } from "@/store/registry";
import { CategoryIcon, CATEGORY_META } from "@/components/common/category";
import { copyToClipboard, downloadFile, safeJsonStringify, shortenAddress, cn } from "@/lib/utils";
import { groupFunctions } from "@/lib/abi";
import type { AbiFragment } from "@/types";

export function ContractDetailDrawer() {
  const selectedId = useRegistry((s) => s.selectedContractId);
  const setSelectedContractId = useRegistry((s) => s.setSelectedContractId);
  const contract = useRegistry((s) =>
    s.contracts.find((c) => c.id === s.selectedContractId)
  );
  const setInteractionContractId = useRegistry((s) => s.setInteractionContractId);
  const setActivePanel = useRegistry((s) => s.setActivePanel);
  const [copied, setCopied] = React.useState(false);

  const open = Boolean(contract && selectedId);

  const copyAbi = async () => {
    if (!contract) return;
    const ok = await copyToClipboard(safeJsonStringify(contract.abi));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  const downloadAbi = () => {
    if (!contract) return;
    downloadFile(`${contract.name}.abi.json`, safeJsonStringify(contract.abi));
  };

  const onOpenChange = (v: boolean) => {
    if (!v) setSelectedContractId(null);
  };

  if (!contract) return null;

  const meta = CATEGORY_META[contract.category];
  const callables = groupFunctions(contract.abi);
  const events = contract.abi.filter((f) => f.type === "event");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose={false}
        className="max-w-2xl p-0 overflow-hidden"
      >
        <div className="grad-border rounded-2xl">
          <DialogHeader className="p-5 pb-3 border-b border-white/[0.06]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06]", meta.color)}>
                  <CategoryIcon category={contract.category} className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base">{contract.name}</DialogTitle>
                  <DialogDescription className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="gap-1">
                      <CategoryIcon category={contract.category} className="h-3 w-3" />
                      {meta.label}
                    </Badge>
                    <span className="text-xs">via {contract.source}</span>
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 px-5 py-3 border-b border-white/[0.06] text-xs">
            <DetailRow icon={Hash} label="Address">
              {contract.address ? (
                <code className="font-mono text-foreground/80">
                  {shortenAddress(contract.address, 8)}
                </code>
              ) : (
                <span className="text-muted-foreground italic">none</span>
              )}
            </DetailRow>
            <DetailRow icon={FileJson} label="Fragments">
              <span className="tabular-nums">{contract.abi.length}</span>
            </DetailRow>
            <DetailRow icon={MousePointerClick} label="Functions">
              <span className="tabular-nums">
                {callables.filter((c) => c.group === "read").length} read ·{" "}
                {callables.filter((c) => c.group === "write").length} write
              </span>
            </DetailRow>
            <DetailRow icon={Tag} label="Events">
              <span className="tabular-nums">{events.length}</span>
            </DetailRow>
          </div>

          <Tabs defaultValue="abi" className="px-5 py-3">
            <div className="flex items-center justify-between">
              <TabsList className="h-8">
                <TabsTrigger value="abi" className="text-xs">Raw ABI</TabsTrigger>
                <TabsTrigger value="functions" className="text-xs">Functions</TabsTrigger>
                <TabsTrigger value="links" className="text-xs">Links</TabsTrigger>
              </TabsList>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" onClick={copyAbi} aria-label="Copy ABI">
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={downloadAbi} aria-label="Download ABI">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="abi">
              <ScrollArea className="h-72 rounded-xl border border-white/10 bg-black/30">
                <pre className="p-3 text-[11px] font-mono text-muted-foreground leading-relaxed">
                  {contract.abi.length === 0
                    ? "// No ABI fragments"
                    : safeJsonStringify(contract.abi)}
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="functions">
              <ScrollArea className="h-72 rounded-xl border border-white/10 bg-black/30">
                <div className="p-2 space-y-1">
                  {callables.length === 0 && (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No callable functions in this ABI.
                    </div>
                  )}
                  {callables.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
                    >
                      <Badge variant={c.group === "read" ? "success" : "warn"} className="text-[9px] px-1.5">
                        {c.group === "read" ? "R" : "W"}
                      </Badge>
                      <code className="text-[11px] font-mono text-foreground/80 truncate">
                        {c.signature}
                      </code>
                      <span className="ml-auto text-[9px] text-muted-foreground">
                        {c.fragment.stateMutability}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="links">
              <div className="space-y-1.5">
                {contract.links.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-xs text-muted-foreground">
                    No external links discovered for this contract.
                  </div>
                ) : (
                  contract.links.map((l, i) => (
                    <a
                      key={i}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm transition-colors hover:bg-white/[0.07]"
                    >
                      <span className="flex items-center gap-2">
                        <Badge variant="accent">{l.label}</Badge>
                        <span className="truncate text-xs text-muted-foreground">{l.url}</span>
                      </span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="p-5 pt-3 border-t border-white/[0.06]">
            <Button
              variant="gradient"
              className="w-full gap-2"
              onClick={() => {
                setInteractionContractId(contract.id);
                setSelectedContractId(null);
                setActivePanel("interaction");
              }}
              disabled={callables.length === 0}
            >
              <MousePointerClick className="h-4 w-4" />
              Open in Interaction Panel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="ml-auto">{children}</span>
    </div>
  );
}
