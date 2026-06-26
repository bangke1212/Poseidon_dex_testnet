# 🌊 Poseidon DEX — Multi-Chain Full-Stack DEX

> **Poseidon DEX Testnet** is a full-stack multi-chain DEX platform with smart contracts (Solidity), TypeScript SDK, and TWO frontends (Next.js + Vite). Supports **Ethereum Sepolia**, **Arbitrum Sepolia**, and **BSC Testnet**.

Owned by [@bangke1212](https://github.com/bangke1212) · Adapted from [Aegis Protocol](https://github.com/Lucasalb11/Aegis).

## 📦 Monorepo Layout

```
Poseidon_dex_testnet/
├── evm-contracts/      # Hardhat + Solidity (PoseidonSwap.sol, PoseidonTestToken.sol)
├── evm-sdk/            # TypeScript SDK (ethers.js v6) — multi-chain DEX client
├── aegis-frontend/     # Next.js 14 frontend (App Router)
├── vite-dex-app/       # ⭐ Vite + React + Tailwind v4 standalone DEX (DEPLOYED ON VERCEL)
├── data/               # Seed JSON data (tokens, pools, transactions)
├── vercel.json         # Vercel config (builds vite-dex-app)
└── README.md
```

## 🚀 Vercel Deployment

This repo is configured to deploy the **`vite-dex-app/`** as the live site.

- Build command: `cd vite-dex-app && npm install && npm run build`
- Output directory: `vite-dex-app/dist`
- Framework: Vite (auto-detected)

Just connect this repo on https://vercel.com/new — no extra config required.

To deploy the Next.js `aegis-frontend/` instead, change the Vercel Root Directory to `aegis-frontend/`.

## 🎯 Chains Supported

| Chain | Chain ID | RPC |
|-------|----------|-----|
| **Ethereum Sepolia** | 11155111 | `ethereum-sepolia.publicnode.com` |
| **Arbitrum Sepolia** | 421614  | `sepolia-rollup.arbitrum.io/rpc` |
| **BSC Testnet**      | 97      | `data-seed-prebsc-1-s1.binance.org:8545` |

## ✨ Features

- ✅ AMM swap with constant product formula (x·y=k)
- ✅ Real-time quote with price impact + slippage protection
- ✅ Liquidity pools (add/remove, LP tokens, APR)
- ✅ Multi-chain selector + MetaMask wallet
- ✅ Token faucet (1,000 tokens per claim)
- ✅ Portfolio + transaction history
- ✅ No trading chart — clean swap interface
- ✅ Dual frontend: Next.js (`aegis-frontend/`) + Vite (`vite-dex-app/`)

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Smart Contracts | Solidity 0.8.20 (Hardhat) |
| SDK | TypeScript + ethers.js v6 |
| Frontend (SSR) | Next.js 14 + React 18 + Tailwind |
| Frontend (SPA) | Vite + React 18 + Tailwind v4 |
| Wallet | MetaMask |
| Deploy | Vercel |

## 📦 Quick Start

```bash
git clone https://github.com/bangke1212/Poseidon_dex_testnet.git
cd Poseidon_dex_testnet

# --- Smart Contracts ---
cd evm-contracts && npm install
PRIVATE_KEY=your_key npx hardhat run scripts/deploy.js --network sepolia

# --- SDK ---
cd ../evm-sdk && npm install && npm run build

# --- Next.js Frontend ---
cd ../aegis-frontend && npm install
cp env.local.example .env.local
# Edit .env.local with deployed contract addresses
npm run dev

# --- Vite Frontend ---
cd ../vite-dex-app && npm install
npm run dev
```

## 📊 Architecture

```
┌────────────────────────────────────────────────────────┐
│            Vite SPA  (vite-dex-app — Vercel)           │
│            Next.js SSR (aegis-frontend)                │
└───────────────┬────────────────────────────────────────┘
                │
                ▼
        ┌──────────────────┐
        │  evm-sdk         │  ethers.js · PoseidonClient
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │  evm-contracts   │  PoseidonSwap · PoseidonTestToken
        │  (Sepolia /      │  AMM (x·y=k) · LP tokens · Faucet
        │   Arbitrum /     │
        │   BSC Testnet)   │
        └──────────────────┘
```

## 📝 License

Apache-2.0
