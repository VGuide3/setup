import {
  encodeFunctionData,
  decodeFunctionResult,
  getAddress,
  type Abi,
  type AbiFunction,
  type Address,
  type Hex,
} from "viem";
import type { AbiFragment, CallableFunction, FunctionGroup } from "@/types";
import { uid } from "@/lib/utils";
import { signatureOf } from "@/lib/parser";

export function toAbiFunction(frag: AbiFragment): AbiFunction {
  return {
    type: "function",
    name: frag.name ?? "",
    inputs: (frag.inputs ?? []) as AbiFunction["inputs"],
    outputs: (frag.outputs ?? []) as AbiFunction["outputs"],
    stateMutability: (frag.stateMutability as AbiFunction["stateMutability"]) ?? "nonpayable",
  } as AbiFunction;
}

export function isReadFunction(frag: AbiFragment): boolean {
  return (
    frag.type === "function" &&
    (frag.stateMutability === "view" || frag.stateMutability === "pure")
  );
}

export function isWriteFunction(frag: AbiFragment): boolean {
  return (
    frag.type === "function" &&
    (frag.stateMutability === "nonpayable" || frag.stateMutability === "payable")
  );
}

export function groupFunctions(abi: AbiFragment[]): CallableFunction[] {
  const out: CallableFunction[] = [];
  const seen = new Set<string>();
  for (const frag of abi) {
    if (frag.type !== "function") continue;
    if (!frag.name) continue;
    const sig = signatureOf(frag);
    if (seen.has(sig)) continue;
    seen.add(sig);
    let group: FunctionGroup;
    if (isReadFunction(frag)) group = "read";
    else if (isWriteFunction(frag)) group = "write";
    else continue;
    out.push({
      id: uid("fn"),
      fragment: frag,
      group,
      signature: sig,
    });
  }
  return out.sort((a, b) => {
    if (a.group !== b.group) return a.group === "read" ? -1 : 1;
    return a.fragment.name!.localeCompare(b.fragment.name!);
  });
}

export interface ParsedValue {
  ok: boolean;
  value: string | string[];
  error?: string;
}

const ADDRESS_TYPE_RE = /^address$/;

function parseTupleArray(type: string): string[] | null {
  const m = type.match(/^(.+)\[(\d*)\]$/);
  if (!m) return null;
  return [m[1], m[2] || ""];
}

export function parseParam(
  raw: string,
  type: string
): ParsedValue {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, value: "", error: "Empty value" };
  const base = type.replace(/\[\d*\]$/, "");
  const isArray = type.endsWith("[]") || /\[\d+\]$/.test(type);

  if (isArray) {
    const items = parseArray(trimmed);
    if (items === null)
      return { ok: false, value: "", error: "Invalid array syntax" };
    const parsed: string[] = [];
    for (const item of items) {
      const r = parseScalar(item, base);
      if (!r.ok) return { ok: false, value: "", error: r.error };
      parsed.push(r.value as string);
    }
    return { ok: true, value: parsed };
  }

  const r = parseScalar(trimmed, base);
  if (!r.ok) return r;
  return { ok: true, value: r.value as string };
}

function parseArray(text: string): string[] | null {
  let t = text.trim();
  if (t.startsWith("[") && t.endsWith("]")) {
    t = t.slice(1, -1);
  } else if (t.startsWith('"') || t.startsWith("'")) {
    return null;
  }
  if (!t) return [];
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  let inStr: string | null = null;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inStr) {
      cur += c;
      if (c === inStr && t[i - 1] !== "\\") inStr = null;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      cur += c;
      continue;
    }
    if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") depth--;
    if (c === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseScalar(raw: string, base: string): ParsedValue {
  const t = raw.trim();
  if (base === "address") {
    if (ADDRESS_TYPE_RE.test(base) && /^0x[a-fA-F0-9]{40}$/.test(t)) {
      return { ok: true, value: getAddress(t) };
    }
    if (/^0x[a-fA-F0-9]{40}$/.test(t)) return { ok: true, value: getAddress(t) };
    return { ok: false, value: "", error: "Invalid address" };
  }
  if (base === "bool") {
    const lower = t.toLowerCase();
    if (lower === "true" || lower === "1") return { ok: true, value: "true" };
    if (lower === "false" || lower === "0") return { ok: true, value: "false" };
    return { ok: false, value: "", error: "Invalid boolean" };
  }
  if (base.startsWith("uint") || base.startsWith("int")) {
    if (t === "") return { ok: false, value: "", error: "Empty number" };
    const neg = base.startsWith("int") && t.startsWith("-");
    const digits = neg ? t.slice(1) : t;
    if (!/^[0-9]+$/.test(digits))
      return { ok: false, value: "", error: "Invalid integer" };
    return { ok: true, value: t };
  }
  if (base.startsWith("bytes")) {
    if (!/^0x[a-fA-F0-9]*$/.test(t))
      return { ok: false, value: "", error: "Invalid hex bytes" };
    return { ok: true, value: t.toLowerCase() };
  }
  if (base === "string") {
    let v = t;
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    return { ok: true, value: v };
  }
  return { ok: true, value: t };
}

export interface EncodeResult {
  ok: boolean;
  data?: Hex;
  error?: string;
}

export function encodeCall(
  abi: Abi,
  functionName: string,
  args: unknown[]
): EncodeResult {
  try {
    const data = encodeFunctionData({
      abi,
      functionName,
      args,
    } as Parameters<typeof encodeFunctionData>[0]);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export interface DecodeResult {
  ok: boolean;
  result?: unknown;
  error?: string;
}

export function decodeCallResult(
  abi: Abi,
  functionName: string,
  data: Hex
): DecodeResult {
  try {
    const result = decodeFunctionResult({
      abi,
      functionName,
      data,
    } as Parameters<typeof decodeFunctionResult>[0]);
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function formatAbiValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    return value.map((v) => formatAbiValue(v)).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function buildAbiFromFragments(fragments: AbiFragment[]): Abi {
  return fragments.map((f) => toAbiFunction(f)) as Abi;
}

export function getReadFunctionNames(abi: AbiFragment[]): string[] {
  return groupFunctions(abi)
    .filter((f) => f.group === "read")
    .map((f) => f.fragment.name!)
    .filter((n): n is string => Boolean(n));
}

export function getWriteFunctionNames(abi: AbiFragment[]): string[] {
  return groupFunctions(abi)
    .filter((f) => f.group === "write")
    .map((f) => f.fragment.name!)
    .filter((n): n is string => Boolean(n));
}
