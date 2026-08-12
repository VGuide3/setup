"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ContractEntry,
  PanelId,
  ParsedImport,
  SimulationConfig,
} from "@/types";
import { uid } from "@/lib/utils";

interface RegistryState {
  contracts: ContractEntry[];
  activePanel: PanelId;
  selectedContractId: string | null;
  interactionContractId: string | null;
  simulationConfig: SimulationConfig;
  hydrated: boolean;

  setHydrated: (v: boolean) => void;
  setActivePanel: (p: PanelId) => void;
  setSelectedContractId: (id: string | null) => void;
  setInteractionContractId: (id: string | null) => void;
  setSimulationConfig: (c: Partial<SimulationConfig>) => void;

  importContracts: (imports: ParsedImport[]) => number;
  addContract: (entry: ContractEntry) => void;
  updateContract: (id: string, patch: Partial<ContractEntry>) => void;
  removeContract: (id: string) => void;
  clearAll: () => void;
  getContract: (id: string) => ContractEntry | undefined;
}

function toEntry(imp: ParsedImport): ContractEntry {
  const now = Date.now();
  return {
    id: uid("ctr"),
    name: imp.name,
    address: imp.address,
    abi: imp.abi,
    category: imp.category,
    source: imp.source,
    links: imp.links,
    description: imp.description,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const useRegistry = create<RegistryState>()(
  persist(
    (set, get) => ({
      contracts: [],
      activePanel: "registry",
      selectedContractId: null,
      interactionContractId: null,
      simulationConfig: { provider: "ankr", apiKey: "" },
      hydrated: false,

      setHydrated: (hydrated) => set({ hydrated }),
      setActivePanel: (activePanel) => set({ activePanel }),
      setSelectedContractId: (selectedContractId) =>
        set({ selectedContractId }),
      setInteractionContractId: (interactionContractId) =>
        set({ interactionContractId }),
      setSimulationConfig: (c) =>
        set({ simulationConfig: { ...get().simulationConfig, ...c } }),

      importContracts: (imports) => {
        const existing = get().contracts;
        const byAddr = new Map<string, ContractEntry>();
        const byName = new Map<string, ContractEntry>();
        for (const c of existing) {
          if (c.address) byAddr.set(c.address.toLowerCase(), c);
          byName.set(c.name.toLowerCase(), c);
        }

        const added: ContractEntry[] = [];
        const updatedCount = { v: 0 };

        for (const imp of imports) {
          const entry = toEntry(imp);
          const matchAddr = imp.address
            ? byAddr.get(imp.address.toLowerCase())
            : undefined;
          const matchName = byName.get(imp.name.toLowerCase());
          const match = matchAddr ?? matchName;

          if (match) {
            const mergedAbi = dedupeMerge(match.abi, imp.abi);
            const mergedLinks = dedupeLinks(match.links, imp.links);
            const patch: Partial<ContractEntry> = {
              abi: mergedAbi,
              links: mergedLinks,
              updatedAt: Date.now(),
            };
            if (!match.address && imp.address) patch.address = imp.address;
            set({
              contracts: get().contracts.map((c) =>
                c.id === match.id ? { ...c, ...patch } : c
              ),
            });
            updatedCount.v += 1;
          } else {
            added.push(entry);
            if (imp.address) byAddr.set(imp.address.toLowerCase(), entry);
            byName.set(imp.name.toLowerCase(), entry);
          }
        }
        if (added.length > 0) {
          set({ contracts: [...get().contracts, ...added] });
        }
        return added.length;
      },

      addContract: (entry) => set({ contracts: [...get().contracts, entry] }),
      updateContract: (id, patch) =>
        set({
          contracts: get().contracts.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c
          ),
        }),
      removeContract: (id) =>
        set({
          contracts: get().contracts.filter((c) => c.id !== id),
          selectedContractId:
            get().selectedContractId === id ? null : get().selectedContractId,
          interactionContractId:
            get().interactionContractId === id
              ? null
              : get().interactionContractId,
        }),
      clearAll: () =>
        set({
          contracts: [],
          selectedContractId: null,
          interactionContractId: null,
        }),
      getContract: (id) => get().contracts.find((c) => c.id === id),
    }),
    {
      name: "scr-registry-v1",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (s) => ({
        contracts: s.contracts,
        simulationConfig: s.simulationConfig,
      }),
    }
  )
);

function dedupeMerge(a: ContractEntry["abi"], b: ContractEntry["abi"]): ContractEntry["abi"] {
  const seen = new Set<string>();
  const out = [...a];
  for (const f of a) seen.add(`${f.type}:${f.name ?? ""}`);
  for (const f of b) {
    const key = `${f.type}:${f.name ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(f);
    }
  }
  return out;
}

function dedupeLinks(
  a: ContractEntry["links"],
  b: ContractEntry["links"]
): ContractEntry["links"] {
  const seen = new Set<string>();
  const out = [...a];
  for (const l of a) seen.add(l.url);
  for (const l of b) {
    if (!seen.has(l.url)) {
      seen.add(l.url);
      out.push(l);
    }
  }
  return out;
}
