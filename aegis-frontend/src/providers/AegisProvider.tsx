"use client";

import React, { createContext, useContext, useMemo } from "react";
import { PoseidonClient, CHAINS as SDK_CHAINS, DEFAULT_TOKENS, TokenInfo, ChainConfig } from "@poseidon/evm-sdk";
import { useWallet } from "./WalletProviders";
import { ethers } from "ethers";

type PoseidonContextValue = {
  client: PoseidonClient | null;
  chainKey: string;
  chainConfig: ChainConfig | null;
  tokens: TokenInfo[];
  ready: boolean;
};

const PoseidonContext = createContext<PoseidonContextValue>({
  client: null,
  chainKey: "sepolia",
  chainConfig: null,
  tokens: [],
  ready: false,
});

export function PoseidonProvider({ children }: { children: React.ReactNode }) {
  const { connected, chainKey, provider } = useWallet();

  const value = useMemo(() => {
    if (!connected || !provider) {
      return { client: null, chainKey: "sepolia", chainConfig: null, tokens: [], ready: false };
    }
    try {
      const client = new PoseidonClient(chainKey, provider as ethers.BrowserProvider);
      const chainConfig = SDK_CHAINS[chainKey] || null;
      const tokens = DEFAULT_TOKENS[chainKey] || [];
      return { client, chainKey, chainConfig, tokens, ready: true };
    } catch {
      return { client: null, chainKey: "sepolia", chainConfig: null, tokens: [], ready: false };
    }
  }, [connected, chainKey, provider]);

  return (
    <PoseidonContext.Provider value={value}>
      {children}
    </PoseidonContext.Provider>
  );
}

export function usePoseidon() {
  return useContext(PoseidonContext);
}
