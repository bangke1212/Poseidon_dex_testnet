/**
 * Poseidon EVM SDK — Multi-chain DEX Swap SDK
 * 
 * Supports: Sepolia ETH, Arbitrum Sepolia, BSC Testnet
 */

import { ethers, Contract, BrowserProvider, JsonRpcSigner } from "ethers";
import { POSEIDON_SWAP_ABI } from "./abi";

// ═══════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  swapAddress: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  chainId: number;
}

export interface PoolInfo {
  poolId: number;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  reserveA: bigint;
  reserveB: bigint;
  feeBps: number;
  totalLpSupply: bigint;
  tvlUsd: number;
}

export interface SwapQuote {
  amountIn: bigint;
  amountOut: bigint;
  fee: bigint;
  priceImpactBps: number;
  minAmountOut: bigint;
}

// ═══════════════════════════════════════════
//  CHAIN CONFIGS
// ═══════════════════════════════════════════

export const CHAINS: Record<string, ChainConfig> = {
  sepolia: {
    chainId: 11155111,
    name: "Ethereum Sepolia",
    rpcUrl: "https://ethereum-sepolia.publicnode.com",
    swapAddress: "", // Set after deployment
    explorerUrl: "https://sepolia.etherscan.io",
    nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
  },
  arbitrumSepolia: {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
    swapAddress: "",
    explorerUrl: "https://sepolia.arbiscan.io",
    nativeCurrency: { name: "Arbitrum Sepolia ETH", symbol: "ETH", decimals: 18 },
  },
  bscTestnet: {
    chainId: 97,
    name: "BSC Testnet",
    rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
    swapAddress: "",
    explorerUrl: "https://testnet.bscscan.com",
    nativeCurrency: { name: "BNB", symbol: "tBNB", decimals: 18 },
  },
};

// ═══════════════════════════════════════════
//  DEFAULT TOKENS PER CHAIN
// ═══════════════════════════════════════════

export const DEFAULT_TOKENS: Record<string, TokenInfo[]> = {
  sepolia: [
    { symbol: "PUSD", name: "Poseidon USD", address: "", decimals: 18, chainId: 11155111 },
    { symbol: "PBTC", name: "Poseidon BTC", address: "", decimals: 18, chainId: 11155111 },
    { symbol: "PETH", name: "Poseidon ETH", address: "", decimals: 18, chainId: 11155111 },
    { symbol: "PLINK", name: "Poseidon LINK", address: "", decimals: 18, chainId: 11155111 },
    { symbol: "WBTC", name: "Wrapped BTC", address: "", decimals: 18, chainId: 11155111 },
  ],
  arbitrumSepolia: [
    { symbol: "PUSD", name: "Poseidon USD", address: "", decimals: 18, chainId: 421614 },
    { symbol: "PBTC", name: "Poseidon BTC", address: "", decimals: 18, chainId: 421614 },
    { symbol: "PETH", name: "Poseidon ETH", address: "", decimals: 18, chainId: 421614 },
    { symbol: "PLINK", name: "Poseidon LINK", address: "", decimals: 18, chainId: 421614 },
    { symbol: "WBTC", name: "Wrapped BTC", address: "", decimals: 18, chainId: 421614 },
  ],
  bscTestnet: [
    { symbol: "PUSD", name: "Poseidon USD", address: "", decimals: 18, chainId: 97 },
    { symbol: "PBTC", name: "Poseidon BTC", address: "", decimals: 18, chainId: 97 },
    { symbol: "PETH", name: "Poseidon ETH", address: "", decimals: 18, chainId: 97 },
    { symbol: "PLINK", name: "Poseidon LINK", address: "", decimals: 18, chainId: 97 },
    { symbol: "WBTC", name: "Wrapped BTC", address: "", decimals: 18, chainId: 97 },
  ],
};

// ═══════════════════════════════════════════
//  MAIN CLIENT
// ═══════════════════════════════════════════

export class PoseidonClient {
  private provider: BrowserProvider;
  private signer: JsonRpcSigner | null = null;
  private swapContract: Contract | null = null;
  private chainKey: string;
  private swapAddress: string;

  constructor(chainKey: string, provider?: BrowserProvider) {
    this.chainKey = chainKey;
    const chain = CHAINS[chainKey];
    if (!chain) throw new Error(`Unknown chain: ${chainKey}`);
    this.swapAddress = chain.swapAddress;
    this.provider = provider || new BrowserProvider((window as any).ethereum);
  }

  async connect() {
    this.signer = await this.provider.getSigner();
    this.swapContract = new Contract(this.swapAddress, POSEIDON_SWAP_ABI, this.signer);
    return this.signer.getAddress();
  }

  async getSignerAddress(): Promise<string> {
    if (!this.signer) return this.connect();
    return this.signer.getAddress();
  }

  // ── POOLS ──

  async getAllPools(): Promise<PoolInfo[]> {
    if (!this.swapContract) throw new Error("Not connected");
    const rawPools = await this.swapContract.getAllPools();
    const tokens = DEFAULT_TOKENS[this.chainKey];
    return rawPools.map((p: any) => this._formatPool(p, tokens));
  }

  async getPool(poolId: number): Promise<PoolInfo> {
    if (!this.swapContract) throw new Error("Not connected");
    const raw = await this.swapContract.getPool(poolId);
    return this._formatPool(raw, DEFAULT_TOKENS[this.chainKey]);
  }

  // ── SWAP ──

  async getQuote(poolId: number, tokenIn: string, amountIn: bigint): Promise<SwapQuote> {
    if (!this.swapContract) throw new Error("Not connected");
    const [amountOut, fee, priceImpactBps] = await this.swapContract.getQuote(poolId, tokenIn, amountIn);
    return {
      amountIn,
      amountOut: BigInt(amountOut.toString()),
      fee: BigInt(fee.toString()),
      priceImpactBps: Number(priceImpactBps),
      minAmountOut: BigInt(amountOut.toString()) * 98n / 100n, // 2% default slippage
    };
  }

  async swap(
    poolId: number,
    tokenIn: string,
    amountIn: bigint,
    minAmountOut: bigint,
    tokenContract: Contract
  ): Promise<string> {
    if (!this.swapContract) throw new Error("Not connected");

    // Approve spend
    const approveTx = await tokenContract.approve(this.swapAddress, amountIn);
    await approveTx.wait();

    // Execute swap
    const tx = await this.swapContract.swap(poolId, tokenIn, amountIn, minAmountOut);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  // ── LIQUIDITY ──

  async addLiquidity(poolId: number, amountA: bigint, amountB: bigint): Promise<string> {
    if (!this.swapContract) throw new Error("Not connected");
    const tx = await this.swapContract.addLiquidity(poolId, amountA, amountB);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async removeLiquidity(poolId: number, lpAmount: bigint): Promise<string> {
    if (!this.swapContract) throw new Error("Not connected");
    const tx = await this.swapContract.removeLiquidity(poolId, lpAmount);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async getUserLP(poolId: number): Promise<bigint> {
    if (!this.swapContract) throw new Error("Not connected");
    const lp = await this.swapContract.getUserLP(poolId);
    return BigInt(lp.toString());
  }

  // ── FAUCET ──

  async claimFromFaucet(tokenAddress: string): Promise<string> {
    if (!this.signer) throw new Error("Not connected");
    const tokenAbi = ["function faucet(address to) external returns (bool)"];
    const token = new Contract(tokenAddress, tokenAbi, this.signer);
    const tx = await token.faucet(await this.signer.getAddress());
    const receipt = await tx.wait();
    return receipt.hash;
  }

  // ── UTILS ──

  getChainConfig(): ChainConfig {
    return CHAINS[this.chainKey];
  }

  getTokens(): TokenInfo[] {
    return DEFAULT_TOKENS[this.chainKey];
  }

  // ── INTERNAL ──

  private _findToken(address: string, tokens: TokenInfo[]): TokenInfo {
    const found = tokens.find(t => t.address.toLowerCase() === address.toLowerCase());
    return found || {
      symbol: address.slice(0, 6) + "..." + address.slice(-4),
      name: "Unknown Token",
      address,
      decimals: 18,
      chainId: CHAINS[this.chainKey].chainId,
    };
  }

  private _formatPool(raw: any, tokens: TokenInfo[]): PoolInfo {
    return {
      poolId: Number(raw.poolId),
      tokenA: this._findToken(raw.tokenA, tokens),
      tokenB: this._findToken(raw.tokenB, tokens),
      reserveA: BigInt(raw.reserveA.toString()),
      reserveB: BigInt(raw.reserveB.toString()),
      feeBps: Number(raw.feeBps),
      totalLpSupply: BigInt(raw.totalLpSupply.toString()),
      tvlUsd: Number(raw.tvlUsd),
    };
  }
}

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════

export function getChainByKey(key: string): ChainConfig | undefined {
  return CHAINS[key];
}

export function formatUnits(amount: bigint, decimals: number = 18): string {
  return ethers.formatUnits(amount, decimals);
}

export function parseUnits(amount: string, decimals: number = 18): bigint {
  return ethers.parseUnits(amount, decimals);
}

export async function switchChain(chainKey: string): Promise<boolean> {
  const chain = CHAINS[chainKey];
  if (!chain) return false;

  const ethereum = (window as any).ethereum;
  if (!ethereum) return false;

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x" + chain.chainId.toString(16) }],
    });
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
            nativeCurrency: chain.nativeCurrency,
            blockExplorerUrls: [chain.explorerUrl],
          }],
        });
        return true;
      } catch { return false; }
    }
    return false;
  }
}
