"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

// ═══════════════════════════════════════════
//  CHAIN CONFIG
// ═══════════════════════════════════════════

export const CHAINS: Record<string, { chainId: number; name: string; rpcUrl: string; symbol: string }> = {
  sepolia:        { chainId: 11155111, name: "Ethereum Sepolia", rpcUrl: "https://ethereum-sepolia.publicnode.com", symbol: "ETH" },
  arbitrumSepolia: { chainId: 421614, name: "Arbitrum Sepolia", rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc", symbol: "ETH" },
  bscTestnet:      { chainId: 97, name: "BSC Testnet", rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545", symbol: "tBNB" },
};

// ═══════════════════════════════════════════
//  CONTEXT
// ═══════════════════════════════════════════

interface WalletContextValue {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  chainId: number | null;
  chainKey: string;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainKey: string) => Promise<boolean>;
  balance: string;
  error: string | null;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  connected: false,
  connecting: false,
  chainId: null,
  chainKey: "sepolia",
  provider: null,
  signer: null,
  connect: async () => {},
  disconnect: () => {},
  switchChain: async () => false,
  balance: "0",
  error: null,
});

export function useWallet() {
  return useContext(WalletContext);
}

// ═══════════════════════════════════════════
//  PROVIDER
// ═══════════════════════════════════════════

export function WalletProviders({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [chainKey, setChainKey] = useState<string>("sepolia");
  const [connecting, setConnecting] = useState(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [balance, setBalance] = useState("0");
  const [error, setError] = useState<string | null>(null);

  const getEthereum = () => (window as any).ethereum;

  const updateBalance = async (prov: ethers.BrowserProvider, addr: string) => {
    try {
      const bal = await prov.getBalance(addr);
      setBalance(Number(ethers.formatEther(bal)).toFixed(4));
    } catch { setBalance("0"); }
  };

  const connect = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      setError("Please install MetaMask or a Web3 wallet");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const accounts = await ethereum.request({ method: "eth_requestAccounts" });
      const addr = accounts[0];
      const prov = new ethers.BrowserProvider(ethereum);
      const sig = await prov.getSigner();
      const net = await prov.getNetwork();
      const cId = Number(net.chainId);
      const cKey = Object.entries(CHAINS).find(([,c]) => c.chainId === cId)?.[0] || "sepolia";

      setAddress(addr);
      setChainId(cId);
      setChainKey(cKey);
      setProvider(prov);
      setSigner(sig);
      await updateBalance(prov, addr);
    } catch (e: any) {
      setError(e.message || "Connection failed");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setChainKey("sepolia");
    setProvider(null);
    setSigner(null);
    setBalance("0");
  }, []);

  const switchChainFn = useCallback(async (key: string) => {
    const chain = CHAINS[key];
    if (!chain) return false;
    const ethereum = getEthereum();
    if (!ethereum) return false;
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + chain.chainId.toString(16) }],
      });
      setChainKey(key);
      setChainId(chain.chainId);
      return true;
    } catch (e: any) {
      if (e.code === 4902) {
        try {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x" + chain.chainId.toString(16),
              chainName: chain.name,
              rpcUrls: [chain.rpcUrl],
              nativeCurrency: { name: chain.symbol, symbol: chain.symbol, decimals: 18 },
            }],
          });
          setChainKey(key);
          setChainId(chain.chainId);
          return true;
        } catch { return false; }
      }
      return false;
    }
  }, []);

  // Auto-connect & event listeners
  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) disconnect();
      else connect();
    };
    const handleChainChanged = () => window.location.reload();

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    // Auto-connect
    ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
      if (accounts.length > 0) connect();
    });

    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged);
      ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [connect, disconnect]);

  const value: WalletContextValue = {
    address, connected: !!address, connecting, chainId, chainKey,
    provider, signer, connect, disconnect, switchChain: switchChainFn, balance, error,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
