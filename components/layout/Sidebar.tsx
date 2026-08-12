"use client";

import {
  LayoutGrid,
  MousePointerClick,
  Share2,
  FlaskConical,
  Settings,
  Boxes,
} from "lucide-react";
import { useRegistry } from "@/store/registry";
import type { PanelId } from "@/types";
import { cn } from "@/lib/utils";

const NAV: Array<{
  id: PanelId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}> = [
  { id: "registry", label: "Registry", icon: LayoutGrid, desc: "Contracts & ABIs" },
  { id: "interaction", label: "Interaction", icon: MousePointerClick, desc: "Read / Write" },
  { id: "dependency", label: "Dependency Map", icon: Share2, desc: "Node graph" },
  { id: "simulation", label: "Simulation", icon: FlaskConical, desc: "Tx preview" },
  { id: "settings", label: "Settings", icon: Settings, desc: "Config" },
];

export function Sidebar() {
  const activePanel = useRegistry((s) => s.activePanel);
  const setActivePanel = useRegistry((s) => s.setActivePanel);
  const contractsCount = useRegistry((s) => s.contracts.length);

  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] bg-background/40 backdrop-blur-xl md:flex md:flex-col">
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <div className="px-2 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Workspace
          </span>
        </div>
        {NAV.map((item, idx) => {
          const Icon = item.icon;
          const active = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all animate-fade-in-up",
                active
                  ? "bg-white/[0.07] text-foreground"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
              )}
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-primary to-accent" />
              )}
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "bg-white/[0.04] text-muted-foreground group-hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium leading-tight">{item.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {item.desc}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <div className="glass-card flex items-center gap-3 p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Boxes className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Registered</span>
            <span className="text-sm font-semibold tabular-nums">
              {contractsCount} contract{contractsCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
