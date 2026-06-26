"use client";

import { WalletProviders } from "./WalletProviders";
import { PoseidonProvider } from "./AegisProvider";

export function ClientProviders({ children }: { programId?: string; children: React.ReactNode }) {
  return (
    <WalletProviders>
      <PoseidonProvider>{children}</PoseidonProvider>
    </WalletProviders>
  );
}
