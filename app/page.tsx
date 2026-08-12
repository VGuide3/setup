"use client";

import { useRegistry } from "@/store/registry";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { RegistryPanel } from "@/components/registry/RegistryPanel";
import { InteractionPanel } from "@/components/interaction/InteractionPanel";
import { DependencyGraphPanel } from "@/components/dependency/DependencyGraphPanel";
import { SimulationPanel } from "@/components/simulation/SimulationPanel";
import { SettingsPanel } from "@/components/layout/SettingsPanel";

export default function Page() {
  const hydrated = useRegistry((s) => s.hydrated);
  const activePanel = useRegistry((s) => s.activePanel);

  return (
    <div className="relative flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 md:pb-6">
          <div className="mx-auto max-w-7xl">
            {!hydrated ? (
              <LoadingShell />
            ) : activePanel === "registry" ? (
              <RegistryPanel />
            ) : activePanel === "interaction" ? (
              <InteractionPanel />
            ) : activePanel === "dependency" ? (
              <DependencyGraphPanel />
            ) : activePanel === "simulation" ? (
              <SimulationPanel />
            ) : (
              <SettingsPanel />
            )}
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-64 rounded-lg bg-white/[0.04] shimmer-line" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-white/[0.03] shimmer-line" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-44 rounded-2xl bg-white/[0.02] shimmer-line" />
        ))}
      </div>
    </div>
  );
}
