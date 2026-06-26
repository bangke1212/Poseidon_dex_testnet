import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ArrowDownUp, Wallet, Droplets, History, Repeat, Settings, ChevronDown,
  TrendingUp, Coins, Zap, CheckCircle2, Clock, XCircle, ExternalLink, Search,
  Activity, Layers, Sparkles, Info, ArrowRight, Droplet, RefreshCw, Plus,
  LogOut, WifiOff, Waves
} from 'lucide-react';
import tokensData from './data/tokens.json';
import poolsData from './data/pools.json';
import txData from './data/transactions.json';
import metamaskLogo from './assets/metamask.svg';
import phantomLogo from './assets/phantom.svg';
import poseidonLogo from './assets/poseidon-wave-logo.png';

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

const ACCENT = {
  cyan:   '#22d3ee',
  teal:   '#2dd4bf',
  blue:   '#38bdf8',
  indigo: '#818cf8',
  amber:  '#fbbf24',
  coral:  '#f87171',
  green:  '#34d399',
  solana: '#9945FF',
};

const CHAINS: Record<string, { label: string; short: string; color: string; icon: string; type: 'evm' | 'solana'; chainId: number | string; rpcUrl: string; nativeToken: string; testnet: boolean }> = {
  sepolia:         { label: 'Sepolia ETH Testnet',      short: 'Sepolia',  color: ACCENT.blue,   icon: '◆', type: 'evm',    chainId: 11155111, rpcUrl: 'https://ethereum-sepolia.publicnode.com',        nativeToken: 'ETH',  testnet: true },
  arbitrumSepolia: { label: 'Arbitrum Sepolia Testnet', short: 'Arbitrum', color: ACCENT.cyan,   icon: '◈', type: 'evm',    chainId: 421614,   rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',          nativeToken: 'ETH',  testnet: true },
  bscTestnet:      { label: 'BSC Testnet',              short: 'BSC',      color: ACCENT.amber,  icon: '◇', type: 'evm',    chainId: 97,       rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',  nativeToken: 'tBNB', testnet: true },
  solanaDevnet:    { label: 'Solana Devnet',            short: 'Solana',   color: ACCENT.solana, icon: '◎', type: 'solana', chainId: 'devnet', rpcUrl: 'https://api.devnet.solana.com',                   nativeToken: 'SOL',  testnet: true },
};

const TX_STATUS: Record<string, any> = {
  success: { c: ACCENT.green,  t: '#065f46', i: CheckCircle2 },
  pending: { c: ACCENT.amber,  t: '#92400e', i: Clock },
  failed:  { c: ACCENT.coral,  t: '#dc2626', i: XCircle }
};

const TX_TYPE: Record<string, any> = {
  swap:             { c: ACCENT.cyan,   label: 'Swap',            i: Repeat },
  add_liquidity:    { c: ACCENT.teal,   label: 'Add Liquidity',   i: Plus },
  remove_liquidity: { c: ACCENT.coral,  label: 'Remove Liquidity',i: Droplets },
  faucet:           { c: ACCENT.green,  label: 'Faucet',          i: Droplet }
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
  const [customChains, setCustomChains] = useState<Record<string, any>>({});
  const [showAddNetwork, setShowAddNetwork] = useState(false);
  const [newNetwork, setNewNetwork] = useState({ label: '', chainId: '', rpcUrl: '', nativeToken: 'ETH', icon: '◆', color: '#22d3ee' });
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapMsg, setSwapMsg] = useState('');

  const allChains = useMemo(() => ({ ...CHAINS, ...customChains }), [customChains]);
  const chainTokens = useMemo(() => tokens.filter((t: any) => safe(t.chain) === selectedChain), [tokens, selectedChain]);
  const chainPools  = useMemo(() => pools.filter((p: any) => safe(p.chain) === selectedChain), [pools, selectedChain]);
  const chainTxs    = useMemo(() => transactions.filter((t: any) => safe(t.chain) === selectedChain), [transactions, selectedChain]);
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
            throw new Error('Opening MetaMask… Approve in app.');
          }
          window.open('https://metamask.io/download/', '_blank');
          throw new Error('MetaMask not installed. Opening download page…');
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
            throw new Error('Opening Phantom… Approve in app.');
          }
          window.open('https://phantom.app/download', '_blank');
          throw new Error('Phantom not installed. Opening download page…');
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
    return chainPools.find((p: any) =>
      (p.tokenA === fromToken.symbol && p.tokenB === toToken.symbol) ||
      (p.tokenA === toToken.symbol   && p.tokenB === fromToken.symbol)
    );
  }, [chainPools, fromToken, toToken]);

  const quote = useMemo(() => {
    if (!fromToken || !toToken || !amount || Number(amount) <= 0 || !activePool || isSolana) return null;
    const isAtoB = activePool.tokenA === fromToken.symbol;
    const rIn  = isAtoB ? activePool.reserveA : activePool.reserveB;
    const rOut = isAtoB ? activePool.reserveB : activePool.reserveA;
    const amt = Number(amount);
    const feeBps = activePool.feeBps || 30;
    const amtAfter = amt * (10000 - feeBps) / 10000;
    const amtOut   = (amtAfter * rOut) / (rIn + amtAfter);
    const fee = amt * feeBps / 10000;
    const pi  = Math.abs(((rIn + amtAfter) / rIn - 1 - amtAfter / rIn) * 100);
    return { amountOut: amtOut, fee, priceImpact: pi, minOut: amtOut * (100 - slippage) / 100, rate: amtOut / amt, feeBps };
  }, [fromToken, toToken, amount, slippage, activePool, isSolana]);

  const fromBalance   = fromToken ? Number(fromToken.balance || 0) : 0;
  const fromUsd       = fromToken && amount ? Number(amount) * Number(fromToken.priceUsd || 0) : 0;
  const toUsd         = toToken && quote ? quote.amountOut * Number(toToken.priceUsd || 0) : 0;

  const portfolioStats = useMemo(() => ({
    totalUsd:    chainTokens.reduce((s: number, t: any) => s + Number(t.balance || 0) * Number(t.priceUsd || 0), 0),
    totalTokens: chainTokens.length,
    totalTvl:    chainPools.reduce((s: number, p: any) => s + Number(p.tvlUsd || 0), 0),
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
      txHash: isSolana
        ? ('Sol:' + Math.random().toString(36).slice(2, 10) + '...')
        : ('0x' + Math.random().toString(16).slice(2).padEnd(64, '0').slice(0, 64)),
      status: 'success', timestamp: new Date().toISOString(), chain: selectedChain
    };
    setTransactions(prev => [newTx, ...prev]);
    setSwapMsg((isSolana ? '⚡ Solana ' : '') + 'Swap submitted! ' + fmt(Number(amount)) + ' ' + fromToken.symbol + ' → ' + fmt(quote?.amountOut || 0) + ' ' + toToken.symbol);
    setAmount(''); setTimeout(() => setSwapMsg(''), 5000); setSwapping(false);
  };

  const handleChainChange = (chainKey: string) => {
    const chain = allChains[chainKey];
    if (!chain) return;
    if (connectedWallet?.type === 'phantom' && chain.type !== 'solana') { setWalletError('Phantom only supports Solana'); setTimeout(() => setWalletError(''), 3000); return; }
    if (connectedWallet?.type === 'metamask' && chain.type !== 'evm')   { setWalletError('MetaMask only supports EVM chains.'); setTimeout(() => setWalletError(''), 3000); return; }
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
    setNewNetwork({ label: '', chainId: '', rpcUrl: '', nativeToken: 'ETH', icon: '◆', color: '#22d3ee' });
    setShowAddNetwork(false);
    setSelectedChain(id);
    setShowChainPicker(false);
  };

  const tabs: Array<{ id: 'swap' | 'pools' | 'portfolio' | 'history'; label: string; icon: any }> = [
    { id: 'swap',      label: 'Swap',      icon: Repeat    },
    { id: 'pools',     label: 'Pools',     icon: Droplets  },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet    },
    { id: 'history',   label: 'History',   icon: History   }
  ];

  return (
    <div className="min-h-screen relative">
      {/* ===== OCEAN BACKGROUND ===== */}
      <div className="ocean-bg" />

      {/* ===== WAVES ===== */}
      <div className="wave-container">
        <div className="wave wave-1" />
        <div className="wave wave-2" />
        <div className="wave wave-3" />
      </div>

      {/* ===== BUBBLES ===== */}
      <div className="bubbles">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bubble" />
        ))}
      </div>

      {/* ===== FISH ===== */}
      <div className="fish fish-1">🐟</div>
      <div className="fish fish-2">🐠</div>
      <div className="fish fish-3">🐡</div>

      {/* ====== HEADER ====== */}
      <div className="sticky top-0 z-40 header-ocean">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <img src={poseidonLogo} alt="Poseidon" className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl object-contain shadow-lg" style={{ boxShadow: "0 0 20px rgba(34,211,238,0.5)" }} />
            <div>
              <h1 className="text-lg lg:text-xl font-black tracking-tight" style={{ color: '#7dd3fc', textShadow: '0 0 20px rgba(125,211,252,0.5)' }}>
                Poseidon DEX
              </h1>
              <p className="text-xs font-semibold" style={{ color: '#38bdf8' }}>Multi-chain · EVM + Solana</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChainPicker(true)}
              className="flex items-center gap-2 text-sm font-bold rounded-full pl-3 pr-3 py-2 transition-all"
              style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.3)', color: '#7dd3fc' }}
            >
              <span className="text-base" style={{ color: (allChains as any)[selectedChain]?.color }}>{(allChains as any)[selectedChain]?.icon}</span>
              <span className="hidden sm:inline max-w-[100px] lg:max-w-none truncate">{(allChains as any)[selectedChain]?.label || selectedChain}</span>
              <ChevronDown size={14} style={{ color: '#38bdf8' }} />
            </button>
            {connectedWallet ? (
              <div className="flex items-center gap-1">
                <button onClick={disconnectWallet}
                  className="flex items-center gap-2 text-sm font-bold px-3 lg:px-4 py-2 rounded-full transition-all group"
                  style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.3)', color: '#7dd3fc' }}
                  title={connectedWallet.address}
                >
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  {connectedWallet.type === 'metamask'
                    ? <img src={metamaskLogo} alt="MetaMask" className="w-4 h-4" />
                    : <img src={phantomLogo}  alt="Phantom"  className="w-4 h-4" />}
                  <span className="font-mono text-[10px] lg:text-xs hidden sm:inline">{shortAddr(connectedWallet.address)}</span>
                  <LogOut size={11} className="opacity-60 group-hover:opacity-100" />
                </button>
                {chainMismatch && (
                  <span className="text-[10px] px-2 py-1 rounded-full font-medium animate-pulse"
                    style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                    <WifiOff size={10} className="inline mr-1" />Wrong network
                  </span>
                )}
              </div>
            ) : (
              <button onClick={() => setShowWalletModal(true)}
                className="btn-ocean flex items-center gap-2 text-sm font-extrabold px-5 py-2.5 rounded-full">
                <Wallet size={14} /><span>Connect</span>
              </button>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-3 lg:pb-4">
          <div className="flex gap-1 rounded-full p-1 w-fit overflow-x-auto"
            style={{ background: 'rgba(2,20,50,0.6)', border: '1px solid rgba(14,165,233,0.2)' }}>
            {tabs.map(t => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className="flex items-center gap-1.5 px-3 lg:px-4 py-2 text-sm font-bold rounded-full transition-all whitespace-nowrap"
                  style={active
                    ? { background: 'rgba(14,165,233,0.25)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.4)', boxShadow: '0 0 12px rgba(34,211,238,0.2)' }
                    : { color: 'rgba(125,211,252,0.7)', border: '1px solid transparent' }
                  }
                >
                  <Icon size={14} />{t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ====== CHAIN PICKER MODAL ====== */}
      {showChainPicker && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowChainPicker(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(2,10,30,0.85)', backdropFilter: 'blur(8px)' }} />
          <div className="relative glass-card rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-[slideUp_300ms_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 rounded-full" style={{ background: 'rgba(34,211,238,0.3)' }} /></div>
            <div className="px-6 pt-4 pb-2 flex items-center justify-between">
              <h3 className="text-base font-bold" style={{ color: '#7dd3fc' }}>Select Network</h3>
              <button onClick={() => setShowChainPicker(false)} className="w-7 h-7 rounded-full flex items-center justify-center transition-colors" style={{ color: '#38bdf8', background: 'rgba(14,165,233,0.1)' }}>✕</button>
            </div>
            <p className="px-6 pb-3 text-[11px]" style={{ color: 'rgba(125,211,252,0.5)' }}>Testnet networks for development and testing</p>
            <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-1">
              {Object.entries(allChains).map(([k, c]: [string, any]) => {
                const active = k === selectedChain;
                return (
                  <button key={k} onClick={() => handleChainChange(k)}
                    className="w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all"
                    style={active
                      ? { background: 'rgba(14,165,233,0.2)', border: '1px solid rgba(34,211,238,0.4)' }
                      : { background: 'transparent', border: '1px solid transparent' }
                    }
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ background: c.color + '20', color: c.color }}>{c.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-extrabold" style={{ color: '#e0f2fe' }}>{c.label}</p>
                        {c.testnet && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>TESTNET</span>}
                      </div>
                      <p className="text-[10px] mt-0.5" style={{ color: 'rgba(125,211,252,0.5)' }}>{c.type === 'solana' ? 'Solana' : 'EVM'} · Chain ID: {c.chainId} · {c.nativeToken}</p>
                    </div>
                    {active && <CheckCircle2 size={18} style={{ color: ACCENT.green }} />}
                  </button>
                );
              })}
            </div>
            {!showAddNetwork ? (
              <div className="px-4 pb-5 pt-2">
                <button onClick={() => setShowAddNetwork(true)}
                  className="w-full p-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium transition-all"
                  style={{ border: '1.5px dashed rgba(34,211,238,0.3)', color: 'rgba(34,211,238,0.7)' }}
                >
                  <Plus size={16} />Add Custom Testnet
                </button>
              </div>
            ) : (
              <div className="px-4 pb-5 pt-2" style={{ borderTop: '1px solid rgba(14,165,233,0.15)' }}>
                <p className="text-xs font-semibold mb-3" style={{ color: '#7dd3fc' }}>Add Custom EVM Testnet</p>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-xs font-bold block mb-1.5" style={{ color: 'rgba(125,211,252,0.7)' }}>Network Name</label>
                    <input value={newNetwork.label} onChange={e => setNewNetwork((p: any) => ({ ...p, label: e.target.value }))} placeholder="e.g. Polygon Mumbai" className="input-ocean w-full px-3 py-2 text-xs rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold block mb-1.5" style={{ color: 'rgba(125,211,252,0.7)' }}>Chain ID</label>
                      <input value={newNetwork.chainId} onChange={e => setNewNetwork((p: any) => ({ ...p, chainId: e.target.value }))} placeholder="e.g. 80001" className="input-ocean w-full px-3 py-2 text-xs rounded-xl" />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1.5" style={{ color: 'rgba(125,211,252,0.7)' }}>Native Token</label>
                      <input value={newNetwork.nativeToken} onChange={e => setNewNetwork((p: any) => ({ ...p, nativeToken: e.target.value }))} placeholder="MATIC" className="input-ocean w-full px-3 py-2 text-xs rounded-xl" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1.5" style={{ color: 'rgba(125,211,252,0.7)' }}>RPC URL</label>
                    <input value={newNetwork.rpcUrl} onChange={e => setNewNetwork((p: any) => ({ ...p, rpcUrl: e.target.value }))} placeholder="https://rpc-mumbai.maticvigil.com" className="input-ocean w-full px-3 py-2 text-xs rounded-xl" />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setShowAddNetwork(false)}
                    className="flex-1 py-2 rounded-full text-xs font-semibold transition-colors"
                    style={{ border: '1px solid rgba(14,165,233,0.3)', color: 'rgba(125,211,252,0.7)' }}>Cancel</button>
                  <button onClick={addCustomNetwork} disabled={!newNetwork.label || !newNetwork.chainId || !newNetwork.rpcUrl}
                    className="btn-ocean flex-1 py-2 rounded-full text-xs font-semibold disabled:opacity-40">Add Network</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wallet Error Toast */}
      {walletError && (
        <div className="fixed top-20 right-4 z-50 animate-[slideIn_300ms_ease-out]">
          <div className="glass-card rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2 max-w-sm">
            <Info size={14} style={{ color: ACCENT.coral }} className="shrink-0" />
            <p className="text-xs" style={{ color: ACCENT.coral }}>{walletError}</p>
          </div>
        </div>
      )}

      {/* ====== WALLET MODAL ====== */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowWalletModal(false); setWalletError(''); }}>
          <div className="absolute inset-0" style={{ background: 'rgba(2,10,30,0.9)', backdropFilter: 'blur(10px)' }} />
          <div className="relative glass-card rounded-3xl w-full max-w-md overflow-hidden animate-[scaleIn_300ms_ease-out]" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-3 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{ background: 'rgba(245,130,35,0.1)', border: '1px solid rgba(245,130,35,0.3)' }}>
                  <img src={metamaskLogo} alt="MetaMask" className="w-8 h-8" />
                </div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{ background: 'rgba(153,69,255,0.1)', border: '1px solid rgba(153,69,255,0.3)' }}>
                  <img src={phantomLogo} alt="Phantom" className="w-8 h-8" />
                </div>
              </div>
              <h3 className="text-lg font-bold" style={{ color: '#7dd3fc' }}>Connect Wallet</h3>
              <p className="text-xs mt-1" style={{ color: 'rgba(125,211,252,0.5)' }}>Connect via browser extension or mobile app</p>
            </div>
            <div className="px-5 pb-5 space-y-3">
              {/* MetaMask */}
              <button onClick={() => connectWallet('metamask')} disabled={connecting}
                className="w-full p-4 rounded-2xl flex items-center gap-4 text-left group transition-all disabled:opacity-50 disabled:cursor-wait"
                style={{ border: '1px solid rgba(245,130,35,0.2)', background: 'rgba(245,130,35,0.05)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(245,130,35,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(245,130,35,0.2)')}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(245,130,35,0.1)', border: '1px solid rgba(245,130,35,0.25)' }}>
                  <img src={metamaskLogo} alt="MetaMask" className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm" style={{ color: '#e0f2fe' }}>MetaMask</p>
                    {detectWallets.metamask
                      ? <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(52,211,153,0.15)', color: ACCENT.green }}>Installed</span>
                      : <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(248,113,113,0.15)', color: ACCENT.coral }}>Not installed</span>}
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(125,211,252,0.5)' }}>EVM Chains: Ethereum, Arbitrum, BSC</p>
                </div>
                <ArrowRight size={18} style={{ color: ACCENT.cyan }} />
              </button>
              {/* Phantom */}
              <button onClick={() => connectWallet('phantom')} disabled={connecting}
                className="w-full p-4 rounded-2xl flex items-center gap-4 text-left group transition-all disabled:opacity-50 disabled:cursor-wait"
                style={{ border: '1px solid rgba(153,69,255,0.2)', background: 'rgba(153,69,255,0.05)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(153,69,255,0.5)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(153,69,255,0.2)')}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(153,69,255,0.1)', border: '1px solid rgba(153,69,255,0.25)' }}>
                  <img src={phantomLogo} alt="Phantom" className="w-7 h-7" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm" style={{ color: '#e0f2fe' }}>Phantom</p>
                    {detectWallets.phantom
                      ? <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(52,211,153,0.15)', color: ACCENT.green }}>Installed</span>
                      : <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(248,113,113,0.15)', color: ACCENT.coral }}>Not installed</span>}
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: 'rgba(125,211,252,0.5)' }}>Solana, Ethereum, Polygon & more</p>
                </div>
                <ArrowRight size={18} style={{ color: ACCENT.solana }} />
              </button>
            </div>
            <div className="px-5 pb-5 pt-1">
              {connecting ? (
                <div className="flex items-center justify-center gap-2 py-3">
                  <RefreshCw size={14} className="animate-spin" style={{ color: ACCENT.cyan }} />
                  <span className="text-xs" style={{ color: 'rgba(125,211,252,0.7)' }}>Connecting…</span>
                </div>
              ) : (
                <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.15)' }}>
                  <Info size={12} className="shrink-0 mt-0.5" style={{ color: 'rgba(125,211,252,0.5)' }} />
                  <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(125,211,252,0.5)' }}>
                    By connecting, you agree to use this DEX for <strong style={{ color: '#7dd3fc' }}>testnet purposes only</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====== CONTENT ====== */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-8">
        <div key={activeTab} className="animate-[fadeIn_300ms_ease-out]">

          {/* ============ SWAP TAB ============ */}
          {activeTab === 'swap' && (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 max-w-xl mx-auto w-full lg:mx-0">
                <div className="glass-card rounded-2xl p-5 lg:p-7">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-sm lg:text-base font-bold flex items-center gap-2" style={{ color: '#7dd3fc' }}>
                      <Repeat size={16} style={{ color: isSolana ? ACCENT.solana : ACCENT.cyan }} />
                      Swap
                      {isSolana && <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(153,69,255,0.2)', color: ACCENT.solana }}>Solana</span>}
                    </h2>
                    <button onClick={() => setShowSettings(s => !s)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: 'rgba(14,165,233,0.1)' }}>
                      <Settings size={14} style={{ color: '#38bdf8' }} />
                    </button>
                  </div>

                  {showSettings && (
                    <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.15)' }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#7dd3fc' }}>Slippage tolerance</p>
                      <div className="flex gap-2 flex-wrap">
                        {[0.1, 0.5, 1, 3].map(s => (
                          <button key={s} onClick={() => setSlippage(s)}
                            className="px-3 py-1.5 rounded-full text-sm font-bold transition-all"
                            style={slippage === s
                              ? { background: 'rgba(34,211,238,0.2)', color: ACCENT.cyan, border: '1px solid rgba(34,211,238,0.4)' }
                              : { background: 'rgba(14,165,233,0.07)', color: 'rgba(125,211,252,0.6)', border: '1px solid rgba(14,165,233,0.15)' }
                            }>{s}%</button>
                        ))}
                        <div className="flex items-center gap-1 rounded-full px-3" style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.15)' }}>
                          <input type="number" value={slippage} onChange={e => setSlippage(Number(e.target.value) || 0)} className="w-14 text-sm text-right bg-transparent font-bold focus:outline-none" style={{ color: '#e0f2fe' }} />
                          <span className="text-xs" style={{ color: 'rgba(125,211,252,0.5)' }}>%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <TokenInput label="You pay" token={fromToken} amount={amount} onAmountChange={setAmount} onPickerOpen={() => setShowFromPicker(true)} balance={fromBalance} usd={fromUsd} showMax />
                  <div className="flex justify-center -my-2 relative z-10">
                    <button onClick={handleSwitch}
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:rotate-180"
                      style={{ background: 'rgba(14,165,233,0.2)', border: '2px solid rgba(34,211,238,0.3)', boxShadow: '0 0 12px rgba(34,211,238,0.2)' }}>
                      <ArrowDownUp size={14} style={{ color: ACCENT.cyan }} />
                    </button>
                  </div>
                  <TokenInput label="You receive" token={toToken} amount={quote ? fmt(quote.amountOut, 6) : ''} readonly onPickerOpen={() => setShowToPicker(true)} balance={toToken ? Number(toToken.balance || 0) : 0} usd={toUsd} />

                  {isSolana && (
                    <div className="mt-4 p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(153,69,255,0.1)', border: '1px solid rgba(153,69,255,0.3)' }}>
                      <span className="text-lg">◎</span>
                      <span className="text-xs" style={{ color: ACCENT.solana }}>Solana DEX is in alpha. Swaps simulated on Devnet.</span>
                    </div>
                  )}

                  {quote && !isSolana && (
                    <div className="mt-4 p-5 rounded-2xl space-y-2" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.18)' }}>
                      <Row label="Rate"         value={`1 ${fromToken.symbol} = ${fmt(quote.rate, 6)} ${toToken.symbol}`} />
                      <Row label="Fee"          value={`${fmt(quote.fee, 6)} ${fromToken.symbol} (${(quote.feeBps / 100).toFixed(2)}%)`} accent={ACCENT.amber} />
                      <Row label="Price impact" value={quote.priceImpact.toFixed(3) + '%'} accent={quote.priceImpact > 3 ? ACCENT.coral : quote.priceImpact > 1 ? ACCENT.amber : ACCENT.green} />
                      <Row label="Min received" value={`${fmt(quote.minOut, 6)} ${toToken.symbol}`} />
                      {activePool && <Row label="Pool" value={`#${activePool.id} · ${activePool.tokenA}/${activePool.tokenB}`} />}
                    </div>
                  )}

                  {fromToken && toToken && amount && !activePool && !isSolana && (
                    <div className="mt-4 p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
                      <Info size={14} style={{ color: ACCENT.coral }} />
                      <span className="text-xs" style={{ color: ACCENT.coral }}>No pool for {fromToken.symbol}/{toToken.symbol} on {CHAINS[selectedChain]?.short}.</span>
                    </div>
                  )}

                  {swapMsg && (
                    <div className="mt-4 p-3 rounded-xl flex items-center gap-2"
                      style={swapMsg.includes('failed')
                        ? { background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }
                        : { background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }}>
                      {swapMsg.includes('failed')
                        ? <XCircle size={14} style={{ color: ACCENT.coral }} />
                        : <CheckCircle2 size={14} style={{ color: ACCENT.green }} />}
                      <span className="text-xs" style={{ color: swapMsg.includes('failed') ? ACCENT.coral : ACCENT.green }}>{swapMsg}</span>
                    </div>
                  )}

                  <button onClick={handleSwap}
                    disabled={swapping || !amount || Number(amount) <= 0 || (!quote && !isSolana) || (!activePool && !isSolana)}
                    className={`w-full mt-5 py-3.5 rounded-full font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${isSolana ? '' : 'btn-ocean'}`}
                    style={isSolana ? { background: 'linear-gradient(135deg,#9945FF,#7C3AED)', color: '#fff', fontWeight: 700, boxShadow: '0 0 20px rgba(153,69,255,0.4)' } : {}}
                  >
                    {swapping
                      ? <><RefreshCw size={14} className="animate-spin" /><span>Swapping…</span></>
                      : !amount || Number(amount) <= 0
                        ? 'Enter an amount'
                        : !activePool && !isSolana
                          ? 'No pool available'
                          : isSolana
                            ? <span>⚡ Swap on Solana</span>
                            : <><Zap size={14} /><span>Swap {fromToken?.symbol} → {toToken?.symbol}</span></>
                    }
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-4">
                <StatCard icon={Coins}    c={isSolana ? ACCENT.solana : ACCENT.cyan}  label="Tokens on chain"  value={portfolioStats.totalTokens} />
                <StatCard icon={Droplets} c={ACCENT.teal}                             label="Pools available"  value={chainPools.length} />
                <div className="glass-card rounded-2xl p-4 lg:p-5">
                  <h3 className="text-base font-black mb-4 flex items-center gap-2" style={{ color: '#7dd3fc' }}>
                    <Activity size={14} style={{ color: ACCENT.amber }} /> Recent
                  </h3>
                  <div className="space-y-2.5">
                    {chainTxs.slice(0, 4).map((tx: any) => {
                      const t = TX_TYPE[safe(tx.type)] || TX_TYPE.swap;
                      const s = TX_STATUS[safe(tx.status)] || TX_STATUS.pending;
                      const Icon = t.i; const SIcon = s.i;
                      return (
                        <div key={tx.id} className="flex items-center gap-3 text-xs">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: t.c + '20' }}><Icon size={12} style={{ color: t.c }} /></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" style={{ color: '#e0f2fe' }}>
                              {tx.type === 'faucet'
                                ? `+${fmt(tx.amountOut)} ${tx.tokenOut}`
                                : `${fmt(tx.amountIn)} ${tx.tokenIn} → ${fmt(tx.amountOut)} ${tx.tokenOut}`}
                            </p>
                            <p className="text-xs" style={{ color: 'rgba(125,211,252,0.5)' }}>{timeAgo(tx.timestamp)}</p>
                          </div>
                          <SIcon size={12} style={{ color: s.c }} />
                        </div>
                      );
                    })}
                    {chainTxs.length === 0 && (
                      <div className="text-center py-6">
                        <Waves size={20} className="mx-auto mb-2" style={{ color: 'rgba(34,211,238,0.2)' }} />
                        <p className="text-xs" style={{ color: 'rgba(125,211,252,0.4)' }}>No transactions yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============ POOLS TAB ============ */}
          {activeTab === 'pools' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Droplets} c={ACCENT.teal}                            label="Total pools"  value={chainPools.length} />
                <StatCard icon={Zap}      c={ACCENT.green}                           label="Best APR"     value={(chainPools.length > 0 ? Math.max(...chainPools.map((p: any) => Number(p.apr || 0))).toFixed(1) : '0') + '%'} />
                <StatCard icon={Activity} c={isSolana ? ACCENT.solana : ACCENT.cyan} label="Transactions" value={chainTxs.length} />
                <StatCard icon={Layers}   c={ACCENT.amber}                           label="Testnet"      value={'⚡'} />
              </div>
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
                  <h3 className="text-sm font-extrabold flex items-center gap-2" style={{ color: '#7dd3fc' }}>
                    <Droplets size={14} style={{ color: ACCENT.teal }} /> Pools — {CHAINS[selectedChain]?.short}
                  </h3>
                  <span className="text-[11px]" style={{ color: 'rgba(125,211,252,0.5)' }}>{chainPools.length} pools</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'rgba(125,211,252,0.4)' }}>
                        <th className="text-left px-5 py-3">Pool</th>
                        <th className="text-right px-3 py-3">APR</th>
                        <th className="text-right px-3 py-3">Fee</th>
                        <th className="text-right px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {chainPools.map((p: any) => {
                        const tA = tokens.find((t: any) => t.symbol === p.tokenA && t.chain === selectedChain);
                        const tB = tokens.find((t: any) => t.symbol === p.tokenB && t.chain === selectedChain);
                        return (
                          <tr key={p.id} className="ocean-row group transition-colors" style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2"
                                    style={{ background: 'rgba(34,211,238,0.15)', borderColor: 'rgba(34,211,238,0.2)' }}>{tA?.logo || '◆'}</span>
                                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm border-2"
                                    style={{ background: 'rgba(45,212,191,0.15)', borderColor: 'rgba(45,212,191,0.2)' }}>{tB?.logo || '◇'}</span>
                                </div>
                                <div>
                                  <p className="font-semibold text-sm" style={{ color: '#e0f2fe' }}>{p.tokenA} / {p.tokenB}</p>
                                  <p className="text-xs" style={{ color: 'rgba(125,211,252,0.5)' }}>Pool #{p.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3.5 text-right">
                              <span className="font-semibold" style={{ color: ACCENT.green }}>{Number(p.apr || 0).toFixed(1)}%</span>
                            </td>
                            <td className="px-3 py-3.5 text-right">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                style={{ background: 'rgba(251,191,36,0.15)', color: ACCENT.amber, border: '1px solid rgba(251,191,36,0.3)' }}>
                                {(Number(p.feeBps) / 100).toFixed(2)}%
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <button onClick={() => { setSelectedChain(safe(p.chain)); setFromToken(tA || null); setToToken(tB || null); setActiveTab('swap'); }}
                                className="opacity-0 group-hover:opacity-100 text-xs font-semibold flex items-center gap-1 ml-auto transition-opacity"
                                style={{ color: ACCENT.cyan }}>
                                Swap <ArrowRight size={11} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {chainPools.length === 0 && (
                        <tr><td colSpan={4} className="text-center py-12">
                          <Waves size={28} className="mx-auto mb-3" style={{ color: 'rgba(34,211,238,0.2)' }} />
                          <p className="text-sm" style={{ color: 'rgba(125,211,252,0.4)' }}>No pools on {CHAINS[selectedChain]?.short} yet</p>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ============ PORTFOLIO TAB ============ */}
          {activeTab === 'portfolio' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Wallet}   c={isSolana ? ACCENT.solana : ACCENT.cyan} label="Tokens held" value={portfolioStats.totalTokens} />
                <StatCard icon={Droplets} c={ACCENT.teal}                            label="Pools"        value={chainPools.length} />
                <StatCard icon={Layers}   c={ACCENT.amber}                           label="Network"      value={CHAINS[selectedChain]?.short || ''} />
                <StatCard icon={Activity} c={ACCENT.green}                           label="Total txs"    value={chainTxs.length} />
              </div>
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
                  <h3 className="text-sm font-extrabold flex items-center gap-2" style={{ color: '#7dd3fc' }}>
                    <Coins size={14} style={{ color: ACCENT.cyan }} /> Your tokens
                  </h3>
                </div>
                <div>
                  {chainTokens.map((t: any) => {
                    const value = Number(t.balance || 0) * Number(t.priceUsd || 0);
                    const pct = portfolioStats.totalUsd > 0 ? (value / portfolioStats.totalUsd) * 100 : 0;
                    return (
                      <div key={t.id} className="px-5 py-3.5 ocean-row flex items-center gap-3 transition-colors"
                        style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                          style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }}>
                          {t.logo || t.symbol?.slice(0, 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm" style={{ color: '#e0f2fe' }}>{t.symbol}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono"
                              style={{ background: 'rgba(14,165,233,0.1)', color: 'rgba(125,211,252,0.6)' }}>{shortAddr(t.address)}</span>
                          </div>
                          <p className="text-xs truncate" style={{ color: 'rgba(125,211,252,0.5)' }}>{t.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold" style={{ color: '#e0f2fe' }}>{fmt(t.balance, 4)} <span className="font-normal text-xs" style={{ color: 'rgba(125,211,252,0.5)' }}>{t.symbol}</span></p>
                          <p className="text-[11px]" style={{ color: 'rgba(125,211,252,0.4)' }}>{fmtUsd(value)} · {pct.toFixed(1)}%</p>
                        </div>
                        <button onClick={() => { setFromToken(t); setActiveTab('swap'); }}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                          style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }}>
                          <Repeat size={12} style={{ color: ACCENT.cyan }} />
                        </button>
                      </div>
                    );
                  })}
                  {chainTokens.length === 0 && (
                    <div className="text-center py-12">
                      <Coins size={28} className="mx-auto mb-3" style={{ color: 'rgba(34,211,238,0.2)' }} />
                      <p className="text-sm" style={{ color: 'rgba(125,211,252,0.4)' }}>No tokens on {CHAINS[selectedChain]?.short}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============ HISTORY TAB ============ */}
          {activeTab === 'history' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(TX_TYPE).map(([k, t]) => {
                  const Icon = (t as any).i;
                  const count = chainTxs.filter((tx: any) => safe(tx.type) === k).length;
                  return <StatCard key={k} icon={Icon} c={(t as any).c} label={(t as any).label} value={count} />;
                })}
              </div>
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
                  <h3 className="text-sm font-extrabold flex items-center gap-2" style={{ color: '#7dd3fc' }}>
                    <History size={14} style={{ color: ACCENT.cyan }} /> Transaction history
                  </h3>
                  <span className="text-[11px]" style={{ color: 'rgba(125,211,252,0.5)' }}>{chainTxs.length} transactions</span>
                </div>
                <div>
                  {chainTxs.map((tx: any) => {
                    const t = TX_TYPE[safe(tx.type)] || TX_TYPE.swap;
                    const s = TX_STATUS[safe(tx.status)] || TX_STATUS.pending;
                    const Icon = t.i; const SIcon = s.i;
                    return (
                      <div key={tx.id} className="px-5 py-3.5 ocean-row flex items-center gap-3 transition-colors"
                        style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: t.c + '20' }}><Icon size={14} style={{ color: t.c }} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-extrabold" style={{ color: '#e0f2fe' }}>{t.label}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                              style={{ background: s.c + '1a', color: s.c, border: `1px solid ${s.c}40` }}>{tx.status}</span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(125,211,252,0.5)' }}>
                            {tx.type === 'faucet'
                              ? <span>Claimed <strong style={{ color: '#e0f2fe' }}>{fmt(tx.amountOut)} {tx.tokenOut}</strong></span>
                              : <span><strong style={{ color: '#e0f2fe' }}>{fmt(tx.amountIn)} {tx.tokenIn}</strong> → <strong style={{ color: '#e0f2fe' }}>{fmt(tx.amountOut)} {tx.tokenOut}</strong></span>}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] flex items-center justify-end gap-1" style={{ color: 'rgba(125,211,252,0.4)' }}>
                            <Clock size={10} /> {timeAgo(tx.timestamp)}
                          </p>
                          <span className="text-xs font-mono flex items-center justify-end gap-1 mt-0.5" style={{ color: 'rgba(125,211,252,0.5)' }}>
                            {shortAddr(tx.txHash)} <ExternalLink size={9} />
                          </span>
                        </div>
                        <SIcon size={14} style={{ color: s.c }} />
                      </div>
                    );
                  })}
                  {chainTxs.length === 0 && (
                    <div className="text-center py-12">
                      <Waves size={28} className="mx-auto mb-3" style={{ color: 'rgba(34,211,238,0.2)' }} />
                      <p className="text-sm" style={{ color: 'rgba(125,211,252,0.4)' }}>No transactions on {CHAINS[selectedChain]?.short}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ====== TOKEN PICKERS ====== */}
      {showFromPicker && <TokenPicker tokens={chainTokens} excludeSymbol={toToken?.symbol}   onPick={(t: any) => { setFromToken(t); setShowFromPicker(false); }} onClose={() => setShowFromPicker(false)} />}
      {showToPicker   && <TokenPicker tokens={chainTokens} excludeSymbol={fromToken?.symbol} onPick={(t: any) => { setToToken(t);   setShowToPicker(false);   }} onClose={() => setShowToPicker(false)} />}
    </div>
  );
}

/* ====== SUB-COMPONENTS ====== */

function StatCard({ icon: Icon, c, label, value }: any) {
  return (
    <div className="glass-card-light rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-200"
      style={{ boxShadow: `0 0 20px ${c}15` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: c + '20' }}><Icon size={14} style={{ color: c }} /></div>
        <span className="text-2xl font-bold tabular-nums" style={{ color: '#e0f2fe' }}>{value}</span>
      </div>
      <p className="text-[11px] font-bold" style={{ color: 'rgba(125,211,252,0.6)' }}>{label}</p>
    </div>
  );
}

function Row({ label, value, accent }: any) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span style={{ color: 'rgba(125,211,252,0.5)' }}>{label}</span>
      <span className="font-semibold tabular-nums" style={{ color: accent || '#e0f2fe' }}>{value}</span>
    </div>
  );
}

function TokenInput({ label, token, amount, onAmountChange, readonly, onPickerOpen, balance, usd, showMax }: any) {
  return (
    <div className="rounded-2xl p-4 transition-all"
      style={{ background: 'rgba(2,20,50,0.5)', border: '1px solid rgba(14,165,233,0.2)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-medium" style={{ color: 'rgba(125,211,252,0.5)' }}>{label}</span>
        {token && (
          <span className="text-[11px]" style={{ color: 'rgba(125,211,252,0.5)' }}>
            Balance: <strong style={{ color: '#7dd3fc' }}>{fmt(balance, 4)}</strong>
            {showMax && balance > 0 && (
              <button onClick={() => onAmountChange && onAmountChange(String(balance))}
                className="ml-1.5 text-[10px] font-bold hover:underline" style={{ color: ACCENT.cyan }}>MAX</button>
            )}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input type="number" inputMode="decimal" placeholder="0.0" value={amount} readOnly={readonly}
          onChange={e => onAmountChange && onAmountChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-3xl font-bold focus:outline-none tabular-nums"
          style={{ color: '#e0f2fe' }}
          onFocus={e => { (e.target.closest('[data-ti]') as HTMLElement | null)?.style && ((e.target.closest('[data-ti]') as HTMLElement).style.borderColor = 'rgba(34,211,238,0.4)'); }}
        />
        <button onClick={onPickerOpen}
          className="flex items-center gap-2 rounded-full px-4 py-2.5 font-bold transition-all shrink-0"
          style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(34,211,238,0.25)' }}>
          {token ? (
            <>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                style={{ background: 'rgba(34,211,238,0.1)' }}>{token.logo || token.symbol?.slice(0, 1)}</span>
              <span className="text-sm font-extrabold" style={{ color: '#e0f2fe' }}>{token.symbol}</span>
              <ChevronDown size={12} style={{ color: 'rgba(125,211,252,0.5)' }} />
            </>
          ) : (
            <>
              <span className="text-sm font-semibold" style={{ color: ACCENT.cyan }}>Select</span>
              <ChevronDown size={12} style={{ color: 'rgba(125,211,252,0.5)' }} />
            </>
          )}
        </button>
      </div>
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
      <div className="absolute inset-0" style={{ background: 'rgba(2,10,30,0.9)', backdropFilter: 'blur(10px)' }} />
      <div className="relative glass-card rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-5" style={{ borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold" style={{ color: '#7dd3fc' }}>Select a token</h3>
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(14,165,233,0.1)', color: '#38bdf8' }}>✕</button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(125,211,252,0.4)' }} />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search name or paste address"
              className="input-ocean w-full pl-10 pr-4 py-2.5 text-sm rounded-full" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((t: any) => (
            <button key={t.id} onClick={() => onPick(t)}
              className="w-full px-5 py-3 ocean-row flex items-center gap-3 text-left transition-colors">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }}>
                {t.logo || t.symbol?.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: '#e0f2fe' }}>{t.symbol}</p>
                <p className="text-[11px] truncate" style={{ color: 'rgba(125,211,252,0.4)' }}>{t.name} · {shortAddr(t.address)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-extrabold tabular-nums" style={{ color: '#e0f2fe' }}>{fmt(t.balance, 4)}</p>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Coins size={24} className="mx-auto mb-2" style={{ color: 'rgba(34,211,238,0.2)' }} />
              <p className="text-sm" style={{ color: 'rgba(125,211,252,0.4)' }}>No tokens match "{q}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
