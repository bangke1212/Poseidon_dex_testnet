"use client";

import Link from "next/link";
import { useMemo, useCallback, useState } from "react";
import { useWallet, CHAINS } from "@/src/providers/WalletProviders";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

const navLinks = [
  { href: "/swap", label: "Swap" },
  { href: "/pools", label: "Pools" },
  { href: "/faucet", label: "Faucet" },
];

const CHAIN_KEYS = ["sepolia", "arbitrumSepolia", "bscTestnet"];

export function TopNav({ active }: { active?: string }) {
  const { address, connected, connecting, connect, disconnect, chainKey, switchChain } = useWallet();
  const [chainOpen, setChainOpen] = useState(false);

  const label = useMemo(() => {
    if (connecting) return "Connecting...";
    if (connected && address) return `${address.slice(0, 6)}...${address.slice(-4)}`;
    return "Connect Wallet";
  }, [connected, connecting, address]);

  const handleClick = useCallback(() => {
    if (connected) disconnect();
    else connect();
  }, [connected, connect, disconnect]);

  const handleSwitchChain = async (key: string) => {
    setChainOpen(false);
    await switchChain(key);
  };

  const chainName = CHAINS[chainKey]?.name || "Unknown";

  return (
    <header className="flex items-center justify-between border-b border-white/10 px-4 sm:px-6 py-3 lg:px-8">
      <div className="flex items-center gap-2 sm:gap-3 text-white">
        <div className="size-7 sm:size-8 text-primary">
          <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fill="currentColor" fillRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-base sm:text-lg font-bold tracking-tight truncate max-w-[120px] sm:max-w-none">Poseidon DEX</h2>
      </div>

      <nav className="hidden sm:flex flex-1 justify-center gap-4 lg:gap-6 text-sm font-medium">
        {navLinks.map((link) => {
          const isActive = active === link.href;
          return (
            <Link key={link.href} href={link.href}
              className={`relative transition-colors ${isActive ? "text-white" : "text-white/70 hover:text-white"}`}>
              {link.label}
              {isActive && <span className="absolute -bottom-[13px] left-0 h-0.5 w-full bg-primary" />}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        {/* Chain Selector */}
        <div className="relative">
          <button onClick={() => setChainOpen(!chainOpen)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-xs text-white/80 hover:bg-white/10 transition-colors">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="hidden sm:inline">{chainName}</span>
            <ChevronDownIcon className="w-3.5 h-3.5" />
          </button>
          {chainOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setChainOpen(false)} />
              <div className="absolute top-full right-0 z-20 mt-2 w-56 rounded-lg border border-white/10 bg-[#1a1f2e] shadow-xl overflow-hidden">
                {CHAIN_KEYS.map((key) => (
                  <button key={key} onClick={() => handleSwitchChain(key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/10 transition-colors text-left ${chainKey === key ? "text-primary" : "text-white/80"}`}>
                    <div className={`w-2 h-2 rounded-full ${chainKey === key ? "bg-primary" : "bg-white/30"}`} />
                    <div>
                      <div className="font-medium">{CHAINS[key]?.name}</div>
                      <div className="text-xs text-white/40">{key}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Wallet Button */}
        <button onClick={handleClick}
          className="flex items-center justify-center h-9 px-3 sm:px-4 rounded-lg bg-primary text-white text-xs sm:text-sm font-bold tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-60"
          disabled={connecting}>
          {label}
        </button>
      </div>

      {/* Mobile Nav */}
      <div className="flex sm:hidden fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#101422] z-50 px-2 py-1">
        {navLinks.map((link) => {
          const isActive = active === link.href;
          return (
            <Link key={link.href} href={link.href}
              className={`flex-1 text-center py-2 text-xs font-medium ${isActive ? "text-primary" : "text-white/60"}`}>
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
