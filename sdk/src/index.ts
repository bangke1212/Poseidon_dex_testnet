/**
 * Poseidon SDK — Multi-Chain DEX Client
 *
 * Supports: EVM (Sepolia, Arbitrum Sepolia, BSC Testnet) + Solana Devnet
 */

// ══════════════════════════════════════════════════════
//  EVM CLIENT
// ══════════════════════════════════════════════════════

export { PoseidonClient, CHAINS as EVM_CHAINS, DEFAULT_TOKENS as EVM_DEFAULT_TOKENS, switchChain, getChainByKey, formatUnits, parseUnits } from "./evm-client";
export type { ChainConfig, TokenInfo, PoolInfo, SwapQuote } from "./evm-client";
export { POSEIDON_SWAP_ABI, POSEIDON_TOKEN_ABI } from "./abi";

// ══════════════════════════════════════════════════════
//  SOLANA CLIENT
// ══════════════════════════════════════════════════════

export { SolanaClient, SOLANA_CHAIN, SOLANA_DEFAULT_TOKENS } from "./solana-client";
export type { SolanaTokenInfo } from "./solana-client";

// ══════════════════════════════════════════════════════
//  WALLET ADAPTER
// ══════════════════════════════════════════════════════

export { WalletAdapter, WalletType, detectWallets } from "./wallet-adapter";
export type { WalletInfo, WalletConnection } from "./wallet-adapter";

// ══════════════════════════════════════════════════════
//  UNIFIED CHAIN LIST
// ══════════════════════════════════════════════════════

export interface UnifiedChain {
  key: string;
  label: string;
  short: string;
  color: string;
  icon: string;
  type: "evm" | "solana";
  chainId: number | string;
  rpcUrl: string;
  explorerUrl: string;
  nativeToken: string;
}

export const UNIFIED_CHAINS: UnifiedChain[] = [
  { key: "sepolia", label: "Ethereum Sepolia", short: "Sepolia", color: "#B8A9E8", icon: "\u25c6", type: "evm", chainId: 11155111, rpcUrl: "https://ethereum-sepolia.publicnode.com", explorerUrl: "https://sepolia.etherscan.io", nativeToken: "ETH" },
  { key: "arbitrumSepolia", label: "Arbitrum Sepolia", short: "Arbitrum", color: "#4ECDC4", icon: "\u25c8", type: "evm", chainId: 421614, rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc", explorerUrl: "https://sepolia.arbiscan.io", nativeToken: "ETH" },
  { key: "bscTestnet", label: "BSC Testnet", short: "BSC", color: "#F5A623", icon: "\u25c7", type: "evm", chainId: 97, rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545", explorerUrl: "https://testnet.bscscan.com", nativeToken: "tBNB" },
  { key: "solanaDevnet", label: "Solana Devnet", short: "Solana", color: "#9945FF", icon: "\u25ce", type: "solana", chainId: "devnet", rpcUrl: "https://api.devnet.solana.com", explorerUrl: "https://explorer.solana.com/?cluster=devnet", nativeToken: "SOL" },
];
