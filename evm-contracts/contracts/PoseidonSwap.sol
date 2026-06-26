// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

contract PoseidonSwap {
    struct Pool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint32 feeBps;
        uint256 totalLpSupply;
        bool exists;
    }

    struct PoolInfo {
        uint256 poolId;
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint32 feeBps;
        uint256 totalLpSupply;
        uint256 tvlUsd;
    }

    address public owner;
    uint256 public poolCount;
    mapping(uint256 => Pool) public pools;
    mapping(bytes32 => uint256) public poolIndex;
    mapping(uint256 => mapping(address => uint256)) public lpBalances;

    event PoolCreated(uint256 indexed poolId, address tokenA, address tokenB, uint32 feeBps);
    event LiquidityAdded(uint256 indexed poolId, address indexed provider, uint256 amountA, uint256 amountB, uint256 lpMinted);
    event LiquidityRemoved(uint256 indexed poolId, address indexed provider, uint256 amountA, uint256 amountB, uint256 lpBurned);
    event Swapped(uint256 indexed poolId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor() { owner = msg.sender; }

    function createPool(address tokenA, address tokenB, uint32 feeBps) external returns (uint256 poolId) {
        require(tokenA != tokenB, "Same token");
        require(tokenA != address(0) && tokenB != address(0), "Zero address");
        require(feeBps <= 1000, "Fee too high");
        (address t0, address t1) = _sortTokens(tokenA, tokenB);
        bytes32 key = keccak256(abi.encodePacked(t0, t1));
        require(poolIndex[key] == 0, "Pool exists");
        poolId = ++poolCount;
        pools[poolId] = Pool(t0, t1, 0, 0, feeBps, 0, true);
        poolIndex[key] = poolId;
        emit PoolCreated(poolId, t0, t1, feeBps);
    }

    function addLiquidity(uint256 poolId, uint256 amountA, uint256 amountB) external returns (uint256 lpMinted) {
        Pool storage pool = pools[poolId];
        require(pool.exists, "Pool not found");
        _safeTransferFrom(pool.tokenA, msg.sender, address(this), amountA);
        _safeTransferFrom(pool.tokenB, msg.sender, address(this), amountB);
        uint256 lpSupply = pool.totalLpSupply;
        if (lpSupply == 0) {
            lpMinted = _sqrt(amountA * amountB);
        } else {
            uint256 shareA = (amountA * lpSupply) / pool.reserveA;
            uint256 shareB = (amountB * lpSupply) / pool.reserveB;
            lpMinted = shareA < shareB ? shareA : shareB;
        }
        require(lpMinted > 0, "Insufficient liquidity");
        pool.reserveA += amountA;
        pool.reserveB += amountB;
        pool.totalLpSupply += lpMinted;
        lpBalances[poolId][msg.sender] += lpMinted;
        emit LiquidityAdded(poolId, msg.sender, amountA, amountB, lpMinted);
    }

    function removeLiquidity(uint256 poolId, uint256 lpAmount) external returns (uint256 amountA, uint256 amountB) {
        Pool storage pool = pools[poolId];
        require(pool.exists && lpBalances[poolId][msg.sender] >= lpAmount, "Insufficient LP");
        uint256 lpSupply = pool.totalLpSupply;
        amountA = (lpAmount * pool.reserveA) / lpSupply;
        amountB = (lpAmount * pool.reserveB) / lpSupply;
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;
        pool.totalLpSupply -= lpAmount;
        lpBalances[poolId][msg.sender] -= lpAmount;
        _safeTransfer(pool.tokenA, msg.sender, amountA);
        _safeTransfer(pool.tokenB, msg.sender, amountB);
        emit LiquidityRemoved(poolId, msg.sender, amountA, amountB, lpAmount);
    }

    function swap(uint256 poolId, address tokenIn, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut) {
        Pool storage pool = pools[poolId];
        require(pool.exists && amountIn > 0, "Invalid");
        bool isTokenA = tokenIn == pool.tokenA;
        require(isTokenA || tokenIn == pool.tokenB, "Invalid token");
        (uint256 reserveIn, uint256 reserveOut, address tokenOut) = isTokenA
            ? (pool.reserveA, pool.reserveB, pool.tokenB)
            : (pool.reserveB, pool.reserveA, pool.tokenA);
        uint256 amountInAfterFee = (amountIn * (10000 - pool.feeBps)) / 10000;
        uint256 numerator = amountInAfterFee * reserveOut;
        uint256 denominator = reserveIn + amountInAfterFee;
        amountOut = numerator / denominator;
        require(amountOut >= minAmountOut && amountOut > 0 && amountOut < reserveOut, "Slippage/insufficient");
        _safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
        _safeTransfer(tokenOut, msg.sender, amountOut);
        if (isTokenA) { pool.reserveA += amountIn; pool.reserveB -= amountOut; }
        else { pool.reserveB += amountIn; pool.reserveA -= amountOut; }
        emit Swapped(poolId, msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    function getQuote(uint256 poolId, address tokenIn, uint256 amountIn) external view returns (uint256 amountOut, uint256 fee, uint256 priceImpactBps) {
        Pool storage pool = pools[poolId];
        require(pool.exists, "Pool not found");
        bool isTokenA = tokenIn == pool.tokenA;
        (uint256 reserveIn, uint256 reserveOut) = isTokenA ? (pool.reserveA, pool.reserveB) : (pool.reserveB, pool.reserveA);
        require(reserveIn > 0 && reserveOut > 0, "No reserves");
        uint256 amountInAfterFee = (amountIn * (10000 - pool.feeBps)) / 10000;
        fee = amountIn - amountInAfterFee;
        amountOut = (amountInAfterFee * reserveOut) / (reserveIn + amountInAfterFee);
        uint256 spotPrice = (reserveOut * 1e18) / reserveIn;
        uint256 executionPrice = (amountOut * 1e18) / amountIn;
        if (spotPrice > executionPrice) { priceImpactBps = ((spotPrice - executionPrice) * 10000) / spotPrice; }
    }

    function getPool(uint256 poolId) external view returns (PoolInfo memory) {
        Pool storage p = pools[poolId];
        return PoolInfo(poolId, p.tokenA, p.tokenB, p.reserveA, p.reserveB, p.feeBps, p.totalLpSupply, 0);
    }

    function getPoolId(address tokenA, address tokenB) external view returns (uint256) {
        (address t0, address t1) = _sortTokens(tokenA, tokenB);
        return poolIndex[keccak256(abi.encodePacked(t0, t1))];
    }

    function getAllPools() external view returns (PoolInfo[] memory) {
        PoolInfo[] memory all = new PoolInfo[](poolCount);
        for (uint256 i = 1; i <= poolCount; i++) {
            Pool storage p = pools[i];
            all[i-1] = PoolInfo(i, p.tokenA, p.tokenB, p.reserveA, p.reserveB, p.feeBps, p.totalLpSupply, 0);
        }
        return all;
    }

    function getUserLP(uint256 poolId) external view returns (uint256) { return lpBalances[poolId][msg.sender]; }

    function _sortTokens(address a, address b) internal pure returns (address, address) { return a < b ? (a, b) : (b, a); }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) { z = y; uint256 x = y / 2 + 1; while (x < z) { z = x; x = (y / x + x) / 2; } }
        else if (y != 0) { z = 1; }
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool s,) = token.call(abi.encodeWithSelector(0xa9059cbb, to, amount));
        require(s, "TF");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool s,) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, amount));
        require(s, "TFF");
    }

    receive() external payable {}
}
