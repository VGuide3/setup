import type {
  Abi,
  AbiFragment,
  Address,
  ContractCategory,
  ContractLink,
  ParsedImport,
} from "@/types";
import { uid } from "@/lib/utils";

const ADDRESS_RE = /\b0x[a-fA-F0-9]{40}\b/g;
const ADDRESS_SINGLE_RE = /\b0x[a-fA-F0-9]{40}\b/;
const TX_HASH_RE = /\b0x[a-fA-F0-9]{64}\b/g;

const EXPLORER_PATTERNS: Array<{
  type: ContractLink["type"];
  re: RegExp;
  label: (m: RegExpMatchArray) => string;
}> = [
  {
    type: "tenderly",
    re: /https?:\/\/(?:dashboard\.tenderly|tenderly\.co)\/[^\s)"']+/i,
    label: (m) => `Tenderly`,
  },
  {
    type: "etherscan",
    re: /https?:\/\/(?:[a-z]+\.)?etherscan\.io\/[^\s)"']+/i,
    label: (m) => `Etherscan`,
  },
  {
    type: "blockscout",
    re: /https?:\/\/(?:[a-z0-9-]+\.)?blockscout\.com\/[^\s)"']+/i,
    label: () => `Blockscout`,
  },
  {
    type: "sourcify",
    re: /https?:\/\/(?:[a-z0-9-]+\.)?sourcify\.dev\/[^\s)"']+/i,
    label: () => `Sourcify`,
  },
  {
    type: "explorer",
    re: /https?:\/\/(?:[a-z0-9-]+\.)?(?:polygonscan|snowtrace|arbiscan|optimistic\.etherscan|basescan|gnosisscan|ftmscan|bscscan|celoscan)\.io\/[^\s)"']+/i,
    label: () => `Explorer`,
  },
];

export type RawSourceType = "markdown" | "build-artifact" | "json" | "paste";

export interface ParseInput {
  content: string;
  source: RawSourceType;
  fileName?: string;
}

export interface ParseResult {
  imports: ParsedImport[];
  diagnostics: string[];
}

const isAddress = (s: string): s is Address => /^0x[a-fA-F0-9]{40}$/.test(s);

function cleanName(raw: string): string {
  let n = raw.trim().replace(/["'`]/g, "");
  n = n.replace(/\.(sol|json|md|txt)$/i, "");
  n = n.replace(/[^a-zA-Z0-9_\-]/g, "_");
  n = n.replace(/^_+|_+$/g, "");
  if (!n) n = "UnnamedContract";
  return n;
}

function inferCategory(name: string, abi: Abi): ContractCategory {
  const lower = name.toLowerCase();
  const signatures = abi
    .filter((f) => f.type === "function")
    .map((f) => f.name?.toLowerCase() ?? "")
    .join(" ");

  if (/token|coin|cash|dai|usdc|usdt|weth|wbtc/i.test(lower)) return "token";
  if (/nft|kitty|punk|ape|beast|loot/i.test(lower)) return "nft";
  if (/vault|staker|pool|gauge|strategy/i.test(lower)) return "vault";
  if (/router|swap|aggregator|exchange|dex/i.test(lower)) return "router";
  if (/governor|dao|vote|timelock|council/i.test(lower)) return "governance";
  if (/oracle|feed|price|chainlink/i.test(lower)) return "oracle";

  if (signatures.includes("balanceof") && signatures.includes("decimals"))
    return "token";
  if (signatures.includes("tokenuri") || signatures.includes("ownerof"))
    return "nft";
  if (signatures.includes("deposit") && signatures.includes("withdraw"))
    return "vault";
  if (signatures.includes("swap") || signatures.includes("exractcallamount"))
    return "router";

  return "custom";
}

function extractLinks(text: string): ContractLink[] {
  const links: ContractLink[] = [];
  const seen = new Set<string>();
  for (const p of EXPLORER_PATTERNS) {
    const matches = text.match(new RegExp(p.re.source, "g"));
    if (!matches) continue;
    for (const url of matches) {
      if (seen.has(url)) continue;
      seen.add(url);
      links.push({ type: p.type, url, label: p.label([url]) });
    }
  }
  return links;
}

function extractAddresses(text: string): Address[] {
  const found = text.match(ADDRESS_RE) ?? [];
  const unique: Address[] = [];
  const seen = new Set<string>();
  for (const a of found) {
    const lower = a.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    unique.push(a as Address);
  }
  return unique;
}

function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function looksLikeAbiArray(text: string): boolean {
  if (!text.includes("[")) return false;
  if (!text.includes('"type"') && !text.includes("'type'")) return false;
  return /\[\s*\{\s*"type"/.test(text) || /type"\s*:\s*"function"/.test(text);
}

function tryParseJson(candidate: string): unknown | null {
  const trimmed = candidate.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      const fixed = trimmed
        .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/'/g, '"')
        .replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

function extractFencedCodeBlocks(text: string): string[] {
  const blocks: string[] = [];
  const fenceRe = /```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(text)) !== null) {
    blocks.push(m[2]);
  }
  return blocks;
}

function findAbiJsonInText(text: string): string[] {
  const results: string[] = [];
  const cleaned = stripComments(text);

  const blocks = extractFencedCodeBlocks(cleaned);
  for (const b of blocks) {
    if (looksLikeAbiArray(b)) results.push(b);
  }

  const startRe = /\[\s*\{\s*"type"\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = startRe.exec(cleaned)) !== null) {
    const start = m.index;
    const found = scanBalancedArray(cleaned, start);
    if (found) {
      results.push(found);
      startRe.lastIndex = start + found.length;
    } else {
      startRe.lastIndex = start + 1;
    }
  }
  return results;
}

function scanBalancedArray(text: string, start: number): string | null {
  if (text[start] !== "[") return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\") {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function coerceToAbi(parsed: unknown): Abi | null {
  if (!Array.isArray(parsed)) return null;
  const out: Abi = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const frag = item as Record<string, unknown>;
    if (typeof frag.type !== "string") continue;
    const f: AbiFragment = { type: frag.type as string };
    if (typeof frag.name === "string") f.name = frag.name;
    if (typeof frag.stateMutability === "string")
      f.stateMutability = frag.stateMutability;
    if (Array.isArray(frag.inputs)) f.inputs = normalizeParams(frag.inputs);
    if (Array.isArray(frag.outputs)) f.outputs = normalizeParams(frag.outputs);
    if (typeof frag.anonymous === "boolean") f.anonymous = frag.anonymous;
    out.push(f);
  }
  if (out.length === 0) return null;
  return out;
}

function normalizeParams(raw: unknown[]): AbiFragment["inputs"] {
  return raw.map((p) => {
    const param = p as Record<string, unknown>;
    const out: NonNullable<AbiFragment["inputs"]>[number] = { type: String(param.type ?? "unknown") };
    if (typeof param.name === "string") out.name = param.name;
    if (typeof param.internalType === "string")
      out.internalType = param.internalType;
    if (typeof param.indexed === "boolean") out.indexed = param.indexed;
    if (Array.isArray(param.components))
      out.components = normalizeParams(param.components);
    return out;
  });
}

function mergeAbis(abis: Abi[]): Abi {
  const seen = new Set<string>();
  const merged: Abi = [];
  for (const abi of abis) {
    for (const frag of abi) {
      const key = signatureOf(frag);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(frag);
    }
  }
  return merged;
}

export function signatureOf(frag: AbiFragment): string {
  const types = (frag.inputs ?? [])
    .map((i) => i.type)
    .join(",");
  return `${frag.name ?? ""}(${types})`;
}

function dedupeAbi(abi: Abi): Abi {
  const seen = new Set<string>();
  const out: Abi = [];
  for (const frag of abi) {
    const key =
      frag.type === "function" || frag.type === "event" || frag.type === "error"
        ? `${frag.type}:${signatureOf(frag)}`
        : `${frag.type}:${frag.name ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(frag);
  }
  return out;
}

function guessNameFromContext(
  text: string,
  addresses: Address[],
  fileName?: string
): string {
  if (fileName) {
    const base = fileName.split(/[\/\\]/).pop() ?? fileName;
    const noExt = base.replace(/\.[^.]+$/, "");
    if (noExt && !/^abi$/i.test(noExt)) return cleanName(noExt);
  }
  const heading = text.match(/^#{1,6}\s+(.+)$/m);
  if (heading) return cleanName(heading[1]);
  const nameLine = text.match(/(?:contract|Contract)\s+name\s*[:=]\s*["'`]?(.+?)["'`]?$/im);
  if (nameLine) return cleanName(nameLine[1]);
  const titleLine = text.match(/<title>(.+?)<\/title>/i);
  if (titleLine) return cleanName(titleLine[1]);
  if (addresses[0]) return `Contract_${addresses[0].slice(2, 8)}`;
  return "UnnamedContract";
}

export function parseInput(input: ParseInput): ParseResult {
  const { content, source, fileName } = input;
  const diagnostics: string[] = [];
  const imports: ParsedImport[] = [];

  if (!content || !content.trim()) {
    return { imports, diagnostics: ["Empty input."] };
  }

  const abiCandidatesRaw = findAbiJsonInText(content);
  diagnostics.push(`Found ${abiCandidatesRaw.length} ABI candidate(s).`);

  const abis: Abi[] = [];
  for (const candidate of abiCandidatesRaw) {
    const parsed = tryParseJson(candidate);
    if (parsed === null) {
      diagnostics.push("Skipped an ABI candidate that failed JSON parsing.");
      continue;
    }
    const abi = coerceToAbi(parsed);
    if (abi === null) {
      diagnostics.push("Skipped a candidate that did not resolve to an ABI array.");
      continue;
    }
    abis.push(abi);
  }

  if (abis.length === 0 && source !== "build-artifact") {
    const direct = tryParseJson(content);
    if (direct !== null) {
      const abi = coerceToAbi(direct);
      if (abi) {
        abis.push(abi);
        diagnostics.push("Parsed top-level JSON as a single ABI.");
      }
    }
  }

  const links = extractLinks(content);
  const addresses = extractAddresses(content);

  if (abis.length === 0) {
    if (addresses.length > 0 || links.length > 0) {
      diagnostics.push(
        "No ABI arrays found; created stub entries from discovered addresses/links."
      );
      const firstAddr = addresses[0];
      imports.push({
        id: uid("imp"),
        name: guessNameFromContext(content, addresses, fileName),
        address: firstAddr,
        abi: [],
        category: "custom",
        source,
        links,
        rawSnippet: content.slice(0, 2000),
      });
      for (let i = 1; i < addresses.length; i++) {
        imports.push({
          id: uid("imp"),
          name: `Address_${addresses[i].slice(2, 8)}`,
          address: addresses[i],
          abi: [],
          category: "custom",
          source,
          links: [],
        });
      }
    } else {
      diagnostics.push("No ABI, address, or links detected in input.");
    }
    return { imports, diagnostics };
  }

  const primaryName = guessNameFromContext(content, addresses, fileName);
  const primaryAddress = addresses[0];
  const merged = dedupeAbi(mergeAbis(abis));
  const category = inferCategory(primaryName, merged);

  imports.push({
    id: uid("imp"),
    name: primaryName,
    address: primaryAddress,
    abi: merged,
    category,
    source,
    links,
    description: extractDescription(content),
    rawSnippet: content.slice(0, 2000),
  });

  if (addresses.length > 1) {
    for (let i = 1; i < addresses.length; i++) {
      imports.push({
        id: uid("imp"),
        name: `Address_${addresses[i].slice(2, 8)}`,
        address: addresses[i],
        abi: [],
        category: "custom",
        source,
        links: [],
      });
    }
  }

  diagnostics.push(
    `Resolved ${imports.length} contract(s); merged ABI has ${merged.length} fragments.`
  );
  return { imports, diagnostics };
}

function extractDescription(text: string): string | undefined {
  const lines = text.split(/\r?\n/);
  const descLines: string[] = [];
  for (const line of lines) {
    if (descLines.length >= 3) break;
    const t = line.trim();
    if (!t) continue;
    if (/^#{1,6}\s/.test(t)) continue;
    if (/^```/.test(t)) continue;
    if (ADDRESS_SINGLE_RE.test(t) && t.length < 60) continue;
    if (t.startsWith("0x") && t.length === 42) continue;
    descLines.push(t.replace(/[*_`>#]/g, "").slice(0, 120));
  }
  if (descLines.length === 0) return undefined;
  return descLines.join(" ");
}

export interface BulkParseResult {
  imports: ParsedImport[];
  diagnostics: string[];
}

export function parseBulk(inputs: ParseInput[]): BulkParseResult {
  const allImports: ParsedImport[] = [];
  const diagnostics: string[] = [];
  for (const input of inputs) {
    const res = parseInput(input);
    allImports.push(...res.imports);
    diagnostics.push(
      `[${input.fileName ?? input.source}] ${res.diagnostics.join(" ")}`
    );
  }
  return { imports: allImports, diagnostics };
}

export function isValidAbi(value: unknown): value is Abi {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      item && typeof item === "object" && typeof (item as { type?: unknown }).type === "string"
  );
}

export { isAddress };
