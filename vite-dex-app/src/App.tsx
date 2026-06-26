import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ArrowDownUp, Wallet, Droplets, History, Repeat, Settings, ChevronDown,
  TrendingUp, Coins, Zap, CheckCircle2, Clock, XCircle, ExternalLink, Search,
  Activity, Layers, Sparkles, Info, ArrowRight, Droplet, RefreshCw, Plus,
  LogOut, WifiOff
} from 'lucide-react';
import tokensData from './data/tokens.json';
import poolsData from './data/pools.json';
import txData from './data/transactions.json';
import metamaskLogo from './assets/metamask.svg';
import phantomLogo from './assets/phantom.svg';
import solanaLogo from './assets/solana.svg';
import ethereumLogo from './assets/ethereum.svg';
import arbitrumLogo from './assets/arbitrum.svg';
import bscLogo from './assets/bsc.svg';
import poseidonLogo from './assets/poseidon-wave-logo.png';
import bgWaveDaylight from './assets/poseidon-wave-daylight.png';
import connectWalletsImg from './assets/connect-wallets.svg';

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
function fmtUsd(_n: any) { return '—'; }
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

const ACCENT = { lilac: '#B8A9E8', amber: '#F5A623', teal: '#4ECDC4', coral: '#FF6B6B', green: '#4ADE80', ink: '#1A1A1A', solana: '#9945FF' };

const CHAINS: Record<string, { label: string; short: string; color: string; icon: string; type: 'evm' | 'solana'; chainId: number | string; rpcUrl: string; nativeToken: string; testnet: boolean }> = {
  sepolia:         { label: 'Sepolia ETH Testnet',     short: 'Sepolia',  color: ACCENT.lilac,  icon: '◆', type: 'evm',    chainId: 11155111, rpcUrl: 'https://ethereum-sepolia.publicnode.com',       nativeToken: 'ETH',  testnet: true },
  arbitrumSepolia: { label: 'Arbitrum Sepolia Testnet', short: 'Arbitrum', color: ACCENT.teal,   icon: '◈', type: 'evm',    chainId: 421614,  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',           nativeToken: 'ETH',  testnet: true },
  bscTestnet:      { label: 'BSC Testnet',              short: 'BSC',      color: ACCENT.amber,  icon: '◇', type: 'evm',    chainId: 97,      rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545', nativeToken: 'tBNB', testnet: true },
  solanaDevnet:    { label: 'Solana Devnet',            short: 'Solana',   color: ACCENT.solana, icon: '◎', type: 'solana', chainId: 'devnet', rpcUrl: 'https://api.devnet.solana.com',                    nativeToken: 'SOL',  testnet: true },
};

const TX_STATUS: Record<string, any> = {
  success: { c: ACCENT.green, t: '#166534', i: CheckCircle2 },
  pending: { c: ACCENT.amber, t: '#92400E', i: Clock },
  failed:  { c: ACCENT.coral, t: '#DC2626', i: XCircle }
};

const TX_TYPE: Record<string, any> = {
  swap:              { c: ACCENT.lilac,  label: 'Swap',             i: Repeat },
  add_liquidity:     { c: ACCENT.teal,   label: 'Add Liquidity',    i: Plus },
  remove_liquidity:  { c: ACCENT.coral,  label: 'Remove Liquidity', i: Droplets },
  faucet:            { c: ACCENT.green,  label: 'Faucet',           i: Droplet }
};

export default function App() {
  const tokens = (tokensData as any).data || [];
  const pools = (poolsData as any).data || [];
  const initialTxs = (txData as any).data || [];

  const [transactions, setTransactions] = useState<any[]>(initialTxs);
  const [activeTab, setActiveTab] = useState<'swap' | 'pools' | 'portfolio' | 'history'>('swap');
  const [selectedChain, setSelectedChain] = useState<string>('sepolia');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<{ type: string; name: string; icon: string; address: string; chain: string } | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [fromToken, setFromToken] = useState<any>(null);
  const [toToken, setToToken] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(1);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customChains, setCustomChains] = useState<Record<string, { label: string; short: string; color: string; icon: string; type: 'evm' | 'solana'; chainId: number | string; rpcUrl: string; nativeToken: string; testnet: boolean }>>({});
  const [showAddNetwork, setShowAddNetwork] = useState(false);
  const [newNetwork, setNewNetwork] = useState({ label: '', chainId: '', rpcUrl: '', nativeToken: 'ETH', icon: '◆', color: '#6B7280' });
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapMsg, setSwapMsg] = useState('');

  const allChains = useMemo(() => ({ ...CHAINS, ...customChains }), [customChains]);
  const chainTokens = useMemo(() => tokens.filter((t: any) => safe(t.chain) === selectedChain), [tokens, selectedChain]);
  const chainPools = useMemo(() => pools.filter((p: any) => safe(p.chain) === selectedChain), [pools, selectedChain]);
  const chainTxs = useMemo(() => transactions.filter((t: any) => safe(t.chain) === selectedChain), [transactions, selectedChain]);
  const currentChain = allChains[selectedChain] || CHAINS[selectedChain];
  const isSolana = currentChain?.type === 'solana';

  const detectWallets = useMemo(() => {
    const w = window as any;
    return { metamask: !!(w.ethereum && w.ethereum.isMetaMask), phantom: !!(w.solana && w.solana.isPhantom), solflare: !!w.solflare };
  }, []);

  const connectWallet = useCallback(async (walletType: string) => {
    setConnecting(true); setWalletError('');
    const w = window as any;
    try {
      if (walletType === 'metamask') {
        if (!w.ethereum) {
          if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            window.open('https://metamask.app.link/dapp/' + window.location.href.replace(/^https?:\/\//, ''), '_blank');
            throw new Error('Opening MetaMask... Approve in app.');
          }
          // Redirect to install page
            window.open('https://metamask.io/download/', '_blank');
            throw new Error('MetaMask not installed. Opening download page...');
        }
        const accounts = await w.ethereum.request({ method: 'eth_requestAccounts' });
        setConnectedWallet({ type: 'metamask', name: 'MetaMask', icon: 'metamask', address: accounts[0], chain: 'evm' });
        const chainId = await w.ethereum.request({ method: 'eth_chainId' });
        const m: Record<string, string> = { '0xaa36a7': 'sepolia', '0x66eee': 'arbitrumSepolia', '0x61': 'bscTestnet' };
        if (m[chainId]) setSelectedChain(m[chainId]);
        w.ethereum.on('accountsChanged', (a: string[]) => { if (a.length === 0) setConnectedWallet(null); else setConnectedWallet(p => p ? { ...p, address: a[0] } : null); });
        w.ethereum.on('chainChanged', () => window.location.reload());
        w.ethereum.on('disconnect', () => setConnectedWallet(null));
      } else if (walletType === 'phantom') {
        const p = w.solana || w.solflare;
        if (!p) {
          if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            window.open('https://phantom.app/ul/browse/' + encodeURIComponent(window.location.href), '_blank');
            throw new Error('Opening Phantom... Approve in app.');
          }
          window.open('https://phantom.app/download', '_blank');
          throw new Error('Phantom not installed. Opening download page...');
        }
        const resp = await p.connect();
        const addr = resp.publicKey.toString();
        setConnectedWallet({ type: 'phantom', name: 'Phantom', icon: 'phantom', address: addr, chain: 'solana' });
        setSelectedChain('solanaDevnet');
        p.on('disconnect', () => setConnectedWallet(null));
        p.on('accountChanged', (pk: any) => { if (pk) setConnectedWallet(prev => prev ? { ...prev, address: pk.toString() } : null); else setConnectedWallet(null); });
      }
    } catch (e: any) { setWalletError(e.message); setTimeout(() => setWalletError(''), 5000); }
    finally { setConnecting(false); setShowWalletModal(false); }
  }, []);

  const disconnectWallet = useCallback(() => {
    const w = window as any;
    if (connectedWallet?.type === 'phantom' && w.solana) w.solana.disconnect();
    setConnectedWallet(null);
  }, [connectedWallet]);

  const chainMismatch = useMemo(() => {
    if (!connectedWallet) return false;
    return (connectedWallet.chain === 'evm' && isSolana) || (connectedWallet.chain === 'solana' && !isSolana);
  }, [connectedWallet, isSolana]);

  useEffect(() => {
    if (chainTokens.length > 0) {
      const fOk = fromToken && chainTokens.find((t: any) => t.symbol === fromToken.symbol);
      const tOk = toToken && chainTokens.find((t: any) => t.symbol === toToken.symbol);
      if (!fOk) setFromToken(chainTokens[0]);
      if (!tOk) setToToken(chainTokens[1] || chainTokens[0]);
    }
  }, [selectedChain, chainTokens.length]);

  const activePool = useMemo(() => {
    if (!fromToken || !toToken) return null;
    return chainPools.find((p: any) => (p.tokenA === fromToken.symbol && p.tokenB === toToken.symbol) || (p.tokenA === toToken.symbol && p.tokenB === fromToken.symbol));
  }, [chainPools, fromToken, toToken]);

  const quote = useMemo(() => {
    if (!fromToken || !toToken || !amount || Number(amount) <= 0 || !activePool || isSolana) return null;
    const isAtoB = activePool.tokenA === fromToken.symbol;
    const rIn = isAtoB ? activePool.reserveA : activePool.reserveB;
    const rOut = isAtoB ? activePool.reserveB : activePool.reserveA;
    const amt = Number(amount);
    const feeBps = activePool.feeBps || 30;
    const amtAfter = amt * (10000 - feeBps) / 10000;
    const amtOut = (amtAfter * rOut) / (rIn + amtAfter);
    const fee = amt * feeBps / 10000;
    const pi = Math.abs(((rIn + amtAfter) / rIn - 1 - amtAfter / rIn) * 100);
    return { amountOut: amtOut, fee, priceImpact: pi, minOut: amtOut * (100 - slippage) / 100, rate: amtOut / amt, feeBps };
  }, [fromToken, toToken, amount, slippage, activePool, isSolana]);

  const fromBalance = fromToken ? Number(fromToken.balance || 0) : 0;
  const fromUsd = fromToken && amount ? Number(amount) * Number(fromToken.priceUsd || 0) : 0;
  const toUsd = toToken && quote ? quote.amountOut * Number(toToken.priceUsd || 0) : 0;

  const portfolioStats = useMemo(() => ({
    totalUsd: chainTokens.reduce((s: number, t: any) => s + Number(t.balance || 0) * Number(t.priceUsd || 0), 0),
    totalTokens: chainTokens.length,
    totalTvl: chainPools.reduce((s: number, p: any) => s + Number(p.tvlUsd || 0), 0),
    totalVolume: chainPools.reduce((s: number, p: any) => s + Number(p.volume24h || 0), 0)
  }), [chainTokens, chainPools]);

  const handleSwitch = () => { setFromToken(toToken); setToToken(fromToken); setAmount(''); };

  const handleSwap = async () => {
    if (!fromToken || !toToken) return;
    setSwapping(true); setSwapMsg('');
    await new Promise(r => setTimeout(r, 1200));
    const nid = (transactions[0]?.id || 0) + 1;
    const newTx = {
      id: nid, type: 'swap', tokenIn: fromToken.symbol, tokenOut: toToken.symbol,
      amountIn: Number(amount), amountOut: quote?.amountOut || 0,
      txHash: isSolana ? ('Sol:' + Math.random().toString(36).slice(2, 10) + '...') : ('0x' + Math.random().toString(16).slice(2).padEnd(64, '0').slice(0, 64)),
      status: 'success', timestamp: new Date().toISOString(), chain: selectedChain
    };
    setTransactions(prev => [newTx, ...prev]);
    setSwapMsg((isSolana ? '\u26a1 Solana' : '') + ' Swap submitted! ' + fmt(Number(amount)) + ' ' + fromToken.symbol + ' \u2192 ' + fmt(quote?.amountOut || 0) + ' ' + toToken.symbol);
    setAmount(''); setTimeout(() => setSwapMsg(''), 5000); setSwapping(false);
  };

  const handleChainChange = (chainKey: string) => {
    const chain = allChains[chainKey];
    if (!chain) return;
    if (connectedWallet?.type === 'phantom' && chain.type !== 'solana') { setWalletError('Phantom only supports Solana'); setTimeout(() => setWalletError(''), 3000); return; }
    if (connectedWallet?.type === 'metamask' && chain.type !== 'evm') { setWalletError('MetaMask only supports EVM chains. Connect Phantom for Solana.'); setTimeout(() => setWalletError(''), 3000); return; }
    setSelectedChain(chainKey);
    setShowChainPicker(false);
  };

  const addCustomNetwork = () => {
    const id = 'custom-' + Date.now();
    const chain: any = {
      label: newNetwork.label || 'Custom Testnet',
      short: newNetwork.label?.slice(0, 6) || 'Custom',
      color: newNetwork.color,
      icon: newNetwork.icon,
      type: 'evm' as const,
      chainId: Number(newNetwork.chainId) || id,
      rpcUrl: newNetwork.rpcUrl,
      nativeToken: newNetwork.nativeToken,
      testnet: true,
    };
    setCustomChains((prev: any) => ({ ...prev, [id]: chain }));
    setNewNetwork({ label: '', chainId: '', rpcUrl: '', nativeToken: 'ETH', icon: '◆', color: '#6B7280' });
    setShowAddNetwork(false);
    setSelectedChain(id);
    setShowChainPicker(false);
  };

  const tabs: Array<{ id: 'swap' | 'pools' | 'portfolio' | 'history'; label: string; icon: any }> = [
    { id: 'swap', label: 'Swap', icon: Repeat }, { id: 'pools', label: 'Pools', icon: Droplets },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet }, { id: 'history', label: 'History', icon: History }
  ];

  return (
    <div className="min-h-screen relative bg-white">
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden"><img src={bgWaveDaylight} alt="" className="w-full h-full object-cover opacity-30" /></div>
      {/* ====== HEADER ====== */}
      <div className="sticky top-0 z-40 bg-white border-b border-[#F0F0F0] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <img src={poseidonLogo} alt="Poseidon" className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl object-cover shadow-sm" />
            <div><h1 className="text-base lg:text-lg font-bold text-[#1A1A1A] tracking-tight">Poseidon DEX</h1><p className="text-[10px] text-[#6B6B6B] font-semibold">Multi-chain · EVM + Solana</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChainPicker(true)}
              className="flex items-center gap-2 text-xs lg:text-sm font-medium border border-[#F0F0F0] rounded-full pl-3 pr-3 py-2 lg:py-2.5 bg-white text-[#1A1A1A] cursor-pointer hover:shadow-sm transition-all"
            >
              <span className="text-base" style={{ color: (allChains as any)[selectedChain]?.color }}>{(allChains as any)[selectedChain]?.icon}</span>
              <span className="hidden sm:inline max-w-[100px] lg:max-w-none truncate">{(allChains as any)[selectedChain]?.label || selectedChain}</span>
              <ChevronDown size={14} className="text-[#9B9B9B]" />
            </button>
            {connectedWallet ? (
              <div className="flex items-center gap-1">
                <button onClick={disconnectWallet} className="flex items-center gap-2 text-xs lg:text-sm font-medium px-3 lg:px-4 py-2 lg:py-2.5 rounded-full bg-white text-[#1A1A1A] border border-[#F0F0F0] hover:shadow-sm transition-all group relative" title={connectedWallet.address}>
                  <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
                  <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0">
                      {connectedWallet.type === 'metamask' ? (
                        <img src={metamaskLogo} alt="MetaMask" className="w-4 h-4" />
                      ) : (
                        <img src={phantomLogo} alt="Phantom" className="w-4 h-4" />
                      )}
                    </span>
                  <span className="font-mono text-[10px] lg:text-xs hidden sm:inline">{shortAddr(connectedWallet.address)}</span>
                  <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: (connectedWallet.chain === 'solana' ? ACCENT.solana : ACCENT.lilac) + '20', color: connectedWallet.chain === 'solana' ? ACCENT.solana : ACCENT.lilac }}>{connectedWallet.chain === 'solana' ? 'SOL' : 'EVM'}</span>
                  <LogOut size={11} className="text-[#9B9B9B] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                {chainMismatch && <span className="text-[10px] px-2 py-1 rounded-full bg-[#FF6B6B]/10 text-[#DC2626] font-medium animate-pulse"><WifiOff size={10} className="inline mr-1" />Wrong network</span>}
              </div>
            ) : (
              <button onClick={() => setShowWalletModal(true)} className="flex items-center gap-2 text-xs lg:text-sm font-semibold px-4 py-2.5 rounded-full bg-[#B8A9E8] text-[#1A1A1A] hover:bg-[#A89AD8] hover:shadow-md transition-all duration-200">
                <Wallet size={14} /><span>Connect</span>
              </button>
            )}
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-3 lg:pb-4">
          <div className="flex gap-1 bg-[#F0F0F0]/60 rounded-full p-1 w-fit overflow-x-auto">
            {tabs.map(t => { const Icon = t.icon; const active = activeTab === t.id; return (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-1.5 px-3 lg:px-4 py-2 text-xs lg:text-sm font-medium rounded-full transition-all whitespace-nowrap ${active ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#6B6B6B] hover:text-[#1A1A1A]'}`}><Icon size={14} />{t.label}</button>
            );})}
          </div>
        </div>
      </div>

      {/* ====== CHAIN PICKER MODAL ====== */}
      {showChainPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowChainPicker(false)}>
          <div className="absolute inset-0 bg-[#1A1A1A]/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl border border-[#F0F0F0] shadow-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-[slideUp_300ms_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 rounded-full bg-[#E0E0E0]" /></div>
            <div className="px-6 pt-3 pb-2 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1A1A1A]">Select Network</h3>
              <button onClick={() => setShowChainPicker(false)} className="w-7 h-7 rounded-full hover:bg-[#FAFAF8] flex items-center justify-center text-[#6B6B6B]">✕</button>
            </div>
            <p className="px-6 pb-3 text-[11px] text-[#9B9B9B]">Testnet networks for development and testing</p>
            <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-1">
              {Object.entries(allChains).map(([k, c]: [string, any]) => {
                const active = k === selectedChain;
                return (
                  <button key={k} onClick={() => handleChainChange(k)}
                    className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all ${active ? 'bg-[#F0F0F0]/80 border border-[#E0E0E0]' : 'hover:bg-[#FAFAF8] border border-transparent'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: c.color + '20', color: c.color }}>{c.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><p className="text-sm font-extrabold text-[#1A1A1A]">{c.label}</p>{c.testnet && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#F5A623]/10 text-[#92400E] font-medium">TESTNET</span>}</div>
                      <p className="text-[10px] text-[#6B6B6B] mt-0.5">{c.type === 'solana' ? 'Solana' : 'EVM'} · Chain ID: {c.chainId} · {c.nativeToken}</p>
                    </div>
                    {active && <CheckCircle2 size={18} className="text-[#4ADE80] shrink-0" />}
                  </button>
                );
              })}
            </div>
            {!showAddNetwork ? (
              <div className="px-4 pb-5 pt-2">
                <button onClick={() => setShowAddNetwork(true)} className="w-full p-3 rounded-2xl border-2 border-dashed border-[#E0E0E0] hover:border-[#B8A9E8] hover:bg-[#FAF8FF] transition-all flex items-center justify-center gap-2 text-sm font-medium text-[#6B6B6B] hover:text-[#5B21B6]">
                  <Plus size={16} />Add Custom Testnet
                </button>
              </div>
            ) : (
              <div className="px-4 pb-5 pt-2 border-t border-[#F0F0F0]">
                <p className="text-xs font-semibold text-[#1A1A1A] mb-3">Add Custom EVM Testnet</p>
                <div className="space-y-2.5">
                  <div><label className="text-[10px] font-medium text-[#6B6B6B] block mb-1">Network Name</label><input value={newNetwork.label} onChange={e => setNewNetwork((p: any) => ({ ...p, label: e.target.value }))} placeholder="e.g. Polygon Mumbai" className="w-full px-3 py-2 text-xs border border-[#F0F0F0] rounded-xl bg-white text-[#1A1A1A] placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#B8A9E8] focus:ring-2 focus:ring-[#B8A9E8]/10" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] font-medium text-[#6B6B6B] block mb-1">Chain ID</label><input value={newNetwork.chainId} onChange={e => setNewNetwork((p: any) => ({ ...p, chainId: e.target.value }))} placeholder="e.g. 80001" className="w-full px-3 py-2 text-xs border border-[#F0F0F0] rounded-xl bg-white text-[#1A1A1A] placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#B8A9E8] focus:ring-2 focus:ring-[#B8A9E8]/10" /></div>
                    <div><label className="text-[10px] font-medium text-[#6B6B6B] block mb-1">Native Token</label><input value={newNetwork.nativeToken} onChange={e => setNewNetwork((p: any) => ({ ...p, nativeToken: e.target.value }))} placeholder="MATIC" className="w-full px-3 py-2 text-xs border border-[#F0F0F0] rounded-xl bg-white text-[#1A1A1A] placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#B8A9E8] focus:ring-2 focus:ring-[#B8A9E8]/10" /></div>
                  </div>
                  <div><label className="text-[10px] font-medium text-[#6B6B6B] block mb-1">RPC URL</label><input value={newNetwork.rpcUrl} onChange={e => setNewNetwork((p: any) => ({ ...p, rpcUrl: e.target.value }))} placeholder="https://rpc-mumbai.maticvigil.com" className="w-full px-3 py-2 text-xs border border-[#F0F0F0] rounded-xl bg-white text-[#1A1A1A] placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#B8A9E8] focus:ring-2 focus:ring-[#B8A9E8]/10" /></div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setShowAddNetwork(false)} className="flex-1 py-2 rounded-full text-xs font-semibold border border-[#F0F0F0] text-[#6B6B6B] hover:bg-[#FAFAF8] transition-colors">Cancel</button>
                  <button onClick={addCustomNetwork} disabled={!newNetwork.label || !newNetwork.chainId || !newNetwork.rpcUrl} className="flex-1 py-2 rounded-full text-xs font-semibold bg-[#B8A9E8] text-[#1A1A1A] hover:bg-[#A89AD8] disabled:opacity-40 disabled:cursor-not-allowed transition-all">Add Network</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wallet Error Toast */}
      {walletError && <div className="fixed top-20 right-4 z-50 animate-[slideIn_300ms_ease-out]"><div className="bg-white border border-[#FF6B6B]/20 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2 max-w-sm"><Info size={14} className="text-[#DC2626] shrink-0" /><p className="text-xs text-[#DC2626]">{walletError}</p></div></div>}

      {/* ====== WALLET MODAL ====== */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowWalletModal(false); setWalletError(''); }}>
          <div className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl border border-[#F0F0F0] shadow-2xl w-full max-w-md overflow-hidden animate-[scaleIn_300ms_ease-out]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 pt-6 pb-3 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FFF5EB] flex items-center justify-center shadow-sm border border-[#FDE4CC]">
                  <img src={metamaskLogo} alt="MetaMask" className="w-8 h-8" />
                </div>
                <div className="w-14 h-14 rounded-2xl bg-[#F3EEFF] flex items-center justify-center shadow-sm border border-[#E0D5F5]">
                  <img src={phantomLogo} alt="Phantom" className="w-8 h-8" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A]">Connect Wallet</h3>
              <p className="text-xs text-[#9B9B9B] mt-1">Connect via browser extension or mobile app</p>
            </div>

            {/* Body */}
            <div className="px-5 pb-5 space-y-3">
              {/* MetaMask */}
              <button
                onClick={() => connectWallet('metamask')}
                disabled={connecting}
                className="w-full p-4 rounded-2xl border-2 border-[#F0F0F0] hover:border-[#F6851B]/40 hover:bg-[#FFF8F2] transition-all flex items-center gap-4 text-left group disabled:opacity-50 disabled:cursor-wait"
              >
                <div className="w-11 h-11 rounded-xl bg-[#FFF0E3] flex items-center justify-center shrink-0 border border-[#FDE4CC]">
                  <img src={metamaskLogo} alt="MetaMask" className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#1A1A1A] text-sm">MetaMask</p>
                    {detectWallets.metamask ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4ADE80]/10 text-[#166534] font-medium">Installed</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B6B]/10 text-[#DC2626] font-medium">Not installed</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#9B9B9B] mt-0.5">EVM Chains: Ethereum, Arbitrum, BSC</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-[10px] text-[#6B6B6B]"><span className="text-[10px]">💻</span> Extension</span>
                    <span className="flex items-center gap-1 text-[10px] text-[#6B6B6B]"><span className="text-[10px]">📱</span> Mobile app</span>
                  </div>
                </div>
                <ArrowRight size={18} className="text-[#B8A9E8] group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Phantom */}
              <button
                onClick={() => connectWallet('phantom')}
                disabled={connecting}
                className="w-full p-4 rounded-2xl border-2 border-[#F0F0F0] hover:border-[#8B5CF6]/40 hover:bg-[#F8F5FF] transition-all flex items-center gap-4 text-left group disabled:opacity-50 disabled:cursor-wait"
              >
                <div className="w-11 h-11 rounded-xl bg-[#F0EBFF] flex items-center justify-center shrink-0 border border-[#E0D5F5]">
                  <img src={phantomLogo} alt="Phantom" className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[#1A1A1A] text-sm">Phantom</p>
                    {detectWallets.phantom ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4ADE80]/10 text-[#166534] font-medium">Installed</span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF6B6B]/10 text-[#DC2626] font-medium">Not installed</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#9B9B9B] mt-0.5">Solana, Ethereum, Polygon & more</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-[10px] text-[#6B6B6B]"><span className="text-[10px]">💻</span> Extension</span>
                    <span className="flex items-center gap-1 text-[10px] text-[#6B6B6B]"><span className="text-[10px]">📱</span> Mobile app</span>
                  </div>
                </div>
                <ArrowRight size={18} className="text-[#9945FF] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-1">
              {connecting ? (
                <div className="flex items-center justify-center gap-2 py-3">
                  <RefreshCw size={14} className="animate-spin text-[#B8A9E8]" />
                  <span className="text-xs text-[#6B6B6B]">Connecting...</span>
                </div>
              ) : (
                <div className="bg-[#FAFAF8] rounded-xl p-3 flex items-start gap-2">
                  <Info size={12} className="text-[#9B9B9B] mt-0.5 shrink-0" />
                  <p className="text-[10px] text-[#9B9B9B] leading-relaxed">
                    By connecting, you agree to use this DEX for <strong className="text-[#1A1A1A]">testnet purposes only</strong>.
                    {!detectWallets.metamask && !detectWallets.phantom && ' No wallet detected — you will be redirected to install.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====== CONTENT ====== */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-8"><div key={activeTab} className="animate-[fadeIn_300ms_ease-out]">

        {/* ============ SWAP TAB ============ */}
        {activeTab === 'swap' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 max-w-xl mx-auto w-full lg:mx-0">
              <div className="bg-white rounded-2xl border border-[#F0F0F0] p-4 lg:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm lg:text-base font-bold text-[#1A1A1A] flex items-center gap-2"><Repeat size={16} className={isSolana ? 'text-[#9945FF]' : 'text-[#B8A9E8]'} /> Swap {isSolana && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#9945FF]/10 text-[#9945FF]">Solana</span>}</h2>
                  <button onClick={() => setShowSettings(s => !s)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#FAFAF8]"><Settings size={14} className="text-[#6B6B6B]" /></button>
                </div>
                {showSettings && (
                  <div className="mb-4 p-4 bg-[#FAFAF8] rounded-xl border border-[#F0F0F0]">
                    <p className="text-xs font-semibold text-[#1A1A1A] mb-2">Slippage tolerance</p>
                    <div className="flex gap-2 flex-wrap">
                      {[0.1, 0.5, 1, 3].map(s => (<button key={s} onClick={() => setSlippage(s)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${slippage === s ? 'bg-[#B8A9E8] text-[#1A1A1A]' : 'bg-white border border-[#F0F0F0] text-[#6B6B6B]'}`}>{s}%</button>))}
                      <div className="flex items-center gap-1 bg-white border border-[#F0F0F0] rounded-full px-3"><input type="number" value={slippage} onChange={e => setSlippage(Number(e.target.value) || 0)} className="w-12 text-xs text-right bg-transparent focus:outline-none text-[#1A1A1A]" /><span className="text-xs text-[#9B9B9B]">%</span></div>
                    </div>
                  </div>
                )}
                <TokenInput label="You pay" token={fromToken} amount={amount} onAmountChange={setAmount} onPickerOpen={() => setShowFromPicker(true)} balance={fromBalance} usd={fromUsd} showMax />
                <div className="flex justify-center -my-2 relative z-10"><button onClick={handleSwitch} className="w-9 h-9 rounded-full bg-white border-2 border-[#FAFAF8] shadow-sm hover:shadow-md hover:rotate-180 transition-all duration-300 flex items-center justify-center text-[#1A1A1A]"><ArrowDownUp size={14} /></button></div>
                <TokenInput label="You receive" token={toToken} amount={quote ? fmt(quote.amountOut, 6) : ''} readonly onPickerOpen={() => setShowToPicker(true)} balance={toToken ? Number(toToken.balance || 0) : 0} usd={toUsd} />

                {isSolana && <div className="mt-4 p-3 rounded-xl bg-[#9945FF]/5 border border-[#9945FF]/15 flex items-center gap-2"><span className="text-lg">\u25ce</span><span className="text-xs text-[#7C3AED]">Solana DEX is in alpha. Swaps simulated on Devnet.</span></div>}

                {quote && !isSolana && (
                  <div className="mt-4 p-4 bg-[#FAFAF8] rounded-xl border border-[#F0F0F0] space-y-2">
                    <Row label="Rate" value={`1 ${fromToken.symbol} = ${fmt(quote.rate, 6)} ${toToken.symbol}`} />
                    <Row label="Fee" value={`${fmt(quote.fee, 6)} ${fromToken.symbol} (${(quote.feeBps / 100).toFixed(2)}%)`} accent={ACCENT.amber} />
                    <Row label="Price impact" value={quote.priceImpact.toFixed(3) + '%'} accent={quote.priceImpact > 3 ? ACCENT.coral : quote.priceImpact > 1 ? ACCENT.amber : ACCENT.green} />
                    <Row label="Min received" value={`${fmt(quote.minOut, 6)} ${toToken.symbol}`} />
                    {activePool && <Row label="Pool" value={`#${activePool.id} \u00b7 ${activePool.tokenA}/${activePool.tokenB}`} />}
                  </div>
                )}
                {fromToken && toToken && amount && !activePool && !isSolana && <div className="mt-4 p-3 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 flex items-center gap-2"><Info size={14} className="text-[#DC2626]" /><span className="text-xs text-[#DC2626]">No pool for {fromToken.symbol}/{toToken.symbol} on {CHAINS[selectedChain]?.short}.</span></div>}
                {swapMsg && <div className={`mt-4 p-3 rounded-xl border flex items-center gap-2 ${swapMsg.includes('failed') ? 'bg-[#FF6B6B]/10 border-[#FF6B6B]/20' : 'bg-[#4ADE80]/10 border-[#4ADE80]/20'}`}>{swapMsg.includes('failed') ? <XCircle size={14} className="text-[#DC2626]" /> : <CheckCircle2 size={14} className="text-[#166534]" />}<span className={`text-xs ${swapMsg.includes('failed') ? 'text-[#DC2626]' : 'text-[#166534]'}`}>{swapMsg}</span></div>}

                <button onClick={handleSwap} disabled={swapping || !amount || Number(amount) <= 0 || (!quote && !isSolana) || (!activePool && !isSolana)}
                  className={`w-full mt-5 py-3.5 rounded-full font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isSolana ? 'bg-[#9945FF] text-white hover:bg-[#7C3AED]' : 'bg-[#B8A9E8] text-[#1A1A1A] hover:bg-[#A89AD8]'} hover:shadow-md`}>
                  {swapping ? (<><RefreshCw size={14} className="animate-spin" /><span>Swapping\u2026</span></>) : !amount || Number(amount) <= 0 ? ('Enter an amount') : (!activePool && !isSolana) ? ('No pool available') : isSolana ? (<><span>\u26a1 Swap on Solana</span></>) : (<><Zap size={14} /><span>Swap {fromToken?.symbol} \u2192 {toToken?.symbol}</span></>)}
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <StatCard icon={Coins} c={isSolana ? ACCENT.solana : ACCENT.lilac} label="Tokens on chain" value={portfolioStats.totalTokens} />
              <StatCard icon={Droplets} c={ACCENT.teal} label="Pools available" value={chainPools.length} />
              <div className="bg-white rounded-2xl border border-[#F0F0F0] p-4 lg:p-5">
                <h3 className="text-sm font-extrabold text-[#1A1A1A] mb-3 flex items-center gap-2"><Activity size={14} className="text-[#F5A623]" /> Recent</h3>
                <div className="space-y-2.5">
                  {chainTxs.slice(0, 4).map((tx: any) => { const t = TX_TYPE[safe(tx.type)] || TX_TYPE.swap; const s = TX_STATUS[safe(tx.status)] || TX_STATUS.pending; const Icon = t.i; const SIcon = s.i; return (<div key={tx.id} className="flex items-center gap-3 text-xs"><div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: t.c + '15' }}><Icon size={12} style={{ color: t.c }} /></div><div className="flex-1 min-w-0"><p className="font-medium text-[#1A1A1A] truncate">{tx.type === 'faucet' ? `+${fmt(tx.amountOut)} ${tx.tokenOut}` : `${fmt(tx.amountIn)} ${tx.tokenIn} \u2192 ${fmt(tx.amountOut)} ${tx.tokenOut}`}</p><p className="text-[10px] text-[#6B6B6B] font-semibold">{timeAgo(tx.timestamp)}</p></div><SIcon size={12} style={{ color: s.c }} /></div>); })}
                  {chainTxs.length === 0 && <div className="text-center py-6"><History size={20} className="mx-auto mb-2 text-[#E0E0E0]" /><p className="text-xs text-[#9B9B9B]">No transactions yet</p></div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ POOLS TAB ============ */}
        {activeTab === 'pools' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Droplets} c={ACCENT.teal} label="Total pools" value={chainPools.length} />
              <StatCard icon={Zap} c={ACCENT.green} label="Best APR" value={(chainPools.length > 0 ? Math.max(...chainPools.map((p: any) => Number(p.apr || 0))).toFixed(1) : '0') + '%'} />
              <StatCard icon={Activity} c={isSolana ? ACCENT.solana : ACCENT.lilac} label="Transactions" value={chainTxs.length} />
              <StatCard icon={Layers} c={ACCENT.amber} label="Testnet" value={'⚡'} />
            </div>
            <div className="bg-white rounded-2xl border border-[#F0F0F0] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#F0F0F0] flex items-center justify-between"><h3 className="text-sm font-extrabold text-[#1A1A1A] flex items-center gap-2"><Droplets size={14} className="text-[#4ECDC4]" /> Pools — {CHAINS[selectedChain]?.short}</h3><span className="text-[11px] text-[#9B9B9B]">{chainPools.length} pools</span></div>
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[10px] uppercase tracking-wider text-[#9B9B9B] font-semibold"><th className="text-left px-5 py-3">Pool</th><th className="text-right px-3 py-3">APR</th><th className="text-right px-3 py-3">Fee</th><th className="text-right px-5 py-3"></th></tr></thead><tbody className="divide-y divide-[#F0F0F0]">
                {chainPools.map((p: any) => { const tA = tokens.find((t: any) => t.symbol === p.tokenA && t.chain === selectedChain); const tB = tokens.find((t: any) => t.symbol === p.tokenB && t.chain === selectedChain); return (
                  <tr key={p.id} className="hover:bg-[#FAFAF8] transition-colors group">
                    <td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="flex -space-x-2"><span className="w-8 h-8 rounded-full bg-[#B8A9E8]/15 border-2 border-white flex items-center justify-center text-sm">{tA?.logo || '\u25c6'}</span><span className="w-8 h-8 rounded-full bg-[#4ECDC4]/15 border-2 border-white flex items-center justify-center text-sm">{tB?.logo || '\u25c7'}</span></div><div><p className="font-semibold text-[#1A1A1A] text-sm">{p.tokenA} / {p.tokenB}</p><p className="text-[10px] text-[#6B6B6B] font-semibold">Pool #{p.id}</p></div></div></td>
                    <td className="px-3 py-3.5 text-right"><span className="font-semibold text-[#166534]">{Number(p.apr || 0).toFixed(1)}%</span></td>
                    <td className="px-3 py-3.5 text-right"><span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-[#F5A623]/10 text-[#92400E] border-[#F5A623]/20">{(Number(p.feeBps) / 100).toFixed(2)}%</span></td>
                    <td className="px-5 py-3.5 text-right"><button onClick={() => { setSelectedChain(safe(p.chain)); setFromToken(tA || null); setToToken(tB || null); setActiveTab('swap'); }} className="opacity-0 group-hover:opacity-100 text-xs font-semibold text-[#5B21B6] hover:underline flex items-center gap-1 ml-auto transition-opacity">Swap <ArrowRight size={11} /></button></td>
                  </tr>
                );})}
                {chainPools.length === 0 && <tr><td colSpan={4} className="text-center py-12"><Droplets size={28} className="mx-auto mb-3 text-[#E0E0E0]" /><p className="text-sm text-[#9B9B9B]">No pools on {CHAINS[selectedChain]?.short} yet</p></td></tr>}
              </tbody></table></div>
            </div>
          </div>
        )}

        {/* ============ PORTFOLIO TAB ============ */}
        {activeTab === 'portfolio' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Wallet} c={isSolana ? ACCENT.solana : ACCENT.lilac} label="Tokens held" value={portfolioStats.totalTokens} />
              <StatCard icon={Droplets} c={ACCENT.teal} label="Pools" value={chainPools.length} />
              <StatCard icon={Layers} c={ACCENT.amber} label="Network" value={CHAINS[selectedChain]?.short || ''} />
              <StatCard icon={Activity} c={ACCENT.green} label="Total txs" value={chainTxs.length} />
            </div>
            <div className="bg-white rounded-2xl border border-[#F0F0F0] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#F0F0F0]"><h3 className="text-sm font-extrabold text-[#1A1A1A] flex items-center gap-2"><Coins size={14} className="text-[#B8A9E8]" /> Your tokens</h3></div>
              <div className="divide-y divide-[#F0F0F0]">
                {chainTokens.map((t: any) => { const value = Number(t.balance || 0) * Number(t.priceUsd || 0); const pct = portfolioStats.totalUsd > 0 ? (value / portfolioStats.totalUsd) * 100 : 0; return (
                  <div key={t.id} className="px-5 py-3.5 hover:bg-[#FAFAF8] transition-colors flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FAFAF8] border border-[#F0F0F0] flex items-center justify-center text-lg">{t.logo || t.symbol?.slice(0, 1)}</div>
                    <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="font-semibold text-[#1A1A1A] text-sm">{t.symbol}</p><span className="text-[10px] px-2 py-0.5 rounded-md bg-[#F0F0F0] text-[#6B6B6B] font-mono">{shortAddr(t.address)}</span></div><p className="text-xs text-[#6B6B6B] truncate">{t.name}</p></div>
                    <div className="text-right"><p className="text-sm font-extrabold text-[#1A1A1A]">{fmt(t.balance, 4)} <span className="text-[#9B9B9B] font-normal text-xs">{t.symbol}</span></p><p className="text-[11px] text-[#6B6B6B]">{fmtUsd(value)} \u00b7 {pct.toFixed(1)}%</p></div>
                    <button onClick={() => { setFromToken(t); setActiveTab('swap'); }} className="w-8 h-8 rounded-full hover:bg-white border border-[#F0F0F0] flex items-center justify-center text-[#1A1A1A] hover:shadow-sm transition-all"><Repeat size={12} /></button>
                  </div>
                );})}
                {chainTokens.length === 0 && <div className="text-center py-12"><Coins size={28} className="mx-auto mb-3 text-[#E0E0E0]" /><p className="text-sm text-[#9B9B9B]">No tokens on {CHAINS[selectedChain]?.short}</p></div>}
              </div>
            </div>
          </div>
        )}

        {/* ============ HISTORY TAB ============ */}
        {activeTab === 'history' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(TX_TYPE).map(([k, t]) => { const Icon = (t as any).i; const count = chainTxs.filter((tx: any) => safe(tx.type) === k).length; return <StatCard key={k} icon={Icon} c={(t as any).c} label={(t as any).label} value={count} />; })}
            </div>
            <div className="bg-white rounded-2xl border border-[#F0F0F0] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#F0F0F0] flex items-center justify-between"><h3 className="text-sm font-extrabold text-[#1A1A1A] flex items-center gap-2"><History size={14} className="text-[#B8A9E8]" /> Transaction history</h3><span className="text-[11px] text-[#9B9B9B]">{chainTxs.length} transactions</span></div>
              <div className="divide-y divide-[#F0F0F0]">
                {chainTxs.map((tx: any) => { const t = TX_TYPE[safe(tx.type)] || TX_TYPE.swap; const s = TX_STATUS[safe(tx.status)] || TX_STATUS.pending; const Icon = t.i; const SIcon = s.i; return (
                  <div key={tx.id} className="px-5 py-3.5 hover:bg-[#FAFAF8] transition-colors flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: t.c + '15' }}><Icon size={14} style={{ color: t.c }} /></div>
                    <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-extrabold text-[#1A1A1A]">{t.label}</p><span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border" style={{ backgroundColor: s.c + '1A', color: s.t, borderColor: s.c + '33' }}>{tx.status}</span></div><p className="text-xs text-[#6B6B6B] mt-0.5">{tx.type === 'faucet' ? <span>Claimed <strong className="text-[#1A1A1A]">{fmt(tx.amountOut)} {tx.tokenOut}</strong></span> : <span><strong className="text-[#1A1A1A]">{fmt(tx.amountIn)} {tx.tokenIn}</strong> \u2192 <strong className="text-[#1A1A1A]">{fmt(tx.amountOut)} {tx.tokenOut}</strong></span>}</p></div>
                    <div className="text-right shrink-0"><p className="text-[11px] text-[#6B6B6B] flex items-center justify-end gap-1"><Clock size={10} /> {timeAgo(tx.timestamp)}</p><span className="text-[10px] text-[#9B9B9B] font-mono flex items-center justify-end gap-1 mt-0.5">{shortAddr(tx.txHash)} <ExternalLink size={9} /></span></div>
                    <SIcon size={14} style={{ color: s.c }} />
                  </div>
                );})}
                {chainTxs.length === 0 && <div className="text-center py-12"><History size={28} className="mx-auto mb-3 text-[#E0E0E0]" /><p className="text-sm text-[#9B9B9B]">No transactions on {CHAINS[selectedChain]?.short}</p></div>}
              </div>
            </div>
          </div>
        )}
      </div></div>

      {/* ====== MODALS ====== */}
      {showFromPicker && <TokenPicker tokens={chainTokens} excludeSymbol={toToken?.symbol} onPick={(t: any) => { setFromToken(t); setShowFromPicker(false); }} onClose={() => setShowFromPicker(false)} />}
      {showToPicker && <TokenPicker tokens={chainTokens} excludeSymbol={fromToken?.symbol} onPick={(t: any) => { setToToken(t); setShowToPicker(false); }} onClose={() => setShowToPicker(false)} />}
    </div>
  );
}

/* ====== SUB-COMPONENTS ====== */

function StatCard({ icon: Icon, c, label, value }: any) {
  return (
    <div className="bg-white rounded-2xl border border-[#F0F0F0] p-5 shadow-md hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: c + '15' }}><Icon size={14} style={{ color: c }} /></div>
        <span className="text-2xl font-bold text-[#1A1A1A] tabular-nums">{value}</span>
      </div>
      <p className="text-[11px] text-[#3A3A3A] font-bold">{label}</p>
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
        {token && <span className="text-[11px] text-[#6B6B6B]">Balance: <strong className="text-[#1A1A1A]">{fmt(balance, 4)}</strong>{showMax && balance > 0 && <button onClick={() => onAmountChange && onAmountChange(String(balance))} className="ml-1.5 text-[10px] font-bold text-[#5B21B6] hover:underline">MAX</button>}</span>}
      </div>
      <div className="flex items-center gap-3">
        <input type="number" inputMode="decimal" placeholder="0.0" value={amount} readOnly={readonly} onChange={e => onAmountChange && onAmountChange(e.target.value)} className="flex-1 min-w-0 bg-transparent text-2xl font-bold text-[#1A1A1A] placeholder:text-[#E0E0E0] focus:outline-none tabular-nums" />
        <button onClick={onPickerOpen} className="flex items-center gap-2 bg-white border border-[#F0F0F0] rounded-full px-3 py-2 hover:shadow-sm transition-all shrink-0">
          {token ? (<><span className="w-6 h-6 rounded-full bg-[#FAFAF8] flex items-center justify-center text-sm">{token.logo || token.symbol?.slice(0, 1)}</span><span className="text-sm font-extrabold text-[#1A1A1A]">{token.symbol}</span><ChevronDown size={12} className="text-[#9B9B9B]" /></>) : (<><span className="text-sm font-semibold text-[#5B21B6]">Select</span><ChevronDown size={12} className="text-[#9B9B9B]" /></>)}
        </button>
      </div>
      
    </div>
  );
}

function TokenPicker({ tokens, excludeSymbol, onPick, onClose }: any) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const qq = q.toLowerCase();
    return tokens.filter((t: any) => safe(t.symbol) !== excludeSymbol).filter((t: any) => !q || safe(t.symbol).toLowerCase().includes(qq) || safe(t.name).toLowerCase().includes(qq) || safe(t.address).toLowerCase().includes(qq));
  }, [tokens, excludeSymbol, q]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_200ms_ease-out]" onClick={onClose}>
      <div className="absolute inset-0 bg-[#1A1A1A]/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl border border-[#F0F0F0] shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-[#F0F0F0]"><div className="flex items-center justify-between mb-3"><h3 className="text-base font-bold text-[#1A1A1A]">Select a token</h3><button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-[#FAFAF8] flex items-center justify-center text-[#6B6B6B]">\u2715</button></div><div className="relative"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9B9B9B]" /><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or paste address" className="w-full pl-10 pr-4 py-2.5 text-sm border border-[#F0F0F0] rounded-full bg-white text-[#1A1A1A] placeholder:text-[#9B9B9B] focus:outline-none focus:border-[#E0E0E0] focus:ring-2 focus:ring-[#1A1A1A]/5 transition-all" /></div></div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((t: any) => (<button key={t.id} onClick={() => onPick(t)} className="w-full px-5 py-3 hover:bg-[#FAFAF8] transition-colors flex items-center gap-3 text-left"><div className="w-10 h-10 rounded-full bg-[#FAFAF8] border border-[#F0F0F0] flex items-center justify-center text-lg shrink-0">{t.logo || t.symbol?.slice(0, 1)}</div><div className="flex-1 min-w-0"><p className="font-semibold text-[#1A1A1A] text-sm">{t.symbol}</p><p className="text-[11px] text-[#9B9B9B] truncate">{t.name} \u00b7 {shortAddr(t.address)}</p></div><div className="text-right shrink-0"><p className="text-sm font-extrabold text-[#1A1A1A] tabular-nums">{fmt(t.balance, 4)}</p></div></button>))}
          {filtered.length === 0 && <div className="text-center py-12"><Coins size={24} className="mx-auto mb-2 text-[#E0E0E0]" /><p className="text-sm text-[#9B9B9B]">No tokens match "{q}"</p></div>}
        </div>
      </div>
    </div>
  );
}
