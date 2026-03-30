"use client";
import { useAccount, useReadContract } from "wagmi";
import { ADDRESSES, LOYALTY_TOKEN_ABI, REGISTRY_ABI } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Dashboard() {
  const { address, isConnected } = useAccount();

  const { data: portfolio } = useReadContract({
    address: ADDRESSES.token,
    abi: LOYALTY_TOKEN_ABI,
    functionName: "getPortfolio",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
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

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
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
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Your Portfolio</h1>
        <p className="text-gray-500 text-sm">Tokenized loyalty points across all brands</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Total Value</p>
          <p className="text-2xl font-semibold text-gray-900">${totalValueUSD.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Brands held</p>
          <p className="text-2xl font-semibold text-gray-900">
            {displayBrands.filter(b => b.balance > 0).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Network</p>
          <p className="text-2xl font-semibold text-yellow-600">BSC</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {displayBrands.map(brand => (
          <div key={brand.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: brand.logo }}
            >
              {brand.symbol}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{brand.name}</p>
              <p className="text-xs text-gray-500">{brand.pointsPerToken} pts / token</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{brand.balance.toLocaleString()}</p>
              <p className="text-xs text-gray-500">${(brand.balance * 0.01).toFixed(2)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
