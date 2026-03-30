"use client";
import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { ADDRESSES, LOYALTY_TOKEN_ABI } from "@/lib/contracts";
import { MOCK_BRANDS } from "@/lib/mockBrands";

function generateRewardCode(brandSymbol: string, amount: number): string {
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${brandSymbol}-${amount}-${random}`;
}

export default function RedeemPage() {
  const { address } = useAccount();
  const [brandId, setBrandId] = useState(0);
  const [amount, setAmount]   = useState("");
  const [code, setCode]       = useState<string | null>(null);

  const { writeContract, isPending, isSuccess } = useWriteContract();

  function handleRedeem() {
    const rewardCode = generateRewardCode(
      MOCK_BRANDS[brandId].symbol,
      Number(amount)
    );
    setCode(rewardCode);
    writeContract({
      address: ADDRESSES.token,
      abi: LOYALTY_TOKEN_ABI,
      functionName: "redeem",
      args: [BigInt(brandId), BigInt(Math.floor(parseFloat(amount))), rewardCode],
    });
  }

  const brand = MOCK_BRANDS[brandId];

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Redeem Points</h1>
      <p className="text-gray-500 text-sm mb-6">
        Burn your tokens to receive a redemption code. Present the code to the brand for rewards.
      </p>

      {isSuccess && code ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 text-xl">✓</div>
          <p className="font-semibold text-green-900">Redemption successful!</p>
          <div className="bg-white rounded-xl border border-green-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Your redemption code</p>
            <p className="font-mono text-lg font-bold text-gray-900 tracking-wider">{code}</p>
          </div>
          <p className="text-xs text-gray-500">
            Present this code at any {brand.name} partner location or app.
            This transaction is recorded on BNB Chain.
          </p>
          <button
            onClick={() => { setCode(null); setAmount(""); }}
            className="text-sm text-green-700 underline"
          >
            Redeem more
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Brand</label>
            <select
              value={brandId}
              onChange={e => setBrandId(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
            >
              {MOCK_BRANDS.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.symbol})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Amount of tokens</label>
            <input
              type="number"
              placeholder="e.g. 100"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm"
            />
            {amount && (
              <p className="text-xs text-gray-400 mt-1">
                = {(parseFloat(amount) * brand.pointsPerToken).toLocaleString()} real {brand.name} points
              </p>
            )}
          </div>
          <button
            onClick={handleRedeem}
            disabled={isPending || !amount || !address}
            className="w-full py-3 bg-yellow-400 text-yellow-900 rounded-xl font-semibold text-sm hover:bg-yellow-500 disabled:opacity-40"
          >
            {isPending ? "Processing…" : "Redeem & get code"}
          </button>
        </div>
      )}
    </div>
  );
}
