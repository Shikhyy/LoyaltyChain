"use client";
import "./globals.css";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/wagmiConfig";
import "@rainbow-me/rainbowkit/styles.css";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LayoutDashboard, ArrowLeftRight, Ticket, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Portfolio", href: "/", icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: "Swap", href: "/swap", icon: <ArrowLeftRight className="w-5 h-5" /> },
    { name: "Redeem", href: "/redeem", icon: <Ticket className="w-5 h-5" /> },
    { name: "Admin", href: "/admin", icon: <ShieldCheck className="w-5 h-5" /> },
  ];

  return (
    <html lang="en">
      <body className="min-h-screen pb-20 md:pb-0">
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-[#e8e6d9] shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                  <div className="flex justify-between h-16 items-center">
                    <Link href="/" className="flex items-center gap-2 group">
                      <motion.div 
                        className="w-10 h-10 bg-[#ff4000] rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-lg"
                        whileHover={{ rotate: 12, scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        LC
                      </motion.div>
                      <span className="font-bold text-xl tracking-tight hidden sm:inline">
                        <span className="text-[#1a1a1a]">Loyalty</span>
                        <span className="text-[#ff4000]">Chain</span>
                      </span>
                      <span className="text-[10px] bg-[#ff4000]/10 text-[#ff4000] border border-[#ff4000]/20 px-2 py-0.5 rounded-full font-semibold ml-1 uppercase tracking-wide hidden md:inline">
                        BSC Testnet
                      </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-1 bg-[#f4f3e5] p-1.5 rounded-2xl">
                      {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                              isActive
                                ? "bg-[#ff4000] text-white shadow-lg shadow-[#ff4000]/30"
                                : "text-[#666666] hover:text-[#1a1a1a] hover:bg-white"
                            }`}
                          >
                            {item.icon}
                            {item.name}
                            {isActive && (
                              <motion.div
                                layoutId="nav-indicator"
                                className="absolute inset-0 bg-[#ff4000] rounded-xl -z-10"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                              />
                            )}
                          </Link>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3">
                      <ConnectButton 
                        showBalance={false} 
                        chainStatus="none" 
                        accountStatus="avatar"
                      />
                    </div>
                  </div>
                </div>
              </nav>

              <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </main>

              <footer className="py-12 border-t border-[#e8e6d9] mt-12">
                <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4 text-sm text-[#999999]">
                    <span>&copy; 2026 LoyaltyChain</span>
                    <span className="w-1 h-1 bg-[#d4d2c5] rounded-full" />
                    <span>RWA Demo Day</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <a href="https://github.com/Shikhyy/LoyaltyChain" target="_blank" rel="noopener noreferrer" className="text-[#999999] hover:text-[#ff4000] transition-colors">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </footer>

              <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <motion.div 
                  className="bg-white/95 backdrop-blur-xl border border-[#e8e6d9] rounded-2xl flex justify-around p-2 shadow-2xl shadow-black/10"
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                >
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all min-w-[60px] ${
                          isActive ? "text-[#ff4000]" : "text-[#999999]"
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="mobile-nav-bg"
                            className="absolute inset-0 bg-[#ff4000]/10 rounded-xl"
                          />
                        )}
                        <div className="relative z-10">{item.icon}</div>
                        <span className="text-[10px] font-medium relative z-10">{item.name}</span>
                      </Link>
                    );
                  })}
                </motion.div>
              </div>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
