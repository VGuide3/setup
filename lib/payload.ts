import {
  encodeFunctionData,
  toFunctionSelector,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import type { AbiFragment } from "@/types";
import { buildAbiFromFragments } from "@/lib/abi";

export interface TransactionPayload {
  to: Address;
  data: Hex;
  value: string;
  from?: Address;
  chainId: number;
  functionName: string;
  selector: Hex;
  args: readonly unknown[];
  abi: Abi;
  generatedAt: number;
}

export interface BuildPayloadOptions {
  abi: AbiFragment[];
  address: Address;
  functionName: string;
  args: unknown[];
  value?: string;
  from?: Address;
  chainId?: number;
}

/**
 * Build a fully-encoded transaction payload from an imported ABI + args.
 * Calldata is computed with viem's encodeFunctionData so the selector and
 * head/tail encoding are always correct.
 */
export function buildTransactionPayload(
  opts: BuildPayloadOptions
): { ok: true; payload: TransactionPayload } | { ok: false; error: string } {
  const abi = buildAbiFromFragments(opts.abi);
  const fn = opts.abi.find(
    (f) => f.type === "function" && f.name === opts.functionName
  );
  if (!fn) {
    return { ok: false, error: `Function "${opts.functionName}" not found in ABI` };
  }

  let selector: Hex;
  try {
    selector = toFunctionSelector({
      type: "function",
      name: fn.name!,
      inputs: fn.inputs ?? [],
      outputs: fn.outputs ?? [],
      stateMutability: fn.stateMutability ?? "nonpayable",
    } as never);
  } catch (e) {
    return { ok: false, error: `Selector derivation failed: ${String(e)}` };
  }

  let data: Hex;
  try {
    data = encodeFunctionData({
      abi,
      functionName: opts.functionName,
      args: opts.args,
    } as never);
  } catch (e) {
    return {
      ok: false,
      error: `Calldata encoding failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const payload: TransactionPayload = {
    to: opts.address,
    data,
    value: opts.value && opts.value !== "0" ? opts.value : "0",
    from: opts.from,
    chainId: opts.chainId ?? 1,
    functionName: opts.functionName,
    selector,
    args: opts.args,
    abi,
    generatedAt: Date.now(),
  };
  return { ok: true, payload };
}

/**
 * Generate a standalone, self-contained dist.js string.
 *
 * The script is an IIFE that runs at load time:
 *   1. reconstructs the transaction payload (verifies calldata),
 *   2. exposes it on globalThis/window as `payload`,
 *   3. dispatches a "payload:ready" event,
 *   4. optionally auto-submits via window.ethereum when autoSubmit === true.
 *
 * No runtime dependencies — the mini-encoder is embedded for verification.
 */
export function generateDistJs(
  payload: TransactionPayload,
  opts: { autoSubmit?: boolean; label?: string } = {}
): string {
  const label = opts.label ?? payload.functionName;
  const autoSubmit = opts.autoSubmit ?? false;

  // Pre-encoded values embedded as literals (guaranteed correct).
  const abiJson = JSON.stringify(payload.abi, null, 2);
  const argsJson = JSON.stringify(payload.args);
  const inputsDef = JSON.stringify(
    (payload.abi as Array<{ type: string; name?: string; inputs?: unknown[] }>).find(
      (f) => f.type === "function" && f.name === payload.functionName
    )?.inputs ?? []
  );

  return `/**
 * ${label} — transaction payload (auto-generated)
 * Contract: ${payload.to}
 * Function: ${payload.functionName}()
 * Selector: ${payload.selector}
 * Chain ID: ${payload.chainId}
 * Generated: ${new Date(payload.generatedAt).toISOString()}
 *
 * Runs at load time. The payload is reconstructed and exposed on
 * globalThis/window as "payload". A "payload:ready" CustomEvent is
 * dispatched on globalThis. Set ?autosubmit=1 in the URL (or pass the
 * option) to auto-submit via window.ethereum when a wallet is present.
 */
(function () {
  "use strict";

  var TO = ${JSON.stringify(payload.to)};
  var VALUE = ${JSON.stringify(payload.value)};
  var CHAIN_ID = ${payload.chainId};
  var FUNCTION_NAME = ${JSON.stringify(payload.functionName)};
  var SELECTOR = ${JSON.stringify(payload.selector)};
  var PRECOMPUTED_DATA = ${JSON.stringify(payload.data)};
  var ARGS = ${argsJson};
  var INPUTS = ${inputsDef};
  var ABI = ${abiJson};
  var AUTO_SUBMIT = ${autoSubmit ? "true" : "false"} ||
    (typeof location !== "undefined" &&
      /[?&]autosubmit=1/.test(location.search));

  /* ---- minimal ABI arg encoder for verification (no deps) ---- */
  function hexPad(n) {
    var h = BigInt(n).toString(16);
    return "0".repeat(Math.max(0, 64 - h.length)) + h;
  }
  function toUint256(v) {
    if (typeof v === "string" && /^0x/i.test(v)) return hexPad(BigInt(v));
    return hexPad(BigInt(v));
  }
  function toInt256(v) {
    var n = BigInt(v);
    if (n < 0n) {
      var bits = (-n).toString(2);
      var pad = "1".repeat(256 - bits.length) + bits.replace(/1/g, "x").replace(/0/g, "1").replace(/x/g, "0");
      return BigInt("0b" + pad).toString(16).padStart(64, "0");
    }
    return toUint256(n);
  }
  function toAddress(v) {
    var s = String(v).toLowerCase().replace(/^0x/, "");
    return "0".repeat(64 - s.length) + s;
  }
  function toBool(v) {
    return v ? toUint256(1) : toUint256(0);
  }
  function encodeBytes(v) {
    var s = String(v).replace(/^0x/, "");
    var len = toUint256(s.length / 2);
    var padded = s + "0".repeat((32 - (s.length / 2) % 32) % 32 * 2);
    return len + padded;
  }
  function encodeString(v) {
    var bytes = Array.from(unescape(encodeURIComponent(String(v))));
    var hex = bytes.map(function (b) { return ("0" + b.charCodeAt(0).toString(16)).slice(-2); }).join("");
    var len = toUint256(hex.length / 2);
    var padded = hex + "0".repeat((32 - (hex.length / 2) % 32) % 32 * 2);
    return len + padded;
  }
  function encodeValue(type, value) {
    var t = type.replace(/\\[\\d*\\]$/, "");
    var isArray = /\\[/.test(type);
    if (isArray) {
      var arr = Array.isArray(value) ? value : [];
      var innerType = type.replace(/\\[\\d*\\]$/, "");
      var head = "", tail = "";
      var tailLen = 0;
      for (var i = 0; i < arr.length; i++) {
        var enc = encodeValue(innerType, arr[i]);
        if (/\\[/.test(innerType) || innerType === "string" || innerType === "bytes") {
          head += "____PLACE_" + i + "____";
          tail += enc;
        } else {
          head += enc;
        }
        tailLen += enc.length / 2;
      }
      var header = toUint256(arr.length) + head;
      var tailOffset = (header.length / 2);
      for (var j = 0; j < arr.length; j++) {
        header = header.replace("____PLACE_" + j + "____", toUint256(tailOffset));
        tailOffset += tail.length === 0 ? 0 : 0;
      }
      return header + tail;
    }
    if (t === "address") return toAddress(value);
    if (t === "bool") return toBool(value);
    if (t === "string") return encodeString(value);
    if (t === "bytes" || /^bytes\\d+$/.test(t)) return encodeBytes(value);
    if (/^uint/.test(t)) return toUint256(value || 0);
    if (/^int/.test(t)) return toInt256(value || 0);
    return toUint256(0);
  }
  function encodeArgs(inputs, args) {
    var head = "", tail = "";
    var headSlots = [];
    for (var i = 0; i < inputs.length; i++) {
      var type = inputs[i].type;
      var isDynamic = /\\[/.test(type) || type === "string" || type === "bytes";
      if (isDynamic) {
        headSlots.push({ offset: true, i: i });
        head += "____HEAD_" + i + "____";
      } else {
        var enc = encodeValue(type, args[i]);
        head += enc;
        headSlots.push({ offset: false, enc: enc });
      }
    }
    // compute tail
    var tailStr = "";
    var tailParts = [];
    for (var k = 0; k < inputs.length; k++) {
      var type2 = inputs[k].type;
      if (/\\[/.test(type2) || type2 === "string" || type2 === "bytes") {
        var enc2 = encodeValue(type2, args[k]);
        tailParts.push(enc2);
      } else {
        tailParts.push("");
      }
    }
    tailStr = tailParts.join("");
    var headWords = inputs.length;
    var offset = headWords * 32;
    for (var m = 0; m < inputs.length; m++) {
      if (tailParts[m] !== "") {
        head = head.replace("____HEAD_" + m + "____", toUint256(offset));
        offset += tailParts[m].length / 2;
      }
    }
    return head + tailStr;
  }
  function reconstructData() {
    try {
      if (!INPUTS || INPUTS.length === 0) return SELECTOR;
      return SELECTOR + encodeArgs(INPUTS, ARGS);
    } catch (e) {
      return SELECTOR;
    }
  }

  /* ---- payload assembly ---- */
  var reconstructedData = reconstructData();
  var verified = reconstructedData === PRECOMPUTED_DATA;

  var payload = {
    to: TO,
    data: PRECOMPUTED_DATA,
    value: VALUE,
    chainId: CHAIN_ID,
    functionName: FUNCTION_NAME,
    selector: SELECTOR,
    args: ARGS,
    abi: ABI,
    verified: verified,
    reconstructedData: reconstructedData,
    generatedAt: ${payload.generatedAt}
  };

  var g = (typeof globalThis !== "undefined") ? globalThis : (typeof self !== "undefined") ? self : this;
  g.payload = payload;
  if (typeof window !== "undefined") window.payload = payload;

  var consoleLog = (typeof console !== "undefined" && console.log) ? console.log.bind(console) : function () {};
  consoleLog("[payload] " + FUNCTION_NAME + " ready — to: " + TO + " data: " + PRECOMPUTED_DATA + " (verified: " + verified + ")");

  try {
    g.dispatchEvent(new CustomEvent("payload:ready", { detail: payload }));
  } catch (e) {}

  /* ---- optional auto-submit via injected wallet ---- */
  if (AUTO_SUBMIT && typeof window !== "undefined" && window.ethereum) {
    var submit = function () {
      try {
        window.ethereum.request({
          method: "eth_sendTransaction",
          params: [{
            from: window.ethereum.selectedAddress,
            to: TO,
            data: PRECOMPUTED_DATA,
            value: VALUE && VALUE !== "0" ? "0x" + BigInt(VALUE).toString(16) : "0x0"
          }]
        }).then(function (hash) {
          consoleLog("[payload] submitted tx: " + hash);
        }).catch(function (err) {
          console.error("[payload] submit failed:", err);
        });
      } catch (err) {
        console.error("[payload] submit error:", err);
      }
    };
    if (window.ethereum.selectedAddress) {
      submit();
    } else {
      window.ethereum.request({ method: "eth_requestAccounts" }).then(submit).catch(function () {
        consoleLog("[payload] wallet connect rejected; payload still available on window.payload");
      });
    }
  }

  return payload;
})();
`;
}
