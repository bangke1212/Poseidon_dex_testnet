# 🐚 Poseidon DEX Agregator — Multi-Chain EVM DeFi Platform

> **Poseidon DEX Agregator** is a comprehensive multi-chain DEX platform supporting **Ethereum Sepolia**, **Arbitrum Sepolia**, and **BSC Testnet**. Built with Solidity smart contracts, TypeScript SDK, and Next.js frontend.

Adapted from [Aegis Protocol](https://github.com/Lucasalb11/Aegis) by [@bangke1212](https://github.com/bangke1212).

## 🎯 Chains Supported

| Chain | Chain ID | RPC | Status |
|-------|----------|-----|--------|
| **Ethereum Sepolia** | 11155111 | `ethereum-sepolia.publicnode.com` | ✅ |
| **Arbitrum Sepolia** | 421614 | `sepolia-rollup.arbitrum.io/rpc` | ✅ |
| **BSC Testnet** | 97 | `data-seed-prebsc-1-s1.binance.org:8545` | ✅ |

## 🚀 Features

### DEX Swap
- ✅ Cross-chain token swaps via AMM
- ✅ Constant product formula (x\*y=k)
- ✅ Configurable fees per pool
- ✅ Real-time quotes with price impact
- ✅ Slippage protection

### Liquidity Pools
- ✅ Add/remove liquidity
- ✅ LP token system
- ✅ Earn fees proportional to share

### Multi-Chain
- ✅ Chain selector in header
- ✅ MetaMask / any Web3 wallet
- ✅ Auto chain detection
- ✅ Add chain to wallet

### Faucet
- ✅ Claim test tokens on any supported chain
- ✅ 1,000 tokens per claim

### Modern Frontend
- ✅ Next.js 14 + React 18 + TypeScript
- ✅ Tailwind CSS dark theme
- ✅ Responsive mobile-first
- ✅ **No charts — clean swap interface**

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Smart Contracts** | Solidity 0.8.20 (Hardhat) |
| **SDK** | TypeScript + ethers.js v6 |
| **Frontend** | Next.js 14 + React 18 |
| **Wallet** | MetaMask / Web3 Wallet |
| **Styling** | Tailwind CSS |
| **Deploy** | Hardhat (multi-chain) |

## 📦 Installation

```bash
git clone https://github.com/bangke1212/Poseidon-Dex-Agregator-Testnet.git
cd Poseidon-Dex-Agregator-Testnet

# Install contracts
cd evm-contracts && npm install

# Install SDK
cd ../evm-sdk && npm install

# Install frontend
cd ../aegis-frontend && npm install
```

### Deploy Contracts

```bash
cd evm-contracts

# Sepolia
PRIVATE_KEY=your_key npx hardhat run scripts/deploy.js --network sepolia

# Arbitrum Sepolia
PRIVATE_KEY=your_key npx hardhat run scripts/deploy.js --network arbitrumSepolia

# BSC Testnet
PRIVATE_KEY=your_key npx hardhat run scripts/deploy.js --network bscTestnet
```

### Run Frontend

```bash
cd aegis-frontend
cp env.local.example .env.local
# Edit .env.local with deployed contract addresses
npm run dev
```

## 📊 Architecture

```
Poseidon DEX Agregator
├── evm-contracts/           # Solidity Smart Contracts
│   ├── contracts/
│   │   ├── PoseidonSwap.sol     # AMM Pool + Swap
│   │   └── PoseidonTestToken.sol # ERC20 Test Token
│   ├── scripts/deploy.js        # Multi-chain deploy
│   └── hardhat.config.js        # Network configs
├── evm-sdk/                 # TypeScript SDK
│   ├── src/
│   │   ├── index.ts              # PoseidonClient
│   │   └── abi.ts                # Contract ABIs
│   └── package.json
└── aegis-frontend/          # Next.js 14 Web UI
    ├── app/
    │   ├── swap/                 # Swap interface
    │   ├── pools/                # Liquidity pools
    │   └── faucet/              # Token faucet
    ├── components/
    │   ├── TopNav.tsx            # Chain selector + wallet
    │   └── TokenSelector.tsx
    └── src/providers/
        ├── WalletProviders.tsx   # MetaMask multi-chain
        └── AegisProvider.tsx     # Poseidon SDK provider
```

## 🙏 Credits

Adapted from [Aegis Protocol](https://github.com/Lucasalb11/Aegis) — Solana Student Hackathon Fall 2025.

---

**Built by [@bangke1212](https://github.com/bangke1212)** 🐚

*Multi-chain DeFi on Sepolia, Arbitrum, and BSC* 🚀
