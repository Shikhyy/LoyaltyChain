"use client";
import { useState } from "react";
import { useAccount, useReadContract, useWatchContractEvent } from "wagmi";
import { ADDRESSES, LOYALTY_TOKEN_ABI, SWAP_POOL_ABI } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { 
  Wallet, 
  TrendingUp, 
  Globe, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  ExternalLink,
  Ticket,
  ArrowLeftRight
} from "lucide-react";

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

  const balances: Record<number, bigint> = {};
  if (portfolio) {
    const [ids, bals] = portfolio;
    ids.forEach((id, i) => { balances[Number(id)] = bals[i]; });
  }

  const displayBrands = MOCK_BRANDS.map(b => ({
    ...b,
    balance: portfolio ? Number(balances[b.id] ?? 0n) : 0,
  }));

  const totalValueUSD = displayBrands.reduce((sum, b) => sum + (b.balance * 0.01), 0);
  const activeBrands = displayBrands.filter(b => b.balance > 0).length;

  function getBrand(id: number) {
    return MOCK_BRANDS.find(b => b.id === id) || { symbol: `B${id}`, name: `Brand ${id}`, logo: "#333" };
  }

  function timeAgo(timestamp: number) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-8 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]"
        >
          <Wallet className="w-10 h-10 text-emerald-500" />
        </motion.div>
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Connect Your Wallet</h1>
        <p className="text-gray-400 max-w-sm mb-8 text-lg leading-relaxed">
          Access your decentralized loyalty portfolio and start swapping miles across the BSC ecosystem.
        </p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-24">
      {/* Header & Stats */}
      <section>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Portfolio Overview</h1>
            <p className="text-gray-400">Manage your tokenized loyalty assets in one place.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Live Syncing
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <motion.div 
            whileHover={{ y: -4 }}
            className="glass-card p-6 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-12 h-12" />
            </div>
            <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Total Balance
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">${totalValueUSD.toFixed(2)}</span>
              <span className="text-xs text-emerald-400 font-medium">+2.4%</span>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4 }}
            className="glass-card p-6 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Globe className="w-12 h-12" />
            </div>
            <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Brands Tokenized
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{activeBrands}</span>
              <span className="text-xs text-gray-500">of {MOCK_BRANDS.length} total</span>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -4 }}
            className="glass-card p-6 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="w-12 h-12" />
            </div>
            <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Ticket className="w-4 h-4" /> Redemptions
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">0</span>
              <span className="text-xs text-gray-500">This Month</span>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Token List */}
        <section className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Your Assets</h2>
            <button className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-medium">
              View All <ExternalLink className="w-3 h-3" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayBrands.map((brand, idx) => (
              <motion.div
                key={brand.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`glass-card p-4 transition-all ${
                  brand.balance > 0 ? "border-emerald-500/20 bg-emerald-500/[0.02]" : "opacity-60"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-inner overflow-hidden"
                    style={{ backgroundColor: brand.logo }}
                  >
                    {brand.symbol}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{brand.name}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{brand.category}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{brand.balance.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-500">${(brand.balance * 0.01).toFixed(2)}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Activity Sidebar */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-500" /> Recent Activity
          </h2>
          <div className="glass-card p-5 space-y-6 max-h-[500px] overflow-y-auto">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <RefreshCw className="w-5 h-5 text-gray-600" />
                </div>
                <p className="text-sm text-gray-500">No transactions found</p>
              </div>
            ) : (
              activities.map((activity, idx) => {
                const bFrom = getBrand(activity.fromBrand);
                const bTo = activity.toBrand ? getBrand(activity.toBrand) : null;
                
                return (
                  <div key={idx} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                        activity.type === 'swap' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                        activity.type === 'redeem' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {activity.type === 'swap' ? <ArrowLeftRight className="w-4 h-4" /> :
                         activity.type === 'redeem' ? <ArrowDownLeft className="w-4 h-4" /> :
                         <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="w-px h-full bg-white/5 my-2 group-last:hidden" />
                    </div>
                    <div className="flex-1 pb-6 group-last:pb-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-semibold capitalize text-gray-200">
                          {activity.type}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {timeAgo(activity.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {activity.type === 'swap' ? (
                          <>Swapped <span className="text-gray-200">{activity.amount} {bFrom.symbol}</span> for <span className="text-gray-200">{bTo?.symbol}</span></>
                        ) : activity.type === 'redeem' ? (
                          <>Redeemed <span className="text-gray-200">{activity.amount} {bFrom.symbol}</span></>
                        ) : (
                          <>Minted <span className="text-gray-200">{activity.amount} {bFrom.symbol}</span></>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="glass-card p-4 bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/20">
            <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">Pro Tip</h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              Did you know you can swap OYO points for IndiGo miles instantly with only a 0.3% protocol fee?
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
