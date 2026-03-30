"use client";
import "./globals.css";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/wagmiConfig";
import "@rainbow-me/rainbowkit/styles.css";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { LayoutDashboard, ArrowLeftRight, Ticket, ShieldCheck, Globe } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const queryClient = new QueryClient();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Portfolio", href: "/", icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: "Swap", href: "/swap", icon: <ArrowLeftRight className="w-4 h-4" /> },
    { name: "Redeem", href: "/redeem", icon: <Ticket className="w-4 h-4" /> },
    { name: "Admin", href: "/admin", icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <html lang="en">
      <body className="bg-[#0a0a0a] min-h-screen text-[#ededed] antialiased selection:bg-emerald-500/30">
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/20 via-[#0a0a0a] to-[#0a0a0a]" />
        
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider theme={darkTheme({
              accentColor: '#10b981',
              borderRadius: 'large',
            })}>
              <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-between h-16 items-center">
                    <Link href="/" className="flex items-center gap-2 group">
                      <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-black transform group-hover:rotate-12 transition-transform shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                        LC
                      </div>
                      <span className="font-bold text-xl tracking-tight hidden sm:inline gradient-text">LoyaltyChain</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium ml-2 uppercase tracking-wide">
                        BSC Testnet
                      </span>
                    </Link>

                    <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                      {navItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            pathname === item.href
                              ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                              : "text-gray-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {item.icon}
                          {item.name}
                        </Link>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" />
                    </div>
                  </div>
                </div>
              </nav>

              <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </main>

              {/* Mobile Navigation */}
              <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] z-50">
                <div className="bg-[#1a1a1a]/80 backdrop-blur-2xl border border-white/10 rounded-2xl flex justify-around p-2 shadow-2xl">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                        pathname === item.href ? "text-emerald-400 bg-white/5" : "text-gray-500"
                      }`}
                    >
                      {item.icon}
                      <span className="text-[10px] font-medium">{item.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <footer className="py-12 border-t border-white/5 mt-12 bg-black/40">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>&copy; 2026 LoyaltyChain Protocol</span>
                    <span className="w-1 h-1 bg-gray-800 rounded-full" />
                    <span>Built for RWA Demo Day</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <a href="https://github.com/Shikhyy/LoyaltyChain" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors">
                      <Globe className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </footer>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
