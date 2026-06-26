/**
 * Poseidon Solana Client — Solana Devnet DEX Client
 *
 * Uses @solana/web3.js + @solana/spl-token for SPL token interactions.
 * Supports Phantom Wallet & Solflare browser extension.
 */

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from "@solana/spl-token";

// ═══════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════

export interface SolanaChainConfig {
  key: string;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  chainId: string;
  nativeToken: string;
}

export interface SolanaTokenInfo {
  symbol: string;
  name: string;
  mintAddress: string;
  decimals: number;
  logo: string;
  priceUsd: number;
}

// ═══════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════

export const SOLANA_CHAIN: SolanaChainConfig = {
  key: "solanaDevnet",
  name: "Solana Devnet",
  rpcUrl: "https://api.devnet.solana.com",
  explorerUrl: "https://explorer.solana.com/?cluster=devnet",
  chainId: "devnet",
  nativeToken: "SOL",
};

export const SOLANA_DEFAULT_TOKENS: SolanaTokenInfo[] = [
  { symbol: "SOL", name: "Solana", mintAddress: "So11111111111111111111111111111111111111112", decimals: 9, logo: "\u25ce", priceUsd: 0 },
  { symbol: "PUSD", name: "Poseidon USD", mintAddress: "", decimals: 9, logo: "\U0001f4b5", priceUsd: 1.00 },
  { symbol: "PSOL", name: "Poseidon Staked SOL", mintAddress: "", decimals: 9, logo: "\U0001f30a", priceUsd: 0 },
  { symbol: "PBTC", name: "Poseidon BTC", mintAddress: "", decimals: 9, logo: "\u20bf", priceUsd: 67250 },
  { symbol: "USDC", name: "USD Coin (Devnet)", mintAddress: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", decimals: 6, logo: "\U0001f4b2", priceUsd: 1.00 },
];

// ═══════════════════════════════════════════
//  WALLET INTERFACE (Phantom / Solflare)
// ═══════════════════════════════════════════

export interface SolanaWalletProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey: PublicKey | null;
  connect(): Promise<{ publicKey: PublicKey }>;
  disconnect(): Promise<void>;
  signTransaction<T extends Transaction>(transaction: T): Promise<T>;
  signAllTransactions<T extends Transaction>(transactions: T[]): Promise<T[]>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  on(event: string, callback: (...args: any[]) => void): void;
  removeListener(event: string, callback: (...args: any[]) => void): void;
}

// ═══════════════════════════════════════════
//  SOLANA CLIENT
// ═══════════════════════════════════════════

export class SolanaClient {
  private connection: Connection;
  private wallet: SolanaWalletProvider | null = null;
  public publicKey: PublicKey | null = null;

  constructor(rpcUrl?: string) {
    this.connection = new Connection(rpcUrl || SOLANA_CHAIN.rpcUrl, "confirmed");
  }

  // ── WALLET ──

  getWalletProvider(): SolanaWalletProvider | null {
    const win = window as any;
    if (win.solana && win.solana.isPhantom) return win.solana;
    if (win.solflare) return win.solflare;
    return null;
  }

  async connect(): Promise<string> {
    this.wallet = this.getWalletProvider();
    if (!this.wallet) throw new Error("No Solana wallet found. Please install Phantom or Solflare.");
    const resp = await this.wallet.connect();
    this.publicKey = resp.publicKey;
    return this.publicKey.toBase58();
  }

  disconnect(): void {
    if (this.wallet) { this.wallet.disconnect(); this.wallet = null; this.publicKey = null; }
  }

  isConnected(): boolean { return this.publicKey !== null && this.wallet !== null; }

  // ── BALANCE ──

  async getSOLBalance(): Promise<number> {
    if (!this.publicKey) throw new Error("Not connected");
    const balance = await this.connection.getBalance(this.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  async getTokenBalance(mintAddress: string): Promise<number> {
    if (!this.publicKey) throw new Error("Not connected");
    const mintPubkey = new PublicKey(mintAddress);
    if (mintAddress === SOLANA_DEFAULT_TOKENS[0].mintAddress) return this.getSOLBalance();
    try {
      const ata = await getAssociatedTokenAddress(mintPubkey, this.publicKey);
      const account = await getAccount(this.connection, ata);
      return Number(account.amount);
    } catch { return 0; }
  }

  // ── TRANSFER SOL ──

  async transferSOL(toAddress: string, amountSol: number): Promise<string> {
    if (!this.publicKey || !this.wallet) throw new Error("Not connected");
    const transaction = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: this.publicKey, toPubkey: new PublicKey(toAddress), lamports: Math.floor(amountSol * LAMPORTS_PER_SOL) })
    );
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.publicKey;
    const signed = await this.wallet.signTransaction(transaction);
    const signature = await this.connection.sendRawTransaction(signed.serialize());
    await this.connection.confirmTransaction(signature, "confirmed");
    return signature;
  }

  // ── FAUCET (Airdrop on Devnet) ──

  async requestAirdrop(amountSol: number = 1): Promise<string> {
    if (!this.publicKey) throw new Error("Not connected");
    const signature = await this.connection.requestAirdrop(this.publicKey, Math.floor(amountSol * LAMPORTS_PER_SOL));
    await this.connection.confirmTransaction(signature, "confirmed");
    return signature;
  }

  // ── TOKEN ACCOUNT SETUP ──

  async getOrCreateTokenAccount(mintAddress: string): Promise<PublicKey> {
    if (!this.publicKey || !this.wallet) throw new Error("Not connected");
    const mintPubkey = new PublicKey(mintAddress);
    const ata = await getAssociatedTokenAddress(mintPubkey, this.publicKey);
    try { await getAccount(this.connection, ata); return ata; } catch {
      const transaction = new Transaction().add(createAssociatedTokenAccountInstruction(this.publicKey, ata, this.publicKey, mintPubkey));
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.publicKey;
      const signed = await this.wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signed.serialize());
      await this.connection.confirmTransaction(signature, "confirmed");
      return ata;
    }
  }

  // ── QUERY ──

  getChainConfig(): SolanaChainConfig { return SOLANA_CHAIN; }
  getTokens(): SolanaTokenInfo[] { return SOLANA_DEFAULT_TOKENS; }
}
