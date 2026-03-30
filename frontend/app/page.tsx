"use client";
import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWatchContractEvent } from "wagmi";
import { ADDRESSES, LOYALTY_TOKEN_ABI, SWAP_POOL_ABI } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";
import { ConnectButton } from "@rainbow-me/rainbowkit";

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
      <div className="flex flex-col items-center justify-center py-16 md:py-24 gap-4 px-4">
        <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center text-2xl font-bold">LC</div>
        <h1 className="text-2xl font-semibold text-gray-900">Welcome to LoyaltyChain</h1>
        <p className="text-gray-500 text-center max-w-sm">
          Connect your wallet to view and manage your tokenized loyalty points on BNB Chain.
        </p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Your Portfolio</h1>
        <p className="text-gray-500 text-sm">Tokenized loyalty points across all brands</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <p className="text-xs text-gray-500 mb-1">Total Value</p>
          <p className="text-xl md:text-2xl font-semibold text-gray-900">${totalValueUSD.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <p className="text-xs text-gray-500 mb-1">Brands held</p>
          <p className="text-xl md:text-2xl font-semibold text-gray-900">
            {displayBrands.filter(b => b.balance > 0).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5">
          <p className="text-xs text-gray-500 mb-1">Network</p>
          <p className="text-xl md:text-2xl font-semibold text-yellow-600">BSC</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Tokens</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayBrands.map(brand => (
              <div key={brand.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <div
                  className="w-10 md:w-12 h-10 md:h-12 rounded-xl flex items-center justify-center text-white font-bold text-xs md:text-sm flex-shrink-0"
                  style={{ backgroundColor: brand.logo }}
                >
                  {brand.symbol}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">{brand.name}</p>
                  <p className="text-xs text-gray-500">{brand.pointsPerToken} pts</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 text-sm">{brand.balance.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">${(brand.balance * 0.01).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 max-h-80 overflow-y-auto">
            {activities.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
            ) : (
              activities.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    activity.type === "swap" ? "bg-blue-100 text-blue-700" :
                    activity.type === "redeem" ? "bg-green-100 text-green-700" :
                    "bg-purple-100 text-purple-700"
                  }`}>
                    {activity.type}
                  </span>
                  <span className="text-gray-600 flex-1">
                    {activity.type === "swap" ? (
                      <>Swap {getBrandName(activity.fromBrand)} → {getBrandName(activity.toBrand!)}</>
                    ) : activity.type === "redeem" ? (
                      <>Redeem {getBrandName(activity.fromBrand)}</>
                    ) : (
                      <>Mint {getBrandName(activity.fromBrand)}</>
                    )}
                  </span>
                  <span className="text-gray-400 text-xs">{activity.amount}</span>
                  <span className="text-gray-400 text-xs whitespace-nowrap">{timeAgo(activity.timestamp)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
