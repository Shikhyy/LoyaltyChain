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
      <body className="bg-gray-50 min-h-screen pb-16 md:pb-0">
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-sm">LC</div>
                  <span className="font-semibold text-gray-900 hidden sm:inline">LoyaltyChain</span>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full hidden sm:inline">BSC Testnet</span>
                </div>
                <div className="flex items-center gap-3 md:gap-6">
                  <a href="/" className="text-sm text-gray-600 hover:text-gray-900 hidden md:inline">Portfolio</a>
                  <a href="/swap" className="text-sm text-gray-600 hover:text-gray-900 hidden md:inline">Swap</a>
                  <a href="/redeem" className="text-sm text-gray-600 hover:text-gray-900 hidden md:inline">Redeem</a>
                  <a href="/admin" className="text-sm text-gray-600 hover:text-gray-900 hidden md:inline">Admin</a>
                  <ConnectButton />
                </div>
              </nav>
              <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>
              
              <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-50">
                <a href="/" className="flex flex-col items-center gap-1 text-xs text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Portfolio
                </a>
                <a href="/swap" className="flex flex-col items-center gap-1 text-xs text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Swap
                </a>
                <a href="/redeem" className="flex flex-col items-center gap-1 text-xs text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  Redeem
                </a>
              </div>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}

import { ConnectButton } from "@rainbow-me/rainbowkit";
