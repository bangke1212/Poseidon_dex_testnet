/**
 * Unified Wallet Adapter — EVM (MetaMask) + Solana (Phantom)
 *
 * Detects available wallets and provides a unified connection interface.
 * Supports both desktop extensions and mobile deep-linking.
 */

// ═══════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════

export enum WalletType {
  METAMASK = "metamask",
  PHANTOM = "phantom",
  SOLFLARE = "solflare",
  NONE = "none",
}

export interface WalletInfo {
  type: WalletType;
  name: string;
  icon: string;
  chain: "evm" | "solana";
  installed: boolean;
  address: string | null;
}

export interface WalletConnection {
  type: WalletType;
  address: string;
  chain: "evm" | "solana";
  chainId?: number | string;
}

// ═══════════════════════════════════════════
//  WALLET DETECTION
// ═══════════════════════════════════════════

export function detectWallets(): WalletInfo[] {
  const win = window as any;
  const wallets: WalletInfo[] = [];

  const hasMetaMask = typeof win.ethereum !== "undefined" && win.ethereum.isMetaMask;
  wallets.push({ type: WalletType.METAMASK, name: "MetaMask", icon: "\U0001f98a", chain: "evm", installed: hasMetaMask, address: null });

  const hasPhantom = typeof win.solana !== "undefined" && win.solana.isPhantom;
  wallets.push({ type: WalletType.PHANTOM, name: "Phantom", icon: "\U0001f47b", chain: "solana", installed: hasPhantom, address: null });

  const hasSolflare = typeof win.solflare !== "undefined";
  wallets.push({ type: WalletType.SOLFLARE, name: "Solflare", icon: "\u2600\ufe0f", chain: "solana", installed: hasSolflare, address: null });

  return wallets;
}

// ═══════════════════════════════════════════
//  WALLET ADAPTER
// ═══════════════════════════════════════════

export class WalletAdapter {
  private ethProvider: any = null;
  private solProvider: any = null;
  private _connected: WalletConnection | null = null;

  get connected(): WalletConnection | null { return this._connected; }

  async connect(walletType: WalletType): Promise<WalletConnection> {
    await this.disconnect();
    switch (walletType) {
      case WalletType.METAMASK: return this._connectMetaMask();
      case WalletType.PHANTOM: case WalletType.SOLFLARE: return this._connectPhantom();
      default: throw new Error("Unsupported wallet: " + walletType);
    }
  }

  async disconnect(): Promise<void> {
    if (this.solProvider && this.solProvider.disconnect) await this.solProvider.disconnect();
    this.ethProvider = null; this.solProvider = null; this._connected = null;
  }

  // ── META MASK ──

  private async _connectMetaMask(): Promise<WalletConnection> {
    const win = window as any;
    if (!win.ethereum) {
      if (this._isMobile()) { this._openMetaMaskMobile(); throw new Error("Opening MetaMask app... Please approve in MetaMask mobile."); }
      throw new Error("MetaMask not installed. Please install MetaMask extension or mobile app.");
    }
    this.ethProvider = win.ethereum;
    const accounts: string[] = await this.ethProvider.request({ method: "eth_requestAccounts" });
    if (!accounts || accounts.length === 0) throw new Error("No accounts authorized");
    const chainId = await this.ethProvider.request({ method: "eth_chainId" });

    this.ethProvider.on("accountsChanged", (accts: string[]) => {
      if (accts.length === 0) { this._connected = null; window.dispatchEvent(new CustomEvent("poseidon:disconnect", { detail: { type: WalletType.METAMASK } })); }
      else if (this._connected) { this._connected = { ...this._connected, address: accts[0] }; window.dispatchEvent(new CustomEvent("poseidon:accountsChanged", { detail: { address: accts[0] } })); }
    });
    this.ethProvider.on("chainChanged", (cid: string) => {
      if (this._connected) { this._connected = { ...this._connected, chainId: parseInt(cid, 16) }; window.dispatchEvent(new CustomEvent("poseidon:chainChanged", { detail: { chainId: parseInt(cid, 16) } })); }
    });

    this._connected = { type: WalletType.METAMASK, address: accounts[0], chain: "evm", chainId: parseInt(chainId, 16) };
    return this._connected;
  }

  // ── PHANTOM / SOLFLARE ──

  private async _connectPhantom(): Promise<WalletConnection> {
    const win = window as any;
    const provider = win.solana || win.solflare;
    if (!provider) {
      if (this._isMobile()) { this._openPhantomMobile(); throw new Error("Opening Phantom app... Please approve in Phantom mobile."); }
      throw new Error("Phantom wallet not installed. Please install Phantom extension or mobile app.");
    }
    this.solProvider = provider;
    const resp = await provider.connect();
    const pubkey = resp.publicKey.toString();
    const walletType = provider.isPhantom ? WalletType.PHANTOM : WalletType.SOLFLARE;

    provider.on("disconnect", () => { this._connected = null; window.dispatchEvent(new CustomEvent("poseidon:disconnect", { detail: { type: walletType } })); });
    provider.on("accountChanged", (pk: any) => {
      if (pk && this._connected) { this._connected = { ...this._connected, address: pk.toString() }; window.dispatchEvent(new CustomEvent("poseidon:accountsChanged", { detail: { address: pk.toString() } })); }
      else { this._connected = null; window.dispatchEvent(new CustomEvent("poseidon:disconnect", { detail: { type: walletType } })); }
    });

    this._connected = { type: walletType, address: pubkey, chain: "solana", chainId: "devnet" };
    return this._connected;
  }

  // ── HELPERS ──

  private _isMobile(): boolean { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent); }

  private _openMetaMaskMobile(): void {
    const dappUrl = window.location.href;
    window.open("https://metamask.app.link/dapp/" + dappUrl.replace(/^https?:\/\//, ""), "_blank");
  }

  private _openPhantomMobile(): void {
    window.open("https://phantom.app/ul/browse/" + encodeURIComponent(window.location.href), "_blank");
  }

  // ── CHAIN SWITCHING (EVM only) ──

  async switchEVMChain(chainId: number, chainName: string, rpcUrl: string, nativeCurrency: any, explorerUrl: string): Promise<boolean> {
    if (!this.ethProvider) throw new Error("MetaMask not connected");
    const hexChainId = "0x" + chainId.toString(16);
    try {
      await this.ethProvider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChainId }] });
      return true;
    } catch (e: any) {
      if (e.code === 4902) {
        await this.ethProvider.request({ method: "wallet_addEthereumChain", params: [{ chainId: hexChainId, chainName, rpcUrls: [rpcUrl], nativeCurrency, blockExplorerUrls: [explorerUrl] }] });
        return true;
      }
      return false;
    }
  }
}
