"use client";

import * as React from "react";
import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { mainnet } from "wagmi/chains";
import { Wallet, LogOut, ChevronDown, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn, shortenAddress, copyToClipboard } from "@/lib/utils";

export function WalletConnect() {
  const { address, isConnected, isReconnecting } = useAccount();
  const { connectors, connectAsync, isPending, error } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const chainId = useChainId();
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const onChain = chainId === mainnet.id;

  const handleConnect = async (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId);
    if (!connector) return;
    try {
      await connectAsync({ connector });
      setOpen(false);
    } catch {
      /* user rejected */
    }
  };

  const handleCopy = async () => {
    if (!address) return;
    const ok = await copyToClipboard(address);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  if (isReconnecting) {
    return (
      <Button variant="glass" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        Reconnecting
      </Button>
    );
  }

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="glass" size="sm" className="gap-2">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                onChain ? "bg-emerald-400" : "bg-amber-400"
              )}
            />
            <span className="font-mono">{shortenAddress(address)}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Connected</span>
              <span className="font-mono text-xs break-all">{address}</span>
              <Badge
                variant={onChain ? "success" : "warn"}
                className="w-fit mt-1"
              >
                {onChain ? "Ethereum Mainnet" : `Chain ${chainId}`}
              </Badge>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopy} className="gap-2 cursor-pointer">
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Copied!" : "Copy address"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => disconnectAsync()}
            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <Button
        variant="gradient"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect a wallet</DialogTitle>
            <DialogDescription>
              Connect to interact with contracts on Ethereum Mainnet. Read
              functions work without a wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {connectors.length === 0 && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-300">
                No injected wallet detected. Install MetaMask, Rabby, or
                another EVM wallet to continue.
              </div>
            )}
            {connectors.map((c) => (
              <button
                key={c.uid}
                onClick={() => handleConnect(c.id)}
                disabled={isPending}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3 text-left transition-all hover:border-primary/40 hover:bg-white/[0.08] disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.type} connector
                    </div>
                  </div>
                </div>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                )}
              </button>
            ))}
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {error.message}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
