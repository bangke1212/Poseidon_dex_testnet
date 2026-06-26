"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { TopNav } from "@/components/TopNav";
import { useWallet } from "@/src/providers/WalletProviders";
import { usePoseidon } from "@/src/providers/AegisProvider";
import { POSEIDON_TOKEN_ABI, POSEIDON_SWAP_ABI } from "@poseidon/evm-sdk/src/abi";
import { TokenInfo } from "@poseidon/evm-sdk";

export default function SwapPage() {
  const { address, connected, provider, signer, chainKey } = useWallet();
  const { client, tokens: defaultTokens } = usePoseidon();

  const [fromToken, setFromToken] = useState<TokenInfo | null>(null);
  const [toToken, setToToken] = useState<TokenInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<{ amountOut: string; fee: string; priceImpactBps: number; poolId: number; minAmountOut: string } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [fromBalance, setFromBalance] = useState("0");

  const tokens = defaultTokens.length > 0 ? defaultTokens : [
    { symbol: "PUSD", name: "Poseidon USD", address: "0x0", decimals: 18, chainId: 11155111 },
    { symbol: "PBTC", name: "Poseidon BTC", address: "0x0", decimals: 18, chainId: 11155111 },
    { symbol: "PLINK", name: "Poseidon LINK", address: "0x0", decimals: 18, chainId: 11155111 },
    { symbol: "WBTC", name: "Wrapped BTC", address: "0x0", decimals: 18, chainId: 11155111 },
  ];

  // Calculate quote
  useEffect(() => {
    if (!fromToken || !toToken || !amount || Number(amount) <= 0 || !provider) { setQuote(null); return; }
    setQuoteLoading(true);
    const calc = async () => {
      try {
        const swapAddr = process.env.NEXT_PUBLIC_SEPOLIA_SWAP_ADDRESS || "0x0";
        const c = new ethers.Contract(swapAddr || "0x0000000000000000000000000000000000000000", POSEIDON_SWAP_ABI, provider);
        const poolId = await c.getPoolId(fromToken.address, toToken.address).catch(() => 0n);
        if (poolId === 0n) { setQuote(null); setQuoteLoading(false); return; }
        const amountIn = ethers.parseUnits(amount, fromToken.decimals);
        const [amountOut, fee, priceImpactBps] = await c.getQuote(Number(poolId), fromToken.address, amountIn);
        const minOut = BigInt(amountOut.toString()) * BigInt(100 - slippage) / 100n;
        setQuote({ amountOut: ethers.formatUnits(amountOut, toToken.decimals), fee: ethers.formatUnits(fee, fromToken.decimals), priceImpactBps: Number(priceImpactBps), poolId: Number(poolId), minAmountOut: ethers.formatUnits(minOut, toToken.decimals) });
      } catch { setQuote(null); }
      setQuoteLoading(false);
    };
    calc();
  }, [fromToken, toToken, amount, slippage, provider, chainKey]);

  // From balance
  useEffect(() => {
    if (!fromToken || !provider || !address) { setFromBalance("0"); return; }
    const t = new ethers.Contract(fromToken.address, POSEIDON_TOKEN_ABI, provider);
    t.balanceOf(address).then((b: bigint) => setFromBalance(ethers.formatUnits(b, fromToken.decimals))).catch(() => setFromBalance("0"));
  }, [fromToken, provider, address, chainKey]);

  const handleSwap = async () => {
    if (!signer || !fromToken || !toToken || !quote || !client) return;
    setError(null); setLoading(true); setStatus("Preparing swap...");
    try {
      await client.connect();
      const amountIn = ethers.parseUnits(amount, fromToken.decimals);
      const minOut = ethers.parseUnits(quote.minAmountOut, toToken.decimals);
      const tokenC = new ethers.Contract(fromToken.address, POSEIDON_TOKEN_ABI, signer);
      const txHash = await client.swap(quote.poolId, fromToken.address, amountIn, minOut, tokenC);
      setStatus(`Swap successful! Tx: ${txHash.slice(0, 10)}...${txHash.slice(-6)}`);
      setAmount("");
    } catch (e: any) { setError(e.reason || e.message || "Swap failed"); }
    finally { setLoading(false); }
  };

  const handleTokenSwitch = () => { setFromToken(toToken); setToToken(fromToken); setAmount(""); };

  return (
    <div className="min-h-screen flex flex-col pb-16 sm:pb-0">
      <TopNav active="/swap" />
      <main className="w-full max-w-lg mx-auto px-4 py-6 sm:py-10 flex flex-col gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.08em] text-white/60">Multi-Chain Swap</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Swap Tokens</h1>
          <p className="text-white/60 text-sm">Sepolia • Arbitrum Sepolia • BSC Testnet</p>
        </div>
        {!connected && <div className="rounded-lg border border-accent-orange/40 bg-accent-orange/10 p-3 text-sm text-accent-orange">Connect your wallet to swap tokens.</div>}
        <div className="card-surface p-4 sm:p-6 flex flex-col gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-white/70">From</span>{fromToken && <span className="text-white/50">Balance: {Number(fromBalance).toFixed(4)}</span>}</div>
            <div className="flex gap-2">
              <input className="input flex-1" type="number" min="0" step="any" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" disabled={loading} />
              <TokenButton tokens={tokens} selected={fromToken} onSelect={setFromToken} exclude={toToken?.symbol} />
            </div>
          </div>
          <div className="flex justify-center">
            <button onClick={handleTokenSwitch} className="w-8 h-8 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center justify-center" disabled={loading}>
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>
            </button>
          </div>
          <div className="space-y-2">
            <span className="text-sm text-white/70">To</span>
            <div className="flex gap-2">
              <input className="input flex-1" type="text" value={quote ? Number(quote.amountOut).toFixed(6) : ""} readOnly placeholder="0.00" />
              <TokenButton tokens={tokens} selected={toToken} onSelect={setToToken} exclude={fromToken?.symbol} />
            </div>
          </div>
          {quoteLoading && amount && <div className="text-center text-white/60 text-sm py-2">Calculating quote...</div>}
          {quote && !quoteLoading && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-white/60">Rate</span><span className="text-white font-mono">1 {fromToken?.symbol} ≈ {(Number(quote.amountOut) / Number(amount)).toFixed(6)} {toToken?.symbol}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Fee</span><span className="text-white font-mono">{Number(quote.fee).toFixed(6)} {fromToken?.symbol}</span></div>
              <div className="flex justify-between"><span className="text-white/60">Price Impact</span><span className={`font-mono ${quote.priceImpactBps > 500 ? "text-red-400" : quote.priceImpactBps > 100 ? "text-yellow-400" : "text-green-400"}`}>{(quote.priceImpactBps / 100).toFixed(2)}%</span></div>
              <div className="flex justify-between"><span className="text-white/60">Min Received</span><span className="text-white font-mono">{Number(quote.minAmountOut).toFixed(6)} {toToken?.symbol}</span></div>
            </div>
          )}
          <div className="space-y-1">
            <span className="text-xs text-white/70">Slippage Tolerance</span>
            <div className="flex gap-2">
              {[0.5, 1, 2, 5].map(v => <button key={v} onClick={() => setSlippage(v)} className={`px-2 py-1 rounded text-xs ${slippage === v ? "bg-primary text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>{v}%</button>)}
              <input className="input flex-1 text-center text-xs" type="number" min="0" max="100" step="0.1" value={slippage} onChange={e => setSlippage(Number(e.target.value))} disabled={loading} />
            </div>
          </div>
          <button className="h-12 rounded-lg bg-primary text-white text-sm font-bold tracking-wide hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!connected || !fromToken || !toToken || !amount || loading || !quote} onClick={handleSwap}>
            {loading ? "Processing..." : !connected ? "Connect Wallet" : "Swap"}
          </button>
          {status && <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-400">{status}</div>}
          {error && <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
          <p className="font-semibold text-white mb-1">Multi-Chain Swap</p>
          <ul className="list-disc ml-5 space-y-0.5">
            <li>Switch chains using the dropdown in the header</li>
            <li>Get test tokens from the <a href="/faucet" className="text-primary hover:underline">Faucet</a></li>
            <li>Supports Sepolia ETH, Arbitrum Sepolia, BSC Testnet</li>
            <li>Slippage protects against price changes during transaction</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

function TokenButton({ tokens, selected, onSelect, exclude }: { tokens: TokenInfo[]; selected: TokenInfo | null; onSelect: (t: TokenInfo) => void; exclude?: string }) {
  const [open, setOpen] = useState(false);
  const filtered = tokens.filter(t => t.symbol !== exclude);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="h-full min-w-[100px] px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center gap-2 text-sm">
        {selected ? <span className="font-semibold text-white">{selected.symbol}</span> : <span className="text-white/60">Select</span>}
        <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
      </button>
      {open && (<><div className="fixed inset-0 z-10" onClick={() => setOpen(false)}/><div className="absolute top-full right-0 z-20 mt-1 w-44 rounded-lg border border-white/10 bg-[#1a1f2e] shadow-xl max-h-48 overflow-y-auto">
        {filtered.map(t => <button key={t.symbol} onClick={() => { onSelect(t); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 text-left"><div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">{t.symbol.slice(0,2)}</div><div><div className="text-white font-medium">{t.symbol}</div><div className="text-white/40 text-xs">{t.name}</div></div></button>)}
      </div></>)}
    </div>
  );
}
