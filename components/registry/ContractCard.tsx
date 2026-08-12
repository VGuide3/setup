"use client";

import { ExternalLink, Trash2, MousePointerClick, Code2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryIcon, CATEGORY_META } from "@/components/common/category";
import { useRegistry } from "@/store/registry";
import type { ContractEntry } from "@/types";
import { cn, formatTimestamp, shortenAddress } from "@/lib/utils";

export function ContractCard({ contract }: { contract: ContractEntry }) {
  const removeContract = useRegistry((s) => s.removeContract);
  const setInteractionContractId = useRegistry((s) => s.setInteractionContractId);
  const setActivePanel = useRegistry((s) => s.setActivePanel);
  const setSelectedContractId = useRegistry((s) => s.setSelectedContractId);
  const meta = CATEGORY_META[contract.category];

  const functionCount = contract.abi.filter((f) => f.type === "function").length;
  const readCount = contract.abi.filter(
    (f) => f.type === "function" && (f.stateMutability === "view" || f.stateMutability === "pure")
  ).length;
  const writeCount = functionCount - readCount;

  const openInteraction = () => {
    setInteractionContractId(contract.id);
    setActivePanel("interaction");
  };

  return (
    <Card
      className="group relative overflow-hidden transition-all hover:border-primary/30 hover:bg-white/[0.06] animate-fade-in-up"
      role="article"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]", meta.color)}>
              <CategoryIcon category={contract.category} className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-sm">{contract.name}</h3>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {meta.label}
              </span>
            </div>
          </div>
          <button
            onClick={() => removeContract(contract.id)}
            className="opacity-0 transition-opacity group-hover:opacity-100 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
            aria-label="Remove contract"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 space-y-1.5">
          {contract.address ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">addr</span>
              <code className="font-mono text-xs text-foreground/80">
                {shortenAddress(contract.address, 6)}
              </code>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic">No address</div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">src</span>
            <span className="text-xs text-foreground/70">{contract.source}</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {functionCount > 0 ? (
            <>
              {readCount > 0 && <Badge variant="success">R · {readCount}</Badge>}
              {writeCount > 0 && <Badge variant="warn">W · {writeCount}</Badge>}
            </>
          ) : (
            <Badge variant="secondary">No ABI</Badge>
          )}
          {contract.links.length > 0 && (
            <Badge variant="accent">{contract.links.length} link{contract.links.length === 1 ? "" : "s"}</Badge>
          )}
        </div>

        {contract.links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {contract.links.slice(0, 3).map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-white/[0.08]"
              >
                {l.label}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="glass"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={openInteraction}
            disabled={functionCount === 0}
          >
            <MousePointerClick className="h-3.5 w-3.5" />
            Interact
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSelectedContractId(contract.id)}
            aria-label="View details"
          >
            <Code2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="border-t border-white/5 px-5 py-2 text-[10px] text-muted-foreground">
        Added {formatTimestamp(contract.createdAt)}
      </div>
    </Card>
  );
}
