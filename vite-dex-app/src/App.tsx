import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowDownUp, Wallet, Droplets, History, Repeat, Settings, ChevronDown,
  TrendingUp, Coins, Zap, CheckCircle2, Clock, XCircle, ExternalLink, Search,
  Activity, Layers, Sparkles, Info, ArrowRight, Droplet, RefreshCw, Plus
} from 'lucide-react';
import tokensData from './data/tokens.json';
import poolsData from './data/pools.json';
import txData from './data/transactions.json';

function safe(v: any) { return String(v ?? '').trim(); }
function fmt(n: any, d = 4) {
  if (n === null || n === undefined || isNaN(n)) return '0';
  const num = Number(n);
  if (num === 0) return '0';
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  if (Math.abs(num) >= 1) return num.toFixed(Math.min(d, 4));
  return num.toFixed(d);
}
function fmtUsd(n: any) {
  if (!n) return '$0';
  const num = Number(n);
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K';
  return '$' + num.toFixed(2);
}
function shortAddr(addr: string) {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}
function timeAgo(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return Math.floor(diff) + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

const ACCENT = { lilac: '#B8A9E8', amber: '#F5A623', teal: '#4ECDC4', coral: '#FF6B6B', green: '#4ADE80', ink: '#1A1A1A' };

const CHAINS: Record<string, { label: string; short: string; color: string; icon: string }> = {
  sepolia:         { label: 'Ethereum Sepolia',  short: 'Sepolia',  color: ACCENT.lilac, icon: '◆' },
  arbitrumSepolia: { label: 'Arbitrum Sepolia',  short: 'Arbitrum', color: ACCENT.teal,  icon: '◈' },
  bscTestnet:      { label: 'BSC Testnet',       short: 'BSC',      color: ACCENT.amber, icon: '◇' }
};

const TX_STATUS: Record<string, any> = {
  success: { c: ACCENT.green, t: '#166534', i: CheckCircle2 },
  pending: { c: ACCENT.amber, t: '#92400E', i: Clock },
  failed:  { c: ACCENT.coral, t: '#DC2626', i: XCircle }
};

const TX_TYPE: Record<string, any> = {
  swap:              { c: ACCENT.lilac, label: 'Swap',             i: Repeat },
  add_liquidity:     { c: ACCENT.teal,  label: 'Add Liquidity',    i: Plus },
  remove_liquidity:  { c: ACCENT.coral, label: 'Remove Liquidity', i: Droplets },
  faucet:            { c: ACCENT.green, label: 'Faucet',           i: Droplet }
};

export default function App() {
  const tokens = (tokensData as any).data || [];
  const pools = (poolsData as any).data || [];
  const initialTxs = (txData as any).data || [];

  const [transactions, setTransactions] = useState<any[]>(initialTxs);
  const [activeTab, setActiveTab] = useState<'swap' | 'pools' | 'portfolio' | 'history'>('swap');
  const [selectedChain, setSelectedChain] = useState<string>('sepolia');
  const [connected, setConnected] = useState(false);
  const [walletAddr] = useState('0xa3f2b1c4d5e6f78901234567890abcdef12345678');

  const [fromToken, setFromToken] = useState<any>(null);
  const [toToken, setToToken] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(1);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapMsg, setSwapMsg] = useState('');

  const chainTokens = useMemo(
    () => tokens.filter((t: any) => safe(t.chain) === selectedChain),
    [tokens, selectedChain]
  );
  const chainPools = useMemo(
    () => pools.filter((p: any) => safe(p.chain) === selectedChain),
    [pools, selectedChain]
  );
  const chainTxs = useMemo(
    () => transactions.filter((t: any) => safe(t.chain) === selectedChain),
    [transactions, selectedChain]
  );

  useEffect(() => {
    if (chainTokens.length > 0) {
      const fromOk = fromToken && chainTokens.find((t: any) => t.symbol === fromToken.symbol);
      const toOk = toToken && chainTokens.find((t: any) => t.symbol === toToken.symbol);
      if (!fromOk) setFromToken(chainTokens[0]);
      if (!toOk) setToToken(chainTokens[1] || chainTokens[0]);
    }
  }, [selectedChain, chainTokens.length]);

  const activePool = useMemo(() => {
    if (!fromToken || !toToken) return null;
    return chainPools.find((p: any) =>
      (p.tokenA === fromToken.symbol && p.tokenB === toToken.symbol) ||
      (p.tokenA === toToken.symbol && p.tokenB === fromToken.symbol)
    );
  }, [chainPools, fromToken, toToken]);

  const quote = useMemo(() => {
    if (!fromToken || !toToken || !amount || Number(amount) <= 0 || !activePool) return null;
    const isAtoB = activePool.tokenA === fromToken.symbol;
    const reserveIn = isAtoB ? activePool.reserveA : activePool.reserveB;
    const reserveOut = isAtoB ? activePool.reserveB : activePool.reserveA;
    const amountIn = Number(amount);
    const feeBps = activePool.feeBps || 30;
    const amountInAfterFee = amountIn * (10000 - feeBps) / 10000;
    const amountOut = (amountInAfterFee * reserveOut) / (reserveIn + amountInAfterFee);
    const fee = amountIn * feeBps / 10000;
    const priceImpact = ((reserveIn + amountInAfterFee) / reserveIn - 1 - amountInAfterFee / reserveIn) * 100;
    const minOut = amountOut * (100 - slippage) / 100;
    const rate = amountOut / amountIn;
    return { amountOut, fee, priceImpact: Math.abs(priceImpact), minOut, rate, feeBps };
  }, [fromToken, toToken, amount, slippage, activePool]);

  const fromBalance = fromToken ? Number(fromToken.balance || 0) : 0;
  const fromUsd = fromToken && amount ? Number(amount) * Number(fromToken.priceUsd || 0) : 0;
  const toUsd = toToken && quote ? quote.amountOut * Number(toToken.priceUsd || 0) : 0;

  const portfolioStats = useMemo(() => {
    const totalUsd = chainTokens.reduce((s: number, t: any) => s + Number(t.balance || 0) * Number(t.priceUsd || 0), 0);
    const totalTokens = chainTokens.length;
    const totalTvl = chainPools.reduce((s: number, p: any) => s + Number(p.tvlUsd || 0), 0);
    const totalVolume = chainPools.reduce((s: number, p: any) => s + Number(p.volume24h || 0), 0);
    return { totalUsd, totalTokens, totalTvl, totalVolume };
  }, [chainTokens, chainPools]);

  const handleSwitch = () => { setFromToken(toToken); setToToken(fromToken); setAmount(''); };
  const handleConnectWallet = () => setConnected(c => !c);

  const handleSwap = async () => {
    if (!fromToken || !toToken || !quote) return;
    setSwapping(true);
    setSwapMsg('');
    await new Promise(r => setTimeout(r, 1200));
    const newTx = {
      id: (transactions[0]?.id || 0) + 1,
      type: 'swap',
      tokenIn: fromToken.symbol,
      tokenOut: toToken.symbol,
      amountIn: Number(amount),
      amountOut: quote.amountOut,
      txHash: '0x' + Math.random().toString(16).slice(2).padEnd(64, '0').slice(0, 64),
      status: 'success',
      timestamp: new Date().toISOString(),
      chain: selectedChain
    };
    setTransactions(prev => [newTx, ...prev]);
    setSwapMsg(`Swap submitted! ${fmt(Number(amount))} ${fromToken.symbol} → ${fmt(quote.amountOut)} ${toToken.symbol}`);
    setAmount('');
    setTimeout(() => setSwapMsg(''), 5000);
    setSwapping(false);
  };

  const tabs: Array<{ id: 'swap' | 'pools' | 'portfolio' | 'history'; label: string; icon: any }> = [
    { id: 'swap',      label: 'Swap',      icon: Repeat },
    { id: 'pools',     label: 'Pools',     icon: Droplets },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
    { id: 'history',   label: 'History',   icon: History }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#F0F0F0]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1A1A1A] flex items-center justify-center relative">
              <Sparkles size={16} className="text-white" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#B8A9E8] border-2 border-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1A1A1A] tracking-tight leading-tight">Poseidon DEX</h1>
              <p className="text-[11px] text-[#9B9B9B] mt-0.5">Multi-chain swap aggregator</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedChain}
                onChange={e => setSelectedChain(e.target.value)}
                className="appearance-none text-sm font-medium border border-[#F0F0F0] rounded-full pl-8 pr-9 py-2.5 bg-white text-[#1A1A1A] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/5"
              >
                {Object.entries(CHAINS).map(([k, c]) => (<option key={k} value={k}>{c.short}</option>))}
              </select>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none" style={{ color: CHAINS[selectedChain].color }}>
                {CHAINS[selectedChain].icon}
              </span>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9B9B9B] pointer-events-none" />
            </div>

            <button
              onClick={handleConnectWallet}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-full transition-all duration-200 shadow-sm hover:shadow-md ${connected ? 'bg-white text-[#1A1A1A] border border-[#F0F0F0]' : 'bg-[#B8A9E8] text-[#1A1A1A] hover:bg-[#A89AD8]'}`}
            >
              {connected ? (
                <div className="contents">
                  <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
                  <span className="font-mono text-xs">{shortAddr(walletAddr)}</span>
                </div>
              ) : (
                <div className="contents">
                  <Wallet size={14} />
                  <span>Connect Wallet</span>
                </div>
              )}
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 pb-4">
          <div className="flex gap-1 bg-[#F0F0F0]/60 rounded-full p-1 w-fit">
            {tabs.map(t => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${active ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'}`}>
                  <Icon size={14} />{t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 lg:py-8">
        <div key={activeTab} className="animate-[fadeIn_300ms_ease-out]">

          {activeTab === 'swap' && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 max-w-xl mx-auto w-full lg:mx-0">
                <div className="bg-white rounded-2xl border border-[#F0F0F0] p-5 lg:p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-base font-bold text-[#1A1A1A] flex items-center gap-2">
                      <Repeat size={16} className="text-[#B8A9E8]" /> Swap
                    </h2>
                    <button onClick={() => setShowSettings(s => !s)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#FAFAF8] transition-colors">
                      <Settings size={14} className="text-[#6B6B6B]" />
                    </button>
                  </div>

                  {showSettings && (
                    <div className="mb-4 p-4 bg-[#FAFAF8] rounded-xl border border-[#F0F0F0] animate-[fadeIn_200ms_ease-out]">
                      <p className="text-xs font-semibold text-[#1A1A1A] mb-2">Slippage tolerance</p>
                      <div className="flex gap-2">
                        {[0.1, 0.5, 1, 3].map(s => (
                          <button key={s} onClick={() => setSlippage(s)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${slippage === s ? 'bg-[#B8A9E8] text-[#1A1A1A]' : 'bg-white border border-[#F0F0F0] text-[#6B6B6B] hover:text-[#1A1A1A]'}`}>
                            {s}%
                          </button>
                        ))}
                        <div className="flex items-center gap-1 bg-white border border-[#F0F0F0] rounded-full px-3">
                          <input type="number" value={slippage} onChange={e => setSlippage(Number(e.target.value) || 0)} className="w-12 text-xs text-right bg-transparent focus:outline-none text-[#1A1A1A]" />
                          <span className="text-xs text-[#9B9B9B]">%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <TokenInput label="You pay" token={fromToken} amount={amount} onAmountChange={setAmount} onPickerOpen={() => setShowFromPicker(true)} balance={fromBalance} usd={fromUsd} showMax />

                  <div className="flex justify-center -my-2 relative z-10">
                    <button onClick={handleSwitch} className="w-9 h-9 rounded-full bg-white border-2 border-[#FAFAF8] shadow-sm hover:shadow-md hover:rotate-180 transition-all duration-300 flex items-center justify-center text-[#1A1A1A]">
                      <ArrowDownUp size={14} />
                    </button>
                  </div>

                  <TokenInput label="You receive" token={toToken} amount={quote ? fmt(quote.amountOut, 6) : ''} readonly onPickerOpen={() => setShowToPicker(true)} balance={toToken ? Number(toToken.balance || 0) : 0} usd={toUsd} />

                  {quote && (
                    <div className="mt-4 p-4 bg-[#FAFAF8] rounded-xl border border-[#F0F0F0] space-y-2">
                      <Row label="Rate" value={`1 ${fromToken.symbol} = ${fmt(quote.rate, 6)} ${toToken.symbol}`} />
                      <Row label="Fee" value={`${fmt(quote.fee, 6)} ${fromToken.symbol} (${(quote.feeBps / 100).toFixed(2)}%)`} accent={ACCENT.amber} />
                      <Row label="Price impact" value={quote.priceImpact.toFixed(3) + '%'} accent={quote.priceImpact > 3 ? ACCENT.coral : quote.priceImpact > 1 ? ACCENT.amber : ACCENT.green} />
                      <Row label="Min received" value={`${fmt(quote.minOut, 6)} ${toToken.symbol}`} />
                      <Row label="Pool" value={`#${activePool.id} · ${activePool.tokenA}/${activePool.tokenB}`} />
                    </div>
                  )}

                  {fromToken && toToken && amount && !activePool && (
                    <div className="mt-4 p-3 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 flex items-center gap-2">
                      <Info size={14} className="text-[#DC2626]" />
                      <span className="text-xs text-[#DC2626]">No liquidity pool exists for this pair on {CHAINS[selectedChain].short}.</span>
                    </div>
                  )}

                  {swapMsg && (
                    <div className={`mt-4 p-3 rounded-xl border flex items-center gap-2 ${swapMsg.startsWith('Swap failed') ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]/20' : 'bg-[#4ADE80]/10 border-[#4ADE80]/20'}`}>
                      {swapMsg.startsWith('Swap failed') ? <XCircle size={14} className="text-[#DC2626] shrink-0" /> : <CheckCircle2 size={14} className="text-[#166534] shrink-0" />}
                      <span className={`text-xs ${swapMsg.startsWith('Swap failed') ? 'text-[#DC2626]' : 'text-[#166534]'}`}>{swapMsg}</span>
                    </div>
                  )}

                  <button onClick={handleSwap} disabled={swapping || !quote || !amount || Number(amount) <= 0 || !activePool} className="w-full mt-5 py-3.5 rounded-full bg-[#B8A9E8] text-[#1A1A1A] font-semibold text-sm hover:bg-[#A89AD8] hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {swapping ? (
                      <div className="contents"><RefreshCw size={14} className="animate-spin" /><span>Swapping…</span></div>
                    ) : !amount || Number(amount) <= 0 ? ('Enter an amount')
                    : !activePool ? ('No pool available')
                    : (<div className="contents"><Zap size={14} /><span>Swap {fromToken?.symbol} → {toToken?.symbol}</span></div>)}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <StatCard icon={Wallet}     c={ACCENT.lilac} label="Portfolio value"    value={fmtUsd(portfolioStats.totalUsd)} />
                <StatCard icon={Droplets}   c={ACCENT.teal}  label="Total TVL"          value={fmtUsd(portfolioStats.totalTvl)} />
                <StatCard icon={TrendingUp} c={ACCENT.amber} label="Volume 24h"         value={fmtUsd(portfolioStats.totalVolume)} />
                <StatCard icon={Coins}      c={ACCENT.green} label="Tokens on chain"    value={portfolioStats.totalTokens} />

                <div className="bg-white rounded-2xl border border-[#F0F0F0] p-5">
                  <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2">
                    <Activity size={14} className="text-[#F5A623]" /> Recent transactions
                  </h3>
                  <div className="space-y-2.5">
                    {chainTxs.slice(0, 4).map((tx: any) => {
                      const t = TX_TYPE[safe(tx.type)] || TX_TYPE.swap;
                      const s = TX_STATUS[safe(tx.status)] || TX_STATUS.pending;
                      const Icon = t.i;
                      const SIcon = s.i;
                      return (
                        <div key={tx.id} className="flex items-center gap-3 text-xs">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: t.c + '15' }}>
                            <Icon size={12} style={{ color: t.c }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#1A1A1A] truncate">
                              {tx.type === 'faucet' ? `+${fmt(tx.amountOut)} ${tx.tokenOut}` : `${fmt(tx.amountIn)} ${tx.tokenIn} → ${fmt(tx.amountOut)} ${tx.tokenOut}`}
                            </p>
                            <p className="text-[10px] text-[#9B9B9B]">{timeAgo(tx.timestamp)}</p>
                          </div>
                          <SIcon size={12} style={{ color: s.c }} />
                        </div>
                      );
                    })}
                    {chainTxs.length === 0 && (
                      <div className="text-center py-6">
                        <History size={20} className="mx-auto mb-2 text-[#E0E0E0]" />
                        <p className="text-xs text-[#9B9B9B]">No transactions yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pools' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Droplets}   c={ACCENT.teal}  label="Total pools" value={chainPools.length} />
                <StatCard icon={Layers}     c={ACCENT.lilac} label="Total TVL"   value={fmtUsd(portfolioStats.totalTvl)} />
                <StatCard icon={TrendingUp} c={ACCENT.amber} label="Volume 24h"  value={fmtUsd(portfolioStats.totalVolume)} />
                <StatCard icon={Zap}        c={ACCENT.green} label="Best APR"    value={(chainPools.length > 0 ? Math.max(...chainPools.map((p: any) => Number(p.apr || 0))).toFixed(1) : '0') + '%'} />
              </div>

              <div className="bg-white rounded-2xl border border-[#F0F0F0] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#F0F0F0] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2">
                    <Droplets size={14} className="text-[#4ECDC4]" /> Liquidity Pools — {CHAINS[selectedChain].short}
                  </h3>
                  <span className="text-[11px] text-[#9B9B9B]">{chainPools.length} pools</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-[#9B9B9B] font-semibold">
                        <th className="text-left px-5 py-3">Pool</th>
                        <th className="text-right px-3 py-3">TVL</th>
                        <th className="text-right px-3 py-3">Volume 24h</th>
                        <th className="text-right px-3 py-3">Fee</th>
                        <th className="text-right px-3 py-3">APR</th>
                        <th className="text-right px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F0F0]">
                      {chainPools.map((p: any) => {
                        const tA = tokens.find((t: any) => t.symbol === p.tokenA && t.chain === selectedChain);
                        const tB = tokens.find((t: any) => t.symbol === p.tokenB && t.chain === selectedChain);
                        return (
                          <tr key={p.id} className="hover:bg-[#FAFAF8] transition-colors group">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                  <span className="w-8 h-8 rounded-full bg-[#B8A9E8]/15 border-2 border-white flex items-center justify-center text-sm">{tA?.logo || '◆'}</span>
                                  <span className="w-8 h-8 rounded-full bg-[#4ECDC4]/15 border-2 border-white flex items-center justify-center text-sm">{tB?.logo || '◇'}</span>
                                </div>
                                <div>
                                  <p className="font-semibold text-[#1A1A1A] text-sm">{p.tokenA} / {p.tokenB}</p>
                                  <p className="text-[10px] text-[#9B9B9B]">Pool #{p.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3.5 text-right font-semibold text-[#1A1A1A]">{fmtUsd(p.tvlUsd)}</td>
                            <td className="px-3 py-3.5 text-right text-[#6B6B6B]">{fmtUsd(p.volume24h)}</td>
                            <td className="px-3 py-3.5 text-right">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-[#F5A623]/10 text-[#92400E] border-[#F5A623]/20">{(Number(p.feeBps) / 100).toFixed(2)}%</span>
                            </td>
                            <td className="px-3 py-3.5 text-right"><span className="font-semibold text-[#166534]">{Number(p.apr || 0).toFixed(1)}%</span></td>
                            <td className="px-5 py-3.5 text-right">
                              <button onClick={() => { setSelectedChain(safe(p.chain)); setFromToken(tA || null); setToToken(tB || null); setActiveTab('swap'); }} className="opacity-0 group-hover:opacity-100 text-xs font-semibold text-[#5B21B6] hover:underline flex items-center gap-1 ml-auto transition-opacity">
                                Swap <ArrowRight size={11} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {chainPools.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-12"><Droplets size={28} className="mx-auto mb-3 text-[#E0E0E0]" /><p className="text-sm text-[#9B9B9B]">No pools on {CHAINS[selectedChain].short} yet</p></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Wallet}   c={ACCENT.lilac} label="Total value"   value={fmtUsd(portfolioStats.totalUsd)} />
                <StatCard icon={Coins}    c={ACCENT.amber} label="Tokens held"   value={portfolioStats.totalTokens} />
                <StatCard icon={Layers}   c={ACCENT.teal}  label="Network"       value={CHAINS[selectedChain].short} />
                <StatCard icon={Activity} c={ACCENT.green} label="Recent txs"    value={chainTxs.length} />
              </div>

              <div className="bg-white rounded-2xl border border-[#F0F0F0] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#F0F0F0]">
                  <h3 className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2"><Coins size={14} className="text-[#B8A9E8]" /> Your tokens</h3>
                </div>
                <div className="divide-y divide-[#F0F0F0]">
                  {chainTokens.map((t: any) => {
                    const value = Number(t.balance || 0) * Number(t.priceUsd || 0);
                    const pct = portfolioStats.totalUsd > 0 ? (value / portfolioStats.totalUsd) * 100 : 0;
                    return (
                      <div key={t.id} className="px-5 py-3.5 hover:bg-[#FAFAF8] transition-colors flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FAFAF8] border border-[#F0F0F0] flex items-center justify-center text-lg">{t.logo || t.symbol?.slice(0, 1)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[#1A1A1A] text-sm">{t.symbol}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#F0F0F0] text-[#6B6B6B] font-mono">{shortAddr(t.address)}</span>
                          </div>
                          <p className="text-xs text-[#6B6B6B] truncate">{t.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#1A1A1A]">{fmt(t.balance, 4)} <span className="text-[#9B9B9B] font-normal text-xs">{t.symbol}</span></p>
                          <p className="text-[11px] text-[#6B6B6B]">{fmtUsd(value)} · {pct.toFixed(1)}%</p>
                        </div>
                        <button onClick={() => { setFromToken(t); setActiveTab('swap'); }} className="w-8 h-8 rounded-full hover:bg-white border border-[#F0F0F0] flex items-center justify-center text-[#1A1A1A] hover:shadow-sm transition-all" title="Swap this token">
                          <Repeat size={12} />
                        </button>
                      </div>
                    );
                  })}
                  {chainTokens.length === 0 && (
                    <div className="text-center py-12"><Coins size={28} className="mx-auto mb-3 text-[#E0E0E0]" /><p className="text-sm text-[#9B9B9B]">No tokens on {CHAINS[selectedChain].short}</p></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(TX_TYPE).map(([k, t]) => {
                  const Icon = (t as any).i;
                  const count = chainTxs.filter((tx: any) => safe(tx.type) === k).length;
                  return <StatCard key={k} icon={Icon} c={(t as any).c} label={(t as any).label} value={count} />;
                })}
              </div>

              <div className="bg-white rounded-2xl border border-[#F0F0F0] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#F0F0F0] flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2"><History size={14} className="text-[#B8A9E8]" /> Transaction history</h3>
                  <span className="text-[11px] text-[#9B9B9B]">{chainTxs.length} transactions</span>
                </div>
                <div className="divide-y divide-[#F0F0F0]">
                  {chainTxs.map((tx: any) => {
                    const t = TX_TYPE[safe(tx.type)] || TX_TYPE.swap;
                    const s = TX_STATUS[safe(tx.status)] || TX_STATUS.pending;
                    const Icon = t.i;
                    const SIcon = s.i;
                    return (
                      <div key={tx.id} className="px-5 py-3.5 hover:bg-[#FAFAF8] transition-colors flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: t.c + '15' }}>
                          <Icon size={14} style={{ color: t.c }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-[#1A1A1A]">{t.label}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border" style={{ backgroundColor: s.c + '1A', color: s.t, borderColor: s.c + '33' }}>{tx.status}</span>
                          </div>
                          <p className="text-xs text-[#6B6B6B] mt-0.5">
                            {tx.type === 'faucet'
                              ? <span>Claimed <strong className="text-[#1A1A1A]">{fmt(tx.amountOut)} {tx.tokenOut}</strong></span>
                              : <span><strong className="text-[#1A1A1A]">{fmt(tx.amountIn)} {tx.tokenIn}</strong> → <strong className="text-[#1A1A1A]">{fmt(tx.amountOut)} {tx.tokenOut}</strong></span>
                            }
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] text-[#6B6B6B] flex items-center justify-end gap-1"><Clock size={10} /> {timeAgo(tx.timestamp)}</p>
                          <span className="text-[10px] text-[#9B9B9B] font-mono flex items-center justify-end gap-1 mt-0.5">{shortAddr(tx.txHash)} <ExternalLink size={9} /></span>
                        </div>
                        <SIcon size={14} style={{ color: s.c }} />
                      </div>
                    );
                  })}
                  {chainTxs.length === 0 && (
                    <div className="text-center py-12"><History size={28} className="mx-auto mb-3 text-[#E0E0E0]" /><p className="text-sm text-[#9B9B9B]">No transactions on {CHAINS[selectedChain].short}</p></div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showFromPicker && (<TokenPicker tokens={chainTokens} excludeSymbol={toToken?.symbol} onPick={(t: any) => { setFromToken(t); setShowFromPicker(false); }} onClose={() => setShowFromPicker(false)} />)}
      {showToPicker && (<TokenPicker tokens={chainTokens} excludeSymbol={fromToken?.symbol} onPick={(t: any) => { setToToken(t); setShowToPicker(false); }} onClose={() => setShowToPicker(false)} />)}
    </div>
  );
}

function StatCard({ icon: Icon, c, label, value }: any) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0F0F0] p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: c + '15' }}>
          <Icon size={14} style={{ color: c }} />
        </div>
        <span className="text-2xl font-bold text-[#1A1A1A] tabular-nums">{value}</span>
      </div>
      <p className="text-[11px] text-[#9B9B9B] font-medium">{label}</p>
    </div>
  );
}

function Row({ label, value, accent }: any) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#6B6B6B]">{label}</span>
      <span className="font-semibold tabular-nums" style={{ color: accent || '#1A1A1A' }}>{value}</span>
    </div>
  );
}

function TokenInput({ label, token, amount, onAmountChange, readonly, onPickerOpen, balance, usd, showMax }: any) {
  return (
    <div className="bg-[#FAFAF8] rounded-2xl border border-[#F0F0F0] p-4 hover:border-[#E0E0E0] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-[#9B9B9B] font-medium">{label}</span>
        {token && (
          <span className="text-[11px] text-[#6B6B6B]">
            Balance: <strong className="text-[#1A1A1A]">{fmt(balance, 4)}</strong>
            {showMax && balance > 0 && (
              <button onClick={() => onAmountChange && onAmountChange(String(balance))} className="ml-1.5 text-[10px] font-bold text-[#5B21B6] hover:underline">MAX</button>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input type="number" inputMode="decimal" placeholder="0.0" value={amount} readOnly={readonly} onChange={e => onAmountChange && onAmountChange(e.target.value)} className="flex-1 min-w-0 bg-transparent text-2xl font-bold text-[#1A1A1A] placeholder:text-[#E0E0E0] focus:outline-none tabular-nums" />
        <button onClick={onPickerOpen} className="flex items-center gap-2 bg-white border border-[#F0F0F0] rounded-full px-3 py-2 hover:shadow-sm transition-all shrink-0">
          {token ? (
            <div className="contents">
              <span className="w-6 h-6 rounded-full bg-[#FAFAF8] flex items-center justify-center text-sm">{token.logo || token.symbol?.slice(0, 1)}</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">{token.symbol}</span>
              <ChevronDown size={12} className="text-[#9B9B9B]" />
            </div>
          ) : (
            <div className="contents">
              <span className="text-sm font-semibold text-[#5B21B6]">Select</span>
              <ChevronDown size={12} className="text-[#9B9B9B]" />
            </div>
          )}
        </button>
      </div>
      {token && amount && Number(amount) > 0 && (<p className="text-[11px] text-[#9B9B9B] mt-1 tabular-nums">{fmtUsd(usd)}</p>)}
    </div>
  );
}

function TokenPicker({ tokens, excludeSymbol, onPick, onClose }: any) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const qq = q.toLowerCase();
    return tokens
      .filter((t: any) => safe(t.symbol) !== excludeSymbol)
      .filter((t: any) => !q || safe(t.symbol).toLowerCase().includes(qq) || safe(t.name).toLowerCase().includes(qq) || safe(t.address).toLowerCase().includes(qq));
  }, [tokens, excludeSymbol, q]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_200ms_ease-out]" onClick={onClose}>
      <div className="absolute inset-0 bg-[#1A1A1A]/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl border border-[#F0F0F0] shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-[#F0F0F0]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-[#1A1A1A]">Select a token</h3>
            <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-[#FAFAF8] flex items-center justify-center text-[#6B6B6B]">✕</button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9B9B9B]" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or paste address" className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#F0F0F0] rounded-full bg-white text-[#1A1A1A] placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#E0E0E0] focus:ring-2 focus:ring-[#1A1A1A]/5 transition-all" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((t: any) => (
            <button key={t.id} onClick={() => onPick(t)} className="w-full px-5 py-3 hover:bg-[#FAFAF8] transition-colors flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-full bg-[#FAFAF8] border border-[#F0F0F0] flex items-center justify-center text-lg shrink-0">{t.logo || t.symbol?.slice(0, 1)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#1A1A1A] text-sm">{t.symbol}</p>
                <p className="text-[11px] text-[#9B9B9B] truncate">{t.name} · {shortAddr(t.address)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-[#1A1A1A] tabular-nums">{fmt(t.balance, 4)}</p>
                <p className="text-[11px] text-[#9B9B9B] tabular-nums">{fmtUsd(Number(t.balance || 0) * Number(t.priceUsd || 0))}</p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12"><Coins size={24} className="mx-auto mb-2 text-[#E0E0E0]" /><p className="text-sm text-[#9B9B9B]">No tokens match "{q}"</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
