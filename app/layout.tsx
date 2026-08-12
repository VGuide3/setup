import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AnimatedBackground } from "@/components/layout/AnimatedBackground";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Smart Contract Registry — Enterprise ABI Suite",
  description:
    "An enterprise-grade smart contract registry and interaction dashboard. Import ABIs, parse markdown & build artifacts, map dependencies, and simulate transactions on Ethereum Mainnet.",
  applicationName: "Smart Contract Registry",
  authors: [{ name: "OpenHands" }],
  keywords: [
    "smart contract",
    "ABI",
    "registry",
    "Ethereum",
    "wagmi",
    "viem",
    "React Flow",
    "simulation",
  ],
};

export const viewport: Viewport = {
  themeColor: "#07070F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans">
        <Providers>
          <AnimatedBackground />
          {children}
        </Providers>
      </body>
    </html>
  );
}
