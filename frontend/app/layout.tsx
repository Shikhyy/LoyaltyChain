"use client";
import "./globals.css";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/wagmiConfig";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-sm">LC</div>
                  <span className="font-semibold text-gray-900">LoyaltyChain</span>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">BSC Testnet</span>
                </div>
                <div className="flex items-center gap-6">
                  <a href="/"       className="text-sm text-gray-600 hover:text-gray-900">Portfolio</a>
                  <a href="/swap"   className="text-sm text-gray-600 hover:text-gray-900">Swap</a>
                  <a href="/redeem" className="text-sm text-gray-600 hover:text-gray-900">Redeem</a>
                  <a href="/admin"  className="text-sm text-gray-600 hover:text-gray-900">Admin</a>
                  <ConnectButton />
                </div>
              </nav>
              <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}

import { ConnectButton } from "@rainbow-me/rainbowkit";
