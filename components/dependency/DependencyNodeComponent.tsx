"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Boxes, Wallet, Coins, Factory, Link2 } from "lucide-react";
import type { DependencyNode } from "@/types";
import { cn, shortenAddress } from "@/lib/utils";

export const KIND_META: Record<
  DependencyNode["kind"],
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; ring: string }
> = {
  contract: { label: "Contract", icon: Boxes, color: "text-primary border-primary/40 bg-primary/10", ring: "ring-primary/40" },
  wallet: { label: "Wallet", icon: Wallet, color: "text-accent border-accent/40 bg-accent/10", ring: "ring-accent/40" },
  token: { label: "Token", icon: Coins, color: "text-chart-2 border-chart-2/40 bg-chart-2/10", ring: "ring-chart-2/40" },
  factory: { label: "Factory", icon: Factory, color: "text-chart-5 border-chart-5/40 bg-chart-5/10", ring: "ring-chart-5/40" },
  external: { label: "External", icon: Link2, color: "text-muted-foreground border-white/15 bg-white/[0.04]", ring: "ring-white/20" },
};

export function DependencyNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as DependencyNode & { _highlighted?: boolean };
  const meta = KIND_META[d.kind];
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "group relative flex w-48 items-center gap-2.5 rounded-xl border px-3 py-2.5 backdrop-blur-xl transition-all",
        meta.color,
        selected && "ring-2 ring-offset-2 ring-offset-background",
        selected && meta.ring,
        d._highlighted && "scale-105 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.6)]"
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-white/40" />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-foreground">{d.label}</div>
        {d.address && (
          <code className="text-[9px] font-mono text-muted-foreground">
            {shortenAddress(d.address, 4)}
          </code>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-white/40" />
    </div>
  );
}

export const nodeTypes = { dependency: DependencyNodeComponent };
