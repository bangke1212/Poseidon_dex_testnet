import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "../src/providers/ClientProviders";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Poseidon DEX",
  description: "Poseidon DEX Agregator — Multi-chain swap on Sepolia, Arbitrum, BSC",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-display bg-background-dark text-white`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
