"use client";

import * as React from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Share2, Boxes, Code2, MousePointerClick, Layers, Wallet, Coins, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { nodeTypes } from "./DependencyNodeComponent";
import { HARDCODED_NODES, HARDCODED_EDGES } from "@/config/dependencyGraph";
import { useRegistry } from "@/store/registry";
import type { DependencyNode, DependencyEdge } from "@/types";
import { cn } from "@/lib/utils";

const EDGE_STYLES: Record<DependencyEdge["kind"], string> = {
  constructor: "#6C5CE7",
  transfer: "#00D1B2",
  call: "#F5A623",
  "parent-child": "#a78bfa",
  mint: "#34d399",
  burn: "#f87171",
};

export function DependencyGraphPanel() {
  const contracts = useRegistry((s) => s.contracts);
  const setInteractionContractId = useRegistry((s) => s.setInteractionContractId);
  const setActivePanel = useRegistry((s) => s.setActivePanel);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const { initialNodes, initialEdges } = React.useMemo(() => {
    const nodes: Node[] = HARDCODED_NODES.map((n) => ({
      id: n.id,
      type: "dependency",
      position: { x: 0, y: 0 },
      data: { ...n } as unknown as Record<string, unknown>,
    }));

    // Append user-registered contracts as nodes
    contracts.forEach((c) => {
      const id = `reg-${c.id}`;
      if (nodes.find((n) => n.id === id)) return;
      nodes.push({
        id,
        type: "dependency",
        position: { x: 0, y: 0 },
        data: {
          id,
          label: c.name,
          kind: "contract",
          contractId: c.id,
          address: c.address,
        } as unknown as Record<string, unknown>,
      });
    });

    const edges: Edge[] = HARDCODED_EDGES.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: "smoothstep",
      animated: e.kind === "transfer" || e.kind === "call",
      style: { stroke: EDGE_STYLES[e.kind], strokeWidth: 1.6 },
      markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_STYLES[e.kind], width: 14, height: 14 },
    }));

    // Link registered contracts with addresses to matching hardcoded nodes by address
    contracts.forEach((c) => {
      if (!c.address) return;
      const match = HARDCODED_NODES.find(
        (hn) => hn.address && hn.address.toLowerCase() === c.address!.toLowerCase()
      );
      if (match) {
        const eid = `e-link-${c.id}`;
        if (!edges.find((e) => e.id === eid)) {
          edges.push({
            id: eid,
            source: `reg-${c.id}`,
            target: match.id,
            label: "registered",
            type: "smoothstep",
            style: { stroke: "#00D1B2", strokeWidth: 1.4, strokeDasharray: "4 3" },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#00D1B2", width: 12, height: 12 },
          });
        }
      }
    });

    // Layout: column-based positioning
    const layouted = applyLayout(nodes, edges);
    return { initialNodes: layouted.nodes, initialEdges: layouted.edges };
  }, [contracts]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = React.useCallback(
    (_, node) => {
      setSelectedId(node.id);
      const d = node.data as unknown as DependencyNode;
      if (d.contractId) {
        setInteractionContractId(d.contractId);
      }
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...n.data,
            _highlighted:
              n.id === node.id ||
              edges.some(
                (e) =>
                  (e.source === node.id && e.target === n.id) ||
                  (e.target === node.id && e.source === n.id)
              ),
          } as unknown as Record<string, unknown>,
        }))
      );
    },
    [edges, setNodes, setInteractionContractId]
  );

  const onPaneClick = React.useCallback(() => {
    setSelectedId(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, _highlighted: false } as unknown as Record<string, unknown>,
      }))
    );
  }, [setNodes]);

  const selectedNode = nodes.find((n) => n.id === selectedId)?.data as
    unknown as DependencyNode | undefined;
  const selectedContract = selectedNode?.contractId
    ? contracts.find((c) => c.id === selectedNode.contractId)
    : undefined;

  const openInteraction = () => {
    if (selectedNode?.contractId) {
      setActivePanel("interaction");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gradient">
            Dependency Map
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Interactive node graph of constructor dependencies, token transfer
            paths, and parent-child links. Click a node to highlight neighbors.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(EDGE_STYLES).map(([k, color]) => (
            <Badge key={k} variant="outline" className="gap-1.5 text-[10px]">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              {k}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        <div className="h-[560px] glass-panel overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.3}
            maxZoom={2.2}
          >
            <Background gap={28} size={1} color="hsl(var(--foreground) / 0.08)" />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) => {
                const kind = (n.data as unknown as DependencyNode)?.kind;
                switch (kind) {
                  case "wallet": return "#00D1B2";
                  case "token": return "#34d399";
                  case "factory": return "#f59e0b";
                  default: return "#6C5CE7";
                }
              }}
              maskColor="hsl(240 16% 4% / 0.7)"
            />
          </ReactFlow>
        </div>

        <div className="space-y-3">
          <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Share2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Node Inspector</span>
            </div>
            {selectedNode ? (
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {selectedNode.kind}
                  </div>
                  <div className="font-medium text-sm">{selectedNode.label}</div>
                </div>
                {selectedNode.address && (
                  <code className="block break-all rounded-lg bg-black/30 p-2 text-[10px] font-mono text-muted-foreground">
                    {selectedNode.address}
                  </code>
                )}
                {selectedContract && (
                  <div className="space-y-1.5">
                    <Badge variant="secondary" className="gap-1">
                      <Layers className="h-3 w-3" />
                      {selectedContract.abi.length} fragments
                    </Badge>
                    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-muted-foreground">
                        <Code2 className="h-3 w-3" />
                        Raw ABI preview
                      </div>
                      <pre className="max-h-32 overflow-auto text-[9px] font-mono text-muted-foreground">
                        {JSON.stringify(selectedContract.abi.slice(0, 3), null, 1)}
                        {selectedContract.abi.length > 3 && "\n…"}
                      </pre>
                    </div>
                    <Button
                      variant="gradient"
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={openInteraction}
                      disabled={!selectedContract.abi.some((f) => f.type === "function")}
                    >
                      <MousePointerClick className="h-3.5 w-3.5" />
                      Open Interaction Panel
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04]">
                  <Boxes className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Click a node to inspect its details and highlight connected
                  contracts.
                </p>
              </div>
            )}
          </div>

          <div className="glass-panel p-4">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">
              Graph Legend
            </div>
            <div className="space-y-1.5 text-xs">
              <LegendRow icon={Wallet} label="User Wallet" color="text-accent" />
              <LegendRow icon={Boxes} label="Contract" color="text-primary" />
              <LegendRow icon={Coins} label="Token" color="text-chart-2" />
              <LegendRow icon={Factory} label="Factory" color="text-chart-5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendRow({
  icon: Icon,
  label,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("h-3.5 w-3.5", color)} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function applyLayout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  // Group nodes by kind for column assignment
  const order: Record<string, number> = {
    wallet: 0,
    factory: 1,
    contract: 2,
    token: 3,
    external: 4,
  };

  const columns: Record<number, Node[]> = {};
  for (const n of nodes) {
    const kind = (n.data as unknown as DependencyNode).kind ?? "contract";
    const col = order[kind] ?? 2;
    if (!columns[col]) columns[col] = [];
    columns[col].push(n);
  }

  const COL_W = 280;
  const ROW_H = 110;

  const positioned: Node[] = [];
  const sortedCols = Object.keys(columns).map(Number).sort((a, b) => a - b);
  for (const col of sortedCols) {
    const colNodes = columns[col];
    colNodes.forEach((n, i) => {
      const yOffset = -(colNodes.length - 1) * ROW_H * 0.5 + i * ROW_H;
      positioned.push({
        ...n,
        position: { x: col * COL_W, y: yOffset },
      });
    });
  }
  return { nodes: positioned, edges };
}
