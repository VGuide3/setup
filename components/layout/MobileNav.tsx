"use client";

import { LayoutGrid, MousePointerClick, Share2, FlaskConical } from "lucide-react";
import { useRegistry } from "@/store/registry";
import type { PanelId } from "@/types";
import { cn } from "@/lib/utils";

const ITEMS: Array<{ id: PanelId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "registry", label: "Registry", icon: LayoutGrid },
  { id: "interaction", label: "Interact", icon: MousePointerClick },
  { id: "dependency", label: "Map", icon: Share2 },
  { id: "simulation", label: "Sim", icon: FlaskConical },
];

export function MobileNav() {
  const activePanel = useRegistry((s) => s.activePanel);
  const setActivePanel = useRegistry((s) => s.setActivePanel);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-background/80 backdrop-blur-2xl md:hidden">
      <div className="grid grid-cols-4">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
