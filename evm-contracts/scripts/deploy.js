const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(`🚀 Deploying PoseidonSwap to ${hre.network.name}...`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH\n`);

  // 1. Deploy Test Tokens
  const tokens = [
    { name: "Poseidon USD", symbol: "PUSD", decimals: 18, supply: "1000000000000000000000000" },
    { name: "Poseidon BTC", symbol: "PBTC", decimals: 18, supply: "21000000000000000000000000" },
    { name: "Poseidon ETH", symbol: "PETH", decimals: 18, supply: "1000000000000000000000000" },
    { name: "Poseidon LINK", symbol: "PLINK", decimals: 18, supply: "1000000000000000000000000" },
    { name: "Wrapped BTC", symbol: "WBTC", decimals: 18, supply: "21000000000000000000000000" },
  ];

  console.log("📦 Deploying Test Tokens...");
  const deployedTokens = [];
  for (const t of tokens) {
    const Token = await hre.ethers.getContractFactory("PoseidonTestToken");
    const token = await Token.deploy(t.name, t.symbol, t.decimals, t.supply);
    await token.waitForDeployment();
    const addr = await token.getAddress();
    deployedTokens.push({ ...t, address: addr });
    console.log(`   ✅ ${t.symbol} deployed at: ${addr}`);
  }

  // 2. Deploy PoseidonSwap
  console.log("\n🔄 Deploying PoseidonSwap...");
  const PoseidonSwap = await hre.ethers.getContractFactory("PoseidonSwap");
  const swap = await PoseidonSwap.deploy();
  await swap.waitForDeployment();
  const swapAddress = await swap.getAddress();
  console.log(`   ✅ PoseidonSwap deployed at: ${swapAddress}`);

  // 3. Create Pools
  console.log("\n🏊 Creating Liquidity Pools...");
  
  const poolsToCreate = [
    { idx: 0, tokenA: 0, tokenB: 1, fee: 30 },  // PUSD/PLINK
    { idx: 1, tokenA: 1, tokenB: 4, fee: 25 },  // PLINK/WBTC
    { idx: 2, tokenA: 0, tokenB: 2, fee: 20 },  // PUSD/PETH
    { idx: 3, tokenA: 1, tokenB: 3, fee: 30 },  // PLINK/PBTC
    { idx: 4, tokenA: 0, tokenB: 3, fee: 25 },  // PUSD/PBTC
  ];

  for (const p of poolsToCreate) {
    const tokenAAddr = deployedTokens[p.tokenA].address;
    const tokenBAddr = deployedTokens[p.tokenB].address;
    const tx = await swap.createPool(tokenAAddr, tokenBAddr, p.fee);
    const receipt = await tx.wait();
    console.log(`   ✅ Pool ${p.idx + 1}: ${deployedTokens[p.tokenA].symbol}/${deployedTokens[p.tokenB].symbol} (${p.fee/100}%)`);

    // Add initial liquidity
    try {
      const TokenA = await hre.ethers.getContractAt("PoseidonTestToken", tokenAAddr);
      const TokenB = await hre.ethers.getContractAt("PoseidonTestToken", tokenBAddr);
      
      const poolId = p.idx + 1;
      const amountA = hre.ethers.parseEther("50000");
      const amountB = hre.ethers.parseEther("50000");

      await TokenA.approve(swapAddress, amountA);
      await TokenB.approve(swapAddress, amountB);
      await swap.addLiquidity(poolId, amountA, amountB);
      console.log(`      💧 Initial liquidity added: 50000 ${deployedTokens[p.tokenA].symbol} + 50000 ${deployedTokens[p.tokenB].symbol}`);
    } catch (e) {
      console.log(`      ⚠️ Could not add initial liquidity: ${e.message?.slice(0, 80)}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network:     ${hre.network.name}`);
  console.log(`Chain ID:    ${hre.network.config.chainId || await hre.ethers.provider.getNetwork().then(n => n.chainId)}`);
  console.log(`Swap:        ${swapAddress}`);
  console.log("Tokens:");
  for (const t of deployedTokens) {
    console.log(`  ${t.symbol.padEnd(8)} ${t.address}`);
  }

  // Output JSON for SDK
  console.log("\n" + "=".repeat(60));
  console.log("📋 SDK CONFIG (copy to evm-sdk/config.json)");
  console.log("=".repeat(60));
  console.log(JSON.stringify({
    network: hre.network.name,
    chainId: hre.network.config.chainId || (await hre.ethers.provider.getNetwork()).chainId,
    swapAddress,
    tokens: deployedTokens.map(t => ({ symbol: t.symbol, name: t.name, address: t.address, decimals: t.decimals })),
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
