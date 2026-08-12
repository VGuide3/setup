"use client";

import Link from "next/link";
import { Github, Boxes } from "lucide-react";
import { WalletConnect } from "@/components/wallet/WalletConnect";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/60 backdrop-blur-2xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.8)]">
            <Boxes className="h-5 w-5 text-primary-foreground" />
            <div className="absolute inset-0 rounded-xl grad-border opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold tracking-tight text-gradient">
              Contract Registry
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Enterprise ABI Suite
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://docs.openhands.dev"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            aria-label="Docs"
          >
            <Github className="h-4 w-4" />
          </a>
          <WalletConnect />
        </div>
      </div>
    </header>
  );
}
