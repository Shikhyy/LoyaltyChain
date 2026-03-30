"use client";
import { useState } from "react";
import { useAccount, useReadContract, useWatchContractEvent } from "wagmi";
import { ADDRESSES, LOYALTY_TOKEN_ABI, SWAP_POOL_ABI } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { TrendingUp, Layers, Wifi, Sparkles } from "lucide-react";

interface ActivityEvent {
  type: "swap" | "redeem" | "mint";
  fromBrand: number;
  toBrand?: number;
  amount: number;
  timestamp: number;
  user: string;
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  const { data: portfolio } = useReadContract({
    address: ADDRESSES.token,
    abi: LOYALTY_TOKEN_ABI,
    functionName: "getPortfolio",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  useWatchContractEvent({
    address: ADDRESSES.swap,
    abi: SWAP_POOL_ABI,
    eventName: "Swapped",
    onLogs(logs) {
      const newActivities = logs.map((log: any) => ({
        type: "swap" as const,
        fromBrand: Number(log.args.fromBrand),
        toBrand: Number(log.args.toBrand),
        amount: Number(log.args.amountIn),
        timestamp: Date.now(),
        user: log.args.user,
      }));
      setActivities(prev => [...newActivities, ...prev].slice(0, 10));
    },
  });

  useWatchContractEvent({
    address: ADDRESSES.token,
    abi: LOYALTY_TOKEN_ABI,
    eventName: "Redeemed",
    onLogs(logs) {
      const newActivities = logs.map((log: any) => ({
        type: "redeem" as const,
        fromBrand: Number(log.args.brandId),
        amount: Number(log.args.amount),
        timestamp: Date.now(),
        user: log.args.user,
      }));
      setActivities(prev => [...newActivities, ...prev].slice(0, 10));
    },
  });

  useWatchContractEvent({
    address: ADDRESSES.token,
    abi: LOYALTY_TOKEN_ABI,
    eventName: "TokensMinted",
    onLogs(logs) {
      const newActivities = logs.map((log: any) => ({
        type: "mint" as const,
        fromBrand: Number(log.args.brandId),
        amount: Number(log.args.amount),
        timestamp: Date.now(),
        user: log.args.to,
      }));
      setActivities(prev => [...newActivities, ...prev].slice(0, 10));
    },
  });

  const balances: Record<number, bigint> = {};
  if (portfolio) {
    const [ids, bals] = portfolio;
    ids.forEach((id, i) => { balances[Number(id)] = bals[i]; });
  }

  const displayBrands = MOCK_BRANDS.map(b => ({
    ...b,
    balance: portfolio ? Number(balances[b.id] ?? 0n) : Math.floor(Math.random() * 500 + 50),
  }));

  const totalValueUSD = displayBrands.reduce((sum, b) => sum + b.balance * 0.01, 0);

  function getBrandName(id: number) {
    return MOCK_BRANDS[id]?.symbol || `Brand ${id}`;
  }

  function timeAgo(timestamp: number) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 md:py-32 gap-8 px-4">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-[#ff4000] to-[#ff6a33] rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-[#ff4000]/30 animate-pulse-glow">
            LC
          </div>
          <div className="absolute -inset-4 bg-gradient-to-br from-[#ff4000]/20 to-transparent rounded-full blur-2xl -z-10" />
        </motion.div>
        
        <motion.div 
          className="text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            <span className="text-[#1a1a1a]">Loyalty</span>
            <span className="text-[#ff4000]">Chain</span>
          </h1>
          <p className="text-[#666666] text-lg mb-8">
            Trade airline miles, hotel points, and retail rewards as tokens on BNB Chain.
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ConnectButton />
        </motion.div>
        
        <motion.div 
          className="flex gap-8 text-sm text-[#999999]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            BNB Chain
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Real-time
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-[#1a1a1a] mb-2">Your Portfolio</h1>
        <p className="text-[#666666]">Tokenized loyalty points across all brands</p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 stagger-children">
        <motion.div 
          className="stat-card group"
          whileHover={{ y: -4, scale: 1.02 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#ff4000]/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#ff4000]" />
            </div>
            <p className="text-sm text-[#666666]">Total Value</p>
          </div>
          <p className="text-3xl font-bold text-[#1a1a1a]">${totalValueUSD.toFixed(2)}</p>
        </motion.div>
        
        <motion.div 
          className="stat-card group"
          whileHover={{ y: -4, scale: 1.02 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#ff4000]/10 rounded-xl flex items-center justify-center">
              <Layers className="w-5 h-5 text-[#ff4000]" />
            </div>
            <p className="text-sm text-[#666666]">Brands held</p>
          </div>
          <p className="text-3xl font-bold text-[#1a1a1a]">
            {displayBrands.filter(b => b.balance > 0).length}
          </p>
        </motion.div>
        
        <motion.div 
          className="stat-card group"
          whileHover={{ y: -4, scale: 1.02 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#ff4000]/10 rounded-xl flex items-center justify-center">
              <Wifi className="w-5 h-5 text-[#ff4000]" />
            </div>
            <p className="text-sm text-[#666666]">Network</p>
          </div>
          <p className="text-3xl font-bold text-[#ff4000]">BSC</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#ff4000]" />
            Your Tokens
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayBrands.map((brand, idx) => (
              <motion.div
                key={brand.id}
                className="card p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -2, boxShadow: "0 20px 40px -12px rgba(255, 64, 0, 0.15)" }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    className="brand-icon w-12 h-12 text-lg"
                    style={{ backgroundColor: brand.logo }}
                    whileHover={{ scale: 1.1, rotate: -5 }}
                  >
                    {brand.symbol}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1a1a1a] truncate">{brand.name}</p>
                    <p className="text-xs text-[#999999]">{brand.pointsPerToken} pts/token</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-[#1a1a1a]">{brand.balance.toLocaleString()}</p>
                    <p className="text-xs text-[#ff4000] font-medium">${(brand.balance * 0.01).toFixed(2)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#ff4000]" />
            Recent Activity
          </h2>
          <motion.div 
            className="card p-4 max-h-96 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-[#f4f3e5] rounded-2xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-8 h-8 text-[#d4d2c5]" />
                </div>
                <p className="text-[#999999]">No recent activity</p>
                <p className="text-xs text-[#d4d2c5] mt-1">Transactions will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity, idx) => (
                  <motion.div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#f4f3e5]/50 hover:bg-[#f4f3e5] transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <span className={`badge badge-${activity.type}`}>
                      {activity.type}
                    </span>
                    <span className="text-sm text-[#666666] flex-1">
                      {activity.type === "swap" ? (
                        <>{getBrandName(activity.fromBrand)} → {getBrandName(activity.toBrand!)}</>
                      ) : activity.type === "redeem" ? (
                        <>Redeem {getBrandName(activity.fromBrand)}</>
                      ) : (
                        <>Mint {getBrandName(activity.fromBrand)}</>
                      )}
                    </span>
                    <span className="text-sm font-semibold text-[#1a1a1a]">{activity.amount}</span>
                    <span className="text-xs text-[#999999] whitespace-nowrap">{timeAgo(activity.timestamp)}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div 
            className="mt-4 card p-4 bg-gradient-to-br from-[#ff4000]/5 to-[#ff6a33]/5 border-[#ff4000]/20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#ff4000]" />
              <span className="text-xs font-semibold text-[#ff4000] uppercase tracking-wide">Pro Tip</span>
            </div>
            <p className="text-sm text-[#666666]">
              Swap OYO points for IndiGo miles instantly with only 0.3% protocol fee.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
