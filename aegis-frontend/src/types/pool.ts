export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  swapAddress: string;
  explorerUrl: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
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
  reserveA: string;
  reserveB: string;
  feeBps: number;
}

export interface SwapQuote {
  amountIn: string;
  amountOut: string;
  fee: string;
  priceImpactBps: number;
  minAmountOut: string;
}
