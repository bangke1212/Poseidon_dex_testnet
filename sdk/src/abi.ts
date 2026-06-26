export const POSEIDON_SWAP_ABI = [
  // ── Pool Management ──
  "function createPool(address tokenA, address tokenB, uint32 feeBps) external returns (uint256 poolId)",
  "function poolCount() external view returns (uint256)",
  "function pools(uint256) external view returns (address tokenA, address tokenB, uint256 reserveA, uint256 reserveB, uint32 feeBps, uint256 totalLpSupply, bool exists)",

  // ── Liquidity ──
  "function addLiquidity(uint256 poolId, uint256 amountA, uint256 amountB) external returns (uint256 lpMinted)",
  "function removeLiquidity(uint256 poolId, uint256 lpAmount) external returns (uint256 amountA, uint256 amountB)",
  "function getUserLP(uint256 poolId) external view returns (uint256)",
  "function lpBalances(uint256, address) external view returns (uint256)",

  // ── Swap ──
  "function swap(uint256 poolId, address tokenIn, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut)",
  "function getQuote(uint256 poolId, address tokenIn, uint256 amountIn) external view returns (uint256 amountOut, uint256 fee, uint256 priceImpactBps)",

  // ── Queries ──
  "function getPool(uint256 poolId) external view returns (tuple(uint256 poolId, address tokenA, address tokenB, uint256 reserveA, uint256 reserveB, uint32 feeBps, uint256 totalLpSupply, uint256 tvlUsd))",
  "function getPoolId(address tokenA, address tokenB) external view returns (uint256)",
  "function getPoolReserves(uint256 poolId) external view returns (address tokenA, address tokenB, uint256 reserveA, uint256 reserveB, uint32 feeBps, uint256 totalLpSupply)",
  "function getAllPools() external view returns (tuple(uint256 poolId, address tokenA, address tokenB, uint256 reserveA, uint256 reserveB, uint32 feeBps, uint256 totalLpSupply, uint256 tvlUsd)[])",

  // ── Events ──
  "event PoolCreated(uint256 indexed poolId, address tokenA, address tokenB, uint32 feeBps)",
  "event LiquidityAdded(uint256 indexed poolId, address indexed provider, uint256 amountA, uint256 amountB, uint256 lpMinted)",
  "event LiquidityRemoved(uint256 indexed poolId, address indexed provider, uint256 amountA, uint256 amountB, uint256 lpBurned)",
  "event Swapped(uint256 indexed poolId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)",
];

export const POSEIDON_TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address, address) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "function faucet(address to) returns (bool)",
  "function mint(address to, uint256 value)",
  "function burn(uint256 value)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
];
