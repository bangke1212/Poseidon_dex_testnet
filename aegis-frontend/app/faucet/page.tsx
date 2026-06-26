"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { TopNav } from "@/components/TopNav";
import { useWallet } from "@/src/providers/WalletProviders";
import { usePoseidon } from "@/src/providers/AegisProvider";
import { POSEIDON_TOKEN_ABI } from "@poseidon/evm-sdk/src/abi";

export default function FaucetPage() {
  const { address, connected, signer, provider, chainKey } = useWallet();
  const { tokens } = usePoseidon();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTokens, setSelectedTokens] = useState<Set<string>>(new Set());
  const [balances, setBalances] = useState<Record<string, string>>({});

  const availableTokens = tokens.length > 0 ? tokens : [
    { symbol: "PUSD", name: "Poseidon USD", address: "0x0", decimals: 18, chainId: 11155111 },
    { symbol: "PBTC", name: "Poseidon BTC", address: "0x0", decimals: 18, chainId: 11155111 },
    { symbol: "PLINK", name: "Poseidon LINK", address: "0x0", decimals: 18, chainId: 11155111 },
    { symbol: "WBTC", name: "Wrapped BTC", address: "0x0", decimals: 18, chainId: 11155111 },
  ];

  useEffect(() => {
    if (!provider || !address) return;
    availableTokens.forEach(async (t) => {
      try { const c = new ethers.Contract(t.address, POSEIDON_TOKEN_ABI, provider); const bal = await c.balanceOf(address); setBalances(prev => ({ ...prev, [t.symbol]: ethers.formatUnits(bal, t.decimals) })); } catch {}
    });
  }, [provider, address, chainKey]);

  const toggleToken = (sym: string) => { const next = new Set(selectedTokens); next.has(sym) ? next.delete(sym) : next.add(sym); setSelectedTokens(next); };

  const claimAll = async () => {
    if (!signer) return;
    setLoading(true); setError(null); setStatus("Claiming tokens...");
    try {
      for (const sym of selectedTokens) {
        const t = availableTokens.find(tk => tk.symbol === sym); if (!t) continue;
        const c = new ethers.Contract(t.address, POSEIDON_TOKEN_ABI, signer);
        const tx = await c.faucet(address); await tx.wait();
      }
      setStatus(`Success! Claimed ${selectedTokens.size} tokens on ${chainKey}`);
    } catch (e: any) { setError(e.reason || e.message || "Claim failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0">
      <TopNav active="/faucet" />
      <main className="w-full max-w-lg mx-auto px-4 py-6 sm:py-10 flex flex-col gap-4">
        <div><p className="text-sm uppercase tracking-[0.08em] text-white/60">Testnet</p><h1 className="text-2xl sm:text-3xl font-black tracking-tight">Token Faucet</h1><p className="text-white/60 text-sm">Get free test tokens — {chainKey}</p></div>
        {!connected && <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-400">Connect your wallet to claim tokens.</div>}
        <div className="card-surface p-4 sm:p-6">
          <h3 className="text-lg font-bold text-white mb-3">Select Tokens</h3>
          <div className="grid gap-2">
            {availableTokens.map(t => (
              <button key={t.symbol} onClick={() => toggleToken(t.symbol)} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${selectedTokens.has(t.symbol) ? "bg-primary/20 border-primary" : "bg-white/5 border-white/10 hover:border-white/20"}`}>
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{t.symbol.slice(0,2)}</div><div className="text-left"><p className="font-semibold text-white">{t.symbol}</p><p className="text-xs text-white/60">{t.name}</p></div></div>
                <div className="text-right"><p className="text-xs text-white/60">{balances[t.symbol] ? Number(balances[t.symbol]).toFixed(2) : "0"}</p><div className={`w-4 h-4 mt-1 rounded-full border-2 ${selectedTokens.has(t.symbol) ? "border-primary bg-primary" : "border-white/30"}`}>{selectedTokens.has(t.symbol) && <svg className="text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}</div></div>
              </button>
            ))}
          </div>
        </div>
        <button onClick={claimAll} disabled={!connected || loading || selectedTokens.size === 0} className="h-12 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50">{loading ? "Claiming..." : `Claim ${selectedTokens.size} Token${selectedTokens.size !== 1 ? "s" : ""}`}</button>
        {status && <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-400">{status}</div>}
        {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70"><p className="font-semibold text-white mb-1">About the Faucet</p><ul className="list-disc ml-5 space-y-0.5"><li>Get 1,000 tokens of each selected type</li><li>Use these tokens to test swaps and liquidity</li><li>Tokens are on the currently selected chain</li><li>Make sure you have native tokens (ETH/tBNB) for gas</li></ul></div>
      </main>
    </div>
  );
}
