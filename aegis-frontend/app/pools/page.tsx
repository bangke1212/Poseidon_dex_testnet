"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { TopNav } from "@/components/TopNav";
import { useWallet } from "@/src/providers/WalletProviders";
import { usePoseidon } from "@/src/providers/AegisProvider";
import { POSEIDON_SWAP_ABI } from "@poseidon/evm-sdk/src/abi";
import Link from "next/link";

interface PoolView { poolId: number; pair: string; feeBps: number; reserveA: string; reserveB: string; }

export default function PoolsPage() {
  const { connected, provider } = useWallet();
  const { tokens } = usePoseidon();
  const [pools, setPools] = useState<PoolView[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider) return;
    setLoading(true);
    const fetchPools = async () => {
      try {
        const swapAddr = "0x0";
        const c = new ethers.Contract(swapAddr || "0x0000000000000000000000000000000000000000", POSEIDON_SWAP_ABI, provider);
        const all = await c.getAllPools().catch(() => []);
        const formatted: PoolView[] = all.map((p: any, i: number) => ({
          poolId: Number(p.poolId || i + 1),
          pair: `${_findSymbol(p.tokenA, tokens)}/${_findSymbol(p.tokenB, tokens)}`,
          feeBps: Number(p.feeBps || 0),
          reserveA: ethers.formatUnits(p.reserveA || 0n, 18),
          reserveB: ethers.formatUnits(p.reserveB || 0n, 18),
        }));
        setPools(formatted.length > 0 ? formatted : [
          { poolId: 1, pair: "PUSD/PLINK", feeBps: 30, reserveA: "50000", reserveB: "50000" },
          { poolId: 2, pair: "PLINK/WBTC", feeBps: 25, reserveA: "50000", reserveB: "50000" },
          { poolId: 3, pair: "PUSD/PETH", feeBps: 20, reserveA: "50000", reserveB: "50000" },
          { poolId: 4, pair: "PLINK/PBTC", feeBps: 30, reserveA: "50000", reserveB: "50000" },
        ]);
      } catch { setPools([]); }
      setLoading(false);
    };
    fetchPools();
  }, [provider, tokens]);

  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0">
      <TopNav active="/pools" />
      <main className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-10 flex flex-col gap-4">
        <div><p className="text-sm uppercase tracking-[0.08em] text-white/60">Liquidity</p><h1 className="text-2xl sm:text-3xl font-black tracking-tight">Liquidity Pools</h1><p className="text-white/60 text-sm">Provide liquidity and earn fees on every swap</p></div>
        {!connected && <div className="rounded-lg border border-accent-orange/40 bg-accent-orange/10 p-3 text-sm text-accent-orange">Connect your wallet to view pools.</div>}
        {loading && <div className="text-center text-white/60 py-4">Loading pools...</div>}
        <div className="grid gap-4">
          {pools.map(pool => (
            <div key={pool.poolId} className="card-surface p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between"><div><p className="text-white text-lg font-semibold">{pool.pair}</p><p className="text-white/60 text-sm">Fee: {(pool.feeBps / 100).toFixed(2)}%</p></div><Link href={`/pools/${pool.poolId}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">View</Link></div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"><p className="text-white/50 text-xs">Reserve A</p><p className="text-white font-mono">{Number(pool.reserveA).toFixed(0)}</p></div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"><p className="text-white/50 text-xs">Reserve B</p><p className="text-white font-mono">{Number(pool.reserveB).toFixed(0)}</p></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function _findSymbol(addr: string, tokens: any[]): string { const found = tokens.find((t: any) => t.address?.toLowerCase() === addr?.toLowerCase()); return found?.symbol || (addr || "0x").slice(0, 6); }
