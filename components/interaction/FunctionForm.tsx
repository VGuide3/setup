"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff } from "lucide-react";
import type { AbiParameter } from "@/types";
import { parseParam } from "@/lib/abi";

export interface FieldValue {
  raw: string;
  ok: boolean;
  value: string | string[];
  error?: string;
}

export function FunctionForm({
  inputs,
  values,
  onChange,
  disabled,
}: {
  inputs: AbiParameter[];
  values: Record<string, FieldValue>;
  onChange: (name: string, value: FieldValue) => void;
  disabled?: boolean;
}) {
  if (inputs.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-muted-foreground">
        No arguments
      </div>
    );
  }

  return (
    <div className="grid gap-2.5">
      {inputs.map((param, idx) => (
        <ParamField
          key={`${param.name ?? "arg"}-${idx}`}
          param={param}
          index={idx}
          value={values[param.name ?? `_arg${idx}`]}
          onChange={(v) => onChange(param.name ?? `_arg${idx}`, v)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

function ParamField({
  param,
  index,
  value,
  onChange,
  disabled,
}: {
  param: AbiParameter;
  index: number;
  value?: FieldValue;
  onChange: (v: FieldValue) => void;
  disabled?: boolean;
}) {
  const name = param.name ?? `_arg${index}`;
  const [showLabel, setShowLabel] = React.useState(false);

  const handleChange = (raw: string) => {
    const parsed = parseParam(raw, param.type);
    onChange({ raw, ...parsed });
  };

  const isArray = param.type.endsWith("[]") || /\[\d+\]$/.test(param.type);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-1.5">
          <span>{param.name ?? `arg${index}`}</span>
          {showLabel && param.internalType && (
            <span className="text-[10px] text-muted-foreground/70">
              {param.internalType}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowLabel((s) => !s)}
            className="text-muted-foreground/50 hover:text-foreground"
          >
            {showLabel ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </button>
        </Label>
        <Badge variant="outline" className="text-[10px] font-mono">
          {param.type}
        </Badge>
      </div>
      <Input
        value={value?.raw ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholderFor(param.type, isArray)}
        className="font-mono text-xs"
        spellCheck={false}
      />
      {value && !value.ok && value.error && (
        <p className="text-[10px] text-destructive">{value.error}</p>
      )}
    </div>
  );
}

function placeholderFor(type: string, isArray: boolean): string {
  if (isArray) return `e.g. [0x1234…, 0xabcd…]`;
  if (type === "address") return "0x…";
  if (type === "bool") return "true | false";
  if (type.startsWith("uint") || type.startsWith("int"))
    return "e.g. 1000000000000000000";
  if (type.startsWith("bytes")) return "0x…";
  if (type === "string") return "text";
  return "value";
}

export function buildEmptyValues(inputs: AbiParameter[]): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  inputs.forEach((p, i) => {
    const name = p.name ?? `_arg${i}`;
    out[name] = { raw: "", ok: true, value: "" };
  });
  return out;
}

export function collectArgs(
  inputs: AbiParameter[],
  values: Record<string, FieldValue>
): { args: unknown[]; ok: boolean; error?: string } {
  const args: unknown[] = [];
  for (let i = 0; i < inputs.length; i++) {
    const p = inputs[i];
    const name = p.name ?? `_arg${i}`;
    const v = values[name];
    if (!v || !v.raw.trim()) {
      return { args: [], ok: false, error: `Missing value for "${name}"` };
    }
    if (!v.ok) {
      return { args: [], ok: false, error: v.error ?? `Invalid value for "${name}"` };
    }
    const isArray = p.type.endsWith("[]") || /\[\d+\]$/.test(p.type);
    if (isArray) {
      args.push(v.value as string[]);
    } else if (p.type === "bool") {
      args.push(v.value === "true");
    } else if (p.type.startsWith("uint") || p.type.startsWith("int")) {
      args.push(BigInt(v.value as string));
    } else if (p.type.startsWith("bytes") || p.type === "address") {
      args.push(v.value as `0x${string}`);
    } else {
      args.push(v.value);
    }
  }
  return { args, ok: true };
}
