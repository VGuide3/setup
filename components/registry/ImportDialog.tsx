"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  FileText,
  ClipboardPaste,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  FileJson,
} from "lucide-react";
import {
  parseInput,
  parseBulk,
  type RawSourceType,
  type ParseResult,
} from "@/lib/parser";
import type { ParsedImport } from "@/types";
import { useRegistry } from "@/store/registry";
import { cn, safeJsonStringify } from "@/lib/utils";
import { CategoryIcon, CATEGORY_META } from "@/components/common/category";

type Step = "input" | "review";

export function ImportDialog({
  children,
  onImported,
}: {
  children?: React.ReactNode;
  onImported?: (count: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("input");
  const [text, setText] = React.useState("");
  const [source, setSource] = React.useState<RawSourceType>("paste");
  const [parsed, setParsed] = React.useState<ParseResult | null>(null);
  const [diagnostics, setDiagnostics] = React.useState<string[]>([]);
  const [importing, setImporting] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const importContracts = useRegistry((s) => s.importContracts);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("input");
    setText("");
    setSource("paste");
    setParsed(null);
    setDiagnostics([]);
  };

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) setTimeout(reset, 250);
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const inputs: { content: string; source: RawSourceType; fileName: string }[] = [];
    for (const file of arr) {
      const isJson = file.name.endsWith(".json");
      const isMd = file.name.endsWith(".md") || file.name.endsWith(".markdown");
      const src: RawSourceType = isJson ? "json" : isMd ? "markdown" : "build-artifact";
      try {
        const content = await file.text();
        inputs.push({ content, source: src, fileName: file.name });
      } catch {
        setDiagnostics((d) => [...d, `Failed to read ${file.name}`]);
      }
    }
    if (inputs.length === 0) return;

    if (inputs.length === 1) {
      const single = inputs[0];
      setText(single.content);
      setSource(single.source);
      const result = parseInput({
        content: single.content,
        source: single.source,
        fileName: single.fileName,
      });
      setParsed(result);
      setDiagnostics(result.diagnostics);
    } else {
      setText(`[Bulk import of ${inputs.length} files]`);
      setSource("markdown");
      const bulk = parseBulk(inputs);
      setParsed({ imports: bulk.imports, diagnostics: bulk.diagnostics });
      setDiagnostics(bulk.diagnostics);
    }
    setStep("review");
  };

  const handleParseText = () => {
    if (!text.trim()) return;
    const result = parseInput({ content: text, source });
    setParsed(result);
    setDiagnostics(result.diagnostics);
    setStep("review");
  };

  const toggleImport = (id: string) => {
    if (!parsed) return;
    setParsed({
      ...parsed,
      imports: parsed.imports.map((i) =>
        i.id === id ? { ...i, _selected: !i._selected } : i
      ) as ParsedImport[],
    });
  };

  const confirmImport = async () => {
    if (!parsed) return;
    setImporting(true);
    const selected = parsed.imports.filter((i) => i._selected !== false);
    const added = importContracts(selected);
    setImporting(false);
    onImported?.(added);
    setOpen(false);
    setTimeout(reset, 250);
  };

  const selectedCount =
    parsed?.imports.filter((i) => i._selected !== false).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="gradient" className="gap-2">
            <Upload className="h-4 w-4" />
            Import Contracts
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Universal Contract Importer
          </DialogTitle>
          <DialogDescription>
            Paste ABI / markdown, or drop files. The parser extracts ABIs,
            addresses, and Tenderly / Etherscan links, then merges snippets.
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <SourceTypeButton
                active={source === "paste"}
                onClick={() => setSource("paste")}
                icon={ClipboardPaste}
                label="Paste ABI / Markdown"
              />
              <SourceTypeButton
                active={source === "build-artifact"}
                onClick={() => setSource("build-artifact")}
                icon={FileJson}
                label="Build Artifact"
              />
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
              }}
              className={cn(
                "relative rounded-xl border border-dashed transition-colors",
                dragging
                  ? "border-primary/60 bg-primary/10"
                  : "border-white/15 bg-white/[0.02] hover:border-white/25"
              )}
            >
              <button
                onClick={() => fileRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 px-4 py-6 text-center"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="text-sm font-medium">
                  Drop files here, or click to browse
                </div>
                <div className="text-xs text-muted-foreground">
                  Supports .md, .json, and build artifacts · bulk import multiple files
                </div>
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".md,.markdown,.json,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) handleFiles(e.target.files);
                }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Or paste content directly
                </label>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {text.length.toLocaleString()} chars
                </span>
              </div>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`// Paste an ABI array, a markdown doc with ABIs, addresses and Tenderly links...\n[\n  { "type": "function", "name": "balanceOf", "inputs": [...] }\n]`}
                className="min-h-[180px] font-mono text-xs"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={reset}>
                Clear
              </Button>
              <Button
                variant="gradient"
                size="sm"
                onClick={handleParseText}
                disabled={!text.trim()}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Parse & Preview
              </Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {parsed?.imports.length ?? 0} detected
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {source}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep("input")}
              >
                ← Back
              </Button>
            </div>

            {diagnostics.length > 0 && (
              <div className="max-h-24 overflow-auto rounded-xl border border-white/10 bg-white/[0.02] p-2">
                {diagnostics.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-1 py-0.5 text-[11px] text-muted-foreground"
                  >
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/70" />
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            )}

            <ScrollArea className="h-[340px] rounded-xl border border-white/10 bg-white/[0.02]">
              <div className="divide-y divide-white/5">
                {parsed?.imports.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No contracts detected. Try adjusting your input.
                  </div>
                )}
                {parsed?.imports.map((imp) => {
                  const meta = CATEGORY_META[imp.category];
                  const selected = imp._selected !== false;
                  return (
                    <ImportRow
                      key={imp.id}
                      imp={imp}
                      selected={selected}
                      onToggle={() => toggleImport(imp.id)}
                      categoryLabel={meta.label}
                    />
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {selectedCount} of {parsed?.imports.length ?? 0} selected
              </span>
              <Button
                variant="gradient"
                size="sm"
                onClick={confirmImport}
                disabled={selectedCount === 0 || importing}
                className="gap-2"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Approve & Import {selectedCount > 0 ? `(${selectedCount})` : ""}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SourceTypeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all",
        active
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-white/10 bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function ImportRow({
  imp,
  selected,
  onToggle,
  categoryLabel,
}: {
  imp: ParsedImport;
  selected: boolean;
  onToggle: () => void;
  categoryLabel: string;
}) {
  const functionCount = imp.abi.filter((f) => f.type === "function").length;
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div className="p-3">
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-white/20 bg-transparent hover:border-white/40"
          )}
        >
          {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{imp.name}</span>
            <Badge variant="secondary" className="gap-1">
              <CategoryIcon category={imp.category} className="h-3 w-3" />
              {categoryLabel}
            </Badge>
            {imp.address && (
              <Badge variant="outline" className="font-mono text-[10px]">
                {imp.address.slice(0, 8)}…{imp.address.slice(-4)}
              </Badge>
            )}
            {functionCount > 0 && (
              <Badge variant="accent">{functionCount} fn</Badge>
            )}
          </div>
          {imp.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {imp.description}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1">
            {imp.links.map((l, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">
                {l.label}
              </Badge>
            ))}
          </div>
          {imp.abi.length > 0 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-1.5 text-[11px] text-primary hover:underline"
            >
              {expanded ? "Hide" : "View"} raw ABI ({imp.abi.length} fragments)
            </button>
          )}
        </div>
      </div>
      {expanded && imp.abi.length > 0 && (
        <pre className="mt-2 max-h-40 overflow-auto rounded-lg border border-white/10 bg-black/40 p-2 text-[10px] font-mono text-muted-foreground">
          {safeJsonStringify(imp.abi)}
        </pre>
      )}
    </div>
  );
}
